import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged
} from '../services/firebase';
import api from '../services/api';
import socketService from '../services/socket';
import encryptionService from '../services/encryptionService';

const AuthContext = createContext(null);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const buildUserObject = (firebaseUser, backendUser = null, backendProfile = null) => {
  const uid = firebaseUser?.uid || backendUser?.firebase_uid || '';
  const email = backendUser?.email || firebaseUser?.email || '';
  const fallbackName = email ? email.split('@')[0] : 'Soul Partner';
  const displayName = backendProfile?.display_name || firebaseUser?.displayName || backendUser?.username || fallbackName;
  const username =
    backendUser?.username ||
    firebaseUser?.displayName?.toLowerCase().replace(/[^a-z0-9_]/g, '_') ||
    fallbackName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const mobile = backendUser?.mobile_number || '';
  const avatarUrl =
    backendProfile?.avatar_url ||
    firebaseUser?.photoURL ||
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${uid || 'GOSH'}`;
  const bio = backendProfile?.bio || 'In a love story written by the stars ✨';
  const relationshipStatus = backendProfile?.relationship_status || 'In a soul bond';

  return {
    id: backendUser?.id || uid,
    supabaseSynced: Boolean(backendUser?.id && UUID_REGEX.test(backendUser.id)),
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
  const [syncError, setSyncError] = useState(null);
  const signupInProgressRef = useRef(false);
  const [termsAccepted, setTermsAccepted] = useState(() => {
    return localStorage.getItem('gosh_terms_accepted') === 'true';
  });
  const [isVaultLocked, setIsVaultLocked] = useState(true);

  const persistSessionState = (userObj, profileObj) => {
    setUser(userObj);
    setProfile(profileObj || userObj);
    localStorage.setItem('gosh_saved_user', JSON.stringify(userObj));
    localStorage.setItem('gosh_saved_profile', JSON.stringify(profileObj || userObj));
  };

  /**
   * Obtains verified Firebase ID token and synchronizes the user with Backend -> Supabase.
   */
  const syncWithBackend = async (firebaseUser, extraMeta = {}) => {
    const idToken = await firebaseUser.getIdToken();
    const syncRes = await api.syncUser(idToken, {
      displayName: extraMeta.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0],
      username: extraMeta.username || null,
      mobile_number: extraMeta.mobile_number || null,
      photoURL: firebaseUser.photoURL || null
    });

    if (!syncRes?.success || !syncRes?.user) {
      const errMsg = syncRes?.message || 'Failed to synchronize account with Supabase database.';
      setSyncError(errMsg);
      return { ok: false, error: errMsg, syncRes };
    }

    setSyncError(null);
    const userObj = buildUserObject(firebaseUser, syncRes.user, syncRes.profile);
    persistSessionState(userObj, syncRes.profile || userObj);
    socketService.connect(userObj);
    encryptionService.initUserKeys(userObj.id).catch(console.warn);
    return { ok: true, userObj, profile: syncRes.profile };
  };

  useEffect(() => {
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
        localStorage.setItem('gosh_terms_accepted', 'true');
        setTermsAccepted(true);

        if (signupInProgressRef.current) {
          // Wait for signup() to finish updateProfile & explicit syncWithBackend with username/mobile metadata
          setLoading(false);
          return;
        }

        try {
          const synced = await syncWithBackend(firebaseUser);
          if (!synced.ok) {
            const fallbackObj = buildUserObject(firebaseUser);
            persistSessionState(fallbackObj, fallbackObj);
          }
        } catch (err) {
          const msg = err?.message || 'Backend sync failed.';
          setSyncError(msg);
          const fallbackObj = buildUserObject(firebaseUser);
          persistSessionState(fallbackObj, fallbackObj);
        }
      } else {
        const token = localStorage.getItem('gosh_jwt_token');
        const savedUser = localStorage.getItem('gosh_saved_user');
        const savedProfile = localStorage.getItem('gosh_saved_profile');
        if (token && savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            const parsedProfile = savedProfile ? JSON.parse(savedProfile) : parsedUser;
            setUser(parsedUser);
            setProfile(parsedProfile);
            if (parsedUser.supabaseSynced) {
              socketService.connect(parsedUser);
              encryptionService.initUserKeys(parsedUser.id).catch(console.warn);
            }
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

  const acceptTerms = async () => {
    try {
      await api.recordTermsAcceptance('1.0.0', '1.0.0');
    } catch (e) {
      console.warn('Backend terms acceptance logging skipped:', e.message);
    }
    localStorage.setItem('gosh_terms_accepted', 'true');
    setTermsAccepted(true);
  };

  const login = async (identifier, password) => {
    let emailToUse = identifier.trim();

    if (!identifier.includes('@')) {
      const res = await api.resolveIdentifier(identifier.trim());
      if (!res.success || !res.email) {
        throw new Error(res.message || 'Invalid username or mobile number.');
      }
      emailToUse = res.email;
    }

    const credential = await signInWithEmailAndPassword(auth, emailToUse, password);
    const fbUser = credential.user;

    localStorage.setItem('gosh_terms_accepted', 'true');
    setTermsAccepted(true);

    const synced = await syncWithBackend(fbUser);
    if (!synced.ok) {
      const fallbackObj = buildUserObject(fbUser);
      persistSessionState(fallbackObj, fallbackObj);
      return fallbackObj;
    }
    return synced.userObj;
  };

  const loginWithOtp = async () => {
    throw new Error('Passwordless OTP login is disabled because Firebase Authentication is required. Please use Password Sign In or Google Sign In.');
  };

  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res?.user) {
        const fbUser = res.user;
        localStorage.setItem('gosh_terms_accepted', 'true');
        setTermsAccepted(true);

        const synced = await syncWithBackend(fbUser);
        if (!synced.ok) {
          const fallbackObj = buildUserObject(fbUser);
          persistSessionState(fallbackObj, fallbackObj);
          return fallbackObj;
        }
        return synced.userObj;
      }
      return null;
    } catch (popupErr) {
      if (
        popupErr.code === 'auth/popup-blocked' ||
        popupErr.code === 'auth/cancelled-popup-request' ||
        popupErr.code === 'auth/operation-not-supported-in-this-environment'
      ) {
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      throw popupErr;
    }
  };

  const loginWithGoogleRedirect = async () => {
    await signInWithRedirect(auth, googleProvider);
  };

  const signup = async ({ email, password, displayName, username, mobile, sendVerificationEmail = false }) => {
    signupInProgressRef.current = true;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      if (displayName) {
        await updateProfile(fbUser, { displayName });
      }

      if (sendVerificationEmail && !fbUser.emailVerified) {
        sendEmailVerification(fbUser).catch((err) => {
          console.warn('Firebase email verification dispatch notice:', err?.message);
        });
      }

      localStorage.setItem('gosh_terms_accepted', 'true');
      setTermsAccepted(true);

      const synced = await syncWithBackend(fbUser, {
        displayName: displayName || email.split('@')[0],
        username: username?.trim() || null,
        mobile_number: mobile?.trim() || null
      });

      if (!synced.ok) {
        if (synced.syncRes?.status === 409) {
          throw new Error(synced.error);
        }
        const fallbackObj = buildUserObject({
          ...fbUser,
          displayName: displayName || fbUser.displayName
        });
        persistSessionState(fallbackObj, fallbackObj);
        return fallbackObj;
      }

      return synced.userObj;
    } finally {
      signupInProgressRef.current = false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore if OTP session only
    }
    localStorage.removeItem('gosh_jwt_token');
    localStorage.removeItem('gosh_saved_user');
    localStorage.removeItem('gosh_saved_profile');
    setSyncError(null);
    socketService.disconnect();
    setUser(null);
    setProfile(null);
  };

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

  const retryBackendSync = async () => {
    if (auth?.currentUser) {
      return syncWithBackend(auth.currentUser);
    }
    return { ok: false, error: 'No active Firebase user.' };
  };

  const refreshProfile = async () => {
    if (user?.id && UUID_REGEX.test(user.id)) {
      const res = await api.getProfile(user.id);
      if (res?.success && res.profile) {
        const updatedUser = buildUserObject(auth?.currentUser, res.user, res.profile);
        persistSessionState(updatedUser, res.profile);
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      syncError,
      retryBackendSync,
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
