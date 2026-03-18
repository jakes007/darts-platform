import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import './Leaderboards.css';

function Leaderboards() {
  const [loading, setLoading] = useState(true);
  const [topAverage, setTopAverage] = useState([]);
  const [top180s, setTop180s] = useState([]);
  const [topCheckouts, setTopCheckouts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // You'll need to adjust these queries based on your actual stats structure
        // This is a placeholder for when you have player stats
        
        // For now, just set empty arrays
        setTopAverage([]);
        setTop180s([]);
        setTopCheckouts([]);
        
      } catch (error) {
        console.error('Error fetching leaderboards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="public-leaderboards">
      <h1>Leaderboards</h1>
      
      <div className="leaderboards-grid">
        <section className="leaderboard-card">
          <h2>Top 10 - Average</h2>
          {loading ? (
            <div className="empty-state">
              <p>Loading...</p>
            </div>
          ) : topAverage.length > 0 ? (
            <div className="leaderboard-table">
              <div className="table-header">
                <span>Rank</span>
                <span>Player</span>
                <span>Club</span>
                <span>Avg</span>
              </div>
              {topAverage.map((player, index) => (
                <div key={player.id} className="table-row">
                  <span>{index + 1}</span>
                  <span>{player.firstNames} {player.surname}</span>
                  <span>{player.clubId || '—'}</span>
                  <span>{player.average || '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No statistics available yet</p>
              <span className="empty-hint">Leaderboards will appear once matches have been played</span>
            </div>
          )}
        </section>

        <section className="leaderboard-card">
          <h2>Top 10 - 180s</h2>
          {loading ? (
            <div className="empty-state">
              <p>Loading...</p>
            </div>
          ) : top180s.length > 0 ? (
            <div className="leaderboard-table">
              <div className="table-header">
                <span>Rank</span>
                <span>Player</span>
                <span>Club</span>
                <span>180s</span>
              </div>
              {top180s.map((player, index) => (
                <div key={player.id} className="table-row">
                  <span>{index + 1}</span>
                  <span>{player.firstNames} {player.surname}</span>
                  <span>{player.clubId || '—'}</span>
                  <span>{player.total180s || '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No statistics available yet</p>
              <span className="empty-hint">180s will appear once matches have been played</span>
            </div>
          )}
        </section>

        <section className="leaderboard-card">
          <h2>Top 10 - High Checkout</h2>
          {loading ? (
            <div className="empty-state">
              <p>Loading...</p>
            </div>
          ) : topCheckouts.length > 0 ? (
            <div className="leaderboard-table">
              <div className="table-header">
                <span>Rank</span>
                <span>Player</span>
                <span>Club</span>
                <span>Checkout</span>
              </div>
              {topCheckouts.map((player, index) => (
                <div key={player.id} className="table-row">
                  <span>{index + 1}</span>
                  <span>{player.firstNames} {player.surname}</span>
                  <span>{player.clubId || '—'}</span>
                  <span>{player.highestCheckout || '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No statistics available yet</p>
              <span className="empty-hint">High checkouts will appear once matches have been played</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Leaderboards;