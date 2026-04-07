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
  const [showGameEndModal, setShowGameEndModal] = useState(false);
  const [gameEndData, setGameEndData] = useState(null);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [selectedDarts, setSelectedDarts] = useState(3);
  
  const inputRef = useRef(null);

  // Check if a score can be finished with a given number of darts
  const canFinishWithDarts = (scoreLeft, dartsLeft) => {
    if (scoreLeft <= 0) return false;
    
    // Max possible with given darts
    const maxPossible = dartsLeft * 60;
    if (scoreLeft > maxPossible) return false;
    
    // With 1 dart: must be a double or bull (2-40, 50)
    if (dartsLeft === 1) {
      const validCheckouts = [50];
      for (let i = 1; i <= 20; i++) {
        validCheckouts.push(i * 2);
      }
      return validCheckouts.includes(scoreLeft);
    }
    
    // With 2 darts
    if (dartsLeft === 2) {
      const validOneDart = [50];
      for (let i = 1; i <= 20; i++) {
        validOneDart.push(i * 2);
      }
      for (let firstDart = 0; firstDart <= 60; firstDart++) {
        const remaining = scoreLeft - firstDart;
        if (remaining >= 2 && remaining <= 50 && validOneDart.includes(remaining)) {
          return true;
        }
      }
      return false;
    }
    
    // With 3 darts
    if (dartsLeft === 3) {
      if (scoreLeft > 170) return false;
      if (scoreLeft < 2) return false;
      return true;
    }
    
    return true;
  };

  // Get available dart options for checkout based on score left
  const getAvailableDartOptions = (scoreLeft) => {
    const options = [];
    for (let darts = 1; darts <= 3; darts++) {
      if (canFinishWithDarts(scoreLeft, darts)) {
        options.push(darts);
      }
    }
    return options;
  };

  // Validate if a score is possible with given darts left
  const isValidThrow = (score, dartsLeft) => {
    if (score > 60 * dartsLeft) return false;
    if (score < 0) return false;
    if (score > 180) return false;
    return true;
  };

  // Check if a score left is a valid score (can be finished on a double or is safe)
  const isValidScoreLeft = (scoreLeft) => {
    if (scoreLeft === 0) return true;
    if (scoreLeft < 0) return false;
    
    // The ONLY impossible score in darts is 1
    if (scoreLeft === 1) return false;
    
    // All other scores from 2-170 are possible with 3 darts
    // Scores above 170 continue the game
    return true;
  };

  // Check if the score you're about to enter would leave a valid score
  const wouldLeaveValidCheckout = (currentScoreLeft, scoreToEnter) => {
    const newScoreLeft = currentScoreLeft - scoreToEnter;
    
    // If newScoreLeft is 0, it's a checkout - already validated elsewhere
    if (newScoreLeft === 0) return true;
    
    // If newScoreLeft is negative, it's a bust - handled elsewhere
    if (newScoreLeft < 0) return true;
    
    // Check if the remaining score is a valid score
    return isValidScoreLeft(newScoreLeft);
  };

  // Load data EVERY time modal opens or game changes
  useEffect(() => {
    const draftKey = `match_${game.matchId}_game_${game.gameId}_draft`;
    const savedDraft = localStorage.getItem(draftKey);
    const draft = savedDraft ? JSON.parse(savedDraft) : null;

    console.log('🔄 MODAL OPEN - existingStats:', existingStats);
    console.log('🔄 MODAL OPEN - draft:', draft);

    if (existingStats) {
      console.log('📂 Loading from Firestore (saved game)');
      console.log('🏆 Winner from Firestore:', existingStats.winner);
      
      const isForfeit = existingStats.isForfeit || 
                        existingStats.homeStats?.isForfeit || 
                        existingStats.awayStats?.isForfeit;
      
      setHomeThrows(existingStats.homeThrows || []);
      setAwayThrows(existingStats.awayThrows || []);
      setHomeDartsPerThrow(existingStats.homeDartsPerThrow || (existingStats.homeThrows?.map(() => 3) || []));
      setAwayDartsPerThrow(existingStats.awayDartsPerThrow || (existingStats.awayThrows?.map(() => 3) || []));
      setWinner(existingStats.winner);
      
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
  }, [game.gameId, game.matchId, existingStats]);

  useEffect(() => {
    if (scoringMode === 'my_team' && userTeam) {
      console.log('🎯 Setting currentPlayer to userTeam:', userTeam);
      setCurrentPlayer(userTeam);
    }
  }, [scoringMode, userTeam]);

  // Auto-save draft to localStorage whenever data changes
  useEffect(() => {
    const draftKey = `match_${game.matchId}_game_${game.gameId}_draft`;

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
      localStorage.removeItem(draftKey);
    }
  }, [homeThrows, awayThrows, homeDartsPerThrow, awayDartsPerThrow, winner, notes, currentPlayer, game.matchId, game.gameId]);

  // Auto-save to Firestore whenever throws or winner changes (real-time updates)
  useEffect(() => {
    // Don't save on initial load
    const isInitialLoad = homeThrows.length === 0 && awayThrows.length === 0 && !winner;
    if (isInitialLoad) return;
    
    // Debounce to avoid too many writes
    const timer = setTimeout(() => {
      saveToFirestore();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [homeThrows, awayThrows, homeDartsPerThrow, awayDartsPerThrow, winner, notes]);

  // Determine if each team already has actual stats
  const homeStatsExist = existingStats?.homeThrows && existingStats.homeThrows.length > 0;
  const awayStatsExist = existingStats?.awayThrows && existingStats.awayThrows.length > 0;
  const gameHasWinner = existingStats?.winner !== null && existingStats?.winner !== undefined;
  const hasUserSaved = userTeam === 'home' ? homeStatsExist : awayStatsExist;
  const canEdit = true;

  console.log('📊 Stats exist - home:', homeStatsExist, 'away:', awayStatsExist);
  console.log('📊 Game has winner:', gameHasWinner);
  console.log('📊 User team:', userTeam, 'has saved:', hasUserSaved, 'can edit:', canEdit);

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

  // Add a throw - with full validation
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
    
    // Check if this throw would leave an invalid score (e.g., leaving 1)
    if (!wouldLeaveValidCheckout(currentScoreLeft, score)) {
      alert(`Invalid throw! Scoring ${score} would leave ${currentScoreLeft - score} points. In darts, you must finish on a double (2,4,6...40) or bullseye (50).`);
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

  // Confirm checkout with darts used
  const confirmCheckout = () => {
    if (!pendingCheckout) return;
    
    const { player, score, dartsLeft, scoreLeft } = pendingCheckout;
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

  const showGameEndPopup = (winner, finalScore, dartsUsed, checkoutScore) => {
    const visits = Math.ceil(dartsUsed / 3);
    const winnerName = winner === 'home' ? homePlayerName : awayPlayerName;
    
    setGameEndData({
      winner: winner,
      winnerName: winnerName,
      finalScore: finalScore,
      dartsUsed: dartsUsed,
      visits: visits,
      checkoutScore: checkoutScore
    });
    setShowGameEndModal(true);
  };

  const handleGameEndContinue = () => {
    setShowGameEndModal(false);
    setGameEndData(null);
    // Close the scoring modal
    onClose();
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
    
    // Check if game just completed (winner was just set)
    const wasJustCompleted = finalWinner && !winner;
    
    if (wasJustCompleted) {
      // Calculate darts used for the winner
      const winnerThrows = finalWinner === 'home' ? homeThrows : awayThrows;
      const winnerDartsPerThrow = finalWinner === 'home' ? homeDartsPerThrow : awayDartsPerThrow;
      const totalDartsUsed = winnerDartsPerThrow.reduce((sum, d) => sum + d, 0);
      const finalCheckout = winnerThrows[winnerThrows.length - 1] || 0;
      
      // Show the game end popup after a short delay
      setTimeout(() => {
        showGameEndPopup(finalWinner, 501, totalDartsUsed, finalCheckout);
      }, 100);
    }
    
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
      notes: notes,
      gameStatus: finalWinner ? 'completed' : 'in_progress'
    };
    
    console.log('📤 Auto-saving to Firestore:', dataToSave);
    if (onAutoSave) {
      onAutoSave(dataToSave);
    } else if (onSave) {
      onSave(dataToSave);
    }
  };

  const handleSave = () => {
    const isHomeTeam = userTeam === 'home';
    const isBothTeamsMode = scoringMode === 'both';
    
    if (isBothTeamsMode) {
      const homeTotal = homeThrows.reduce((sum, s) => sum + s, 0);
      const homeScoreLeft = 501 - homeTotal;
      const homeStats = {
        tonPlus: homeThrows.filter(s => s >= 100).length,
        oneEighty: homeThrows.filter(s => s === 180).length,
        highCheckout: homeTotal === 501 && homeThrows.length > 0 ? homeThrows[homeThrows.length - 1] : 0,
        scoreLeft: homeScoreLeft > 0 ? homeScoreLeft : 0,
        dartsUsed: homeDartsPerThrow.reduce((sum, d) => sum + d, 0)
      };
      
      const awayTotal = awayThrows.reduce((sum, s) => sum + s, 0);
      const awayScoreLeft = 501 - awayTotal;
      const awayStats = {
        tonPlus: awayThrows.filter(s => s >= 100).length,
        oneEighty: awayThrows.filter(s => s === 180).length,
        highCheckout: awayTotal === 501 && awayThrows.length > 0 ? awayThrows[awayThrows.length - 1] : 0,
        scoreLeft: awayScoreLeft > 0 ? awayScoreLeft : 0,
        dartsUsed: awayDartsPerThrow.reduce((sum, d) => sum + d, 0)
      };
      
      const homeFinished = homeTotal === 501;
      const awayFinished = awayTotal === 501;
      let finalWinner = winner || existingStats?.winner || null;
      
      if (homeFinished && !awayFinished) finalWinner = 'home';
      if (awayFinished && !homeFinished) finalWinner = 'away';
      
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

  const handleCancel = async () => {
    // If no scores were ever saved, reset game status to not_started
    const hasAnyScores = homeThrows.length > 0 || awayThrows.length > 0;
    
    if (!hasAnyScores && game.matchId) {
      try {
        const { doc, getDoc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        
        const matchRef = doc(db, 'matches', game.matchId);
        const matchDoc = await getDoc(matchRef);
        const currentMatch = matchDoc.data();
        const updatedGames = [...(currentMatch.games || [])];
        const gameIndex = updatedGames.findIndex(g => g.gameId === game.gameId);
        
        if (gameIndex !== -1) {
          updatedGames[gameIndex] = {
            ...updatedGames[gameIndex],
            gameStatus: 'not_started'
          };
          await updateDoc(matchRef, { games: updatedGames });
          console.log('🔄 Game status reset to not_started');
        }
      } catch (error) {
        console.error('Error resetting game status:', error);
      }
    }
    
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
                    if (canEdit) {
                      startEditing(player, idx, score);
                    }
                  }}
                  style={{ cursor: canEdit ? 'pointer' : 'default' }}
                >
                  {score}
                </span>
                <span className="throw-darts">({cumulativeDarts})</span>
                <span className="throw-score-left">→ {501 - throws.slice(0, idx + 1).reduce((a, b) => a + b, 0)}</span>
              </div>
            );
          })}
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
                  onKeyDown={handleKeyDown}
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
              <div 
                className={`player-tile ${scoringMode === 'both' && !winner && !homeFinished ? 'clickable' : ''}`}
                onClick={() => {
                  if (scoringMode === 'both' && !winner && !homeFinished) {
                    setCurrentPlayer('home');
                    setCurrentInputValue('');
                    setTimeout(() => {
                      if (inputRef.current) {
                        inputRef.current.focus();
                      }
                    }, 100);
                  }
                }}
                style={{ 
                  cursor: scoringMode === 'both' && !winner && !homeFinished ? 'pointer' : 'default',
                  opacity: scoringMode === 'both' && currentPlayer !== 'home' && !winner && !homeFinished ? 0.8 : 1,
                  transition: 'opacity 0.2s ease'
                }}
              >
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
              
              <div 
                className={`player-tile ${scoringMode === 'both' && !winner && !awayFinished ? 'clickable' : ''}`}
                onClick={() => {
                  if (scoringMode === 'both' && !winner && !awayFinished) {
                    setCurrentPlayer('away');
                    setCurrentInputValue('');
                    setTimeout(() => {
                      if (inputRef.current) {
                        inputRef.current.focus();
                      }
                    }, 100);
                  }
                }}
                style={{ 
                  cursor: scoringMode === 'both' && !winner && !awayFinished ? 'pointer' : 'default',
                  opacity: scoringMode === 'both' && currentPlayer !== 'away' && !winner && !awayFinished ? 0.8 : 1,
                  transition: 'opacity 0.2s ease'
                }}
              >
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
                    e.preventDefault();
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
            <button className="save-btn" onClick={handleSave}>Save Game</button>
          </div>
        </div>
      </div>

      {/* Game End Modal */}
      {showGameEndModal && gameEndData && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleGameEndContinue();
          }
        }}>
          <div className="game-end-modal" onClick={e => e.stopPropagation()}>
            <div className="game-end-header">
              <h2>🎯 GAME COMPLETE! 🎯</h2>
            </div>
            <div className="game-end-body">
              <div className="winner-announcement">
                🏆 {gameEndData.winnerName} WINS! 🏆
              </div>
              <div className="game-stats">
                <p>Finished in {gameEndData.dartsUsed} darts ({gameEndData.visits} visits)</p>
                <p>Final checkout: {gameEndData.checkoutScore}</p>
              </div>
            </div>
            <div className="game-end-actions">
              <button 
                className="game-end-continue"
                onClick={handleGameEndContinue}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && pendingCheckout && (
        <div className="modal-overlay">
          <div className="checkout-modal">
            <h3>🎯 Checkout Details</h3>
            <p>Final score: {pendingCheckout.finalScore}</p>
            <p>Score left: {pendingCheckout.scoreLeft}</p>
            <p>How many darts did it take?</p>
            <div className="darts-options">
              {getAvailableDartOptions(pendingCheckout.scoreLeft).map(darts => (
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
                setShowCheckoutModal(false);
                setPendingCheckout(null);
                setSelectedDarts(3);
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