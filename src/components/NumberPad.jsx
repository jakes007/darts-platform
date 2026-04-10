import React from 'react';

function NumberPad({ onNumberClick, onDelete, onClear, onEnter, currentValue, quickScores = [26, 45, 57, 100] }) {
  
  const handleNumberClick = (num) => {
    const newValue = currentValue + num.toString();
    if (newValue.length <= 3) {
      onNumberClick(newValue);
    }
  };

  const handleQuickScore = (score) => {
    onNumberClick(score.toString());
  };

  // Quick action row - 4 columns
  const quickGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 0,
    margin: 0,
    padding: 0,
    width: '100%'
  };

  // Number pad grid - 3 columns
  const numGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 0,
    margin: 0,
    padding: 0,
    width: '100%'
  };

  // Quick action button style
  const quickScoreStyle = {
    background: '#1a1a1a',
    border: '1px solid #333',
    borderTop: 'none',
    borderLeft: 'none',
    color: '#f39c12',
    fontSize: '14px',
    fontWeight: 'bold',
    padding: '10px 0',
    cursor: 'pointer',
    textAlign: 'center',
    margin: 0,
    borderRadius: 0
  };

  // Number button style
  const baseBtnStyle = {
    background: '#1a1a1a',
    border: '1px solid #333',
    borderTop: 'none',
    borderLeft: 'none',
    color: 'white',
    fontSize: '22px',
    fontWeight: 'bold',
    padding: '14px 0',
    cursor: 'pointer',
    textAlign: 'center',
    margin: 0,
    borderRadius: 0
  };

  // Delete button style
  const deleteBtnStyle = {
    background: '#c0392b',
    color: 'white',
    border: '1px solid #e74c3c',
    borderTop: 'none',
    borderLeft: 'none',
    fontSize: '22px',
    fontWeight: 'bold',
    padding: '14px 0',
    cursor: 'pointer',
    textAlign: 'center',
    margin: 0,
    borderRadius: 0
  };

  // Enter button style
  const enterBtnStyle = {
    background: '#27ae60',
    color: 'white',
    border: '1px solid #2ecc71',
    borderTop: 'none',
    borderLeft: 'none',
    fontSize: '22px',
    fontWeight: 'bold',
    padding: '14px 0',
    cursor: 'pointer',
    textAlign: 'center',
    margin: 0,
    borderRadius: 0
  };

  // Add left border to first column of each row
  const getQuickStyle = (index) => ({
    ...quickScoreStyle,
    borderLeft: index % 4 === 0 ? '1px solid #333' : 'none'
  });

  const getNumStyle = (index) => ({
    ...baseBtnStyle,
    borderLeft: index % 3 === 0 ? '1px solid #333' : 'none'
  });

  return (
    <div style={{ width: '100%', background: '#0a0a0a', borderTop: '1px solid #222', flexShrink: 0 }}>
      {/* Quick Scores Row */}
      <div style={quickGridStyle}>
        {quickScores.map((score, idx) => (
          <button
            key={score}
            style={getQuickStyle(idx)}
            onClick={() => handleQuickScore(score)}
          >
            {score}
          </button>
        ))}
      </div>

      {/* Number Pad Grid */}
      <div style={numGridStyle}>
        <button style={getNumStyle(0)} onClick={() => handleNumberClick(1)}>1</button>
        <button style={getNumStyle(1)} onClick={() => handleNumberClick(2)}>2</button>
        <button style={getNumStyle(2)} onClick={() => handleNumberClick(3)}>3</button>
        
        <button style={getNumStyle(3)} onClick={() => handleNumberClick(4)}>4</button>
        <button style={getNumStyle(4)} onClick={() => handleNumberClick(5)}>5</button>
        <button style={getNumStyle(5)} onClick={() => handleNumberClick(6)}>6</button>
        
        <button style={getNumStyle(6)} onClick={() => handleNumberClick(7)}>7</button>
        <button style={getNumStyle(7)} onClick={() => handleNumberClick(8)}>8</button>
        <button style={getNumStyle(8)} onClick={() => handleNumberClick(9)}>9</button>
        
        <button style={deleteBtnStyle} onClick={onDelete}>⌫</button>
        <button style={getNumStyle(10)} onClick={() => handleNumberClick(0)}>0</button>
        <button style={enterBtnStyle} onClick={onEnter}>✓</button>
      </div>
    </div>
  );
}

export default NumberPad;