import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import './StatsCards.css';

function StatsCards() {
  const [stats, setStats] = useState({
    totalPlayers: 0,
    totalDivisions: 0,
    highestScore: 0,
    topAverage: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Try to fetch from Firestore
        const playersSnap = await getDocs(collection(db, 'players'));
        const divisionsSnap = await getDocs(collection(db, 'divisions'));
        
        // For now, if collections are empty, use the sample data from the website
        setStats({
          totalPlayers: playersSnap.size || 96,
          totalDivisions: divisionsSnap.size || 9,
          highestScore: 177,
          topAverage: 83.5
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        // Fallback to sample data if Firebase fails
        setStats({
          totalPlayers: 96,
          totalDivisions: 9,
          highestScore: 177,
          topAverage: 83.5
        });
      }
    };

    fetchStats();
  }, []);

  const statItems = [
    { label: 'Total Players', value: stats.totalPlayers, icon: '🎯' },
    { label: 'Divisions', value: stats.totalDivisions, icon: '🏆' },
    { label: 'Highest Score', value: `> ${stats.highestScore}`, icon: '📈' },
    { label: 'Top Average', value: stats.topAverage, icon: '⭐' }
  ];

  return (
    <section className="stats-section">
      <div className="container">
        <div className="stats-grid">
          {statItems.map((item, index) => (
            <div key={index} className="stat-card">
              <span className="stat-icon">{item.icon}</span>
              <h3 className="stat-value">{item.value}</h3>
              <p className="stat-label">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default StatsCards;