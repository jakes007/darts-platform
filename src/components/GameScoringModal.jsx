import React, { useState, useEffect } from 'react';
import './GameScoringModal.css';

function GameScoringModal({ 
  game, 
  homePlayerName, 
  awayPlayerName,
  scoringMode, 
  onSave, 
  onClose,
  existingStats 
}) {
  const [homeStats, setHomeStats] = useState({
    tonPlus: existingStats?.home?.tonPlus || 0,
    oneEighty: existingStats?.home?.oneEighty || 0,
    highCheckout: existingStats?.home?.highCheckout || '',
    scoreLeft: existingStats?.home?.scoreLeft || '',
    dartsUsed: existingStats?.home?.dartsUsed || ''
  });
  
  const [awayStats, setAwayStats] = useState({
    tonPlus: existingStats?.away?.tonPlus || 0,
    oneEighty: existingStats?.away?.oneEighty || 0,
    highCheckout: existingStats?.away?.highCheckout || '',
    scoreLeft: existingStats?.away?.scoreLeft || '',
    dartsUsed: existingStats?.away?.dartsUsed || ''
  });
  
  const [winner, setWinner] = useState(existingStats?.winner || null);
  const [notes, setNotes] = useState(existingStats?.notes || '');
  const [validationError, setValidationError] = useState('');

  // Calculate total score for a player
  const calculateTotalScore = (stats) => {
    const tonPlusTotal = (parseInt(stats.tonPlus) || 0) * 100;
    const oneEightyTotal = (parseInt(stats.oneEighty) || 0) * 180;
    const highCheckoutTotal = parseInt(stats.highCheckout) || 0;
    return tonPlusTotal + oneEightyTotal + highCheckoutTotal;
  };

  // Validate winner's score
  const validateWinnerScore = () => {
    if (!winner) return true;
    
    const winningStats = winner === 'home' ? homeStats : awayStats;
    const totalScore = calculateTotalScore(winningStats);
    
    if (totalScore !== 501) {
      setValidationError(`Winner's total score must be 501. Current total: ${totalScore}`);
      return false;
    }
    setValidationError('');
    return true;
  };

  // Auto-calculate loser's score left
  const updateLoserScoreLeft = () => {
    if (!winner) return;
    
    const losingStats = winner === 'home' ? awayStats : homeStats;
    const totalScore = calculateTotalScore(losingStats);
    const scoreLeft = 501 - totalScore;
    
    if (winner === 'home') {
      setAwayStats(prev => ({ ...prev, scoreLeft: scoreLeft > 0 ? scoreLeft : 0 }));
    } else {
      setHomeStats(prev => ({ ...prev, scoreLeft: scoreLeft > 0 ? scoreLeft : 0 }));
    }
  };

  useEffect(() => {
    if (winner) {
      updateLoserScoreLeft();
    }
  }, [homeStats.tonPlus, homeStats.oneEighty, homeStats.highCheckout, 
      awayStats.tonPlus, awayStats.oneEighty, awayStats.highCheckout, winner]);

  const handleSave = () => {
    if (!winner) {
      setValidationError('Please select a winner');
      return;
    }
    
    if (!validateWinnerScore()) {
      return;
    }
    
    onSave({
      home: {
        tonPlus: parseInt(homeStats.tonPlus) || 0,
        oneEighty: parseInt(homeStats.oneEighty) || 0,
        highCheckout: parseInt(homeStats.highCheckout) || 0,
        scoreLeft: parseInt(homeStats.scoreLeft) || 0,
        dartsUsed: parseInt(homeStats.dartsUsed) || 0
      },
      away: {
        tonPlus: parseInt(awayStats.tonPlus) || 0,
        oneEighty: parseInt(awayStats.oneEighty) || 0,
        highCheckout: parseInt(awayStats.highCheckout) || 0,
        scoreLeft: parseInt(awayStats.scoreLeft) || 0,
        dartsUsed: parseInt(awayStats.dartsUsed) || 0
      },
      winner,
      notes,
      completed: true
    });
  };

  const StatsFields = ({ playerName, stats, setStats, isEditable = true }) => (
    <div className="stats-section">
      <h3 className="player-name">{playerName}</h3>
      
      <div className="stats-field">
        <label>100+</label>
        <input
          type="number"
          min="0"
          value={stats.tonPlus}
          onChange={(e) => setStats({ ...stats, tonPlus: e.target.value })}
          disabled={!isEditable}
          className="stats-input"
        />
      </div>
      
      <div className="stats-field">
        <label>180's</label>
        <input
          type="number"
          min="0"
          value={stats.oneEighty}
          onChange={(e) => setStats({ ...stats, oneEighty: e.target.value })}
          disabled={!isEditable}
          className="stats-input"
        />
      </div>
      
      <div className="stats-field">
        <label>H/C</label>
        <input
          type="number"
          min="0"
          max="501"
          value={stats.highCheckout}
          onChange={(e) => setStats({ ...stats, highCheckout: e.target.value })}
          disabled={!isEditable}
          className="stats-input"
          placeholder="Highest checkout"
        />
      </div>
      
      <div className="stats-field">
        <label>S/L</label>
        <input
          type="number"
          min="0"
          value={stats.scoreLeft}
          onChange={(e) => setStats({ ...stats, scoreLeft: e.target.value })}
          disabled={!isEditable}
          className="stats-input"
          placeholder="Score left"
        />
      </div>
      
      <div className="stats-field">
        <label>D/U</label>
        <input
          type="number"
          min="0"
          value={stats.dartsUsed}
          onChange={(e) => setStats({ ...stats, dartsUsed: e.target.value })}
          disabled={!isEditable}
          className="stats-input"
          placeholder="Darts used"
        />
      </div>
      
      {isEditable && (
        <div className="calculated-total">
          Total: {calculateTotalScore(stats)}
        </div>
      )}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="game-scoring-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Game {game.gameId} · {homePlayerName} vs {awayPlayerName}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          {validationError && (
            <div className="error-message">
              ⚠️ {validationError}
            </div>
          )}
          
          <div className="stats-container">
            <StatsFields 
              playerName={homePlayerName}
              stats={homeStats}
              setStats={setHomeStats}
              isEditable={true}
            />
            
            <div className="vs-divider">VS</div>
            
            <StatsFields 
              playerName={awayPlayerName}
              stats={awayStats}
              setStats={setAwayStats}
              isEditable={scoringMode === 'both'}
            />
          </div>
          
          <div className="winner-section">
            <label>Winner:</label>
            <div className="winner-options">
              <label className="winner-option">
                <input
                  type="radio"
                  name="winner"
                  value="home"
                  checked={winner === 'home'}
                  onChange={() => setWinner('home')}
                />
                <span className={winner === 'home' ? 'win-text' : ''}>{homePlayerName}</span>
              </label>
              <label className="winner-option">
                <input
                  type="radio"
                  name="winner"
                  value="away"
                  checked={winner === 'away'}
                  onChange={() => setWinner('away')}
                />
                <span className={winner === 'away' ? 'win-text' : ''}>{awayPlayerName}</span>
              </label>
            </div>
          </div>
          
          <div className="notes-section">
            <label>Notes (optional):</label>
            <textarea
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Great checkout, 180s, etc..."
              className="notes-input"
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="save-btn" onClick={handleSave}>Save Game</button>
        </div>
      </div>
    </div>
  );
}

export default GameScoringModal;