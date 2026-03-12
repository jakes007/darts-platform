import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, query, where, getDocs, addDoc, 
  serverTimestamp, doc, deleteDoc, updateDoc 
} from 'firebase/firestore';
import ConfirmModal from '../components/ConfirmModal';
import './AdminDashboard.css';

function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showClubForm, setShowClubForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [showRosterForm, setShowRosterForm] = useState(false);

  // Modal states
  const [activeModal, setActiveModal] = useState(null);

  // Data lists
  const [clubs, setClubs] = useState([]);
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [rosters, setRosters] = useState([]);

  // For filtering in forms
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);

  // Form states
  const [newClub, setNewClub] = useState({ clubId: '', name: '' });
  const [newTeam, setNewTeam] = useState({ name: '', clubId: '' });
  const [newMember, setNewMember] = useState({
    name: '',
    clubId: '',
    status: 'active'
  });
  const [newSeason, setNewSeason] = useState({
    name: '',
    type: '',
    customType: '',
    showOtherInput: false,
    startDate: '',
    endDate: ''
  });
  const [newRoster, setNewRoster] = useState({
    seasonId: '',
    teamId: '',
    memberIds: []
  });

  // Edit form state
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const [stats, setStats] = useState({
    totalClubs: 0,
    totalTeams: 0,
    activeMembers: 0,
    nonPlayingMembers: 0,
    inactiveMembers: 0,
    totalSeasons: 0
  });

  // Fetch all data
  const fetchAllData = async () => {
    try {
      // Get clubs
      const clubsSnapshot = await getDocs(collection(db, 'clubs'));
      const clubsData = [];
      clubsSnapshot.forEach((doc) => {
        clubsData.push({ id: doc.id, ...doc.data() });
      });
      setClubs(clubsData);
      const totalClubs = clubsData.length;

      // Get teams
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      const teamsData = [];
      teamsSnapshot.forEach((doc) => {
        teamsData.push({ id: doc.id, ...doc.data() });
      });
      setTeams(teamsData);
      const totalTeams = teamsData.length;

      // Get members
      const membersSnapshot = await getDocs(collection(db, 'members'));
      const membersData = [];
      membersSnapshot.forEach((doc) => {
        membersData.push({ id: doc.id, ...doc.data() });
      });
      setMembers(membersData);

      // Count members by status
      const activeMembers = membersData.filter(m => m.status === 'active').length;
      const nonPlayingMembers = membersData.filter(m => m.status === 'non-playing').length;
      const inactiveMembers = membersData.filter(m => m.status === 'inactive').length;

      // Get seasons
      const seasonsSnapshot = await getDocs(collection(db, 'seasons'));
      const seasonsData = [];
      seasonsSnapshot.forEach((doc) => {
        seasonsData.push({ id: doc.id, ...doc.data() });
      });
      setSeasons(seasonsData);
      const totalSeasons = seasonsData.length;

      // Get rosters (from all seasons)
      const allRosters = [];
      for (const season of seasonsData) {
        const rostersSnapshot = await getDocs(collection(db, 'seasons', season.id, 'rosters'));
        rostersSnapshot.forEach((doc) => {
          allRosters.push({ id: doc.id, seasonId: season.id, ...doc.data() });
        });
      }
      setRosters(allRosters);

      setStats({
        totalClubs,
        totalTeams,
        activeMembers,
        nonPlayingMembers,
        inactiveMembers,
        totalSeasons
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Filter teams when a club is selected
  useEffect(() => {
    if (newRoster.clubId) {
      const filtered = teams.filter(team => team.clubId === newRoster.clubId);
      setFilteredTeams(filtered);
    } else {
      setFilteredTeams([]);
    }
  }, [newRoster.clubId, teams]);

  // Filter members when a club is selected for roster
  useEffect(() => {
    if (newRoster.clubId) {
      const filtered = members.filter(member => member.clubId === newRoster.clubId);
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers([]);
    }
  }, [newRoster.clubId, members]);

  // Add Club
  const handleAddClub = async (e) => {
    e.preventDefault();
    try {
      const existingClub = clubs.find(club => club.clubId === newClub.clubId);
      if (existingClub) {
        alert('Club ID already exists. Please use a unique ID.');
        return;
      }

      await addDoc(collection(db, 'clubs'), {
        clubId: newClub.clubId,
        name: newClub.name,
        createdAt: serverTimestamp()
      });
      setNewClub({ clubId: '', name: '' });
      setShowClubForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Error adding club:', error);
    }
  };

  // Add Team
  const handleAddTeam = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'teams'), {
        name: newTeam.name,
        clubId: newTeam.clubId,
        createdAt: serverTimestamp()
      });
      setNewTeam({ name: '', clubId: '' });
      setShowTeamForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Error adding team:', error);
    }
  };

  // Add Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'members'), {
        name: newMember.name,
        clubId: newMember.clubId,
        status: newMember.status,
        createdAt: serverTimestamp()
      });
      setNewMember({ 
        name: '', 
        clubId: '', 
        status: 'active'
      });
      setShowMemberForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  // Add Season - UPDATED to handle custom types
const handleAddSeason = async (e) => {
  e.preventDefault();
  try {
    // Determine the final type value
    const finalType = newSeason.showOtherInput ? newSeason.customType : newSeason.type;
    
    await addDoc(collection(db, 'seasons'), {
      name: newSeason.name,
      type: finalType, // This will be either dropdown value OR custom text
      startDate: newSeason.startDate ? new Date(newSeason.startDate) : null,
      endDate: newSeason.endDate ? new Date(newSeason.endDate) : null,
      createdAt: serverTimestamp()
    });
    
    // Reset form
    setNewSeason({ 
      name: '', 
      type: '',
      customType: '',
      showOtherInput: false,
      startDate: '',
      endDate: ''
    });
    setShowSeasonForm(false);
    fetchAllData();
  } catch (error) {
    console.error('Error adding season:', error);
  }
};

  // Delete functions with custom confirmation
  const handleDeleteClub = (clubId) => {
    const club = clubs.find(c => c.clubId === clubId);
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Club?',
      message: `Are you sure you want to delete "${club.name}"? This will also delete all teams and members in this club. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          // Delete all members in this club
          const clubMembers = members.filter(m => m.clubId === clubId);
          for (const member of clubMembers) {
            await deleteDoc(doc(db, 'members', member.id));
          }
          
          // Delete all teams in this club
          const clubTeams = teams.filter(t => t.clubId === clubId);
          for (const team of clubTeams) {
            await deleteDoc(doc(db, 'teams', team.id));
          }
          
          // Delete the club
          const clubToDelete = clubs.find(c => c.clubId === clubId);
          await deleteDoc(doc(db, 'clubs', clubToDelete.id));
          
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          fetchAllData();
        } catch (error) {
          console.error('Error deleting club:', error);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  const handleDeleteTeam = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    const club = clubs.find(c => c.clubId === team?.clubId);
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Team?',
      message: `Are you sure you want to delete "${team.name}" from ${club?.name || 'the club'}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'teams', teamId));
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          fetchAllData();
        } catch (error) {
          console.error('Error deleting team:', error);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  const handleDeleteMember = (memberId) => {
    const member = members.find(m => m.id === memberId);
    const club = clubs.find(c => c.clubId === member?.clubId);
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Member?',
      message: `Are you sure you want to delete "${member?.name}" from ${club?.name || 'the club'}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'members', memberId));
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          fetchAllData();
        } catch (error) {
          console.error('Error deleting member:', error);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  const handleDeleteSeason = (seasonId) => {
    const season = seasons.find(s => s.id === seasonId);
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Season?',
      message: `Are you sure you want to delete "${season?.name}"? This will also delete all rosters for this season. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          // Delete all rosters for this season
          const seasonRosters = rosters.filter(r => r.seasonId === seasonId);
          for (const roster of seasonRosters) {
            await deleteDoc(doc(db, 'seasons', seasonId, 'rosters', roster.id));
          }
          
          // Delete the season
          await deleteDoc(doc(db, 'seasons', seasonId));
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          fetchAllData();
        } catch (error) {
          console.error('Error deleting season:', error);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  // Edit functions
  const handleEditClick = (item, type) => {
    setEditingItem({ ...item, type });
    setEditForm(item);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    // Special handling for club ID changes
    if (editingItem.type === 'club' && editingItem.clubId !== editForm.clubId) {
      // Check if new clubId already exists
      const existingClub = clubs.find(c => c.clubId === editForm.clubId && c.id !== editingItem.id);
      if (existingClub) {
        alert('Club ID already exists. Please choose a different one.');
        return;
      }
      
      // Update all teams that reference this club
      const teamsToUpdate = teams.filter(t => t.clubId === editingItem.clubId);
      for (const team of teamsToUpdate) {
        await updateDoc(doc(db, 'teams', team.id), { clubId: editForm.clubId });
      }

      // Update all members that reference this club
      const membersToUpdate = members.filter(m => m.clubId === editingItem.clubId);
      for (const member of membersToUpdate) {
        await updateDoc(doc(db, 'members', member.id), { clubId: editForm.clubId });
      }
    }
    
    try {
      const docRef = doc(db, editingItem.type + 's', editingItem.id);
      const { id, type, createdAt, ...updateData } = editForm;
      await updateDoc(docRef, updateData);
      setShowEditModal(false);
      setEditingItem(null);
      fetchAllData();
    } catch (error) {
      console.error('Error updating:', error);
    }
  };

  // Render modal based on activeModal
  const renderModal = () => {
    if (!activeModal) return null;

    const getTitle = () => {
      switch(activeModal) {
        case 'clubs': return 'All Clubs';
        case 'teams': return 'All Teams';
        case 'active': return 'Active Members';
        case 'non-playing': return 'Non-Playing Members';
        case 'inactive': return 'Inactive Members';
        case 'seasons': return 'All Seasons';
        default: return '';
      }
    };

    const getContent = () => {
      switch(activeModal) {
        case 'clubs':
          return (
            <div className="modal-content">
              {clubs.map(club => (
                <div key={club.id} className="list-item">
                  <div className="item-info">
                    <strong>{club.clubId}</strong> - {club.name}
                  </div>
                  <div className="item-actions">
                    <button onClick={() => handleEditClick(club, 'club')} className="edit-btn">✏️</button>
                    <button onClick={() => handleDeleteClub(club.clubId)} className="delete-btn">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          );

        case 'teams':
          return (
            <div className="modal-content">
              {clubs.map(club => {
                const clubTeams = teams.filter(t => t.clubId === club.clubId);
                if (clubTeams.length === 0) return null;
                
                return (
                  <div key={club.id} className="club-group">
                    <h4 className="club-header">{club.clubId} - {club.name}</h4>
                    {clubTeams.map(team => (
                      <div key={team.id} className="list-item indented">
                        <div className="item-info">
                          {team.name}
                        </div>
                        <div className="item-actions">
                          <button onClick={() => handleEditClick(team, 'team')} className="edit-btn">✏️</button>
                          <button onClick={() => handleDeleteTeam(team.id)} className="delete-btn">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );

        case 'active':
        case 'non-playing':
        case 'inactive':
          const statusFilter = activeModal;
          return (
            <div className="modal-content">
              {clubs.map(club => {
                const clubMembers = members.filter(
                  m => m.clubId === club.clubId && m.status === statusFilter
                );
                if (clubMembers.length === 0) return null;
                
                return (
                  <div key={club.id} className="club-group">
                    <h4 className="club-header">{club.clubId} - {club.name}</h4>
                    {clubMembers.map(member => (
                      <div key={member.id} className="list-item indented">
                        <div className="item-info">
                          {member.name}
                        </div>
                        <div className="item-actions">
                          <button onClick={() => handleEditClick(member, 'member')} className="edit-btn">✏️</button>
                          <button onClick={() => handleDeleteMember(member.id)} className="delete-btn">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );

        case 'seasons':
          return (
            <div className="modal-content">
              {seasons.map(season => (
                <div key={season.id} className="list-item">
                  <div className="item-info">
                    <strong>{season.name}</strong> - {season.type}
                    {season.startDate && (
                      <div className="item-dates">
                        {new Date(season.startDate).toLocaleDateString()} 
                        {season.endDate && ` - ${new Date(season.endDate).toLocaleDateString()}`}
                      </div>
                    )}
                  </div>
                  <div className="item-actions">
                    <button onClick={() => handleEditClick(season, 'season')} className="edit-btn">✏️</button>
                    <button onClick={() => handleDeleteSeason(season.id)} className="delete-btn">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div className="modal-overlay" onClick={() => setActiveModal(null)}>
        <div className="modal-container large" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{getTitle()}</h2>
            <button className="modal-close" onClick={() => setActiveModal(null)}>✕</button>
          </div>
          {getContent()}
        </div>
      </div>
    );
  };

  // Edit Modal
  const renderEditModal = () => {
    if (!showEditModal || !editingItem) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
        <div className="modal-container" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Edit {editingItem.type}</h2>
            <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
          </div>
          <form onSubmit={handleEditSubmit} className="edit-form">
            {Object.keys(editForm).map(key => {
              if (key === 'id' || key === 'createdAt' || key === 'type') return null;
              
              if (key === 'status') {
                return (
                  <div key={key} className="form-group">
                    <label>Status:</label>
                    <select
                      value={editForm[key]}
                      onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                    >
                      <option value="active">Active Player</option>
                      <option value="non-playing">Non-Playing Member</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                );
              }
              
              if (key === 'clubId' && editingItem.type === 'club') {
                return (
                  <div key={key} className="form-group">
                    <label>Club ID:</label>
                    <input
                      type="text"
                      value={editForm[key] || ''}
                      onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                      placeholder="Enter Club ID (e.g., ODA001)"
                    />
                    <small className="field-hint">Changing this will update all teams and members linked to this club</small>
                  </div>
                );
              }
              
              if (key === 'clubId') {
                return (
                  <div key={key} className="form-group">
                    <label>Club:</label>
                    <select
                      value={editForm[key]}
                      onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                    >
                      {clubs.map(club => (
                        <option key={club.id} value={club.clubId}>
                          {club.clubId} - {club.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              
              if (key === 'type' && editingItem.type === 'season') {
                return (
                  <div key={key} className="form-group">
                    <label>Format:</label>
                    <select
                      value={editForm[key]}
                      onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                    >
                      <option value="4-a-side">4-a-side</option>
                      <option value="6-a-side">6-a-side</option>
                      <option value="singles">Singles</option>
                      <option value="doubles">Doubles</option>
                    </select>
                    <small className="field-hint">For custom formats, delete and recreate the season</small>
                  </div>
                );
              }
              
              if (key === 'startDate' || key === 'endDate') {
                return (
                  <div key={key} className="form-group">
                    <label>{key === 'startDate' ? 'Start Date' : 'End Date'}:</label>
                    <input
                      type="date"
                      value={editForm[key] ? new Date(editForm[key]).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                    />
                  </div>
                );
              }
              
              return (
                <div key={key} className="form-group">
                  <label>{key}:</label>
                  <input
                    type="text"
                    value={editForm[key] || ''}
                    onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                  />
                </div>
              );
            })}
            <div className="form-actions">
              <button type="submit" className="submit-btn">Save Changes</button>
              <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-user">
          <span>{currentUser?.email}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card clickable" onClick={() => setActiveModal('clubs')}>
          <h3>Total Clubs</h3>
          <p className="stat-number">
            {loading ? '...' : stats.totalClubs}
          </p>
        </div>
        
        <div className="stat-card clickable" onClick={() => setActiveModal('teams')}>
          <h3>Total Teams</h3>
          <p className="stat-number">
            {loading ? '...' : stats.totalTeams}
          </p>
        </div>
        
        <div className="stat-card clickable" onClick={() => setActiveModal('active')}>
          <h3>Active Members</h3>
          <p className="stat-number">
            {loading ? '...' : stats.activeMembers}
          </p>
        </div>
        
        <div className="stat-card clickable" onClick={() => setActiveModal('non-playing')}>
          <h3>Non-Playing</h3>
          <p className="stat-number">
            {loading ? '...' : stats.nonPlayingMembers}
          </p>
        </div>
        
        <div className="stat-card clickable" onClick={() => setActiveModal('inactive')}>
          <h3>Inactive</h3>
          <p className="stat-number">
            {loading ? '...' : stats.inactiveMembers}
          </p>
        </div>
        
        <div className="stat-card clickable" onClick={() => setActiveModal('seasons')}>
          <h3>Seasons</h3>
          <p className="stat-number">
            {loading ? '...' : stats.totalSeasons}
          </p>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="section">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <button 
              className={`action-btn ${showClubForm ? 'cancel-btn' : ''}`}
              onClick={() => setShowClubForm(!showClubForm)}
            >
              {showClubForm ? 'Cancel' : 'Add Club'}
            </button>
            <button 
              className={`action-btn ${showTeamForm ? 'cancel-btn' : ''}`}
              onClick={() => setShowTeamForm(!showTeamForm)}
            >
              {showTeamForm ? 'Cancel' : 'Add Team'}
            </button>
            <button 
              className={`action-btn ${showMemberForm ? 'cancel-btn' : ''}`}
              onClick={() => setShowMemberForm(!showMemberForm)}
            >
              {showMemberForm ? 'Cancel' : 'Add Member'}
            </button>
            <button 
              className={`action-btn ${showSeasonForm ? 'cancel-btn' : ''}`}
              onClick={() => setShowSeasonForm(!showSeasonForm)}
            >
              {showSeasonForm ? 'Cancel' : 'Create Season'}
            </button>
          </div>

          {/* Add Club Form */}
          {showClubForm && (
            <form onSubmit={handleAddClub} className="inline-form">
              <h3>Add New Club</h3>
              <input
                type="text"
                placeholder="Club ID (e.g., ODA001)"
                value={newClub.clubId}
                onChange={(e) => setNewClub({...newClub, clubId: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Club Name"
                value={newClub.name}
                onChange={(e) => setNewClub({...newClub, name: e.target.value})}
                required
              />
              <button type="submit" className="submit-btn">Save Club</button>
            </form>
          )}

          {/* Add Team Form */}
          {showTeamForm && (
            <form onSubmit={handleAddTeam} className="inline-form">
              <h3>Add New Team</h3>
              <input
                type="text"
                placeholder="Team Name"
                value={newTeam.name}
                onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                required
              />
              
              <select
                value={newTeam.clubId}
                onChange={(e) => setNewTeam({...newTeam, clubId: e.target.value})}
                required
              >
                <option value="">Select a Club</option>
                {clubs.map(club => (
                  <option key={club.id} value={club.clubId}>
                    {club.clubId} - {club.name}
                  </option>
                ))}
              </select>
              
              <button type="submit" className="submit-btn">Save Team</button>
            </form>
          )}

          {/* Add Member Form */}
          {showMemberForm && (
            <form onSubmit={handleAddMember} className="inline-form">
              <h3>Add New Member</h3>
              <input
                type="text"
                placeholder="Member Name"
                value={newMember.name}
                onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                required
              />
              
              <select
                value={newMember.clubId}
                onChange={(e) => setNewMember({...newMember, clubId: e.target.value})}
                required
              >
                <option value="">Select a Club</option>
                {clubs.map(club => (
                  <option key={club.id} value={club.clubId}>
                    {club.clubId} - {club.name}
                  </option>
                ))}
              </select>
              
              <select
                value={newMember.status}
                onChange={(e) => setNewMember({...newMember, status: e.target.value})}
              >
                <option value="active">Active Player</option>
                <option value="non-playing">Non-Playing Member</option>
                <option value="inactive">Inactive</option>
              </select>
              
              <button type="submit" className="submit-btn">Save Member</button>
            </form>
          )}

          {/* Add Season Form - UPDATED with "Other" option */}
{showSeasonForm && (
  <form onSubmit={handleAddSeason} className="inline-form">
    <h3>Create New Season</h3>
    <input
      type="text"
      placeholder="Season Name (e.g., Memorial 2026)"
      value={newSeason.name}
      onChange={(e) => setNewSeason({...newSeason, name: e.target.value})}
      required
    />
    
    {/* Updated dropdown with "Other" option */}
    <select
      value={newSeason.type === 'other' ? 'other' : newSeason.type}
      onChange={(e) => {
        if (e.target.value === 'other') {
          // When "Other" is selected, show the text input
          setNewSeason({
            ...newSeason, 
            type: '', 
            showOtherInput: true,
            customType: ''
          });
        } else {
          // When a regular option is selected, hide the text input
          setNewSeason({
            ...newSeason, 
            type: e.target.value, 
            showOtherInput: false,
            customType: ''
          });
        }
      }}
      required
    >
      <option value="">Select Format</option>
      <option value="4-a-side">4-a-side</option>
      <option value="6-a-side">6-a-side</option>
      <option value="singles">Singles</option>
      <option value="doubles">Doubles</option>
      <option value="other">Other (specify)</option>
    </select>
    
    {/* Show text input when "Other" is selected */}
    {newSeason.showOtherInput && (
      <input
        type="text"
        placeholder="Enter format (e.g., 3-a-side, round robin)"
        value={newSeason.customType || ''}
        onChange={(e) => setNewSeason({
          ...newSeason, 
          customType: e.target.value,
          type: e.target.value  // This sets the actual type to whatever they type
        })}
        required
        autoFocus
      />
    )}
    
    <div className="date-fields">
      <input
        type="date"
        placeholder="Start Date"
        value={newSeason.startDate}
        onChange={(e) => setNewSeason({...newSeason, startDate: e.target.value})}
      />
      <input
        type="date"
        placeholder="End Date"
        value={newSeason.endDate}
        onChange={(e) => setNewSeason({...newSeason, endDate: e.target.value})}
      />
    </div>
    
    <button type="submit" className="submit-btn">Create Season</button>
  </form>
)}
        </div>

        <div className="section">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            <p className="no-activity">No recent activity</p>
          </div>
        </div>
      </div>

      {renderModal()}
      {renderEditModal()}
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Delete"
        cancelText="Cancel"
      />
      
    </div>
  );
}

export default AdminDashboard;