/**
 * GOSH FIREBASE & AUTHENTICATION CONFIGURATION
 * Strict 2-User Whitelist & Multi-Step Security Settings
 */

export const FirebaseConfig = {
  // Firebase Web App Credentials
  // Obtain these from: Firebase Console -> Project Settings -> General -> Your apps -> Web app
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "gosh-private.firebaseapp.com",
  projectId: "gosh-private",
  storageBucket: "gosh-private.appspot.com",
  messagingSenderId: "100000000000",
  appId: "1:100000000000:web:0000000000000000000000",

  // STRICT 2-USER AUTHORIZATION WHITELIST
  // GOSH rejects any login attempt from any account not explicitly listed here.
  authorizedUsers: [
    {
      id: "u1-auth-0000-0000-000000000001",
      email: "user1@gosh.internal",
      displayName: "Alex",
      avatarInitials: "A1",
      role: "owner"
    },
    {
      id: "u2-auth-0000-0000-000000000002",
      email: "user2@gosh.internal",
      displayName: "Sam",
      avatarInitials: "S2",
      role: "owner"
    }
  ],

  // Security & Multi-Step Auth Settings
  settings: {
    requireEmailOTP: true,        // Step 2: 6-digit Email OTP or verification link
    sessionDurationDays: 30,      // Max duration for trusted devices
    maxFailedAttempts: 5,         // Account lockout after 5 consecutive failed attempts
    lockoutDurationMinutes: 15,
    autoLockVaultMinutes: 5       // Inactivity timeout for zero-knowledge vault
  }
};
