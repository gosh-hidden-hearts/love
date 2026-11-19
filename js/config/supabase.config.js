/**
 * GOSH SUPABASE CONFIGURATION
 * Database & Realtime WebSocket connection settings
 */

export const SupabaseConfig = {
  // Public project URL and Anonymous API Key (Safe for client browsers with RLS enabled)
  // Obtain from: Supabase Console -> Project Settings -> API
  supabaseUrl: "https://your-gosh-project.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ANONYMOUS_KEY",

  // Realtime WebSocket channel names
  channels: {
    messages: "gosh_messages_channel",
    signaling: "gosh_webrtc_signaling",
    presence: "gosh_user_presence",
    notifications: "gosh_notifications"
  },

  // Connection settings
  settings: {
    offlineFirst: true, // Persists queries locally to IndexedDB/LocalStorage when offline
    realtimeSync: true,
    autoReconnect: true
  }
};
