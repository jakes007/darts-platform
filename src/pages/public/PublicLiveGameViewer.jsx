import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import './PublicLiveGameViewer.css';

function PublicLiveGameViewer() {
  const { matchId, gameId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState(null);
  const [showGameEndModal, setShowGameEndModal] = useState(false);
  const [gameEndData, setGameEndData] = useState(null);
  const [homePlayer, setHomePlayer] = useState(null);
  const [awayPlayer, setAwayPlayer] = useState(null);
  const [throws, setThrows] = useState([]);
  const [legScore, setLegScore] = useState({ home: 0, away: 0 });
  const [currentTurn, setCurrentTurn] = useState('home');
  const [currentRow, setCurrentRow] = useState(0);
  const [homeRemaining, setHomeRemaining] = useState(501);
  const [awayRemaining, setAwayRemaining] = useState(501);
  
  const scrollContainerRef = useRef(null);
  const activeRowRef = useRef(null);

  // Maximum darts needed for 501 (167 throws of 3 darts each)
  const MAX_ROWS = 167;

  // Generate D/U values (3, 6, 9, 12...)
  const duValues = Array.from({ length: MAX_ROWS }, (_, i) => (i + 1) * 3);

  // Get first name only
  const getFirstName = (fullName) => {
    if (!fullName) return '';
    return fullName.split(' ')[0];
  };

  const handleGameEndContinue = () => {
    setShowGameEndModal(false);
    setGameEndData(null);
  };
  
  const handleBackToFixtures = () => {
    setShowGameEndModal(false);
    setGameEndData(null);
    navigate(`/game-selection/${matchId}`);
  };

  // Check if modal has been shown for this game
  const hasModalBeenShown = () => {
    const key = `game_completed_${matchId}_${gameId}`;
    return localStorage.getItem(key) === 'true';
  };

  const setModalShown = () => {
    const key = `game_completed_${matchId}_${gameId}`;
    localStorage.setItem(key, 'true');
  };

  useEffect(() => {
    if (!matchId || !gameId) return;

    const unsubscribe = onSnapshot(doc(db, 'matches', matchId), async (docSnap) => {
      if (docSnap.exists()) {
        console.log('📡 Live Viewer received update:', new Date().toLocaleTimeString());
        const matchData = { id: docSnap.id, ...docSnap.data() };
        setMatch(matchData);

        const foundGame = matchData.games?.find(g => g.gameId === parseInt(gameId));
        if (foundGame) {
          setGame(foundGame);
          
          const homeLineup = matchData.homeTeam?.lineup?.starting || [];
          const awayLineup = matchData.awayTeam?.lineup?.starting || [];
          
          const homePlayerData = homeLineup.find(p => p.id === foundGame.homePlayerId);
          const awayPlayerData = awayLineup.find(p => p.id === foundGame.awayPlayerId);
          
          setHomePlayer(homePlayerData);
          setAwayPlayer(awayPlayerData);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [matchId, gameId]);

    // Separate useEffect to calculate throws and remaining scores when game changes
    useEffect(() => {
      if (!game) return;
  
      console.log('🔄 Processing game data for game:', game.gameId);
      
      const homeThrows = game.homeThrows || [];
      const awayThrows = game.awayThrows || [];
      
      const throwsArray = [];
      const maxThrows = Math.max(homeThrows.length, awayThrows.length);
      
      for (let i = 0; i < maxThrows; i++) {
        throwsArray.push({
          homeScore: homeThrows[i] || null,
          awayScore: awayThrows[i] || null,
          homeRemaining: null,
          awayRemaining: null
        });
      }
      
      let homeCurrentRemaining = 501;
      let awayCurrentRemaining = 501;
      
      for (let i = 0; i < throwsArray.length; i++) {
        if (throwsArray[i].homeScore) {
          homeCurrentRemaining -= throwsArray[i].homeScore;
          throwsArray[i].homeRemaining = homeCurrentRemaining;
        }
        if (throwsArray[i].awayScore) {
          awayCurrentRemaining -= throwsArray[i].awayScore;
          throwsArray[i].awayRemaining = awayCurrentRemaining;
        }
      }
      
      console.log('🎯 Calculated - Home remaining:', homeCurrentRemaining, 'Away remaining:', awayCurrentRemaining);
      console.log('📊 Throws array length:', throwsArray.length);
      
      setHomeRemaining(homeCurrentRemaining);
      setAwayRemaining(awayCurrentRemaining);
      setThrows(throwsArray);
      
      // Determine current turn
      const gameWinner = game.winner;
      const lastHomeThrow = homeThrows.length;
      const lastAwayThrow = awayThrows.length;
      
      console.log('🔄 Turn - home throws:', lastHomeThrow, 'away throws:', lastAwayThrow, 'winner:', gameWinner);
      
      if (!gameWinner) {
        if (lastHomeThrow === lastAwayThrow) {
          setCurrentTurn('home');
          setCurrentRow(lastHomeThrow);
        } else {
          setCurrentTurn('away');
          setCurrentRow(lastAwayThrow);
        }
      } else {
        setCurrentTurn(null);
        setCurrentRow(Math.max(lastHomeThrow, lastAwayThrow) - 1);
      }
  
      // Check if game was just completed
      const isComplete = gameWinner !== null && gameWinner !== undefined;
      
      if (isComplete && !hasModalBeenShown()) {
        const winnerName = gameWinner === 'home' 
          ? homePlayer?.name 
          : awayPlayer?.name;
        
        const winnerThrows = gameWinner === 'home' ? homeThrows : awayThrows;
        const winnerDartsPerThrow = gameWinner === 'home' 
          ? game.homeDartsPerThrow 
          : game.awayDartsPerThrow;
        const totalDartsUsed = winnerDartsPerThrow?.reduce((sum, d) => sum + d, 0) || 0;
        const finalCheckout = winnerThrows?.[winnerThrows.length - 1] || 0;
        const visits = Math.ceil(totalDartsUsed / 3);
        
        setGameEndData({
          winnerName: winnerName,
          dartsUsed: totalDartsUsed,
          visits: visits,
          checkoutScore: finalCheckout
        });
        setShowGameEndModal(true);
        setModalShown();
      }
    }, [game, homePlayer, awayPlayer]);

  useEffect(() => {
    if (activeRowRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeRow = activeRowRef.current;
      const containerHeight = container.clientHeight;
      const rowTop = activeRow.offsetTop;
      const rowBottom = rowTop + activeRow.clientHeight;
      const scrollBottom = container.scrollTop + containerHeight;
      
      if (scrollBottom - rowBottom < 150) {
        activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentRow]);

  if (loading) {
    return (
      <div className="live-game-container">
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  if (!match || !game) {
    return (
      <div className="live-game-container">
        <div className="error-state">
          <p>Game not found</p>
          <button onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="live-game-container">
      {/* Fixed Top Section */}
      <div className="game-header">
        <div className="back-arrow-container">
          <button className="back-arrow-btn" onClick={() => navigate(-1)}>← Back</button>
        </div>
        
        <div className="player-names-row">
          <div className="home-player-name">{getFirstName(homePlayer?.name)}</div>
          <div className="leg-score">{legScore.home} - {legScore.away}</div>
          <div className="away-player-name">{getFirstName(awayPlayer?.name)}</div>
        </div>
        
        <div className="column-headers">
          <div className="col-scored">SCORED</div>
          <div className="col-togo">TO GO</div>
          <div className="col-du">D/U</div>
          <div className="col-scored">SCORED</div>
          <div className="col-togo">TO GO</div>
        </div>
      </div>

      {/* Scrollable Middle Section */}
      <div className="game-rows-container" ref={scrollContainerRef}>
        <div className="rows-grid">
          {duValues.map((du, index) => {
            const throwData = throws[index];
            const isActiveRow = index === currentRow;
            const isHomeTurn = currentTurn === 'home' && isActiveRow;
            const isAwayTurn = currentTurn === 'away' && isActiveRow;
            
            return (
              <div 
                key={index} 
                className={`game-row ${isActiveRow ? 'active-row' : ''}`}
                ref={isActiveRow ? activeRowRef : null}
              >
                <div className={`cell scored-cell ${isHomeTurn ? 'active-turn' : ''} ${throwData?.homeScore ? 'has-value' : ''}`}>
                  {isHomeTurn ? (
                    <div className="spinner-container">
                      <svg className="spinner" viewBox="0 0 24 24" width="18" height="18">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round">
                          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                        </circle>
                      </svg>
                    </div>
                  ) : (
                    <span className="score-value">{throwData?.homeScore || ''}</span>
                  )}
                </div>
                
                <div className="cell togo-cell">
                  <span className="togo-value">{throwData?.homeRemaining !== undefined ? throwData.homeRemaining : (index === 0 ? 501 : '')}</span>
                </div>
                
                <div className="cell du-cell">
                  <span className="du-value">{du}</span>
                </div>

                <div className={`cell scored-cell ${isAwayTurn ? 'active-turn' : ''} ${throwData?.awayScore ? 'has-value' : ''}`}>
                  {isAwayTurn ? (
                    <div className="spinner-container">
                      <svg className="spinner" viewBox="0 0 24 24" width="18" height="18">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round">
                          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                        </circle>
                      </svg>
                    </div>
                  ) : (
                    <span className="score-value">{throwData?.awayScore || ''}</span>
                  )}
                </div>
                
                <div className="cell togo-cell">
                  <span className="togo-value">{throwData?.awayRemaining !== undefined ? throwData.awayRemaining : (index === 0 ? 501 : '')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed Bottom Section */}
      <div className="game-footer">
        <div className="remaining-blocks">
          <div className={`remaining-block home-remaining ${currentTurn === 'home' ? 'active-turn' : ''}`}>
            <div className="remaining-number">{homeRemaining}</div>
            <div className="remaining-label">REMAINING</div>
          </div>
          <div className={`remaining-block away-remaining ${currentTurn === 'away' ? 'active-turn' : ''}`}>
            <div className="remaining-number">{awayRemaining}</div>
            <div className="remaining-label">REMAINING</div>
          </div>
        </div>
        
        <div className="share-container">
          <button className="share-btn" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
          }}>Share</button>
        </div>
      </div>

      {/* Game End Modal - Simple Popup */}
      {showGameEndModal && gameEndData && (
        <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={handleGameEndContinue}>
          <div className="simple-game-end-modal" onClick={e => e.stopPropagation()}>
            <div className="simple-modal-content">
              <div className="winner-icon"></div>
              <h2 className="winner-name">{gameEndData.winnerName} WON!</h2>
              <button 
                className="back-to-fixtures-btn"
                onClick={handleBackToFixtures}
              >
                ← Back to Fixtures
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PublicLiveGameViewer;