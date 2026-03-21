import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import Toast from '../components/Toast';
import './TournamentView.css';

function TournamentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [playerNames, setPlayerNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchTournament();
  }, [id]);

  const fetchTournament = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'singlesTournaments', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setTournament(data);
        
        // Fetch player names
        const names = {};
        if (data.players && data.players.length > 0) {
          for (const playerId of data.players) {
            try {
              const playerDoc = await getDoc(doc(db, 'members', playerId));
              if (playerDoc.exists()) {
                const playerData = playerDoc.data();
                names[playerId] = `${playerData.surname || ''}, ${playerData.firstNames || ''}`.trim();
              } else {
                names[playerId] = 'Unknown Player';
              }
            } catch (error) {
              console.error('Error fetching player:', playerId, error);
              names[playerId] = 'Unknown Player';
            }
          }
        }
        setPlayerNames(names);
        
        // Fetch matches from subcollection
        const matchesSnapshot = await getDocs(collection(db, 'singlesTournaments', id, 'matches'));
        const matchesData = [];
        matchesSnapshot.forEach(doc => {
          matchesData.push({ id: doc.id, ...doc.data() });
        });
        setMatches(matchesData);
        
        // Fetch groups from subcollection
        const groupsSnapshot = await getDocs(collection(db, 'singlesTournaments', id, 'groups'));
        const groupsData = [];
        groupsSnapshot.forEach(doc => {
          groupsData.push({ id: doc.id, ...doc.data() });
        });
        groupsData.sort((a, b) => a.order - b.order);
        setTournament(prev => ({ ...prev, groupsData }));
      } else {
        console.log('Tournament not found');
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
      setToast({ type: 'error', message: '❌ Failed to load tournament' });
    } finally {
      setLoading(false);
    }
  };

  const generateGroupMatches = async () => {
    const players = tournament.players || [];
    const playersPerGroup = tournament.playersPerGroup || 4;
    const groups = [];
    
    // Shuffle players randomly
    const shuffledPlayers = [...players];
    for (let i = shuffledPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
    }
    
    // Split into groups
    for (let i = 0; i < shuffledPlayers.length; i += playersPerGroup) {
      groups.push(shuffledPlayers.slice(i, i + playersPerGroup));
    }
    
    // Generate round robin matches for each group
    const allMatches = [];
    const startDate = tournament.startDate || new Date().toISOString().split('T')[0];
    
    groups.forEach((group, groupIndex) => {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          allMatches.push({
            tournamentId: id,
            type: 'group',
            group: String.fromCharCode(65 + groupIndex), // A, B, C...
            round: null,
            homePlayerId: group[i],
            awayPlayerId: group[j],
            date: startDate,
            status: 'scheduled',
            legs: tournament.legsGroup || 3,
            homeScore: null,
            awayScore: null,
            completed: false,
            createdAt: new Date()
          });
        }
      }
    });
    
    return { groups, matches: allMatches };
  };

  const generateMatches = async () => {
    setGenerating(true);
    try {
      const { groups, matches: generatedMatches } = await generateGroupMatches();
      
      // Save groups to subcollection
      const batch = writeBatch(db);
      const groupsRef = collection(db, 'singlesTournaments', id, 'groups');
      groups.forEach((group, idx) => {
        const groupDocRef = doc(groupsRef);
        batch.set(groupDocRef, {
          name: String.fromCharCode(65 + idx),
          players: group,
          order: idx
        });
      });
      
      // Save all matches to subcollection
      const matchesRef = collection(db, 'singlesTournaments', id, 'matches');
      generatedMatches.forEach(match => {
        const matchRef = doc(matchesRef);
        batch.set(matchRef, match);
      });
      
      // Update tournament status
      const tournamentRef = doc(db, 'singlesTournaments', id);
      batch.update(tournamentRef, {
        status: 'group_stage',
        groupsCount: groups.length,
        updatedAt: new Date()
      });
      
      await batch.commit();
      
      // Refresh tournament data
      await fetchTournament();
      
      setToast({ type: 'success', message: `✅ Generated ${generatedMatches.length} group stage matches!` });
    } catch (error) {
      console.error('Error generating matches:', error);
      setToast({ type: 'error', message: `❌ Failed to generate matches: ${error.message}` });
    } finally {
      setGenerating(false);
    }
  };

  const getFormatLabel = (format) => {
    switch(format) {
      case 'knockout': return 'Knockout';
      case 'round_robin': return 'Round Robin';
      case 'group_knockout': return 'Group + Knockout';
      default: return format || '—';
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

  const canGenerateMatches = tournament?.status === 'registration' && tournament?.players?.length >= 2;

  if (loading) {
    return (
      <div className="tournament-view">
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
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="tournament-view">
        <div className="error-message">
          <h2>Tournament not found</h2>
          <button onClick={() => navigate('/admin/tournaments')} className="btn-back">
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tournament-view">
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
            onClick={() => navigate('/admin/tournaments')}
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
        }}>{tournament.name}</h1>
        
        <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
          {getStatusBadge(tournament.status)}
        </div>
      </div>

      {/* Tournament Details */}
      <div className="tournament-details">
        <div className="details-grid">
          <div className="detail-card">
            <h3>Format</h3>
            <p className="detail-value">{getFormatLabel(tournament.format)}</p>
          </div>
          <div className="detail-card">
            <h3>Players</h3>
            <p className="detail-value">{tournament.players?.length || 0}</p>
          </div>
          <div className="detail-card">
            <h3>Groups</h3>
            <p className="detail-value">{tournament.groupsCount || tournament.groups || '-'}</p>
          </div>
          <div className="detail-card">
            <h3>Players per group</h3>
            <p className="detail-value">{tournament.playersPerGroup || '-'}</p>
          </div>
        </div>

        <div className="match-settings">
          <h3>Match Settings</h3>
          <div className="settings-grid">
            <div className="setting">
              <span className="setting-label">Group stage legs:</span>
              <span className="setting-value">Best of {tournament.legsGroup || 3}</span>
            </div>
            <div className="setting">
              <span className="setting-label">Knockout legs:</span>
              <span className="setting-value">Best of {tournament.legsKnockout || 5}</span>
            </div>
            <div className="setting">
              <span className="setting-label">Final legs:</span>
              <span className="setting-value">Best of {tournament.legsFinal || 7}</span>
            </div>
          </div>
        </div>

        {/* Groups Display */}
        {tournament.groupsData && tournament.groupsData.length > 0 && (
          <div className="groups-section">
            <h3>Groups</h3>
            <div className="groups-grid">
              {tournament.groupsData.map((group, idx) => (
                <div key={idx} className="group-card">
                  <div className="group-header">
                    <h4>Group {group.name}</h4>
                  </div>
                  <div className="group-players">
                    {group.players.map(playerId => (
                      <div key={playerId} className="group-player">
                        {playerNames[playerId] || 'Loading...'}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Matches Section */}
        {tournament.status === 'registration' && (
          <div className="generate-section">
            <button 
              className="btn-generate"
              onClick={generateMatches}
              disabled={!canGenerateMatches || generating}
            >
              {generating ? 'Generating...' : 'Generate Group Stage Matches'}
            </button>
            {!canGenerateMatches && (
              <p className="generate-hint">
                Need at least 2 players to generate matches. Currently: {tournament.players?.length || 0} players
              </p>
            )}
          </div>
        )}

        {/* Matches Display */}
{tournament.status !== 'registration' && (
  <div className="matches-section">
    <h3>Group Stage Matches</h3>
    {matches.length > 0 ? (
      <div>
        {matches.map(match => (
          <div key={match.id} style={{
            backgroundColor: 'var(--bg-dark, #1a1e24)',
            border: '1px solid var(--border-dark, #3a4048)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '12px'
          }}>
            {/* Header - Group and Status */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-dark, #3a4048)'
            }}>
              <span style={{
                backgroundColor: 'var(--card-bg, #252a31)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--accent-orange, #f5a623)'
              }}>Group {match.group}</span>
              <span style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '20px',
                backgroundColor: 'rgba(245, 166, 35, 0.1)',
                color: 'var(--accent-orange, #f5a623)'
              }}>{match.status}</span>
            </div>
            
            {/* Players - Mobile: stacked, Desktop: side by side */}
            <div style={{
              display: 'flex',
              flexDirection: window.innerWidth <= 767 ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <div style={{
                flex: window.innerWidth <= 767 ? 'auto' : 1,
                fontSize: '16px',
                fontWeight: '500',
                color: 'var(--text-white, #ffffff)',
                wordBreak: 'break-word'
              }}>
                {playerNames[match.homePlayerId] || 'Loading...'}
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--accent-orange, #f5a623)',
                flexShrink: 0
              }}>VS</div>
              <div style={{
                flex: window.innerWidth <= 767 ? 'auto' : 1,
                fontSize: '16px',
                fontWeight: '500',
                color: 'var(--text-white, #ffffff)',
                wordBreak: 'break-word'
              }}>
                {playerNames[match.awayPlayerId] || 'Loading...'}
              </div>
            </div>
            
            {/* Enter Score Button */}
            <button 
              onClick={() => console.log('Enter score for match:', match.id)}
              style={{
                width: '100%',
                backgroundColor: 'var(--accent-orange, #f5a623)',
                color: 'var(--bg-dark, #1a1e24)',
                border: 'none',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              Enter Score
            </button>
          </div>
        ))}
      </div>
    ) : (
      <div className="matches-placeholder">
        <p>No matches generated yet.</p>
        <p className="hint">Click "Generate Group Stage Matches" to create all matches.</p>
      </div>
    )}
  </div>
)}
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default TournamentView;