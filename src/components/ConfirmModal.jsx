import React from 'react';
import { FiAlertCircle, FiX } from 'react-icons/fi';
import './ConfirmModal.css';

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', cancelText = 'Cancel' }) {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal-container" onClick={e => e.stopPropagation()}>
        <button className="confirm-modal-close" onClick={onClose}>
          <FiX />
        </button>
        
        <div className="confirm-modal-icon">
          <FiAlertCircle />
        </div>
        
        <h3 className="confirm-modal-title">{title}</h3>
        <p className="confirm-modal-message">{message}</p>
        
        <div className="confirm-modal-actions">
          <button className="confirm-modal-cancel" onClick={onClose}>
            {cancelText}
          </button>
          <button className="confirm-modal-confirm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;