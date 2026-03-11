import React, { useState } from 'react';
import './Header.css';
import logo from '../assets/darts-logo.png'; // Desktop logo
import logoMobile from '../assets/darts-logo2.png'; // Mobile logo

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <header className="header">
      <div className="container header-container">
        <div className="logo-area">
          {/* Desktop logo - hidden on mobile */}
          <img src={logo} alt="Darts Stats Logo" className="logo desktop-logo" />
          {/* Mobile logo - hidden on desktop */}
          <img src={logoMobile} alt="Darts Stats Logo" className="logo mobile-logo" />
          <h1 className="site-title">
            <span className="full-title">Observatory Darts Association</span>
            {/* Short title removed - using logo only on mobile */}
          </h1>
        </div>
        
        {/* Auth buttons moved to the right on desktop */}
        <div className="auth-buttons">
          <button className="btn-login">Login</button>
          <button className="btn-register">Register</button>
        </div>

        {/* Burger menu button */}
        <button className="mobile-menu-btn" onClick={toggleMenu}>
          {menuOpen ? '✕' : '☰'}
        </button>

        {/* Navigation links - ONLY in burger menu on all screen sizes */}
        <nav className={`mobile-nav ${menuOpen ? 'open' : ''}`}>
          <a href="#leagues">Leagues</a>
          <a href="#stats">Stats</a>
          <a href="#fixtures">Fixtures</a>
        </nav>
      </div>
    </header>
  );
}

export default Header;