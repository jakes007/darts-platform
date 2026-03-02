// src/components/AdminLoginModal.jsx (UPDATED)
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import './AdminLoginModal.css';
import { signOut } from 'firebase/auth';

const AdminLoginModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const modalRef = useRef(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetView, setIsResetView] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // ESC key to close
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setError('');
      setResetEmail('');
      setIsResetView(false);
    }
  }, [isOpen]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Attempt to sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if it's the admin email
      if (user.email === 'admin@superstats.com') {
        onClose(); // Close the modal
        navigate('/admin'); // Redirect to admin dashboard
      } else {
        // It's a regular user trying to log in via admin modal
        setError('Access denied. Admin credentials required.');
        await signOut(auth); // Sign them out immediately
      }
    } catch (error) {
      console.error('Login error:', error);
      switch (error.code) {
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Try again later');
          break;
        default:
          setError('Failed to login. Please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    // We'll implement this later
    alert('Password reset functionality coming soon!');
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="admin-modal" ref={modalRef}>
        <div className="modal-header">
          <h2>{isResetView ? 'Reset Password' : 'Admin Login'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-subtitle">
          {isResetView 
            ? 'Enter your email to reset password' 
            : 'Enter your credentials'}
        </div>

        {!isResetView ? (
          // Login View
          <form onSubmit={handleLogin}>
            <div className="modal-body">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <button 
                type="button"
                className="forgot-link"
                onClick={() => setIsResetView(true)}
                disabled={loading}
              >
                Forgot password?
              </button>

              {error && <div className="error-message">{error}</div>}
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="cancel-button" 
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </form>
        ) : (
          // Reset Password View
          <div>
            <div className="modal-body">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="admin@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="cancel-button" 
                onClick={() => setIsResetView(false)}
              >
                Back
              </button>
              <button 
                className="login-button"
                onClick={handleResetPassword}
              >
                Send Reset Email
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLoginModal;