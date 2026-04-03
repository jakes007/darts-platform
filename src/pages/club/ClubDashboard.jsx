import React, { useState, useEffect } from 'react';
import { useUserView } from '../../context/UserViewContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import ProfileTab from '../../components/ProfileTab';
import './ClubDashboard.css';
import { useNavigate } from 'react-router-dom';

function ClubDashboard() {
  const { currentViewingUser, getClubName, loading: userLoading } = useUserView(); // ← ADD userLoading
  const [activeTab, setActiveTab] = useState('stats');
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [loading, setLoading] = useState(false);
const [teamCache, setTeamCache] = useState({});
const [seasons, setSeasons] = useState([]);
const [playerSeasons, setPlayerSeasons] = useState([]); // Seasons player is registered in
const [selectedSeasonId, setSelectedSeasonId] = useState(null); // Currently selected season
const [playerStats, setPlayerStats] = useState({
  wins: 0,
  losses: 0,
  tons: 0,
  oneEighties: 0,
  highestCheckout: 0,
  average: 0,
  gamesPlayed: 0
});
const navigate = useNavigate();

  // Function to fetch a single team by ID
  const fetchTeamById = async (teamId) => {
    if (!teamId || teamCache[teamId]) return;
    
    try {
      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      if (teamDoc.exists()) {
        setTeamCache(prev => ({
          ...prev,
          [teamId]: teamDoc.data()
        }));
      }
    } catch (error) {
      console.error(`Error fetching team ${teamId}:`, error);
    }
  };

 // Handle play button click - go to lineup page
const handleEnterScore = (match) => {
  console.log('🎯 Play clicked - match ID:', match.id);
  console.log('🎯 Navigating to:', `/match/${match.id}/lineup`);
  navigate(`/match/${match.id}/lineup`);
};

  // Enhanced getTeamName that fetches missing teams
  const getTeamName = async (teamId) => {
    if (!teamId) return 'Unknown';
    
    if (teamCache[teamId]?.name) {
      return teamCache[teamId].name;
    }
    
    await fetchTeamById(teamId);
    return teamId;
  };

  // Add this new useEffect
useEffect(() => {
  const fetchSeasons = async () => {
    try {
      const seasonsSnapshot = await getDocs(collection(db, 'seasons'));
      const seasonsData = [];
      seasonsSnapshot.forEach(doc => {
        seasonsData.push({ id: doc.id, ...doc.data() });
      });
      setSeasons(seasonsData);
    } catch (error) {
      console.error('Error fetching seasons:', error);
    }
  };
  fetchSeasons();
}, []);


  
// Get all seasons where the player is registered (from rosters)
const fetchPlayerSeasons = async () => {
  console.log('🔍 fetchPlayerSeasons called - currentViewingUser:', currentViewingUser);
  if (!currentViewingUser?.id) {
    console.log('❌ No currentViewingUser.id');
    return;
  }
  
  try {
    // Get all seasons
    const seasonsSnapshot = await getDocs(collection(db, 'seasons'));
    console.log('📁 Total seasons found:', seasonsSnapshot.size);
    const allSeasons = [];
    
    for (const seasonDoc of seasonsSnapshot.docs) {
      const seasonData = { id: seasonDoc.id, ...seasonDoc.data() };
      console.log('🔍 Checking season:', seasonData.name);
      
      // Check if player is in any roster of this season
      const rostersRef = collection(db, 'seasons', seasonDoc.id, 'rosters');
      const rostersSnapshot = await getDocs(rostersRef);
      console.log('   Rosters in this season:', rostersSnapshot.size);
      
      let isPlayerInSeason = false;
      for (const rosterDoc of rostersSnapshot.docs) {
        const rosterData = rosterDoc.data();
        const memberIds = rosterData.memberIds || [];
        console.log('   Roster memberIds:', memberIds);
        if (memberIds.includes(currentViewingUser.id)) {
          isPlayerInSeason = true;
          console.log('   ✅ Player found in this roster!');
          break;
        }
      }
      
      if (isPlayerInSeason) {
        allSeasons.push(seasonData);
        console.log('📌 Added season:', seasonData.name);
      }
    }
    
    // Sort by endDate (most recent first)
    allSeasons.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
    
    console.log('🎯 Final playerSeasons:', allSeasons);
    setPlayerSeasons(allSeasons);
    
    // Set default season (most recent)
    if (allSeasons.length > 0 && !selectedSeasonId) {
      console.log('📌 Setting default season to:', allSeasons[0].name, allSeasons[0].id);
      setSelectedSeasonId(allSeasons[0].id);
      // Fetch stats for this season
      await fetchPlayerStatsForSeason(allSeasons[0].id);
    } else if (allSeasons.length === 0) {
      console.log('⚠️ No seasons found for this player');
    }
    
  } catch (error) {
    console.error('Error fetching player seasons:', error);
  }
};

// Calculate player stats for a specific season
const fetchPlayerStatsForSeason = async (seasonId) => {
  console.log('🔍 fetchPlayerStatsForSeason called - seasonId:', seasonId);
  console.log('🔍 currentViewingUser:', currentViewingUser);
  
  if (!currentViewingUser?.id || !seasonId) {
    console.log('❌ Missing user ID or season ID');
    return;
  }
  
  try {
    // Get all matches for this season
    const matchesQuery = query(
      collection(db, 'matches'),
      where('seasonId', '==', seasonId)
    );
    const matchesSnapshot = await getDocs(matchesQuery);
    console.log('📁 Total matches in season:', matchesSnapshot.size);
    
    let totalWins = 0;
    let totalGamesPlayed = 0;
    let totalTons = 0;
    let totalOneEighties = 0;
    let highestCheckout = 0;
    let totalScore = 0;
    let totalDarts = 0;
    let completedMatchesCount = 0;
    
    for (const matchDoc of matchesSnapshot.docs) {
      const match = { id: matchDoc.id, ...matchDoc.data() };
      
      // Only count completed matches (both POTM selected)
      const isComplete = !!(match.playerOfTheMatch?.home && match.playerOfTheMatch?.away);
      console.log(`  Match ${match.id} - isComplete:`, isComplete);
      if (!isComplete) continue;
      
      // Check if player is in home team or away team lineup
      const homeLineup = match.homeTeam?.lineup?.starting || [];
      const awayLineup = match.awayTeam?.lineup?.starting || [];
      
      const isHomePlayer = homeLineup.some(p => p.id === currentViewingUser.id);
      const isAwayPlayer = awayLineup.some(p => p.id === currentViewingUser.id);
      
      console.log(`  Match ${match.id} - isHomePlayer: ${isHomePlayer}, isAwayPlayer: ${isAwayPlayer}`);
      
      if (!isHomePlayer && !isAwayPlayer) continue;
      
      completedMatchesCount++;
      
      // Calculate stats from games
      const games = match.games || [];
      console.log(`  Games in match: ${games.length}`);
      
      for (const game of games) {
        const isPlayerInGame = (isHomePlayer && game.homePlayerId === currentViewingUser.id) ||
                               (!isHomePlayer && game.awayPlayerId === currentViewingUser.id);
        
        if (isPlayerInGame) {
          totalGamesPlayed++;
          
          // Check if player won
          const playerWon = (isHomePlayer && game.winner === 'home') ||
                           (!isHomePlayer && game.winner === 'away');
          if (playerWon) totalWins++;
          
          // Get player stats from game
          const playerStatsData = isHomePlayer ? game.homeStats : game.awayStats;
          if (playerStatsData) {
            totalTons += playerStatsData.tonPlus || 0;
            totalOneEighties += playerStatsData.oneEighty || 0;
            if (playerStatsData.highCheckout > highestCheckout) {
              highestCheckout = playerStatsData.highCheckout;
            }
          }
          
          // Get throws for average calculation
          const playerThrows = isHomePlayer ? game.homeThrows : game.awayThrows;
          const playerDartsPerThrow = isHomePlayer ? game.homeDartsPerThrow : game.awayDartsPerThrow;
          
          if (playerThrows && playerThrows.length > 0) {
            totalScore += playerThrows.reduce((a, b) => a + b, 0);
            totalDarts += playerDartsPerThrow?.reduce((a, b) => a + b, 0) || 0;
          }
        }
      }
    }
    
    // Calculate average
    const average = totalDarts > 0 ? ((totalScore / totalDarts) * 3).toFixed(1) : 0;
    const losses = totalGamesPlayed - totalWins;
    
    console.log('📊 FINAL STATS:');
    console.log('  wins:', totalWins);
    console.log('  losses:', losses);
    console.log('  tons:', totalTons);
    console.log('  oneEighties:', totalOneEighties);
    console.log('  highestCheckout:', highestCheckout);
    console.log('  average:', average);
    console.log('  gamesPlayed:', totalGamesPlayed);
    console.log('  matchesPlayed:', completedMatchesCount);
    
    setPlayerStats({
      wins: totalWins,
      losses: losses,
      tons: totalTons,
      oneEighties: totalOneEighties,
      highestCheckout: highestCheckout,
      average: parseFloat(average),
      gamesPlayed: totalGamesPlayed,
      matchesPlayed: completedMatchesCount
    });
    
  } catch (error) {
    console.error('Error calculating player stats:', error);
  }
};

const fetchMatches = async () => {
  if (!currentViewingUser) return;
  
  setLoading(true);
  try {
    const today = new Date().toISOString().split('T')[0];
    let teamIds = [];
    let teamsToFetch = [];
    
    if (currentViewingUser.teamId) {
      teamIds = [currentViewingUser.teamId];
      teamsToFetch.push(currentViewingUser.teamId);
    } 
    else if (currentViewingUser.clubId) {
      const teamsQuery = query(
        collection(db, 'teams'),
        where('clubId', '==', currentViewingUser.clubId)
      );
      const teamsSnapshot = await getDocs(teamsQuery);
      teamIds = teamsSnapshot.docs.map(doc => doc.id);
      teamsToFetch = teamIds;
    } else {
      setLoading(false);
      return;
    }

    if (teamIds.length === 0) {
      setLoading(false);
      return;
    }

    const teamFetchPromises = teamsToFetch.map(async (id) => {
      if (!teamCache[id]) {
        const teamDoc = await getDoc(doc(db, 'teams', id));
        if (teamDoc.exists()) {
          return { id, data: teamDoc.data() };
        }
      }
      return null;
    });

    const teamResults = await Promise.all(teamFetchPromises);
    const newTeamCache = { ...teamCache };
    teamResults.forEach(result => {
      if (result) {
        newTeamCache[result.id] = result.data;
      }
    });
    setTeamCache(newTeamCache);

    const homeMatchesQuery = query(
      collection(db, 'matches'),
      where('homeTeamId', 'in', teamIds)
    );
    
    const awayMatchesQuery = query(
      collection(db, 'matches'),
      where('awayTeamId', 'in', teamIds)
    );

    const [homeSnapshot, awaySnapshot] = await Promise.all([
      getDocs(homeMatchesQuery),
      getDocs(awayMatchesQuery)
    ]);

    const allMatchesMap = new Map();
    
    homeSnapshot.forEach(doc => {
      allMatchesMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
    
    awaySnapshot.forEach(doc => {
      allMatchesMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    const allMatches = Array.from(allMatchesMap.values());

    const additionalTeamIds = new Set();
    allMatches.forEach(match => {
      if (match.homeTeamId && !newTeamCache[match.homeTeamId]) {
        additionalTeamIds.add(match.homeTeamId);
      }
      if (match.awayTeamId && !newTeamCache[match.awayTeamId]) {
        additionalTeamIds.add(match.awayTeamId);
      }
    });

    if (additionalTeamIds.size > 0) {
      const additionalPromises = Array.from(additionalTeamIds).map(async (id) => {
        const teamDoc = await getDoc(doc(db, 'teams', id));
        if (teamDoc.exists()) {
          return { id, data: teamDoc.data() };
        }
        return null;
      });

      const additionalResults = await Promise.all(additionalPromises);
      additionalResults.forEach(result => {
        if (result) {
          newTeamCache[result.id] = result.data;
        }
      });
      setTeamCache(newTeamCache);
    }

    // 🎯 ADD THIS: Process matches to add hasStarted and isComplete flags
const processedMatches = allMatches.map(match => {
  // Check if any game in this match has been started (has throws or stats)
  const hasStarted = match.games?.some(game => {
    return (game.homeThrows && game.homeThrows.length > 0) ||
           (game.awayThrows && game.awayThrows.length > 0) ||
           (game.homeStats && Object.keys(game.homeStats).length > 0) ||
           (game.awayStats && Object.keys(game.awayStats).length > 0) ||
           game.homeCompleted ||
           game.awayCompleted;
  }) || false;
  
  // Check if match is complete (both teams have selected POTM)
  const isComplete = !!(match.playerOfTheMatch?.home && match.playerOfTheMatch?.away);
  
  return {
    ...match,
    hasStarted,
    isComplete
  };
});

    // Filter matches based on actual status (SCHEDULED, LIVE, COMPLETED)
const upcoming = processedMatches.filter(match => {
  const isComplete = !!(match.playerOfTheMatch?.home && match.playerOfTheMatch?.away);
  const hasStarted = match.hasStarted || false;
  
  // Only show in UPCOMING if: NOT started AND NOT complete
  return !hasStarted && !isComplete;
});

const results = processedMatches.filter(match => {
  const isComplete = !!(match.playerOfTheMatch?.home && match.playerOfTheMatch?.away);
  
  // Only show in RECENT RESULTS if: COMPLETE
  return isComplete;
});

// Sort upcoming by date (closest first)
upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

// Sort results by date (most recent first)
results.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // ADD THESE DEBUG LOGS
    console.log('🔍 All matches:', allMatches.length);
    console.log('🔍 Results matches:', results.length);
    console.log('🔍 First match details:', allMatches[0]);
    console.log('🔍 First match FULL details:', JSON.stringify(allMatches[0], null, 2));

    upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
    setUpcomingMatches(upcoming);
    setRecentResults(results);
    console.log('📊 Setting recentResults:', results);

  } catch (error) {
    console.error('Error fetching matches:', error);
  } finally {
    setLoading(false);
  }
};
  
useEffect(() => {
  fetchMatches();
  fetchPlayerSeasons();
}, [currentViewingUser]);

    // Listen for refresh trigger from scoring page
useEffect(() => {
  const interval = setInterval(() => {
    const refreshFlag = localStorage.getItem('refreshClubDashboard');
if (refreshFlag) {
  localStorage.removeItem('refreshClubDashboard');
  fetchMatches();
  // Also refresh player stats for current season
  if (selectedSeasonId) {
    fetchPlayerStatsForSeason(selectedSeasonId);
  }
}
  }, 500);
  
  return () => clearInterval(interval);
}, []);

  // Scroll to top when tab changes
useEffect(() => {
  window.scrollTo(0, 0);
}, [activeTab]);

  const displayTeamName = (teamId) => {
    return teamCache[teamId]?.name || teamId;
  };

  if (userLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh',
        width: '100%'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #3a4048',
          borderTopColor: '#f5a623',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span style={{
          marginLeft: '12px',
          color: '#9ca3af',
          fontSize: '0.9rem'
        }}>Loading...</span>
      </div>
    );
  }

// Get match status text based on hasStarted and isComplete
const getMatchStatusText = (match) => {
  const isComplete = !!(match.playerOfTheMatch?.home && match.playerOfTheMatch?.away);
  const hasStarted = match.hasStarted || false;
  
  if (isComplete) {
    return 'COMPLETED';
  } else if (hasStarted) {
    return 'LIVE';
  } else {
    return 'SCHEDULED';
  }
};

// Get season name by ID
const getSeasonName = (seasonId) => {
  const season = seasons.find(s => s.id === seasonId);
  return season?.name || 'Unknown Competition';
};
  

  // Add this function after your existing helpers
const getSeasonFormat = (seasonId) => {
  const season = seasons.find(s => s.id === seasonId);
  if (!season) return 'Loading...';
  
  if (season.matchType === 'round_robin') {
    const playersPerTeam = parseInt(season.type) || 4;
    const totalGames = playersPerTeam * playersPerTeam;
    return `${season.type} · Round Robin · ${totalGames} games (1 leg each)`;
  } else {
    return `${season.type} · ${season.matchFormat?.length || 6} games`;
  }
};

  // Only show "No user selected" for admins, not regular users
  if (!currentViewingUser) {
    return (
      <div className="dashboard-container">
        <div className="no-user-message">
          <h2>No user selected</h2>
          <p>Please select a user from the switcher to view their dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Centered Header Section */}
      <div className="dashboard-header centered">
        <h1 className="club-name">{getClubName(currentViewingUser.clubId)}</h1>
        <p className="welcome-message">
          Welcome back, {currentViewingUser.firstNames} {currentViewingUser.surname}
        </p>
      </div>

      {/* Tab Navigation */}
<div className="dashboard-tabs">
  <button 
    className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
    onClick={() => {
      setActiveTab('stats');
      window.scrollTo(0, 0);
    }}
  >
    📊 Stats
  </button>
  <button 
    className={`tab-btn ${activeTab === 'fixtures' ? 'active' : ''}`}
    onClick={() => {
      setActiveTab('fixtures');
      window.scrollTo(0, 0);
    }}
  >
    📅 Fixtures
  </button>
  <button 
    className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
    onClick={() => {
      setActiveTab('profile');
      window.scrollTo(0, 0);
    }}
  >
    👤 Profile
  </button>
</div>

      {/* Tab Content */}
      {activeTab === 'stats' && (
  <>
    <div className="stats-section">
      <div className="stats-header">
        <h2>Your Stats</h2>
        {playerSeasons.length > 0 && (
          <select 
            className="season-selector"
            value={selectedSeasonId || ''}
            onChange={(e) => {
              setSelectedSeasonId(e.target.value);
              fetchPlayerStatsForSeason(e.target.value);
            }}
          >
            {playerSeasons.map(season => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </select>
        )}
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Wins</span>
          <span className="stat-value">{playerStats.wins}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Loss</span>
          <span className="stat-value">{playerStats.losses}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">100+</span>
          <span className="stat-value">{playerStats.tons}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">180s</span>
          <span className="stat-value">{playerStats.oneEighties}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Highest C/O</span>
          <span className="stat-value">{playerStats.highestCheckout}</span>
        </div>
        <div className="stat-card average-card">
          <span className="stat-label">Average</span>
          <span className="stat-value">{playerStats.average}</span>
        </div>
      </div>
      
      {playerStats.matchesPlayed === 0 && (
        <div className="empty-state">
          <p>No completed matches yet</p>
          <span className="empty-hint">Stats will appear once you complete matches in this season</span>
        </div>
      )}
    </div>

          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="card-header">
                <h2>📅 Upcoming Fixtures</h2>
                <button 
                  className="view-more-link"
                  onClick={() => setActiveTab('fixtures')}
                >
                  More →
                </button>
              </div>
              {loading ? (
                <div className="empty-state">
                  <p>Loading fixtures...</p>
                </div>
              ) : upcomingMatches.length > 0 ? (
                <div className="fixtures-list">
                  {upcomingMatches.slice(0, 3).map(match => (
  <div key={match.id} className="fixture-item">
    <span className="fixture-teams">
      {displayTeamName(match.homeTeamId)} vs {displayTeamName(match.awayTeamId)}
    </span>
    <span className="fixture-date">
      {new Date(match.date).toLocaleDateString('en-ZA', { 
        day: '2-digit', 
        month: 'short' 
      })}
    </span>
  </div>
))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No upcoming fixtures</p>
                  <span className="empty-hint">Fixtures will appear here once scheduled</span>
                </div>
              )}
            </div>

            <div className="dashboard-card">
  <div className="card-header">
    <h2>📈 Recent Results</h2>
    <button 
      className="view-more-link"
      onClick={() => navigate('/results')}
    >
      More →
    </button>
  </div>
  {loading ? (
    <div className="empty-state">
      <p>Loading results...</p>
    </div>
  ) : recentResults.length > 0 ? (
    <div className="results-simple-list">
      <div className="result-simple-header">
        <span>MATCH</span>
        <span>SCORE</span>
      </div>
      {recentResults.slice(0, 4).map(result => (
  <div key={result.id} className="result-item-detailed">
    <div className="result-main-row">
      <span className="result-teams">
        {displayTeamName(result.homeTeamId)} vs {displayTeamName(result.awayTeamId)}
        {result.games?.some(g => g.isForfeit) && (
          <span className="forfeit-indicator" title="Forfeited game(s) in this match">⚡</span>
        )}
      </span>
      <span className="result-score">
        {result.homeScore || 0} - {result.awayScore || 0}
      </span>
    </div>
    <div className="result-details-row">
      <span className="result-date">
        {new Date(result.date).toLocaleDateString('en-ZA', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        })}
      </span>
      <span className="result-competition">
        {getSeasonName(result.seasonId)} · {getSeasonFormat(result.seasonId)}
      </span>
    </div>
  </div>
))}
    </div>
  ) : (
    <div className="empty-state">
      <p>No results yet</p>
      <span className="empty-hint">Results will appear once matches are played</span>
    </div>
  )}
</div>
          </div>

          <div className="team-stats-section">
            <h2>Team Statistics</h2>
            <div className="empty-state">
              <p>Team statistics coming soon</p>
              <span className="empty-hint">Once matches are played, team stats will appear here</span>
            </div>
          </div>
        </>
      )}

      {activeTab === 'profile' && (
        <ProfileTab />
      )}

{activeTab === 'fixtures' && (
  <div className="fixtures-full">
    <h2>📅 Team Fixtures</h2>
    {loading ? (
      <div className="empty-state">
        <p>Loading fixtures...</p>
      </div>
    ) : upcomingMatches.length > 0 ? (
      <div className="fixtures-full-list">
        {upcomingMatches.map(match => (
  <div key={match.id} className="fixture-full-card">
    <div className="fixture-header">
      <span className="fixture-full-date">
        {new Date(match.date).toLocaleDateString('en-ZA', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long',
          year: 'numeric'
        })}
      </span>
      <span className={`fixture-status ${getMatchStatusText(match).toLowerCase()}`}>
        {getMatchStatusText(match)}
      </span>
    </div>
    <div className="fixture-full-details">
      <div className="fixture-teams-large">
        <span className="team-home">{displayTeamName(match.homeTeamId)}</span>
        <span className="vs">VS</span>
        <span className="team-away">{displayTeamName(match.awayTeamId)}</span>
      </div>
      
      <div className="fixture-competition">
        <span className="competition-name">{getSeasonName(match.seasonId)}</span>
        <span className="format-badge">{getSeasonFormat(match.seasonId)}</span>
      </div>
      
      <div className="fixture-actions">
  {match.isComplete ? (
    <button 
    className="enter-score-icon view-results-btn"
    onClick={() => {
      // Set flag to show summary modal
      localStorage.setItem('showMatchSummary', match.id);
      navigate(`/match/${match.id}/scoring`);
    }}
    title="View match results"
  >
    View Results
  </button>
  ) : (
    <button 
      className={`enter-score-icon ${match.hasStarted ? 'resume-btn' : 'play-btn'}`}
      onClick={() => handleEnterScore(match)}
      title={match.hasStarted ? "Resume match scoring" : "Start match scoring"}
    >
      {match.hasStarted ? "Resume" : "Play"}
    </button>
  )}
</div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="empty-state">
        <p>No fixtures scheduled for your team</p>
        <span className="empty-hint">Check back later for upcoming matches</span>
      </div>
    )}
  </div>
)}
    </div>
  );
}

export default ClubDashboard;