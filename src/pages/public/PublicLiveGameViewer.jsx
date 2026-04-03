import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import './PublicLiveGameViewer.css';

function PublicLiveGameViewer() {
  const { matchId, gameId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (!matchId || !gameId) return;

    const unsubscribe = onSnapshot(doc(db, 'matches', matchId), (docSnap) => {
      if (docSnap.exists()) {
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
          
          const homeThrows = foundGame.homeThrows || [];
          const awayThrows = foundGame.awayThrows || [];
          
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
          
          setHomeRemaining(homeCurrentRemaining);
          setAwayRemaining(awayCurrentRemaining);
          setThrows(throwsArray);
          
          const lastHomeThrow = homeThrows.length;
          const lastAwayThrow = awayThrows.length;
          
          if (lastHomeThrow === lastAwayThrow) {
            setCurrentTurn('home');
            setCurrentRow(lastHomeThrow);
          } else {
            setCurrentTurn('away');
            setCurrentRow(lastAwayThrow);
          }
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [matchId, gameId]);

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
                      <svg className="spinner" viewBox="0 0 24 24" width="28" height="28">
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
                      <svg className="spinner" viewBox="0 0 24 24" width="28" height="28">
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
          <div className="remaining-block home-remaining">
            <div className="remaining-number">{homeRemaining}</div>
          </div>
          <div className="remaining-block away-remaining">
            <div className="remaining-number">{awayRemaining}</div>
          </div>
        </div>
        
        <div className="action-buttons">
          <div className="share-container">
            <button className="share-btn" onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Link copied to clipboard!');
            }}>Share</button>
          </div>
          <div className="nav-container">
            <button className="back-btn" onClick={() => navigate(-1)}>Back</button>
            <button className="close-btn" onClick={() => navigate('/')}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PublicLiveGameViewer;