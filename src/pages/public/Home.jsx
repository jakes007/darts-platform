import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc, onSnapshot } from 'firebase/firestore';
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
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper functions for season details
const getSeasonName = (seasonId) => {
  const season = seasons.find(s => s.id === seasonId);
  return season?.name || 'Unknown Competition';
};

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

useEffect(() => {
  // Set up real-time listener for matches
  const matchesQuery = query(collection(db, 'matches'), orderBy('date', 'desc'));
  
  const unsubscribe = onSnapshot(matchesQuery, async (snapshot) => {
    try {
      // Get total players (static count - doesn't change often)
      const playersSnapshot = await getDocs(collection(db, 'members'));
      const totalPlayers = playersSnapshot.size;
      
      // Get total clubs
      const clubsSnapshot = await getDocs(collection(db, 'clubs'));
      const totalClubs = clubsSnapshot.size;
      
      // Get total teams
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      const totalTeams = teamsSnapshot.size;
      
      setStats({
        totalPlayers,
        totalClubs,
        totalTeams,
        totalMatches: snapshot.size
      });
      
      // Fetch seasons for competition names
      const seasonsSnapshot = await getDocs(collection(db, 'seasons'));
      const seasonsData = [];
      seasonsSnapshot.forEach(doc => {
        seasonsData.push({ id: doc.id, ...doc.data() });
      });
      setSeasons(seasonsData);
      
      // Fetch team data for caching
      const allTeamsSnapshot = await getDocs(collection(db, 'teams'));
      const teamsCache = {};
      allTeamsSnapshot.docs.forEach(doc => {
        teamsCache[doc.id] = doc.data();
      });
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      const upcoming = [];
      const results = [];
      
      // Helper to determine match status
      const getMatchStatus = (match) => {
        const isComplete = !!(match.playerOfTheMatch?.home && match.playerOfTheMatch?.away);
        const hasStarted = match.games?.some(game => {
          return (game.homeThrows && game.homeThrows.length > 0) ||
                 (game.awayThrows && game.awayThrows.length > 0) ||
                 game.homeCompleted ||
                 game.awayCompleted;
        }) || false;
        
        if (isComplete) return 'completed';
        if (hasStarted) return 'in_progress';
        return 'upcoming';
      };
      
      // Process each match from real-time snapshot
      for (const doc of snapshot.docs) {
        const match = { id: doc.id, ...doc.data() };
        
        // Add team names
        match.homeTeamName = teamsCache[match.homeTeamId]?.name || match.homeTeamId;
        match.awayTeamName = teamsCache[match.awayTeamId]?.name || match.awayTeamId;
        match.status = getMatchStatus(match);
        
        // Determine if match has started or is complete
        const hasStarted = match.games?.some(game => {
          return (game.homeThrows && game.homeThrows.length > 0) ||
                 (game.awayThrows && game.awayThrows.length > 0) ||
                 game.homeCompleted ||
                 game.awayCompleted;
        }) || false;
        
        const isComplete = !!(match.playerOfTheMatch?.home && match.playerOfTheMatch?.away);
        const matchDate = match.date;
        
        // Show in results if: completed OR has started OR has scores
        const hasScores = match.homeScore !== undefined && match.awayScore !== undefined;
        const showInResults = isComplete || hasStarted || hasScores;
        
        if (showInResults) {
          results.push(match);
        } else if (matchDate >= todayStr) {
          upcoming.push(match);
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
      console.error('Error in real-time listener:', error);
    } finally {
      setLoading(false);
    }
  });
  
  // Cleanup subscription on unmount
  return () => unsubscribe();
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
        {upcomingFixtures.map(fixture => (
          <div key={fixture.id} className="fixture-item-detailed">
            <div className="fixture-item">
              <div className="fixture-date-desktop">
                {new Date(fixture.date).toLocaleDateString('en-ZA', { 
                  day: '2-digit', 
                  month: 'short' 
                })}
              </div>
              <div className="fixture-teams">
                {fixture.homeTeamName} vs {fixture.awayTeamName}
              </div>
              <div className="fixture-date-mobile">
                {new Date(fixture.date).toLocaleDateString('en-ZA', { 
                  day: '2-digit', 
                  month: 'short' 
                })}
              </div>
            </div>
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
    <div className="empty-state">
      <p>Loading...</p>
    </div>
  ) : recentResults.length > 0 ? (
    <>
      {recentResults.slice(0, 4).map(result => (
        <div key={result.id} className="result-item-detailed">
          <div className="result-main-row">
            <span className="result-teams">
              {result.homeTeamName} vs {result.awayTeamName}
              {(() => {
                const isComplete = !!(result.playerOfTheMatch?.home && result.playerOfTheMatch?.away);
                const showDot = !isComplete && (result.homeScore !== undefined || result.awayScore !== undefined);
                return showDot && <span className="status-dot in-progress"></span>;
              })()}
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
    </>
  ) : (
    <div className="empty-state">
      <p>No results recorded yet</p>
      <span className="empty-hint">Results will appear once matches are played</span>
    </div>
  )}
  <a href="/results" className="view-all-link">VIEW ALL RESULTS →</a>
</section>
      </div>
    </div>
  );
}

export default Home;