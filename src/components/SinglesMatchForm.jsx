import React, { useState, useEffect } from 'react';
import './MatchForm.css'; // Reuse the same CSS

function SinglesMatchForm({ 
  seasons, 
  members, 
  onSubmit, 
  onCancel,
  initialData = null 
}) {
  const [formData, setFormData] = useState({
    seasonId: initialData?.seasonId || '',
    date: initialData?.date || '',
    homePlayerId: initialData?.homePlayerId || '',
    awayPlayerId: initialData?.awayPlayerId || '',
    homeScore: initialData?.homeScore || '',
    awayScore: initialData?.awayScore || '',
    status: initialData?.status || 'scheduled',
    matchType: 'singles'
  });

  const [homePlayerSearch, setHomePlayerSearch] = useState('');
  const [awayPlayerSearch, setAwayPlayerSearch] = useState('');

  // Only include active and non-playing members (exclude inactive)
  const availablePlayers = members.filter(m => m.status !== 'inactive');

  const filteredHomePlayers = availablePlayers.filter(member =>
    `${member.surname} ${member.firstNames}`.toLowerCase().includes(homePlayerSearch.toLowerCase())
  );

  const filteredAwayPlayers = availablePlayers.filter(member =>
    `${member.surname} ${member.firstNames}`.toLowerCase().includes(awayPlayerSearch.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Find club for a player
  const getPlayerClub = (playerId) => {
    const player = members.find(m => m.id === playerId);
    return player?.clubId || '';
  };

  return (
    <div className="match-form-container">
      <h3>Schedule Singles Match</h3>
      
      <form onSubmit={handleSubmit} className="match-form">
        <div className="form-row">
          <div className="form-group">
            <label>Season *</label>
            <select
              value={formData.seasonId}
              onChange={(e) => setFormData({...formData, seasonId: e.target.value})}
              required
            >
              <option value="">Select Season</option>
              {seasons
                .filter(s => s.type === 'singles' || s.type.includes('singles'))
                .map(season => (
                  <option key={season.id} value={season.id}>
                    {season.name} (Singles)
                  </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="match-teams">
          {/* Home Player */}
          <div className="team-section">
            <h4>Home Player</h4>
            
            <div className="player-selection">
              <input
                type="text"
                placeholder="Search players..."
                value={homePlayerSearch}
                onChange={(e) => setHomePlayerSearch(e.target.value)}
                className="player-search"
              />
              
              <div className="player-list">
                {filteredHomePlayers.map(member => (
                  <label key={member.id} className="player-checkbox">
                    <input
                      type="radio"
                      name="homePlayer"
                      checked={formData.homePlayerId === member.id}
                      onChange={() => setFormData({...formData, homePlayerId: member.id})}
                      required
                    />
                    <span className="player-name">
                      {member.surname}, {member.firstNames}
                    </span>
                    <span className="player-status">{member.status}</span>
                    <span className="player-club">{member.clubId}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Away Player */}
          <div className="team-section">
            <h4>Away Player</h4>
            
            <div className="player-selection">
              <input
                type="text"
                placeholder="Search players..."
                value={awayPlayerSearch}
                onChange={(e) => setAwayPlayerSearch(e.target.value)}
                className="player-search"
              />
              
              <div className="player-list">
                {filteredAwayPlayers.map(member => (
                  <label key={member.id} className="player-checkbox">
                    <input
                      type="radio"
                      name="awayPlayer"
                      checked={formData.awayPlayerId === member.id}
                      onChange={() => setFormData({...formData, awayPlayerId: member.id})}
                      required
                      disabled={member.id === formData.homePlayerId}
                    />
                    <span className="player-name">
                      {member.surname}, {member.firstNames}
                    </span>
                    <span className="player-status">{member.status}</span>
                    <span className="player-club">{member.clubId}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Home Score</label>
            <input
              type="number"
              min="0"
              value={formData.homeScore}
              onChange={(e) => setFormData({...formData, homeScore: e.target.value})}
              placeholder="Score"
            />
          </div>

          <div className="form-group">
            <label>Away Score</label>
            <input
              type="number"
              min="0"
              value={formData.awayScore}
              onChange={(e) => setFormData({...formData, awayScore: e.target.value})}
              placeholder="Score"
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="submit-btn">
            Schedule Singles Match
          </button>
        </div>
      </form>
    </div>
  );
}

export default SinglesMatchForm;