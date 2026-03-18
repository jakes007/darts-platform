import React, { useState, useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AdminModal.css';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
            <a href="#" className="forgot-password">Forgot Password?</a>
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