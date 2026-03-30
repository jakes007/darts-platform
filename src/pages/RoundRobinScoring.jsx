import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
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
    // Use season state if available, otherwise default to 2
    const legsPerGame = season?.legsPerGame || 1;
    const points = legsPerGame === 1 ? 1 : 2;
    console.log('🎯 getPointsPerGame - legsPerGame:', legsPerGame, 'points:', points);
    return points;
  };
  
  // Helper function to get first name only
  const getFirstName = (fullName) => {
    if (!fullName) return '';
    return fullName.split(' ')[0];
  };
  
  const calculateTeamScore = () => {
    // Always calculate from games to avoid stale Firestore values
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
  
    console.log('📊 LIVE calculated scores - Home:', homeScore, 'Away:', awayScore);
  
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
        console.log('🔄 onSnapshot received - games with winners:', updatedData.games?.map(g => ({ id: g.gameId, winner: g.winner, isForfeit: g.isForfeit })));
        
        setMatch(prev => {
          // Calculate scores from games if homeScore/awayScore are missing
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
            console.log('📊 Calculated scores from games - Home:', homeScore, 'Away:', awayScore);
          }
          
          return {
            ...prev,
            games: updatedData.games,
            homeScore: homeScore !== undefined ? homeScore : (prev?.homeScore || 0),
            awayScore: awayScore !== undefined ? awayScore : (prev?.awayScore || 0)
          };
        });
      }
    });
    
    return () => unsubscribe();
  }, [matchId]);

  useEffect(() => {
    console.log('🔍 match state changed - homeScore:', match?.homeScore, 'awayScore:', match?.awayScore);
  }, [match?.homeScore, match?.awayScore]);

  const saveGameResult = async (gameData) => {
    console.log('🔍 saveGameResult called with:', gameData);
    setSaving(true);
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      const currentMatch = matchDoc.data();
      
      let updatedGames = [...(currentMatch.games || [])];
      const gameIndex = updatedGames.findIndex(g => g.gameId === selectedGame.gameId);
      
      // Get existing game data if it exists
      const existingGame = gameIndex !== -1 ? updatedGames[gameIndex] : null;
      
      // 🚫 Prevent saving if a winner already exists and trying to change it
      if (existingGame?.winner && existingGame.winner !== gameData.winner && gameData.winner) {
        setToast({ type: 'error', message: `This game already has a winner: ${existingGame.winner === 'home' ? 'Home' : 'Away'} team. Cannot change winner.` });
        setSaving(false);
        setShowScoringModal(false);
        return;
      }
      
      // Determine if game is completed (has a winner)
      const hasWinner = gameData.winner !== null && gameData.winner !== undefined;
      
      // Create the new game object by MERGING with existing data
      const newGame = {
        gameId: selectedGame.gameId,
        round: selectedGame.round,
        gameNumber: selectedGame.gameId,
        homePlayerId: selectedGame.homePlayer.id,
        awayPlayerId: selectedGame.awayPlayer.id,
        
        // Only update fields that were sent, keep existing for fields not sent
        homeStats: gameData.homeStats !== undefined ? gameData.homeStats : (existingGame?.homeStats || {}),
        awayStats: gameData.awayStats !== undefined ? gameData.awayStats : (existingGame?.awayStats || {}),
        homeThrows: gameData.homeThrows !== undefined ? gameData.homeThrows : (existingGame?.homeThrows || []),
        awayThrows: gameData.awayThrows !== undefined ? gameData.awayThrows : (existingGame?.awayThrows || []),
        homeDartsPerThrow: gameData.homeDartsPerThrow !== undefined ? gameData.homeDartsPerThrow : (existingGame?.homeDartsPerThrow || []),
        awayDartsPerThrow: gameData.awayDartsPerThrow !== undefined ? gameData.awayDartsPerThrow : (existingGame?.awayDartsPerThrow || []),
        
        // Winner: use existing winner if already set, otherwise use new winner
        winner: existingGame?.winner || gameData.winner || null,
        notes: gameData.notes !== undefined ? gameData.notes : (existingGame?.notes || ''),
        savedAt: Date.now(),
        homeCompleted: gameData.homeCompleted !== undefined ? gameData.homeCompleted : (existingGame?.homeCompleted || false),
        awayCompleted: gameData.awayCompleted !== undefined ? gameData.awayCompleted : (existingGame?.awayCompleted || false),
        
        // ✅ IMPORTANT: Set completed flag based on winner
        completed: hasWinner || (existingGame?.completed || false)
      };
      
      // Update the games array
      if (gameIndex !== -1) {
        updatedGames[gameIndex] = newGame;
      } else {
        updatedGames.push(newGame);
      }
      
      // ✅ FIXED: Calculate team scores based on winner
      let homeScore = 0;
let awayScore = 0;
const pointsPerGame = getPointsPerGame();

updatedGames.forEach(game => {
  if (game.winner) {
    if (game.winner === 'home') homeScore += pointsPerGame;
    else if (game.winner === 'away') awayScore += pointsPerGame;
  }
  // Forfeit games already have winner set, so they're counted above
});

console.log('🏆 Calculated scores - Home:', homeScore, 'Away:', awayScore);
      
      // Update Firestore
      await updateDoc(matchRef, {
        games: updatedGames,
        homeScore: homeScore,
        awayScore: awayScore
      });
      
      // Update local state immediately
      setMatch(prev => ({
        ...prev,
        games: updatedGames,
        homeScore: homeScore,
        awayScore: awayScore
      }));
      
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
            {match?.homeTeamName} vs {match?.awayTeamName}
          </h1>
        </div>
      </div>
      
      {/* Match Info */}
      <div className="match-info-card-v2">
        {/* Row 1: Team Names */}
        <div className="match-header-row">
          <div className="team-name home-team-name">{match.homeTeamName}</div>
          <div className="vs-center">VS</div>
          <div className="team-name away-team-name">{match.awayTeamName}</div>
        </div>
        
        {/* Row 2: Scores */}
        <div key={`score-${teamScore.home}-${teamScore.away}`} className="match-scores-row">
          <div className="team-score home-score">{teamScore.home}</div>
          <div className="score-dash">-</div>
          <div className="team-score away-score">{teamScore.away}</div>
        </div>
        
        {/* Row 3: Stats */}
        <div className="match-stats-row">
          <span>{completedGames} / {totalGames} games completed</span>
          <span>{pointsPerGame} point{pointsPerGame > 1 ? 's' : ''} per win</span>
        </div>
      </div>
      
      {/* Mode Toggle */}
      <div className="mode-toggle">
        <span className={`mode-option ${scoringMode === 'my_team' ? 'active' : ''}`} onClick={() => setScoringMode('my_team')}>
          🟢 My Team Only
        </span>
        <span className={`mode-option ${scoringMode === 'both' ? 'active' : ''}`} onClick={() => setScoringMode('both')}>
          🟡 Both Teams
        </span>
      </div>
      
      {/* Player of the Match */}
      <div className="potm-section">
        <label>Player of the Match (Opponent's best player):</label>
        <select 
          value={playerOfTheMatch.away || ''}
          onChange={(e) => setPlayerOfTheMatch({ ...playerOfTheMatch, away: e.target.value })}
        >
          <option value="">Select opponent's best player</option>
          {awayLineup.map(player => (
            <option key={player.id} value={player.id}>
              {playerNames[player.id] || player.name}
            </option>
          ))}
        </select>
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
                
                // Determine if the user's team won or lost
                const isUserWinner = winner && ((winner === 'home' && userTeam === 'home') || (winner === 'away' && userTeam === 'away'));
                const isUserLoser = winner && !isUserWinner;
                
                return (
                  <div 
  key={game.gameId} 
  className={`game-card ${isCompleted ? 'completed' : ''} ${isUserWinner ? 'user-win' : isUserLoser ? 'user-loss' : ''} ${existingGame?.isForfeit ? 'forfeit-game' : ''}`}
  onClick={() => {
    // Don't allow opening forfeited games for scoring
    if (existingGame?.isForfeit) {
      alert('This game was forfeited due to missing player and cannot be scored.');
      return;
    }
    openScoringModal({ ...game, homePlayer, awayPlayer, existingGame });
  }}
>
  <div className="game-label">{game.label}</div>
  
  {/* Show player names or forfeit indicator */}
  <div className="game-players">
  {existingGame?.isForfeit ? (
  <div className="forfeit-message">
    {(() => {
      // Determine if this game involves the user's team
      const isUserHome = userTeam === 'home';
      const isUserInThisGame = (existingGame.winner === 'home' && isUserHome) || 
                                (existingGame.winner === 'away' && !isUserHome);
      
      // Check if user's team was the one with the missing player
      const isUserTeamMissing = (existingGame.winner === 'away' && isUserHome) || 
                                 (existingGame.winner === 'home' && !isUserHome);
      
      if (isUserInThisGame) {
        // User's team won by forfeit
        return <span className="forfeit-text win-text">🏆 Forfeit Win</span>;
      } else if (isUserTeamMissing) {
        // User's team lost by forfeit (had missing player)
        return <span className="forfeit-text loss-text">❌ Forfeit Loss</span>;
      } else {
        // User not involved in this game (shouldn't happen in round robin)
        return <span className="forfeit-text">⚡ Forfeit</span>;
      }
    })()}
  </div>
) : (
      <>
        <span className={!homePlayer ? 'missing-player' : ''}>
          {homePlayer ? playerNames[homePlayer.id] : '— FORFEITED —'}
        </span>
        <span className="vs">vs</span>
        <span className={!awayPlayer ? 'missing-player' : ''}>
          {awayPlayer ? playerNames[awayPlayer.id] : '— FORFEITED —'}
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
      {(() => {
        const isUserHome = userTeam === 'home';
        const isUserInThisGame = (existingGame.winner === 'home' && isUserHome) || 
                                  (existingGame.winner === 'away' && !isUserHome);
        const isUserTeamMissing = (existingGame.winner === 'away' && isUserHome) || 
                                   (existingGame.winner === 'home' && !isUserHome);
        
        if (isUserInThisGame) {
          return 'WIN';
        } else if (isUserTeamMissing) {
          return 'LOSS';
        } else {
          return 'Forfeit';
        }
      })()}
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
            if (completedGames === totalGames) {
              alert('Match complete! Submitting results...');
            } else {
              alert(`Please complete all ${totalGames} games first. ${completedGames} completed, ${totalGames - completedGames} remaining.`);
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
    </div>
  );
}

export default RoundRobinScoring;