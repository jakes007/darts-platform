import React, { useState } from 'react';
import './MatchForm.css';

function SinglesMatchForm({ 
  seasons, 
  onSubmit, 
  onCancel,
  initialData = null 
}) {
  const [formData, setFormData] = useState({
    seasonId: initialData?.seasonId || '',
    date: initialData?.date || '',
    status: initialData?.status || 'scheduled',
    matchType: 'singles'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
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
          <p className="singles-note">Note: Singles matches will require players to be selected during lineup submission.</p>
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