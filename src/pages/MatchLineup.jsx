import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUserView } from '../context/UserViewContext';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import './MatchLineup.css';

function MatchLineup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentViewingUser } = useUserView();
  
  const [match, setMatch] = useState(null);
  const [season, setSeason] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Lineup state
  const [lineup, setLineup] = useState({});
  const [substitutes, setSubstitutes] = useState([]);
  const [isOurTeam, setIsOurTeam] = useState(false);
  const [ourTeamData, setOurTeamData] = useState(null);
  const [opponentTeamData, setOpponentTeamData] = useState(null);
  const [teamNames, setTeamNames] = useState({ home: '', away: '' });
  
  // UI state
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockDetails, setUnlockDetails] = useState('');
  const [unlockType, setUnlockType] = useState('correction');
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // Helper function to get team players (roster first, then fallback to team assignment)
const getTeamPlayers = async (teamId, seasonId, memberId) => {
  let players = [];
  const playerMap = new Map(); // Use Map to avoid duplicates
  
  console.log('Getting players for:', { teamId, seasonId }); // Debug log
  
  // METHOD 1: Try to get from season roster first (most accurate)
  if (seasonId && teamId) {
    try {
      // First, get the team document to find its clubId
      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      if (!teamDoc.exists()) {
        console.log('Team not found:', teamId);
        return [];
      }
      
      const teamData = teamDoc.data();
      console.log('Team data:', teamData);
      
      // Now query rosters subcollection under the season
      const rosterRef = collection(db, 'seasons', seasonId, 'rosters');
      const rosterQuery = query(rosterRef, where('teamId', '==', teamId));
      const rosterSnapshot = await getDocs(rosterQuery);
      
      console.log('Roster snapshot empty?', rosterSnapshot.empty);
      
      if (!rosterSnapshot.empty) {
        const rosterData = rosterSnapshot.docs[0].data();
        const memberIds = rosterData.memberIds || [];
        
        console.log('Found roster memberIds:', memberIds);
        
        // Get member details
        for (const id of memberIds) {
          if (!playerMap.has(id)) {
            const memberDoc = await getDoc(doc(db, 'members', id));
            if (memberDoc.exists()) {
              const memberData = memberDoc.data();
              console.log('Found roster member:', memberData.surname);
              playerMap.set(id, {
                id: memberDoc.id,
                name: `${memberData.surname || ''}, ${memberData.firstNames || ''}`.trim(),
                ...memberData
              });
            }
          }
        }
        
        console.log('Found players from season roster:', playerMap.size);
      } else {
        console.log('No roster found for this team in season');
      }
    } catch (error) {
      console.error('Error fetching roster:', error);
    }
  }
  
  // METHOD 2: Also get team-assigned players (as backup/supplement)
  if (teamId) {
    try {
      console.log('Looking for team-assigned players with teamId:', teamId);
      const membersQuery = query(
        collection(db, 'members'),
        where('teamId', '==', teamId),
        where('status', '==', 'active')
      );
      const membersSnapshot = await getDocs(membersQuery);
      
      console.log('Team-assigned players found:', membersSnapshot.size);
      
      membersSnapshot.forEach(doc => {
        if (!playerMap.has(doc.id)) {
          const memberData = doc.data();
          playerMap.set(doc.id, {
            id: doc.id,
            name: `${memberData.surname || ''}, ${memberData.firstNames || ''}`.trim(),
            ...memberData
          });
        }
      });
      
      console.log('Total players after team assignment:', playerMap.size);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  }
  
  return Array.from(playerMap.values());
};

useEffect(() => {
  const fetchMatchData = async () => {
    if (!currentViewingUser || !id) {
      console.log('Missing data:', { currentViewingUser, id });
      return;
    }
    
    setLoading(true);
    try {
      // DEBUG: Log the current user
      console.log('Current Viewing User:', {
        id: currentViewingUser.id,
        teamId: currentViewingUser.teamId,
        clubId: currentViewingUser.clubId,
        name: `${currentViewingUser.firstNames} ${currentViewingUser.surname}`
      });

      // Get match
      console.log('Fetching match with ID:', id);
      const matchDoc = await getDoc(doc(db, 'matches', id));
      if (!matchDoc.exists()) {
        console.log('Match not found');
        setToast({ type: 'error', message: 'Match not found' });
        return;
      }
      
      const matchData = { id: matchDoc.id, ...matchDoc.data() };
      console.log('Match data:', matchData);
      
      // Get team names
      console.log('Fetching teams:', { homeId: matchData.homeTeamId, awayId: matchData.awayTeamId });
      const [homeTeamDoc, awayTeamDoc] = await Promise.all([
        getDoc(doc(db, 'teams', matchData.homeTeamId)),
        getDoc(doc(db, 'teams', matchData.awayTeamId))
      ]);
      
      const homeTeamName = homeTeamDoc.exists() ? homeTeamDoc.data().name : 'Home Team';
      const awayTeamName = awayTeamDoc.exists() ? awayTeamDoc.data().name : 'Away Team';
      
      console.log('Team names:', { homeTeamName, awayTeamName });
      
      matchData.homeTeamName = homeTeamName;
      matchData.awayTeamName = awayTeamName;
      
      setTeamNames({ home: homeTeamName, away: awayTeamName });
      setMatch(matchData);
      
      /// Get user's member ID
const userMemberId = currentViewingUser?.id;
console.log('User member ID:', userMemberId);

// First, find which team this user belongs to in this season's roster
let userTeamId = null;
let isHome = false;
let isAway = false;

if (matchData.seasonId) {
  console.log('Checking rosters for season:', matchData.seasonId);
  
  // Get all rosters for this season
  const rostersRef = collection(db, 'seasons', matchData.seasonId, 'rosters');
  const rostersSnapshot = await getDocs(rostersRef);
  
  console.log('Found rosters:', rostersSnapshot.size);
  
  // Loop through each roster to find if user is in it
  for (const rosterDoc of rostersSnapshot.docs) {
    const rosterData = rosterDoc.data();
    const memberIds = rosterData.memberIds || [];
    
    // Check if user is in this roster
    if (memberIds.includes(userMemberId)) {
      userTeamId = rosterData.teamId;
      console.log('✅ Found user in roster for team:', userTeamId);
      
      // Check if this team is home or away
      isHome = matchData.homeTeamId === userTeamId;
      isAway = matchData.awayTeamId === userTeamId;
      break;
    }
  }
}

if (!userTeamId || (!isHome && !isAway)) {
  console.log('❌ User not in match - not found in any roster for this season:', { 
    userMemberId, 
    seasonId: matchData.seasonId,
    homeTeam: matchData.homeTeamId,
    awayTeam: matchData.awayTeamId
  });
  setToast({ type: 'error', message: 'You are not part of this match' });
  setLoading(false);
  return;
}

console.log('✅ User is in match:', { isHome, teamId: userTeamId });
setIsOurTeam(isHome);
      
      // Get our team's data
      const ourTeam = isHome ? matchData.homeTeam : matchData.awayTeam;
      const opponentTeam = isHome ? matchData.awayTeam : matchData.homeTeam;
      
      console.log('Our team data:', ourTeam);
      console.log('Opponent team data:', opponentTeam);
      
      setOurTeamData(ourTeam || { submitted: false });
      setOpponentTeamData(opponentTeam || { submitted: false });
      
      // If already submitted, load that data
      if (ourTeam?.submitted) {
        console.log('Loading submitted lineup:', ourTeam.lineup);
        setLineup(ourTeam.lineup || {});
        setSubstitutes(ourTeam.subs || []);
      }
      
      // Get season for match format
      if (matchData.seasonId) {
        console.log('Fetching season:', matchData.seasonId);
        const seasonDoc = await getDoc(doc(db, 'seasons', matchData.seasonId));
        if (seasonDoc.exists()) {
          const seasonData = { id: seasonDoc.id, ...seasonDoc.data() };
          console.log('Season data:', seasonData);
          
          // If no matchFormat, create a default based on season type
          if (!seasonData.matchFormat || seasonData.matchFormat.length === 0) {
            const gameCount = seasonData.type?.includes('6') ? 6 : 
                             seasonData.type?.includes('4') ? 4 : 6;
            
            seasonData.matchFormat = [];
            for (let i = 0; i < gameCount; i++) {
              // Make last game a leg, others singles
              if (i === gameCount - 1) {
                seasonData.matchFormat.push({
                  type: 'leg',
                  startingScore: 1001
                });
              } else {
                seasonData.matchFormat.push({
                  type: 'singles',
                  startingScore: 501
                });
              }
            }
            console.log('Created default matchFormat:', seasonData.matchFormat);
          }
          setSeason(seasonData);
        } else {
          console.log('Season not found');
        }
      }
      
      // Get players for this team (roster first, then fallback)
      console.log('Getting players for team:', { userTeamId, seasonId: matchData.seasonId });
      const players = await getTeamPlayers(userTeamId, matchData.seasonId, userMemberId);
      console.log('Final roster players:', players);
      setRoster(players);
      
    } catch (error) {
      console.error('Error fetching match:', error);
      setToast({ type: 'error', message: 'Failed to load match data' });
    } finally {
      setLoading(false);
    }
  };
  
  fetchMatchData();
}, [id, currentViewingUser]);

  const handlePlayerSelect = (gameIndex, position, playerId) => {
    const player = roster.find(p => p.id === playerId);
    if (!player) return;
    
    setLineup(prev => ({
      ...prev,
      [`game${gameIndex}`]: {
        ...prev[`game${gameIndex}`],
        [position]: player.name,
        [`${position}Id`]: playerId,
        type: season?.matchFormat?.[gameIndex - 1]?.type || 'singles'
      }
    }));
  };

  const handleLegOrderChange = (gameIndex, position, playerId) => {
    const player = roster.find(p => p.id === playerId);
    if (!player) return;
    
    const currentGame = lineup[`game${gameIndex}`] || {};
    const currentOrder = currentGame.order || [];
    const newOrder = [...currentOrder];
    newOrder[position] = player.name;
    
    setLineup(prev => ({
      ...prev,
      [`game${gameIndex}`]: {
        ...prev[`game${gameIndex}`],
        order: newOrder,
        type: 'leg'
      }
    }));
  };

  const handleSubToggle = (playerId) => {
    setSubstitutes(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const teamField = isOurTeam ? 'homeTeam' : 'awayTeam';
      
      await updateDoc(doc(db, 'matches', id), {
        [`${teamField}.lineup`]: lineup,
        [`${teamField}.subs`]: substitutes,
        [`${teamField}.submitted`]: true,
        [`${teamField}.submittedAt`]: serverTimestamp(),
        [`${teamField}.locked`]: true
      });
      
      setToast({ type: 'success', message: 'Lineup submitted successfully!' });
      
      // Refresh match data
      const matchDoc = await getDoc(doc(db, 'matches', id));
      const matchData = { id: matchDoc.id, ...matchDoc.data() };
      
      // Check if both teams have submitted
      if (matchData.homeTeam?.submitted && matchData.awayTeam?.submitted) {
        await updateDoc(doc(db, 'matches', id), {
          lineupsRevealed: true
        });
        setToast({ type: 'success', message: 'Both lineups submitted! Lineups revealed.' });
      }
      
      // Update local state
      setOurTeamData({ ...ourTeamData, submitted: true, lineup, subs: substitutes });
      
    } catch (error) {
      console.error('Error submitting lineup:', error);
      setToast({ type: 'error', message: 'Failed to submit lineup' });
    } finally {
      setSaving(false);
    }
  };

  const handleUnlockRequest = async () => {
    try {
      const teamField = isOurTeam ? 'homeTeam' : 'awayTeam';
      
      const request = {
        id: Date.now().toString(),
        type: unlockType,
        reason: unlockReason,
        details: unlockDetails,
        requestedAt: serverTimestamp(),
        status: 'pending'
      };
      
      await updateDoc(doc(db, 'matches', id), {
        [`${teamField}.unlockRequests`]: arrayUnion(request)
      });
      
      setToast({ type: 'success', message: 'Unlock request sent to admin' });
      setShowUnlockModal(false);
      setUnlockReason('');
      setUnlockDetails('');
      
    } catch (error) {
      console.error('Error requesting unlock:', error);
      setToast({ type: 'error', message: 'Failed to send request' });
    }
  };

  const generateMatchCode = () => {
    if (!match || !season) return 'N/A';
    const seasonCode = season.name.substring(0, 3).toUpperCase();
    const matchIdShort = id.substring(0, 4).toUpperCase();
    return `${seasonCode}-${matchIdShort}`;
  };

  if (loading) {
    return (
      <div className="lineup-loading">
        <div className="loading-spinner"></div>
        <p>Loading match details...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="lineup-error">
        <h2>Match not found</h2>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  // If lineups are revealed, show both teams
  if (match.lineupsRevealed) {
    return (
      <div className="lineup-container">
        <div className="lineup-header">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Back
          </button>
          <h1>Match Lineups</h1>
        </div>

        <div className="match-info-card">
          <h2>{teamNames.home} vs {teamNames.away}</h2>
          <p className="match-date">
            {new Date(match.date).toLocaleDateString('en-ZA', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
          <p className="match-format">{season?.type || 'Match'} · {season?.matchFormat?.length || 6} Games</p>
        </div>

        <div className="lineups-grid">
          {/* Home Team */}
          <div className="team-lineup-card">
            <h3>{teamNames.home}</h3>
            <div className="lineup-games">
              {season?.matchFormat?.map((game, index) => {
                const gameNum = index + 1;
                const gameData = match.homeTeam?.lineup?.[`game${gameNum}`];
                if (!gameData) return null;
                
                return (
                  <div key={gameNum} className="game-item">
                    <span className="game-number">Game {gameNum}</span>
                    <span className="game-type">{game.type}</span>
                    <span className="game-players">
                      {game.type === 'doubles' ? (
                        `${gameData.player1 || ''} & ${gameData.player2 || ''}`
                      ) : game.type === 'leg' ? (
                        gameData.order?.join(' → ') || ''
                      ) : (
                        gameData.player || ''
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            {match.homeTeam?.subs?.length > 0 && (
              <div className="team-subs">
                <h4>Substitutes</h4>
                <div className="subs-list">
                  {match.homeTeam.subs.map(subId => {
                    const player = roster.find(p => p.id === subId);
                    return player ? (
                      <span key={subId} className="sub-badge">{player.name}</span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="team-lineup-card">
            <h3>{teamNames.away}</h3>
            <div className="lineup-games">
              {season?.matchFormat?.map((game, index) => {
                const gameNum = index + 1;
                const gameData = match.awayTeam?.lineup?.[`game${gameNum}`];
                if (!gameData) return null;
                
                return (
                  <div key={gameNum} className="game-item">
                    <span className="game-number">Game {gameNum}</span>
                    <span className="game-type">{game.type}</span>
                    <span className="game-players">
                      {game.type === 'doubles' ? (
                        `${gameData.player1 || ''} & ${gameData.player2 || ''}`
                      ) : game.type === 'leg' ? (
                        gameData.order?.join(' → ') || ''
                      ) : (
                        gameData.player || ''
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            {match.awayTeam?.subs?.length > 0 && (
              <div className="team-subs">
                <h4>Substitutes</h4>
                <div className="subs-list">
                  {match.awayTeam.subs.map(subId => {
                    const player = roster.find(p => p.id === subId);
                    return player ? (
                      <span key={subId} className="sub-badge">{player.name}</span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="start-match-section">
          <button 
            className="btn-start-match"
            onClick={() => navigate(`/match/${id}/live`)}
          >
            Start Match
          </button>
        </div>
      </div>
    );
  }

  // If our team has submitted but opponent hasn't
  if (ourTeamData?.submitted && !match.lineupsRevealed) {
    const opponentSubmitted = isOurTeam 
      ? match.awayTeam?.submitted 
      : match.homeTeam?.submitted;

    return (
      <div className="lineup-container">
        <div className="lineup-header">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Back
          </button>
          <h1>Lineup Submitted</h1>
        </div>

        <div className="match-info-card">
          <h2>{teamNames.home} vs {teamNames.away}</h2>
          <p className="match-date">
            {new Date(match.date).toLocaleDateString('en-ZA', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>

        <div className="submitted-status">
          <div className="status-icon">✓</div>
          <h3>Your lineup has been submitted</h3>
          <p className="submitted-time">
            {new Date().toLocaleString()}
          </p>
        </div>

        <div className="locked-lineup-card">
          <h3>Your Lineup</h3>
          <div className="lineup-games locked">
            {season?.matchFormat?.map((game, index) => {
              const gameNum = index + 1;
              const gameData = lineup[`game${gameNum}`];
              if (!gameData) return null;
              
              return (
                <div key={gameNum} className="game-item locked">
                  <span className="game-number">Game {gameNum}</span>
                  <span className="game-type">{game.type}</span>
                  <span className="game-players">
                    {game.type === 'doubles' ? (
                      `${gameData.player1 || ''} & ${gameData.player2 || ''}`
                    ) : game.type === 'leg' ? (
                      gameData.order?.join(' → ') || ''
                    ) : (
                      gameData.player || ''
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          {substitutes.length > 0 && (
            <div className="team-subs">
              <h4>Substitutes</h4>
              <div className="subs-list">
                {substitutes.map(subId => {
                  const player = roster.find(p => p.id === subId);
                  return player ? (
                    <span key={subId} className="sub-badge">{player.name}</span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>

        <div className="opponent-status-card">
          <h3>Opponent Status</h3>
          {opponentSubmitted ? (
            <div className="status-ready">
              <span className="status-dot green"></span>
              <p>{teamNames.away} has submitted their lineup</p>
              <p className="status-note">Lineups will be revealed once you refresh</p>
            </div>
          ) : (
            <div className="status-waiting">
              <span className="status-dot yellow"></span>
              <p>Waiting for {teamNames.away} to submit...</p>
            </div>
          )}
        </div>

        <div className="match-code-card">
          <h4>Match Code</h4>
          <p className="match-code">{generateMatchCode()}</p>
          <p className="code-hint">Share this with admin if you need to make changes</p>
        </div>

        <div className="need-change-section">
          <p>Need to make a change?</p>
          <button 
            className="btn-request-unlock"
            onClick={() => setShowUnlockModal(true)}
          >
            Request Unlock
          </button>
        </div>

        {/* Unlock Modal */}
        {showUnlockModal && (
          <div className="modal-overlay" onClick={() => setShowUnlockModal(false)}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowUnlockModal(false)}>✕</button>
              <h3>Request Lineup Unlock</h3>
              
              <div className="form-group">
                <label>Type of change</label>
                <select 
                  value={unlockType}
                  onChange={(e) => setUnlockType(e.target.value)}
                >
                  <option value="correction">Correction (wrong player/order)</option>
                  <option value="transfer">Transfer (need player from another team)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Reason</label>
                <select 
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                >
                  <option value="">Select a reason</option>
                  <option value="wrong-player">Wrong player selected</option>
                  <option value="wrong-order">Wrong playing order</option>
                  <option value="injury">Player injury</option>
                  <option value="unavailable">Player unavailable</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Details</label>
                <textarea
                  rows="3"
                  placeholder="Please explain what needs to be changed..."
                  value={unlockDetails}
                  onChange={(e) => setUnlockDetails(e.target.value)}
                />
              </div>

              {unlockType === 'transfer' && (
                <div className="form-group">
                  <label>Select player to transfer</label>
                  <select>
                    <option value="">Choose player</option>
                    <option value="player1">Mike Jones (Guardians 2)</option>
                    <option value="player2">Tom Brown (Guardians 2)</option>
                    <option value="player3">Sam Wilson (Guardians 3)</option>
                  </select>
                  <p className="field-hint">Player must be from another team in your club</p>
                </div>
              )}

              <div className="modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowUnlockModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleUnlockRequest}
                  disabled={!unlockReason || !unlockDetails}
                >
                  Send Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Initial lineup selection (not submitted yet)
  return (
    <div className="lineup-container">
      <div className="lineup-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Back
        </button>
        <h1>Set Your Lineup</h1>
      </div>

      <div className="match-info-card">
        <h2>{teamNames.home} vs {teamNames.away}</h2>
        <p className="match-date">
          {new Date(match.date).toLocaleDateString('en-ZA', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </p>
        <p className="match-format">{season?.type || 'Match'} · {season?.matchFormat?.length || 6} Games</p>
      </div>

      <div className="lineup-builder">
        <h3>Playing Order</h3>
        <p className="builder-hint">Select players in the order they will play</p>
        
        {season?.matchFormat?.map((game, index) => {
          const gameNum = index + 1;
          
          return (
            <div key={gameNum} className="game-builder-card">
              <div className="game-header">
                <span className="game-number">Game {gameNum}</span>
                <span className="game-type">{game.type}</span>
                {game.type === 'leg' && (
                  <span className="game-score">({game.startingScore || 1001})</span>
                )}
              </div>
              
              {game.type === 'doubles' ? (
                <div className="player-selectors">
                  <select 
                    className="player-select"
                    value={lineup[`game${gameNum}`]?.player1Id || ''}
                    onChange={(e) => handlePlayerSelect(gameNum, 'player1', e.target.value)}
                  >
                    <option value="">Select Player 1</option>
                    {roster.map(player => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                  
                  <select 
                    className="player-select"
                    value={lineup[`game${gameNum}`]?.player2Id || ''}
                    onChange={(e) => handlePlayerSelect(gameNum, 'player2', e.target.value)}
                  >
                    <option value="">Select Player 2</option>
                    {roster.map(player => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : game.type === 'leg' ? (
                <div className="leg-order">
                  <p className="leg-hint">Batting order (1st to 6th)</p>
                  {[0,1,2,3,4,5].map(pos => (
                    <select 
                      key={pos}
                      className="player-select leg-select"
                      value={lineup[`game${gameNum}`]?.order?.[pos] || ''}
                      onChange={(e) => handleLegOrderChange(gameNum, pos, e.target.value)}
                    >
                      <option value="">Position {pos + 1}</option>
                      {roster.map(player => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              ) : (
                <select 
                  className="player-select"
                  value={lineup[`game${gameNum}`]?.playerId || ''}
                  onChange={(e) => handlePlayerSelect(gameNum, 'player', e.target.value)}
                >
                  <option value="">Select Player</option>
                  {roster.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}

        <div className="subs-builder-card">
          <h3>Substitutes</h3>
          <p className="subs-hint">Select players who will be on the bench</p>
          
          <div className="subs-selector">
            {roster.map(player => (
              <label key={player.id} className="sub-checkbox">
                <input 
                  type="checkbox"
                  checked={substitutes.includes(player.id)}
                  onChange={() => handleSubToggle(player.id)}
                />
                <span className="player-name">{player.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="submit-section">
          <button 
            className="btn-submit-lineup"
            onClick={handleSubmit}
            disabled={Object.keys(lineup).length < season?.matchFormat?.length || saving}
          >
            {saving ? 'Submitting...' : 'Submit Lineup'}
          </button>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default MatchLineup;