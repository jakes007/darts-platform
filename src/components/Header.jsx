import React, { useState, useEffect } from 'react';
import './Header.css';
import logo from '../assets/darts-logo.png';
import logoMobile from '../assets/darts-logo2.png';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import UserSwitcher from './UserSwitcher';
import { useAuth } from '../context/AuthContext';
import { useUserView } from '../context/UserViewContext';

function Header({ onAdminLoginClick }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  const { currentUser, logout, isAdmin, loginSource } = useAuth();
  const { currentViewingUser } = useUserView();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleAdminClick = (e) => {
    e.preventDefault();
    toggleMenu();
    if (onAdminLoginClick) {
      onAdminLoginClick();
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toggleMenu();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Determine dashboard link based on user role
  const dashboardLink = isAdmin ? '/admin' : '/dashboard';

  // Debug log
  console.log('Header - isAdmin:', isAdmin, 'loginSource:', loginSource);

  // Only show User Switcher when logged in as admin through MEMBER login
  const showUserSwitcher = isAdmin && loginSource === 'member';

  // Close menu when screen size increases
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [menuOpen]);

  // Prevent body scroll when menu is open
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
    <>
      <header className="header">
        <div className="container header-container">
          {/* Top row with logo and auth buttons */}
          <div className="header-top-row">
            <div className="logo-area">
              <a href="/" className="logo-link">
                <img src={logo} alt="Observatory Darts Association" className="logo desktop-logo" />
                <img src={logoMobile} alt="ODA" className="logo mobile-logo" />
              </a>
              <h1 className="site-title">
                <span className="full-title">Observatory Darts Association</span>
              </h1>
            </div>

            {/* Desktop Auth Section */}
            {!currentUser && (
              <div className="desktop-auth">
                <button className="btn-login" onClick={() => setShowLoginModal(true)}>Login</button>
                <button className="btn-register" onClick={() => setShowRegisterModal(true)}>Register</button>
              </div>
            )}

            {currentUser && (
              <div className="desktop-user-section">
                {/* User Switcher - Only for admins who logged in through Member Login */}
                {showUserSwitcher && <UserSwitcher />}
                
                {/* Logout button for ALL logged-in users */}
                <button className="btn-logout desktop-logout" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}

            {/* Mobile Burger Button */}
            <button className="mobile-menu-btn" onClick={toggleMenu}>
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>

          {/* Desktop Navigation - Centered below logo */}
          <nav className="desktop-nav">
            <a href="/">Home</a>
            {currentUser && <a href={dashboardLink}>Dashboard</a>}
            <a href="/leaderboards">Leaderboards</a>
            <a href="/fixtures">Fixtures</a>
            <a href="/results">Results</a>
          </nav>

          {/* Mobile Menu */}
          <div className={`mobile-menu-overlay ${menuOpen ? 'open' : ''}`} onClick={toggleMenu}>
            <nav className="mobile-nav" onClick={(e) => e.stopPropagation()}>
              <a href="/" onClick={toggleMenu}>Home</a>
              {currentUser && <a href={dashboardLink} onClick={toggleMenu}>Dashboard</a>}
              <a href="/leaderboards" onClick={toggleMenu}>Leaderboards</a>
              <a href="/fixtures" onClick={toggleMenu}>Fixtures</a>
              <a href="/results" onClick={toggleMenu}>Results</a>
              
              <div className="mobile-auth">
                {!currentUser ? (
                  <>
                    <button className="btn-login" onClick={() => {
                      toggleMenu();
                      setShowLoginModal(true);
                    }}>Login</button>
                    <button className="btn-register" onClick={() => {
                      toggleMenu();
                      setShowRegisterModal(true);
                    }}>Register</button>
                  </>
                ) : (
                  <>
                    {/* User Switcher - Only for admins who logged in through Member Login */}
                    {showUserSwitcher && <UserSwitcher />}
                    
                    <button className="btn-logout" onClick={handleLogout}>Logout</button>
                    
                    {/* Show viewing info only for regular users, not admin */}
                    {!isAdmin && currentViewingUser && (
                      <div className="mobile-viewing">
                        <span>Viewing: {currentViewingUser.firstNames} {currentViewingUser.surname}</span>
                      </div>
                    )}
                  </>
                )}
                
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

      {/* Modals */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
      />

      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
        }}
      />
    </>
  );
}

export default Header;