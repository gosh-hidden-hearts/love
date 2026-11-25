import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged 
} from '../services/firebase';
import api from '../services/api';
import socketService from '../services/socket';
import encryptionService from '../services/encryptionService';

const AuthContext = createContext(null);

export const buildUserObject = (firebaseUser, backendUser = null, backendProfile = null) => {
  const uid = firebaseUser?.uid || backendUser?.firebase_uid || backendUser?.id || '';
  const email = firebaseUser?.email || backendUser?.email || '';
  const fallbackName = email ? email.split('@')[0] : 'Soul Partner';
  const displayName = backendProfile?.display_name || firebaseUser?.displayName || backendUser?.username || fallbackName;
  const username = backendUser?.username || firebaseUser?.displayName?.toLowerCase().replace(/\s+/g, '_') || fallbackName.toLowerCase().replace(/\s+/g, '_');
  const mobile = backendUser?.mobile_number || '';
  const avatarUrl = backendProfile?.avatar_url || firebaseUser?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${uid || 'GOSH'}`;
  const bio = backendProfile?.bio || 'In a love story written by the stars ✨';
  const relationshipStatus = backendProfile?.relationship_status || 'In a soul bond';

  return {
    id: backendUser?.id || uid,
    uid,
    email,
    displayName,
    username,
    mobile,
    avatarUrl,
    bio,
    relationshipStatus
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('gosh_saved_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('gosh_saved_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(() => {
    return localStorage.getItem('gosh_terms_accepted') === 'true';
  });
  const [isVaultLocked, setIsVaultLocked] = useState(true);

  // Sync profile when auth state changes & handle redirect results
  useEffect(() => {
    // Process any redirect results from Google Sign-In
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('✅ Google redirect authentication successful for:', result.user.email);
        }
      })
      .catch((err) => {
        console.warn('Google redirect sign-in notice:', err.code, err.message);
      });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let userObj = buildUserObject(firebaseUser);

        // Mark terms accepted for authenticated users
        localStorage.setItem('gosh_terms_accepted', 'true');
        setTermsAccepted(true);

        try {
          // Sync with backend / Supabase if backend service is available
          const syncRes = await api.syncUser({
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: userObj.displayName,
            photoURL: firebaseUser.photoURL
          });

          if (syncRes && syncRes.user) {
            userObj = buildUserObject(firebaseUser, syncRes.user, syncRes.profile);
          }
        } catch (err) {
          console.warn('Backend sync skipped or offline, continuing with Firebase session:', err?.message || err);
        }

        setUser(userObj);
        setProfile(userObj);
        localStorage.setItem('gosh_saved_user', JSON.stringify(userObj));
        localStorage.setItem('gosh_saved_profile', JSON.stringify(userObj));

        // Connect to real-time socket
        socketService.connect(userObj);

        // Initialize E2EE Keypair
        encryptionService.initUserKeys(userObj.id).catch(console.warn);
      } else {
        // If no Firebase session, check if we have an OTP-authenticated user session
        const token = localStorage.getItem('gosh_jwt_token');
        const savedUser = localStorage.getItem('gosh_saved_user');
        if (token && savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);
            socketService.connect(parsed);
            encryptionService.initUserKeys(parsed.id).catch(console.warn);
          } catch {
            setUser(null);
            setProfile(null);
          }
        } else {
          setUser(null);
          setProfile(null);
          socketService.disconnect();
        }
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
    const fbUser = credential.user;

    // Immediately set authenticated state synchronously so route guards allow navigation instantly
    let userObj = buildUserObject(fbUser);
    localStorage.setItem('gosh_terms_accepted', 'true');
    setTermsAccepted(true);
    setUser(userObj);
    setProfile(userObj);
    localStorage.setItem('gosh_saved_user', JSON.stringify(userObj));
    localStorage.setItem('gosh_saved_profile', JSON.stringify(userObj));

    // Sync in background / await to enrich with backend profile
    try {
      const syncRes = await api.syncUser({
        firebaseUid: fbUser.uid,
        email: fbUser.email,
        displayName: userObj.displayName,
        photoURL: fbUser.photoURL
      });
      if (syncRes && syncRes.user) {
        userObj = buildUserObject(fbUser, syncRes.user, syncRes.profile);
        setUser(userObj);
        setProfile(userObj);
        localStorage.setItem('gosh_saved_user', JSON.stringify(userObj));
        localStorage.setItem('gosh_saved_profile', JSON.stringify(userObj));
      }
    } catch (err) {
      console.warn('Backend sync deferred or offline:', err?.message || err);
    }

    socketService.connect(userObj);
    encryptionService.initUserKeys(userObj.id).catch(console.warn);
    return userObj;
  };

  // Login via Phone Number / Email + OTP
  const loginWithOtp = async (identifier, otp) => {
    const res = await api.loginWithOtp(identifier, otp);
    if (!res.success) {
      throw new Error(res.message || 'OTP Login failed. Please verify code.');
    }

    const userObj = {
      id: res.user.id,
      uid: res.user.firebase_uid || res.user.id,
      email: res.user.email,
      displayName: res.profile?.display_name || res.user.username,
      username: res.user.username,
      mobile: res.user.mobile_number,
      avatarUrl: res.profile?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${res.user.id}`,
      bio: res.profile?.bio || 'In a love story written by the stars ✨',
      relationshipStatus: res.profile?.relationship_status || 'In a soul bond'
    };

    localStorage.setItem('gosh_terms_accepted', 'true');
    setTermsAccepted(true);
    setUser(userObj);
    setProfile(res.profile || userObj);
    localStorage.setItem('gosh_saved_user', JSON.stringify(userObj));
    localStorage.setItem('gosh_saved_profile', JSON.stringify(res.profile || userObj));
    socketService.connect(userObj);
    encryptionService.initUserKeys(userObj.id).catch(console.warn);

    return userObj;
  };

  // Google OAuth Login with popup and fallback to redirect
  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res?.user) {
        const fbUser = res.user;
        let userObj = buildUserObject(fbUser);
        localStorage.setItem('gosh_terms_accepted', 'true');
        setTermsAccepted(true);
        setUser(userObj);
        setProfile(userObj);
        localStorage.setItem('gosh_saved_user', JSON.stringify(userObj));
        localStorage.setItem('gosh_saved_profile', JSON.stringify(userObj));

        try {
          const syncRes = await api.syncUser({
            firebaseUid: fbUser.uid,
            email: fbUser.email,
            displayName: userObj.displayName,
            photoURL: fbUser.photoURL
          });
          if (syncRes && syncRes.user) {
            userObj = buildUserObject(fbUser, syncRes.user, syncRes.profile);
            setUser(userObj);
            setProfile(userObj);
            localStorage.setItem('gosh_saved_user', JSON.stringify(userObj));
            localStorage.setItem('gosh_saved_profile', JSON.stringify(userObj));
          }
        } catch (syncErr) {
          console.warn('Backend sync deferred or offline:', syncErr?.message || syncErr);
        }

        socketService.connect(userObj);
        encryptionService.initUserKeys(userObj.id).catch(console.warn);
        return userObj;
      }
      return null;
    } catch (popupErr) {
      console.warn('Google Popup Sign-in notice:', popupErr.code, popupErr.message);

      // If popup was blocked by browser or mobile webview, automatically fall back to redirect
      if (
        popupErr.code === 'auth/popup-blocked' ||
        popupErr.code === 'auth/cancelled-popup-request' ||
        popupErr.code === 'auth/operation-not-supported-in-this-environment'
      ) {
        console.log('Popup blocked; falling back to Google Sign-in with redirect...');
        await signInWithRedirect(auth, googleProvider);
        return null;
      }

      throw popupErr;
    }
  };

  // Explicit Google OAuth Redirect (Ideal for mobile Safari / Chrome)
  const loginWithGoogleRedirect = async () => {
    await signInWithRedirect(auth, googleProvider);
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

    let userObj = buildUserObject({
      ...fbUser,
      displayName: displayName || fbUser.displayName
    });
    localStorage.setItem('gosh_terms_accepted', 'true');
    setTermsAccepted(true);
    setUser(userObj);
    setProfile(userObj);
    localStorage.setItem('gosh_saved_user', JSON.stringify(userObj));
    localStorage.setItem('gosh_saved_profile', JSON.stringify(userObj));

    // 3. Register user in Supabase & Backend
    try {
      const syncRes = await api.syncUser({
        firebaseUid: fbUser.uid,
        email,
        displayName: displayName || email.split('@')[0],
        username: username?.trim() || email.split('@')[0],
        mobile_number: mobile?.trim() || null,
        email_verified: true
      });
      if (syncRes && syncRes.user) {
        userObj = buildUserObject(fbUser, syncRes.user, syncRes.profile);
        setUser(userObj);
        setProfile(userObj);
        localStorage.setItem('gosh_saved_user', JSON.stringify(userObj));
        localStorage.setItem('gosh_saved_profile', JSON.stringify(userObj));
      }
    } catch (syncErr) {
      console.warn('Backend sync deferred or offline:', syncErr?.message || syncErr);
    }

    socketService.connect(userObj);
    encryptionService.initUserKeys(userObj.id).catch(console.warn);
    return userObj;
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // Firebase might not be signed in if logged in via direct OTP
    }
    localStorage.removeItem('gosh_jwt_token');
    localStorage.removeItem('gosh_saved_user');
    localStorage.removeItem('gosh_saved_profile');
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
      loginWithOtp,
      signup,
      loginWithGoogle,
      loginWithGoogleRedirect,
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