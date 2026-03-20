import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import Toast from './Toast';

function SinglesTournamentManager({ onClose }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  const [tournament, setTournament] = useState({
    name: '',
    startDate: '',
    endDate: '',
    players: [],
    format: 'group_knockout',
    playersPerGroup: 4,
    groups: 0,
    advanceFromGroup: 2,
    legsGroup: 3,
    legsKnockout: 5,
    legsFinal: 7,
    handlingUneven: 'bye'
  });
  
  const [allMembers, setAllMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchMembers = async () => {
      const membersSnapshot = await getDocs(query(collection(db, 'members'), where('status', '==', 'active')));
      const members = [];
      membersSnapshot.forEach(doc => {
        const data = doc.data();
        members.push({
          id: doc.id,
          name: `${data.surname || ''}, ${data.firstNames || ''}`.trim(),
          clubId: data.clubId,
          ...data
        });
      });
      members.sort((a, b) => a.name.localeCompare(b.name));
      setAllMembers(members);
      setFilteredMembers(members);
    };
    fetchMembers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredMembers(allMembers.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } else {
      setFilteredMembers(allMembers);
    }
  }, [searchTerm, allMembers]);

  const handlePlayerToggle = (playerId) => {
    setTournament(prev => ({
      ...prev,
      players: prev.players.includes(playerId)
        ? prev.players.filter(id => id !== playerId)
        : [...prev.players, playerId]
    }));
  };

  const calculateGroups = () => {
    const playerCount = tournament.players.length;
    const playersPerGroup = tournament.playersPerGroup;
    const groups = Math.ceil(playerCount / playersPerGroup);
    const totalSlots = groups * playersPerGroup;
    const emptySlots = totalSlots - playerCount;
    return { groups, totalSlots, emptySlots };
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const { groups, totalSlots, emptySlots } = calculateGroups();
      
      const tournamentData = {
        ...tournament,
        groups: groups,
        totalSlots: totalSlots,
        emptySlots: emptySlots,
        status: 'registration',
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'singlesTournaments'), tournamentData);
      
      setToast({ type: 'success', message: 'Tournament created successfully!' });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error creating tournament:', error);
      setToast({ type: 'error', message: 'Failed to create tournament' });
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return tournament.name && tournament.startDate;
    if (step === 2) return tournament.players.length >= 4;
    if (step === 3) return true;
    return true;
  };

  const { groups, totalSlots, emptySlots } = calculateGroups();

  const [isMobile, setIsMobile] = useState(false);

  const containerMaxWidth = isMobile ? '95%' : '600px';

useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth <= 767);
  };
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);

const [windowWidth, setWindowWidth] = useState(window.innerWidth);

useEffect(() => {
  const handleResize = () => setWindowWidth(window.innerWidth);
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

  // Style objects
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2100,
    padding: '1rem'
  };

  const containerStyle = {
    position: 'relative',
    backgroundColor: '#252a31',
    border: '1px solid #3a4048',
    borderRadius: '16px',
    width: '100%',
    maxWidth: containerMaxWidth,  // ← change this
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: isMobile ? '1rem' : '1.5rem',
    paddingTop: isMobile ? '2.5rem' : '3rem'
  };


const closeButtonStyle = {
  position: 'absolute',
  top: isMobile ? '4px' : '12px',
  right: isMobile ? '-5px' : '16px',
  left: 'auto',
  bottom: 'auto',
  background: 'none',
  border: 'none',
  color: '#9ca3af',
  fontSize: isMobile ? '22px' : '20px',
  cursor: 'pointer',
  width: isMobile ? '36px' : '32px',
  height: isMobile ? '36px' : '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  zIndex: 1000,
  margin: '0',
  padding: '0'
};

  const titleStyle = {
    textAlign: 'center',
    color: '#ffffff',
    fontSize: '1.2rem',
    marginBottom: '1.5rem',
    width: '100%'
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={containerStyle} onClick={e => e.stopPropagation()}>
        {/* X Button Container - controls position */}
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          right: 0, 
          padding: isMobile ? '0px 20px 0 0' : '12px 16px 0 0',
          zIndex: 1000
        }}>
          <button 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isMobile ? '36px' : '32px',
              height: isMobile ? '36px' : '32px',
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: isMobile ? '20px' : '18px',
              cursor: 'pointer',
              borderRadius: '4px',
              padding: '0',
              transition: 'all 0.2s ease'
            }}
            onClick={onClose}
            onMouseEnter={e => {
              e.target.style.color = '#f5a623';
              e.target.style.backgroundColor = 'rgba(245, 166, 35, 0.1)';
            }}
            onMouseLeave={e => {
              e.target.style.color = '#9ca3af';
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            ✕
          </button>
        </div>
        
        {/* Progress Steps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: step >= 1 ? '#f5a623' : '#1a1e24',
              border: `1px solid ${step >= 1 ? '#f5a623' : '#3a4048'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: step >= 1 ? '#1a1e24' : '#9ca3af',
              fontWeight: 600
            }}>1</div>
            <span style={{ fontSize: '0.75rem', color: step >= 1 ? '#f5a623' : '#9ca3af' }}>Basic Info</span>
          </div>
          <div style={{ width: '40px', height: '2px', backgroundColor: step >= 2 ? '#f5a623' : '#3a4048', margin: '0 0.5rem', marginBottom: '1.5rem' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: step >= 2 ? '#f5a623' : '#1a1e24',
              border: `1px solid ${step >= 2 ? '#f5a623' : '#3a4048'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: step >= 2 ? '#1a1e24' : '#9ca3af',
              fontWeight: 600
            }}>2</div>
            <span style={{ fontSize: '0.75rem', color: step >= 2 ? '#f5a623' : '#9ca3af' }}>Players</span>
          </div>
          <div style={{ width: '40px', height: '2px', backgroundColor: step >= 3 ? '#f5a623' : '#3a4048', margin: '0 0.5rem', marginBottom: '1.5rem' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: step >= 3 ? '#f5a623' : '#1a1e24',
              border: `1px solid ${step >= 3 ? '#f5a623' : '#3a4048'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: step >= 3 ? '#1a1e24' : '#9ca3af',
              fontWeight: 600
            }}>3</div>
            <span style={{ fontSize: '0.75rem', color: step >= 3 ? '#f5a623' : '#9ca3af' }}>Format</span>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div>
              <h2 style={titleStyle}>Tournament Details</h2>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Tournament Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Summer Singles 2026"
                  value={tournament.name}
                  onChange={e => setTournament({...tournament, name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#1a1e24',
                    border: '1px solid #3a4048',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Start Date *</label>
                  <input
                    type="date"
                    value={tournament.startDate}
                    onChange={e => setTournament({...tournament, startDate: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: '#1a1e24',
                      border: '1px solid #3a4048',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>End Date</label>
                  <input
                    type="date"
                    value={tournament.endDate}
                    onChange={e => setTournament({...tournament, endDate: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: '#1a1e24',
                      border: '1px solid #3a4048',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.95rem'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Player Selection */}
          {step === 2 && (
            <div>
              <h2 style={titleStyle}>Select Players</h2>
              <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '1rem' }}>{tournament.players.length} players selected</p>
              
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#1a1e24',
                    border: '1px solid #3a4048',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
              
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #3a4048',
                borderRadius: '8px',
                backgroundColor: '#1a1e24'
              }}>
                {filteredMembers.map(player => (
                  <label key={player.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.75rem',
                    borderBottom: '1px solid #3a4048',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={tournament.players.includes(player.id)}
                      onChange={() => handlePlayerToggle(player.id)}
                      style={{ marginRight: '0.75rem', width: '18px', height: '18px', accentColor: '#f5a623' }}
                    />
                    <span style={{ flex: 1, color: '#ffffff', fontSize: '0.9rem' }}>{player.name}</span>
                    <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{player.clubId}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Format Settings */}
          {step === 3 && (
            <div>
              <h2 style={titleStyle}>Tournament Format</h2>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Format</label>
                <select
                  value={tournament.format}
                  onChange={e => setTournament({...tournament, format: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#1a1e24',
                    border: '1px solid #3a4048',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.95rem'
                  }}
                >
                  <option value="knockout">Knockout Only</option>
                  <option value="round_robin">Round Robin Only</option>
                  <option value="group_knockout">Group Stage + Knockout</option>
                </select>
              </div>

              {tournament.format !== 'knockout' && (
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Players per group</label>
                    <select
                      value={tournament.playersPerGroup}
                      onChange={e => setTournament({...tournament, playersPerGroup: parseInt(e.target.value)})}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#1a1e24',
                        border: '1px solid #3a4048',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.95rem'
                      }}
                    >
                      <option value="3">3 players</option>
                      <option value="4">4 players</option>
                      <option value="5">5 players</option>
                      <option value="6">6 players</option>
                      <option value="7">7 players</option>
                      <option value="8">8 players</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Advance from group</label>
                    <select
                      value={tournament.advanceFromGroup}
                      onChange={e => setTournament({...tournament, advanceFromGroup: parseInt(e.target.value)})}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#1a1e24',
                        border: '1px solid #3a4048',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.95rem'
                      }}
                    >
                      <option value="1">Top 1</option>
                      <option value="2">Top 2</option>
                      <option value="3">Top 3</option>
                      <option value="4">Top 4</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Preview Stats */}
              <div style={{
                backgroundColor: '#1a1e24',
                border: '1px solid #3a4048',
                borderRadius: '12px',
                padding: '1rem',
                margin: '1rem 0'
              }}>
                <h4 style={{ color: '#ffffff', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Preview</h4>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', backgroundColor: '#252a31', borderRadius: '8px' }}>
                    <span style={{ display: 'block', color: '#f5a623', fontSize: '1.5rem', fontWeight: 600 }}>{tournament.players.length}</span>
                    <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Players</span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', backgroundColor: '#252a31', borderRadius: '8px' }}>
                    <span style={{ display: 'block', color: '#f5a623', fontSize: '1.5rem', fontWeight: 600 }}>{groups}</span>
                    <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Groups</span>
                  </div>
                  {emptySlots > 0 && (
                    <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', backgroundColor: '#252a31', borderRadius: '8px' }}>
                      <span style={{ display: 'block', color: '#f59e0b', fontSize: '1.5rem', fontWeight: 600 }}>{emptySlots}</span>
                      <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Empty slots</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Uneven players handling</label>
                  <select
                    value={tournament.handlingUneven}
                    onChange={e => setTournament({...tournament, handlingUneven: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: '#1a1e24',
                      border: '1px solid #3a4048',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.95rem'
                    }}
                  >
                    <option value="bye">Byes (some players skip first round)</option>
                    <option value="walkover">Walkover slots (auto-wins)</option>
                    <option value="manual">Manual assignment</option>
                  </select>
                </div>
              </div>

              {/* Leg Settings */}
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #3a4048' }}>
                <h4 style={{ color: '#ffffff', fontSize: '0.9rem', marginBottom: '0.75rem' }}>Match Settings</h4>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Group stage legs</label>
                    <select
                      value={tournament.legsGroup}
                      onChange={e => setTournament({...tournament, legsGroup: parseInt(e.target.value)})}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#1a1e24',
                        border: '1px solid #3a4048',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.95rem'
                      }}
                    >
                      <option value="1">Best of 1 leg</option>
                      <option value="3">Best of 3 legs</option>
                      <option value="5">Best of 5 legs</option>
                      <option value="7">Best of 7 legs</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Knockout legs</label>
                    <select
                      value={tournament.legsKnockout}
                      onChange={e => setTournament({...tournament, legsKnockout: parseInt(e.target.value)})}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#1a1e24',
                        border: '1px solid #3a4048',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.95rem'
                      }}
                    >
                      <option value="1">Best of 1 leg</option>
                      <option value="3">Best of 3 legs</option>
                      <option value="5">Best of 5 legs</option>
                      <option value="7">Best of 7 legs</option>
                      <option value="9">Best of 9 legs</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Final legs</label>
                    <select
                      value={tournament.legsFinal}
                      onChange={e => setTournament({...tournament, legsFinal: parseInt(e.target.value)})}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#1a1e24',
                        border: '1px solid #3a4048',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.95rem'
                      }}
                    >
                      <option value="5">Best of 5 legs</option>
                      <option value="7">Best of 7 legs</option>
                      <option value="9">Best of 9 legs</option>
                      <option value="11">Best of 11 legs</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #3a4048' }}>
          {step > 1 && (
            <button 
              onClick={() => setStep(step - 1)}
              style={{
                backgroundColor: 'transparent',
                color: '#9ca3af',
                border: '1px solid #3a4048',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              onMouseEnter={e => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.target.style.borderColor = '#9ca3af';
              }}
              onMouseLeave={e => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = '#3a4048';
              }}
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button 
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              style={{
                backgroundColor: '#f5a623',
                color: '#1a1e24',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: canProceed() ? 'pointer' : 'not-allowed',
                opacity: canProceed() ? 1 : 0.5
              }}
            >
              Next
            </button>
          ) : (
            <button 
              onClick={handleCreate}
              disabled={loading}
              style={{
                backgroundColor: '#f5a623',
                color: '#1a1e24',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1
              }}
            >
              {loading ? 'Creating...' : 'Create Tournament'}
            </button>
          )}
        </div>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
}

export default SinglesTournamentManager;