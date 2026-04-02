import React, { useState, useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import "../styles/modals-base.css";
import "../styles/modals-form.css";
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';


function AdminModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const modalRef = useRef(null);
  const { login, logout } = useAuth();
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
  
    const result = await login(email, password, 'admin');
    
    if (result.success) {
      const user = result.user;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        if (userData?.role === 'admin') {
          handleClose();
          navigate('/admin');
        } else {
          await logout();
          setError('Access denied. Please use the regular Member Login button.');
          setLoading(false);
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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
  
    setLoading(true);
    setError('');
    
    try {
      const auth = getAuth();
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('No account found with this email');
        setLoading(false);
        return;
      }
      
      const userData = querySnapshot.docs[0].data();
      if (userData?.role !== 'admin') {
        setError('This email is not registered as an admin. Please use the regular login for member accounts.');
        setLoading(false);
        return;
      }
      
      await sendPasswordResetEmail(auth, email);
      setError('Password reset email sent! Check your inbox.');
      
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Failed to send reset email. Please try again.');
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
        
        <h2 className="modal-title">Admin Login</h2>
        
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