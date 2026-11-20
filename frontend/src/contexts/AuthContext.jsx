import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged 
} from '../services/firebase';
import api from '../services/api';
import socketService from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(() => {
    return localStorage.getItem('gosh_terms_accepted') === 'true';
  });
  const [isVaultLocked, setIsVaultLocked] = useState(true);

  // Sync profile when auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Sync with backend / Supabase
          const syncRes = await api.syncUser({
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            photoURL: firebaseUser.photoURL
          });

          const userObj = {
            id: syncRes.user?.id || firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: syncRes.profile?.display_name || firebaseUser.displayName || firebaseUser.email.split('@')[0],
            username: syncRes.user?.username || firebaseUser.email.split('@')[0],
            mobile: syncRes.user?.mobile_number || '',
            avatarUrl: syncRes.profile?.avatar_url || firebaseUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${firebaseUser.uid}`,
            bio: syncRes.profile?.bio || 'In a love story written by the stars ✨',
            relationshipStatus: syncRes.profile?.relationship_status || 'In a soul bond'
          };

          setUser(userObj);
          setProfile(syncRes.profile || userObj);

          // Connect to real-time socket
          socketService.connect(userObj);
        } catch (err) {
          console.error('Error syncing user profile:', err);
          const fallbackUser = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            avatarUrl: firebaseUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${firebaseUser.uid}`
          };
          setUser(fallbackUser);
          setProfile(fallbackUser);
          socketService.connect(fallbackUser);
        }
      } else {
        setUser(null);
        setProfile(null);
        socketService.disconnect();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Agree and Continue acceptance
  const acceptTerms = async () => {
    try {
      await api.recordTermsAcceptance('1.0.0', '1.0.0');
    } catch (e) {
      console.warn('Backend terms acceptance logging skipped:', e.message);
    }
    localStorage.setItem('gosh_terms_accepted', 'true');
    setTermsAccepted(true);
  };

  // Login with Email or Resolved Identifier (Username / Mobile)
  const login = async (identifier, password) => {
    let emailToUse = identifier.trim();

    // If identifier is not standard email, resolve via backend
    if (!identifier.includes('@')) {
      const res = await api.resolveIdentifier(identifier.trim());
      if (!res.success || !res.email) {
        throw new Error(res.message || 'Invalid username or mobile number.');
      }
      emailToUse = res.email;
    }

    const credential = await signInWithEmailAndPassword(auth, emailToUse, password);
    return credential.user;
  };

  // Google OAuth Login
  const loginWithGoogle = async () => {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  };

  // Signup flow
  const signup = async ({ email, password, displayName, username, mobile }) => {
    // 1. Create Firebase User
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;

    // 2. Update display name in Firebase
    if (displayName) {
      await updateProfile(fbUser, { displayName });
    }

    // 3. Register user in Supabase & Backend
    const syncRes = await api.syncUser({
      firebaseUid: fbUser.uid,
      email,
      displayName: displayName || email.split('@')[0],
      username: username?.trim() || email.split('@')[0],
      mobile_number: mobile?.trim() || null,
      email_verified: true
    });

    return syncRes;
  };

  // Logout
  const logout = async () => {
    await signOut(auth);
    socketService.disconnect();
    setUser(null);
    setProfile(null);
  };

  // Reset password
  const resetPassword = async (identifier) => {
    let emailToUse = identifier.trim();
    if (!identifier.includes('@')) {
      const res = await api.resolveIdentifier(identifier.trim());
      if (!res.success || !res.email) {
        throw new Error('No account found with this identifier.');
      }
      emailToUse = res.email;
    }
    await sendPasswordResetEmail(auth, emailToUse);
    return emailToUse;
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (user?.id) {
      const res = await api.getProfile(user.id);
      if (res.profile) {
        setProfile(res.profile);
        setUser(prev => ({
          ...prev,
          displayName: res.profile.display_name,
          avatarUrl: res.profile.avatar_url,
          bio: res.profile.bio,
          relationshipStatus: res.profile.relationship_status
        }));
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      termsAccepted,
      acceptTerms,
      login,
      signup,
      loginWithGoogle,
      logout,
      resetPassword,
      refreshProfile,
      isVaultLocked,
      setIsVaultLocked
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
