import React from 'react';

function AdminModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#252a31',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '400px',
        width: '90%'
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ color: 'white' }}>Admin Login</h2>
        <button onClick={onClose} style={{ marginTop: '1rem' }}>Close</button>
      </div>
    </div>
  );
}

export default AdminModal;