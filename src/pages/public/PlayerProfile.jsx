import React from 'react';
import { useParams } from 'react-router-dom';
import './PlayerProfile.css';

function PlayerProfile() {
  const { id } = useParams(); // This will get the player ID from the URL
  
  return (
    <div className="player-profile">
      <div className="profile-header">
        <h1>John Smith</h1>
        <p className="player-team">Guardians 1 • Active Player</p>
      </div>
      
      <div className="profile-stats-grid">
        <div className="stat-card">
          <span className="stat-value">45</span>
          <span className="stat-label">Matches</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">68.4</span>
          <span className="stat-label">Average</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">23</span>
          <span className="stat-label">180s</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">170</span>
          <span className="stat-label">High Checkout</span>
        </div>
      </div>
      
      <section className="season-stats">
        <h2>Season History</h2>
        
        <div className="season-card">
          <h3>Memorial 2026</h3>
          <div className="season-stats-grid">
            <div>
              <span className="stat-label">Matches</span>
              <span className="stat-number">12</span>
            </div>
            <div>
              <span className="stat-label">Average</span>
              <span className="stat-number">72.4</span>
            </div>
            <div>
              <span className="stat-label">180s</span>
              <span className="stat-number">8</span>
            </div>
          </div>
        </div>
        
        <div className="season-card">
          <h3>League 2026</h3>
          <div className="season-stats-grid">
            <div>
              <span className="stat-label">Matches</span>
              <span className="stat-number">8</span>
            </div>
            <div>
              <span className="stat-label">Average</span>
              <span className="stat-number">70.2</span>
            </div>
            <div>
              <span className="stat-label">180s</span>
              <span className="stat-number">5</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PlayerProfile;