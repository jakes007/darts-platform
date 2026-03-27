import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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
  const [scoringMode, setScoringMode] = useState('my_team'); // 'my_team' or 'both'
  const [playerOfTheMatch, setPlayerOfTheMatch] = useState({ home: null, away: null });
  const [playerNames, setPlayerNames] = useState({});

  const [selectedGame, setSelectedGame] = useState(null);
const [showScoringModal, setShowScoringModal] = useState(false);
  
  // Rotation order for 4-a-side (16 games)
  const rotationOrder = [
    // Round 1
    { gameId: 1, round: 1, homeIdx: 0, awayIdx: 1, label: "1v2" },
    { gameId: 2, round: 1, homeIdx: 1, awayIdx: 0, label: "2v1" },
    { gameId: 3, round: 1, homeIdx: 2, awayIdx: 3, label: "3v4" },
    { gameId: 4, round: 1, homeIdx: 3, awayIdx: 2, label: "4v3" },
    // Round 2
    { gameId: 5, round: 2, homeIdx: 1, awayIdx: 1, label: "2v2" },
    { gameId: 6, round: 2, homeIdx: 0, awayIdx: 3, label: "1v4" },
    { gameId: 7, round: 2, homeIdx: 3, awayIdx: 0, label: "4v1" },
    { gameId: 8, round: 2, homeIdx: 2, awayIdx: 2, label: "3v3" },
    // Round 3
    { gameId: 9, round: 3, homeIdx: 3, awayIdx: 3, label: "4v4" },
    { gameId: 10, round: 3, homeIdx: 0, awayIdx: 0, label: "1v1" },
    { gameId: 11, round: 3, homeIdx: 1, awayIdx: 2, label: "2v3" },
    { gameId: 12, round: 3, homeIdx: 2, awayIdx: 1, label: "3v2" },
    // Round 4
    { gameId: 13, round: 4, homeIdx: 0, awayIdx: 2, label: "1v3" },
    { gameId: 14, round: 4, homeIdx: 1, awayIdx: 3, label: "2v4" },
    { gameId: 15, round: 4, homeIdx: 2, awayIdx: 0, label: "3v1" },
    { gameId: 16, round: 4, homeIdx: 3, awayIdx: 1, label: "4v2" }
  ];

  const [userTeam, setUserTeam] = useState(null); // 'home' or 'away'

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
      
      // Load existing scores if any
      if (matchData.games) {
        // Games already exist
      }
      
    } catch (error) {
      console.error('Error fetching match:', error);
      setToast({ type: 'error', message: 'Failed to load match' });
    } finally {
      setLoading(false);
    }
  };

  const getPointsPerGame = () => {
    const legsPerGame = season?.legsPerGame || 1;
    return legsPerGame === 1 ? 1 : 2;
  };

  const calculateTeamScore = () => {
    // Helper function to get first name only
const getFirstName = (fullName) => {
  if (!fullName) return '';
  return fullName.split(' ')[0];
};
    if (!match?.games) return { home: 0, away: 0 };
    
    let homeScore = 0;
    let awayScore = 0;
    
    match.games.forEach(game => {
      if (game.completed) {
        if (game.winner === 'home') homeScore += getPointsPerGame();
        else if (game.winner === 'away') awayScore += getPointsPerGame();
        else if (game.winner === 'draw') {
          homeScore += 1;
          awayScore += 1;
        }
      }
    });
    
    return { home: homeScore, away: awayScore };
  };

  // 👇 ADD THIS FUNCTION HERE 👇
const getFirstName = (fullName) => {
  if (!fullName) return '';
  return fullName.split(' ')[0];
};

  const openScoringModal = (game) => {
    console.log('🎯 Opening modal for game:', game);  // Add this for debugging
    setSelectedGame(game);
    setShowScoringModal(true);
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

  const saveGameResult = async (gameData) => {
    console.log('🔍 saveGameResult called with:', gameData);
    setSaving(true);
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      const currentMatch = matchDoc.data();
      
      let updatedGames = [...(currentMatch.games || [])];
      const gameIndex = updatedGames.findIndex(g => g.gameId === selectedGame.gameId);
      
      const newGame = {
        gameId: selectedGame.gameId,
        round: selectedGame.round,
        gameNumber: selectedGame.gameId,
        homePlayerId: selectedGame.homePlayer.id,
        awayPlayerId: selectedGame.awayPlayer.id,
        homeStats: gameData.home,
        awayStats: gameData.away,
        homeThrows: gameData.homeThrows || [],
        awayThrows: gameData.awayThrows || [],
        homeDartsPerThrow: gameData.homeDartsPerThrow || [],
        awayDartsPerThrow: gameData.awayDartsPerThrow || [],
        winner: gameData.winner,
        notes: gameData.notes,
        savedAt: Date.now(),  // Add this line
        completed: true
      };
      
      if (gameIndex !== -1) {
        updatedGames[gameIndex] = newGame;
      } else {
        updatedGames.push(newGame);
      }
      
      let homeScore = 0;
      let awayScore = 0;
      updatedGames.forEach(game => {
        if (game.completed) {
          if (game.winner === 'home') homeScore++;
          else if (game.winner === 'away') awayScore++;
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
      
      setToast({ type: 'success', message: 'Game score saved!' });
      setShowScoringModal(false);
      setSelectedGame(null);
      
    } catch (error) {
      console.error('Error saving game:', error);
      setToast({ type: 'error', message: 'Failed to save score' });
    } finally {
      setSaving(false);
    }
  };

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
    <div className="team-name home-team-name">Guardians 1</div>
    <div className="vs-center">VS</div>
    <div className="team-name away-team-name">West Point 1</div>
  </div>
  
  {/* Row 2: Scores */}
  <div className="match-scores-row">
    <div className="team-score home-score">0</div>
    <div className="score-dash">-</div>
    <div className="team-score away-score">0</div>
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
                
                return (
                  <div 
  key={game.gameId} 
  className={`game-card ${isCompleted ? 'completed' : ''} ${winner === 'home' ? 'home-win' : winner === 'away' ? 'away-win' : ''}`}
  onClick={() => openScoringModal({ ...game, homePlayer, awayPlayer, existingGame })}
>
                    <div className="game-label">{game.label}</div>
                    <div className="game-players stacked">
  <span className="home-player">{homePlayer ? playerNames[homePlayer.id] : '—'}</span>
  <span className="vs">vs</span>
  <span className="away-player">{awayPlayer ? playerNames[awayPlayer.id] : '—'}</span>
</div>
{isCompleted && (
  <div className="game-result">
    {winner === 'home' ? 'HOME WIN' : 'AWAY WIN'}
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
              // We'll implement this next
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