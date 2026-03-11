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
      if (window.innerWidth >= 900 && menuOpen) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [menuOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
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
        
        <div className="auth-buttons">
          <button className="btn-login">Login</button>
          <button className="btn-register">Register</button>
        </div>

        <button 
          className="mobile-menu-btn" 
          onClick={toggleMenu}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <nav className={`mobile-nav ${menuOpen ? 'open' : ''}`}>
          <a href="#leagues" onClick={toggleMenu}>Leagues</a>
          <a href="#stats" onClick={toggleMenu}>Stats</a>
          <a href="#fixtures" onClick={toggleMenu}>Fixtures</a>
        </nav>
      </div>
    </header>
  );
}

export default Header;