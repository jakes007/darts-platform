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
  {/* Short title (ODA) removed - now just logo on mobile */}
</h1>
        </div>
        
        <nav className={`desktop-nav ${menuOpen ? 'mobile-open' : ''}`}>
          <a href="#leagues">Leagues</a>
          <a href="#stats">Stats</a>
          <a href="#fixtures">Fixtures</a>
          <div className="mobile-auth-buttons">
            <button className="btn-login">Login</button>
            <button className="btn-register">Register</button>
          </div>
        </nav>

        <div className="auth-buttons desktop-only">
          <button className="btn-login">Login</button>
          <button className="btn-register">Register</button>
        </div>

        <button className="mobile-menu-btn" onClick={toggleMenu}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
    </header>
  );
}

export default Header;