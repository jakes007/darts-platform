// ============================================
// ADMIN STATS CARDS
// ============================================
// Displays clickable stat cards on the admin dashboard
// Each card opens a modal with detailed view
// ============================================

import React from 'react';

function AdminStatsCards({ loading, stats, onCardClick }) {
  return (
    <div className="dashboard-stats">
      
      {/* Club Stats Card */}
      <div className="stat-card clickable" onClick={() => onCardClick('clubs')}>
        <h3>Total Clubs</h3>
        <p className="stat-number">
          {loading ? '...' : stats.totalClubs}
        </p>
      </div>
      
      {/* Team Stats Card */}
      <div className="stat-card clickable" onClick={() => onCardClick('teams')}>
        <h3>Total Teams</h3>
        <p className="stat-number">
          {loading ? '...' : stats.totalTeams}
        </p>
      </div>
      
      {/* Active Members Card */}
      <div className="stat-card clickable" onClick={() => onCardClick('active')}>
        <h3>Active Members</h3>
        <p className="stat-number">
          {loading ? '...' : stats.activeMembers}
        </p>
      </div>
      
      {/* Non-Playing Members Card */}
      <div className="stat-card clickable" onClick={() => onCardClick('non-playing')}>
        <h3>Non-Playing</h3>
        <p className="stat-number">
          {loading ? '...' : stats.nonPlayingMembers}
        </p>
      </div>
      
      {/* Inactive Members Card */}
      <div className="stat-card clickable" onClick={() => onCardClick('inactive')}>
        <h3>Inactive</h3>
        <p className="stat-number">
          {loading ? '...' : stats.inactiveMembers}
        </p>
      </div>
      
      {/* Seasons Stats Card */}
      <div className="stat-card clickable" onClick={() => onCardClick('seasons')}>
        <h3>Seasons</h3>
        <p className="stat-number">
          {loading ? '...' : stats.totalSeasons}
        </p>
      </div>

      {/* Matches Stats Card */}
      <div className="stat-card clickable" onClick={() => onCardClick('matches')}>
        <h3>Total Matches</h3>
        <p className="stat-number">
          {loading ? '...' : stats.totalMatches}
        </p>
      </div>
      
    </div>
  );
}

export default AdminStatsCards;