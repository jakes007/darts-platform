import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
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
    status: initialData?.status || 'scheduled'
  });
  
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [loadingSeason, setLoadingSeason] = useState(false);

    // Sort teams alphabetically by name
    const sortedTeams = [...teams].sort((a, b) => {
      const nameA = (a.name || '').toUpperCase();
      const nameB = (b.name || '').toUpperCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });

  // Fetch season details when season is selected
  useEffect(() => {
    const fetchSeason = async () => {
      if (formData.seasonId) {
        setLoadingSeason(true);
        try {
          const seasonDoc = await getDoc(doc(db, 'seasons', formData.seasonId));
          if (seasonDoc.exists()) {
            setSelectedSeason({ id: seasonDoc.id, ...seasonDoc.data() });
          } else {
            setSelectedSeason(null);
          }
        } catch (error) {
          console.error('Error fetching season:', error);
          setSelectedSeason(null);
        } finally {
          setLoadingSeason(false);
        }
      } else {
        setSelectedSeason(null);
      }
    };
    
    fetchSeason();
  }, [formData.seasonId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Get game count for standard format
  const getGameCount = () => {
    if (!selectedSeason?.matchFormat) return 0;
    return selectedSeason.matchFormat.length;
  };

  // Get total games for round robin
  const getRoundRobinGames = () => {
    if (!selectedSeason?.type) return 0;
    const playersPerTeam = parseInt(selectedSeason.type) || 4;
    return playersPerTeam * playersPerTeam;
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

        {/* Format Info Card - Shows season format */}
        {selectedSeason && !loadingSeason && (
          <div className="format-info-card">
            <div className="format-header">
              <span className={`format-badge ${selectedSeason.matchType === 'round_robin' ? 'round-robin' : 'standard'}`}>
                {selectedSeason.matchType === 'round_robin' ? 'Round Robin' : 'Standard'}
              </span>
            </div>
            <div className="format-details">
              {selectedSeason.matchType === 'round_robin' ? (
                <>
                  <p className="format-description">Each player plays every player from the opposing team.</p>
                  <p className="format-stats">
                    <strong>{selectedSeason.type}</strong> · <strong>{getRoundRobinGames()}</strong> games per match
                  </p>
                  <p className="format-note">1 leg per game · Sudden death</p>
                </>
              ) : (
                <>
                  <p className="format-description">Singles, Doubles, and Legs format</p>
                  <p className="format-stats">
                    <strong>{selectedSeason.type}</strong> · <strong>{getGameCount()}</strong> games per match
                  </p>
                  {selectedSeason.matchFormat && (
                    <div className="format-games-preview">
                      {selectedSeason.matchFormat.map((game, idx) => (
                        <span key={idx} className="game-tag">
                          {game.type} ({game.startingScore})
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

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
  {sortedTeams.map(team => (
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
  {sortedTeams.map(team => (
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