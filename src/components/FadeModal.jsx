import React, { useEffect, useState } from 'react';

function FadeModal({ isOpen, onClose, children }) {
  const [shouldRender, setShouldRender] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTimeout(() => setAnimate(true), 10);
    } else {
      setAnimate(false);
      setTimeout(() => setShouldRender(false), 200);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <div 
      className="modal-overlay"
      onClick={onClose}
      style={{
        animation: animate ? 'fadeIn 0.2s ease forwards' : 'fadeOut 0.2s ease forwards'
      }}
    >
      <div 
        className="modal-container"
        onClick={e => e.stopPropagation()}
        style={{
          animation: animate ? 'slideUp 0.3s ease forwards' : 'slideDown 0.3s ease forwards'
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default FadeModal;