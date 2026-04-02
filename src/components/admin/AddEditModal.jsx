// ============================================
// ADD/EDIT MODAL
// ============================================
// Reusable modal for adding clubs, teams, members, seasons
// ============================================

import React from 'react';

function AddEditModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default AddEditModal;