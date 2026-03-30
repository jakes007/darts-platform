import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUserView } from '../context/UserViewContext';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
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
  const [opponentRoster, setOpponentRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [lineup, setLineup] = useState({});
  const [substitutes, setSubstitutes] = useState([]);
  const [isOurTeam, setIsOurTeam] = useState(false);
  const [ourTeamData, setOurTeamData] = useState(null);
  const [teamNames, setTeamNames] = useState({ home: '', away: '' });
  
  // Round Robin specific state
  const [isRoundRobin, setIsRoundRobin] = useState(false);
  const [playersPerTeam, setPlayersPerTeam] = useState(4);
  const [homeStartingPlayers, setHomeStartingPlayers] = useState([]);
  
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockDetails, setUnlockDetails] = useState('');
  const [unlockType, setUnlockType] = useState('correction');
  const [toast, setToast] = useState(null);

  // Helper to get player name from either roster
  const getPlayerName = (playerId) => {
    if (!playerId) return '';
    let player = roster.find(p => p.id === playerId);
    if (player) return player.name;
    player = opponentRoster.find(p => p.id === playerId);
    return player ? player.name : '';
  };

  // Combined roster for display
  const allPlayers = [...roster, ...opponentRoster];
  const getAnyPlayerName = (playerId) => {
    const player = allPlayers.find(p => p.id === playerId);
    return player ? player.name : '';
  };

  const getPointsPerGame = () => {
    const legsPerGame = season?.legsPerGame || 1;
    return legsPerGame === 1 ? 1 : 2;
  };

  // Helper to get display for a game
  const getGameDisplay = (gameData, gameType) => {
    if (!gameData) return '—';
    if (gameType === 'doubles') {
      const player1 = getPlayerName(gameData.player1Id);
      const player2 = getPlayerName(gameData.player2Id);
      return `${player1} & ${player2}`;
    } else if (gameType === 'leg') {
      const names = (gameData.orderIds || []).map(id => getPlayerName(id)).filter(n => n);
      return names.map((name, idx) => (
        <div key={idx} className="leg-player">{idx + 1}. {name}</div>
      ));
    } else {
      const player = getPlayerName(gameData.playerId);
      return player || '—';
    }
  };

  // Get available substitutes for standard matches
  const getAvailableSubstitutes = () => {
    const selectedPlayerIds = new Set();
    
    Object.values(lineup).forEach(game => {
      if (game.type === 'doubles') {
        if (game.player1Id) selectedPlayerIds.add(game.player1Id);
        if (game.player2Id) selectedPlayerIds.add(game.player2Id);
      } else if (game.type === 'leg') {
        (game.orderIds || []).forEach(id => { if (id) selectedPlayerIds.add(id); });
      } else if (game.type === 'singles') {
        if (game.playerId) selectedPlayerIds.add(game.playerId);
      }
    });
    
    return roster.filter(player => !selectedPlayerIds.has(player.id));
  };

  // Get number of players for leg based on season type
  const getLegPlayerCount = () => {
    if (!season) return 4;
    const seasonType = season.type?.toLowerCase() || '';
    if (seasonType === '4-a-side') return 4;
    if (seasonType === '6-a-side') return 6;
    if (seasonType === 'singles') return 1;
    if (seasonType === 'doubles') return 2;
    const match = seasonType.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[0]);
      if (num >= 1 && num <= 12) return num;
    }
    return 4;
  };

  // Standard match handlers
  const handlePlayerSelect = (gameIndex, position, playerId) => {
    if (!playerId) {
      setLineup(prev => {
        const newLineup = { ...prev };
        const currentGame = newLineup[`game${gameIndex}`] || {};
        
        if (position === 'player') {
          delete currentGame.player;
          delete currentGame.playerId;
        } else if (position === 'player1') {
          delete currentGame.player1;
          delete currentGame.player1Id;
        } else if (position === 'player2') {
          delete currentGame.player2;
          delete currentGame.player2Id;
        }
        
        if (Object.keys(currentGame).length === 0 || (currentGame.type && Object.keys(currentGame).length === 1)) {
          delete newLineup[`game${gameIndex}`];
        } else {
          newLineup[`game${gameIndex}`] = currentGame;
        }
        return newLineup;
      });
      return;
    }
    
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
    if (!playerId) {
      setLineup(prev => {
        const newLineup = { ...prev };
        const currentGame = newLineup[`game${gameIndex}`] || {};
        const currentOrder = currentGame.order || [];
        const currentOrderIds = currentGame.orderIds || [];
        const newOrder = [...currentOrder];
        const newOrderIds = [...currentOrderIds];
        
        newOrder[position] = '';
        newOrderIds[position] = '';
        
        const allEmpty = newOrderIds.every(id => !id);
        if (allEmpty) {
          delete newLineup[`game${gameIndex}`];
        } else {
          newLineup[`game${gameIndex}`] = { ...currentGame, order: newOrder, orderIds: newOrderIds, type: 'leg' };
        }
        return newLineup;
      });
      return;
    }
    
    const player = roster.find(p => p.id === playerId);
    if (!player) return;
    
    setLineup(prev => {
      const currentGame = prev[`game${gameIndex}`] || {};
      const currentOrder = currentGame.order || [];
      const currentOrderIds = currentGame.orderIds || [];
      const newOrder = [...currentOrder];
      const newOrderIds = [...currentOrderIds];
      newOrder[position] = player.name;
      newOrderIds[position] = playerId;
      return {
        ...prev,
        [`game${gameIndex}`]: { ...currentGame, order: newOrder, orderIds: newOrderIds, type: 'leg' }
      };
    });
  };

  const handleSubToggle = (playerId) => {
    setSubstitutes(prev => prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]);
  };

  // Standard match submit
  const handleSubmit = async () => {
    setSaving(true);
    try {
      const teamField = isOurTeam ? 'homeTeam' : 'awayTeam';
      const lineupData = {
        ...lineup,
        subs: substitutes
      };
      
      await updateDoc(doc(db, 'matches', id), {
        [`${teamField}.lineup`]: lineupData,
        [`${teamField}.submitted`]: true,
        [`${teamField}.submittedAt`]: serverTimestamp(),
        [`${teamField}.locked`]: true
      });
      
      console.log('💾 Saved to Firestore -', teamField, 'lineup:', lineupData);
      
      setToast({ type: 'success', message: 'Lineup submitted successfully!' });
      setOurTeamData({ ...ourTeamData, submitted: true, lineup: { starting: homeStartingPlayers, subs: substitutes } });
    } catch (error) {
      console.error('Error submitting lineup:', error);
      setToast({ type: 'error', message: 'Failed to submit lineup' });
    } finally {
      setSaving(false);
    }
  };

  const generateRoundRobinGames = (homeLineup, awayLineup) => {
    const games = [];
    let gameNumber = 1;
    
    const rotationOrder = [
      // Round 1
      { homeIdx: 0, awayIdx: 1 },
      { homeIdx: 1, awayIdx: 0 },
      { homeIdx: 2, awayIdx: 3 },
      { homeIdx: 3, awayIdx: 2 },
      // Round 2
      { homeIdx: 1, awayIdx: 1 },
      { homeIdx: 0, awayIdx: 3 },
      { homeIdx: 3, awayIdx: 0 },
      { homeIdx: 2, awayIdx: 2 },
      // Round 3
      { homeIdx: 3, awayIdx: 3 },
      { homeIdx: 0, awayIdx: 0 },
      { homeIdx: 1, awayIdx: 2 },
      { homeIdx: 2, awayIdx: 1 },
      // Round 4
      { homeIdx: 0, awayIdx: 2 },
      { homeIdx: 1, awayIdx: 3 },
      { homeIdx: 2, awayIdx: 0 },
      { homeIdx: 3, awayIdx: 1 }
    ];
    
    for (const order of rotationOrder) {
      // Get player IDs (not objects) from the lineups
      const homePlayerId = homeLineup[order.homeIdx];
      const awayPlayerId = awayLineup[order.awayIdx];
      
      // Check if players exist (not null/undefined)
      const homeExists = homePlayerId !== null && homePlayerId !== undefined;
      const awayExists = awayPlayerId !== null && awayPlayerId !== undefined;
      
      let winner = null;
      let isForfeit = false;
      
      console.log(`🎮 Game ${gameNumber}: homeIdx=${order.homeIdx}, awayIdx=${order.awayIdx}, homeExists=${homeExists}, awayExists=${awayExists}`);
      
      if (!homeExists && awayExists) {
        // Home player missing, away wins automatically
        winner = 'away';
        isForfeit = true;
        console.log(`  → Home player missing, Away wins by forfeit`);
      } else if (homeExists && !awayExists) {
        // Away player missing, home wins automatically
        winner = 'home';
        isForfeit = true;
        console.log(`  → Away player missing, Home wins by forfeit`);
      } else if (!homeExists && !awayExists) {
        // Both players missing - this shouldn't happen in normal play, but handle it
        console.log(`  → Both players missing - game is a draw/no contest`);
      } else {
        console.log(`  → Both players present - game to be played`);
      }
      
      games.push({
        gameId: gameNumber,
        round: Math.ceil(gameNumber / 4),
        gameNumber: gameNumber,
        homePlayerId: homePlayerId || null,
        awayPlayerId: awayPlayerId || null,
        homeStats: isForfeit && winner === 'home' ? {
          tonPlus: 0,
          oneEighty: 0,
          highCheckout: 0,
          scoreLeft: 0,
          dartsUsed: 0,
          isForfeit: true
        } : {
          tonPlus: 0,
          oneEighty: 0,
          highCheckout: 0,
          scoreLeft: 501,
          dartsUsed: 0
        },
        awayStats: isForfeit && winner === 'away' ? {
          tonPlus: 0,
          oneEighty: 0,
          highCheckout: 0,
          scoreLeft: 0,
          dartsUsed: 0,
          isForfeit: true
        } : {
          tonPlus: 0,
          oneEighty: 0,
          highCheckout: 0,
          scoreLeft: 501,
          dartsUsed: 0
        },
        homeThrows: isForfeit && winner === 'home' ? [501] : [],
        awayThrows: isForfeit && winner === 'away' ? [501] : [],
        homeDartsPerThrow: isForfeit && winner === 'home' ? [3] : [],
        awayDartsPerThrow: isForfeit && winner === 'away' ? [3] : [],
        winner: winner,
        notes: isForfeit ? `Automatic win - ${!homeExists ? 'Home' : 'Away'} player missing` : '',
        completed: isForfeit ? true : false,
        isForfeit: isForfeit
      });
      gameNumber++;
    }
    
    console.log('🎮 Generated games with winners:', games.map(g => ({ id: g.gameId, winner: g.winner, isForfeit: g.isForfeit })));
    return games;
  };

  const fixForfeitGames = async (matchId) => {
    try {
      const matchDoc = await getDoc(doc(db, 'matches', matchId));
      const matchData = matchDoc.data();
      
      if (!matchData.games || matchData.games.length === 0) return;
      
      let needsUpdate = false;
      const updatedGames = [...matchData.games];
      let homeScore = 0;
      let awayScore = 0;
      
      // Get points per game
      const seasonDoc = await getDoc(doc(db, 'seasons', matchData.seasonId));
      const legsPerGame = seasonDoc.exists() ? (seasonDoc.data().legsPerGame || 1) : 1;
      const pointsPerGame = legsPerGame === 1 ? 1 : 2;
      
      updatedGames.forEach((game, index) => {
        // If no winner but one player is missing, set forfeit winner
        const homeExists = game.homePlayerId !== null && game.homePlayerId !== undefined;
const awayExists = game.awayPlayerId !== null && game.awayPlayerId !== undefined;

if (!game.winner && homeExists && !awayExists) {
  updatedGames[index] = {
    ...game,
    winner: 'home',
    completed: true,
    isForfeit: true,
    notes: 'Won by forfeit - Away player missing'
  };
  needsUpdate = true;
}

else if (!game.winner && !homeExists && awayExists) {
  updatedGames[index] = {
    ...game,
    winner: 'away',
    completed: true,
    isForfeit: true,
    notes: 'Won by forfeit - Home player missing'
  };
  needsUpdate = true;
}
        
        // Calculate scores
        if (updatedGames[index].winner === 'home') homeScore += pointsPerGame;
        if (updatedGames[index].winner === 'away') awayScore += pointsPerGame;
      });
      
      if (needsUpdate) {
        await updateDoc(doc(db, 'matches', matchId), {
          games: updatedGames,
          homeScore: homeScore,
          awayScore: awayScore
        });
        console.log('🔧 Fixed forfeit games and updated scores - Home:', homeScore, 'Away:', awayScore);
      }
    } catch (error) {
      console.error('Error fixing forfeit games:', error);
    }
  };

  // Round robin lineup submit
  const handleSubmitRoundRobinLineup = async () => {
    setSaving(true);
    try {
      console.log('🏠 homeStartingPlayers:', homeStartingPlayers);
      console.log('👥 substitutes:', substitutes);
      
      const teamField = isOurTeam ? 'homeTeam' : 'awayTeam';
      console.log('📝 Submitting as:', teamField, 'isOurTeam:', isOurTeam);
      
      const lineupData = {
        starting: homeStartingPlayers.map(p => ({ id: p.id, name: p.name })),
        subs: substitutes.map(subId => {
          const player = roster.find(p => p.id === subId);
          return { id: subId, name: player?.name };
        })
      };
      
      console.log('📝 Submitting round robin lineup:', lineupData);
      
      await updateDoc(doc(db, 'matches', id), {
        [`${teamField}.lineup`]: lineupData,
        [`${teamField}.submitted`]: true,
        [`${teamField}.submittedAt`]: serverTimestamp(),
        [`${teamField}.locked`]: true
      });

      setToast({ type: 'success', message: 'Lineup submitted successfully!' });

      const updatedOurTeamData = { 
        ...ourTeamData, 
        submitted: true, 
        lineup: lineupData 
      };
      setOurTeamData(updatedOurTeamData);
      setLineup(lineupData);

      const freshMatchDoc = await getDoc(doc(db, 'matches', id));
      const freshMatch = { id: freshMatchDoc.id, ...freshMatchDoc.data() };
      setMatch(freshMatch);

      setTimeout(async () => {
        const matchDoc = await getDoc(doc(db, 'matches', id));
        const matchData = matchDoc.data();
        
        console.log('🔍 FULL MATCH DATA after submission:', matchData);
        console.log('📊 Both teams status - home:', matchData.homeTeam?.submitted, 'away:', matchData.awayTeam?.submitted);
        
        if (matchData.homeTeam?.submitted && matchData.awayTeam?.submitted) {
          // Get the lineup arrays - these are arrays of player IDs
          const homeLineup = (matchData.homeTeam.lineup.starting || []).map(p => p?.id || null);
          const awayLineup = (matchData.awayTeam.lineup.starting || []).map(p => p?.id || null);
          
          console.log('🏆 Home lineup IDs:', homeLineup);
          console.log('🏆 Away lineup IDs:', awayLineup);
          
          const games = generateRoundRobinGames(homeLineup, awayLineup);
          
          console.log('🎮 Generated games:', games.length);
          
          // Get points per game directly from Firestore
          let pointsPerGame = 2;
          try {
            const seasonDoc = await getDoc(doc(db, 'seasons', matchData.seasonId));
            if (seasonDoc.exists()) {
              const seasonData = seasonDoc.data();
              const legsPerGame = seasonData.legsPerGame || 1;
              pointsPerGame = legsPerGame === 1 ? 1 : 2;
              console.log('🏆 Points per game from Firestore:', pointsPerGame);
            }
          } catch (err) {
            console.error('Error getting season data:', err);
          }
          
          let homeScore = 0;
          let awayScore = 0;
          
          games.forEach(game => {
            if (game.winner) {
              if (game.winner === 'home') {
                homeScore += pointsPerGame;
                console.log(`✅ Game ${game.gameId} - Home wins, homeScore now: ${homeScore}`);
              } else if (game.winner === 'away') {
                awayScore += pointsPerGame;
                console.log(`✅ Game ${game.gameId} - Away wins, awayScore now: ${awayScore}`);
              }
            }
          });
          
          console.log('🏆 FINAL INITIAL SCORES - Home:', homeScore, 'Away:', awayScore);
          
          await updateDoc(doc(db, 'matches', id), {
            games: games,
            homeScore: homeScore,
            awayScore: awayScore,
            lineupsRevealed: true
          });
          
          console.log('💾 Saved to Firestore - homeScore:', homeScore, 'awayScore:', awayScore);
          
          setToast({ type: 'success', message: 'Both lineups submitted! Ready to start match.' });
          navigate(`/match/${id}/lineup`);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error submitting lineup:', error);
      setToast({ type: 'error', message: 'Failed to submit lineup: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleUnlockRequest = async () => {
    try {
      const teamField = isOurTeam ? 'homeTeam' : 'awayTeam';
      await updateDoc(doc(db, 'matches', id), {
        [`${teamField}.unlockRequests`]: arrayUnion({
          id: Date.now().toString(),
          type: unlockType,
          reason: unlockReason,
          details: unlockDetails,
          requestedAt: serverTimestamp(),
          status: 'pending'
        })
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
    return `${season.name.substring(0, 3).toUpperCase()}-${id.substring(0, 4).toUpperCase()}`;
  };

  useEffect(() => {
    console.log('📊 STATE CHANGED - isRoundRobin:', isRoundRobin);
    console.log('📊 playersPerTeam:', playersPerTeam);
  }, [isRoundRobin, playersPerTeam]);

  useEffect(() => {
    if (match?.lineupsRevealed && match?.games && id) {
      console.log('🔧 Checking for forfeit games...');
      fixForfeitGames(id);
    }
  }, [match?.lineupsRevealed, match?.games, id]);

  // Initial fetch
  useEffect(() => {
    const fetchMatchData = async () => {
      if (!currentViewingUser || !id) return;
      setLoading(true);
      try {
        const matchDoc = await getDoc(doc(db, 'matches', id));
        if (!matchDoc.exists()) { setToast({ type: 'error', message: 'Match not found' }); return; }
        
        const matchData = { id: matchDoc.id, ...matchDoc.data() };

        console.log('🔍 MATCH DATA:', matchData);
        console.log('🔍 seasonId:', matchData.seasonId);
        
        const [homeTeamDoc, awayTeamDoc] = await Promise.all([
          getDoc(doc(db, 'teams', matchData.homeTeamId)),
          getDoc(doc(db, 'teams', matchData.awayTeamId))
        ]);
        
        matchData.homeTeamName = homeTeamDoc.exists() ? homeTeamDoc.data().name : 'Home Team';
        matchData.awayTeamName = awayTeamDoc.exists() ? awayTeamDoc.data().name : 'Away Team';
        setTeamNames({ home: matchData.homeTeamName, away: matchData.awayTeamName });
        setMatch(matchData);
        
        const userMemberId = currentViewingUser?.id;
        let userTeamId = null;
        let isHome = false;
        
        if (matchData.seasonId) {
          const rostersRef = collection(db, 'seasons', matchData.seasonId, 'rosters');
          const rostersSnapshot = await getDocs(rostersRef);
          for (const rosterDoc of rostersSnapshot.docs) {
            const rosterData = rosterDoc.data();
            if ((rosterData.memberIds || []).includes(userMemberId)) {
              userTeamId = rosterData.teamId;
              isHome = matchData.homeTeamId === userTeamId;
              break;
            }
          }
        }
        
        if (!userTeamId) {
          setToast({ type: 'error', message: 'You are not part of this match' });
          setLoading(false);
          return;
        }
        
        setIsOurTeam(isHome);
        const ourTeam = isHome ? matchData.homeTeam : matchData.awayTeam;
        setOurTeamData(ourTeam || { submitted: false });
        if (ourTeam?.submitted) {
          setLineup(ourTeam.lineup || {});
          setSubstitutes(ourTeam.subs || []);
          
          console.log('🔍 Waiting screen - ourTeam.lineup:', ourTeam.lineup);
          console.log('🔍 Waiting screen - lineup.starting:', ourTeam.lineup?.starting);
        }
        
        // Get season
        if (matchData.seasonId) {
          const seasonDoc = await getDoc(doc(db, 'seasons', matchData.seasonId));
          if (seasonDoc.exists()) {
            const seasonData = { id: seasonDoc.id, ...seasonDoc.data() };

            console.log('🔍 SEASON DATA:', seasonData);
            console.log('🔍 matchType:', seasonData.matchType);
            console.log('🔍 isRoundRobin?', seasonData.matchType === 'round_robin');
            
            if (seasonData.matchType === 'round_robin') {
              console.log('✅ ROUND ROBIN DETECTED! Setting state...');
              setIsRoundRobin(true);
              setPlayersPerTeam(parseInt(seasonData.type) || 4);
            } else {
              console.log('❌ NOT round robin, matchType:', seasonData.matchType);
            }
            
            if (!seasonData.matchFormat?.length && seasonData.matchType !== 'round_robin') {
              let gameCount = 6;
              if (seasonData.type?.includes('6')) gameCount = 6;
              else if (seasonData.type?.includes('4')) gameCount = 4;
              else if (seasonData.type?.includes('singles')) gameCount = 1;
              else if (seasonData.type?.includes('doubles')) gameCount = 2;
              else {
                const match = seasonData.type?.match(/(\d+)/);
                if (match) {
                  const num = parseInt(match[0]);
                  if (num >= 1 && num <= 12) gameCount = num;
                }
              }
              seasonData.matchFormat = Array(gameCount).fill().map((_, i) => ({ 
                type: i === gameCount - 1 ? 'leg' : 'singles', 
                startingScore: i === gameCount - 1 ? 1001 : 501 
              }));
            }
            setSeason(seasonData);
          }
        }
        
        // Get roster players for our team
        const players = [];
        const playerMap = new Map();
        if (matchData.seasonId && userTeamId) {
          const rosterQuery = query(collection(db, 'seasons', matchData.seasonId, 'rosters'), where('teamId', '==', userTeamId));
          const rosterSnapshot = await getDocs(rosterQuery);
          if (!rosterSnapshot.empty) {
            for (const id of (rosterSnapshot.docs[0].data().memberIds || [])) {
              if (!playerMap.has(id)) {
                const memberDoc = await getDoc(doc(db, 'members', id));
                if (memberDoc.exists()) {
                  const d = memberDoc.data();
                  playerMap.set(id, { id, name: `${d.firstNames || ''} ${d.surname || ''}`.trim() });
                }
              }
            }
          }
        }
        const membersQuery = query(collection(db, 'members'), where('teamId', '==', userTeamId), where('status', '==', 'active'));
        const membersSnapshot = await getDocs(membersQuery);
        membersSnapshot.forEach(doc => {
          if (!playerMap.has(doc.id)) {
            const d = doc.data();
            playerMap.set(doc.id, { id: doc.id, name: `${d.firstNames || ''} ${d.surname || ''}`.trim() });
          }
        });
        setRoster(Array.from(playerMap.values()));
      } catch (error) {
        console.error('Error:', error);
        setToast({ type: 'error', message: 'Failed to load match' });
      } finally { setLoading(false); }
    };
    fetchMatchData();
  }, [id, currentViewingUser]);

  // Real-time listener
  useEffect(() => {
    if (!id) return;
    
    const unsubscribe = onSnapshot(doc(db, 'matches', id), async (docSnap) => {
      if (!docSnap.exists()) return;
      
      const updatedMatch = { id: docSnap.id, ...docSnap.data() };
      
      if (updatedMatch.homeTeamId !== match?.homeTeamId || updatedMatch.awayTeamId !== match?.awayTeamId) {
        const [homeDoc, awayDoc] = await Promise.all([
          getDoc(doc(db, 'teams', updatedMatch.homeTeamId)),
          getDoc(doc(db, 'teams', updatedMatch.awayTeamId))
        ]);
        updatedMatch.homeTeamName = homeDoc.exists() ? homeDoc.data().name : 'Home';
        updatedMatch.awayTeamName = awayDoc.exists() ? awayDoc.data().name : 'Away';
        setTeamNames({ home: updatedMatch.homeTeamName, away: updatedMatch.awayTeamName });
      } else {
        updatedMatch.homeTeamName = teamNames.home;
        updatedMatch.awayTeamName = teamNames.away;
      }
      
      const opponentTeamId = isOurTeam ? updatedMatch.awayTeamId : updatedMatch.homeTeamId;
      const oppMap = new Map();
      
      if (updatedMatch.seasonId && opponentTeamId) {
        try {
          const rosterQuery = query(collection(db, 'seasons', updatedMatch.seasonId, 'rosters'), where('teamId', '==', opponentTeamId));
          const rosterSnapshot = await getDocs(rosterQuery);
          if (!rosterSnapshot.empty) {
            for (const memberId of (rosterSnapshot.docs[0].data().memberIds || [])) {
              if (!oppMap.has(memberId)) {
                const memberDoc = await getDoc(doc(db, 'members', memberId));
                if (memberDoc.exists()) {
                  const d = memberDoc.data();
                  oppMap.set(memberId, { id: memberId, name: `${d.surname || ''}, ${d.firstNames || ''}`.trim() });
                }
              }
            }
          }
        } catch (err) {
          console.error('Error fetching opponent players:', err);
        }
      }
      
      if (oppMap.size > 0) {
        setOpponentRoster(Array.from(oppMap.values()));
      }
      
      if (updatedMatch.lineupsRevealed && !match?.lineupsRevealed) {
        setToast({ type: 'success', message: 'Both teams have submitted! Lineups revealed.' });
      }
      
      const opponentSubmitted = isOurTeam ? updatedMatch.awayTeam?.submitted : updatedMatch.homeTeam?.submitted;
      const wasOpponentSubmitted = isOurTeam ? match?.awayTeam?.submitted : match?.homeTeam?.submitted;
      if (opponentSubmitted && !wasOpponentSubmitted) {
        setToast({ type: 'info', message: 'Opponent has submitted their lineup!' });
      }
      
      setMatch(updatedMatch);
      setOurTeamData(isOurTeam ? updatedMatch.homeTeam : updatedMatch.awayTeam);
    });
    
    return () => unsubscribe();
  }, [id, isOurTeam, match?.lineupsRevealed, match?.awayTeam?.submitted, match?.homeTeam?.submitted, teamNames.home, teamNames.away]);

  if (loading) return <div className="lineup-loading"><div className="loading-spinner"></div><p>Loading...</p></div>;
  if (!match) return <div className="lineup-error"><h2>Match not found</h2><button onClick={() => navigate('/dashboard')}>Back</button></div>;

  // Lineups Revealed
  if (match.lineupsRevealed) {
    console.log('🏆 Lineups Revealed - homeTeam lineup:', match.homeTeam?.lineup);
    console.log('🏆 Lineups Revealed - awayTeam lineup:', match.awayTeam?.lineup);
    
    const isRoundRobinLineup = match.homeTeam?.lineup?.starting && Array.isArray(match.homeTeam?.lineup?.starting);
    
    return (
      <div className="lineup-container">
        <div className="lineup-header" style={{ position: 'relative', width: '100%', minHeight: '50px' }}>
          <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
            <button onClick={() => navigate('/dashboard')} className="back-btn" style={{ background: 'none', border: 'none', color: 'var(--text-gray, #9ca3af)', fontSize: '14px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>← Back</button>
          </div>
          <h1 style={{ textAlign: 'center', margin: 0, fontSize: '1.1rem', color: 'var(--text-white, #ffffff)', padding: '0 60px', lineHeight: '1.2' }}>Match Lineups</h1>
        </div>
        <div className="match-info-card">
          <h2 style={{ textAlign: 'center' }}>{teamNames.home} vs {teamNames.away}</h2>
          <p className="match-date" style={{ textAlign: 'center' }}>{new Date(match.date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="match-format" style={{ textAlign: 'center' }}>{season?.type || 'Match'} · Round Robin · {playersPerTeam}-a-side</p>
        </div>
        <div className="lineups-grid">
          
          {/* HOME TEAM LINEUP */}
          <div className="team-lineup-card">
            <h3>{teamNames.home}</h3>
            
            {isRoundRobinLineup ? (
              <div>
                <div className="lineup-games">
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-gray, #9ca3af)' }}>Starting Players (in order)</h4>
                  {[...Array(playersPerTeam)].map((_, idx) => {
                    const player = match.homeTeam?.lineup?.starting?.[idx];
                    return (
                      <div key={idx} className={`game-item ${!player ? 'missing-player' : ''}`}>
                        <span className="game-number">Player {idx + 1}</span>
                        <div className="game-players" style={{ textAlign: 'center', flex: 1 }}>
                          {player?.name || <span className="missing-text">— Player Missing —</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {match.homeTeam?.lineup?.subs?.length > 0 && (
                  <div className="team-subs">
                    <h4>Substitutes</h4>
                    <div className="subs-list">
                      {match.homeTeam.lineup.subs.map((sub, idx) => (
                        <span key={idx} className="sub-badge">{sub.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="lineup-games">
                {season?.matchFormat?.map((game, i) => {
                  const gd = match.homeTeam?.lineup?.[`game${i+1}`];
                  if (!gd) return null;
                  return (
                    <div key={i} className="game-item">
                      <span className="game-number">Game {i+1}</span>
                      <span className="game-type">{game.type}</span>
                      <div className="game-players">{getGameDisplay(gd, game.type)}</div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {!isRoundRobinLineup && match.homeTeam?.subs?.length > 0 && (
              <div className="team-subs">
                <h4>Substitutes</h4>
                <div className="subs-list">
                  {match.homeTeam.subs.map(s => {
                    const p = getAnyPlayerName(s);
                    return p ? <span key={s} className="sub-badge">{p}</span> : null;
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* AWAY TEAM LINEUP */}
          <div className="team-lineup-card">
            <h3>{teamNames.away}</h3>
            
            {isRoundRobinLineup ? (
              <div>
                <div className="lineup-games">
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-gray, #9ca3af)' }}>Starting Players (in order)</h4>
                  {[...Array(playersPerTeam)].map((_, idx) => {
                    const player = match.awayTeam?.lineup?.starting?.[idx];
                    return (
                      <div key={idx} className={`game-item ${!player ? 'missing-player' : ''}`}>
                        <span className="game-number">Player {idx + 1}</span>
                        <div className="game-players" style={{ textAlign: 'center', flex: 1 }}>
                          {player?.name || <span className="missing-text">— Player Missing —</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {match.awayTeam?.lineup?.subs?.length > 0 && (
                  <div className="team-subs">
                    <h4>Substitutes</h4>
                    <div className="subs-list">
                      {match.awayTeam.lineup.subs.map((sub, idx) => (
                        <span key={idx} className="sub-badge">{sub.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="lineup-games">
                {season?.matchFormat?.map((game, i) => {
                  const gd = match.awayTeam?.lineup?.[`game${i+1}`];
                  if (!gd) return null;
                  return (
                    <div key={i} className="game-item">
                      <span className="game-number">Game {i+1}</span>
                      <span className="game-type">{game.type}</span>
                      <div className="game-players">{getGameDisplay(gd, game.type)}</div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {!isRoundRobinLineup && match.awayTeam?.subs?.length > 0 && (
              <div className="team-subs">
                <h4>Substitutes</h4>
                <div className="subs-list">
                  {match.awayTeam.subs.map(s => {
                    const p = getAnyPlayerName(s);
                    return p ? <span key={s} className="sub-badge">{p}</span> : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="start-match-section">
          <button 
            className={`btn-start-match ${match.games?.some(game => 
              (game.homeThrows && game.homeThrows.length > 0) || 
              (game.awayThrows && game.awayThrows.length > 0) ||
              (game.homeStats && (game.homeStats.scoreLeft !== undefined && game.homeStats.scoreLeft < 501)) ||
              (game.awayStats && (game.awayStats.scoreLeft !== undefined && game.awayStats.scoreLeft < 501))
            ) ? 'resume-btn' : 'start-btn'}`}
            onClick={() => navigate(`/match/${id}/scoring`)}
          >
            {match.games?.some(game => 
              (game.homeThrows && game.homeThrows.length > 0) || 
              (game.awayThrows && game.awayThrows.length > 0) ||
              (game.homeStats && (game.homeStats.scoreLeft !== undefined && game.homeStats.scoreLeft < 501)) ||
              (game.awayStats && (game.awayStats.scoreLeft !== undefined && game.awayStats.scoreLeft < 501))
            ) ? "Resume Match" : "Start Match"}
          </button>
        </div>
      </div>
    );
  }

  // Submitted - Waiting for opponent
  if (ourTeamData?.submitted && !match.lineupsRevealed) {
    console.log('🔍 Waiting screen rendering - lineup state:', lineup);
    console.log('🔍 Waiting screen rendering - lineup.starting:', lineup?.starting);
    const opponentSubmitted = isOurTeam ? match.awayTeam?.submitted : match.homeTeam?.submitted;
    return (
      <div className="lineup-container">
        <div className="lineup-header" style={{ position: 'relative', width: '100%', minHeight: '50px' }}>
          <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
            <button onClick={() => navigate('/dashboard')} className="back-btn" style={{ background: 'none', border: 'none', color: 'var(--text-gray, #9ca3af)', fontSize: '14px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>← Back</button>
          </div>
          <h1 style={{ textAlign: 'center', margin: 0, fontSize: '1.1rem', color: 'var(--text-white, #ffffff)', padding: '0 60px', lineHeight: '1.2' }}>Lineup Submitted</h1>
        </div>
        <div className="match-info-card" style={{ textAlign: 'center' }}>
          <h2 style={{ textAlign: 'center' }}>{teamNames.home} vs {teamNames.away}</h2>
          <p className="match-date" style={{ textAlign: 'center' }}>{new Date(match.date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="submitted-status"><div className="status-icon">✓</div><h3>Your lineup has been submitted</h3><p className="submitted-time">{new Date().toLocaleString()}</p></div>

        <div className="locked-lineup-card">
          <h3>Your Lineup</h3>
          
          {lineup?.starting ? (
            <div>
              <div className="lineup-games locked">
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-gray, #9ca3af)' }}>Starting Players (in order)</h4>
                {[...Array(playersPerTeam)].map((_, idx) => {
                  const player = lineup.starting?.[idx];
                  return (
                    <div key={idx} className={`game-item locked ${!player ? 'missing-player' : ''}`}>
                      <span className="game-number">Player {idx + 1}</span>
                      <div className="game-players">
                        {player?.name || <span className="missing-text">— Player Missing —</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {lineup.subs?.length > 0 && (
                <div className="team-subs">
                  <h4>Substitutes</h4>
                  <div className="subs-list">
                    {lineup.subs.map((sub, idx) => (
                      <span key={idx} className="sub-badge">{sub.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="lineup-games locked">
                {season?.matchFormat?.map((game, i) => {
                  const gd = lineup[`game${i+1}`];
                  if (!gd) return null;
                  return (
                    <div key={i} className="game-item locked">
                      <span className="game-number">Game {i+1}</span>
                      <span className="game-type">{game.type}</span>
                      <div className="game-players">{getGameDisplay(gd, game.type)}</div>
                    </div>
                  );
                })}
              </div>
              {substitutes.length > 0 && (
                <div className="team-subs">
                  <h4>Substitutes</h4>
                  <div className="subs-list">
                    {substitutes.map(s => {
                      const p = roster.find(r => r.id === s);
                      return p ? <span key={s} className="sub-badge">{p.name}</span> : null;
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="opponent-status-card">
          <h3>Opponent Status</h3>
          {(() => {
            const opponentHasSubmitted = isOurTeam ? match.awayTeam?.submitted : match.homeTeam?.submitted;
            const opponentName = isOurTeam ? teamNames.away : teamNames.home;
            if (opponentHasSubmitted) {
              return (
                <div className="status-ready">
                  <span className="status-dot green"></span>
                  <p>{opponentName} has submitted their lineup</p>
                </div>
              );
            } else {
              return (
                <div className="status-waiting">
                  <span className="status-dot yellow"></span>
                  <p>Waiting for {opponentName} to submit...</p>
                </div>
              );
            }
          })()}
        </div>
        <div className="match-code-card"><h4>Match Code</h4><p className="match-code">{generateMatchCode()}</p><p className="code-hint">Share with admin to make changes</p></div>
        <div className="need-change-section"><p>Need to make a change?</p><button className="btn-request-unlock" onClick={() => setShowUnlockModal(true)}>Request Unlock</button></div>
        {showUnlockModal && (
          <div className="modal-overlay" onClick={() => setShowUnlockModal(false)}>
            <div className="modal-container" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, padding: '12px 16px 0 0', zIndex: 10 }}>
                <button onClick={() => setShowUnlockModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'none', border: 'none', color: 'var(--text-gray, #9ca3af)', fontSize: '18px', cursor: 'pointer', borderRadius: '4px', padding: '0' }}>✕</button>
              </div>
              <h3 style={{ textAlign: 'center', margin: '0 0 1.5rem 0', paddingRight: '2rem', color: 'var(--text-white, #ffffff)' }}>Request Lineup Unlock</h3>
              <div className="form-group"><label>Type</label><select value={unlockType} onChange={e => setUnlockType(e.target.value)}><option value="correction">Correction</option><option value="transfer">Transfer</option></select></div>
              <div className="form-group"><label>Reason</label><select value={unlockReason} onChange={e => setUnlockReason(e.target.value)}><option value="">Select reason</option><option value="wrong-player">Wrong player</option><option value="wrong-order">Wrong order</option><option value="injury">Injury</option><option value="unavailable">Unavailable</option><option value="other">Other</option></select></div>
              <div className="form-group"><label>Details</label><textarea rows="3" placeholder="Explain..." value={unlockDetails} onChange={e => setUnlockDetails(e.target.value)} /></div>
              <div className="modal-actions"><button className="btn-secondary" onClick={() => setShowUnlockModal(false)}>Cancel</button><button className="btn-primary" onClick={handleUnlockRequest} disabled={!unlockReason || !unlockDetails}>Send</button></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== ROUND ROBIN LINEUP SELECTION ==========
  if (isRoundRobin && !ourTeamData?.submitted && !match.lineupsRevealed) {
    return (
      <div className="lineup-container">
        <div style={{ width: '100%', position: 'relative', height: '60px', marginBottom: '20px', borderBottom: '1px solid var(--border-dark, #3a4048)', display: 'flex', alignItems: 'center' }}>
          <button onClick={() => navigate('/dashboard')} style={{ position: 'absolute', left: '10px', top: '44%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-gray, #9ca3af)', fontSize: '15px', padding: '10px 15px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', lineHeight: '1' }}>← Back</button>
          <h1 style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', textAlign: 'center', fontSize: '17px', fontWeight: '600', color: 'var(--text-white, #ffffff)', margin: 0, padding: '0 70px', pointerEvents: 'none', lineHeight: '1.2' }}>Set Your Lineup</h1>
        </div>
        
        <div style={{ backgroundColor: 'var(--card-bg, #252a31)', border: '1px solid var(--border-dark, #3a4048)', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
          <h2 style={{ textAlign: 'center', margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--text-white, #ffffff)' }}>{teamNames.home} vs {teamNames.away}</h2>
          <p style={{ textAlign: 'center', margin: '0 auto 4px auto', fontSize: '0.9rem', color: 'var(--accent-orange, #f5a623)' }}>{new Date(match.date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p style={{ textAlign: 'center', margin: '0 auto', fontSize: '0.85rem', color: 'var(--text-gray, #9ca3af)' }}>Round Robin · {playersPerTeam}-a-side · 1 leg per game · {playersPerTeam * playersPerTeam} games</p>
        </div>
        
        <div className="lineup-builder">
          <h3>Select Starting Players</h3>
          <p className="builder-hint">Choose {playersPerTeam} players for the starting lineup (order matters). Teams can play with fewer players - missing positions will result in automatic wins for the opponent.</p>
          
          {[...Array(playersPerTeam)].map((_, index) => (
            <div key={index} className="game-builder-card">
              <div className="game-header">
                <span className="game-number">Player {index + 1}</span>
                <span className="game-type">Position</span>
              </div>
              <select 
                className="player-select"
                value={homeStartingPlayers[index]?.id || ''}
                onChange={(e) => {
                  const selectedPlayer = roster.find(p => p.id === e.target.value);
                  if (selectedPlayer) {
                    const newStarting = [...homeStartingPlayers];
                    newStarting[index] = selectedPlayer;
                    setHomeStartingPlayers(newStarting);
                    console.log('✅ Selected player', index + 1, ':', selectedPlayer.name);
                  }
                }}
              >
                <option value="">Select Player {index + 1}</option>
                {roster.map(player => (
                  <option 
                    key={player.id} 
                    value={player.id}
                    disabled={homeStartingPlayers.some(p => p?.id === player.id)}
                  >
                    {player.name}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <div className="subs-builder-card">
            <h3>Substitutes</h3>
            <p className="subs-hint">Select players who will be on the bench</p>
            <div className="subs-selector">
              {roster.filter(player => !homeStartingPlayers.some(p => p?.id === player.id)).map(player => (
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
              onClick={handleSubmitRoundRobinLineup}
              disabled={homeStartingPlayers.length === 0 || saving}
            >
              {saving ? 'Submitting...' : 'Submit Lineup'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Initial lineup selection (standard)
  return (
    <div className="lineup-container">
      <div style={{ width: '100%', position: 'relative', height: '60px', marginBottom: '20px', borderBottom: '1px solid var(--border-dark, #3a4048)', display: 'flex', alignItems: 'center' }}>
        <button onClick={() => navigate('/dashboard')} style={{ position: 'absolute', left: '10px', top: '44%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-gray, #9ca3af)', fontSize: '15px', padding: '10px 15px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', lineHeight: '1' }}>← Back</button>
        <h1 style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', textAlign: 'center', fontSize: '17px', fontWeight: '600', color: 'var(--text-white, #ffffff)', margin: 0, padding: '0 70px', pointerEvents: 'none', lineHeight: '1.2' }}>Set Your Lineup</h1>
      </div>
      <div style={{ backgroundColor: 'var(--card-bg, #252a31)', border: '1px solid var(--border-dark, #3a4048)', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--text-white, #ffffff)' }}>{teamNames.home} vs {teamNames.away}</h2>
        <p style={{ textAlign: 'center', margin: '0 auto 4px auto', fontSize: '0.9rem', color: 'var(--accent-orange, #f5a623)' }}>{new Date(match.date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p style={{ textAlign: 'center', margin: '0 auto', fontSize: '0.85rem', color: 'var(--text-gray, #9ca3af)' }}>{season?.type || 'Match'} · {season?.matchFormat?.length || 6} Games</p>
      </div>
      <div className="lineup-builder">
        <h3>Playing Order</h3>
        <p className="builder-hint">Select players in the order they will play</p>
        {season?.matchFormat?.map((game, idx) => {
          const gameNum = idx + 1;
          return (
            <div key={gameNum} className="game-builder-card">
              <div className="game-header">
                <span className="game-number">Game {gameNum}</span>
                <span className="game-type">{game.type}</span>
                {game.type === 'leg' && <span className="game-score">({game.startingScore || 1001})</span>}
              </div>
              {game.type === 'doubles' ? (
                <div className="player-selectors">
                  <select className="player-select" value={lineup[`game${gameNum}`]?.player1Id || ''} onChange={e => handlePlayerSelect(gameNum, 'player1', e.target.value)}>
                    <option value="">Select Player 1</option>
                    {roster.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select className="player-select" value={lineup[`game${gameNum}`]?.player2Id || ''} onChange={e => handlePlayerSelect(gameNum, 'player2', e.target.value)}>
                    <option value="">Select Player 2</option>
                    {roster.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              ) : game.type === 'leg' ? (
                <div className="leg-order">
                  <p className="leg-hint">Batting order ({getLegPlayerCount()} players)</p>
                  {Array(getLegPlayerCount()).fill().map((_, pos) => (
                    <select 
                      key={pos} 
                      className="player-select leg-select" 
                      value={lineup[`game${gameNum}`]?.orderIds?.[pos] || ''} 
                      onChange={e => handleLegOrderChange(gameNum, pos, e.target.value)}
                    >
                      <option value="">Position {pos + 1}</option>
                      {roster.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ))}
                </div>
              ) : (
                <select className="player-select" value={lineup[`game${gameNum}`]?.playerId || ''} onChange={e => handlePlayerSelect(gameNum, 'player', e.target.value)}>
                  <option value="">Select Player</option>
                  {roster.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>
          );
        })}
        <div className="subs-builder-card">
          <h3>Substitutes</h3>
          <p className="subs-hint">Select players who will be on the bench</p>
          <div className="subs-selector">
            {getAvailableSubstitutes().map(p => (
              <label key={p.id} className="sub-checkbox">
                <input type="checkbox" checked={substitutes.includes(p.id)} onChange={() => handleSubToggle(p.id)} />
                <span className="player-name">{p.name}</span>
              </label>
            ))}
            {getAvailableSubstitutes().length === 0 && (
              <div className="no-players-message" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-gray)' }}>
                All players are in the starting lineup
              </div>
            )}
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
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default MatchLineup;