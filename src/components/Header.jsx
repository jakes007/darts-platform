import React, { useState, useEffect } from 'react';
import './Header.css';
import logo from '../assets/darts-logo.png';
import logoMobile from '../assets/darts-logo2.png';

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
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
          {/* Desktop logo */}
          <img 
            src={logo} 
            alt="Observatory Darts Association" 
            className="logo desktop-logo" 
          />
          {/* Mobile logo */}
          <img 
            src={logoMobile} 
            alt="ODA" 
            className="logo mobile-logo" 
          />
          <h1 className="site-title">
            <span className="full-title">Observatory Darts Association</span>
          </h1>
        </div>

        {/* Desktop Navigation - only visible on desktop */}
        <nav className="desktop-nav">
          <a href="#leagues">Leagues</a>
          <a href="#stats">Stats</a>
          <a href="#fixtures">Fixtures</a>
        </nav>

        {/* Desktop Auth Buttons - only visible on desktop */}
        <div className="desktop-auth">
          <button className="btn-login">Login</button>
          <button className="btn-register">Register</button>
        </div>

        {/* Mobile Burger Button - only visible on mobile */}
        <button 
          className="mobile-menu-btn" 
          onClick={toggleMenu}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        {/* Mobile Menu - contains ALL links for mobile */}
        <div className={`mobile-menu-overlay ${menuOpen ? 'open' : ''}`}>
          <nav className="mobile-nav">
            <button className="mobile-close-btn" onClick={toggleMenu}>✕</button>
            <a href="#leagues" onClick={toggleMenu}>Leagues</a>
            <a href="#stats" onClick={toggleMenu}>Stats</a>
            <a href="#fixtures" onClick={toggleMenu}>Fixtures</a>
            <div className="mobile-auth">
              <button className="btn-login mobile-btn" onClick={toggleMenu}>Login</button>
              <button className="btn-register mobile-btn" onClick={toggleMenu}>Register</button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;