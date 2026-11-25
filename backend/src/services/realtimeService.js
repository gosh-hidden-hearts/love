import db from '../repositories/databaseRepository.js';

export function setupRealtimeService(io) {
  // Map of userId -> Set of socketIds
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    let currentUserId = null;

    // User comes online
    socket.on('user_online', async (data) => {
      const { userId, displayName } = data;
      if (!userId) return;

      currentUserId = userId;
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId).add(socket.id);

      console.log(`🟢 User online: ${displayName || userId} (${socket.id})`);

      // Update database profile presence
      try {
        await db.updateOnlinePresence(userId, true, 'Online');
      } catch (err) {
        console.error('Failed to update presence in DB:', err);
      }

      // Broadcast presence update
      io.emit('presence_update', {
        userId,
        online: true,
        lastSeen: 'Online'
      });
    });

    // Real-time Chat Messaging (Contact-Restricted)
    socket.on('send_message', async (messageData) => {
      const senderId = messageData.senderId;
      const targetUserId = messageData.targetUserId;

      // Contact-only authorization check for 1-to-1 direct messages
      if (senderId && targetUserId && senderId !== targetUserId) {
        const isContact = await db.isContact(senderId, targetUserId);
        if (!isContact) {
          console.warn(`🚫 Blocked socket message: ${senderId} -> ${targetUserId} (Not a contact)`);
          socket.emit('message_blocked', {
            conversationId: messageData.conversationId,
            code: 'NOT_A_CONTACT',
            message: 'You can only message users who are saved in your contacts.'
          });
          return;
        }
      }

      console.log(`💬 Message from ${senderId} to ${targetUserId}`);
      if (targetUserId && onlineUsers.has(targetUserId)) {
        onlineUsers.get(targetUserId).forEach((socketId) => {
          io.to(socketId).emit('receive_message', messageData);
        });
      }
    });

    // Typing Indicators (Contact-Restricted)
    socket.on('typing', async (data) => {
      const { targetUserId, userId, conversationId } = data;
      if (userId && targetUserId && onlineUsers.has(targetUserId)) {
        const isContact = await db.isContact(userId, targetUserId);
        if (isContact) {
          onlineUsers.get(targetUserId).forEach((socketId) => {
            io.to(socketId).emit('user_typing', { userId, conversationId });
          });
        }
      }
    });

    socket.on('stop_typing', async (data) => {
      const { targetUserId, userId, conversationId } = data;
      if (userId && targetUserId && onlineUsers.has(targetUserId)) {
        const isContact = await db.isContact(userId, targetUserId);
        if (isContact) {
          onlineUsers.get(targetUserId).forEach((socketId) => {
            io.to(socketId).emit('user_stop_typing', { userId, conversationId });
          });
        }
      }
    });

    // =========================================================================
    // WEBRTC SIGNALING (Audio & Video Calls - Contact-Restricted)
    // =========================================================================
    socket.on('call_user', async (data) => {
      console.log(`📞 Call initiated by ${data.callerName} (${data.callerId}) to ${data.receiverId}`);
      if (data.callerId && data.receiverId) {
        const isContact = await db.isContact(data.callerId, data.receiverId);
        if (!isContact) {
          socket.emit('call_rejected', { reason: 'Calling restricted: User is not in your contacts.' });
          return;
        }
      }
      const receiverSockets = onlineUsers.get(data.receiverId);
      if (receiverSockets) {
        receiverSockets.forEach((socketId) => {
          io.to(socketId).emit('incoming_call', data);
        });
      } else {
        socket.emit('call_rejected', { reason: 'User is offline' });
      }
    });

    socket.on('accept_call', (data) => {
      console.log(`✅ Call accepted by user for caller: ${data.callerId}`);
      const callerSockets = onlineUsers.get(data.callerId);
      if (callerSockets) {
        callerSockets.forEach((socketId) => {
          io.to(socketId).emit('call_accepted', data);
        });
      }
    });

    socket.on('reject_call', (data) => {
      console.log(`❌ Call rejected for caller: ${data.callerId}`);
      const callerSockets = onlineUsers.get(data.callerId);
      if (callerSockets) {
        callerSockets.forEach((socketId) => {
          io.to(socketId).emit('call_rejected', data);
        });
      }
    });

    socket.on('end_call', (data) => {
      console.log(`⏹️ Call ended for target: ${data.targetUserId}`);
      const targetSockets = onlineUsers.get(data.targetUserId);
      if (targetSockets) {
        targetSockets.forEach((socketId) => {
          io.to(socketId).emit('call_ended', data);
        });
      }
    });

    socket.on('ice_candidate', (data) => {
      const targetSockets = onlineUsers.get(data.targetUserId);
      if (targetSockets) {
        targetSockets.forEach((socketId) => {
          io.to(socketId).emit('ice_candidate', data);
        });
      }
    });

    // Disconnect cleanup
    socket.on('disconnect', async () => {
      if (currentUserId && onlineUsers.has(currentUserId)) {
        const userSockets = onlineUsers.get(currentUserId);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(currentUserId);
          const lastSeenTime = new Date().toISOString();
          console.log(`🔴 User offline: ${currentUserId}`);
          
          try {
            await db.updateOnlinePresence(currentUserId, false, lastSeenTime);
          } catch (err) {
            console.error('Failed to update offline presence:', err);
          }

          io.emit('presence_update', {
            userId: currentUserId,
            online: false,
            lastSeen: lastSeenTime
          });
        }
      }
    });
  });
}

export default setupRealtimeService;
