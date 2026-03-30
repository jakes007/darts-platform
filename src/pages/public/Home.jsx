import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import './Home.css';

function Home() {
  const [stats, setStats] = useState({
    totalPlayers: 0,
    totalClubs: 0,
    totalTeams: 0,
    totalMatches: 0
  });
  
  const [topPlayers, setTopPlayers] = useState([]);
  const [upcomingFixtures, setUpcomingFixtures] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get total players
        const playersSnapshot = await getDocs(collection(db, 'members'));
        const totalPlayers = playersSnapshot.size;
  
        // Get total clubs
        const clubsSnapshot = await getDocs(collection(db, 'clubs'));
        const totalClubs = clubsSnapshot.size;
  
        // Get total teams
        const teamsSnapshot = await getDocs(collection(db, 'teams'));
        const totalTeams = teamsSnapshot.size;
  
        // Get total matches
        const matchesSnapshot = await getDocs(collection(db, 'matches'));
        const totalMatches = matchesSnapshot.size;
  
        setStats({
          totalPlayers,
          totalClubs,
          totalTeams,
          totalMatches
        });

        // Get today's date for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Fetch ALL matches
        const allMatchesQuery = query(
          collection(db, 'matches'),
          orderBy('date', 'desc')
        );
        
        const allMatchesSnapshot = await getDocs(allMatchesQuery);
        
        // Process matches and fetch team names
        const upcoming = [];
        const results = [];
        
        // First, get all team data for caching
        const teamsCache = {};
        const allTeamsSnapshot = await getDocs(collection(db, 'teams'));  // Different name
        allTeamsSnapshot.docs.forEach(doc => {
          teamsCache[doc.id] = doc.data();
        });
        // Process each match
        for (const doc of allMatchesSnapshot.docs) {
          const match = { id: doc.id, ...doc.data() };
match.homeTeamName = teamsCache[match.homeTeamId]?.name || match.homeTeamId;
match.awayTeamName = teamsCache[match.awayTeamId]?.name || match.awayTeamId;
match.status = getMatchStatus(match);
          
          // Add team names
          match.homeTeamName = teamsCache[match.homeTeamId]?.name || match.homeTeamId;
          match.awayTeamName = teamsCache[match.awayTeamId]?.name || match.awayTeamId;
          
          // Determine if it's upcoming or result based on date and scores
          const matchDate = match.date;
          const hasScores = match.homeScore !== undefined && match.awayScore !== undefined && 
                           (match.homeScore !== null || match.awayScore !== null);
          
          if (matchDate >= todayStr && !hasScores) {
            upcoming.push(match);
          } else {
            results.push(match);
          }
        }

        // Sort upcoming by date ascending (closest first)
        upcoming.sort((a, b) => a.date.localeCompare(b.date));
        
        // Sort results by date descending (most recent first)
        results.sort((a, b) => b.date.localeCompare(a.date));

        // Take only first 4 for preview
        setUpcomingFixtures(upcoming.slice(0, 4));
        setRecentResults(results.slice(0, 4));
  
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    // Helper to determine match status
const getMatchStatus = (match) => {
  const hasAnyScores = match.homeScore !== undefined && match.awayScore !== undefined;
  const isCompleted = match.status === 'completed';
  
  if (isCompleted) {
    return 'completed';
  } else if (hasAnyScores && (match.homeScore !== '?' || match.awayScore !== '?')) {
    return 'in_progress';
  } else {
    return 'upcoming';
  }
};
  
    fetchData();
  }, []);

  return (
    <div className="public-home">
      <section className="hero-section">
        <h1>Welcome to Observatory Darts Association</h1>
        <p>THE HOME OF CHAMPIONS</p>
      </section>

      <section className="stats-section">
        <h2>Quick Stats</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">PLAYERS</span>
            <span className="stat-number">{loading ? '...' : stats.totalPlayers || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">CLUBS</span>
            <span className="stat-number">{loading ? '...' : stats.totalClubs || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">TEAMS</span>
            <span className="stat-number">{loading ? '...' : stats.totalTeams || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">MATCHES</span>
            <span className="stat-number">{loading ? '...' : stats.totalMatches || 0}</span>
          </div>
        </div>
      </section>

      <section className="leaderboard-preview">
        <h2>Top Players by Average</h2>
        {loading ? (
          <div className="empty-state">
            <p>Loading...</p>
          </div>
        ) : topPlayers.length > 0 ? (
          <>
            <div className="leaderboard-header">
              <span>POS</span>
              <span>PLAYER</span>
              <span>CLUB</span>
              <span>AVE</span>
            </div>
            <div className="leaderboard-list">
              {topPlayers.map((player, index) => (
                <div key={player.id} className="leaderboard-item">
                  <span className="rank">{index + 1}</span>
                  <span className="player-name">{player.firstNames} {player.surname}</span>
                  <span className="player-club">{player.clubId || '—'}</span>
                  <span className="player-average">{player.average || '—'}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>No player statistics available yet</p>
            <span className="empty-hint">Stats will appear once matches have been played</span>
          </div>
        )}
        <a href="/leaderboards" className="view-all-link">VIEW FULL LEADERBOARDS →</a>
      </section>

      <div className="fixtures-results-grid">
        <section className="fixtures-preview">
          <h2>Upcoming Fixtures</h2>
          {loading ? (
            <div className="empty-state">
              <p>Loading...</p>
            </div>
          ) : upcomingFixtures.length > 0 ? (
            <div className="fixtures-list">
  <div className="fixture-header">
    <span>MATCH</span>
    <span>DATE</span>
  </div>
  {upcomingFixtures.map(fixture => (
    <div key={fixture.id} className="fixture-item">
      <span className="fixture-teams">
        {fixture.homeTeamName} vs {fixture.awayTeamName}
      </span>
      <span className="fixture-date">
        {new Date(fixture.date).toLocaleDateString('en-ZA', { 
          day: '2-digit', 
          month: 'short' 
        })}
      </span>
    </div>
  ))}
</div>
          ) : (
            <div className="empty-state">
              <p>No fixtures scheduled yet</p>
              <span className="empty-hint">Fixtures will appear here once scheduled</span>
            </div>
          )}
          <a href="/fixtures" className="view-all-link">VIEW ALL FIXTURES →</a>
        </section>

        <section className="results-simple">
  <h2>Recent Results</h2>
  {loading ? (
    <p>Loading...</p>
  ) : recentResults.length > 0 ? (
    <div className="results-list-container">
      <div className="results-simple-list">
        <div className="result-simple-header">
          <span>MATCH</span>
          <span>SCORE</span>
        </div>
        {recentResults.map(result => (
          <div key={result.id} className="result-simple-item">
            <span className="result-teams">
              {result.homeTeamName} vs {result.awayTeamName}
              {result.status === 'in_progress' && (
                <span className="status-dot in-progress"></span>
              )}
            </span>
            <span className="result-score">
  {result.homeScore || 0} - {result.awayScore || 0}
</span>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <p>No results recorded yet</p>
  )}
  <a href="/results" className="view-all-link">VIEW ALL RESULTS →</a>
</section>
      </div>
    </div>
  );
}

export default Home;