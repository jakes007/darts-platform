import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import './Results.css';

function Results() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const resultsQuery = query(
          collection(db, 'matches'),
          where('status', '==', 'completed'),
          orderBy('date', 'desc')
        );
        const snapshot = await getDocs(resultsQuery);
        const resultsData = [];
        snapshot.forEach((doc) => {
          resultsData.push({ id: doc.id, ...doc.data() });
        });
        setResults(resultsData);
      } catch (error) {
        console.error('Error fetching results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  // Group results by date
  const groupedResults = results.reduce((groups, result) => {
    const date = result.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(result);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedResults).sort().reverse();

  return (
    <div className="public-results">
      <h1>Results</h1>
      
      {loading ? (
        <div className="empty-state">
          <p>Loading results...</p>
        </div>
      ) : results.length > 0 ? (
        <div className="results-list-full">
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
                {groupedResults[date].map(result => (
                  <div key={result.id} className="result-card">
                    <span className="result-teams">
                      {result.homeTeamId} vs {result.awayTeamId}
                    </span>
                    <span className="result-score">
                      {result.homeScore || '?'} - {result.awayScore || '?'}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <p>No results recorded yet</p>
          <span className="empty-hint">Match results will appear here once matches have been played</span>
        </div>
      )}
    </div>
  );
}

export default Results;