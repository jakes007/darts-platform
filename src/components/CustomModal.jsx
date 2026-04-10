import React, { useState } from 'react';
import './CustomModal.css';

function CustomModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", type = "confirm", initialValue = "" }) {
  const [inputValue, setInputValue] = useState(initialValue);
  
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (type === "edit") {
      onConfirm(inputValue);
    } else {
      onConfirm();
    }
  };

  return (
    <div className="custom-modal-overlay" onClick={onClose}>
      <div className="custom-modal" onClick={e => e.stopPropagation()}>
        <div className="custom-modal-header">
          <h3>{title}</h3>
          <button className="custom-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="custom-modal-body">
          <p>{message}</p>
          {type === "edit" && (
            <input
              type="number"
              className="custom-modal-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter score (0-180)"
              autoFocus
            />
          )}
        </div>
        <div className="custom-modal-footer">
          <button className="custom-modal-cancel" onClick={onClose}>{cancelText}</button>
          <button className="custom-modal-confirm" onClick={handleConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

export default CustomModal;