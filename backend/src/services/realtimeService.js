import db, { isUuid } from '../repositories/databaseRepository.js';
import { resolveAuthenticatedUser } from '../middleware/authMiddleware.js';

export function setupRealtimeService(io) {
  // Map of userId -> Set of socketIds
  const onlineUsers = new Map();

  // Authenticate every Socket.io connection using verified session JWT or Firebase ID token
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization?.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.split(' ')[1]
          : null);

      if (!token) {
        return next(new Error('Authentication token required for realtime connection.'));
      }

      const verifiedUser = await resolveAuthenticatedUser(token);
      socket.user = verifiedUser;
      return next();
    } catch (err) {
      return next(new Error(`Unauthorized socket connection: ${err.message}`));
    }
  });

  function emitToUser(userId, event, payload) {
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        io.to(socketId).emit(event, payload);
      });
    }
  }

  async function markOfflineIfNoSockets(userId, socketId) {
    if (!userId || !onlineUsers.has(userId)) return;
    const userSockets = onlineUsers.get(userId);
    userSockets.delete(socketId);

    if (userSockets.size === 0) {
      onlineUsers.delete(userId);
      const lastSeenIso = new Date().toISOString();
      console.log(`🔴 User offline: ${userId}`);

      try {
        await db.updateOnlinePresence(userId, false, lastSeenIso);
      } catch (err) {
        console.error('Failed to update offline presence:', err.message);
      }

      io.emit('presence_update', {
        userId,
        online: false,
        lastSeen: lastSeenIso
      });
    }
  }

  io.on('connection', (socket) => {
    const authenticatedUserId = socket.user.id;

    // Register socket immediately upon authenticated connection
    if (!onlineUsers.has(authenticatedUserId)) {
      onlineUsers.set(authenticatedUserId, new Set());
    }
    onlineUsers.get(authenticatedUserId).add(socket.id);

    // User comes online
    socket.on('user_online', async (data = {}) => {
      const nowIso = new Date().toISOString();
      console.log(`🟢 User online: ${data.displayName || socket.user.username || authenticatedUserId} (${socket.id})`);

      try {
        await db.updateOnlinePresence(authenticatedUserId, true, nowIso);
      } catch (err) {
        console.error('Failed to update presence in DB:', err.message);
      }

      io.emit('presence_update', {
        userId: authenticatedUserId,
        online: true,
        lastSeen: nowIso
      });
    });

    // Explicit offline event
    socket.on('user_offline', async () => {
      await markOfflineIfNoSockets(authenticatedUserId, socket.id);
    });

    // Real-time Chat Messaging (Contact-Restricted for 1-to-1, Membership-Checked for Groups)
    socket.on('send_message', async (messageData = {}) => {
      try {
        const senderId = authenticatedUserId;
        const conversationId = messageData.conversationId;
        let targetUserId = messageData.targetUserId;

        if (isUuid(conversationId)) {
          const conv = await db.getConversationById(conversationId, senderId);
          if (!conv || !conv.members.includes(senderId)) {
            socket.emit('message_blocked', {
              conversationId,
              code: 'UNAUTHORIZED_CONVERSATION',
              message: 'You are not a member of this conversation.'
            });
            return;
          }

          if (conv.isGroup) {
            conv.members
              .filter((memberId) => memberId !== senderId)
              .forEach((memberId) => emitToUser(memberId, 'receive_message', { ...messageData, senderId }));
            return;
          }

          targetUserId = conv.members.find((m) => m !== senderId) || targetUserId;
        }

        if (targetUserId && targetUserId !== senderId) {
          const isAllowed = await db.isContact(senderId, targetUserId);
          if (!isAllowed) {
            console.warn(`🚫 Blocked socket message: ${senderId} -> ${targetUserId} (Not a contact)`);
            socket.emit('message_blocked', {
              conversationId,
              code: 'NOT_A_CONTACT',
              message: 'You can only message users who are saved in your contacts.'
            });
            return;
          }
          emitToUser(targetUserId, 'receive_message', { ...messageData, senderId });
        }
      } catch (err) {
        console.error('Socket send_message error:', err.message);
      }
    });

    // Typing Indicators (Contact-Restricted)
    socket.on('typing', async (data = {}) => {
      const { targetUserId, conversationId } = data;
      const userId = authenticatedUserId;
      if (targetUserId && onlineUsers.has(targetUserId)) {
        const isAllowed = await db.isContact(userId, targetUserId).catch(() => false);
        if (isAllowed) {
          emitToUser(targetUserId, 'user_typing', { userId, conversationId });
        }
      }
    });

    socket.on('stop_typing', async (data = {}) => {
      const { targetUserId, conversationId } = data;
      const userId = authenticatedUserId;
      if (targetUserId && onlineUsers.has(targetUserId)) {
        const isAllowed = await db.isContact(userId, targetUserId).catch(() => false);
        if (isAllowed) {
          emitToUser(targetUserId, 'user_stop_typing', { userId, conversationId });
        }
      }
    });

    // =========================================================================
    // WEBRTC SIGNALING (Audio & Video Calls - Contact-Restricted)
    // =========================================================================
    socket.on('call_user', async (data = {}) => {
      const callerId = authenticatedUserId;
      const receiverId = data.receiverId;
      console.log(`📞 Call initiated by ${data.callerName || callerId} (${callerId}) to ${receiverId}`);

      if (!receiverId) return;
      const isAllowed = await db.isContact(callerId, receiverId).catch(() => false);
      if (!isAllowed) {
        socket.emit('call_rejected', { reason: 'Calling restricted: User is not in your contacts.' });
        return;
      }

      if (onlineUsers.has(receiverId)) {
        emitToUser(receiverId, 'incoming_call', { ...data, callerId });
      } else {
        socket.emit('call_rejected', { reason: 'User is offline' });
      }
    });

    socket.on('accept_call', (data = {}) => {
      if (data.callerId) {
        emitToUser(data.callerId, 'call_accepted', { ...data, responderId: authenticatedUserId });
      }
    });

    socket.on('reject_call', (data = {}) => {
      if (data.callerId) {
        emitToUser(data.callerId, 'call_rejected', data);
      }
    });

    socket.on('end_call', (data = {}) => {
      if (data.targetUserId) {
        emitToUser(data.targetUserId, 'call_ended', data);
      }
    });

    socket.on('ice_candidate', (data = {}) => {
      if (data.targetUserId) {
        emitToUser(data.targetUserId, 'ice_candidate', data);
      }
    });

    socket.on('disconnect', async () => {
      await markOfflineIfNoSockets(authenticatedUserId, socket.id);
    });
  });
}

export default setupRealtimeService;
