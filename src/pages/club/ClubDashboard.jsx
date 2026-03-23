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

  useEffect(() => {
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
  
        const upcoming = allMatches.filter(match => {
          if (match.status) {
            return match.status === 'scheduled' && match.date >= today;
          }
          return match.date >= today;
        });
        
        const results = allMatches.filter(match => {
          if (match.status) {
            return match.status === 'completed';
          }
          return match.date < today;
        });
  
        upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
        setUpcomingMatches(upcoming);
        setRecentResults(results);
  
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setLoading(false);
      }
    };
    
  
    fetchMatches();
  }, [currentViewingUser]);

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
    className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
    onClick={() => {
      setActiveTab('profile');
      window.scrollTo(0, 0);
    }}
  >

    
    👤 Profile
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
    className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
    onClick={() => {
      setActiveTab('stats');
      window.scrollTo(0, 0);
    }}
  >
    📊 Stats
  </button>
</div>

      {/* Tab Content */}
      {activeTab === 'stats' && (
        <>
          <div className="stats-section">
            <h2>Your Stats</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Average</span>
                <span className="stat-value">--</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">180s</span>
                <span className="stat-value">--</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Highest C/O</span>
                <span className="stat-value">--</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Matches</span>
                <span className="stat-value">--</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Win %</span>
                <span className="stat-value">--</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Tons</span>
                <span className="stat-value">--</span>
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="card-header">
                <h2>📅 Upcoming Fixtures</h2>
                <button 
                  className="view-more-link"
                  onClick={() => setActiveTab('fixtures')}
                >
                  View More →
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
              <h2>📈 Recent Results</h2>
              {loading ? (
                <div className="empty-state">
                  <p>Loading results...</p>
                </div>
              ) : recentResults.length > 0 ? (
                <div className="results-list">
                  {recentResults.map(result => (
                    <div key={result.id} className="result-item">
                      <span className="result-teams">
                        {displayTeamName(result.homeTeamId)} vs {displayTeamName(result.awayTeamId)}
                      </span>
                      <span className="result-score">
                        {result.homeScore || '?'} - {result.awayScore || '?'}
                      </span>
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
              <span className="fixture-status">{match.status || 'scheduled'}</span>
            </div>
            <div className="fixture-full-details">
              <div className="fixture-teams-large">
                <span className="team-home">{displayTeamName(match.homeTeamId)}</span>
                <span className="vs">VS</span>
                <span className="team-away">{displayTeamName(match.awayTeamId)}</span>
              </div>
              
              {/* 👇 ADD THIS BLOCK RIGHT HERE 👇 */}
              <div className="fixture-format">
                <span className="format-badge">{getSeasonFormat(match.seasonId)}</span>
              </div>
              {/* 👆 END OF ADDED BLOCK */}
              
              {match.homePlayers?.length > 0 && (
                <div className="fixture-players">
                  <div className="home-players">
                    <span>Home: {match.homePlayers.length} players</span>
                  </div>
                  <div className="away-players">
                    <span>Away: {match.awayPlayers.length} players</span>
                  </div>
                </div>
              )}
              <div className="fixture-actions">
                <button 
                  className="enter-score-icon"
                  onClick={() => handleEnterScore(match)}
                  title="Enter match results"
                >
                  Play
                </button>
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