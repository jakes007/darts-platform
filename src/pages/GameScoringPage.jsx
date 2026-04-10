import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './GameScoringPage.css';
import NumberPad from '../components/NumberPad';
import CustomModal from '../components/CustomModal';

function GameScoringPage() {
  const { matchId, gameId } = useParams();
  const navigate = useNavigate();
  
  const [game, setGame] = useState(null);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [homeThrows, setHomeThrows] = useState([]);
  const [awayThrows, setAwayThrows] = useState([]);
  const [homeDartsPerThrow, setHomeDartsPerThrow] = useState([]);
  const [awayDartsPerThrow, setAwayDartsPerThrow] = useState([]);
  const [winner, setWinner] = useState(null);
  const [currentInputValue, setCurrentInputValue] = useState('');
  const [buildingScore, setBuildingScore] = useState('');
  const [currentPlayer, setCurrentPlayer] = useState('home');
  const [turnStage, setTurnStage] = useState('home');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [selectedDarts, setSelectedDarts] = useState(3);
  const [currentRow, setCurrentRow] = useState(0);
  const [scoringMode] = useState('both');
  const [homePlayerName, setHomePlayerName] = useState('');
  const [awayPlayerName, setAwayPlayerName] = useState('');
  
  // Modal states
  const [showFirstThrowModal, setShowFirstThrowModal] = useState(false);
  const [pendingFirstPlayer, setPendingFirstPlayer] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ row: null, player: null, currentScore: null });
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showBackModal, setShowBackModal] = useState(false);
  const [showFirstPlayerPicker, setShowFirstPlayerPicker] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const inputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const activeRowRef = useRef(null);
  const [showWinnerBanner, setShowWinnerBanner] = useState(false);
  const [winnerName, setWinnerName] = useState('');
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
        
        const existingGame = matchData.games?.find(g => g.gameId === parseInt(gameId));
        if (!existingGame) {
          alert('Game not found');
          navigate(`/match/${matchId}/scoring`);
          return;
        }
        
        const homeLineup = matchData.homeTeam?.lineup?.starting || [];
        const awayLineup = matchData.awayTeam?.lineup?.starting || [];
        
        const homePlayerId = existingGame.homePlayerId;
        const awayPlayerId = existingGame.awayPlayerId;
        
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
        
        if (existingGame.homeThrows) setHomeThrows(existingGame.homeThrows);
        if (existingGame.awayThrows) setAwayThrows(existingGame.awayThrows);
        if (existingGame.homeDartsPerThrow) setHomeDartsPerThrow(existingGame.homeDartsPerThrow);
        if (existingGame.awayDartsPerThrow) setAwayDartsPerThrow(existingGame.awayDartsPerThrow);
        if (existingGame.winner) setWinner(existingGame.winner);
        
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

  // Show popup to choose first thrower when game loads (only if no throws exist)
  useEffect(() => {
    if (!loading && homeThrows.length === 0 && awayThrows.length === 0 && !winner) {
      setShowFirstPlayerPicker(true);
    }
  }, [loading, homeThrows.length, awayThrows.length, winner]);

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

  // Update currentRow based on turnStage
  useEffect(() => {
    if (turnStage === 'home') {
      setCurrentRow(homeThrows.length);
    } else {
      setCurrentRow(awayThrows.length);
    }
  }, [homeThrows.length, awayThrows.length, turnStage]);

  // Incremental scroll - only moves up one row at a time
  useEffect(() => {
    if (!activeRowRef.current || !scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const activeRow = activeRowRef.current;
    
    const containerRect = container.getBoundingClientRect();
    const rowRect = activeRow.getBoundingClientRect();
    
    const isAboveTop = rowRect.top < containerRect.top + 50;
    const isBelowBottom = rowRect.bottom > containerRect.bottom - 50;
    
    if (isAboveTop) {
      const scrollAmount = rowRect.top - containerRect.top - 50;
      container.scrollBy({
        top: scrollAmount,
        behavior: 'smooth'
      });
    } else if (isBelowBottom) {
      const rowHeight = activeRow.offsetHeight;
      const scrollAmount = rowRect.bottom - containerRect.bottom + rowHeight;
      container.scrollBy({
        top: scrollAmount,
        behavior: 'smooth'
      });
    }
  }, [currentRow]);

  const calculateScoreLeft = (throws) => {
    const total = throws.reduce((sum, score) => sum + score, 0);
    return 501 - total;
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
    return { throwsArray };
  };

  const { throwsArray } = buildThrowsArray();

  const addThrow = (score) => {
    setCurrentInputValue('');
    setBuildingScore('');
    if (score < 0 || score > 180) return false;
    
    const activePlayer = turnStage;
    const currentThrows = activePlayer === 'home' ? homeThrows : awayThrows;
    const currentScoreLeft = calculateScoreLeft(currentThrows);
    if (currentScoreLeft === 0) return false;
    if (isFinished(currentThrows)) return false;
    
    const newScoreLeft = currentScoreLeft - score;
    if (newScoreLeft < 0) {
      showError('Bust! Score would go below 0');
      return false;
    }
    
    const currentTurnDarts = (activePlayer === 'home' ? homeDartsPerThrow : awayDartsPerThrow);
    const dartsThrownThisTurn = currentTurnDarts.length > 0 && currentTurnDarts[currentTurnDarts.length - 1] !== 3 
      ? currentTurnDarts[currentTurnDarts.length - 1] : 0;
    const dartsLeftThisTurn = 3 - dartsThrownThisTurn;
    
    if (!isValidThrow(score, dartsLeftThisTurn)) {
      showError(`Invalid score! With ${dartsLeftThisTurn} dart${dartsLeftThisTurn > 1 ? 's' : ''} left, maximum score is ${60 * dartsLeftThisTurn}`);
      return false;
    }
    
    if (!wouldLeaveValidCheckout(currentScoreLeft, score)) {
      showError(`Invalid throw! Scoring ${score} would leave ${currentScoreLeft - score} points.`);
      return false;
    }
    
    if (newScoreLeft === 0) {
      if (!canFinishWithDarts(score, dartsLeftThisTurn)) {
        showError(`Cannot finish ${currentScoreLeft} with ${dartsLeftThisTurn} dart${dartsLeftThisTurn > 1 ? 's' : ''}!`);
        return false;
      }
      setPendingCheckout({ player: activePlayer, score, scoreLeft: currentScoreLeft });
      setShowCheckoutModal(true);
      return true;
    }
    
    const updatedThrows = [...currentThrows, score];
    const updatedDarts = [...currentTurnDarts, 3];
    
    // Update turnStage FIRST before saving throws
    if (turnStage === 'home') {
      setTurnStage('away');
      setCurrentPlayer('away');
    } else {
      setTurnStage('home');
      setCurrentPlayer('home');
    }
    
    // Save the throw AFTER updating turnStage
    if (activePlayer === 'home') {
      setHomeThrows(updatedThrows);
      setHomeDartsPerThrow(updatedDarts);
    } else {
      setAwayThrows(updatedThrows);
      setAwayDartsPerThrow(updatedDarts);
    }
    
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
      setWinnerName(homePlayerName);
    } else {
      setAwayThrows(updatedThrows);
      setAwayDartsPerThrow(updatedDarts);
      setWinner('away');
      setWinnerName(awayPlayerName);
    }
    setShowCheckoutModal(false);
    setPendingCheckout(null);
    setSelectedDarts(3);
    setCurrentInputValue('');
    setBuildingScore('');
    
    // Show winner banner
    setShowWinnerBanner(true);
    
    // Auto-hide banner after 3 seconds
    setTimeout(() => {
      setShowWinnerBanner(false);
    }, 3000);
  };

  const handleInputChange = (e) => setCurrentInputValue(e.target.value);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const score = parseInt(currentInputValue);
      if (!isNaN(score) && score >= 0 && score <= 180) {
        addThrow(score);
      } else {
        showError('Please enter a valid score (0-180)');
        setCurrentInputValue('');
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 10);
      }
    }
  };

  const handleNumberPadInput = (value) => {
    setBuildingScore(value);
    setCurrentInputValue(value);
  };

  const handleNumberPadDelete = () => {
    const newValue = buildingScore.slice(0, -1);
    setBuildingScore(newValue);
    setCurrentInputValue(newValue);
  };

  const handleNumberPadClear = () => {
    setBuildingScore('');
    setCurrentInputValue('');
  };

  const handleNumberPadEnter = () => {
    if (buildingScore && buildingScore !== '') {
      const score = parseInt(buildingScore);
      if (!isNaN(score) && score >= 0 && score <= 180) {
        addThrow(score);
        setBuildingScore('');
        setCurrentInputValue('');
      } else {
        showError('Please enter a valid score (0-180)');
        setBuildingScore('');
        setCurrentInputValue('');
      }
    }
  };

  // Handle first throw confirmation
  const confirmFirstThrow = () => {
    if (pendingFirstPlayer === 'home') {
      setTurnStage('home');
      setCurrentPlayer('home');
    } else {
      setTurnStage('away');
      setCurrentPlayer('away');
    }
    setBuildingScore('');
    setCurrentInputValue('');
    setShowFirstThrowModal(false);
    setPendingFirstPlayer(null);
  };

  // Handle edit score confirmation
  const confirmEditScore = (newScore) => {
    const { row, player } = editData;
    const newScoreNum = parseInt(newScore);
    if (!isNaN(newScoreNum) && newScoreNum >= 0 && newScoreNum <= 180) {
      if (player === 'home') {
        const updatedThrows = [...homeThrows];
        updatedThrows[row] = newScoreNum;
        setHomeThrows(updatedThrows);
      } else {
        const updatedThrows = [...awayThrows];
        updatedThrows[row] = newScoreNum;
        setAwayThrows(updatedThrows);
      }
      setWinner(null);
    } else {
      showError('Please enter a valid score (0-180)');
    }
    setShowEditModal(false);
    setEditData({ row: null, player: null, currentScore: null });
  };

  // Handle save confirmation
  const confirmSaveGame = () => {
    setShowSaveConfirmModal(false);
    saveGameResult();
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
      const pointsPerGame = 1;
      
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
      
    
      navigate(`/match/${matchId}/scoring`);
      
    } catch (error) {
      console.error('Error saving game:', error);
      showError('Failed to save game: ' + error.message);
    }
  };

  

  const confirmBack = () => {
    setShowBackModal(false);
    navigate(`/match/${matchId}/scoring`);
  };

  const selectFirstPlayer = (player) => {
    if (player === 'home') {
      setTurnStage('home');
      setCurrentPlayer('home');
    } else {
      setTurnStage('away');
      setCurrentPlayer('away');
    }
    setShowFirstPlayerPicker(false);
    setBuildingScore('');
    setCurrentInputValue('');
  };

  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const confirmCancel = () => {
    setShowCancelModal(false);
    navigate(`/match/${matchId}/scoring`);
  };

  const currentHomeScoreLeft = calculateScoreLeft(homeThrows);
  const currentAwayScoreLeft = calculateScoreLeft(awayThrows);
  const homeFinished = isFinished(homeThrows);
  const awayFinished = isFinished(awayThrows);
  
  const isHomeTurn = turnStage === 'home' && !winner && !homeFinished;
  const isAwayTurn = turnStage === 'away' && !winner && !awayFinished;

  

  if (loading) {
    return (
      <div className="game-scoring-page" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: '#9ca3af' }}>Loading game...</p>
      </div>
    );
  }

  return (
    <div className="game-scoring-page">
            {/* Winner Banner */}
      {showWinnerBanner && (
        <div className="winner-banner">
          <div className="winner-banner-content">
            <span className="winner-trophy">🏆</span>
            <span className="winner-name">{getFirstName(winnerName)} WINS!</span>
            <span className="winner-trophy">🏆</span>
          </div>
        </div>
      )}
      {/* FIXED HEADER */}
      <div className="fixed-header">
        <div className="scoring-header">
        <div className="back-arrow-container">
            <button className="back-arrow-btn" onClick={() => setShowBackModal(true)}>← Back</button>
          </div>
          
          <div className="player-names-row">
          <div 
              className="home-player-name"
              style={{ cursor: 'default' }}
            >
              {getFirstName(homePlayerName)}
            </div>
            <div className="vs-mobile">VS</div>
            <div 
              className="away-player-name"
              style={{ cursor: 'default' }}
            >
              {getFirstName(awayPlayerName)}
            </div>
          </div>
        </div>

        <div className="remaining-blocks-mobile">
          <div className={`remaining-block home-remaining ${isHomeTurn ? 'active-turn' : ''}`}>
            <div className="remaining-number">{currentHomeScoreLeft}</div>
            <div className="remaining-label">REMAINING</div>
          </div>
          <div className={`remaining-block away-remaining ${isAwayTurn ? 'active-turn' : ''}`}>
            <div className="remaining-number">{currentAwayScoreLeft}</div>
            <div className="remaining-label">REMAINING</div>
          </div>
        </div>

        <div className="column-headers-bar">
          <div className="headers-row">
            <div className="header-item">SCORED</div>
            <div className="header-item">TO GO</div>
            <div className="header-item">D/U</div>
            <div className="header-item">SCORED</div>
            <div className="header-item">TO GO</div>
          </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="scrollable-content" ref={scrollContainerRef}>
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
                  className={`cell scored-cell ${isHomeActiveTurn ? 'active-turn' : ''} ${throwData?.homeScore ? 'editable' : ''}`}
                  onClick={() => {
                    if (!isHomeActiveTurn && throwData?.homeScore !== undefined && throwData?.homeScore !== null && !winner) {
                      setEditData({
                        row: index,
                        player: 'home',
                        currentScore: throwData.homeScore
                      });
                      setShowEditModal(true);
                    }
                  }}
                >
                  {isHomeActiveTurn ? (
                    <>
                      <input
                        ref={inputRef}
                        type="number"
                        className="score-input-inline desktop-only-input"
                        value={currentInputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="___"
                        autoFocus
                      />
                      <span className="score-value mobile-score-display">
                        {buildingScore || '___'}
                      </span>
                    </>
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
                  className={`cell scored-cell ${isAwayActiveTurn ? 'active-turn' : ''} ${throwData?.awayScore ? 'editable' : ''}`}
                  onClick={() => {
                    if (!isAwayActiveTurn && throwData?.awayScore !== undefined && throwData?.awayScore !== null && !winner) {
                      setEditData({
                        row: index,
                        player: 'away',
                        currentScore: throwData.awayScore
                      });
                      setShowEditModal(true);
                    }
                  }}
                >
                  {isAwayActiveTurn ? (
                    <>
                      <input
                        ref={inputRef}
                        type="number"
                        className="score-input-inline desktop-only-input"
                        value={currentInputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="___"
                        autoFocus
                      />
                      <span className="score-value mobile-score-display">
                        {buildingScore || '___'}
                      </span>
                    </>
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

      {/* NUMBER PAD WRAPPER with Cancel/Save buttons */}
      <div className="number-pad-wrapper">
        <div className="action-buttons-pad">
        <button className="cancel-btn-pad" onClick={() => setShowCancelModal(true)}>Cancel</button>
          <button className="save-btn-pad" onClick={() => setShowSaveConfirmModal(true)}>Save Game</button>
        </div>
        
        <NumberPad
          onNumberClick={handleNumberPadInput}
          onDelete={handleNumberPadDelete}
          onClear={handleNumberPadClear}
          onEnter={handleNumberPadEnter}
          currentValue={buildingScore}
          quickScores={[26, 45, 57, 100]}
        />
      </div>

      {/* DESKTOP FOOTER - only shows on desktop */}
      <div className="fixed-footer">
        <div className="action-buttons">
        <button className="cancel-btn" onClick={() => setShowCancelModal(true)}>Cancel</button>
          <button className="save-btn" onClick={() => setShowSaveConfirmModal(true)}>Save Game</button>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && pendingCheckout && (
        <div className="checkout-modal-overlay">
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

      

<CustomModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onConfirm={confirmEditScore}
        title="Edit Score"
        message={`Current score: ${editData.currentScore}`}
        confirmText="Save"
        cancelText="Cancel"
        type="edit"
        initialValue={editData.currentScore?.toString() || ""}
      />

<CustomModal
        isOpen={showBackModal}
        onClose={() => setShowBackModal(false)}
        onConfirm={confirmBack}
        title="Leave Game"
        message="Are you sure? Unsaved scores will be lost."
        confirmText="Leave"
        cancelText="Cancel"
      />

<CustomModal
        isOpen={showSaveConfirmModal}
        onClose={() => setShowSaveConfirmModal(false)}
        onConfirm={confirmSaveGame}
        title="Save Game"
        message="Are you sure you want to save this game? All scores will be final."
        confirmText="Save"
        cancelText="Cancel"
      />

            {/* Error Modal */}
      <CustomModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        onConfirm={() => setShowErrorModal(false)}
        title="Error"
        message={errorMessage}
        confirmText="OK"
        cancelText=""
      />

            {/* Cancel Modal */}
            <CustomModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancel}
        title="Leave Game"
        message="Are you sure? Unsaved scores will be lost."
        confirmText="Leave"
        cancelText="Cancel"
      />

      {/* First Player Picker Modal */}
      {showFirstPlayerPicker && (
        <div className="custom-modal-overlay">
          <div className="custom-modal" style={{ maxWidth: '300px' }}>
            <div className="custom-modal-header">
              <h3>Who Throws First?</h3>
            </div>
            <div className="custom-modal-body">
              <p style={{ marginBottom: '20px' }}>Select which player starts the game:</p>
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button
                  onClick={() => selectFirstPlayer('home')}
                  style={{
                    background: '#1a1a1a',
                    border: '2px solid #e74c3c',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  {getFirstName(homePlayerName)}
                </button>
                <button
                  onClick={() => selectFirstPlayer('away')}
                  style={{
                    background: '#1a1a1a',
                    border: '2px solid #27ae60',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  {getFirstName(awayPlayerName)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameScoringPage;