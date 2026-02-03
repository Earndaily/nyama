// =============================================================
// FILE: src/context/AuthContext.js
// =============================================================
// Wraps the entire app. Provides:
//   • signUp(email, password, displayName, role)
//   • loginEmail(email, password)
//   • loginGoogle()
//   • logout()
//   • user          — the current Firebase User object (or null)
//   • userProfile   — the Firestore document for this user
//   • loading       — true while the auth state is resolving
// =============================================================

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase.config.js";

const AuthContext = createContext(null);
const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  // ── persist / fetch Firestore profile ──────────────────
  const fetchOrCreateProfile = useCallback(async (firebaseUser) => {
    const ref = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setUserProfile(snap.data());
    } else {
      // first-time Google login — create a default profile
      const profile = {
        uid:         firebaseUser.uid,
        email:       firebaseUser.email,
        displayName: firebaseUser.displayName || "User",
        role:        "diner",           // default role
        createdAt:   new Date().toISOString()
      };
      await setDoc(ref, profile);
      setUserProfile(profile);
    }
  }, []);

  // ── listen for auth state changes (page reload safe) ───
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchOrCreateProfile(firebaseUser);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchOrCreateProfile]);

  // ── Email / Password sign-up ────────────────────────
  const signUp = async (email, password, displayName, role = "diner") => {
    setError(null);
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
      // set displayName on Firebase Auth record
      await updateProfile(newUser, { displayName });
      // write full profile to Firestore
      const profile = {
        uid: newUser.uid,
        email,
        displayName,
        role,                            // "diner" | "owner"
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "users", newUser.uid), profile);
      setUserProfile(profile);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // ── Email / Password login ──────────────────────────
  const loginEmail = async (email, password) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // ── Google OAuth login ──────────────────────────────
  const loginGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // ── Sign out ────────────────────────────────────────
  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // ── Update role (diner ↔ owner) ─────────────────────
  const updateRole = async (newRole) => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    await setDoc(ref, { ...userProfile, role: newRole }, { merge: true });
    setUserProfile(prev => ({ ...prev, role: newRole }));
  };

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading, error,
      signUp, loginEmail, loginGoogle, logout, updateRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
