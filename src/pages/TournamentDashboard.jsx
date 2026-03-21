import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import './TournamentDashboard.css';

function TournamentDashboard() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'singlesTournaments'));
      const data = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      // Sort by creation date (newest first)
      data.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.seconds - a.createdAt.seconds;
        }
        return 0;
      });
      setTournaments(data);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      // 1. Delete all matches subcollection
      const matchesSnapshot = await getDocs(collection(db, 'singlesTournaments', id, 'matches'));
      const matchesDeletePromises = matchesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(matchesDeletePromises);
      
      // 2. Delete all groups subcollection
      const groupsSnapshot = await getDocs(collection(db, 'singlesTournaments', id, 'groups'));
      const groupsDeletePromises = groupsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(groupsDeletePromises);
      
      // 3. Delete the tournament document
      await deleteDoc(doc(db, 'singlesTournaments', id));
      
      // 4. Refresh the list
      await fetchTournaments();
      
      return true;
    } catch (error) {
      console.error('Error deleting tournament:', error);
      return false;
    }
  };

  const confirmDelete = (tournament) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Tournament?',
      message: `Delete "${tournament.name}"? This will delete all matches and results. This action cannot be undone.`,
      onConfirm: async () => {
        const success = await handleDelete(tournament.id);
        if (success) {
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  const getFormatLabel = (format) => {
    switch(format) {
      case 'knockout':
        return 'Knockout';
      case 'round_robin':
        return 'Round Robin';
      case 'group_knockout':
        return 'Group + Knockout';
      default:
        return format || '—';
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'registration':
        return <span className="status-badge registration">Registration</span>;
      case 'group_stage':
        return <span className="status-badge group-stage">Group Stage</span>;
      case 'knockout':
        return <span className="status-badge knockout">Knockout</span>;
      case 'completed':
        return <span className="status-badge completed">Completed</span>;
      default:
        return <span className="status-badge registration">Draft</span>;
    }
  };

  return (
    <div className="tournament-dashboard">
      {/* Header */}
      <div style={{ 
        width: '100%', 
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-dark, #3a4048)',
        padding: '12px 0',
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }}>
          <button 
            onClick={() => navigate('/admin')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-gray, #9ca3af)',
              fontSize: '15px',
              padding: '8px 12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            ← Back
          </button>
        </div>
        
        <h1 style={{
          fontSize: '1.3rem',
          fontWeight: '600',
          color: 'var(--text-white, #ffffff)',
          margin: 0,
          textAlign: 'center',
          padding: '0 100px'
        }}>Singles Tournaments</h1>
        
        <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
          <button 
            className="btn-create"
            onClick={() => navigate('/admin/create-tournament')}
            style={{
              backgroundColor: 'var(--accent-orange, #f5a623)',
              color: 'var(--bg-dark, #1a1e24)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            + Create New
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid var(--border-dark, #3a4048)',
            borderTopColor: 'var(--accent-orange, #f5a623)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="empty-state">
          <p>No tournaments created yet.</p>
          <button 
            className="btn-create"
            onClick={() => navigate('/admin/create-tournament')}
          >
            Create Your First Tournament
          </button>
        </div>
      ) : (
        <div className="tournaments-grid">
          {tournaments.map(tournament => (
            <div key={tournament.id} className="tournament-card">
              <div className="tournament-card-header">
                <h3>{tournament.name}</h3>
                {getStatusBadge(tournament.status)}
              </div>
              
              <div className="tournament-stats">
                <div className="stat">
                  <span className="stat-label">Players</span>
                  <span className="stat-value">{tournament.players?.length || 0}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Groups</span>
                  <span className="stat-value">{tournament.groupsCount || tournament.groups || '-'}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Format</span>
                  <span className="stat-value">{getFormatLabel(tournament.format)}</span>
                </div>
              </div>
              
              <div className="tournament-dates">
                <span>📅 {tournament.startDate || 'TBD'}</span>
                {tournament.endDate && <span> → {tournament.endDate}</span>}
              </div>
              
              <div className="tournament-actions">
                <button 
                  className="btn-view"
                  onClick={() => navigate(`/tournament/${tournament.id}`)}
                >
                  View Tournament
                </button>
                <button 
                  className="btn-edit"
                  onClick={() => alert('Edit functionality coming soon')}
                >
                  Edit
                </button>
                <button 
                  className="btn-delete"
                  onClick={() => confirmDelete(tournament)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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

export default TournamentDashboard;