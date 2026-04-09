import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './GameScoringPage.css';

function GameScoringPage() {
  const { matchId, gameId } = useParams();
  const navigate = useNavigate();
  
  // Game data from URL params
  const [game, setGame] = useState(null);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Scoring state
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
  const [scoringMode, setScoringMode] = useState('both');
  const [userTeam, setUserTeam] = useState(null);
  const [homePlayerName, setHomePlayerName] = useState('');
  const [awayPlayerName, setAwayPlayerName] = useState('');
  
  const inputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const activeRowRef = useRef(null);

  const MAX_ROWS = 167;
  const duValues = Array.from({ length: MAX_ROWS }, (_, i) => (i + 1) * 3);

  const getFirstName = (fullName) => {
    if (!fullName) return '';
    return fullName.split(' ')[0];
  };

  // Load match and game data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const matchDoc = await getDoc(doc(db, 'matches', matchId));
        if (!matchDoc.exists()) {
          alert('Match not found');
          navigate(`/match/${matchId}/scoring`);
          return;
        }
        
        const matchData = { id: matchDoc.id, ...matchDoc.data() };
        setMatch(matchData);
        
        // Find the game
        const existingGame = matchData.games?.find(g => g.gameId === parseInt(gameId));
        if (!existingGame) {
          alert('Game not found');
          navigate(`/match/${matchId}/scoring`);
          return;
        }
        
        // Get player names from lineup
        const homeLineup = matchData.homeTeam?.lineup?.starting || [];
        const awayLineup = matchData.awayTeam?.lineup?.starting || [];
        
        // Find which players are in this game
        // Need to find by rotation order - for now, get from existingGame
        const homePlayerId = existingGame.homePlayerId;
        const awayPlayerId = existingGame.awayPlayerId;
        
        // Get player names
        const homePlayer = homeLineup.find(p => p.id === homePlayerId);
        const awayPlayer = awayLineup.find(p => p.id === awayPlayerId);
        
        if (homePlayer) {
          const playerDoc = await getDoc(doc(db, 'members', homePlayer.id));
          if (playerDoc.exists()) {
            const data = playerDoc.data();
            setHomePlayerName(`${data.firstNames || ''} ${data.surname || ''}`.trim());
          }
        }
        
        if (awayPlayer) {
          const playerDoc = await getDoc(doc(db, 'members', awayPlayer.id));
          if (playerDoc.exists()) {
            const data = playerDoc.data();
            setAwayPlayerName(`${data.firstNames || ''} ${data.surname || ''}`.trim());
          }
        }
        
        // Load existing stats if any
        if (existingGame.homeThrows) setHomeThrows(existingGame.homeThrows);
        if (existingGame.awayThrows) setAwayThrows(existingGame.awayThrows);
        if (existingGame.homeDartsPerThrow) setHomeDartsPerThrow(existingGame.homeDartsPerThrow);
        if (existingGame.awayDartsPerThrow) setAwayDartsPerThrow(existingGame.awayDartsPerThrow);
        if (existingGame.winner) setWinner(existingGame.winner);
        if (existingGame.notes) setNotes(existingGame.notes);
        
        setGame({
          gameId: parseInt(gameId),
          homePlayer: { id: homePlayerId, name: homePlayerName },
          awayPlayer: { id: awayPlayerId, name: awayPlayerName },
          existingGame
        });
        
      } catch (error) {
        console.error('Error loading game:', error);
        alert('Failed to load game');
        navigate(`/match/${matchId}/scoring`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [matchId, gameId, navigate]);

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

  useEffect(() => {
    if (scoringMode === 'my_team') {
      const userThrowsLength = userTeam === 'home' ? homeThrows.length : awayThrows.length;
      setCurrentRow(userThrowsLength);
    } else {
      const currentThrowsLength = currentPlayer === 'home' ? homeThrows.length : awayThrows.length;
      setCurrentRow(currentThrowsLength);
    }
  }, [homeThrows, awayThrows, currentPlayer, scoringMode, userTeam]);

  useEffect(() => {
    if (activeRowRef.current && scrollContainerRef.current) {
      activeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentRow]);

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

  const { throwsArray } = buildThrowsArray();

  const addThrow = (score) => {
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

  const saveGameResult = async () => {
    const homeTotal = homeThrows.reduce((sum, s) => sum + s, 0);
    const awayTotal = awayThrows.reduce((sum, s) => sum + s, 0);
    const homeFinished = homeTotal === 501;
    const awayFinished = awayTotal === 501;
    let finalWinner = winner;
    if (homeFinished && !awayFinished) finalWinner = 'home';
    if (awayFinished && !homeFinished) finalWinner = 'away';
    
    const homeStats = {
      tonPlus: homeThrows.filter(s => s >= 100).length,
      oneEighty: homeThrows.filter(s => s === 180).length,
      highCheckout: homeTotal === 501 && homeThrows.length > 0 ? homeThrows[homeThrows.length - 1] : 0,
      scoreLeft: homeFinished ? 0 : 501 - homeTotal,
      dartsUsed: homeDartsPerThrow.reduce((sum, d) => sum + d, 0)
    };
    
    const awayStats = {
      tonPlus: awayThrows.filter(s => s >= 100).length,
      oneEighty: awayThrows.filter(s => s === 180).length,
      highCheckout: awayTotal === 501 && awayThrows.length > 0 ? awayThrows[awayThrows.length - 1] : 0,
      scoreLeft: awayFinished ? 0 : 501 - awayTotal,
      dartsUsed: awayDartsPerThrow.reduce((sum, d) => sum + d, 0)
    };
    
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      const currentMatch = matchDoc.data();
      let updatedGames = [...(currentMatch.games || [])];
      const gameIndex = updatedGames.findIndex(g => g.gameId === parseInt(gameId));
      
      const newGame = {
        gameId: parseInt(gameId),
        round: game?.round || 1,
        gameNumber: parseInt(gameId),
        homePlayerId: game?.homePlayer?.id,
        awayPlayerId: game?.awayPlayer?.id,
        homeStats,
        awayStats,
        homeThrows,
        awayThrows,
        homeDartsPerThrow,
        awayDartsPerThrow,
        winner: finalWinner,
        notes,
        savedAt: Date.now(),
        homeCompleted: homeFinished,
        awayCompleted: awayFinished,
        completed: finalWinner !== null,
        gameStatus: finalWinner ? 'completed' : 'in_progress'
      };
      
      if (gameIndex !== -1) {
        updatedGames[gameIndex] = newGame;
      } else {
        updatedGames.push(newGame);
      }
      
      let homeScore = 0;
      let awayScore = 0;
      const pointsPerGame = 1; // Default, adjust if needed
      
      updatedGames.forEach(game => {
        if (game.winner) {
          if (game.winner === 'home') homeScore += pointsPerGame;
          else if (game.winner === 'away') awayScore += pointsPerGame;
        }
      });
      
      await updateDoc(matchRef, {
        games: updatedGames,
        homeScore: homeScore,
        awayScore: awayScore
      });
      
      alert('Game saved successfully!');
      navigate(`/match/${matchId}/scoring`);
      
    } catch (error) {
      console.error('Error saving game:', error);
      alert('Failed to save game: ' + error.message);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure? Any unsaved scores will be lost.')) {
      navigate(`/match/${matchId}/scoring`);
    }
  };

  const currentHomeScoreLeft = calculateScoreLeft(homeThrows);
  const currentAwayScoreLeft = calculateScoreLeft(awayThrows);
  const homeFinished = isFinished(homeThrows);
  const awayFinished = isFinished(awayThrows);
  
  const isHomeTurn = (scoringMode === 'both' && currentPlayer === 'home' && !winner && !homeFinished) ||
    (scoringMode === 'my_team' && userTeam === 'home' && !winner && !homeFinished);
  const isAwayTurn = (scoringMode === 'both' && currentPlayer === 'away' && !winner && !awayFinished) ||
    (scoringMode === 'my_team' && userTeam === 'away' && !winner && !awayFinished);

  if (loading) {
    return (
      <div className="game-scoring-page" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-gray, #9ca3af)' }}>Loading game...</p>
      </div>
    );
  }

  return (
    <div className="game-scoring-page">
      <div className="game-scoring-container">
        {/* Header */}
        <div className="scoring-header">
          <div className="back-arrow-container">
            <button className="back-arrow-btn" onClick={handleCancel}>← Back</button>
          </div>
          
          <div className="player-names-row">
            <div className="home-player-name">
              {getFirstName(homePlayerName)}
            </div>
            <div className="vs-mobile">VS</div>
            <div className="mode-badge desktop-only">{scoringMode === 'my_team' ? 'My Team Only' : 'Both Teams'}</div>
            <div className="away-player-name">
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
                  <div className={`cell scored-cell ${isHomeActiveTurn ? 'active-turn' : ''} ${throwData?.homeScore ? 'has-value' : ''}`}>
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
                  <div className={`cell scored-cell ${isAwayActiveTurn ? 'active-turn' : ''} ${throwData?.awayScore ? 'has-value' : ''}`}>
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
            <button className="save-btn" onClick={saveGameResult}>Save Game</button>
          </div>
        </div>

        {/* Checkout Modal */}
        {showCheckoutModal && pendingCheckout && (
          <div className="checkout-modal-overlay" style={{ zIndex: 2001 }}>
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

export default GameScoringPage;