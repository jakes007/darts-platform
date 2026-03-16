import React, { useState, useEffect } from 'react';
import './Header.css';
import logo from '../assets/darts-logo.png';
import logoMobile from '../assets/darts-logo2.png';

function Header({ onAdminLoginClick }) {
  const [menuOpen, setMenuOpen] = useState(false);

  console.log('Header rendered, onAdminLoginClick:', onAdminLoginClick); // Debug

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleAdminClick = (e) => {
    e.preventDefault();
    console.log('Admin login clicked');
    toggleMenu();
    
    if (onAdminLoginClick) {
      console.log('Calling onAdminLoginClick');
      onAdminLoginClick();
    } else {
      console.log('ERROR: onAdminLoginClick is undefined');
    }
  };

  // Close menu when screen size increases above mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && menuOpen) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [menuOpen]);

  // Prevent body scroll when menu is open on mobile
  useEffect(() => {
    if (menuOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  return (
    <header className="header">
      <div className="container header-container">
        <div className="logo-area">
          <img 
            src={logo} 
            alt="Observatory Darts Association" 
            className="logo desktop-logo" 
          />
          <img 
            src={logoMobile} 
            alt="ODA" 
            className="logo mobile-logo" 
          />
          <h1 className="site-title">
            <span className="full-title">Observatory Darts Association</span>
          </h1>
        </div>

        {/* Desktop Auth Buttons */}
        <div className="desktop-auth">
          <button className="btn-login">Login</button>
          <button className="btn-register">Register</button>
        </div>

        {/* Mobile Burger Button */}
        <button 
          className="mobile-menu-btn" 
          onClick={toggleMenu}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        {/* Mobile Menu */}
        <div className={`mobile-menu-overlay ${menuOpen ? 'open' : ''}`} onClick={toggleMenu}>
          <nav className="mobile-nav" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-auth">
              <button className="btn-login" onClick={toggleMenu}>Login</button>
              <button className="btn-register" onClick={toggleMenu}>Register</button>
              
              {/* Admin Login Link - Mobile Only */}
              <div className="mobile-admin-link">
                <a href="#" onClick={handleAdminClick} className="admin-login-link">
                  Admin Login
                </a>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;