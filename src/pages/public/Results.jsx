import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import './Results.css';
import { useNavigate } from 'react-router-dom';

function Results() {
  const [allMatches, setAllMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'live', 'completed', 'upcoming'
  const [loading, setLoading] = useState(true);
  const [teamCache, setTeamCache] = useState({});
  const navigate = useNavigate();

  // Fetch team name by ID
  const getTeamName = (teamId) => {
    return teamCache[teamId]?.name || teamId;
  };

  // Get season name and format
  const getSeasonName = (seasonId, seasons) => {
    const season = seasons.find(s => s.id === seasonId);
    return season?.name || 'Unknown Competition';
  };

  const getSeasonFormat = (seasonId, seasons) => {
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

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      // Fetch teams and seasons once
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      const teamsMap = {};
      teamsSnapshot.forEach(doc => {
        teamsMap[doc.id] = doc.data();
      });
      setTeamCache(teamsMap);
      
      const seasonsSnapshot = await getDocs(collection(db, 'seasons'));
      const seasonsMap = [];
      seasonsSnapshot.forEach(doc => {
        seasonsMap.push({ id: doc.id, ...doc.data() });
      });
      
      // Set up real-time listener for matches
      const matchesQuery = query(collection(db, 'matches'), orderBy('date', 'desc'));
      
      const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
        const matches = [];
        
        for (const doc of snapshot.docs) {
          const match = { id: doc.id, ...doc.data() };
          
          // Determine match status
          const isComplete = !!(match.playerOfTheMatch?.home && match.playerOfTheMatch?.away);
          const hasStarted = match.games?.some(game => {
            return (game.homeThrows && game.homeThrows.length > 0) ||
                   (game.awayThrows && game.awayThrows.length > 0) ||
                   game.homeCompleted ||
                   game.awayCompleted;
          }) || false;
          
          let status = 'upcoming';
          if (isComplete) {
            status = 'completed';
          } else if (hasStarted) {
            status = 'live';
          } else {
            status = 'upcoming';
          }
          
          // Find season name and format
          const season = seasonsMap.find(s => s.id === match.seasonId);
          
          matches.push({
            ...match,
            homeTeamName: teamsMap[match.homeTeamId]?.name || match.homeTeamId,
            awayTeamName: teamsMap[match.awayTeamId]?.name || match.awayTeamId,
            seasonName: season?.name || 'Unknown Competition',
            seasonFormat: getSeasonFormat(match.seasonId, seasonsMap),
            status: status,
            hasStarted: hasStarted,
            isComplete: isComplete
          });
        }
        
        setAllMatches(matches);
        setLoading(false);
      });
      
      return () => unsubscribe();
    };
    
    fetchData();
  }, []);
  
  // Filter matches when filter changes
  useEffect(() => {
    if (filter === 'all') {
      setFilteredMatches(allMatches);
    } else {
      setFilteredMatches(allMatches.filter(match => match.status === filter));
    }
  }, [filter, allMatches]);
  
  // Get counts for tabs
  const liveCount = allMatches.filter(m => m.status === 'live').length;
  const completedCount = allMatches.filter(m => m.status === 'completed').length;
  const upcomingCount = allMatches.filter(m => m.status === 'upcoming').length;
  
  // Group matches by status for display
  const liveMatches = filteredMatches.filter(m => m.status === 'live');
  const completedMatches = filteredMatches.filter(m => m.status === 'completed');
  const upcomingMatches = filteredMatches.filter(m => m.status === 'upcoming');
  
  if (loading) {
    return (
      <div className="results-container">
        <div className="loading-state">
          <p>Loading matches...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="results-container">
      <div className="results-header">
        <h1>Match Results & Fixtures</h1>
        <p className="results-subtitle">View all matches, live scores, and completed results</p>
      </div>
      
      {/* Filter Tabs */}
      <div className="results-filter-tabs">
        <button 
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
          <span className="filter-count">{allMatches.length}</span>
        </button>
        <button 
          className={`filter-tab live-tab ${filter === 'live' ? 'active' : ''}`}
          onClick={() => setFilter('live')}
        >
          🔴 LIVE
          <span className="filter-count live-count">{liveCount}</span>
        </button>
        <button 
          className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed
          <span className="filter-count">{completedCount}</span>
        </button>
        <button 
          className={`filter-tab ${filter === 'upcoming' ? 'active' : ''}`}
          onClick={() => setFilter('upcoming')}
        >
          Upcoming
          <span className="filter-count">{upcomingCount}</span>
        </button>
      </div>
      
      {/* LIVE Matches Section */}
      {(filter === 'all' || filter === 'live') && liveMatches.length > 0 && (
        <div className="results-section">
          <h2 className="section-title live-title">
            🔴 LIVE ({liveMatches.length})
          </h2>
          <div className="matches-list">
            {liveMatches.map(match => (
              <div key={match.id} className="match-card live-card">
                <div className="match-header">
                  <span className="match-date">
                    {new Date(match.date).toLocaleDateString('en-ZA', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="match-status live-status">LIVE</span>
                </div>
                <div className="match-teams">
                  <span className="team-home">{match.homeTeamName}</span>
                  <span className="vs">VS</span>
                  <span className="team-away">{match.awayTeamName}</span>
                </div>
                <div className="match-score live-score">
                  <span className="current-score-label">Current Score:</span>
                  <span className="score-value">{match.homeScore || 0} - {match.awayScore || 0}</span>
                </div>
                <div className="match-competition">
                  <span className="competition-name">{match.seasonName}</span>
                  <span className="format-badge">{match.seasonFormat}</span>
                </div>
                <div className="match-message">
                  <span className="info-message">⚡ Match in progress</span>
                </div>

                <div className="match-actions">
  <button 
    className="watch-live-btn"
    onClick={() => navigate(`/game-selection/${match.id}`)}
  >
    Watch Live
  </button>
</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* COMPLETED Matches Section */}
      {(filter === 'all' || filter === 'completed') && completedMatches.length > 0 && (
        <div className="results-section">
          <h2 className="section-title completed-title">
            ✅ Completed ({completedMatches.length})
          </h2>
          <div className="matches-list">
            {completedMatches.map(match => (
              <div key={match.id} className="match-card completed-card">
                <div className="match-header">
                  <span className="match-date">
                    {new Date(match.date).toLocaleDateString('en-ZA', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="match-status completed-status">COMPLETED</span>
                </div>
                <div className="match-teams">
                  <span className="team-home">{match.homeTeamName}</span>
                  <span className="vs">VS</span>
                  <span className="team-away">{match.awayTeamName}</span>
                </div>
                <div className="match-score final-score">
                  <span className="final-score-label">Final Score:</span>
                  <span className="score-value final">{match.homeScore || 0} - {match.awayScore || 0}</span>
                </div>
                <div className="match-competition">
                  <span className="competition-name">{match.seasonName}</span>
                  <span className="format-badge">{match.seasonFormat}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* UPCOMING Matches Section */}
      {(filter === 'all' || filter === 'upcoming') && upcomingMatches.length > 0 && (
        <div className="results-section">
          <h2 className="section-title upcoming-title">
            📅 Upcoming ({upcomingMatches.length})
          </h2>
          <div className="matches-list">
            {upcomingMatches.map(match => (
              <div key={match.id} className="match-card upcoming-card">
                <div className="match-header">
                  <span className="match-date">
                    {new Date(match.date).toLocaleDateString('en-ZA', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="match-status upcoming-status">SCHEDULED</span>
                </div>
                <div className="match-teams">
                  <span className="team-home">{match.homeTeamName}</span>
                  <span className="vs">VS</span>
                  <span className="team-away">{match.awayTeamName}</span>
                </div>
                <div className="match-competition">
                  <span className="competition-name">{match.seasonName}</span>
                  <span className="format-badge">{match.seasonFormat}</span>
                </div>
                <div className="match-message">
                  <span className="info-message">📅 Match not started yet</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {filteredMatches.length === 0 && (
        <div className="empty-state">
          <p>No matches found for the selected filter</p>
          <span className="empty-hint">Try selecting a different filter</span>
        </div>
      )}
    </div>
  );
}

export default Results;