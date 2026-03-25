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
    tonPlus: existingStats?.home?.tonPlus ?? 0,
    oneEighty: existingStats?.home?.oneEighty ?? 0,
    highCheckout: existingStats?.home?.highCheckout ?? '',
    scoreLeft: existingStats?.home?.scoreLeft ?? '',
    dartsUsed: existingStats?.home?.dartsUsed ?? ''
  });
  
  const [awayStats, setAwayStats] = useState({
    tonPlus: existingStats?.away?.tonPlus ?? 0,
    oneEighty: existingStats?.away?.oneEighty ?? 0,
    highCheckout: existingStats?.away?.highCheckout ?? '',
    scoreLeft: existingStats?.away?.scoreLeft ?? '',
    dartsUsed: existingStats?.away?.dartsUsed ?? ''
  });
  
  const [winner, setWinner] = useState(existingStats?.winner || null);
  const [notes, setNotes] = useState(existingStats?.notes || '');
  const [validationError, setValidationError] = useState('');

  // Calculate total score for a player
  const calculateTotalScore = (stats) => {
    const tonPlusTotal = (Number(stats.tonPlus) || 0) * 100;
    const oneEightyTotal = (Number(stats.oneEighty) || 0) * 180;
    const highCheckoutTotal = Number(stats.highCheckout) || 0;
    return tonPlusTotal + oneEightyTotal + highCheckoutTotal;
  };

  // Auto-calculate loser's score left
  useEffect(() => {
    if (!winner) return;
    
    const losingStats = winner === 'home' ? awayStats : homeStats;
    const totalScore = calculateTotalScore(losingStats);
    const scoreLeft = 501 - totalScore;
    
    if (winner === 'home') {
      setAwayStats(prev => ({ ...prev, scoreLeft: scoreLeft > 0 ? scoreLeft : 0 }));
    } else {
      setHomeStats(prev => ({ ...prev, scoreLeft: scoreLeft > 0 ? scoreLeft : 0 }));
    }
  }, [homeStats.tonPlus, homeStats.oneEighty, homeStats.highCheckout, 
      awayStats.tonPlus, awayStats.oneEighty, awayStats.highCheckout, winner]);

  const handleSave = () => {
    if (!winner) {
      setValidationError('Please select a winner');
      return;
    }
    
    const winningStats = winner === 'home' ? homeStats : awayStats;
    const totalScore = calculateTotalScore(winningStats);
    
    if (totalScore !== 501) {
      setValidationError(`Winner's total score must be 501. Current total: ${totalScore}`);
      return;
    }
    
    onSave({
      home: {
        tonPlus: Number(homeStats.tonPlus) || 0,
        oneEighty: Number(homeStats.oneEighty) || 0,
        highCheckout: Number(homeStats.highCheckout) || 0,
        scoreLeft: Number(homeStats.scoreLeft) || 0,
        dartsUsed: Number(homeStats.dartsUsed) || 0
      },
      away: {
        tonPlus: Number(awayStats.tonPlus) || 0,
        oneEighty: Number(awayStats.oneEighty) || 0,
        highCheckout: Number(awayStats.highCheckout) || 0,
        scoreLeft: Number(awayStats.scoreLeft) || 0,
        dartsUsed: Number(awayStats.dartsUsed) || 0
      },
      winner,
      notes,
      completed: true
    });
  };

  const updateHomeField = (field, value) => {
    setHomeStats(prev => ({ ...prev, [field]: value }));
  };

  const updateAwayField = (field, value) => {
    setAwayStats(prev => ({ ...prev, [field]: value }));
  };

  const isAwayEditable = scoringMode === 'both';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="game-scoring-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
  <h2>
    Game {game.gameId}
    <span className="player-names desktop-only">
      · {homePlayerName} vs {awayPlayerName}
    </span>
  </h2>
  <button className="close-btn" onClick={onClose}>✕</button>
</div>
        
        <div className="modal-body">
          {validationError && (
            <div className="error-message">
              ⚠️ {validationError}
            </div>
          )}
          
          <div className="stats-container">
            {/* Home Player Stats */}
            <div className="stats-section">
              <h3 className="player-name">{homePlayerName}</h3>
              
              <div className="stats-field">
                <label>100+</label>
                <input
                  type="number"
                  min="0"
                  value={homeStats.tonPlus}
                  onChange={(e) => updateHomeField('tonPlus', e.target.value)}
                  className="stats-input"
                />
              </div>
              
              <div className="stats-field">
                <label>180's</label>
                <input
                  type="number"
                  min="0"
                  value={homeStats.oneEighty}
                  onChange={(e) => updateHomeField('oneEighty', e.target.value)}
                  className="stats-input"
                />
              </div>
              
              <div className="stats-field">
                <label>H/C</label>
                <input
                  type="number"
                  min="0"
                  max="501"
                  value={homeStats.highCheckout}
                  onChange={(e) => updateHomeField('highCheckout', e.target.value)}
                  className="stats-input"
                  placeholder="Highest checkout"
                />
              </div>
              
              <div className="stats-field">
                <label>S/L</label>
                <input
                  type="number"
                  min="0"
                  value={homeStats.scoreLeft}
                  onChange={(e) => updateHomeField('scoreLeft', e.target.value)}
                  className="stats-input"
                  placeholder="Score left"
                />
              </div>
              
              <div className="stats-field">
                <label>D/U</label>
                <input
                  type="number"
                  min="0"
                  value={homeStats.dartsUsed}
                  onChange={(e) => updateHomeField('dartsUsed', e.target.value)}
                  className="stats-input"
                  placeholder="Darts used"
                />
              </div>
              
              <div className="calculated-total">
                Total: {calculateTotalScore(homeStats)}
              </div>
            </div>
            
            <div className="vs-divider">VS</div>
            
            {/* Away Player Stats */}
            <div className="stats-section">
              <h3 className="player-name">{awayPlayerName}</h3>
              
              <div className="stats-field">
                <label>100+</label>
                <input
                  type="number"
                  min="0"
                  value={awayStats.tonPlus}
                  onChange={(e) => updateAwayField('tonPlus', e.target.value)}
                  disabled={!isAwayEditable}
                  className="stats-input"
                />
              </div>
              
              <div className="stats-field">
                <label>180's</label>
                <input
                  type="number"
                  min="0"
                  value={awayStats.oneEighty}
                  onChange={(e) => updateAwayField('oneEighty', e.target.value)}
                  disabled={!isAwayEditable}
                  className="stats-input"
                />
              </div>
              
              <div className="stats-field">
                <label>H/C</label>
                <input
                  type="number"
                  min="0"
                  max="501"
                  value={awayStats.highCheckout}
                  onChange={(e) => updateAwayField('highCheckout', e.target.value)}
                  disabled={!isAwayEditable}
                  className="stats-input"
                  placeholder="Highest checkout"
                />
              </div>
              
              <div className="stats-field">
                <label>S/L</label>
                <input
                  type="number"
                  min="0"
                  value={awayStats.scoreLeft}
                  onChange={(e) => updateAwayField('scoreLeft', e.target.value)}
                  disabled={!isAwayEditable}
                  className="stats-input"
                  placeholder="Score left"
                />
              </div>
              
              <div className="stats-field">
                <label>D/U</label>
                <input
                  type="number"
                  min="0"
                  value={awayStats.dartsUsed}
                  onChange={(e) => updateAwayField('dartsUsed', e.target.value)}
                  disabled={!isAwayEditable}
                  className="stats-input"
                  placeholder="Darts used"
                />
              </div>
              
              {isAwayEditable && (
                <div className="calculated-total">
                  Total: {calculateTotalScore(awayStats)}
                </div>
              )}
            </div>
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