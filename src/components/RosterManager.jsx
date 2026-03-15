import React, { useState, useEffect } from 'react';
import './RosterManager.css';
import RosterService from '../services/rosterService';

function RosterManager({ seasons, clubs, teams, members, onSave, onCancel }) {
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [teamRosters, setTeamRosters] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Filter teams by selected club
  const filteredTeams = teams.filter(t => t.clubId === selectedClubId);

  // Load existing rosters when season and club are selected
  useEffect(() => {
    const loadRosters = async () => {
      if (!selectedSeasonId || !selectedClubId) return;
      
      setLoading(true);
      setError('');
      
      try {
        const rosters = await RosterService.getSeasonRosters(selectedSeasonId);
        
        // Create a map of teamId -> memberIds
        const rosterMap = {};
        rosters.forEach(roster => {
          rosterMap[roster.teamId] = roster.memberIds || [];
        });
        
        setTeamRosters(rosterMap);
      } catch (error) {
        console.error('Error loading rosters:', error);
        setError('Failed to load rosters. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadRosters();
  }, [selectedSeasonId, selectedClubId]);

  const handlePlayerToggle = (teamId, memberId) => {
    setTeamRosters(prev => {
      const currentRoster = prev[teamId] || [];
      let newRoster;
      
      if (currentRoster.includes(memberId)) {
        newRoster = currentRoster.filter(id => id !== memberId);
      } else {
        newRoster = [...currentRoster, memberId];
      }
      
      return {
        ...prev,
        [teamId]: newRoster
      };
    });
  };

  const handleSaveAll = async () => {
    if (!selectedSeasonId) return;
    
    setSaving(true);
    setError('');
    
    try {
      // Save roster for each team
      for (const team of filteredTeams) {
        const memberIds = teamRosters[team.id] || [];
        await RosterService.setTeamRoster(selectedSeasonId, team.id, memberIds);
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving rosters:', error);
      setError('Failed to save rosters. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getTeamMembers = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return [];
    
    return members.filter(m => m.clubId === team.clubId);
  };

  const getSeasonFormat = () => {
    const season = seasons.find(s => s.id === selectedSeasonId);
    return season?.type || '4-a-side';
  };

  const getExpectedPlayerCount = () => {
    const format = getSeasonFormat();
    if (format.includes('6')) return 6;
    if (format.includes('4')) return 4;
    if (format.includes('singles')) return 1;
    if (format.includes('doubles')) return 2;
    return 4; // default
  };

  // If no seasons, show message
  if (!seasons || seasons.length === 0) {
    return (
      <div className="roster-manager">
        <h3>Manage Team Rosters</h3>
        <div className="roster-empty">
          <p>No seasons found. Please create a season first.</p>
          <button className="cancel-btn" onClick={onCancel}>Close</button>
        </div>
      </div>
    );
  }

  // If no clubs, show message
  if (!clubs || clubs.length === 0) {
    return (
      <div className="roster-manager">
        <h3>Manage Team Rosters</h3>
        <div className="roster-empty">
          <p>No clubs found. Please create a club first.</p>
          <button className="cancel-btn" onClick={onCancel}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="roster-manager">
      <h3>Manage Team Rosters</h3>
      
      {error && (
        <div className="roster-error">
          {error}
        </div>
      )}
      
      <div className="roster-filters">
        <select
          value={selectedSeasonId}
          onChange={(e) => setSelectedSeasonId(e.target.value)}
          className="roster-select"
        >
          <option value="">Select Season</option>
          {seasons.map(season => (
            <option key={season.id} value={season.id}>
              {season.name} ({season.type})
            </option>
          ))}
        </select>

        <select
          value={selectedClubId}
          onChange={(e) => setSelectedClubId(e.target.value)}
          className="roster-select"
          disabled={!selectedSeasonId}
        >
          <option value="">Select Club</option>
          {clubs.map(club => (
            <option key={club.id} value={club.clubId}>
              {club.clubId} - {club.name}
            </option>
          ))}
        </select>
      </div>

      {selectedSeasonId && selectedClubId && (
        <div className="roster-teams">
          {loading ? (
            <div className="roster-loading">Loading rosters...</div>
          ) : (
            <>
              {filteredTeams.length === 0 ? (
                <div className="roster-empty">
                  <p>No teams found for this club.</p>
                </div>
              ) : (
                filteredTeams.map(team => {
                  const teamMembers = getTeamMembers(team.id);
                  const selectedMembers = teamRosters[team.id] || [];
                  const expectedCount = getExpectedPlayerCount();
                  const isComplete = selectedMembers.length === expectedCount;
                  
                  return (
                    <div key={team.id} className="roster-team-card">
                      <div className="roster-team-header">
                        <h4>{team.name}</h4>
                        <span className={`roster-count ${isComplete ? 'complete' : 'incomplete'}`}>
                          {selectedMembers.length}/{expectedCount} players
                        </span>
                      </div>
                      
                      {teamMembers.length === 0 ? (
                        <div className="roster-no-players">
                          No members available for this team
                        </div>
                      ) : (
                        <div className="roster-player-list">
                          {teamMembers.map(member => (
                            <label key={member.id} className="roster-player-item">
                              <input
                                type="checkbox"
                                checked={selectedMembers.includes(member.id)}
                                onChange={() => handlePlayerToggle(team.id, member.id)}
                              />
                              <span className="player-name">
                                {member.surname}, {member.firstNames}
                              </span>
                              <span className="player-status">{member.status}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      )}

      <div className="roster-actions">
        <button type="button" className="cancel-btn" onClick={onCancel}>
          Cancel
        </button>
        <button 
          type="button" 
          className="submit-btn" 
          onClick={handleSaveAll}
          disabled={saving || !selectedSeasonId || !selectedClubId || loading}
        >
          {saving ? 'Saving...' : 'Save All Rosters'}
        </button>
      </div>
    </div>
  );
}

export default RosterManager;