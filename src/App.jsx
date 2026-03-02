// 🔍 FILE: src/App.jsx
// Complete corrected file

import { useState } from 'react';
import Header from './components/Header';
import StatsGrid from './components/StatsGrid';
import AdminLoginModal from './components/AdminLoginModal';
import UserLoginModal from './components/UserLoginModal';
import './App.css';

function App() {
  // Two separate states for two different modals
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  return (
    <div className="App">
      {/* Pass the USER modal opener to Header */}
      <Header onLoginClick={() => setIsUserModalOpen(true)} />
      
      <main className="main-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-container">
            <h1 className="hero-title">
              <span className="hero-title-main">DASHBOARD</span>
              <span className="hero-title-sub">Where Champions' Stats Are Kept</span>
            </h1>
            <p className="hero-description">
              The ultimate management platform for darts Associations, Clubs, Teams, and Players.
              Track statistics, manage competitions, and grow the sport.
            </p>
          </div>
        </section>

        {/* Stats Grid - This shows live Firebase data */}
        <StatsGrid />

        {/* Coming Soon Section */}
        <section className="coming-soon">
          <div className="coming-soon-container">
            <h2>Guest Dashboard</h2>
            <div className="feature-cards">
              <div className="feature-card">
                <span className="feature-icon">📊</span>
                <h3>Match Statistics</h3>
                <p>Detailed match tracking and player performance analytics</p>
              </div>
              <div className="feature-card">
                <span className="feature-icon">🏆</span>
                <h3>Competitions</h3>
                <p>Create and manage leagues, tournaments, and ladders</p>
              </div>
              <div className="feature-card">
                <span className="feature-icon">👤</span>
                <h3>Player Profiles</h3>
                <p>Individual player statistics and career history</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <button 
            className="admin-login-link"
            onClick={() => setIsAdminModalOpen(true)}
          >
            Admin Login
          </button>
          <p>© 2026 SUPERSTATS • Built for the love of the game</p>
        </div>
        
        {/* Admin Modal - opens from footer */}
        <AdminLoginModal 
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
        />
        
        {/* User Modal - opens from header */}
        <UserLoginModal 
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
        />
      </footer>
    </div>
  );
}

export default App;