import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useUserView } from '../context/UserViewContext';
import Toast from '../components/Toast';
import './RoundRobinScoring.css';
import GameScoringModal from '../components/GameScoringModal';

function RoundRobinScoring() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentViewingUser } = useUserView();
  
  const [match, setMatch] = useState(null);
  const [season, setSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [scoringMode, setScoringMode] = useState('my_team');
  const [playerOfTheMatch, setPlayerOfTheMatch] = useState({ home: null, away: null });
  const [playerNames, setPlayerNames] = useState({});
  const [selectedGame, setSelectedGame] = useState(null);
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [userTeam, setUserTeam] = useState(null);
  const [showModeInfoModal, setShowModeInfoModal] = useState(false);
  const [showPotmModal, setShowPotmModal] = useState(false);
  const [tempPotmSelection, setTempPotmSelection] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [matchSummary, setMatchSummary] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [startY, setStartY] = useState(0);
const [isDragging, setIsDragging] = useState(false);

  const [hasManuallyClosedSummary, setHasManuallyClosedSummary] = useState(false);
  
// Screen size detection for mobile vs desktop
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth <= 767);
  };
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);

// Rotation order for 4-a-side (16 games)
  const rotationOrder = [
    { gameId: 1, round: 1, homeIdx: 0, awayIdx: 1, label: "1v2" },
    { gameId: 2, round: 1, homeIdx: 1, awayIdx: 0, label: "2v1" },
    { gameId: 3, round: 1, homeIdx: 2, awayIdx: 3, label: "3v4" },
    { gameId: 4, round: 1, homeIdx: 3, awayIdx: 2, label: "4v3" },
    { gameId: 5, round: 2, homeIdx: 1, awayIdx: 1, label: "2v2" },
    { gameId: 6, round: 2, homeIdx: 0, awayIdx: 3, label: "1v4" },
    { gameId: 7, round: 2, homeIdx: 3, awayIdx: 0, label: "4v1" },
    { gameId: 8, round: 2, homeIdx: 2, awayIdx: 2, label: "3v3" },
    { gameId: 9, round: 3, homeIdx: 3, awayIdx: 3, label: "4v4" },
    { gameId: 10, round: 3, homeIdx: 0, awayIdx: 0, label: "1v1" },
    { gameId: 11, round: 3, homeIdx: 1, awayIdx: 2, label: "2v3" },
    { gameId: 12, round: 3, homeIdx: 2, awayIdx: 1, label: "3v2" },
    { gameId: 13, round: 4, homeIdx: 0, awayIdx: 2, label: "1v3" },
    { gameId: 14, round: 4, homeIdx: 1, awayIdx: 3, label: "2v4" },
    { gameId: 15, round: 4, homeIdx: 2, awayIdx: 0, label: "3v1" },
    { gameId: 16, round: 4, homeIdx: 3, awayIdx: 1, label: "4v2" }
  ];

  useEffect(() => {
    fetchMatchData();
  }, [matchId]);

  const fetchMatchData = async () => {
    setLoading(true);
    try {
      const matchDoc = await getDoc(doc(db, 'matches', matchId));
      if (!matchDoc.exists()) {
        setToast({ type: 'error', message: 'Match not found' });
        return;
      }
      
      const matchData = { id: matchDoc.id, ...matchDoc.data() };
      setMatch(matchData);

      // Determine user's team
      const userMemberId = currentViewingUser?.id;
      let userTeamId = null;

      if (matchData.seasonId) {
        const rostersRef = collection(db, 'seasons', matchData.seasonId, 'rosters');
        const rostersSnapshot = await getDocs(rostersRef);
        for (const rosterDoc of rostersSnapshot.docs) {
          const rosterData = rosterDoc.data();
          if ((rosterData.memberIds || []).includes(userMemberId)) {
            userTeamId = rosterData.teamId;
            break;
          }
        }
      }

      if (userTeamId === matchData.homeTeamId) {
        setUserTeam('home');
        console.log('👤 User is HOME team');
      } else if (userTeamId === matchData.awayTeamId) {
        setUserTeam('away');
        console.log('👤 User is AWAY team');
      }

      // Fetch team names if they're not already set
      if (!matchData.homeTeamName && matchData.homeTeamId) {
        const homeTeamDoc = await getDoc(doc(db, 'teams', matchData.homeTeamId));
        if (homeTeamDoc.exists()) {
          matchData.homeTeamName = homeTeamDoc.data().name;
        }
      }
      if (!matchData.awayTeamName && matchData.awayTeamId) {
        const awayTeamDoc = await getDoc(doc(db, 'teams', matchData.awayTeamId));
        if (awayTeamDoc.exists()) {
          matchData.awayTeamName = awayTeamDoc.data().name;
        }
      }
      
      // Get season
      if (matchData.seasonId) {
        const seasonDoc = await getDoc(doc(db, 'seasons', matchData.seasonId));
        if (seasonDoc.exists()) {
          setSeason({ id: seasonDoc.id, ...seasonDoc.data() });
        }
      }
      
      // Get player names for both teams
      const homeLineup = matchData.homeTeam?.lineup?.starting || [];
      const awayLineup = matchData.awayTeam?.lineup?.starting || [];
      
      const names = {};
      const allPlayerIds = [...homeLineup.map(p => p.id), ...awayLineup.map(p => p.id)];
      
      for (const playerId of allPlayerIds) {
        const playerDoc = await getDoc(doc(db, 'members', playerId));
        if (playerDoc.exists()) {
          const data = playerDoc.data();
          names[playerId] = `${data.firstNames || ''} ${data.surname || ''}`.trim();
        }
      }
      setPlayerNames(names);
      
    } catch (error) {
      console.error('Error fetching match:', error);
      setToast({ type: 'error', message: 'Failed to load match' });
    } finally {
      setLoading(false);
    }
  };

  const getPointsPerGame = () => {
    const legsPerGame = season?.legsPerGame || 1;
    const points = legsPerGame === 1 ? 1 : 2;
    return points;
  };
  
  // Helper function to get first name only
const getFirstName = (fullName) => {
  if (!fullName) return '';
  return fullName.split(' ')[0];
};

// Helper component for stat grid (used in mobile modals)
const StatGrid = ({ stats }) => {
  if (!stats) return null;
  // Calculate losses = gamesPlayed - wins
  const losses = (stats.gamesPlayed || 0) - (stats.wins || 0);
  return (
    <div className="mobile-stat-grid">
      <div className="stat-item">
        <span className="stat-icon">🏆</span>
        <span className="stat-value">{stats.wins || 0}</span>
        <span className="stat-label">WINS</span>
      </div>
      <div className="stat-item">
        <span className="stat-icon">💔</span>
        <span className="stat-value">{losses}</span>
        <span className="stat-label">LOSS</span>
      </div>
      <div className="stat-item">
        <span className="stat-icon">📊</span>
        <span className="stat-value">{stats.average || 0}</span>
        <span className="stat-label">AVG</span>
      </div>
      <div className="stat-item">
        <span className="stat-icon">🎯</span>
        <span className="stat-value">{stats.oneEighties || 0}</span>
        <span className="stat-label">180s</span>
      </div>
      <div className="stat-item">
        <span className="stat-icon">💯</span>
        <span className="stat-value">{stats.tons || 0}</span>
        <span className="stat-label">TONS</span>
      </div>
      <div className="stat-item">
        <span className="stat-icon">💪</span>
        <span className="stat-value">{stats.highestCheckout || 0}</span>
        <span className="stat-label">HIGH CO</span>
      </div>
    </div>
  );
};
  
  // Calculate player statistics from games
  const calculatePlayerStats = (playerId, isHomePlayer) => {
    if (!match?.games) return null;
    
    let gamesPlayed = 0;
    let wins = 0;
    let totalScore = 0;
    let totalDarts = 0;
    let oneEighties = 0;
    let tons = 0;
    let highestCheckout = 0;
    
    match.games.forEach(game => {
      const isPlayerInGame = (isHomePlayer && game.homePlayerId === playerId) || 
                             (!isHomePlayer && game.awayPlayerId === playerId);
      
      if (isPlayerInGame) {
        gamesPlayed++;
        
        const throws = isHomePlayer ? game.homeThrows : game.awayThrows;
        const dartsPerThrow = isHomePlayer ? game.homeDartsPerThrow : game.awayDartsPerThrow;
        const stats = isHomePlayer ? game.homeStats : game.awayStats;
        
        if (throws && throws.length > 0) {
          totalScore += throws.reduce((a, b) => a + b, 0);
          totalDarts += dartsPerThrow?.reduce((a, b) => a + b, 0) || 0;
        }
        
        if (stats) {
          oneEighties += stats.oneEighty || 0;
          tons += stats.tonPlus || 0;
          if (stats.highCheckout > highestCheckout) {
            highestCheckout = stats.highCheckout;
          }
        }
        
        if (game.winner === 'home' && isHomePlayer) wins++;
        if (game.winner === 'away' && !isHomePlayer) wins++;
      }
    });
    
    const average = totalDarts > 0 ? ((totalScore / totalDarts) * 3).toFixed(1) : 0;
    
    return {
      gamesPlayed,
      wins,
      points: wins,
      average: parseFloat(average),
      oneEighties,
      tons,
      highestCheckout,
      totalScore,
      totalDarts
    };
  };

  // Get opposing team players with stats
  const getOpposingTeamPlayersWithStats = () => {
    const opposingLineup = userTeam === 'home' 
      ? match.awayTeam?.lineup?.starting || []
      : match.homeTeam?.lineup?.starting || [];
    
    return opposingLineup.map(player => {
      const isHomePlayer = (userTeam === 'away' && match.homeTeam?.lineup?.starting?.some(p => p.id === player.id));
      const stats = calculatePlayerStats(player.id, isHomePlayer);
      return {
        ...player,
        stats: stats || { points: 0, average: 0, oneEighties: 0, tons: 0, highestCheckout: 0 }
      };
    }).filter(p => p.stats?.gamesPlayed > 0);
  };

  // Get all players from both teams with stats (for summary)
  const getAllPlayersWithStats = () => {
    if (!match) return [];
    
    const homeLineup = match.homeTeam?.lineup?.starting || [];
    const awayLineup = match.awayTeam?.lineup?.starting || [];
    const allPlayers = [];
    
    // Add home players
    homeLineup.forEach(player => {
      const stats = calculatePlayerStats(player.id, true);
      if (stats && stats.gamesPlayed > 0) {
        allPlayers.push({
          ...player,
          team: match.homeTeamName,
          stats: stats
        });
      }
    });
    
    // Add away players
    awayLineup.forEach(player => {
      const stats = calculatePlayerStats(player.id, false);
      if (stats && stats.gamesPlayed > 0) {
        allPlayers.push({
          ...player,
          team: match.awayTeamName,
          stats: stats
        });
      }
    });
    
    // Sort by points, then average, then tons, then 180s
    return allPlayers.sort((a, b) => {
      if (a.stats.points !== b.stats.points) return b.stats.points - a.stats.points;
      if (a.stats.average !== b.stats.average) return b.stats.average - a.stats.average;
      if (a.stats.tons !== b.stats.tons) return b.stats.tons - a.stats.tons;
      return b.stats.oneEighties - a.stats.oneEighties;
    });
  };
  
  // Function to update POTM selection (for Edit Match)
  const updatePotmSelection = async (newPotmSelection, team) => {
    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        [`playerOfTheMatch.${team}`]: {
          playerId: newPotmSelection.id,
          playerName: newPotmSelection.name,
          selectedAt: serverTimestamp(),
          selectedBy: userTeam,
          stats: newPotmSelection.stats
        }
      });
      
      // Update local match state
      setMatch(prev => ({
        ...prev,
        playerOfTheMatch: {
          ...prev?.playerOfTheMatch,
          [team]: newPotmSelection
        }
      }));
      
      setToast({ type: 'success', message: `${newPotmSelection.name} updated as Player of the Match!` });
      
      // Refresh summary modal
      const homeScore = calculateTeamScore().home;
      const awayScore = calculateTeamScore().away;
      const allPlayers = getAllPlayersWithStats();
      
      setMatchSummary({
        homeScore,
        awayScore,
        winner: homeScore > awayScore ? 'home' : 'away',
        homeTeamName: match.homeTeamName,
        awayTeamName: match.awayTeamName,
        potmHome: team === 'home' ? newPotmSelection : match?.playerOfTheMatch?.home,
        potmAway: team === 'away' ? newPotmSelection : match?.playerOfTheMatch?.away,
        allPlayers
      });
      
    } catch (error) {
      console.error('Error updating POTM:', error);
      setToast({ type: 'error', message: 'Failed to update selection' });
    }
  };
  
  // Auto-select the best player based on stats
  const getBestPlayer = () => {
    const players = getOpposingTeamPlayersWithStats();
    if (players.length === 0) return null;
    
    return players.sort((a, b) => {
      const aPoints = Number(a.stats.points) || 0;
      const bPoints = Number(b.stats.points) || 0;
      const aAvg = parseFloat(a.stats.average) || 0;
      const bAvg = parseFloat(b.stats.average) || 0;
      const aTons = Number(a.stats.tons) || 0;
      const bTons = Number(b.stats.tons) || 0;
      const a180s = Number(a.stats.oneEighties) || 0;
      const b180s = Number(b.stats.oneEighties) || 0;
      const aCheckout = Number(a.stats.highestCheckout) || 0;
      const bCheckout = Number(b.stats.highestCheckout) || 0;
      
      if (aPoints !== bPoints) return bPoints - aPoints;
      if (aAvg !== bAvg) return bAvg - aAvg;
      if (aTons !== bTons) return bTons - aTons;
      if (a180s !== b180s) return b180s - a180s;
      return bCheckout - aCheckout;
    })[0];
  };

  // Drag to close handlers for bottom sheet
const handleTouchStart = (e) => {
  setStartY(e.touches[0].clientY);
  setIsDragging(true);
};

const handleTouchMove = (e, closeModal) => {
  if (!isDragging) return;
  const currentY = e.touches[0].clientY;
  const diff = currentY - startY;
  if (diff > 100) {
    closeModal();
    setIsDragging(false);
  }
};

const handleTouchEnd = () => {
  setIsDragging(false);
};
  
  // Update team names when match data changes
  useEffect(() => {
    if (match?.homeTeamId && match?.awayTeamId && !match.homeTeamName) {
      const fetchTeamNames = async () => {
        try {
          const [homeDoc, awayDoc] = await Promise.all([
            getDoc(doc(db, 'teams', match.homeTeamId)),
            getDoc(doc(db, 'teams', match.awayTeamId))
          ]);
          
          setMatch(prev => ({
            ...prev,
            homeTeamName: homeDoc.exists() ? homeDoc.data().name : 'Home Team',
            awayTeamName: awayDoc.exists() ? awayDoc.data().name : 'Away Team'
          }));
        } catch (error) {
          console.error('Error fetching team names:', error);
        }
      };
      
      fetchTeamNames();
    }
  }, [match?.homeTeamId, match?.awayTeamId]);
  
  const calculateTeamScore = () => {
    if (!match?.games || match.games.length === 0) {
      return { home: 0, away: 0 };
    }
  
    let homeScore = 0;
    let awayScore = 0;
    const pointsPerGame = getPointsPerGame();
  
    match.games.forEach(game => {
      if (game.winner === 'home') homeScore += pointsPerGame;
      if (game.winner === 'away') awayScore += pointsPerGame;
    });
  
    return { home: homeScore, away: awayScore };
  };
  
  const openScoringModal = (game) => {
    console.log('🎯 Opening modal for game:', game);
    setSelectedGame(game);
    setShowScoringModal(true);
  };

    // Real-time listener for match updates
    useEffect(() => {
      const unsubscribe = onSnapshot(doc(db, 'matches', matchId), (docSnap) => {
        if (docSnap.exists()) {
          const updatedData = docSnap.data();
          console.log('🔄 onSnapshot received - homeScore:', updatedData.homeScore);
          console.log('🔄 onSnapshot received - awayScore:', updatedData.awayScore);
          
          // Get POTM data
          const potmData = updatedData.playerOfTheMatch;
          
         // If both have submitted and summary modal isn't showing, show it
if (potmData?.home && potmData?.away && !showSummaryModal && !hasManuallyClosedSummary && match) {
  const homeScore = calculateTeamScore().home;
  const awayScore = calculateTeamScore().away;
  const allPlayers = getAllPlayersWithStats();
  
  setMatchSummary({
    homeScore,
    awayScore,
    winner: homeScore > awayScore ? 'home' : 'away',
    homeTeamName: match?.homeTeamName,
    awayTeamName: match?.awayTeamName,
    potmHome: potmData.home,
    potmAway: potmData.away,
    allPlayers
  });
  setShowSummaryModal(true);
}

// If summary modal is open, update it with latest data
if (showSummaryModal && match) {
  const homeScore = calculateTeamScore().home;
  const awayScore = calculateTeamScore().away;
  const allPlayers = getAllPlayersWithStats();
  
  setMatchSummary({
    homeScore,
    awayScore,
    winner: homeScore > awayScore ? 'home' : 'away',
    homeTeamName: match?.homeTeamName,
    awayTeamName: match?.awayTeamName,
    potmHome: updatedData.playerOfTheMatch?.home,
    potmAway: updatedData.playerOfTheMatch?.away,
    allPlayers
  });
}
          
          // 🎯 Check submission status based on selectedBy
const homeSubmittedBy = potmData?.home?.selectedBy;
const awaySubmittedBy = potmData?.away?.selectedBy;

const hasHomeTeamSubmitted = homeSubmittedBy === 'home';
const hasAwayTeamSubmitted = awaySubmittedBy === 'away';

// Only show waiting message if the OTHER team has submitted and current hasn't
if (userTeam === 'home' && !hasHomeTeamSubmitted && hasAwayTeamSubmitted) {
  if (!showPotmModal && !showSummaryModal) {
    setToast({ type: 'info', message: `Waiting for ${match?.awayTeamName} to select their Player of the Match...` });
  }
} else if (userTeam === 'away' && !hasAwayTeamSubmitted && hasHomeTeamSubmitted) {
  if (!showPotmModal && !showSummaryModal) {
    setToast({ type: 'info', message: `Waiting for ${match?.homeTeamName} to select their Player of the Match...` });
  }
}
          
          setMatch(prev => {
            let homeScore = updatedData.homeScore;
            let awayScore = updatedData.awayScore;
            
            if ((homeScore === undefined || awayScore === undefined) && updatedData.games) {
              const pointsPerGame = getPointsPerGame();
              homeScore = 0;
              awayScore = 0;
              updatedData.games.forEach(game => {
                if (game.winner) {
                  if (game.winner === 'home') homeScore += pointsPerGame;
                  else if (game.winner === 'away') awayScore += pointsPerGame;
                }
              });
            }
            
            return {
              ...prev,
              games: updatedData.games,
              homeScore: homeScore !== undefined ? homeScore : (prev?.homeScore || 0),
              awayScore: awayScore !== undefined ? awayScore : (prev?.awayScore || 0),
              playerOfTheMatch: potmData
            };
          });
        }
      });
      
      return () => unsubscribe();
    }, [matchId, showSummaryModal, showPotmModal, userTeam, match?.homeTeamName, match?.awayTeamName]);

  useEffect(() => {
    console.log('🔍 match state changed - homeScore:', match?.homeScore, 'awayScore:', match?.awayScore);
  }, [match?.homeScore, match?.awayScore]);

      // Check if match is already completed on load
useEffect(() => {
  if (match?.playerOfTheMatch?.home && match?.playerOfTheMatch?.away && match && !hasManuallyClosedSummary) {
    const homeScore = calculateTeamScore().home;
    const awayScore = calculateTeamScore().away;
    const allPlayers = getAllPlayersWithStats();
    
    setMatchSummary({
      homeScore,
      awayScore,
      winner: homeScore > awayScore ? 'home' : 'away',
      homeTeamName: match.homeTeamName,
      awayTeamName: match.awayTeamName,
      potmHome: match.playerOfTheMatch.home,
      potmAway: match.playerOfTheMatch.away,
      allPlayers
    });
    setShowSummaryModal(true);
  }
}, [match?.playerOfTheMatch, match?.homeTeamName, match?.awayTeamName, hasManuallyClosedSummary]);

  
const saveGameResult = async (gameData) => {
  console.log('🔍 saveGameResult called with:', gameData);
  setSaving(true);
  try {
    const matchRef = doc(db, 'matches', matchId);
    const matchDoc = await getDoc(matchRef);
    const currentMatch = matchDoc.data();
    
    let updatedGames = [...(currentMatch.games || [])];
    const gameIndex = updatedGames.findIndex(g => g.gameId === selectedGame.gameId);
    const existingGame = gameIndex !== -1 ? updatedGames[gameIndex] : null;
    
    // Debug logs
    console.log('🔍 WINNER CHECK DEBUG:');
    console.log('  existingGame?.winner:', existingGame?.winner);
    console.log('  gameData.winner:', gameData.winner);
    console.log('  isEditMode:', isEditMode);
    
    // Check if trying to change winner, but allow if in edit mode
    if (existingGame?.winner && existingGame.winner !== gameData.winner && gameData.winner && !isEditMode) {
      console.log('  → BLOCKED: Cannot change winner');
      setToast({ type: 'error', message: `This game already has a winner: ${existingGame.winner === 'home' ? 'Home' : 'Away'} team. Cannot change winner.` });
      setSaving(false);
      setShowScoringModal(false);
      return;
    } else {
      console.log('  → ALLOWED: Proceeding with save');
    }
    
    const hasWinner = gameData.winner !== null && gameData.winner !== undefined;
    
    const newGame = {
      gameId: selectedGame.gameId,
      round: selectedGame.round,
      gameNumber: selectedGame.gameId,
      homePlayerId: selectedGame.homePlayer.id,
      awayPlayerId: selectedGame.awayPlayer.id,
      homeStats: gameData.homeStats !== undefined ? gameData.homeStats : (existingGame?.homeStats || {}),
      awayStats: gameData.awayStats !== undefined ? gameData.awayStats : (existingGame?.awayStats || {}),
      homeThrows: gameData.homeThrows !== undefined ? gameData.homeThrows : (existingGame?.homeThrows || []),
      awayThrows: gameData.awayThrows !== undefined ? gameData.awayThrows : (existingGame?.awayThrows || []),
      homeDartsPerThrow: gameData.homeDartsPerThrow !== undefined ? gameData.homeDartsPerThrow : (existingGame?.homeDartsPerThrow || []),
      awayDartsPerThrow: gameData.awayDartsPerThrow !== undefined ? gameData.awayDartsPerThrow : (existingGame?.awayDartsPerThrow || []),
      winner: gameData.winner || existingGame?.winner || null,
      notes: gameData.notes !== undefined ? gameData.notes : (existingGame?.notes || ''),
      savedAt: Date.now(),
      homeCompleted: gameData.homeCompleted !== undefined ? gameData.homeCompleted : (existingGame?.homeCompleted || false),
      awayCompleted: gameData.awayCompleted !== undefined ? gameData.awayCompleted : (existingGame?.awayCompleted || false),
      completed: hasWinner || (existingGame?.completed || false)
    };
    
    if (gameIndex !== -1) {
      updatedGames[gameIndex] = newGame;
    } else {
      updatedGames.push(newGame);
    }
    
    let homeScore = 0;
    let awayScore = 0;
    const pointsPerGame = getPointsPerGame();
    
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
    
    setMatch(prev => ({
      ...prev,
      games: updatedGames,
      homeScore: homeScore,
      awayScore: awayScore
    }));
    
    console.log('✅ Game saved - new homeScore:', homeScore, 'new awayScore:', awayScore);
    
    
    
    
    setToast({ type: 'success', message: 'Game score saved!' });
    setShowScoringModal(false);
    setSelectedGame(null);
    
  } catch (error) {
    console.error('Error saving game:', error);
    setToast({ type: 'error', message: 'Failed to save score: ' + error.message });
  } finally {
    setSaving(false);
  }
};

  if (loading) {
    return (
      <div className="scoring-container" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-gray, #9ca3af)' }}>Loading match...</p>
      </div>
    );
  }

  if (!match || !season) {
    return (
      <div className="scoring-container">
        <div className="error-message">
          <h2>Match not found</h2>
          <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const teamScore = calculateTeamScore();
  
  const homeLineup = match.homeTeam?.lineup?.starting || [];
  const awayLineup = match.awayTeam?.lineup?.starting || [];
  const totalGames = rotationOrder.length;
  const completedGames = match.games?.filter(g => g.completed).length || 0;
  const pointsPerGame = getPointsPerGame();

  return (
    <div className="scoring-container">
      {/* Header */}
      <div className="scoring-header">
        <div className="header-flex">
          <button 
            onClick={() => navigate(`/match/${matchId}/lineup`)} 
            className="back-btn"
          >
            ← Back
          </button>
          <h1 className="match-title">
            {match?.homeTeamName || 'Home Team'} vs {match?.awayTeamName || 'Away Team'}
          </h1>
        </div>
      </div>
      
      {/* Match Info */}
      <div className="match-info-card-v2">
        <div className="match-header-row">
          <div className="team-name home-team-name">{match.homeTeamName || 'Home Team'}</div>
          <div className="vs-center">VS</div>
          <div className="team-name away-team-name">{match.awayTeamName || 'Away Team'}</div>
        </div>
        
        <div key={`score-${teamScore.home}-${teamScore.away}`} className="match-scores-row">
          <div className="team-score home-score">{teamScore.home}</div>
          <div className="score-dash">-</div>
          <div className="team-score away-score">{teamScore.away}</div>
        </div>
        
        <div className="match-stats-row">
          <span>{completedGames} / {totalGames} games completed</span>
          <span>{pointsPerGame} point{pointsPerGame > 1 ? 's' : ''} per win</span>
        </div>
      </div>
      
      {/* Mode Toggle with Info */}
      <div className="mode-toggle-container">
        <div className="mode-toggle-header">
          <span className="mode-label">📝 How to keep score?</span>
          <button className="info-icon-btn" onClick={() => setShowModeInfoModal(true)}>
            ℹ️
          </button>
        </div>
        <div className="mode-toggle">
          <span className={`mode-option ${scoringMode === 'my_team' ? 'active' : ''}`} onClick={() => setScoringMode('my_team')}>
            🟢 My Team Only
          </span>
          <span className={`mode-option ${scoringMode === 'both' ? 'active' : ''}`} onClick={() => setScoringMode('both')}>
            🟡 Both Teams
          </span>
        </div>
      </div>
      
      {/* Player of the Match - Will be selected after match completion */}
      <div className="potm-section">
        <label>🏆 Player of the Match</label>
        <div className="potm-placeholder">
          {playerOfTheMatch.away || playerOfTheMatch.home ? (
            <div className="potm-selected">
              <span className="potm-name">
                {playerOfTheMatch.away ? playerNames[playerOfTheMatch.away] : playerNames[playerOfTheMatch.home]}
              </span>
              <span className="potm-badge">✓ Selected</span>
            </div>
          ) : (
            <div className="potm-waiting">
              <span>Will be selected when match is completed</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Games by Round */}
      <div className="games-container">
        {[1, 2, 3, 4].map(round => (
          <div key={round} className="round-section">
            <h3>Round {round}</h3>
            <div className="games-grid">
              {rotationOrder.filter(game => game.round === round).map(game => {
                const homePlayer = homeLineup[game.homeIdx];
                const awayPlayer = awayLineup[game.awayIdx];
                const existingGame = match.games?.find(g => g.gameId === game.gameId);
                const isCompleted = existingGame?.completed;
                const winner = existingGame?.winner;
                
                const isUserWinner = winner && ((winner === 'home' && userTeam === 'home') || (winner === 'away' && userTeam === 'away'));
                const isUserLoser = winner && !isUserWinner;
                
                return (
                  <div 
  key={`${game.gameId}-${existingGame?.winner || 'pending'}`}
  className={`game-card ${isCompleted ? 'completed' : ''} ${isUserWinner ? 'user-win' : isUserLoser ? 'user-loss' : ''} ${existingGame?.isForfeit ? 'forfeit-game' : ''}`}
  onClick={() => {
    if (existingGame?.isForfeit) {
      alert('This game was forfeited due to missing player and cannot be scored.');
      return;
    }
    openScoringModal({ ...game, homePlayer, awayPlayer, existingGame });
  }}
>
  <div className="game-label">{game.label}</div>
  
  <div className="game-players">
    {existingGame?.isForfeit ? (
      <div className="forfeit-message">
        {existingGame.winner === 'home' ? (
          <span className="forfeit-text">🏆 Home Won by Forfeit</span>
        ) : existingGame.winner === 'away' ? (
          <span className="forfeit-text">🏆 Away Won by Forfeit</span>
        ) : (
          <span className="forfeit-text">⚡ FORFEITED MATCH</span>
        )}
      </div>
    ) : (
      <>
        <span className={!homePlayer ? 'missing-player' : ''}>
          {homePlayer ? playerNames[homePlayer.id] : '—'}
        </span>
        <span className="vs">vs</span>
        <span className={!awayPlayer ? 'missing-player' : ''}>
          {awayPlayer ? playerNames[awayPlayer.id] : '—'}
        </span>
      </>
    )}
  </div>
  
  {isCompleted && !existingGame?.isForfeit && (
    <div className="game-result">
      {isUserWinner ? 'WIN' : isUserLoser ? 'LOSS' : ''}
    </div>
  )}
  
  {existingGame?.isForfeit && (
    <div className="game-result forfeit-badge">
      {existingGame.winner === 'home' ? 'Won by Forfeit' : existingGame.winner === 'away' ? 'Won by Forfeit' : 'Forfeit'}
    </div>
  )}
</div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
            {/* Submit Match Button */}
<div className="submit-match-section">
  <button 
    className="btn-submit-match"
    onClick={() => {
      if (completedGames !== totalGames) {
        alert(`Please complete all ${totalGames} games first. ${completedGames} completed, ${totalGames - completedGames} remaining.`);
        return;
      }
      
      // Check who submitted based on selectedBy field
const homeSubmittedBy = match?.playerOfTheMatch?.home?.selectedBy;
const awaySubmittedBy = match?.playerOfTheMatch?.away?.selectedBy;

// A team has submitted if their selectedBy matches their team
const hasHomeTeamSubmitted = homeSubmittedBy === 'home';
const hasAwayTeamSubmitted = awaySubmittedBy === 'away';

// For display: does each player slot have a selection?
const hasHomePlayerSelected = !!match?.playerOfTheMatch?.home;
const hasAwayPlayerSelected = !!match?.playerOfTheMatch?.away;

const hasCurrentTeamSubmitted = userTeam === 'home' ? hasHomeTeamSubmitted : hasAwayTeamSubmitted;
const hasOpponentSubmitted = userTeam === 'home' ? hasAwayTeamSubmitted : hasHomeTeamSubmitted;
      
      // DEBUG: Log the values
console.log('🔍 COMPLETE MATCH DEBUG:');
console.log('  userTeam:', userTeam);
console.log('  homeSubmittedBy:', homeSubmittedBy);
console.log('  awaySubmittedBy:', awaySubmittedBy);
console.log('  hasHomeTeamSubmitted:', hasHomeTeamSubmitted);
console.log('  hasAwayTeamSubmitted:', hasAwayTeamSubmitted);
console.log('  hasHomePlayerSelected:', hasHomePlayerSelected);
console.log('  hasAwayPlayerSelected:', hasAwayPlayerSelected);
console.log('  hasCurrentTeamSubmitted:', hasCurrentTeamSubmitted);
console.log('  hasOpponentSubmitted:', hasOpponentSubmitted);
      
      // Case 1: Both teams have submitted - show summary
if (hasHomeTeamSubmitted && hasAwayTeamSubmitted) {
  console.log('  → Case 1: Both teams submitted, showing summary');
  const homeScore = calculateTeamScore().home;
  const awayScore = calculateTeamScore().away;
  const allPlayers = getAllPlayersWithStats();
  
  setMatchSummary({
    homeScore,
    awayScore,
    winner: homeScore > awayScore ? 'home' : 'away',
    homeTeamName: match.homeTeamName,
    awayTeamName: match.awayTeamName,
    potmHome: match.playerOfTheMatch.home,
    potmAway: match.playerOfTheMatch.away,
    allPlayers
  });
  setShowSummaryModal(true);
}
// Case 2: Current team already submitted, opponent hasn't - show waiting message
else if (hasCurrentTeamSubmitted && !hasOpponentSubmitted) {
  console.log('  → Case 2: Current team already submitted, waiting for opponent');
  setToast({ type: 'info', message: `Waiting for ${userTeam === 'home' ? match.awayTeamName : match.homeTeamName} to select their Player of the Match...` });
}
// Case 3: Current team hasn't submitted - show POTM modal
else if (!hasCurrentTeamSubmitted) {
  console.log('  → Case 3: Current team not submitted, showing POTM modal');
  setShowPotmModal(true);
}
// Fallback
else {
  console.log('  → Fallback: Unexpected state, showing POTM modal');
  setShowPotmModal(true);
}
    }}
  >
    {completedGames === totalGames ? 'Complete Match' : `Complete ${completedGames}/${totalGames} Games`}
  </button>
</div>
      
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {showScoringModal && selectedGame && (
        <GameScoringModal
          game={selectedGame}
          homePlayerName={getFirstName(playerNames[selectedGame.homePlayer?.id] || selectedGame.homePlayer?.name || '')}
          awayPlayerName={getFirstName(playerNames[selectedGame.awayPlayer?.id] || selectedGame.awayPlayer?.name || '')}
          scoringMode={scoringMode}
          userTeam={userTeam}
          existingStats={match?.games?.find(g => g.gameId === selectedGame.gameId)}
          onSave={saveGameResult}
          onClose={() => {
            setShowScoringModal(false);
            setSelectedGame(null);
          }}
        />
      )}

      {/* 🎯 INFO MODAL - Scoring Mode Explanation */}
      {showModeInfoModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowModeInfoModal(false);
          }
        }}>
          <div className="info-modal" onClick={e => e.stopPropagation()}>
            <div className="info-modal-header">
              <h3>💡 Scoring Modes Explained</h3>
              <button 
                className="close-btn" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowModeInfoModal(false);
                }}
              >✕</button>
            </div>
            <div className="info-modal-body">
              <div className="info-mode">
                <div className="info-mode-title">🟢 My Team Only</div>
                <p>Only score for your own team. The other team's scores will be entered separately by their players. Use this if you're only responsible for your team's scores.</p>
              </div>
              <div className="info-mode">
                <div className="info-mode-title">🟡 Both Teams</div>
                <p>Score for both teams at once. Use this if you're the official scorekeeper for the entire match and need to enter scores for both sides.</p>
              </div>
            </div>
            <div className="info-modal-footer">
              <button className="btn-primary" onClick={() => setShowModeInfoModal(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}

           {/* 🎯 POTM MODAL - Player of the Match Selection */}
{showPotmModal && (
  isMobile ? (
    // MOBILE: Bottom Sheet Modal with Stacked Stats
    <div className="bottom-sheet-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) {
        setShowPotmModal(false);
        setTempPotmSelection(null);
      }
    }}>
      <div 
  className="bottom-sheet" 
  onClick={e => e.stopPropagation()}
  onTouchStart={handleTouchStart}
  onTouchMove={(e) => handleTouchMove(e, () => setShowPotmModal(false))}
  onTouchEnd={handleTouchEnd}
>
        
        <div className="bottom-sheet-header">
          <h2>🏆 Player of the Match</h2>
          <p className="bottom-sheet-subtitle">
            Select from {userTeam === 'home' ? match.awayTeamName : match.homeTeamName}
          </p>
        </div>
        
        <div className="bottom-sheet-content">
          {getOpposingTeamPlayersWithStats()
            .sort((a, b) => {
              if (a.stats.points !== b.stats.points) return b.stats.points - a.stats.points;
              if (a.stats.average !== b.stats.average) return b.stats.average - a.stats.average;
              if (a.stats.tons !== b.stats.tons) return b.stats.tons - a.stats.tons;
              if (a.stats.oneEighties !== b.stats.oneEighties) return b.stats.oneEighties - a.stats.oneEighties;
              return b.stats.highestCheckout - a.stats.highestCheckout;
            })
            .map(player => {
              const isSelected = tempPotmSelection?.id === player.id;
              return (
                <div 
                  key={player.id} 
                  className={`player-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setTempPotmSelection(player)}
                >
                  <div className="player-card-header">
                  <label className="radio-container">
  <input 
    type="radio" 
    name="potm" 
    checked={isSelected}
    onChange={() => setTempPotmSelection(player)}
  />
  <span className="player-name">{player.name}</span>
</label>
                    {isSelected && <span className="check-badge">✓</span>}
                  </div>
                  <StatGrid stats={player.stats} />
                </div>
              );
            })}
        </div>
        
        <div className="bottom-sheet-actions">
          <button 
            className="btn-secondary"
            onClick={() => {
              const best = getBestPlayer();
              if (best) {
                setTempPotmSelection(best);
                setToast({ type: 'info', message: `${best.name} auto-selected as best player` });
              }
            }}
          >
            ⭐ Auto-select Best
          </button>
          <button 
            className="btn-primary"
            onClick={async () => {
              if (tempPotmSelection) {
                const opposingTeam = userTeam === 'home' ? 'away' : 'home';
                
                try {
                  const matchRef = doc(db, 'matches', matchId);
                  
                  await updateDoc(matchRef, {
                    [`playerOfTheMatch.${opposingTeam}`]: {
                      playerId: tempPotmSelection.id,
                      playerName: tempPotmSelection.name,
                      selectedAt: serverTimestamp(),
                      selectedBy: userTeam,
                      stats: tempPotmSelection.stats
                    }
                  });
                  
                  setShowPotmModal(false);
                  setIsEditMode(false);
                  
                  setToast({ 
                    type: 'success', 
                    message: `${tempPotmSelection.name} selected as ${userTeam === 'home' ? 'Away' : 'Home'} Team's Player of the Match!` 
                  });
                  
                  const homeScore = calculateTeamScore().home;
                  const awayScore = calculateTeamScore().away;
                  const allPlayers = getAllPlayersWithStats();
                  
                  const homeTeamName = match?.homeTeamName || 'Home Team';
                  const awayTeamName = match?.awayTeamName || 'Away Team';
                  
                  const updatedMatch = await getDoc(matchRef);
                  const updatedPotm = updatedMatch.data()?.playerOfTheMatch;
                  
                  setMatchSummary({
                    homeScore,
                    awayScore,
                    winner: homeScore > awayScore ? 'home' : 'away',
                    homeTeamName,
                    awayTeamName,
                    potmHome: updatedPotm?.home,
                    potmAway: updatedPotm?.away,
                    allPlayers
                  });
                  setShowSummaryModal(true);
                  
                } catch (error) {
                  console.error('Error saving POTM:', error);
                  setToast({ type: 'error', message: 'Failed to save selection' });
                }
              } else {
                alert('Please select a player or use auto-select');
              }
            }}
          >
            ✓ Confirm & Submit
          </button>
        </div>
      </div>
    </div>
  ) : (
    // DESKTOP: Original Modal
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) {
        setShowPotmModal(false);
        setTempPotmSelection(null);
      }
    }}>
      <div className="potm-modal" onClick={e => e.stopPropagation()}>
        <div className="potm-modal-header">
          <h2>🏆 Player of the Match</h2>
          <button 
            className="close-btn" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowPotmModal(false);
              setTempPotmSelection(null);
            }}
          >✕</button>
        </div>
        
        {(() => {
          const hasHomeSubmitted = !!match?.playerOfTheMatch?.home;
          const hasAwaySubmitted = !!match?.playerOfTheMatch?.away;
          const hasOpponentSubmitted = userTeam === 'home' ? hasAwaySubmitted : hasHomeSubmitted;
          
          if (hasOpponentSubmitted && !hasHomeSubmitted && !hasAwaySubmitted) {
            return (
              <div className="waiting-banner">
                <span className="waiting-icon">⏳</span>
                <span className="waiting-text">
                  {userTeam === 'home' ? match.awayTeamName : match.homeTeamName} has already selected their Player of the Match. 
                  Please select yours to complete the match.
                </span>
              </div>
            );
          }
          return null;
        })()}
        
        <p className="potm-subtitle">
          Select the best player from the opposing team ({userTeam === 'home' ? (match.awayTeamName || 'Away Team') : (match.homeTeamName || 'Home Team')})
        </p>
        <div className="scroll-hint">
          <span className="hint-icon">←</span> swipe to see more stats <span className="hint-icon">→</span>
        </div>
        
        <div className="potm-table-container">
          <table className="potm-table">
            <thead>
              <tr>
                <th>PLAYER</th>
                <th>PTS</th>
                <th>TONS</th>
                <th>180s</th>
                <th>HIGH C/O</th>
                <th>AVG</th>
              </tr>
            </thead>
            <tbody>
              {getOpposingTeamPlayersWithStats()
                .sort((a, b) => {
                  if (a.stats.points !== b.stats.points) return b.stats.points - a.stats.points;
                  if (a.stats.average !== b.stats.average) return b.stats.average - a.stats.average;
                  if (a.stats.tons !== b.stats.tons) return b.stats.tons - a.stats.tons;
                  if (a.stats.oneEighties !== b.stats.oneEighties) return b.stats.oneEighties - a.stats.oneEighties;
                  return b.stats.highestCheckout - a.stats.highestCheckout;
                })
                .map(player => {
                  const isSelected = tempPotmSelection?.id === player.id;
                  const stats = player.stats;
                  return (
                    <tr key={player.id} className={isSelected ? 'selected' : ''} onClick={() => setTempPotmSelection(player)}>
                      <td>
                        <label className="radio-cell">
                          <input 
                            type="radio" 
                            name="potm" 
                            checked={isSelected}
                            onChange={() => setTempPotmSelection(player)}
                          />
                          <span className="player-name">{player.name}</span>
                        </label>
                      </td>
                      <td className="stat-cell">{stats?.points || 0}</td>
                      <td className="stat-cell">{stats?.tons || 0}</td>
                      <td className="stat-cell">{stats?.oneEighties || 0}</td>
                      <td className={`stat-cell ${stats?.highestCheckout > 0 ? 'highlight-stat' : ''}`}>
                        {stats?.highestCheckout || 0}
                      </td>
                      <td className="stat-cell">{stats?.average || 0}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        
        <div className="potm-selected-summary">
          <h4>✅ Selected Player</h4>
          {tempPotmSelection ? (
            <div className="selected-player-info">
              <strong>{tempPotmSelection.name}</strong>
              <div className="selected-stats">
                {tempPotmSelection.stats?.points} pts • {tempPotmSelection.stats?.tons} tons • 
                {tempPotmSelection.stats?.oneEighties} x 180s • {tempPotmSelection.stats?.highestCheckout} high checkout • 
                {tempPotmSelection.stats?.average} avg
              </div>
            </div>
          ) : (
            <p className="no-selection">No player selected yet. Click on a player above or use auto-select.</p>
          )}
        </div>
        
        <div className="potm-actions">
          <button 
            className="btn-secondary"
            onClick={() => {
              const best = getBestPlayer();
              if (best) {
                setTempPotmSelection(best);
                setToast({ type: 'info', message: `${best.name} auto-selected as best player` });
              }
            }}
          >
            ⭐ Auto-select Best
          </button>
          <button 
            className="btn-primary"
            onClick={async () => {
              if (tempPotmSelection) {
                const opposingTeam = userTeam === 'home' ? 'away' : 'home';
                
                try {
                  const matchRef = doc(db, 'matches', matchId);
                  
                  await updateDoc(matchRef, {
                    [`playerOfTheMatch.${opposingTeam}`]: {
                      playerId: tempPotmSelection.id,
                      playerName: tempPotmSelection.name,
                      selectedAt: serverTimestamp(),
                      selectedBy: userTeam,
                      stats: tempPotmSelection.stats
                    }
                  });
                  
                  setShowPotmModal(false);
                  setIsEditMode(false);
                  
                  setToast({ 
                    type: 'success', 
                    message: `${tempPotmSelection.name} selected as ${userTeam === 'home' ? 'Away' : 'Home'} Team's Player of the Match!` 
                  });
                  
                  const homeScore = calculateTeamScore().home;
                  const awayScore = calculateTeamScore().away;
                  const allPlayers = getAllPlayersWithStats();
                  
                  const homeTeamName = match?.homeTeamName || 'Home Team';
                  const awayTeamName = match?.awayTeamName || 'Away Team';
                  
                  const updatedMatch = await getDoc(matchRef);
                  const updatedPotm = updatedMatch.data()?.playerOfTheMatch;
                  
                  setMatchSummary({
                    homeScore,
                    awayScore,
                    winner: homeScore > awayScore ? 'home' : 'away',
                    homeTeamName,
                    awayTeamName,
                    potmHome: updatedPotm?.home,
                    potmAway: updatedPotm?.away,
                    allPlayers
                  });
                  setShowSummaryModal(true);
                  
                } catch (error) {
                  console.error('Error saving POTM:', error);
                  setToast({ type: 'error', message: 'Failed to save selection' });
                }
              } else {
                alert('Please select a player or use auto-select');
              }
            }}
          >
            ✓ Confirm & Submit
          </button>
        </div>
      </div>
    </div>
  )
)}

      {/* 🎯 SUMMARY MODAL */}
{showSummaryModal && matchSummary && (
  isMobile ? (
    // MOBILE: Bottom Sheet Modal for Summary
    <div className="bottom-sheet-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) {
        setShowSummaryModal(false);
      }
    }}>
      <div 
  className="bottom-sheet summary-sheet" 
  onClick={e => e.stopPropagation()}
  onTouchStart={handleTouchStart}
  onTouchMove={(e) => handleTouchMove(e, () => setShowSummaryModal(false))}
  onTouchEnd={handleTouchEnd}
>
        
        <div className="bottom-sheet-header">
          <h2>🎉 MATCH COMPLETE! 🎉</h2>
        </div>
        
        <div className="bottom-sheet-content summary-content">
          {/* Score Section */}
          <div className="mobile-score-card">
            <div className="mobile-score-row">
              <div className="mobile-team-score">
                <span className="mobile-team-name home">{matchSummary.homeTeamName}</span>
                <span className="mobile-score-value">{matchSummary.homeScore}</span>
              </div>
              <span className="mobile-score-dash">-</span>
              <div className="mobile-team-score">
                <span className="mobile-team-name away">{matchSummary.awayTeamName}</span>
                <span className="mobile-score-value">{matchSummary.awayScore}</span>
              </div>
            </div>
            <div className="mobile-winner-badge">
              🏆 WINNER: {matchSummary.winner === 'home' ? matchSummary.homeTeamName : matchSummary.awayTeamName}
            </div>
          </div>
          
          {/* POTM Selections */}
          <div className="mobile-potm-section">
            <h3>🏆 Player of the Match Selections</h3>
            <div className="mobile-potm-card">
              <div className="potm-team-badge home-badge">{matchSummary.homeTeamName}</div>
              <div className="potm-player-details">
                <div className="potm-player-name">{matchSummary.potmHome?.playerName || '⏳ Waiting on opponent...'}</div>
                {matchSummary.potmHome?.stats && <StatGrid stats={matchSummary.potmHome.stats} />}
              </div>
            </div>
            <div className="mobile-potm-card">
              <div className="potm-team-badge away-badge">{matchSummary.awayTeamName}</div>
              <div className="potm-player-details">
                <div className="potm-player-name">{matchSummary.potmAway?.playerName || '⏳ Waiting on opponent...'}</div>
                {matchSummary.potmAway?.stats && <StatGrid stats={matchSummary.potmAway.stats} />}
              </div>
            </div>
          </div>
          
          {/* All Players Ranking */}
          <div className="mobile-ranking-section">
            <h3>📊 All Players (Ranked by Performance)</h3>
            {matchSummary.allPlayers.map((player, index) => (
              <div key={player.id} className="ranking-card">
                <div className="ranking-header">
                  <span className="ranking-number">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                  </span>
                  <span className="ranking-name">{player.name}</span>
                  <span className="ranking-team">{player.team}</span>
                </div>
                <StatGrid stats={player.stats} />
              </div>
            ))}
          </div>
        </div>
        
        <div className="bottom-sheet-actions summary-actions">
          <button 
            className="btn-secondary" 
            onClick={async () => {
              try {
                const matchRef = doc(db, 'matches', matchId);
                
                if (userTeam === 'home') {
                  await updateDoc(matchRef, { 'playerOfTheMatch.away': null });
                  setToast({ type: 'info', message: 'Your POTM selection cleared. Please select again after editing.' });
                } else if (userTeam === 'away') {
                  await updateDoc(matchRef, { 'playerOfTheMatch.home': null });
                  setToast({ type: 'info', message: 'Your POTM selection cleared. Please select again after editing.' });
                }
                
                setIsEditMode(true);
                setShowSummaryModal(false);
                setHasManuallyClosedSummary(true);
                setMatchSummary(null);
                await fetchMatchData();
                
              } catch (error) {
                console.error('Error clearing POTM:', error);
                setToast({ type: 'error', message: 'Failed to clear selection.' });
              }
            }}
          >
            ✏️ Edit Match
          </button>
          <button className="btn-primary" onClick={() => {
            setShowSummaryModal(false);
            navigate('/dashboard');
          }}>
            🏠 Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  ) : (
    // DESKTOP: Original Modal
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) {
        setShowSummaryModal(false);
      }
    }}>
      <div className="summary-modal" onClick={e => e.stopPropagation()}>
        <div className="summary-modal-header">
          <h2>🎉 MATCH COMPLETE! 🎉</h2>
          <button 
            className="close-btn" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowSummaryModal(false);
              setHasManuallyClosedSummary(true);
            }}
          >✕</button>
        </div>
        
        <div className="summary-modal-body">
          {/* Score Section */}
          <div className="summary-score-section">
            <div className="score-row">
              <div className="team-name home">{matchSummary.homeTeamName}</div>
              <div className="score-value">{matchSummary.homeScore}</div>
              <div className="score-dash">-</div>
              <div className="score-value">{matchSummary.awayScore}</div>
              <div className="team-name away">{matchSummary.awayTeamName}</div>
            </div>
            <div className="winner-badge">
              🏆 WINNER: {matchSummary.winner === 'home' ? matchSummary.homeTeamName : matchSummary.awayTeamName}
            </div>
          </div>
          
          {/* POTM Selections */}
          <div className="summary-potm-section">
            <h3>🏆 Player of the Match Selections</h3>
            <div className="potm-selection-card">
              <div className="potm-team">{matchSummary.homeTeamName}</div>
              <div className="potm-player-name">
                {matchSummary.potmHome?.playerName || '⏳ Waiting on opponent...'}
              </div>
              {matchSummary.potmHome?.stats && (
                <div className="potm-stats">
                  {matchSummary.potmHome.stats.points} pts • {matchSummary.potmHome.stats.average} avg • 
                  {matchSummary.potmHome.stats.oneEighties} x 180s • {matchSummary.potmHome.stats.highestCheckout} checkout
                </div>
              )}
            </div>
            <div className="potm-selection-card">
              <div className="potm-team">{matchSummary.awayTeamName}</div>
              <div className="potm-player-name">
                {matchSummary.potmAway?.playerName || '⏳ Waiting on opponent...'}
              </div>
              {matchSummary.potmAway?.stats && (
                <div className="potm-stats">
                  {matchSummary.potmAway.stats.points} pts • {matchSummary.potmAway.stats.average} avg • 
                  {matchSummary.potmAway.stats.oneEighties} x 180s • {matchSummary.potmAway.stats.highestCheckout} checkout
                </div>
              )}
            </div>
          </div>
          
          {/* All Players Table */}
          <div className="summary-players-section">
            <h3>📊 All Players (Ranked by Performance)</h3>
            <div className="scroll-hint">
              <span className="hint-icon">←</span> swipe to see more stats <span className="hint-icon">→</span>
            </div>
            <div className="summary-table-container">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th className="sticky-col rank-col">#</th>
                    <th className="sticky-col player-col">PLAYER</th>
                    <th className="sticky-col team-col">TEAM</th>
                    <th>PTS</th>
                    <th>AVG</th>
                    <th>180s</th>
                    <th>TONS</th>
                    <th>HIGH C/O</th>
                  </tr>
                </thead>
                <tbody>
                  {matchSummary.allPlayers.map((player, index) => (
                    <tr key={player.id}>
                      <td className="sticky-col rank-col">{index + 1}</td>
                      <td className="sticky-col player-col">{player.name}</td>
                      <td className="sticky-col team-col">{player.team}</td>
                      <td>{player.stats.points}</td>
                      <td>{player.stats.average}</td>
                      <td>{player.stats.oneEighties}</td>
                      <td>{player.stats.tons}</td>
                      <td>{player.stats.highestCheckout}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="summary-modal-footer">
          <button 
            className="btn-secondary" 
            onClick={async () => {
              try {
                const matchRef = doc(db, 'matches', matchId);
                
                if (userTeam === 'home') {
                  await updateDoc(matchRef, { 'playerOfTheMatch.away': null });
                  setToast({ type: 'info', message: 'Your POTM selection cleared. Please select again after editing.' });
                } else if (userTeam === 'away') {
                  await updateDoc(matchRef, { 'playerOfTheMatch.home': null });
                  setToast({ type: 'info', message: 'Your POTM selection cleared. Please select again after editing.' });
                }
                
                setShowSummaryModal(false);
                setHasManuallyClosedSummary(true);
                setMatchSummary(null);
                await fetchMatchData();
                setIsEditMode(true);
                
              } catch (error) {
                console.error('Error clearing POTM:', error);
                setToast({ type: 'error', message: 'Failed to clear selection. Please try again.' });
              }
            }}
          >
            ✏️ Edit Match
          </button>
          <button className="btn-primary" onClick={() => {
            setShowSummaryModal(false);
            navigate('/dashboard');
          }}>
            🏠 Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
)}
    </div>
  );
}

export default RoundRobinScoring;