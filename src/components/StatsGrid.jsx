// src/components/StatsGrid.jsx (UPDATED - Circle design)
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
  const [lastUpdated, setLastUpdated] = useState(new Date());

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
      setLastUpdated(new Date());
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

  // Tile configurations for circles
  const tiles = [
    {
      number: stats.associations,
      label: 'ASSOCIATIONS',
      accent: 'blue',
      delay: 1
    },
    {
      number: stats.clubs,
      label: 'CLUBS',
      accent: 'pink',
      delay: 2
    },
    {
      number: stats.teams,
      label: 'TEAMS',
      accent: 'purple',
      delay: 3
    },
    {
      number: stats.players,
      label: 'PLAYERS',
      accent: 'blue', // Using blue again, or you could add a green accent later
      delay: 4
    }
  ];

  return (
    <section className="stats-section">
      <div className="stats-container">
        <h2 className="stats-title">
          Platform Stats
          <span className="live-badge">LIVE</span>
        </h2>
        
        {loading ? (
          <div className="stats-loading">
            <div className="neon-loader"></div>
            <p>Loading statistics...</p>
          </div>
        ) : (
          <div className="stats-grid">
            {tiles.map((tile, index) => (
              <StatsTile 
                key={index}
                number={tile.number}
                label={tile.label}
                accent={tile.accent}
                delay={tile.delay}
              />
            ))}
          </div>
        )}

        <p className="stats-update">
          Live updates every 30 seconds • Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      </div>
    </section>
  );
};

export default StatsGrid;