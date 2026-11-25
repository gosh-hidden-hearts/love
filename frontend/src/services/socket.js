import supabase, { supabaseUrl, supabasePublishableKey } from './supabase';
import api from './api';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GOSH Realtime Service powered by Supabase Realtime (Broadcast + Presence)
 * Preserves the socketService event interface (.connect, .disconnect, .emit, .on, .off)
 * so chat messaging, typing indicators, online presence, and WebRTC signaling
 * work serverlessly on GitHub Pages without a separate Socket.IO host.
 */
class SupabaseRealtimeService {
  constructor() {
    this.currentUser = null;
    this.userChannel = null;
    this.presenceChannel = null;
    this.listeners = new Map(); // event -> Set<callback>
  }

  _dispatch(event, payload) {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    callbacks.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.warn(`Realtime listener error (${event}):`, err);
      }
    });
  }

  async _broadcastToUser(targetUserId, event, payload) {
    if (!targetUserId || !supabaseUrl || !supabasePublishableKey) return;
    const base = supabaseUrl.replace(/\/+$/, '');
    try {
      await fetch(`${base}/realtime/v1/api/broadcast`, {
        method: 'POST',
        headers: {
          apikey: supabasePublishableKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              topic: `gosh:user:${targetUserId}`,
              event,
              payload,
              private: false
            }
          ]
        })
      });
    } catch (err) {
      console.warn(`Supabase Realtime broadcast error (${event}):`, err.message);
    }
  }

  connect(user) {
    if (!user?.id || !UUID_REGEX.test(user.id)) {
      return null;
    }

    if (this.currentUser?.id === user.id && this.userChannel) {
      return this.userChannel;
    }

    if (this.userChannel || this.presenceChannel) {
      this.disconnect();
    }

    this.currentUser = user;

    // 1. Subscribe to personal inbox & signaling broadcast channel
    const userTopic = `gosh:user:${user.id}`;
    this.userChannel = supabase.channel(userTopic);

    const inboundEvents = [
      'receive_message',
      'user_typing',
      'user_stop_typing',
      'message_blocked',
      'incoming_call',
      'call_accepted',
      'call_rejected',
      'call_ended',
      'ice_candidate'
    ];

    inboundEvents.forEach((evt) => {
      this.userChannel.on('broadcast', { event: evt }, (msg) => {
        this._dispatch(evt, msg?.payload ?? msg);
      });
    });

    this.userChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('⚡ Subscribed to GOSH Supabase Realtime inbox:', userTopic);
      }
    });

    // 2. Subscribe to global presence channel
    this.presenceChannel = supabase.channel('gosh:presence', {
      config: { presence: { key: user.id } }
    });

    this.presenceChannel
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key) {
          this._dispatch('presence_update', { userId: key, online: true, lastSeen: 'Online' });
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key) {
          this._dispatch('presence_update', {
            userId: key,
            online: false,
            lastSeen: new Date().toISOString()
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.presenceChannel.track({
            user_id: user.id,
            display_name: user.displayName || user.username,
            online_at: new Date().toISOString()
          });
          api.updatePresence(true).catch(() => {});
        }
      });

    return this.userChannel;
  }

  disconnect() {
    if (this.currentUser?.id) {
      api.updatePresence(false).catch(() => {});
    }
    if (this.userChannel) {
      supabase.removeChannel(this.userChannel);
      this.userChannel = null;
    }
    if (this.presenceChannel) {
      supabase.removeChannel(this.presenceChannel);
      this.presenceChannel = null;
    }
    this.currentUser = null;
  }

  emit(event, data = {}) {
    if (!this.currentUser?.id) return;

    switch (event) {
      case 'user_online':
        api.updatePresence(true).catch(() => {});
        break;
      case 'user_offline':
        this.disconnect();
        break;
      case 'send_message':
        // Edge Function gosh-api persists to PostgreSQL and broadcasts `receive_message` atomically.
        break;
      case 'typing':
        if (data.targetUserId) {
          this._broadcastToUser(data.targetUserId, 'user_typing', {
            userId: this.currentUser.id,
            conversationId: data.conversationId
          });
        }
        break;
      case 'stop_typing':
        if (data.targetUserId) {
          this._broadcastToUser(data.targetUserId, 'user_stop_typing', {
            userId: this.currentUser.id,
            conversationId: data.conversationId
          });
        }
        break;
      case 'call_user':
        if (data.receiverId) {
          this._broadcastToUser(data.receiverId, 'incoming_call', {
            ...data,
            callerId: this.currentUser.id
          });
        }
        break;
      case 'accept_call':
        if (data.callerId) {
          this._broadcastToUser(data.callerId, 'call_accepted', {
            ...data,
            responderId: this.currentUser.id
          });
        }
        break;
      case 'reject_call':
        if (data.callerId) {
          this._broadcastToUser(data.callerId, 'call_rejected', data);
        }
        break;
      case 'end_call':
        if (data.targetUserId) {
          this._broadcastToUser(data.targetUserId, 'call_ended', data);
        }
        break;
      case 'ice_candidate':
        if (data.targetUserId) {
          this._broadcastToUser(data.targetUserId, 'ice_candidate', data);
        }
        break;
      default:
        break;
    }
  }

  on(event, callback) {
    if (!callback) return;
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    if (callback) {
      callbacks.delete(callback);
    } else {
      callbacks.clear();
    }
  }
}

export const socketService = new SupabaseRealtimeService();
export default socketService;
