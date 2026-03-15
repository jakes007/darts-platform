import React, { useState, useEffect } from 'react';
import './MatchForm.css';

function MatchForm({ 
  seasons, 
  teams, 
  members, 
  onSubmit, 
  onCancel,
  initialData = null 
}) {
  const [formData, setFormData] = useState({
    seasonId: initialData?.seasonId || '',
    date: initialData?.date || '',
    homeTeamId: initialData?.homeTeamId || '',
    awayTeamId: initialData?.awayTeamId || '',
    homePlayers: initialData?.homePlayers || [],
    awayPlayers: initialData?.awayPlayers || [],
    status: initialData?.status || 'scheduled'
  });

  const [availableHomePlayers, setAvailableHomePlayers] = useState([]);
  const [availableAwayPlayers, setAvailableAwayPlayers] = useState([]);
  const [homePlayerSearch, setHomePlayerSearch] = useState('');
  const [awayPlayerSearch, setAwayPlayerSearch] = useState('');

  // Filter players when teams are selected
useEffect(() => {
  if (formData.homeTeamId) {
    const team = teams.find(t => t.id === formData.homeTeamId);
    // Only include ACTIVE and NON-PLAYING members
    const clubMembers = members.filter(m => 
      m.clubId === team?.clubId && 
      m.status !== 'inactive'  // ← Exclude inactive
    );
    setAvailableHomePlayers(clubMembers);
  }
}, [formData.homeTeamId, members, teams]);

useEffect(() => {
  if (formData.awayTeamId) {
    const team = teams.find(t => t.id === formData.awayTeamId);
    // Only include ACTIVE and NON-PLAYING members
    const clubMembers = members.filter(m => 
      m.clubId === team?.clubId && 
      m.status !== 'inactive'  // ← Exclude inactive
    );
    setAvailableAwayPlayers(clubMembers);
  }
}, [formData.awayTeamId, members, teams]);

  const handlePlayerToggle = (team, playerId) => {
    const field = team === 'home' ? 'homePlayers' : 'awayPlayers';
    const currentPlayers = formData[field];
    
    if (currentPlayers.includes(playerId)) {
      setFormData({
        ...formData,
        [field]: currentPlayers.filter(id => id !== playerId)
      });
    } else {
      setFormData({
        ...formData,
        [field]: [...currentPlayers, playerId]
      });
    }
  };

  const filteredHomePlayers = availableHomePlayers.filter(member =>
    member.surname?.toLowerCase().includes(homePlayerSearch.toLowerCase()) ||
    member.firstNames?.toLowerCase().includes(homePlayerSearch.toLowerCase())
  );

  const filteredAwayPlayers = availableAwayPlayers.filter(member =>
    member.surname?.toLowerCase().includes(awayPlayerSearch.toLowerCase()) ||
    member.firstNames?.toLowerCase().includes(awayPlayerSearch.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // In MatchForm.jsx onSubmit
const matchData = {
  ...formData,
  date: formData.date, // This is already YYYY-MM-DD from the input
  // Don't add any time
};

  return (
    <div className="match-form-container">
      <h3>{initialData ? 'Edit Match' : 'Schedule New Match'}</h3>
      
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
              {seasons.map(season => (
                <option key={season.id} value={season.id}>
                  {season.name} ({season.type})
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
          {/* Home Team */}
          <div className="team-section">
            <h4>Home Team</h4>
            <select
              value={formData.homeTeamId}
              onChange={(e) => setFormData({...formData, homeTeamId: e.target.value})}
              required
            >
              <option value="">Select Home Team</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>

            {formData.homeTeamId && (
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
                        type="checkbox"
                        checked={formData.homePlayers.includes(member.id)}
                        onChange={() => handlePlayerToggle('home', member.id)}
                      />
                      <span className="player-name">
                        {member.surname}, {member.firstNames}
                      </span>
                      <span className="player-status">{member.status}</span>
                    </label>
                  ))}
                </div>
                <div className="player-count">
                  Selected: {formData.homePlayers.length} players
                </div>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="team-section">
            <h4>Away Team</h4>
            <select
              value={formData.awayTeamId}
              onChange={(e) => setFormData({...formData, awayTeamId: e.target.value})}
              required
            >
              <option value="">Select Away Team</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>

            {formData.awayTeamId && (
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
                        type="checkbox"
                        checked={formData.awayPlayers.includes(member.id)}
                        onChange={() => handlePlayerToggle('away', member.id)}
                      />
                      <span className="player-name">
                        {member.surname}, {member.firstNames}
                      </span>
                      <span className="player-status">{member.status}</span>
                    </label>
                  ))}
                </div>
                <div className="player-count">
                  Selected: {formData.awayPlayers.length} players
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="submit-btn wide-btn">
            {initialData ? 'Update Match' : 'Schedule Match'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MatchForm;