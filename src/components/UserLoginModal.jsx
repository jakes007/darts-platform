// 🔍 FILE: src/components/UserLoginModal.jsx
// Verify this file has "Login" as the title

import React, { useEffect, useRef, useState } from 'react';
import './UserLoginModal.css';

const UserLoginModal = ({ isOpen, onClose }) => {
  const modalRef = useRef(null);
  const [isResetMode, setIsResetMode] = useState(false);

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

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setIsResetMode(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isResetMode) {
      const email = e.target.email.value;
      console.log('User password reset requested for:', email);
      alert(`Password reset email sent to ${email} (demo mode)`);
      setIsResetMode(false);
    } else {
      console.log('User login attempted');
      alert('Login demo - modal closing');
      onClose();
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setIsResetMode(true);
  };

  const handleBackToLogin = () => {
    setIsResetMode(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" ref={modalRef}>
        {!isResetMode ? (
          <>
            {/* THIS SHOULD SAY "Login" */}
            <h2>Login</h2>
            <p className="modal-subtle">Sign in to your account</p>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email"
                  placeholder="user@example.com"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password"
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <div className="forgot-password-container">
                <a 
                  href="#" 
                  className="forgot-password-link"
                  onClick={handleForgotPassword}
                >
                  Forgot password?
                </a>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="login-btn">
                  Sign In
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2>Reset Password</h2>
            <p className="modal-subtle">Enter your email to receive reset instructions</p>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="reset-email">Email</label>
                <input 
                  type="email" 
                  id="reset-email" 
                  name="email"
                  placeholder="user@example.com"
                  required
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={handleBackToLogin}>
                  Back
                </button>
                <button type="submit" className="login-btn">
                  Send Reset Email
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default UserLoginModal;