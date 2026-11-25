import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.currentUser = null;
  }

  getSocketServerUrl() {
    const customOverride = typeof localStorage !== 'undefined' ? localStorage.getItem('gosh_backend_url') : null;
    const customSocketUrl = customOverride || import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL;
    if (customSocketUrl && customSocketUrl.trim().length > 0) {
      return customSocketUrl.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');
    }
    if (typeof window !== 'undefined') {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000';
      }
    }
    return null;
  }

  connect(user) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('gosh_jwt_token') : null;
    if (!token || !user?.id) {
      return null;
    }

    if (this.socket && this.socket.connected) {
      if (this.currentUser?.id === user?.id) return this.socket;
      this.disconnect();
    }

    const serverUrl = this.getSocketServerUrl();
    if (!serverUrl) {
      console.info('ℹ️ No backend Socket URL configured (VITE_SOCKET_URL). Realtime socket paused.');
      return null;
    }

    this.currentUser = user;

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      auth: { token },
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('⚡ Connected to GOSH Realtime Server. Socket ID:', this.socket.id);
      if (user) {
        this.socket.emit('user_online', {
          displayName: user.displayName || user.email?.split('@')[0],
          avatarUrl: user.avatarUrl || user.photoURL
        });
      }
    });

    this.socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
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
