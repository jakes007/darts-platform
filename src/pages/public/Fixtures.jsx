import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import './Fixtures.css';

function Fixtures() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFixtures = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const fixturesQuery = query(
          collection(db, 'matches'),
          where('date', '>=', today),
          orderBy('date')
        );
        const snapshot = await getDocs(fixturesQuery);
        const fixturesData = [];
        snapshot.forEach((doc) => {
          fixturesData.push({ id: doc.id, ...doc.data() });
        });
        setFixtures(fixturesData);
      } catch (error) {
        console.error('Error fetching fixtures:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFixtures();
  }, []);

  // Group fixtures by date
  const groupedFixtures = fixtures.reduce((groups, fixture) => {
    const date = fixture.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(fixture);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedFixtures).sort();

  return (
    <div className="public-fixtures">
      <h1>Fixtures</h1>
      
      {loading ? (
        <div className="empty-state">
          <p>Loading fixtures...</p>
        </div>
      ) : fixtures.length > 0 ? (
        <div className="fixtures-list-full">
          {sortedDates.map(date => {
            const matchDate = new Date(date);
            const formattedDate = matchDate.toLocaleDateString('en-ZA', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long',
              year: 'numeric'
            });
            
            return (
              <div key={date} className="date-group">
                <h2>{formattedDate}</h2>
                {groupedFixtures[date].map(fixture => (
                  <div key={fixture.id} className="fixture-card">
                    <span className="fixture-time">
                      {new Date(fixture.date).toLocaleTimeString('en-ZA', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    <span className="fixture-teams">
                      {fixture.homeTeamId} vs {fixture.awayTeamId}
                    </span>
                    <span className="fixture-venue">Main Venue</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <p>No fixtures scheduled yet</p>
          <span className="empty-hint">Fixtures will appear here once scheduled by the league administrator</span>
        </div>
      )}
    </div>
  );
}

export default Fixtures;