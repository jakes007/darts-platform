// src/components/Header.jsx (COMPLETE - UPDATED)
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import './Header.css';

const Header = ({ onLoginClick, onRegisterClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdminPage, setIsAdminPage] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we're on the admin page
  useEffect(() => {
    setIsAdminPage(location.pathname === '/admin');
  }, [location]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLoginClick = () => {
    onLoginClick(); // This opens the USER modal
    setIsMenuOpen(false); // Close mobile menu after clicking login
  };

  const handleRegisterClick = () => {
    onRegisterClick(); // This opens the REGISTER modal
    setIsMenuOpen(false); // Close mobile menu after clicking register
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/'); // Go back to landing page
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo Section - Always on left */}
        <div className="logo-container">
          <img src="/darts-logo.png" alt="Darts Platform" className="logo" />
          <span className="logo-text">SUPERSTATS</span>
        </div>

        {/* Center Content - Admin text on admin page, empty on landing */}
        {isAdminPage && (
          <div className="admin-center-text">
            ADMIN
          </div>
        )}

        {/* Right Side Content */}
        <div className="header-right">
          {!isAdminPage ? (
            // Landing Page - Show auth buttons
            <>
              <div className="auth-buttons desktop-only">
                <button className="login-btn" onClick={handleLoginClick}>
                  Login
                </button>
                <button className="register-btn" onClick={handleRegisterClick}>
                  Register
                </button>
              </div>

              {/* Mobile Hamburger Button (only on landing page) */}
              <button 
                className={`hamburger-btn mobile-only ${isMenuOpen ? 'open' : ''}`} 
                onClick={toggleMenu}
                aria-label="Menu"
              >
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
              </button>
            </>
          ) : (
            // Admin Page - Show logout button
            <button className="logout-header-btn" onClick={handleLogout}>
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu - Only show on landing page */}
      {!isAdminPage && isMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-content">
            <button 
              className="mobile-login-btn" 
              onClick={handleLoginClick}
            >
              Login
            </button>
            <button 
              className="mobile-register-btn"
              onClick={handleRegisterClick}
            >
              Register
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;