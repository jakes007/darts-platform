// src/components/Header.jsx
import React, { useState, useEffect } from 'react';
import './Header.css'; // We'll create this next

const Header = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [menuOpen, setMenuOpen] = useState(false);

  // Check screen size for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setMenuOpen(false); // Close menu on desktop
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo - left side with text */}
<div className="logo-container">
  <img 
    src="/darts-logo.png" 
    alt="Darts Platform" 
    className="logo"
  />
  <span className="logo-text">SUPERSTATS</span>
</div>

        {/* Right side - Desktop buttons or mobile hamburger */}
        <div className="header-right">
          {!isMobile ? (
            // Desktop view - buttons side by side
            <div className="auth-buttons">
              <button className="auth-btn login-btn">Login</button>
              <button className="auth-btn register-btn">Register</button>
            </div>
          ) : (
            // Mobile view - hamburger
            <>
              <button 
                className={`hamburger ${menuOpen ? 'open' : ''}`}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
              
              {/* Mobile menu dropdown */}
              {menuOpen && (
                <div className="mobile-menu">
                  <button className="mobile-auth-btn login-btn">Login</button>
                  <button className="mobile-auth-btn register-btn">Register</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;