import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
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

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
};

export default app;
