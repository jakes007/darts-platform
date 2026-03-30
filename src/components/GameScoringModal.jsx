import React, { useState, useEffect, useRef } from 'react';
import './GameScoringModal.css';

function GameScoringModal({ 
  game, 
  homePlayerName, 
  awayPlayerName,
  scoringMode, 
  onSave, 
  onClose,
  existingStats,
  draftData,
  onUpdateDraft,
  userTeam
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

  // Check if a score can be finished with a given number of darts
  const canFinishWithDarts = (scoreLeft, dartsLeft) => {
    if (scoreLeft <= 0) return false;
    
    // Max possible with given darts
    const maxPossible = dartsLeft * 60; // Triple 20 (60) per dart
    if (scoreLeft > maxPossible) return false;
    
    // Minimum possible (lowest checkout)
    // With 1 dart: must be a double or bull (2-40, 50)
    if (dartsLeft === 1) {
      // Check if score is a valid checkout (double or bull)
      const validCheckouts = [50]; // Bullseye
      for (let i = 1; i <= 20; i++) {
        validCheckouts.push(i * 2); // Double 1-20
      }
      return validCheckouts.includes(scoreLeft);
    }
    
    // With 2 or 3 darts, it's more complex - we'll do a basic feasibility check
    // For 2 darts: check if it's possible to reach score with 2 darts ending on double
    if (dartsLeft === 2) {
      // We need to check if there exists a first dart score (1-60) 
      // such that remaining score is a valid 1-dart checkout
      for (let firstDart = 0; firstDart <= 60; firstDart++) {
        const remaining = scoreLeft - firstDart;
        if (remaining >= 2 && remaining <= 50 && canFinishWithDarts(remaining, 1)) {
          return true;
        }
      }
      return false;
    }
    
    // For 3 darts, it's almost always possible if score <= 170 and >= 2
    // But we'll do a quick sanity check
    if (dartsLeft === 3) {
      // Max checkout in darts is 170 (T20, T20, Bull)
      if (scoreLeft > 170) return false;
      // Min checkout is 2 (double 1)
      if (scoreLeft < 2) return false;
      return true;
    }
    
    return true;
  };

  // Get available dart options for checkout based on score left
  const getAvailableDartOptions = (scoreLeft) => {
    const options = [];
    
    // Check each dart count possibility
    for (let darts = 1; darts <= 3; darts++) {
      if (canFinishWithDarts(scoreLeft, darts)) {
        options.push(darts);
      }
    }
    
    return options;
  };

  // Validate if a score is possible with given darts left (non-checkout throws)
  const isValidThrow = (score, dartsLeft) => {
    // Max per dart is 60 (triple 20)
    if (score > 60 * dartsLeft) return false;
    if (score < 0) return false;
    if (score > 180) return false; // Max with 3 darts
    return true;
  };

  // ✅ Load data EVERY time modal opens or game changes
  useEffect(() => {
    const draftKey = `match_${game.matchId}_game_${game.gameId}_draft`;
    const savedDraft = localStorage.getItem(draftKey);
    const draft = savedDraft ? JSON.parse(savedDraft) : null;

    console.log('🔄 MODAL OPEN - existingStats:', existingStats);
    console.log('🔄 MODAL OPEN - draft:', draft);

    if (existingStats) {
      console.log('📂 Loading from Firestore (saved game)');
      console.log('🏆 Winner from Firestore:', existingStats.winner);
      
      // Check if this is a forfeit game
      const isForfeit = existingStats.isForfeit || 
                        existingStats.homeStats?.isForfeit || 
                        existingStats.awayStats?.isForfeit;
      
      setHomeThrows(existingStats.homeThrows || []);
      setAwayThrows(existingStats.awayThrows || []);
      setHomeDartsPerThrow(existingStats.homeDartsPerThrow || (existingStats.homeThrows?.map(() => 3) || []));
      setAwayDartsPerThrow(existingStats.awayDartsPerThrow || (existingStats.awayThrows?.map(() => 3) || []));
      setWinner(existingStats.winner);
      
      // Add forfeit message to notes if it's a forfeit game and notes don't already mention it
      let notesText = existingStats.notes || '';
      if (isForfeit && !notesText.includes('FORFEIT')) {
        notesText = `[FORFEIT] ${existingStats.winner === 'home' ? 'Home' : 'Away'} team won by forfeit - missing player\n${notesText}`;
      }
      setNotes(notesText);
      
      if (existingStats.winner) {
        setCurrentPlayer(existingStats.winner === 'home' ? 'away' : 'home');
      }
    } else if (draft) {
      console.log('📂 Loading from DRAFT');
      setHomeThrows(draft.homeThrows || []);
      setAwayThrows(draft.awayThrows || []);
      setHomeDartsPerThrow(draft.homeDartsPerThrow || (draft.homeThrows?.map(() => 3) || []));
      setAwayDartsPerThrow(draft.awayDartsPerThrow || (draft.awayThrows?.map(() => 3) || []));
      setWinner(draft.winner || null);
      setNotes(draft.notes || '');
      setCurrentPlayer(draft.currentPlayer || 'home');
    } else {
      console.log('📂 Starting fresh');
      setHomeThrows([]);
      setAwayThrows([]);
      setHomeDartsPerThrow([]);
      setAwayDartsPerThrow([]);
      setWinner(null);
      setNotes('');
      setCurrentPlayer('home');
    }
  }, [game.gameId, existingStats]);

  useEffect(() => {
    if (scoringMode === 'my_team' && userTeam) {
      console.log('🎯 Setting currentPlayer to userTeam:', userTeam);
      setCurrentPlayer(userTeam);
    }
  }, [scoringMode, userTeam]);

  // ✅ Auto-save draft to localStorage whenever data changes
  useEffect(() => {
    const draftKey = `match_${game.matchId}_game_${game.gameId}_draft`;

    // Only save if there's actual data
    if (
      homeThrows.length > 0 ||
      awayThrows.length > 0 ||
      winner ||
      notes
    ) {
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

  }, [
    homeThrows,
    awayThrows,
    homeDartsPerThrow,
    awayDartsPerThrow,
    winner,
    notes,
    currentPlayer,
    game.gameId
  ]);

  // Determine if each team already has actual stats (not just empty objects)
  const homeStatsExist = existingStats?.homeThrows && existingStats.homeThrows.length > 0;
  const awayStatsExist = existingStats?.awayThrows && existingStats.awayThrows.length > 0;
  const gameHasWinner = existingStats?.winner !== null && existingStats?.winner !== undefined;
  const hasUserSaved = userTeam === 'home' ? homeStatsExist : awayStatsExist;
  const canEdit = true;

  console.log('📊 Stats exist - home:', homeStatsExist, 'away:', awayStatsExist);
  console.log('📊 Game has winner:', gameHasWinner);
  console.log('📊 User team:', userTeam, 'has saved:', hasUserSaved, 'can edit:', canEdit);

  console.log(
    '🔍 My Team Only mode - scoringMode:',
    scoringMode,
    'userTeam:',
    userTeam,
    'winner:',
    winner,
    'currentPlayer:',
    currentPlayer
  );

  // Auto-focus input
  useEffect(() => {
    if (!isCurrentPlayerFinished() && inputRef.current && document.activeElement !== inputRef.current) {
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

// Add a throw - checkout only adds throw on confirmation
const addThrow = (score) => {
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
  
  // Calculate darts left in this turn
  const currentTurnDarts = (currentPlayer === 'home' ? homeDartsPerThrow : awayDartsPerThrow);
  const dartsThrownThisTurn = currentTurnDarts.length > 0 && currentTurnDarts[currentTurnDarts.length - 1] !== 3 
    ? currentTurnDarts[currentTurnDarts.length - 1] 
    : 0;
  const dartsLeftThisTurn = 3 - dartsThrownThisTurn;
  
  // Validate if this throw is possible with remaining darts
  if (!isValidThrow(score, dartsLeftThisTurn)) {
    alert(`Invalid score! With ${dartsLeftThisTurn} dart${dartsLeftThisTurn > 1 ? 's' : ''} left, maximum score is ${60 * dartsLeftThisTurn}`);
    return false;
  }
  
  // Check if this is a checkout attempt
  if (newScoreLeft === 0) {
    // Validate checkout
    if (!canFinishWithDarts(score, dartsLeftThisTurn)) {
      alert(`Cannot finish ${currentScoreLeft} with ${dartsLeftThisTurn} dart${dartsLeftThisTurn > 1 ? 's' : ''}!`);
      return false;
    }
    
    // Store pending checkout WITHOUT adding the throw yet
    setPendingCheckout({ 
      player: currentPlayer, 
      score, 
      remaining: newScoreLeft, 
      finalScore: score,
      scoreLeft: currentScoreLeft,
      dartsLeft: dartsLeftThisTurn
    });
    setShowCheckoutModal(true);
    setCurrentInputValue('');
    return true;
  }
  
  // Normal throw (not checkout) - add immediately
  const updatedThrows = [...currentThrows, score];
  const updatedDarts = [...currentTurnDarts, 3];
  
  if (currentPlayer === 'home') {
    setHomeThrows(updatedThrows);
    setHomeDartsPerThrow(updatedDarts);
    if (scoringMode === 'both') {
      setCurrentPlayer('away');
    }
  } else {
    setAwayThrows(updatedThrows);
    setAwayDartsPerThrow(updatedDarts);
    if (scoringMode === 'both') {
      setCurrentPlayer('home');
    }
  }
  
  setCurrentInputValue('');
  return true;
};

 // Confirm checkout with darts used - NOW adds the throw
const confirmCheckout = () => {
  if (!pendingCheckout) return;
  
  const { player, score, dartsLeft, scoreLeft } = pendingCheckout;
  const actualDartsUsed = selectedDarts;
  
  // Get current state
  const currentThrows = player === 'home' ? homeThrows : awayThrows;
  const currentTurnDarts = player === 'home' ? homeDartsPerThrow : awayDartsPerThrow;
  
  // Add the checkout throw
  const updatedThrows = [...currentThrows, score];
  const updatedDarts = [...currentTurnDarts, actualDartsUsed];
  
  if (player === 'home') {
    setHomeThrows(updatedThrows);
    setHomeDartsPerThrow(updatedDarts);
    setWinner('home');
  } else {
    setAwayThrows(updatedThrows);
    setAwayDartsPerThrow(updatedDarts);
    setWinner('away');
  }
  
  setShowCheckoutModal(false);
  setPendingCheckout(null);
  setSelectedDarts(3);
  setCurrentInputValue('');
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
    const draftKey = `match_${game.matchId}_game_${game.gameId}_draft`;
    localStorage.removeItem(draftKey);
    console.log('🗑️ Draft cleared on Cancel');
  };

  const handleSave = () => {
    const isHomeTeam = userTeam === 'home';
    const isBothTeamsMode = scoringMode === 'both';
    
    // For "Both Teams" mode, we need to save data for BOTH teams
    if (isBothTeamsMode) {
      // Calculate stats for HOME team
      const homeTotal = homeThrows.reduce((sum, s) => sum + s, 0);
      const homeScoreLeft = 501 - homeTotal;
      const homeStats = {
        tonPlus: homeThrows.filter(s => s >= 100).length,
        oneEighty: homeThrows.filter(s => s === 180).length,
        highCheckout: homeTotal === 501 && homeThrows.length > 0 ? homeThrows[homeThrows.length - 1] : 0,
        scoreLeft: homeScoreLeft > 0 ? homeScoreLeft : 0,
        dartsUsed: homeDartsPerThrow.reduce((sum, d) => sum + d, 0)
      };
      
      // Calculate stats for AWAY team
      const awayTotal = awayThrows.reduce((sum, s) => sum + s, 0);
      const awayScoreLeft = 501 - awayTotal;
      const awayStats = {
        tonPlus: awayThrows.filter(s => s >= 100).length,
        oneEighty: awayThrows.filter(s => s === 180).length,
        highCheckout: awayTotal === 501 && awayThrows.length > 0 ? awayThrows[awayThrows.length - 1] : 0,
        scoreLeft: awayScoreLeft > 0 ? awayScoreLeft : 0,
        dartsUsed: awayDartsPerThrow.reduce((sum, d) => sum + d, 0)
      };
      
      // Determine winner
      const homeFinished = homeTotal === 501;
      const awayFinished = awayTotal === 501;
      let finalWinner = winner || existingStats?.winner || null;
      
      if (homeFinished && !awayFinished) finalWinner = 'home';
      if (awayFinished && !homeFinished) finalWinner = 'away';
      
      // Save BOTH teams' data
      const dataToSave = {
        homeStats: homeStats,
        awayStats: awayStats,
        homeThrows: homeThrows,
        awayThrows: awayThrows,
        homeDartsPerThrow: homeDartsPerThrow,
        awayDartsPerThrow: awayDartsPerThrow,
        homeCompleted: homeFinished,
        awayCompleted: awayFinished,
        winner: finalWinner,
        notes: notes || existingStats?.notes
      };
      
      console.log('📤 BOTH TEAMS MODE - Sending to parent:', dataToSave);
      onSave(dataToSave);
      clearDraft();
      return;
    }
    
    // Original "My Team Only" mode logic
    const currentThrows = isHomeTeam ? homeThrows : awayThrows;
    const currentDarts = isHomeTeam ? homeDartsPerThrow : awayDartsPerThrow;
    const totalScored = currentThrows.reduce((sum, s) => sum + s, 0);
    const scoreLeft = 501 - totalScored;
    
    const tonPlus = currentThrows.filter(s => s >= 100).length;
    const oneEighty = currentThrows.filter(s => s === 180).length;
    const highCheckout = totalScored === 501 && currentThrows.length > 0 ? currentThrows[currentThrows.length - 1] : 0;
    const dartsUsed = currentDarts.reduce((sum, d) => sum + d, 0);
    
    const stats = {
      tonPlus,
      oneEighty,
      highCheckout,
      scoreLeft: scoreLeft > 0 ? scoreLeft : 0,
      dartsUsed
    };
    
    // Determine winner ONLY if both have finished
    const homeTotal = homeThrows.reduce((sum, s) => sum + s, 0);
    const awayTotal = awayThrows.reduce((sum, s) => sum + s, 0);
    
    const homeFinished = homeTotal === 501;
    const awayFinished = awayTotal === 501;
    
    let finalWinner = winner || existingStats?.winner || null;
    
    if (homeFinished && !awayFinished) finalWinner = 'home';
    if (awayFinished && !homeFinished) finalWinner = 'away';
    
    const dataToSave = {
      [`${isHomeTeam ? 'home' : 'away'}Stats`]: stats,
      [`${isHomeTeam ? 'home' : 'away'}Throws`]: currentThrows,
      [`${isHomeTeam ? 'home' : 'away'}DartsPerThrow`]: currentDarts,
      
      homeCompleted: isHomeTeam ? homeFinished : (existingStats?.homeCompleted || false),
      awayCompleted: !isHomeTeam ? awayFinished : (existingStats?.awayCompleted || false),
      
      winner: finalWinner,
      notes: notes || existingStats?.notes
    };
    
    console.log('📤 MY TEAM ONLY MODE - Sending to parent:', dataToSave);
    onSave(dataToSave);
    clearDraft();
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
    if (true) {
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
                    {isActivePlayer && !isFinished && (
            <div className="throw-item active-input">
              <span className="throw-number">{throws.length + 1}.</span>
              <div className="input-with-button">
                <input
  ref={inputRef}
  type="number"
  className="score-input"
  value={currentInputValue}
  onChange={handleInputChange}
  onKeyDown={handleKeyDown}   // ✅ ADD THIS LINE
  placeholder="___"
  inputMode="numeric"
  pattern="[0-9]*"
  enterKeyHint="done"
/>
                <button 
                  className="mobile-enter-btn" 
                  onClick={() => {
                    const score = parseInt(currentInputValue);
                    if (!isNaN(score) && score >= 0 && score <= 180) {
                      addThrow(score);
                    } else {
                      alert('Please enter a valid score (0-180)');
                      setCurrentInputValue('');
                      inputRef.current?.focus();
                    }
                  }}
                >
                  ✓
                </button>
              </div>
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
  <div onClick={() => {
    // Allow switching to home player if:
    // 1. In both teams mode
    // 2. No winner yet
    // 3. The other player hasn't finished
    if (scoringMode === 'both' && !winner && !homeFinished) {
      setCurrentPlayer('home');
      setCurrentInputValue('');
      // Focus the input after switching
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }} style={{ cursor: scoringMode === 'both' && !winner && !homeFinished ? 'pointer' : 'default' }}>
    <PlayerSection
      player="home"
      name={homePlayerName}
      throws={homeThrows}
      dartsPerThrow={homeDartsPerThrow}
      isActivePlayer={scoringMode === 'both' ? 
        (currentPlayer === 'home' && !winner && !homeFinished) : 
        (userTeam === 'home' && canEdit)}
      scoreLeft={calculateScoreLeft(homeThrows)}
      isFinished={homeFinished}
    />
  </div>
  
  <div className="vs-divider">VS</div>
  
  <div onClick={() => {
    // Allow switching to away player if:
    // 1. In both teams mode
    // 2. No winner yet
    // 3. The other player hasn't finished
    if (scoringMode === 'both' && !winner && !awayFinished) {
      setCurrentPlayer('away');
      setCurrentInputValue('');
      // Focus the input after switching
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }} style={{ cursor: scoringMode === 'both' && !winner && !awayFinished ? 'pointer' : 'default' }}>
    <PlayerSection
      player="away"
      name={awayPlayerName}
      throws={awayThrows}
      dartsPerThrow={awayDartsPerThrow}
      isActivePlayer={scoringMode === 'both' ? 
        (currentPlayer === 'away' && !winner && !awayFinished) : 
        (userTeam === 'away' && canEdit)}
      scoreLeft={calculateScoreLeft(awayThrows)}
      isFinished={awayFinished}
    />
  </div>
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
            <button className="save-btn" onClick={handleSave}>
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
            <p>Score left: {pendingCheckout?.scoreLeft}</p>
            <p>How many darts did it take?</p>
            <div className="darts-options">
              {getAvailableDartOptions(pendingCheckout?.scoreLeft || 0).map(darts => (
                <button 
                  key={darts}
                  className={`dart-btn ${selectedDarts === darts ? 'selected' : ''}`} 
                  onClick={() => setSelectedDarts(darts)}
                >
                  {darts} Dart{darts > 1 ? 's' : ''}
                </button>
              ))}
            </div>
            <div className="checkout-buttons">
            <button className="cancel-checkout" onClick={() => {
  // Just close the modal, don't add anything
  setShowCheckoutModal(false);
  setPendingCheckout(null);
  setSelectedDarts(3);
  // Keep focus on input for the same player to try again
  setTimeout(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, 100);
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