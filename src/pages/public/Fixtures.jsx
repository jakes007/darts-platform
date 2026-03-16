import React from 'react';
import './Fixtures.css';

function Fixtures() {
  return (
    <div className="public-fixtures">
      <h1>Fixtures</h1>
      
      <div className="fixtures-list-full">
        <h2>Week 1</h2>
        <div className="fixture-card">
          <span className="fixture-date">Sat 20 Mar 2026 - 19:00</span>
          <span className="fixture-teams">Guardians 1 vs Stallions</span>
          <span className="fixture-venue">Guardians Hall</span>
        </div>
        <div className="fixture-card">
          <span className="fixture-date">Sun 21 Mar 2026 - 15:00</span>
          <span className="fixture-teams">Best Of Order vs Cathkin</span>
          <span className="fixture-venue">Best Of Order Club</span>
        </div>
        
        <h2>Week 2</h2>
        <div className="fixture-card">
          <span className="fixture-date">Sat 27 Mar 2026 - 18:30</span>
          <span className="fixture-teams">West Point vs Eastside</span>
          <span className="fixture-venue">West Point Grounds</span>
        </div>
      </div>
    </div>
  );
}

export default Fixtures;