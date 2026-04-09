import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import './GameSelection.css';

function GameSelection() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [teamNames, setTeamNames] = useState({ home: '', away: '' });
  
  // Rotation order for 4-a-side (16 games) - MUST MATCH RoundRobinScoring.jsx
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

  // Fetch team names
  const fetchTeamNames = async (homeTeamId, awayTeamId) => {
    try {
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      const teamsMap = {};
      teamsSnapshot.forEach(doc => {
        teamsMap[doc.id] = doc.data();
      });
      
      setTeamNames({
        home: teamsMap[homeTeamId]?.name || homeTeamId,
        away: teamsMap[awayTeamId]?.name || awayTeamId
      });
    } catch (error) {
      console.error('Error fetching team names:', error);
    }
  };

  // Calculate average from throws
  const calculateAverage = (throws, dartsPerThrow) => {
    if (!throws || throws.length === 0) return 0;
    const totalScore = throws.reduce((a, b) => a + b, 0);
    const totalDarts = dartsPerThrow?.reduce((a, b) => a + b, 0) || throws.length * 3;
    return totalDarts > 0 ? ((totalScore / totalDarts) * 3).toFixed(1) : 0;
  };

  const openSummaryModal = (game) => {
    setSelectedGame(game);
    setShowSummaryModal(true);
  };

  const closeSummaryModal = () => {
    setShowSummaryModal(false);
    setSelectedGame(null);
  };


  useEffect(() => {
    if (!matchId) return;

    const unsubscribe = onSnapshot(doc(db, 'matches', matchId), async (docSnap) => {
      if (docSnap.exists()) {
        const matchData = { id: docSnap.id, ...docSnap.data() };
        
        // Fetch team names if not already in match data
        if (matchData.homeTeamId && matchData.awayTeamId) {
          await fetchTeamNames(matchData.homeTeamId, matchData.awayTeamId);
        }
        
        setMatch(matchData);

        // Process games
        const homeLineup = matchData.homeTeam?.lineup?.starting || [];
        const awayLineup = matchData.awayTeam?.lineup?.starting || [];
        
        const matchGames = matchData.games || [];
        const gamesMap = {};
        matchGames.forEach(game => {
          gamesMap[game.gameId] = game;
        });
        
        const processedGames = [];
        
        for (let i = 1; i <= 16; i++) {
          const existingGame = gamesMap[i];
          // Get the correct rotation from the rotationOrder array
          const rotation = rotationOrder.find(r => r.gameId === i);
          
          // Safety check - skip if no rotation found
          if (!rotation) {
            console.warn(`No rotation found for game ${i}`);
            continue;
          }
          
          const homeIdx = rotation.homeIdx;
          const awayIdx = rotation.awayIdx;
          
          const homePlayer = homeLineup[homeIdx];
          const awayPlayer = awayLineup[awayIdx];
          
          if (homePlayer && awayPlayer) {
            const hasStarted = existingGame?.homeThrows?.length > 0 || 
            existingGame?.awayThrows?.length > 0 ||
            existingGame?.completed ||
            existingGame?.gameStatus === 'in_progress';

            const isComplete = existingGame?.winner !== undefined && existingGame?.winner !== null;

            let gameStatus = 'upcoming';
            if (isComplete) {
              gameStatus = 'completed';
            } else if (hasStarted) {
              gameStatus = 'live';
            } else {
              gameStatus = 'upcoming';
            }
            
            // Calculate averages from throws
            const homeAverage = calculateAverage(existingGame?.homeThrows, existingGame?.homeDartsPerThrow);
            const awayAverage = calculateAverage(existingGame?.awayThrows, existingGame?.awayDartsPerThrow);
            
            // Get player stats for summary
            const homeStats = existingGame?.homeStats || {};
            const awayStats = existingGame?.awayStats || {};
            
            processedGames.push({
              gameId: i,
              homePlayer: homePlayer,
              awayPlayer: awayPlayer,
              homeScore: existingGame?.homeThrows?.reduce((a, b) => a + b, 0) || 0,
              awayScore: existingGame?.awayThrows?.reduce((a, b) => a + b, 0) || 0,
              winner: existingGame?.winner,
              status: gameStatus,
              hasStarted: hasStarted,
              isComplete: isComplete,
              homeStats: {
                average: parseFloat(homeAverage),
                oneEighties: homeStats.oneEighty || 0,
                tons: homeStats.tonPlus || 0,
                highestCheckout: homeStats.highCheckout || 0,
                dartsUsed: homeStats.dartsUsed || 0
              },
              awayStats: {
                average: parseFloat(awayAverage),
                oneEighties: awayStats.oneEighty || 0,
                tons: awayStats.tonPlus || 0,
                highestCheckout: awayStats.highCheckout || 0,
                dartsUsed: awayStats.dartsUsed || 0
              }
            });
          }
        }
        
        setGames(processedGames);

       
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [matchId]);

  if (loading) {
    return (
      <div className="game-selection-container">
        <div className="loading-state">
          <p>Loading games...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="game-selection-container">
        <div className="error-state">
          <p>Match not found</p>
          <button onClick={() => navigate('/results')}>Back</button>
        </div>
      </div>
    );
  }

  const liveGames = games.filter(g => g.status === 'live');
  const completedGames = games.filter(g => g.status === 'completed');
  const upcomingGames = games.filter(g => g.status === 'upcoming');

  return (
    <div className="game-selection-container">
      {/* Header with back button on far left */}
      <div className="game-selection-header">
        <button className="back-btn" onClick={() => navigate('/results')}>
          ← Back
        </button>
        <h1>{teamNames.home} vs {teamNames.away}</h1>
        <p className="subtitle">Select a game to watch</p>
      </div>

      {/* LIVE GAMES */}
      {liveGames.length > 0 && (
        <div className="games-section">
          <h2 className="section-title live-title">🔴 LIVE GAMES ({liveGames.length})</h2>
          <div className="games-list">
            {liveGames.map(game => (
              <div key={game.gameId} className="game-card live-card">
                <div className="game-number desktop-only">GAME {game.gameId}</div>
                <div className="game-players">
                  <span className="player-name">{game.homePlayer?.name}</span>
                  <span className="vs">vs</span>
                  <span className="player-name">{game.awayPlayer?.name}</span>
                </div>
                <button 
                  className="watch-live-btn"
                  onClick={() => navigate(`/live-match/${matchId}/game/${game.gameId}`)}
                >
                  WATCH LIVE
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPLETED GAMES */}
      {completedGames.length > 0 && (
        <div className="games-section">
          <h2 className="section-title completed-title">✅ COMPLETED GAMES ({completedGames.length})</h2>
          <div className="games-list">
            {completedGames.map(game => (
              <div key={game.gameId} className="game-card completed-card">
                <div className="game-number desktop-only">GAME {game.gameId}</div>
                <div className="game-players">
                  <span className="player-name">{game.homePlayer?.name}</span>
                  <span className="vs">vs</span>
                  <span className="player-name">{game.awayPlayer?.name}</span>
                </div>
                <div className="final-score">
                  Winner: {game.winner === 'home' ? game.homePlayer?.name : game.awayPlayer?.name}
                </div>
                <button 
                  className="view-summary-btn"
                  onClick={() => openSummaryModal(game)}
                >
                  VIEW SUMMARY
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UPCOMING GAMES */}
      {upcomingGames.length > 0 && (
        <div className="games-section">
          <h2 className="section-title upcoming-title">📅 UPCOMING GAMES ({upcomingGames.length})</h2>
          <div className="games-list">
            {upcomingGames.slice(0, 5).map(game => (
              <div key={game.gameId} className="game-card upcoming-card">
                <div className="game-number desktop-only">GAME {game.gameId}</div>
                <div className="game-players">
                  <span className="player-name">{game.homePlayer?.name}</span>
                  <span className="vs">vs</span>
                  <span className="player-name">{game.awayPlayer?.name}</span>
                </div>
                <button className="not-started-btn" disabled>
                  NOT STARTED YET
                </button>
              </div>
            ))}
            {upcomingGames.length > 5 && (
              <div className="more-games">
                + {upcomingGames.length - 5} more games
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUMMARY MODAL */}
      {showSummaryModal && selectedGame && (
        <div className="modal-overlay" onClick={closeSummaryModal}>
          <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="summary-modal-header">
              <h3>Game {selectedGame.gameId} Summary</h3>
              <button className="close-modal" onClick={closeSummaryModal}>✕</button>
            </div>
            <div className="summary-modal-body">
              <div className="summary-players">
                <div className="summary-player home">
                  <h4>{selectedGame.homePlayer?.name}</h4>
                  <div className="stats-list">
                    <div className="stat-row">
                      <span className="stat-label">Average:</span>
                      <span className="stat-value">{selectedGame.homeStats.average}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">180s:</span>
                      <span className="stat-value">{selectedGame.homeStats.oneEighties}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">100+:</span>
                      <span className="stat-value">{selectedGame.homeStats.tons}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Highest C/O:</span>
                      <span className="stat-value">{selectedGame.homeStats.highestCheckout}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Darts Used:</span>
                      <span className="stat-value">{selectedGame.homeStats.dartsUsed}</span>
                    </div>
                  </div>
                </div>
                <div className="vs-divider">VS</div>
                <div className="summary-player away">
                  <h4>{selectedGame.awayPlayer?.name}</h4>
                  <div className="stats-list">
                    <div className="stat-row">
                      <span className="stat-label">Average:</span>
                      <span className="stat-value">{selectedGame.awayStats.average}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">180s:</span>
                      <span className="stat-value">{selectedGame.awayStats.oneEighties}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">100+:</span>
                      <span className="stat-value">{selectedGame.awayStats.tons}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Highest C/O:</span>
                      <span className="stat-value">{selectedGame.awayStats.highestCheckout}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Darts Used:</span>
                      <span className="stat-value">{selectedGame.awayStats.dartsUsed}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="winner-info">
                Winner: {selectedGame.winner === 'home' ? selectedGame.homePlayer?.name : selectedGame.awayPlayer?.name}
              </div>
            </div>
            <div className="summary-modal-footer">
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
}

export default GameSelection;