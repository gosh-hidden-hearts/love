export function setupRealtimeService(io) {
  // Map of userId -> Set of socketIds
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    let currentUserId = null;

    // User comes online
    socket.on('user_online', (data) => {
      const { userId, displayName } = data;
      if (!userId) return;

      currentUserId = userId;
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId).add(socket.id);

      console.log(`🟢 User online: ${displayName || userId} (${socket.id})`);

      // Broadcast presence update
      io.emit('presence_update', {
        userId,
        online: true,
        lastSeen: 'Online'
      });
    });

    // Real-time Chat Messaging
    socket.on('send_message', (messageData) => {
      console.log(`💬 Message from ${messageData.senderId} to ${messageData.targetUserId}`);

      const targetUserId = messageData.targetUserId;
      if (targetUserId && onlineUsers.has(targetUserId)) {
        onlineUsers.get(targetUserId).forEach((socketId) => {
          io.to(socketId).emit('receive_message', messageData);
        });
      }
    });

    // Typing Indicators
    socket.on('typing', (data) => {
      const { targetUserId, userId, conversationId } = data;
      if (targetUserId && onlineUsers.has(targetUserId)) {
        onlineUsers.get(targetUserId).forEach((socketId) => {
          io.to(socketId).emit('user_typing', { userId, conversationId });
        });
      }
    });

    socket.on('stop_typing', (data) => {
      const { targetUserId, userId, conversationId } = data;
      if (targetUserId && onlineUsers.has(targetUserId)) {
        onlineUsers.get(targetUserId).forEach((socketId) => {
          io.to(socketId).emit('user_stop_typing', { userId, conversationId });
        });
      }
    });

    // =========================================================================
    // WEBRTC SIGNALING (Audio & Video Calls)
    // =========================================================================
    socket.on('call_user', (data) => {
      console.log(`📞 Call initiated by ${data.callerName} (${data.callerId}) to ${data.receiverId}`);
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
    socket.on('disconnect', () => {
      if (currentUserId && onlineUsers.has(currentUserId)) {
        const userSockets = onlineUsers.get(currentUserId);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(currentUserId);
          console.log(`🔴 User offline: ${currentUserId}`);
          io.emit('presence_update', {
            userId: currentUserId,
            online: false,
            lastSeen: new Date().toISOString()
          });
        }
      }
    });
  });
}

export default setupRealtimeService;
