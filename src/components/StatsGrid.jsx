// src/components/StatsGrid.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import StatsTile from './StatsTile';
import './StatsGrid.css';

const StatsGrid = () => {
  const [stats, setStats] = useState({
    associations: 0,
    clubs: 0,
    teams: 0,
    players: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch real counts from Firebase
  const fetchStats = async () => {
    try {
      const associationsSnap = await getDocs(collection(db, 'associations'));
      const clubsSnap = await getDocs(collection(db, 'clubs'));
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const playersSnap = await getDocs(collection(db, 'players'));

      setStats({
        associations: associationsSnap.size,
        clubs: clubsSnap.size,
        teams: teamsSnap.size,
        players: playersSnap.size
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // If collections don't exist yet, show 0
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and every 30 seconds (real-time feel)
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Tile configurations
  const tiles = [
    {
      icon: '🏢',
      label: 'Associations',
      value: stats.associations,
      color: 'var(--neon-blue)',
      glowColor: 'var(--glow-blue)'
    },
    {
      icon: '🏠',
      label: 'Clubs',
      value: stats.clubs,
      color: 'var(--neon-pink)',
      glowColor: 'var(--glow-pink)'
    },
    {
      icon: '👥',
      label: 'Teams',
      value: stats.teams,
      color: 'var(--neon-purple)',
      glowColor: 'var(--glow-purple)'
    },
    {
      icon: '🎯',
      label: 'Players',
      value: stats.players,
      color: 'var(--neon-cyan)',
      glowColor: '0 0 10px rgba(77, 255, 181, 0.5)'
    }
  ];

  return (
    <section className="stats-section">
      <div className="stats-container">
        <h2 className="stats-title">
          Live Platform Statistics
          <span className="live-badge">LIVE</span>
        </h2>
        
        {loading ? (
          <div className="stats-loading">
            <div className="neon-loader"></div>
            <p>Loading stats...</p>
          </div>
        ) : (
          <div className="stats-grid">
            {tiles.map((tile, index) => (
              <StatsTile key={index} {...tile} />
            ))}
          </div>
        )}

        <p className="stats-update">
          Updates every 30 seconds • {new Date().toLocaleTimeString()}
        </p>
      </div>
    </section>
  );
};

export default StatsGrid;