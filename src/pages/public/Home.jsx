import React from 'react';
import './Home.css';

function Home() {
  return (
    <div className="public-home">
      <section className="hero-section">
        <h1>Welcome to Observatory Darts Association</h1>
        <p>Home of competitive darts in Cape Town</p>
      </section>

      <section className="stats-section">
        <h2>Quick Stats</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">PLAYERS</span>
            <span className="stat-number">156</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">CLUBS</span>
            <span className="stat-number">9</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">TEAMS</span>
            <span className="stat-number">24</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">MATCHES</span>
            <span className="stat-number">128</span>
          </div>
        </div>
      </section>

      <section className="leaderboard-preview">
        <h2>Top Players by Average</h2>
        <div className="leaderboard-header">
          <span>POS</span>
          <span>PLAYER</span>
          <span>CLUB</span>
          <span>AVE</span>
        </div>
        <div className="leaderboard-list">
          <div className="leaderboard-item">
            <span className="rank">1</span>
            <span className="player-name">John Smith</span>
            <span className="player-club">Guardians</span>
            <span className="player-average">72.4</span>
          </div>
          <div className="leaderboard-item">
            <span className="rank">2</span>
            <span className="player-name">Sarah Jones</span>
            <span className="player-club">Guardians</span>
            <span className="player-average">70.2</span>
          </div>
          <div className="leaderboard-item">
            <span className="rank">3</span>
            <span className="player-name">Mike Brown</span>
            <span className="player-club">Stallions</span>
            <span className="player-average">69.8</span>
          </div>
          <div className="leaderboard-item">
            <span className="rank">4</span>
            <span className="player-name">Tom Wilson</span>
            <span className="player-club">Cathkin</span>
            <span className="player-average">68.9</span>
          </div>
          <div className="leaderboard-item">
            <span className="rank">5</span>
            <span className="player-name">Lisa Adams</span>
            <span className="player-club">Guardians</span>
            <span className="player-average">67.2</span>
          </div>
        </div>
        <a href="/leaderboards" className="view-all-link">VIEW FULL LEADERBOARDS →</a>
      </section>

      <div className="fixtures-results-grid">
        <section className="fixtures-preview">
          <h2>Upcoming Fixtures</h2>
          <div className="fixture-header">
            <span>MATCH</span>
            <span>DATE</span>
          </div>
          <div className="fixtures-list">
            <div className="fixture-item">
              <span className="fixture-teams">Guardians vs Stallions</span>
              <span className="fixture-date">20 MAR</span>
            </div>
            <div className="fixture-item">
              <span className="fixture-teams">Best Order vs Cathkin</span>
              <span className="fixture-date">21 MAR</span>
            </div>
            <div className="fixture-item">
              <span className="fixture-teams">West Point vs Eastside</span>
              <span className="fixture-date">27 MAR</span>
            </div>
          </div>
          <a href="/fixtures" className="view-all-link">VIEW ALL FIXTURES →</a>
        </section>

        <section className="results-preview">
          <h2>Recent Results</h2>
          <div className="result-header">
            <span>MATCH</span>
            <span>SCORE</span>
          </div>
          <div className="results-list">
            <div className="result-item">
              <span className="result-teams">Guardians vs Stallions</span>
              <span className="result-score">8-4</span>
            </div>
            <div className="result-item">
              <span className="result-teams">Best Order vs Cathkin</span>
              <span className="result-score">6-6</span>
            </div>
            <div className="result-item">
              <span className="result-teams">West Point vs Eastside</span>
              <span className="result-score">10-2</span>
            </div>
          </div>
          <a href="/results" className="view-all-link">VIEW ALL RESULTS →</a>
        </section>
      </div>
    </div>
  );
}

export default Home;