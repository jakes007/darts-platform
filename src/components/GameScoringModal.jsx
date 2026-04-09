import React, { useState, useEffect, useRef } from 'react';
import './GameScoringModal.css';

function GameScoringModal({ 
  game, 
  matchId,
  gameId,
  homePlayerName, 
  awayPlayerName,
  scoringMode, 
  onSave, 
  onAutoSave,
  onClose,
  existingStats,
  draftData,
  onUpdateDraft,
  userTeam,
  onGameComplete
}) {
  // State for both players' throws
  const [homeThrows, setHomeThrows] = useState([]);
  const [awayThrows, setAwayThrows] = useState([]);
  const [homeDartsPerThrow, setHomeDartsPerThrow] = useState([]);
  const [awayDartsPerThrow, setAwayDartsPerThrow] = useState([]);
  const [winner, setWinner] = useState(null);
  const [notes, setNotes] = useState('');
  const [currentInputValue, setCurrentInputValue] = useState('');
  const [currentPlayer, setCurrentPlayer] = useState('home');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [selectedDarts, setSelectedDarts] = useState(3);
  const [currentRow, setCurrentRow] = useState(0);
  
  const inputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const activeRowRef = useRef(null);

  // Maximum rows for 501 (approx 167 throws of 3 darts)
  const MAX_ROWS = 167;
  const duValues = Array.from({ length: MAX_ROWS }, (_, i) => (i + 1) * 3);

  // Get first name only
  const getFirstName = (fullName) => {
    if (!fullName) return '';
    return fullName.split(' ')[0];
  };

  // Check if a score can be finished with a given number of darts
  const canFinishWithDarts = (scoreLeft, dartsLeft) => {
    if (scoreLeft <= 0) return false;
    const maxPossible = dartsLeft * 60;
    if (scoreLeft > maxPossible) return false;
    
    if (dartsLeft === 1) {
      const validCheckouts = [50];
      for (let i = 1; i <= 20; i++) validCheckouts.push(i * 2);
      return validCheckouts.includes(scoreLeft);
    }
    
    if (dartsLeft === 2) {
      const validOneDart = [50];
      for (let i = 1; i <= 20; i++) validOneDart.push(i * 2);
      for (let firstDart = 0; firstDart <= 60; firstDart++) {
        const remaining = scoreLeft - firstDart;
        if (remaining >= 2 && remaining <= 50 && validOneDart.includes(remaining)) return true;
      }
      return false;
    }
    
    if (dartsLeft === 3) {
      if (scoreLeft > 170) return false;
      if (scoreLeft < 2) return false;
      return true;
    }
    return true;
  };

  const getAvailableDartOptions = (scoreLeft) => {
    const options = [];
    for (let darts = 1; darts <= 3; darts++) {
      if (canFinishWithDarts(scoreLeft, darts)) options.push(darts);
    }
    return options;
  };

  const isValidThrow = (score, dartsLeft) => {
    if (score > 60 * dartsLeft) return false;
    if (score < 0) return false;
    if (score > 180) return false;
    return true;
  };

  const isValidScoreLeft = (scoreLeft) => {
    if (scoreLeft === 0) return true;
    if (scoreLeft < 0) return false;
    if (scoreLeft === 1) return false;
    return true;
  };

  const wouldLeaveValidCheckout = (currentScoreLeft, scoreToEnter) => {
    const newScoreLeft = currentScoreLeft - scoreToEnter;
    if (newScoreLeft === 0) return true;
    if (newScoreLeft < 0) return true;
    return isValidScoreLeft(newScoreLeft);
  };

    // Manually set current player by clicking on their cell
    const setActivePlayer = (player) => {
      if (winner) return;
      if (scoringMode === 'both') {
        setCurrentPlayer(player);
        setCurrentInputValue('');
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
      }
    };

  // Load data from existingStats or draft
  useEffect(() => {
    const draftKey = `match_${game.matchId}_game_${game.gameId}_draft`;
    const savedDraft = localStorage.getItem(draftKey);
    const draft = savedDraft ? JSON.parse(savedDraft) : null;

    if (existingStats) {
      setHomeThrows(existingStats.homeThrows || []);
      setAwayThrows(existingStats.awayThrows || []);
      setHomeDartsPerThrow(existingStats.homeDartsPerThrow || []);
      setAwayDartsPerThrow(existingStats.awayDartsPerThrow || []);
      setWinner(existingStats.winner);
      setNotes(existingStats.notes || '');
      if (existingStats.winner) {
        setCurrentPlayer(existingStats.winner === 'home' ? 'away' : 'home');
      }
    } else if (draft) {
      setHomeThrows(draft.homeThrows || []);
      setAwayThrows(draft.awayThrows || []);
      setHomeDartsPerThrow(draft.homeDartsPerThrow || []);
      setAwayDartsPerThrow(draft.awayDartsPerThrow || []);
      setWinner(draft.winner || null);
      setNotes(draft.notes || '');
      setCurrentPlayer(draft.currentPlayer || 'home');
    } else {
      setHomeThrows([]);
      setAwayThrows([]);
      setHomeDartsPerThrow([]);
      setAwayDartsPerThrow([]);
      setWinner(null);
      setNotes('');
      setCurrentPlayer(scoringMode === 'my_team' && userTeam ? userTeam : 'home');
    }
  }, [game.gameId, game.matchId, existingStats, scoringMode, userTeam]);

  // Auto-save draft
  useEffect(() => {
    const draftKey = `match_${game.matchId}_game_${game.gameId}_draft`;
    if (homeThrows.length > 0 || awayThrows.length > 0 || winner || notes) {
      localStorage.setItem(draftKey, JSON.stringify({
        homeThrows, awayThrows, homeDartsPerThrow, awayDartsPerThrow,
        winner, notes, currentPlayer, timestamp: Date.now()
      }));
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [homeThrows, awayThrows, homeDartsPerThrow, awayDartsPerThrow, winner, notes, currentPlayer]);

  // Auto-save to Firestore
  useEffect(() => {
    const isInitialLoad = homeThrows.length === 0 && awayThrows.length === 0 && !winner;
    if (isInitialLoad) return;
    const timer = setTimeout(() => saveToFirestore(), 500);
    return () => clearTimeout(timer);
  }, [homeThrows, awayThrows, homeDartsPerThrow, awayDartsPerThrow, winner, notes]);

    // Calculate current row based on throws
    useEffect(() => {
      if (scoringMode === 'my_team') {
        // In My Team Only mode, only track the user's team
        const userThrowsLength = userTeam === 'home' ? homeThrows.length : awayThrows.length;
        setCurrentRow(userThrowsLength);
      } else {
        // In Both Teams mode, track current player's throws
        const currentThrowsLength = currentPlayer === 'home' ? homeThrows.length : awayThrows.length;
        setCurrentRow(currentThrowsLength);
      }
    }, [homeThrows, awayThrows, currentPlayer, scoringMode, userTeam]);

  // Auto-scroll to active row
  useEffect(() => {
    if (activeRowRef.current && scrollContainerRef.current) {
      activeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentRow]);

  // Auto-focus input
  useEffect(() => {
    if (!isCurrentPlayerFinished() && inputRef.current) {
      inputRef.current.focus();
    }
  });

  const calculateScoreLeft = (throws) => {
    const total = throws.reduce((sum, score) => sum + score, 0);
    return 501 - total;
  };

  const isCurrentPlayerFinished = () => {
    const throws = currentPlayer === 'home' ? homeThrows : awayThrows;
    return calculateScoreLeft(throws) === 0;
  };

  const isFinished = (throws) => calculateScoreLeft(throws) === 0;

  // Build throws array with remaining scores
  const buildThrowsArray = () => {
    const maxThrows = Math.max(homeThrows.length, awayThrows.length);
    const throwsArray = [];
    let homeRemaining = 501;
    let awayRemaining = 501;

    for (let i = 0; i < maxThrows; i++) {
      const homeScore = homeThrows[i] || null;
      const awayScore = awayThrows[i] || null;
      
      if (homeScore) homeRemaining -= homeScore;
      if (awayScore) awayRemaining -= awayScore;
      
      throwsArray.push({
        homeScore,
        awayScore,
        homeRemaining: homeScore ? homeRemaining : null,
        awayRemaining: awayScore ? awayRemaining : null
      });
    }
    return { throwsArray, homeRemaining, awayRemaining };
  };

  const { throwsArray, homeRemaining, awayRemaining } = buildThrowsArray();

  const addThrow = (score) => {
    // Clear input immediately to prevent double entry
  setCurrentInputValue('');
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
    
    const currentTurnDarts = (currentPlayer === 'home' ? homeDartsPerThrow : awayDartsPerThrow);
    const dartsThrownThisTurn = currentTurnDarts.length > 0 && currentTurnDarts[currentTurnDarts.length - 1] !== 3 
      ? currentTurnDarts[currentTurnDarts.length - 1] : 0;
    const dartsLeftThisTurn = 3 - dartsThrownThisTurn;
    
    if (!isValidThrow(score, dartsLeftThisTurn)) {
      alert(`Invalid score! With ${dartsLeftThisTurn} dart${dartsLeftThisTurn > 1 ? 's' : ''} left, maximum score is ${60 * dartsLeftThisTurn}`);
      return false;
    }
    
    if (!wouldLeaveValidCheckout(currentScoreLeft, score)) {
      alert(`Invalid throw! Scoring ${score} would leave ${currentScoreLeft - score} points.`);
      return false;
    }
    
    if (newScoreLeft === 0) {
      if (!canFinishWithDarts(score, dartsLeftThisTurn)) {
        alert(`Cannot finish ${currentScoreLeft} with ${dartsLeftThisTurn} dart${dartsLeftThisTurn > 1 ? 's' : ''}!`);
        return false;
      }
      setPendingCheckout({ player: currentPlayer, score, scoreLeft: currentScoreLeft });
      setShowCheckoutModal(true);
      setCurrentInputValue('');
      return true;
    }
    
    const updatedThrows = [...currentThrows, score];
    const updatedDarts = [...currentTurnDarts, 3];
    
    if (currentPlayer === 'home') {
      setHomeThrows(updatedThrows);
      setHomeDartsPerThrow(updatedDarts);
      // Only switch players in Both Teams mode
      if (scoringMode === 'both') {
        setCurrentPlayer('away');
      }
      // In My Team Only mode, stay on same player
    } else {
      setAwayThrows(updatedThrows);
      setAwayDartsPerThrow(updatedDarts);
      // Only switch players in Both Teams mode
      if (scoringMode === 'both') {
        setCurrentPlayer('home');
      }
      // In My Team Only mode, stay on same player
    }
    
    setCurrentInputValue('');
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
    
    return true;
  };

  const confirmCheckout = () => {
    if (!pendingCheckout) return;
    const { player, score } = pendingCheckout;
    const actualDartsUsed = selectedDarts;
    const currentThrows = player === 'home' ? homeThrows : awayThrows;
    const currentTurnDarts = player === 'home' ? homeDartsPerThrow : awayDartsPerThrow;
    
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

  const undoLastThrow = () => {
    if (winner) {
      alert('Cannot undo - game is already complete');
      return;
    }
    
    const currentThrows = currentPlayer === 'home' ? homeThrows : awayThrows;
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
      setCurrentInputValue('');
    } else {
      alert('Nothing to undo');
    }
  };

  const addQuickScore = (score) => addThrow(score);

  const handleInputChange = (e) => setCurrentInputValue(e.target.value);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const score = parseInt(currentInputValue);
      if (!isNaN(score) && score >= 0 && score <= 180) {
        addThrow(score);
        setTimeout(() => inputRef.current?.focus(), 10);
      } else {
        alert('Please enter a valid score (0-180)');
        setCurrentInputValue('');
      }
    }
  };

  const saveToFirestore = async () => {
    const homeTotal = homeThrows.reduce((sum, s) => sum + s, 0);
    const awayTotal = awayThrows.reduce((sum, s) => sum + s, 0);
    const homeScoreLeft = 501 - homeTotal;
    const awayScoreLeft = 501 - awayTotal;
    
    const homeStats = {
      tonPlus: homeThrows.filter(s => s >= 100).length,
      oneEighty: homeThrows.filter(s => s === 180).length,
      highCheckout: homeTotal === 501 && homeThrows.length > 0 ? homeThrows[homeThrows.length - 1] : 0,
      scoreLeft: homeScoreLeft > 0 ? homeScoreLeft : 0,
      dartsUsed: homeDartsPerThrow.reduce((sum, d) => sum + d, 0)
    };
    
    const awayStats = {
      tonPlus: awayThrows.filter(s => s >= 100).length,
      oneEighty: awayThrows.filter(s => s === 180).length,
      highCheckout: awayTotal === 501 && awayThrows.length > 0 ? awayThrows[awayThrows.length - 1] : 0,
      scoreLeft: awayScoreLeft > 0 ? awayScoreLeft : 0,
      dartsUsed: awayDartsPerThrow.reduce((sum, d) => sum + d, 0)
    };
    
    const homeFinished = homeTotal === 501;
    const awayFinished = awayTotal === 501;
    let finalWinner = winner;
    if (homeFinished && !awayFinished) finalWinner = 'home';
    if (awayFinished && !homeFinished) finalWinner = 'away';
    
    const wasJustCompleted = finalWinner && !winner;
    if (wasJustCompleted && onGameComplete) {
      const winnerThrows = finalWinner === 'home' ? homeThrows : awayThrows;
      const winnerDartsPerThrow = finalWinner === 'home' ? homeDartsPerThrow : awayDartsPerThrow;
      const totalDartsUsed = winnerDartsPerThrow.reduce((sum, d) => sum + d, 0);
      const finalCheckout = winnerThrows[winnerThrows.length - 1] || 0;
      const winnerName = finalWinner === 'home' ? homePlayerName : awayPlayerName;
      onGameComplete({ winner: finalWinner, winnerName, dartsUsed: totalDartsUsed, checkoutScore: finalCheckout });
    }
    
    const dataToSave = {
      homeStats, awayStats, homeThrows, awayThrows,
      homeDartsPerThrow, awayDartsPerThrow,
      homeCompleted: homeFinished, awayCompleted: awayFinished,
      winner: finalWinner, notes, gameStatus: finalWinner ? 'completed' : 'in_progress'
    };
    
    if (onAutoSave) onAutoSave(dataToSave);
    else if (onSave) onSave(dataToSave);
  };

  const handleSave = () => {
    const homeTotal = homeThrows.reduce((sum, s) => sum + s, 0);
    const awayTotal = awayThrows.reduce((sum, s) => sum + s, 0);
    const homeFinished = homeTotal === 501;
    const awayFinished = awayTotal === 501;
    let finalWinner = winner;
    if (homeFinished && !awayFinished) finalWinner = 'home';
    if (awayFinished && !homeFinished) finalWinner = 'away';
    
    const wasJustCompleted = finalWinner && !winner;
    if (wasJustCompleted && onGameComplete) {
      const winnerThrows = finalWinner === 'home' ? homeThrows : awayThrows;
      const winnerDartsPerThrow = finalWinner === 'home' ? homeDartsPerThrow : awayDartsPerThrow;
      const totalDartsUsed = winnerDartsPerThrow.reduce((sum, d) => sum + d, 0);
      const finalCheckout = winnerThrows[winnerThrows.length - 1] || 0;
      const winnerName = finalWinner === 'home' ? homePlayerName : awayPlayerName;
      onGameComplete({ winner: finalWinner, winnerName, dartsUsed: totalDartsUsed, checkoutScore: finalCheckout });
    }
    
    saveToFirestore();
    const draftKey = `match_${game.matchId}_game_${game.gameId}_draft`;
    localStorage.removeItem(draftKey);
    onClose();
  };

  const handleCancel = () => {
    const draftKey = `match_${game.matchId}_game_${game.gameId}_draft`;
    localStorage.removeItem(draftKey);
    onClose();
  };

  const currentHomeScoreLeft = calculateScoreLeft(homeThrows);
  const currentAwayScoreLeft = calculateScoreLeft(awayThrows);
  const homeFinished = isFinished(homeThrows);
  const awayFinished = isFinished(awayThrows);
  const canUndo = (homeThrows.length > 0 || awayThrows.length > 0) && !winner;
  const isHomeTurn = (scoringMode === 'both' && currentPlayer === 'home' && !winner && !homeFinished) ||
  (scoringMode === 'my_team' && userTeam === 'home' && !winner && !homeFinished);
const isAwayTurn = (scoringMode === 'both' && currentPlayer === 'away' && !winner && !awayFinished) ||
  (scoringMode === 'my_team' && userTeam === 'away' && !winner && !awayFinished);

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="game-scoring-modal" onClick={e => e.stopPropagation()}>
                        {/* Header */}
        <div className="scoring-header">
          <div className="back-arrow-container">
            <button className="back-arrow-btn" onClick={handleCancel}>← Back</button>
          </div>
          
          {/* Player Names Row */}
          <div className="player-names-row">
  <div 
    className={`home-player-name ${scoringMode === 'both' && !winner && !homeFinished ? 'clickable' : ''}`}
    onClick={() => setActivePlayer('home')}
    style={{ cursor: scoringMode === 'both' && !winner && !homeFinished ? 'pointer' : 'default' }}
  >
    {getFirstName(homePlayerName)}
  </div>
  
  {/* Show VS on mobile, mode badge on desktop */}
  <div className="vs-mobile">VS</div>
  <div className="mode-badge desktop-only">{scoringMode === 'my_team' ? 'My Team Only' : 'Both Teams'}</div>
  
  <div 
    className={`away-player-name ${scoringMode === 'both' && !winner && !awayFinished ? 'clickable' : ''}`}
    onClick={() => setActivePlayer('away')}
    style={{ cursor: scoringMode === 'both' && !winner && !awayFinished ? 'pointer' : 'default' }}
  >
    {getFirstName(awayPlayerName)}
  </div>
</div>
        </div>

                {/* Column Headers Bar */}
                <div className="column-headers-bar">
          <div className="headers-row">
            <div className="header-item">SCORED</div>
            <div className="header-item">TO GO</div>
            <div className="header-item">D/U</div>
            <div className="header-item">SCORED</div>
            <div className="header-item">TO GO</div>
          </div>
        </div>

        {/* Scrollable Rows */}
        <div className="game-rows-container" ref={scrollContainerRef}>
          <div className="rows-grid">
            {duValues.map((du, index) => {
              const throwData = throwsArray[index];
              const isActiveRow = index === currentRow;
              const isHomeActiveTurn = isHomeTurn && isActiveRow;
              const isAwayActiveTurn = isAwayTurn && isActiveRow;
              
              return (
                <div 
                  key={index} 
                  className={`game-row ${isActiveRow ? 'active-row' : ''}`}
                  ref={isActiveRow ? activeRowRef : null}
                >
                  {/* Home Scored Cell */}
                  <div 
  className={`cell scored-cell ${isHomeActiveTurn ? 'active-turn' : ''} ${throwData?.homeScore ? 'has-value' : ''} ${!isHomeActiveTurn && throwData?.homeScore ? 'editable' : ''}`}
  onClick={() => {
    if (!isHomeActiveTurn && throwData?.homeScore && !winner) {
      // Allow editing existing score
      const newScore = prompt('Edit score:', throwData.homeScore);
      if (newScore !== null) {
        const newScoreNum = parseInt(newScore);
        if (!isNaN(newScoreNum) && newScoreNum >= 0 && newScoreNum <= 180) {
          const updatedThrows = [...homeThrows];
          updatedThrows[index] = newScoreNum;
          setHomeThrows(updatedThrows);
          setWinner(null); // Reset winner if editing
        } else {
          alert('Please enter a valid score (0-180)');
        }
      }
    }
  }}
>
  {isHomeActiveTurn ? (
    <input
      ref={inputRef}
      type="number"
      className="score-input-inline"
      value={currentInputValue}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      placeholder="___"
      autoFocus
    />
  ) : (
    <span className="score-value">{throwData?.homeScore || ''}</span>
  )}
</div>
                  
                  {/* Home To Go Cell */}
                  <div className="cell togo-cell">
                    <span className="togo-value">
                      {throwData?.homeRemaining !== undefined ? throwData.homeRemaining : (index === 0 ? 501 : '')}
                    </span>
                  </div>
                  
                  {/* D/U Cell */}
                  <div className="cell du-cell">
                    <span className="du-value">{du}</span>
                  </div>

                  {/* Away Scored Cell */}
                  <div 
  className={`cell scored-cell ${isAwayActiveTurn ? 'active-turn' : ''} ${throwData?.awayScore ? 'has-value' : ''} ${!isAwayActiveTurn && throwData?.awayScore ? 'editable' : ''}`}
  onClick={() => {
    if (!isAwayActiveTurn && throwData?.awayScore && !winner) {
      const newScore = prompt('Edit score:', throwData.awayScore);
      if (newScore !== null) {
        const newScoreNum = parseInt(newScore);
        if (!isNaN(newScoreNum) && newScoreNum >= 0 && newScoreNum <= 180) {
          const updatedThrows = [...awayThrows];
          updatedThrows[index] = newScoreNum;
          setAwayThrows(updatedThrows);
          setWinner(null);
        } else {
          alert('Please enter a valid score (0-180)');
        }
      }
    }
  }}
>
  {isAwayActiveTurn ? (
    <input
      ref={inputRef}
      type="number"
      className="score-input-inline"
      value={currentInputValue}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      placeholder="___"
      autoFocus
    />
  ) : (
    <span className="score-value">{throwData?.awayScore || ''}</span>
  )}
</div>
                  
                  {/* Away To Go Cell */}
                  <div className="cell togo-cell">
                    <span className="togo-value">
                      {throwData?.awayRemaining !== undefined ? throwData.awayRemaining : (index === 0 ? 501 : '')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="game-footer">
          <div className="remaining-blocks">
            <div className={`remaining-block home-remaining ${isHomeTurn ? 'active-turn' : ''}`}>
              <div className="remaining-number">{currentHomeScoreLeft}</div>
              <div className="remaining-label">REMAINING</div>
            </div>
            <div className={`remaining-block away-remaining ${isAwayTurn ? 'active-turn' : ''}`}>
              <div className="remaining-number">{currentAwayScoreLeft}</div>
              <div className="remaining-label">REMAINING</div>
            </div>
          </div>
          
          <div className="notes-section">
            <textarea
              rows="1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)..."
              className="notes-input"
            />
          </div>
          
          <div className="action-buttons">
  <button className="cancel-btn" onClick={handleCancel}>Cancel</button>
  <button className="save-btn" onClick={handleSave}>Save Game</button>
</div>
        </div>

        {/* Checkout Modal */}
        {showCheckoutModal && pendingCheckout && (
          <div className="modal-overlay" style={{ zIndex: 2001 }}>
            <div className="checkout-modal">
              <h3>Checkout Details</h3>
              <p>Final score: {pendingCheckout.score}</p>
              <p>How many darts did it take?</p>
              <div className="darts-options">
                {getAvailableDartOptions(pendingCheckout.scoreLeft).map(darts => (
                  <button key={darts} className={`dart-btn ${selectedDarts === darts ? 'selected' : ''}`} onClick={() => setSelectedDarts(darts)}>
                    {darts} Dart{darts > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
              <div className="checkout-buttons">
                <button className="cancel-checkout" onClick={() => { setShowCheckoutModal(false); setPendingCheckout(null); setSelectedDarts(3); }}>Cancel</button>
                <button className="confirm-checkout" onClick={confirmCheckout}>Confirm</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameScoringModal;