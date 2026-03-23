import React, { useState } from 'react';
import './MatchForm.css';

function MatchForm({ 
  seasons, 
  teams, 
  onSubmit, 
  onCancel,
  initialData = null 
}) {
  const [formData, setFormData] = useState({
    seasonId: initialData?.seasonId || '',
    date: initialData?.date || '',
    homeTeamId: initialData?.homeTeamId || '',
    awayTeamId: initialData?.awayTeamId || '',
    matchFormat: initialData?.matchFormat || 'standard', // standard or round_robin
    status: initialData?.status || 'scheduled'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="match-form-container">
      <h3>{initialData ? 'Edit Match' : 'Schedule Team Match'}</h3>
      
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
                .filter(s => s.type !== 'singles')
                .map(season => (
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

        <div className="form-row">
          <div className="form-group">
            <label>Match Format</label>
            <select
              value={formData.matchFormat}
              onChange={(e) => setFormData({...formData, matchFormat: e.target.value})}
            >
              <option value="standard">Standard (Singles, Doubles, Legs)</option>
              <option value="round_robin">Round Robin (Each player plays each opponent)</option>
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
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="submit-btn">
            {initialData ? 'Update Match' : 'Schedule Match'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MatchForm;