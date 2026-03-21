import React, { useState, useEffect } from 'react';
import { fetchFixturesWithTeamNames } from '../../utils/fetchFixtures';
import './Fixtures.css';

const Fixtures = () => {
  const [fixtures, setFixtures] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'completed'

  useEffect(() => {
    const loadFixtures = async () => {
      try {
        let fixtures;
        if (filter === 'upcoming') {
          fixtures = await fetchFixturesWithTeamNames({ filter: 'upcoming' });
        } else if (filter === 'completed') {
          fixtures = await fetchFixturesWithTeamNames({ filter: 'completed' });
        } else {
          fixtures = await fetchFixturesWithTeamNames({ filter: 'all' });
        }
        
        setFixtures(fixtures);
      } catch (error) {
        console.error('Error loading fixtures:', error);
      }
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

      {fixtures.length > 0 ? (
        <div className="fixtures-list">
          {Object.entries(groupedFixtures).map(([monthYear, monthFixtures]) => (
            <div key={monthYear} className="month-group">
              <h2 className="month-title">{monthYear}</h2>
              <div className="month-fixtures">
                {monthFixtures.map(fixture => (
                  <div key={fixture.id} className="fixture-card">
                    <div className="fixture-date">
                      {new Date(fixture.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    
                    <div className="fixture-teams-container">
                      <span className="team-name home-team">{fixture.homeTeamName}</span>
                      <span className="vs-badge">VS</span>
                      <span className="team-name away-team">{fixture.awayTeamName}</span>
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