import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.currentUser = null;
  }

  connect(user) {
    if (this.socket && this.socket.connected) {
      if (this.currentUser?.id === user?.id) return this.socket;
      this.disconnect();
    }

    this.currentUser = user;
    // In production or development with Vite proxy, connect to window.location.origin or port 5000
    const serverUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('⚡ Connected to GOSH Realtime Server. Socket ID:', this.socket.id);
      if (user) {
        this.socket.emit('user_online', {
          userId: user.id || user.uid,
          displayName: user.displayName || user.email?.split('@')[0],
          avatarUrl: user.avatarUrl || user.photoURL
        });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from GOSH Realtime Server:', reason);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      if (this.currentUser) {
        this.socket.emit('user_offline', { userId: this.currentUser.id || this.currentUser.uid });
      }
      this.socket.disconnect();
      this.socket = null;
      this.currentUser = null;
    }
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();
export default socketService;
