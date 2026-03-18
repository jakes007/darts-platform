import React, { useState, useEffect } from 'react';
import { fetchFixturesWithTeamNames } from '../../utils/fetchFixtures';
import './Fixtures.css';

const Fixtures = () => {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'completed'

  useEffect(() => {
    const loadFixtures = async () => {
      setLoading(true);
      
      let fixtures;
      if (filter === 'upcoming') {
        fixtures = await fetchFixturesWithTeamNames({
          status: 'scheduled',
          dateFilter: true
        });
      } else if (filter === 'completed') {
        fixtures = await fetchFixturesWithTeamNames({
          status: 'completed',
          dateFilter: false
        });
      } else {
        // Get all fixtures
        const upcoming = await fetchFixturesWithTeamNames({
          status: 'scheduled',
          dateFilter: true
        });
        const completed = await fetchFixturesWithTeamNames({
          status: 'completed',
          dateFilter: false
        });
        fixtures = [...upcoming, ...completed].sort((a, b) => new Date(b.date) - new Date(a.date));
      }
      
      setFixtures(fixtures);
      setLoading(false);
    };

    loadFixtures();
  }, [filter]);

  // Group fixtures by month
  const groupedFixtures = fixtures.reduce((groups, fixture) => {
    const date = new Date(fixture.date);
    const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(fixture);
    return groups;
  }, {});

  return (
    <div className="fixtures-page">
      <div className="page-header">
        <h1>Fixtures & Results</h1>
        
        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </button>
          <button 
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading fixtures...</div>
      ) : fixtures.length > 0 ? (
        <div className="fixtures-list">
          {Object.entries(groupedFixtures).map(([monthYear, monthFixtures]) => (
            <div key={monthYear} className="month-group">
              <h2 className="month-title">{monthYear}</h2>
              <div className="month-fixtures">
                {monthFixtures.map(fixture => (
                  <div key={fixture.id} className="fixture-item">
                    <div className="fixture-date">
                      {new Date(fixture.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    
                    <div className="fixture-details">
                      <div className="teams">
                        <div className="team home">
                          {fixture.homeTeamLogo && (
                            <img src={fixture.homeTeamLogo} alt={fixture.homeTeamName} className="team-logo" />
                          )}
                          <span className="team-name">{fixture.homeTeamName}</span>
                        </div>
                        
                        {fixture.status === 'completed' ? (
                          <div className="score">
                            <span className="home-score">{fixture.homeScore || 0}</span>
                            <span className="separator">-</span>
                            <span className="away-score">{fixture.awayScore || 0}</span>
                          </div>
                        ) : (
                          <div className="vs-badge">VS</div>
                        )}
                        
                        <div className="team away">
                          <span className="team-name">{fixture.awayTeamName}</span>
                          {fixture.awayTeamLogo && (
                            <img src={fixture.awayTeamLogo} alt={fixture.awayTeamName} className="team-logo" />
                          )}
                        </div>
                      </div>
                      
                      {fixture.location && (
                        <div className="fixture-location">
                          <span className="location-icon">📍</span>
                          {fixture.location}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-fixtures">
          <p>No fixtures found</p>
        </div>
      )}
    </div>
  );
};

export default Fixtures;