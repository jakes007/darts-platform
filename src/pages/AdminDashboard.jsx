import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import './AdminDashboard.css';

function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showClubForm, setShowClubForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  
  // Data lists for dropdowns
  const [clubs, setClubs] = useState([]);
  const [teams, setTeams] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);

  // Form states
  const [newClub, setNewClub] = useState({ clubId: '', name: '' });
  const [newTeam, setNewTeam] = useState({ name: '', clubId: '' });
  const [newPlayer, setNewPlayer] = useState({ 
    name: '', 
    teamId: '', 
    status: 'active'
  });

  const [stats, setStats] = useState({
    totalClubs: 0,
    totalTeams: 0,
    activePlayers: 0,
    inactivePlayers: 0
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

      // Get active players
const activeQuery = query(collection(db, 'players'), where('status', '==', 'active'));
const activeSnapshot = await getDocs(activeQuery);
const activePlayers = activeSnapshot.size;

// Get non-playing members
const nonPlayingQuery = query(collection(db, 'players'), where('status', '==', 'non-playing'));
const nonPlayingSnapshot = await getDocs(nonPlayingQuery);
const nonPlayingMembers = nonPlayingSnapshot.size;

// Get inactive players
const inactiveQuery = query(collection(db, 'players'), where('status', '==', 'inactive'));
const inactiveSnapshot = await getDocs(inactiveQuery);
const inactivePlayers = inactiveSnapshot.size;

      setStats({
        totalClubs,
        totalTeams,
        activePlayers,
        nonPlayingMembers,
        inactivePlayers
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

  // Filter teams when a club is selected in player form
  useEffect(() => {
    if (newPlayer.selectedClubId) {
      const filtered = teams.filter(team => team.clubId === newPlayer.selectedClubId);
      setFilteredTeams(filtered);
    } else {
      setFilteredTeams([]);
    }
  }, [newPlayer.selectedClubId, teams]);

  // Add Club
  const handleAddClub = async (e) => {
    e.preventDefault();
    try {
      // Check if clubId already exists
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
      fetchAllData(); // Refresh all data
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
      fetchAllData(); // Refresh all data
    } catch (error) {
      console.error('Error adding team:', error);
    }
  };

  // Add Player
  const handleAddPlayer = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'players'), {
        name: newPlayer.name,
        teamId: newPlayer.teamId,
        status: newPlayer.status,
        createdAt: serverTimestamp()
      });
      setNewPlayer({ 
        name: '', 
        teamId: '', 
        status: 'active',
        selectedClubId: ''
      });
      setShowPlayerForm(false);
      fetchAllData(); // Refresh stats
    } catch (error) {
      console.error('Error adding player:', error);
    }
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
  <div className="stat-card">
    <h3>Total Clubs</h3>
    <p className="stat-number">
      {loading ? '...' : stats.totalClubs}
    </p>
  </div>
  
  <div className="stat-card">
    <h3>Total Teams</h3>
    <p className="stat-number">
      {loading ? '...' : stats.totalTeams}
    </p>
  </div>
  
  <div className="stat-card">
    <h3>Active Players</h3>
    <p className="stat-number">
      {loading ? '...' : stats.activePlayers}
    </p>
  </div>
  
  <div className="stat-card">
    <h3>Non-Playing</h3>
    <p className="stat-number">
      {loading ? '...' : stats.nonPlayingMembers}
    </p>
  </div>
  
  <div className="stat-card">
    <h3>Inactive</h3>
    <p className="stat-number">
      {loading ? '...' : stats.inactivePlayers}
    </p>
  </div>
</div>

      <div className="dashboard-sections">
        <div className="section">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <button className="action-btn" onClick={() => setShowClubForm(!showClubForm)}>
              {showClubForm ? 'Cancel' : 'Add Club'}
            </button>
            <button className="action-btn" onClick={() => setShowTeamForm(!showTeamForm)}>
              {showTeamForm ? 'Cancel' : 'Add Team'}
            </button>
            <button className="action-btn" onClick={() => setShowPlayerForm(!showPlayerForm)}>
              {showPlayerForm ? 'Cancel' : 'Add Player'}
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

          {/* Add Player Form */}
          {showPlayerForm && (
            <form onSubmit={handleAddPlayer} className="inline-form">
              <h3>Add New Player</h3>
              <input
                type="text"
                placeholder="Player Name"
                value={newPlayer.name}
                onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})}
                required
              />
              
              <select
                value={newPlayer.selectedClubId || ''}
                onChange={(e) => setNewPlayer({...newPlayer, selectedClubId: e.target.value, teamId: ''})}
                required
              >
                <option value="">Select a Club first</option>
                {clubs.map(club => (
                  <option key={club.id} value={club.clubId}>
                    {club.clubId} - {club.name}
                  </option>
                ))}
              </select>

              <select
                value={newPlayer.teamId}
                onChange={(e) => setNewPlayer({...newPlayer, teamId: e.target.value})}
                required
                disabled={!newPlayer.selectedClubId}
              >
                <option value="">Select a Team</option>
                {filteredTeams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              
              <select
  value={newPlayer.status}
  onChange={(e) => setNewPlayer({...newPlayer, status: e.target.value})}
>
  <option value="active">Active Player</option>
  <option value="non-playing">Non-Playing Member</option>
  <option value="inactive">Inactive</option>
</select>
              
              <button type="submit" className="submit-btn">Save Player</button>
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
    </div>
  );
}

export default AdminDashboard;