import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import './UserManager.css';
import ConfirmModal from './ConfirmModal';

function UserManager({ seasons, teams, clubs, onClose }) {
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableTeams, setAvailableTeams] = useState([]);
  

  // New assignment form
  const [newAssignment, setNewAssignment] = useState({
    competitionId: '',
    role: 'captain',
    teamId: '',
    expiresAt: ''
  });

  // Confirmation modal state
const [confirmModal, setConfirmModal] = useState({
  isOpen: false,
  title: '',
  message: '',
  onConfirm: null
});

  useEffect(() => {
    fetchUsersAndAssignments();
  }, []);

  useEffect(() => {
    console.log('Selected competition:', newAssignment.competitionId); // Debug log
    console.log('All teams:', teams); // Debug log
    
    if (newAssignment.competitionId && teams) {
      // For now, show all teams so dropdown works
      setAvailableTeams(teams);
    } else {
      setAvailableTeams([]);
    }
  }, [newAssignment.competitionId, teams]);

  const fetchUsersAndAssignments = async () => {
    setLoading(true);
    try {
      // Fetch users from Firestore
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = [];
      usersSnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersData);

      // Fetch all assignments
      const assignmentsSnapshot = await getDocs(collection(db, 'competitionAssignments'));
      const assignmentsData = [];
      assignmentsSnapshot.forEach((doc) => {
        assignmentsData.push({ id: doc.id, ...doc.data() });
      });
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !newAssignment.competitionId) return;

    try {
      const assignmentData = {
        userId: selectedUser.id,
        userEmail: selectedUser.email,
        userName: selectedUser.name || selectedUser.email,
        competitionId: newAssignment.competitionId,
        competitionName: seasons.find(s => s.id === newAssignment.competitionId)?.name,
        role: newAssignment.role,
        teamId: newAssignment.teamId || null,
        assignedAt: new Date(),
        expiresAt: newAssignment.expiresAt ? new Date(newAssignment.expiresAt) : null,
        status: 'active'
      };

      await addDoc(collection(db, 'competitionAssignments'), assignmentData);
      
      setShowAssignModal(false);
      setSelectedUser(null);
      setNewAssignment({
        competitionId: '',
        role: 'captain',
        teamId: '',
        expiresAt: ''
      });
      
      fetchUsersAndAssignments();
    } catch (error) {
      console.error('Error assigning role:', error);
    }
  };

  const handleRevokeAssignment = (assignmentId, userName, competitionName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Revoke Assignment?',
      message: `Are you sure you want to revoke this assignment from ${userName} for ${competitionName}? They will lose access immediately.`,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'competitionAssignments', assignmentId), {
            status: 'revoked',
            revokedAt: new Date()
          });
          fetchUsersAndAssignments();
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        } catch (error) {
          console.error('Error revoking assignment:', error);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  const filteredUsers = users.filter(user =>
    (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const getUserAssignments = (userId) => {
    return assignments.filter(a => a.userId === userId && a.status === 'active');
  };

  return (
    <div className="user-manager">
      <div className="user-manager-header">
        <h2>User Management</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="user-manager-content">
        <div className="user-search">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {loading ? (
          <div className="loading">Loading users...</div>
        ) : (
          <div className="users-list">
            {filteredUsers.map(user => (
              <div key={user.id} className="user-card">
                <div className="user-info">
                  <h3>{user.name || 'Unnamed'}</h3>
                  <p className="user-email">{user.email}</p>
                  <div className="user-role-display">
  <span className={`role-badge ${user.role === 'admin' ? 'super-admin' : 'user'}`}>
    {user.role === 'admin' ? '👑 SUPER ADMIN' : '👤 REGULAR USER'}
  </span>
</div>
                  
                  <div className="user-assignments">
                    <h4>Active Assignments:</h4>
                    {getUserAssignments(user.id).length > 0 ? (
                      getUserAssignments(user.id).map(assignment => (
                        <div key={assignment.id} className="assignment-badge">
                          <span className={`role-badge ${assignment.role}`}>
                            {assignment.role}
                          </span>
                          <span className="competition-name">
                            {assignment.competitionName}
                          </span>
                          {assignment.teamId && (
  <span className="team-name">
    🏆 {(() => {
      // Find the team and its club to show proper names
      const team = teams?.find(t => t.id === assignment.teamId);
      const club = clubs?.find(c => c.clubId === team?.clubId);
      return `${club?.name || ''} - ${team?.name || 'Unknown Team'}`;
    })()}
  </span>
)}
                          {assignment.expiresAt && (
                            <span className="expiry">
                              Expires: {new Date(assignment.expiresAt.seconds * 1000).toLocaleDateString()}
                            </span>
                          )}
                          <button 
  className="revoke-btn"
  onClick={() => handleRevokeAssignment(
    assignment.id, 
    assignment.userName, 
    assignment.competitionName
  )}
>
  Revoke
</button>
                        </div>
                      ))
                    ) : (
                      <p className="no-assignments">No active assignments</p>
                    )}
                  </div>
                </div>
                
                <button 
                  className="assign-btn"
                  onClick={() => {
                    setSelectedUser(user);
                    setShowAssignModal(true);
                  }}
                >
                  Assign Role
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Role Modal */}
      {showAssignModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <h3>Assign Role to {selectedUser.name || selectedUser.email}</h3>
            
            <div className="form-group">
              <label>Competition *</label>
              <select
                value={newAssignment.competitionId}
                onChange={(e) => setNewAssignment({...newAssignment, competitionId: e.target.value})}
              >
                <option value="">Select Competition</option>
                {seasons.map(season => (
                  <option key={season.id} value={season.id}>
                    {season.name} ({season.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Role *</label>
              <select
                value={newAssignment.role}
                onChange={(e) => setNewAssignment({...newAssignment, role: e.target.value})}
              >
                <option value="captain">Team Captain</option>
                <option value="admin">Competition Admin</option>
                <option value="controller">Block Controller</option>
              </select>
            </div>

            {newAssignment.role === 'captain' && (
  <div className="form-group">
    <label>Team</label>
    <select
      value={newAssignment.teamId}
      onChange={(e) => setNewAssignment({...newAssignment, teamId: e.target.value})}
    >
      <option value="">Select Team</option>
      {availableTeams.map(team => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  </div>
)}
            <div className="form-group">
              <label>Expires (optional)</label>
              <input
                type="date"
                value={newAssignment.expiresAt}
                onChange={(e) => setNewAssignment({...newAssignment, expiresAt: e.target.value})}
              />
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowAssignModal(false)}>
                Cancel
              </button>
              <button 
                className="submit-btn" 
                onClick={handleAssignRole}
                disabled={!newAssignment.competitionId}
              >
                Assign Role
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
<ConfirmModal
  isOpen={confirmModal.isOpen}
  onClose={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
  onConfirm={confirmModal.onConfirm}
  title={confirmModal.title}
  message={confirmModal.message}
  confirmText="Revoke"
  cancelText="Cancel"
/>
    </div>
  );
}

export default UserManager;