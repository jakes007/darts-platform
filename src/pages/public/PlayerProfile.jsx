import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import './PlayerProfile.css';

function PlayerProfile() {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        // Fetch player details
        const playerDoc = await getDoc(doc(db, 'members', id));
        if (playerDoc.exists()) {
          setPlayer({ id: playerDoc.id, ...playerDoc.data() });
        }

        // Fetch player's matches (you'll need to adjust this based on your match structure)
        // This assumes matches store player IDs
        const matchesQuery = query(
          collection(db, 'matches'),
          where('players', 'array-contains', id)
        );
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesData = [];
        matchesSnapshot.forEach((doc) => {
          matchesData.push({ id: doc.id, ...doc.data() });
        });
        setMatches(matchesData);

      } catch (error) {
        console.error('Error fetching player:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [id]);

  if (loading) {
    return (
      <div className="player-profile">
        <div className="empty-state">
          <p>Loading player profile...</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="player-profile">
        <div className="empty-state">
          <h2>Player Not Found</h2>
          <p>The player you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="player-profile">
      <div className="profile-header">
        <h1>{player.firstNames} {player.surname}</h1>
        <p className="player-team">{player.clubId || 'No club'} • {player.status || 'Active'}</p>
      </div>
      
      <div className="profile-stats-grid">
        <div className="stat-card">
          <span className="stat-value">{player.matchesPlayed || '—'}</span>
          <span className="stat-label">Matches</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{player.average || '—'}</span>
          <span className="stat-label">Average</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{player.total180s || '—'}</span>
          <span className="stat-label">180s</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{player.highestCheckout || '—'}</span>
          <span className="stat-label">High Checkout</span>
        </div>
      </div>
      
      <section className="recent-matches">
        <h2>Recent Matches</h2>
        {matches.length > 0 ? (
          <div className="matches-list">
            {matches.slice(0, 5).map(match => (
              <div key={match.id} className="match-card">
                <span className="match-date">
                  {new Date(match.date).toLocaleDateString('en-ZA')}
                </span>
                <span className="match-opponent">
                  vs {match.opponent || 'Unknown'}
                </span>
                <span className="match-result">
                  {match.result || '—'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No match history available</p>
            <span className="empty-hint">Match results will appear here once the player has participated in matches</span>
          </div>
        )}
      </section>
      
      <section className="season-history">
        <h2>Season History</h2>
        <div className="empty-state">
          <p>Season statistics coming soon</p>
          <span className="empty-hint">Season breakdown will appear here once data is available</span>
        </div>
      </section>
    </div>
  );
}

export default PlayerProfile;