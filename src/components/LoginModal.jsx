import React, { useState, useEffect, useRef } from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import "../styles/modals-base.css";
import "../styles/modals-form.css";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';


function LoginModal({ isOpen, onClose, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const modalRef = useRef(null);
  const auth = getAuth();
  const { login } = useAuth();

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
    setEmail('');
    setPassword('');
    setError('');
    setResetMessage('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setLoading(true);

    try {
      // Pass 'member' as the source
      const result = await login(email, password, 'member');
      console.log('LoginModal - Login result:', result); // Debug
      
      if (result.success) {
        const user = result.user;
        
        // Check if user is admin
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const isAdmin = userData?.role === 'admin';
        
        // Skip email verification for admin users
        if (!isAdmin && !user.emailVerified) {
          setError('Please verify your email before logging in. Check your inbox for the verification link.');
          setLoading(false);
          return;
        }
        
        handleClose();
        // Redirect based on role
        if (isAdmin) {
          window.location.href = '/dashboard'; // Admin goes to dashboard with User Switcher
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setError(result.error);
        setLoading(false);
      }
      
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to login. Please try again.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    setLoading(true);
    setError('');
    setResetMessage('');

    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage('Password reset email sent! Check your inbox.');
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container" ref={modalRef} style={{ position: 'relative' }}>
        {/* X Button Wrapper */}
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          right: 0, 
          padding: '12px 16px 0 0',
          zIndex: 10
        }}>
          <button 
            onClick={handleClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              background: 'none',
              border: 'none',
              color: 'var(--text-gray, #9ca3af)',
              fontSize: '18px',
              cursor: 'pointer',
              borderRadius: '4px',
              padding: '0',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.target.style.color = 'var(--accent-orange, #f5a623)';
              e.target.style.backgroundColor = 'rgba(245, 166, 35, 0.1)';
            }}
            onMouseLeave={e => {
              e.target.style.color = 'var(--text-gray, #9ca3af)';
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            ✕
          </button>
        </div>
        
        <h2 className="modal-title">Member Login</h2>
        
        {error && (
  <div className="error-message" style={{
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    color: '#f5a623',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    textAlign: 'center',
    marginBottom: '1rem',
    border: 'none'
  }}>
    {error}
  </div>
)}
        
        {resetMessage && (
  <div className="success-message" style={{
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    color: '#34d399',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    textAlign: 'center',
    marginBottom: '1rem',
    border: 'none'
  }}>
    {resetMessage}
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
              placeholder="your@email.com"
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
            
            <button 
              type="button" 
              className="link-button"
              onClick={() => {
                handleClose();
                onSwitchToRegister();
              }}
            >
              Need an account? Register
            </button>
          </div>
          
          <button 
            type="submit" 
            className="modal-submit-btn"
            disabled={loading}
          >
            {loading ? 'Please wait...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginModal;