import React from 'react';
import './Leaderboards.css';

function Leaderboards() {
  return (
    <div className="public-leaderboards">
      <h1>Leaderboards</h1>
      
      <div className="leaderboards-grid">
        <section className="leaderboard-card">
          <h2>Top 10 - Average</h2>
          <div className="leaderboard-table">
            <div className="table-header">
              <span>Rank</span>
              <span>Player</span>
              <span>Club</span>
              <span>Avg</span>
            </div>
            <div className="table-row">
              <span>1</span>
              <span>John Smith</span>
              <span>Guardians</span>
              <span>72.4</span>
            </div>
            <div className="table-row">
              <span>2</span>
              <span>Sarah Jones</span>
              <span>Guardians</span>
              <span>70.2</span>
            </div>
            <div className="table-row">
              <span>3</span>
              <span>Mike Brown</span>
              <span>Stallions</span>
              <span>69.8</span>
            </div>
            <div className="table-row">
              <span>4</span>
              <span>Tom Wilson</span>
              <span>Cathkin</span>
              <span>68.9</span>
            </div>
            <div className="table-row">
              <span>5</span>
              <span>Lisa Adams</span>
              <span>Guardians</span>
              <span>67.2</span>
            </div>
          </div>
        </section>

        <section className="leaderboard-card">
          <h2>Top 10 - 180s</h2>
          <div className="leaderboard-table">
            <div className="table-header">
              <span>Rank</span>
              <span>Player</span>
              <span>Club</span>
              <span>180s</span>
            </div>
            <div className="table-row">
              <span>1</span>
              <span>John Smith</span>
              <span>Guardians</span>
              <span>23</span>
            </div>
            <div className="table-row">
              <span>2</span>
              <span>Mike Brown</span>
              <span>Stallions</span>
              <span>19</span>
            </div>
            <div className="table-row">
              <span>3</span>
              <span>Sarah Jones</span>
              <span>Guardians</span>
              <span>17</span>
            </div>
          </div>
        </section>

        <section className="leaderboard-card">
          <h2>Top 10 - High Checkout</h2>
          <div className="leaderboard-table">
            <div className="table-header">
              <span>Rank</span>
              <span>Player</span>
              <span>Club</span>
              <span>Checkout</span>
            </div>
            <div className="table-row">
              <span>1</span>
              <span>John Smith</span>
              <span>Guardians</span>
              <span>170</span>
            </div>
            <div className="table-row">
              <span>2</span>
              <span>Sarah Jones</span>
              <span>Guardians</span>
              <span>164</span>
            </div>
            <div className="table-row">
              <span>3</span>
              <span>Mike Brown</span>
              <span>Stallions</span>
              <span>160</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Leaderboards;