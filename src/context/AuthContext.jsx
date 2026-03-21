import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const [loginSource, setLoginSource] = useState(null); // 'admin' or 'member'
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  // Login function with source tracking
  const login = async (email, password, source = 'member') => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if user has admin role in Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const userData = userDoc.data();
      
      if (userData?.role === 'admin') {
        setIsAdmin(true);
        setUserRole('admin');
        setLoginSource(source);
        localStorage.setItem('loginSource', source); // Save to localStorage
        console.log('AuthContext - Admin login, source:', source);
        return { success: true, user: userCredential.user };
      } else {
        setUserRole('user');
        setLoginSource(null);
        localStorage.removeItem('loginSource');
        console.log('AuthContext - Regular user login');
        return { success: true, user: userCredential.user };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await signOut(auth);
      setIsAdmin(false);
      setUserRole('user');
      setLoginSource(null);
      localStorage.removeItem('loginSource');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Check user status on mount and when auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Check if user is admin in Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const isUserAdmin = userData?.role === 'admin';
        setIsAdmin(isUserAdmin);
        setUserRole(userData?.role || 'user');
        
        // Retrieve loginSource from localStorage
        const savedSource = localStorage.getItem('loginSource');
        if (savedSource && isUserAdmin) {
          setLoginSource(savedSource);
        } else {
          setLoginSource(null);
        }
        
        console.log('AuthContext - onAuthStateChanged, isAdmin:', isUserAdmin, 'loginSource:', savedSource);
      } else {
        setIsAdmin(false);
        setUserRole('user');
        setLoginSource(null);
        localStorage.removeItem('loginSource');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    isAdmin,
    userRole,
    loginSource,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}