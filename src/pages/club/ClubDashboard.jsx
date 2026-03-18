import React, { useState, useEffect } from 'react';
import { useUserView } from '../../context/UserViewContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import ProfileTab from '../../components/ProfileTab';
import './ClubDashboard.css';

function ClubDashboard() {
  const { currentViewingUser, getClubName } = useUserView();
  const [activeTab, setActiveTab] = useState('stats');
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [teamCache, setTeamCache] = useState({});

  useEffect(() => {
    const fetchMatches = async () => {
      if (!currentViewingUser) return;
      
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        let teamIds = [];
        
        console.log('=== FETCHING MATCHES ===');
        console.log('Current user:', currentViewingUser);
        
        // If user has a teamId, use that specific team
        if (currentViewingUser.teamId) {
          teamIds = [currentViewingUser.teamId];
          console.log('Using teamId:', currentViewingUser.teamId);
          
          // Fetch this specific team's data
          const teamDoc = await getDoc(doc(db, 'teams', currentViewingUser.teamId));
          if (teamDoc.exists()) {
            const teamMap = {};
            teamMap[currentViewingUser.teamId] = teamDoc.data();
            setTeamCache(teamMap);
          }
        } 
        // Otherwise, find all teams in their club
        else if (currentViewingUser.clubId) {
          console.log('Fetching teams for club:', currentViewingUser.clubId);
          const teamsQuery = query(
            collection(db, 'teams'),
            where('clubId', '==', currentViewingUser.clubId)
          );
          const teamsSnapshot = await getDocs(teamsQuery);
          teamIds = teamsSnapshot.docs.map(doc => {
            console.log('Found team:', doc.id, doc.data());
            return doc.id;
          });
          
          // Cache all team data
          const teamMap = {};
          teamsSnapshot.docs.forEach(doc => {
            teamMap[doc.id] = doc.data();
          });
          setTeamCache(teamMap);
        } else {
          console.log('No teamId or clubId found');
          return;
        }
  
        if (teamIds.length === 0) {
          console.log('No teamIds found');
          return;
        }
  
        console.log('Team IDs to query:', teamIds);
  
        // SIMPLIFIED: Fetch ALL matches where team is home OR away (no status filter)
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
  
        console.log('Home matches found (all):', homeSnapshot.size);
        homeSnapshot.forEach(doc => console.log('Home match:', doc.id, doc.data()));
        
        console.log('Away matches found (all):', awaySnapshot.size);
        awaySnapshot.forEach(doc => console.log('Away match:', doc.id, doc.data()));
  
        // Combine all matches
        const allMatchesMap = new Map();
        
        homeSnapshot.forEach(doc => {
          allMatchesMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
        
        awaySnapshot.forEach(doc => {
          allMatchesMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
  
        const allMatches = Array.from(allMatchesMap.values());
        console.log('Total matches found:', allMatches.length);
  
        // Separate based on date and status
        const upcoming = allMatches.filter(match => {
          // If match has status field, check it
          if (match.status) {
            return match.status === 'scheduled' && match.date >= today;
          }
          // If no status field, just check the date
          return match.date >= today;
        });
        
        const results = allMatches.filter(match => {
          if (match.status) {
            return match.status === 'completed';
          }
          // If no status field, assume completed if date is in the past
          return match.date < today;
        });
  
        console.log('Upcoming matches after filter:', upcoming.length);
        console.log('Results after filter:', results.length);
  
        // Fetch any missing team data
        const missingTeamIds = new Set();
        allMatches.forEach(match => {
          if (match.homeTeamId && !teamCache[match.homeTeamId]) missingTeamIds.add(match.homeTeamId);
          if (match.awayTeamId && !teamCache[match.awayTeamId]) missingTeamIds.add(match.awayTeamId);
        });
  
        if (missingTeamIds.size > 0) {
          console.log('Fetching missing team data for:', Array.from(missingTeamIds));
          const teamPromises = Array.from(missingTeamIds).map(async (id) => {
            try {
              const teamDoc = await getDoc(doc(db, 'teams', id));
              return { id, data: teamDoc.exists() ? teamDoc.data() : null };
            } catch (error) {
              console.error(`Error fetching team ${id}:`, error);
              return { id, data: null };
            }
          });
          
          const teamResults = await Promise.all(teamPromises);
          
          const newTeamCache = { ...teamCache };
          teamResults.forEach(({ id, data }) => {
            if (data) {
              newTeamCache[id] = data;
              console.log(`Cached team ${id}:`, data);
            }
          });
          setTeamCache(newTeamCache);
        }
  
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

  const getTeamName = (teamId) => {
    return teamCache[teamId]?.name || teamId;
  };

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
          onClick={() => setActiveTab('stats')}
        >
          📊 Stats
        </button>
        <button 
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profile
        </button>
        <button 
          className={`tab-btn ${activeTab === 'fixtures' ? 'active' : ''}`}
          onClick={() => setActiveTab('fixtures')}
        >
          📅 Fixtures
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'stats' && (
        <>
          {/* Stats Grid */}
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

          {/* Two Column Layout */}
          <div className="dashboard-grid">
            {/* Left Column - Upcoming Fixtures */}
            <div className="dashboard-card">
              <h2>📅 Upcoming Fixtures</h2>
              {loading ? (
                <div className="empty-state">
                  <p>Loading fixtures...</p>
                </div>
              ) : upcomingMatches.length > 0 ? (
                <div className="fixtures-list">
                  {upcomingMatches.map(match => (
                    <div key={match.id} className="fixture-item">
                      <span className="fixture-teams">
                        {getTeamName(match.homeTeamId)} vs {getTeamName(match.awayTeamId)}
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

            {/* Right Column - Recent Results */}
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
                        {getTeamName(result.homeTeamId)} vs {getTeamName(result.awayTeamId)}
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

          {/* Team Stats Section */}
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
        <div className="dashboard-card">
          <h2>📅 Full Fixtures</h2>
          <div className="empty-state">
            <p>Fixtures page coming soon</p>
            <span className="empty-hint">All fixtures will be displayed here</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClubDashboard;