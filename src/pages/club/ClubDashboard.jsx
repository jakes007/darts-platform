import React, { useState, useEffect } from 'react';
import { useUserView } from '../../context/UserViewContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import ProfileTab from '../../components/ProfileTab';
import './ClubDashboard.css';

function ClubDashboard() {
  const { currentViewingUser, getClubName } = useUserView();
  const [activeTab, setActiveTab] = useState('stats');
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const debugMatches = async () => {
      if (!currentViewingUser) return;
      
      console.log('User clubId:', currentViewingUser.clubId);
      
      // Find teams in this club
      const teamsQuery = query(
        collection(db, 'teams'),
        where('clubId', '==', currentViewingUser.clubId)
      );
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamIds = teamsSnapshot.docs.map(doc => {
        console.log('Team in club:', doc.id, doc.data());
        return doc.id;
      });
      
      if (teamIds.length === 0) {
        console.log('No teams found for this club');
        return;
      }
      
      // Find matches for these teams
      const matchesQuery = query(
        collection(db, 'matches'),
        where('homeTeamId', 'in', teamIds)
      );
      const matchesSnapshot = await getDocs(matchesQuery);
      console.log('Matches found:', matchesSnapshot.size);
      matchesSnapshot.forEach(doc => {
        console.log('Match:', doc.id, doc.data());
      });
    };
    
    debugMatches();
  }, [currentViewingUser]);

  useEffect(() => {
    const fetchMatches = async () => {
      if (!currentViewingUser) return;
      
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        let teamIds = [];
        
        console.log('Fetching matches for user:', currentViewingUser);
        
        // If user has a teamId, use that specific team
        if (currentViewingUser.teamId) {
          console.log('User has teamId:', currentViewingUser.teamId);
          teamIds = [currentViewingUser.teamId];
        } 
        // Otherwise, find all teams in their club
        else if (currentViewingUser.clubId) {
          console.log('User has clubId:', currentViewingUser.clubId);
          const teamsQuery = query(
            collection(db, 'teams'),
            where('clubId', '==', currentViewingUser.clubId)
          );
          const teamsSnapshot = await getDocs(teamsQuery);
          teamIds = teamsSnapshot.docs.map(doc => {
            console.log('Found team:', doc.id, doc.data());
            return doc.id;
          });
        } else {
          console.log('User has no teamId or clubId');
          return;
        }
  
        if (teamIds.length === 0) {
          console.log('No teams found for this user');
          return;
        }
  
        console.log('Team IDs to query:', teamIds);
  
        // Fetch upcoming matches (scheduled, date >= today)
        const upcomingQuery = query(
          collection(db, 'matches'),
          where('homeTeamId', 'in', teamIds),
          where('date', '>=', today),
          where('status', '==', 'scheduled')
        );
        const upcomingSnapshot = await getDocs(upcomingQuery);
        const upcoming = [];
        upcomingSnapshot.forEach(doc => {
          console.log('Found upcoming match:', doc.id, doc.data());
          upcoming.push({ id: doc.id, ...doc.data() });
        });
        setUpcomingMatches(upcoming);
  
        // Fetch recent results (completed matches)
        const resultsQuery = query(
          collection(db, 'matches'),
          where('homeTeamId', 'in', teamIds),
          where('status', '==', 'completed')
        );
        const resultsSnapshot = await getDocs(resultsQuery);
        const results = [];
        resultsSnapshot.forEach(doc => {
          console.log('Found result:', doc.id, doc.data());
          results.push({ id: doc.id, ...doc.data() });
        });
        setRecentResults(results);
  
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchMatches();
  }, [currentViewingUser]);

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
                        {match.homeTeamId} vs {match.awayTeamId}
                      </span>
                      <span className="fixture-date">
                        {new Date(match.date).toLocaleDateString()}
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
                        {result.homeTeamId} vs {result.awayTeamId}
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