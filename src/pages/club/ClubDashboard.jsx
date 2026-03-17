import React, { useState } from 'react';
import { useUserView } from '../../context/UserViewContext';
import ProfileTab from '../../components/ProfileTab';
import './ClubDashboard.css';

function ClubDashboard() {
  const { currentViewingUser, getClubName } = useUserView();
  const [activeTab, setActiveTab] = useState('stats');

  if (!currentViewingUser) {
    return (
      <div className="dashboard-container">
        <div className="no-user-message">
          <h2>No user selected</h2>
          <p>Please select a user from the switcher to view their dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Centered Header Section */}
      <div className="dashboard-header centered">
        <h1 className="club-name">{getClubName(currentViewingUser.clubId)}</h1>
        <p className="welcome-message">
          Welcome back, {currentViewingUser.firstNames} {currentViewingUser.surname}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Stats
        </button>
        <button 
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profile
        </button>
        <button 
          className={`tab-btn ${activeTab === 'fixtures' ? 'active' : ''}`}
          onClick={() => setActiveTab('fixtures')}
        >
          📅 Fixtures
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'stats' && (
        <>
          {/* Stats Grid */}
          <div className="stats-section">
            <h2>Your Stats</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Average</span>
                <span className="stat-value">--</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">180s</span>
                <span className="stat-value">--</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">High Checkout</span>
                <span className="stat-value">--</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Matches</span>
                <span className="stat-value">--</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Win %</span>
                <span className="stat-value">--</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Tons</span>
                <span className="stat-value">--</span>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="dashboard-grid">
            {/* Left Column - Upcoming Fixtures */}
            <div className="dashboard-card">
              <h2>📅 Upcoming Fixtures</h2>
              <div className="empty-state">
                <p>No fixtures scheduled yet</p>
                <span className="empty-hint">Fixtures will appear here once scheduled</span>
              </div>
            </div>

            {/* Right Column - Recent Results */}
            <div className="dashboard-card">
              <h2>📈 Recent Results</h2>
              <div className="empty-state">
                <p>No results recorded yet</p>
                <span className="empty-hint">Match results will appear here</span>
              </div>
            </div>
          </div>

          {/* Team Stats Section */}
          <div className="team-stats-section">
            <h2>Team Statistics</h2>
            <div className="empty-state">
              <p>Team statistics coming soon</p>
              <span className="empty-hint">Once matches are played, team stats will appear here</span>
            </div>
          </div>
        </>
      )}

      {activeTab === 'profile' && (
        <ProfileTab />
      )}

      {activeTab === 'fixtures' && (
        <div className="dashboard-card">
          <h2>📅 Full Fixtures</h2>
          <div className="empty-state">
            <p>Fixtures page coming soon</p>
            <span className="empty-hint">All fixtures will be displayed here</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClubDashboard;