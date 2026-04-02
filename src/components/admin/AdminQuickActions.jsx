// ============================================
// ADMIN QUICK ACTIONS
// ============================================
// Displays all action buttons on the admin dashboard
// Handles: Clubs, Teams, Members, Seasons, Rosters, 
// Users, Tournaments, Matches, Excel upload/download
// ============================================

import React from 'react';
import { 
  UserGroupIcon, 
  UserIcon, 
  TrophyIcon, 
  ClipboardDocumentListIcon,
  CalendarIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline';

function AdminQuickActions({
  // Form visibility states
  showClubForm,
  showTeamForm,
  showMemberForm,
  showSeasonForm,
  // Handlers
  setShowClubForm,
  setShowTeamForm,
  setShowMemberForm,
  setShowSeasonForm,
  setShowRosterForm,
  setShowUserManager,
  setShowUploadModal,
  setSelectedRosterSeason,
  setActiveTab,
  setSelectedMatch,
  setShowMatchForm,
  handleDownloadMembers,
  navigate
}) {
  return (
    <div className="section">
      <h2>Quick Actions</h2>
      <div className="action-buttons">
        
        {/* Add Club Button */}
        <button 
          className={`action-btn ${showClubForm ? 'cancel-btn' : ''}`}
          onClick={() => setShowClubForm(!showClubForm)}
        >
          <UserGroupIcon className="btn-icon" />
          {showClubForm ? 'Cancel' : 'Add Club'}
        </button>
        
        {/* Add Team Button */}
        <button 
          className={`action-btn ${showTeamForm ? 'cancel-btn' : ''}`}
          onClick={() => setShowTeamForm(!showTeamForm)}
        >
          <UserGroupIcon className="btn-icon" />
          {showTeamForm ? 'Cancel' : 'Add Team'}
        </button>
        
        {/* Add Member Button */}
        <button 
          className={`action-btn ${showMemberForm ? 'cancel-btn' : ''}`}
          onClick={() => {
            setShowMemberForm(!showMemberForm);
            setActiveTab(1);
          }}
        >
          <UserIcon className="btn-icon" />
          {showMemberForm ? 'Cancel' : 'Add Member'}
        </button>
        
        {/* Create Season Button */}
        <button 
          className={`action-btn ${showSeasonForm ? 'cancel-btn' : ''}`}
          onClick={() => setShowSeasonForm(!showSeasonForm)}
        >
          <TrophyIcon className="btn-icon" />
          {showSeasonForm ? 'Cancel' : 'Create Season'}
        </button>
        
        {/* Manage Rosters Button */}
        <button 
          className="action-btn roster-btn"
          onClick={() => {
            setSelectedRosterSeason(null);
            setShowRosterForm(true);
          }}
        >
          <ClipboardDocumentListIcon className="btn-icon" />
          Manage Rosters
        </button>

        {/* Manage Users Button */}
        <button 
          className="action-btn user-btn"
          onClick={() => setShowUserManager(true)}
        >
          <UserGroupIcon className="btn-icon" />
          Manage Users
        </button>
        
        {/* Singles Tournaments Button */}
        <button 
          className="action-btn tournament-btn"
          onClick={() => navigate('/admin/tournaments')}
        >
          <TrophyIcon className="btn-icon" />
          Singles Tournaments
        </button>
        
        {/* Schedule Match Button (full width) */}
        <button 
          className="action-btn match-btn full-width"
          onClick={() => {
            setSelectedMatch(null);
            setShowMatchForm(true);
          }}
        >
          <CalendarIcon className="btn-icon" />
          Schedule Match
        </button>
        
        {/* Upload Members Button */}
        <button 
          className="action-btn upload-btn"
          onClick={() => setShowUploadModal(true)}
        >
          <CloudArrowUpIcon className="btn-icon" />
          Upload Member
        </button>
        
        {/* Download Members Button */}
        <button 
          className="action-btn download-btn"
          onClick={handleDownloadMembers}
        >
          <CloudArrowDownIcon className="btn-icon" />
          Download Member
        </button>
        
      </div>
    </div>
  );
}

export default AdminQuickActions;