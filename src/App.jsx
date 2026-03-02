// src/App.jsx
import React from 'react';
import Header from './components/Header';
import StatsGrid from './components/StatsGrid';
import './styles/neon-theme.css';
import './App.css';
import { useState } from 'react'; // Add this at the top with your other imports
import AdminLoginModal from './components/AdminLoginModal';

function App() {
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  return (
    <div className="App">
      <Header />
      
      <main className="main-content">
        {/* Hero Section */}
        <section className="hero-section">
  <div className="hero-container">
    <h1 className="hero-title">
      <span className="hero-title-main">STATS MANAGEMENT</span>
      <span className="hero-title-sub">Where Champions Are Made</span>
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
          <p>© 2026 Superstats • Built for the love of the game</p>
        </div>
        
        {/* Add the modal component */}
        <AdminLoginModal 
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
        />
      </footer>
    </div>
  );
}

export default App;