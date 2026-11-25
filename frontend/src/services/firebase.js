import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  fetchSignInMethodsForEmail
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCSWH2rq6QMrG1sP1EU9a3ycyFU1Hv8-sg",
  authDomain: "gosh-81416.firebaseapp.com",
  projectId: "gosh-81416",
  storageBucket: "gosh-81416.firebasestorage.app",
  messagingSenderId: "296346253080",
  appId: "1:296346253080:web:95863a18f90c0f6882106d",
  measurementId: "G-VMWXV3NMFG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
// Force account picker prompt to ensure popups do not stall on stale accounts
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  fetchSignInMethodsForEmail
};

export default app;
