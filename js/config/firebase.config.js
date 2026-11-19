/**
 * GOSH FIREBASE & AUTHENTICATION CONFIGURATION
 * Strict 2-User Whitelist & Multi-Step Security Settings
 */

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyCSWH2rq6QMrG1sP1EU9a3ycyFU1Hv8-sg",
  authDomain: "gosh-81416.firebaseapp.com",
  projectId: "gosh-81416",
  storageBucket: "gosh-81416.firebasestorage.app",
  messagingSenderId: "296346253080",
  appId: "1:296346253080:web:95863a18f90c0f6882106d",
  measurementId: "G-VMWXV3NMFG"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Analytics safely (conditioned for environments supporting window/document and IndexedDB)
export let analytics = null;
if (typeof window !== "undefined" && typeof window.document !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log("[Firebase] Google Analytics initialized successfully");
    }
  }).catch((err) => {
    console.warn("[Firebase] Google Analytics unavailable:", err?.message || err);
  });
}

export const FirebaseConfig = {
  // Firebase Web App Credentials
  ...firebaseConfig,

  // STRICT 2-USER AUTHORIZATION WHITELIST
  // GOSH rejects any login attempt from any account not explicitly listed here.
  authorizedUsers: [
    {
      id: "u1-auth-0000-0000-000000000001",
      email: "prasanthgokul736@gmail.com",
      displayName: "Gokul",
      avatarInitials: "PG",
      role: "owner"
    },
    {
      id: "u2-auth-0000-0000-000000000002",
      email: "sharanyasiva4@gmail.com",
      displayName: "Sharanya",
      avatarInitials: "SS",
      role: "owner"
    },
    {
      id: "u1-test-0000-0000-000000000001",
      email: "user1@gosh.internal",
      displayName: "Alex",
      avatarInitials: "A1",
      role: "owner"
    },
    {
      id: "u2-test-0000-0000-000000000002",
      email: "user2@gosh.internal",
      displayName: "Sam",
      avatarInitials: "S2",
      role: "owner"
    }
  ],

  // Baseline Initial Passwords for Sovereign Zero-Cost Authentication
  credentials: {
    "prasanthgokul736@gmail.com": "Gokul@709",
    "sharanyasiva4@gmail.com": "Sharanya@2008",
    "user1@gosh.internal": "securepassword123",
    "user2@gosh.internal": "anotherpassword123"
  },

  // Security & Multi-Step Auth Settings
  settings: {
    requireEmailOTP: true,        // Step 2: 6-digit Email OTP or verification link
    sessionDurationDays: 30,      // Max duration for trusted devices
    maxFailedAttempts: 5,         // Account lockout after 5 consecutive failed attempts
    lockoutDurationMinutes: 15,
    autoLockVaultMinutes: 5       // Inactivity timeout for zero-knowledge vault
  }
};
