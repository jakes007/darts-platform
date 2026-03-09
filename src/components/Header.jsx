import React from 'react';
import './Header.css';
// If you don't have the logo yet, we'll use a text placeholder for now
// import logo from '../assets/darts-logo.png';

function Header() {
  return (
    <header className="header">
      <div className="container header-container">
        <div className="logo-area">
          {/* Use this when you have the logo: <img src={logo} alt="Darts Stats Logo" className="logo" /> */}
          <div className="logo-placeholder">🎯</div>
          <h1 className="site-title">Darts League</h1>
        </div>
        
        <nav className="desktop-nav">
          <a href="#leagues">Leagues</a>
          <a href="#stats">Stats</a>
          <a href="#fixtures">Fixtures</a>
        </nav>

        <div className="auth-buttons">
          <button className="btn-login">Login</button>
          <button className="btn-register">Register</button>
        </div>

        <button className="mobile-menu-btn">☰</button>
      </div>

      {/* Admin Login - Barely Noticeable */}
      <div className="admin-login-footer">
        <a href="/admin" className="admin-link">⚙️</a>
      </div>
    </header>
  );
}

export default Header;