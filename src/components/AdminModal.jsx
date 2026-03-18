import React, { useState, useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AdminModal.css';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

function AdminModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const modalRef = useRef(null);
  const { login, logout } = useAuth(); // Add logout here
  const navigate = useNavigate();

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleClose();
      }
    };

    

    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    setError('');
    setEmail('');
    setPassword('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
  
    const result = await login(email, password);
    
    if (result.success) {
      // Check if the logged-in user is actually an admin
      const auth = getAuth();
      const user = auth.currentUser;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        if (userData?.role === 'admin') {
          handleClose();
          navigate('/admin');
        } else {
          // User is not an admin - log them out and show error
          await logout();
          setError('Access denied. Please use the regular Member Login button.');
          setLoading(false); // Make sure to set loading to false here
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        await logout();
        setError('An error occurred. Please try again.');
        setLoading(false);
      }
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
  
    setLoading(true);
    setError('');
    
    try {
      // First, check if this email belongs to an admin
      const auth = getAuth();
      
      // We need to find the user by email to check their role
      // Since we can't query users by email directly in Firebase Auth client-side,
      // we need to check in Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('No account found with this email');
        setLoading(false);
        return;
      }
      
      // Check if the user has admin role
      const userData = querySnapshot.docs[0].data();
      if (userData?.role !== 'admin') {
        setError('This email is not registered as an admin. Please use the regular login for member accounts.');
        setLoading(false);
        return;
      }
      
      // If we get here, it's an admin - send reset email
      await sendPasswordResetEmail(auth, email);
      setError('Password reset email sent! Check your inbox.');
      
    } catch (error) {
      console.error('Forgot password error:', error);
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" ref={modalRef}>
        <button className="modal-close-btn" onClick={handleClose} aria-label="Close modal">
          <FiX />
        </button>
        
        <h2 className="modal-title">Admin Login</h2>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form className="modal-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@observatorydarts.co.za"
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-links">
          <button 
  type="button" 
  className="link-button"
  onClick={handleForgotPassword}
  disabled={loading}
>
  Forgot Password?
</button>
          </div>
          
          <button 
            type="submit" 
            className="modal-submit-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminModal;