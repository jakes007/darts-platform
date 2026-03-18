import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './MatchScoreEntry.css';

function MatchScoreEntry({ match, onComplete, onCancel }) {
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [currentLeg, setCurrentLeg] = useState(1);
  const [homeLegs, setHomeLegs] = useState(0);
  const [awayLegs, setAwayLegs] = useState(0);
  const [matchComplete, setMatchComplete] = useState(false);
  const [activePlayer, setActivePlayer] = useState({ team: 'home', index: 0 });
  
  // Stats tracking
  const [playerStats, setPlayerStats] = useState({});

  // Initialize players from match data
  useEffect(() => {
    // This would fetch actual player names from your members collection
    // For now, using placeholder names
    if (match.homePlayers) {
      setHomePlayers(match.homePlayers.map((id, index) => ({
        id,
        name: `Player ${index + 1}`,
        scores: [],
        total180s: 0,
        dartsUsed: 0,
        currentScore: 501
      })));
    }
    if (match.awayPlayers) {
      setAwayPlayers(match.awayPlayers.map((id, index) => ({
        id,
        name: `Player ${index + 1}`,
        scores: [],
        total180s: 0,
        dartsUsed: 0,
        currentScore: 501
      })));
    }
  }, [match]);

  const addScore = (team, playerIndex, score, dartsUsed) => {
    if (team === 'home') {
      const updated = [...homePlayers];
      const player = updated[playerIndex];
      
      // Check if it's a winning score
      if (player.currentScore - score === 0) {
        // Winning score - need to confirm checkout
        const checkoutDarts = prompt(`Winning score! How many darts to checkout? (1-3)`);
        if (checkoutDarts && [1,2,3].includes(parseInt(checkoutDarts))) {
          player.scores.push({ score, dartsUsed: parseInt(checkoutDarts), isCheckout: true });
          player.dartsUsed += parseInt(checkoutDarts);
          player.currentScore = 0;
          // End the leg automatically
          setTimeout(() => endLeg('home'), 500);
        } else {
          alert('Invalid darts count. Score not recorded.');
          return;
        }
      } else if (player.currentScore - score > 0) {
        // Normal score
        player.scores.push({ score, dartsUsed });
        if (score === 180) player.total180s++;
        player.dartsUsed += dartsUsed;
        player.currentScore -= score;
      } else {
        // Busted
        alert('Bust! Score not recorded.');
        return;
      }
      
      if (score === 180) player.total180s++;
      setHomePlayers(updated);
      
      // Move to next player
      setActivePlayer({
        team: 'away',
        index: (playerIndex + 1) % awayPlayers.length
      });
    } else {
      const updated = [...awayPlayers];
      const player = updated[playerIndex];
      
      if (player.currentScore - score === 0) {
        const checkoutDarts = prompt(`Winning score! How many darts to checkout? (1-3)`);
        if (checkoutDarts && [1,2,3].includes(parseInt(checkoutDarts))) {
          player.scores.push({ score, dartsUsed: parseInt(checkoutDarts), isCheckout: true });
          player.dartsUsed += parseInt(checkoutDarts);
          player.currentScore = 0;
          setTimeout(() => endLeg('away'), 500);
        } else {
          alert('Invalid darts count. Score not recorded.');
          return;
        }
      } else if (player.currentScore - score > 0) {
        player.scores.push({ score, dartsUsed });
        if (score === 180) player.total180s++;
        player.dartsUsed += dartsUsed;
        player.currentScore -= score;
      } else {
        alert('Bust! Score not recorded.');
        return;
      }
      
      setAwayPlayers(updated);
      setActivePlayer({
        team: 'home',
        index: (playerIndex + 1) % homePlayers.length
      });
    }
  };

  const endLeg = (winner) => {
    if (winner === 'home') {
      setHomeLegs(homeLegs + 1);
    } else {
      setAwayLegs(awayLegs + 1);
    }
    setCurrentLeg(currentLeg + 1);
    
    // Reset player scores for next leg
    const resetHome = homePlayers.map(p => ({ ...p, currentScore: 501 }));
    const resetAway = awayPlayers.map(p => ({ ...p, currentScore: 501 }));
    setHomePlayers(resetHome);
    setAwayPlayers(resetAway);
    
    // Check if match is complete (best of 7 legs - first to 4)
    if (homeLegs + 1 >= 4 || awayLegs + 1 >= 4) {
      setMatchComplete(true);
    }
  };

  const calculateAverage = (player) => {
    if (player.dartsUsed === 0) return '0.00';
    const totalScore = player.scores.reduce((sum, s) => sum + s.score, 0);
    return (totalScore / player.dartsUsed * 3).toFixed(2);
  };

  const saveMatchResults = async () => {
    // Calculate all stats
    const matchData = {
      homeScore: homeLegs,
      awayScore: awayLegs,
      status: 'completed',
      completedAt: new Date(),
      playerStats: {
        home: homePlayers.reduce((acc, player) => ({
          ...acc,
          [player.id]: {
            scores: player.scores,
            total180s: player.total180s,
            dartsUsed: player.dartsUsed,
            average: calculateAverage(player),
            checkoutDarts: player.scores.filter(s => s.isCheckout).map(s => s.dartsUsed)
          }
        }), {}),
        away: awayPlayers.reduce((acc, player) => ({
          ...acc,
          [player.id]: {
            scores: player.scores,
            total180s: player.total180s,
            dartsUsed: player.dartsUsed,
            average: calculateAverage(player),
            checkoutDarts: player.scores.filter(s => s.isCheckout).map(s => s.dartsUsed)
          }
        }), {})
      }
    };

    await updateDoc(doc(db, 'matches', match.id), matchData);
    onComplete();
  };

  const getActiveClass = (team, index) => {
    return activePlayer.team === team && activePlayer.index === index ? 'active-turn' : '';
  };

  return (
    <div className="score-entry">
      <div className="match-header">
        <h2>{match.homeTeamId} vs {match.awayTeamId}</h2>
        <div className="leg-score">
          <span className={homeLegs > awayLegs ? 'leading' : ''}>{homeLegs}</span>
          <span>-</span>
          <span className={awayLegs > homeLegs ? 'leading' : ''}>{awayLegs}</span>
        </div>
        <div className="leg-indicator">Leg {currentLeg}</div>
      </div>

      <div className="teams-container">
        {/* Home Team */}
        <div className="team-column home">
          <h3>{match.homeTeamId}</h3>
          {homePlayers.map((player, idx) => (
            <div key={player.id} className={`player-row ${getActiveClass('home', idx)}`}>
              <div className="player-header">
                <span className="player-name">{player.name}</span>
                <span className="player-score">{player.currentScore}</span>
              </div>
              <div className="score-inputs">
                <input 
                  type="number" 
                  placeholder="Score"
                  id={`home-${idx}-score`}
                  min="0"
                  max="180"
                  disabled={activePlayer.team !== 'home' || activePlayer.index !== idx}
                />
                <select 
                  id={`home-${idx}-darts`}
                  disabled={activePlayer.team !== 'home' || activePlayer.index !== idx}
                >
                  <option value="3">3 darts</option>
                  <option value="2">2 darts</option>
                  <option value="1">1 dart</option>
                </select>
                <button 
                  onClick={() => {
                    const score = document.getElementById(`home-${idx}-score`).value;
                    const darts = document.getElementById(`home-${idx}-darts`).value;
                    if (score) addScore('home', idx, parseInt(score), parseInt(darts));
                  }}
                  disabled={activePlayer.team !== 'home' || activePlayer.index !== idx}
                >
                  Add
                </button>
              </div>
              <div className="player-stats">
                <span>🎯 180s: {player.total180s}</span>
                <span>🎯 Darts: {player.dartsUsed}</span>
                <span>📊 Avg: {calculateAverage(player)}</span>
              </div>
              <div className="recent-scores">
                {player.scores.slice(-3).map((s, i) => (
                  <span key={i} className={s.isCheckout ? 'checkout' : ''}>
                    {s.score}{s.isCheckout ? '✓' : ''}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <button 
            className="leg-winner home" 
            onClick={() => endLeg('home')}
            disabled={matchComplete}
          >
            Home Wins Leg {currentLeg}
          </button>
        </div>

        {/* Away Team */}
        <div className="team-column away">
          <h3>{match.awayTeamId}</h3>
          {awayPlayers.map((player, idx) => (
            <div key={player.id} className={`player-row ${getActiveClass('away', idx)}`}>
              <div className="player-header">
                <span className="player-name">{player.name}</span>
                <span className="player-score">{player.currentScore}</span>
              </div>
              <div className="score-inputs">
                <input 
                  type="number" 
                  placeholder="Score"
                  id={`away-${idx}-score`}
                  min="0"
                  max="180"
                  disabled={activePlayer.team !== 'away' || activePlayer.index !== idx}
                />
                <select 
                  id={`away-${idx}-darts`}
                  disabled={activePlayer.team !== 'away' || activePlayer.index !== idx}
                >
                  <option value="3">3 darts</option>
                  <option value="2">2 darts</option>
                  <option value="1">1 dart</option>
                </select>
                <button 
                  onClick={() => {
                    const score = document.getElementById(`away-${idx}-score`).value;
                    const darts = document.getElementById(`away-${idx}-darts`).value;
                    if (score) addScore('away', idx, parseInt(score), parseInt(darts));
                  }}
                  disabled={activePlayer.team !== 'away' || activePlayer.index !== idx}
                >
                  Add
                </button>
              </div>
              <div className="player-stats">
                <span>🎯 180s: {player.total180s}</span>
                <span>🎯 Darts: {player.dartsUsed}</span>
                <span>📊 Avg: {calculateAverage(player)}</span>
              </div>
              <div className="recent-scores">
                {player.scores.slice(-3).map((s, i) => (
                  <span key={i} className={s.isCheckout ? 'checkout' : ''}>
                    {s.score}{s.isCheckout ? '✓' : ''}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <button 
            className="leg-winner away" 
            onClick={() => endLeg('away')}
            disabled={matchComplete}
          >
            Away Wins Leg {currentLeg}
          </button>
        </div>
      </div>

      {matchComplete && (
        <div className="match-complete">
          <h3>Match Complete!</h3>
          <p>Final Score: {homeLegs} - {awayLegs}</p>
          <div className="match-actions">
            <button className="save-btn" onClick={saveMatchResults}>Save Results</button>
            <button className="cancel-btn" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MatchScoreEntry;