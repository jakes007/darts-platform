// 🔍 FILE: src/components/Header.jsx
// Complete corrected file

import React, { useState } from 'react';
import './Header.css';

const Header = ({ onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLoginClick = () => {
    onLoginClick(); // This opens the USER modal
    setIsMenuOpen(false); // Close mobile menu after clicking login
  };

  const handleRegisterClick = () => {
    // We'll add register functionality later
    alert('Register functionality coming soon!');
    setIsMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo Section */}
        <div className="logo-container">
          <img src="/darts-logo.png" alt="Darts Platform" className="logo" />
          <span className="logo-text">SUPERSTATS</span>
        </div>

        {/* Desktop Auth Buttons */}
        <div className="auth-buttons desktop-only">
          <button className="login-btn" onClick={handleLoginClick}>
            Login
          </button>
          <button className="register-btn" onClick={handleRegisterClick}>
            Register
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button 
          className={`hamburger-btn mobile-only ${isMenuOpen ? 'open' : ''}`} 
          onClick={toggleMenu}
          aria-label="Menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
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