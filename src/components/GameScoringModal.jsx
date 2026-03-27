import React, { useState, useEffect, useRef } from 'react';
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
  // State for both players' throws
  const [homeThrows, setHomeThrows] = useState([]);
  const [awayThrows, setAwayThrows] = useState([]);
  const [homeDartsPerThrow, setHomeDartsPerThrow] = useState([]);
  const [awayDartsPerThrow, setAwayDartsPerThrow] = useState([]);
  const [winner, setWinner] = useState(null);
  const [notes, setNotes] = useState('');
  const [editingThrow, setEditingThrow] = useState(null);
  const [currentInputValue, setCurrentInputValue] = useState('');
  const [currentPlayer, setCurrentPlayer] = useState('home');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [selectedDarts, setSelectedDarts] = useState(3);
  
  const inputRef = useRef(null);
  const hasLoaded = useRef(false);  // Track initial load
  
  // Load existing data - ONLY ONCE when modal first opens
  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    
    const draftKey = `game_${game.gameId}_draft`;
    const savedDraft = localStorage.getItem(draftKey);
    const draft = savedDraft ? JSON.parse(savedDraft) : null;
    
    console.log('🔍 INITIAL LOAD - existingStats:', existingStats);
    console.log('🔍 INITIAL LOAD - draft:', draft);
    
    // Priority: If there's a draft, use it first
    if (draft && (!existingStats?.completed || draft.timestamp > (existingStats?.savedAt || 0))) {
      console.log('📂 Loading from DRAFT');
      setHomeThrows(draft.homeThrows || []);
      setAwayThrows(draft.awayThrows || []);
      setHomeDartsPerThrow(draft.homeDartsPerThrow || (draft.homeThrows?.map(() => 3) || []));
      setAwayDartsPerThrow(draft.awayDartsPerThrow || (draft.awayThrows?.map(() => 3) || []));
      setWinner(draft.winner);
      setNotes(draft.notes || '');
      setCurrentPlayer(draft.currentPlayer || 'home');
    } 
    // Otherwise, if game is already saved in Firestore, use that
    else if (existingStats && existingStats.completed === true) {
      console.log('📂 Loading from Firestore (saved game)');
      setHomeThrows(existingStats.homeThrows || []);
      setAwayThrows(existingStats.awayThrows || []);
      setHomeDartsPerThrow(existingStats.homeDartsPerThrow || (existingStats.homeThrows?.map(() => 3) || []));
      setAwayDartsPerThrow(existingStats.awayDartsPerThrow || (existingStats.awayThrows?.map(() => 3) || []));
      setWinner(existingStats.winner);
      setNotes(existingStats.notes || '');
      if (existingStats.winner) {
        setCurrentPlayer(existingStats.winner === 'home' ? 'away' : 'home');
      }
    } 
    // Otherwise start fresh
    else {
      console.log('📂 Starting fresh');
    }
    
    console.log('📂 AFTER LOAD - homeThrows:', homeThrows);
    console.log('📂 AFTER LOAD - awayThrows:', awayThrows);
  }, []); // Empty dependency array - only runs once

  // Auto-save draft to localStorage whenever data changes
  useEffect(() => {
    const draftKey = `game_${game.gameId}_draft`;
    
    // Only save if there's actual data
    if (homeThrows.length > 0 || awayThrows.length > 0 || winner || notes) {
      const draftData = {
        homeThrows,
        awayThrows,
        homeDartsPerThrow,
        awayDartsPerThrow,
        winner,
        notes,
        currentPlayer,
        timestamp: Date.now()
      };
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      console.log('💾 DRAFT SAVED:', draftData);
    } else {
      // Clear draft if no data
      localStorage.removeItem(draftKey);
    }
  }, [homeThrows, awayThrows, homeDartsPerThrow, awayDartsPerThrow, winner, notes, currentPlayer, game.gameId]);

  // Auto-focus input
  useEffect(() => {
    if (!winner && !isCurrentPlayerFinished() && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  });

  // Calculate score left for a player
  const calculateScoreLeft = (throws) => {
    const total = throws.reduce((sum, score) => sum + score, 0);
    return 501 - total;
  };

  const isCurrentPlayerFinished = () => {
    const throws = currentPlayer === 'home' ? homeThrows : awayThrows;
    return calculateScoreLeft(throws) === 0;
  };

  const isFinished = (throws) => {
    return calculateScoreLeft(throws) === 0;
  };

  // Calculate total darts used
  const calculateTotalDarts = (dartsPerThrow) => {
    return dartsPerThrow.reduce((sum, darts) => sum + darts, 0);
  };

  // Add a throw
  const addThrow = (score) => {
    if (winner) return false;
    if (score < 0 || score > 180) return false;
    if (isCurrentPlayerFinished()) return false;
    
    const currentThrows = currentPlayer === 'home' ? homeThrows : awayThrows;
    const currentScoreLeft = calculateScoreLeft(currentThrows);
    
    if (currentScoreLeft === 0) return false;
    
    const newScoreLeft = currentScoreLeft - score;
    
    if (newScoreLeft < 0) {
      alert('Bust! Score would go below 0');
      return false;
    }
    
    const updatedThrows = [...currentThrows, score];
    const updatedDarts = [...(currentPlayer === 'home' ? homeDartsPerThrow : awayDartsPerThrow), 3];
    
    if (currentPlayer === 'home') {
      setHomeThrows(updatedThrows);
      setHomeDartsPerThrow(updatedDarts);
      if (newScoreLeft === 0) {
        setPendingCheckout({ player: 'home', score, remaining: newScoreLeft, finalScore: score });
        setShowCheckoutModal(true);
      } else {
        if (scoringMode === 'both') {
          setCurrentPlayer('away');
        }
      }
    } else {
      setAwayThrows(updatedThrows);
      setAwayDartsPerThrow(updatedDarts);
      if (newScoreLeft === 0) {
        setPendingCheckout({ player: 'away', score, remaining: newScoreLeft, finalScore: score });
        setShowCheckoutModal(true);
      } else {
        if (scoringMode === 'both') {
          setCurrentPlayer('home');
        }
      }
    }
    
    setCurrentInputValue('');
    return true;
  };

  // Confirm checkout with darts used
  const confirmCheckout = () => {
    if (!pendingCheckout) return;
    
    const { player, finalScore } = pendingCheckout;
    const dartsUsed = selectedDarts;
    
    if (player === 'home') {
      const updatedDarts = [...homeDartsPerThrow];
      updatedDarts[updatedDarts.length - 1] = dartsUsed;
      setHomeDartsPerThrow(updatedDarts);
      setWinner('home');
    } else {
      const updatedDarts = [...awayDartsPerThrow];
      updatedDarts[updatedDarts.length - 1] = dartsUsed;
      setAwayDartsPerThrow(updatedDarts);
      setWinner('away');
    }
    
    setShowCheckoutModal(false);
    setPendingCheckout(null);
    setSelectedDarts(3);
  };

  // Handle input
  const handleInputChange = (e) => {
    setCurrentInputValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const score = parseInt(currentInputValue);
      if (!isNaN(score) && score >= 0 && score <= 180) {
        addThrow(score);
        // Keep focus on input
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 10);
      } else {
        alert('Please enter a valid score (0-180)');
        setCurrentInputValue('');
      }
    }
  };

  const addQuickScore = (score) => {
    addThrow(score);
  };

  const undoLastThrow = () => {
    if (winner) return;
    
    const currentThrows = currentPlayer === 'home' ? homeThrows : awayThrows;
    const otherThrows = currentPlayer === 'home' ? awayThrows : homeThrows;
    
    if (currentThrows.length > 0) {
      const updatedThrows = currentThrows.slice(0, -1);
      const updatedDarts = (currentPlayer === 'home' ? homeDartsPerThrow : awayDartsPerThrow).slice(0, -1);
      if (currentPlayer === 'home') {
        setHomeThrows(updatedThrows);
        setHomeDartsPerThrow(updatedDarts);
      } else {
        setAwayThrows(updatedThrows);
        setAwayDartsPerThrow(updatedDarts);
      }
      setWinner(null);
      setCurrentInputValue('');
    } else if (otherThrows.length > 0 && scoringMode === 'both') {
      const updatedThrows = otherThrows.slice(0, -1);
      const updatedDarts = (currentPlayer === 'home' ? awayDartsPerThrow : homeDartsPerThrow).slice(0, -1);
      if (currentPlayer === 'home') {
        setAwayThrows(updatedThrows);
        setAwayDartsPerThrow(updatedDarts);
        setCurrentPlayer('away');
      } else {
        setHomeThrows(updatedThrows);
        setHomeDartsPerThrow(updatedDarts);
        setCurrentPlayer('home');
      }
      setWinner(null);
      setCurrentInputValue('');
    } else {
      alert('Nothing to undo');
    }
  };

  const startEditing = (player, index, currentScore) => {
    const throws = player === 'home' ? homeThrows : awayThrows;
    const isCheckoutThrow = index === throws.length - 1 && 
      (calculateScoreLeft(throws.slice(0, index)) + currentScore === 501);
    
    setEditingThrow({ 
      player, 
      index, 
      value: currentScore,
      isCheckout: isCheckoutThrow
    });
  };

  const saveEdit = (newScore, newDarts) => {
    if (!editingThrow) return;
    
    const newScoreNum = parseInt(newScore);
    if (isNaN(newScoreNum) || newScoreNum < 0 || newScoreNum > 180) {
      alert('Please enter a valid score (0-180)');
      return;
    }
    
    const player = editingThrow.player;
    const index = editingThrow.index;
    const currentThrows = player === 'home' ? homeThrows : awayThrows;
    const currentDarts = player === 'home' ? homeDartsPerThrow : awayDartsPerThrow;
    
    const beforeTotal = currentThrows.reduce((sum, s, i) => sum + (i === index ? 0 : s), 0);
    const newTotal = beforeTotal + newScoreNum;
    
    if (newTotal > 501) {
      alert('Score would exceed 501');
      return;
    }
    
    const updatedThrows = [...currentThrows];
    const updatedDarts = [...currentDarts];
    updatedThrows[index] = newScoreNum;
    
    // Only update darts for checkout throw
    if (editingThrow.isCheckout) {
      const newDartsNum = parseInt(newDarts);
      if (!isNaN(newDartsNum) && newDartsNum >= 1 && newDartsNum <= 3) {
        updatedDarts[index] = newDartsNum;
      }
    }
    
    if (player === 'home') {
      setHomeThrows(updatedThrows);
      setHomeDartsPerThrow(updatedDarts);
      setWinner(null);
      if (newTotal === 501) setWinner('home');
    } else {
      setAwayThrows(updatedThrows);
      setAwayDartsPerThrow(updatedDarts);
      setWinner(null);
      if (newTotal === 501) setWinner('away');
    }
    
    setEditingThrow(null);
    setCurrentInputValue('');
  };

  const clearDraft = () => {
    const draftKey = `game_${game.gameId}_draft`;
    localStorage.removeItem(draftKey);
    console.log('🗑️ Draft cleared on Cancel');
  };

  const handleSave = () => {
    if (!winner) {
      alert('Please complete the leg by reaching 501');
      return;
    }
    
    const calculateStats = (throws, dartsPerThrow) => {
      const tonPlus = throws.filter(s => s >= 100).length;
      const oneEighty = throws.filter(s => s === 180).length;
      const highCheckout = throws.length > 0 ? throws[throws.length - 1] : 0;
      const dartsUsed = calculateTotalDarts(dartsPerThrow);
      const scoreLeft = calculateScoreLeft(throws);
      
      return { tonPlus, oneEighty, highCheckout, scoreLeft, dartsUsed };
    };
    
    onSave({
      home: calculateStats(homeThrows, homeDartsPerThrow),
      away: calculateStats(awayThrows, awayDartsPerThrow),
      homeThrows,
      awayThrows,
      homeDartsPerThrow,
      awayDartsPerThrow,
      winner,
      notes,
      completed: true
    });
    
    // DO NOT clear draft here - keep it so data persists when reopening
  };

  const handleCancel = () => {
    clearDraft();
    onClose();
  };

  const currentScoreLeft = calculateScoreLeft(currentPlayer === 'home' ? homeThrows : awayThrows);
  const homeFinished = isFinished(homeThrows);
  const awayFinished = isFinished(awayThrows);
  const canUndo = (homeThrows.length > 0 || awayThrows.length > 0) && !winner;

  const PlayerSection = ({ player, name, throws, dartsPerThrow, isActivePlayer, scoreLeft, isFinished }) => {
    let cumulativeDarts = 0;
    
    return (
      <div className={`player-section ${isActivePlayer ? 'active-turn' : ''}`}>
        <h3 className="player-name">{name}</h3>
        
        <div className="throws-list">
        {throws.map((score, idx) => {
  cumulativeDarts += dartsPerThrow[idx] || 3;
  return (
    <div key={idx} className="throw-item">
      <span className="throw-number">{idx + 1}.</span>
      <span 
  className="throw-score" 
  onClick={() => {
    // Allow editing if game is saved (winner exists) OR active player
    if (winner || isActivePlayer) {
      startEditing(player, idx, score);
    }
  }}
  style={{ cursor: (winner || isActivePlayer) ? 'pointer' : 'default' }}
>
  {score}
</span>
      <span className="throw-darts">({cumulativeDarts})</span>  {/* ← Change here */}
      <span className="throw-score-left">→ {501 - throws.slice(0, idx + 1).reduce((a, b) => a + b, 0)}</span>
      
    </div>
  );
})}
          {/* Show input field only for active player when game in progress */}
          {!winner && isActivePlayer && !isFinished && (
            <div className="throw-item active-input">
              <span className="throw-number">{throws.length + 1}.</span>
              <input
  ref={inputRef}
  type="number"
  className="score-input"
  value={currentInputValue}
  onChange={handleInputChange}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Stop focus from moving
      const score = parseInt(currentInputValue);
      if (!isNaN(score) && score >= 0 && score <= 180) {
        addThrow(score);
        // Keep focus on input
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 0);
      } else {
        alert('Please enter a valid score (0-180)');
        setCurrentInputValue('');
        inputRef.current?.focus();
      }
    }
  }}
  placeholder="___"
  inputMode="numeric"
  pattern="[0-9]*"
  enterKeyHint="done"
/>
              <span className="throw-darts">({cumulativeDarts + 3})</span>
              <span className="throw-score-left"></span>
            </div>
          )}
        </div>
        
        <div className="score-left">
          Score left: <span className="score-value">{scoreLeft}</span>
        </div>
        
        {isFinished && (
          <div className="winner-badge">✓ WINNER!</div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="modal-overlay" onClick={handleCancel}>
        <div className="game-scoring-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Game {game.gameId} · {homePlayerName} vs {awayPlayerName}</h2>
            <button className="close-btn" onClick={handleCancel}>✕</button>
          </div>
          
          <div className="modal-body">
            <div className="mode-indicator">
              Mode: {scoringMode === 'my_team' ? '🟢 My Team Only' : '🟡 Both Teams'}
            </div>
            
            <div className="quick-buttons">
              <button className="quick-btn" onClick={() => addQuickScore(60)}>60</button>
              <button className="quick-btn" onClick={() => addQuickScore(100)}>100</button>
              <button className="quick-btn" onClick={() => addQuickScore(140)}>140</button>
              <button className="quick-btn" onClick={() => addQuickScore(180)}>180</button>
              <button className="quick-btn undo" onClick={undoLastThrow} disabled={!canUndo}>UNDO</button>
            </div>
            
            <div className="players-container">
              <PlayerSection
                player="home"
                name={homePlayerName}
                throws={homeThrows}
                dartsPerThrow={homeDartsPerThrow}
                isActivePlayer={currentPlayer === 'home' && !winner && !homeFinished}
                scoreLeft={calculateScoreLeft(homeThrows)}
                isFinished={homeFinished}
              />
              
              <div className="vs-divider">VS</div>
              
              <PlayerSection
                player="away"
                name={awayPlayerName}
                throws={awayThrows}
                dartsPerThrow={awayDartsPerThrow}
                isActivePlayer={currentPlayer === 'away' && !winner && !awayFinished}
                scoreLeft={calculateScoreLeft(awayThrows)}
                isFinished={awayFinished}
              />
            </div>
            
            <div className="notes-section">
              <label>Notes (optional):</label>
              <textarea
  rows="2"
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  placeholder="Great checkout, 180s, etc..."
  className="notes-input"
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent Enter from submitting or moving focus
    }
  }}
/>
            </div>
          </div>
          
          {editingThrow && (
  <div className="edit-modal">
    <div className="edit-modal-content">
      <h4>Edit Throw {editingThrow.index + 1}</h4>
      <input
        type="number"
        defaultValue={editingThrow.value}
        placeholder="Score"
        autoFocus
      />
      {editingThrow.isCheckout && (
        <input
          type="number"
          defaultValue="3"
          min="1"
          max="3"
          placeholder="Darts used (1-3)"
        />
      )}
      <div className="edit-buttons">
        <button onClick={() => setEditingThrow(null)}>Cancel</button>
        <button onClick={() => {
          const scoreInput = document.querySelector('.edit-modal-content input:first-of-type');
          const dartsInput = editingThrow.isCheckout ? 
            document.querySelector('.edit-modal-content input:last-of-type') : null;
          saveEdit(scoreInput.value, dartsInput?.value || 3);
        }}>Save</button>
      </div>
    </div>
  </div>
)}
          
          <div className="modal-footer">
            <button className="cancel-btn" onClick={handleCancel}>Cancel</button>
            <button className="save-btn" onClick={handleSave} disabled={!winner}>
              Save Game
            </button>
          </div>
        </div>
      </div>
      
      {showCheckoutModal && (
        <div className="modal-overlay">
          <div className="checkout-modal">
            <h3>🎯 Checkout Details</h3>
            <p>Final score: {pendingCheckout?.finalScore}</p>
            <p>How many darts did it take?</p>
            <div className="darts-options">
              <button className={`dart-btn ${selectedDarts === 1 ? 'selected' : ''}`} onClick={() => setSelectedDarts(1)}>1 Dart</button>
              <button className={`dart-btn ${selectedDarts === 2 ? 'selected' : ''}`} onClick={() => setSelectedDarts(2)}>2 Darts</button>
              <button className={`dart-btn ${selectedDarts === 3 ? 'selected' : ''}`} onClick={() => setSelectedDarts(3)}>3 Darts</button>
            </div>
            <div className="checkout-buttons">
              <button className="cancel-checkout" onClick={() => {
                setShowCheckoutModal(false);
                setPendingCheckout(null);
                if (pendingCheckout?.player === 'home') {
                  setHomeThrows(homeThrows.slice(0, -1));
                  setHomeDartsPerThrow(homeDartsPerThrow.slice(0, -1));
                } else if (pendingCheckout?.player === 'away') {
                  setAwayThrows(awayThrows.slice(0, -1));
                  setAwayDartsPerThrow(awayDartsPerThrow.slice(0, -1));
                }
                setWinner(null);
              }}>Cancel</button>
              <button className="confirm-checkout" onClick={confirmCheckout}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default GameScoringModal;