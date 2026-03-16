import React from 'react';
import './Results.css';

function Results() {
  return (
    <div className="public-results">
      <h1>Results</h1>
      
      <div className="results-list-full">
        <h2>Week 1</h2>
        <div className="result-card">
          <span className="result-date">Sat 20 Mar 2026</span>
          <span className="result-teams">Guardians 1 vs Stallions</span>
          <span className="result-score">8 - 4</span>
        </div>
        <div className="result-card">
          <span className="result-date">Sun 21 Mar 2026</span>
          <span className="result-teams">Best Of Order vs Cathkin</span>
          <span className="result-score">6 - 6</span>
        </div>
        
        <h2>Week 2</h2>
        <div className="result-card">
          <span className="result-date">Sat 27 Mar 2026</span>
          <span className="result-teams">West Point vs Eastside</span>
          <span className="result-score">10 - 2</span>
        </div>
      </div>
    </div>
  );
}

export default Results;