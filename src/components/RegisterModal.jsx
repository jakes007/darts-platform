import React, { useState, useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import "../styles/modals-base.css";
import "../styles/modals-form.css";
import "../styles/modals-register.css";

function RegisterModal({ isOpen, onClose, onSwitchToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const modalRef = useRef(null);
  const auth = getAuth();

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
    setConfirmPassword('');
    setIdNumber('');
    setError('');
    setSuccess('');
  };

  const validateIdNumber = (id) => {
    // Basic SA ID validation - 13 digits
    return /^\d{13}$/.test(id);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Validate ID number
    if (!validateIdNumber(idNumber)) {
      setError('Please enter a valid 13-digit ID number');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Check if ID exists in members collection
const membersRef = collection(db, 'members');
const q = query(membersRef, where('idNumber', '==', idNumber));
const querySnapshot = await getDocs(q);

console.log('ID search results:', {
  searchId: idNumber,
  found: !querySnapshot.empty,
  memberData: querySnapshot.empty ? null : querySnapshot.docs[0].data()
});

if (querySnapshot.empty) {
  setError('ID number not found in our records. Please contact admin.');
  setLoading(false);
  return;
}

// ID exists - get the member document
const memberDoc = querySnapshot.docs[0];
const memberData = memberDoc.data();

// 🔥 NEW CHECK: See if this member already has an authUid (already registered)
if (memberData.authUid) {
  console.log('Member already registered with authUid:', memberData.authUid);
  setError('This ID number is already registered. Please use the login button or contact admin if you need assistance.');
  setLoading(false);
  return;
}

// ID exists and not registered yet - proceed with registration

      // Step 2: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Step 3: Send email verification
      await sendEmailVerification(user);

      // Step 4: Update member document with auth UID and email
await updateDoc(doc(db, 'members', memberDoc.id), {
  authUid: user.uid,
  email: email, // Update with registered email
  registeredAt: new Date()
});

      // Show success message
      setSuccess('Registration successful! Please check your email to verify your account before logging in.');
      
      // Clear form but keep success message
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setIdNumber('');

    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please use a different email or try logging in.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else {
        setError('Registration failed. Please try again.');
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
        
        <h2 className="modal-title">Member Registration</h2>
        
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
        
        {success && (
  <div className="success-message" style={{
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    color: '#34d399',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '0.9rem',
    textAlign: 'center',
    marginBottom: '1rem',
    border: 'none',
    lineHeight: '1.5'
  }}>
    {success}
    <div style={{ marginTop: '1rem' }}>
      <button 
        className="link-button"
        onClick={() => {
          handleClose();
          onSwitchToLogin();
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#f5a623',
          fontSize: '0.85rem',
          cursor: 'pointer',
          textDecoration: 'underline'
        }}
      >
        Go to Login
      </button>
    </div>
  </div>
)}
        
        {!success && (
          <form className="modal-form" onSubmit={handleRegister}>
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
              <label htmlFor="idNumber">ID Number</label>
              <input 
                type="text" 
                id="idNumber" 
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="13-digit ID number"
                required
                disabled={loading}
                maxLength={13}
              />
              <small className="field-hint">Enter your SA ID number as it appears in our records</small>
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
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input 
                type="password" 
                id="confirmPassword" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
            
            <div className="form-links">
              <button 
                type="button" 
                className="link-button"
                onClick={() => {
                  handleClose();
                  onSwitchToLogin();
                }}
              >
                Already have an account? Login
              </button>
            </div>
            
            <button 
              type="submit" 
              className="modal-submit-btn"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Register'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default RegisterModal;