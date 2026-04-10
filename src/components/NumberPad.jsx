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

  // Main container - NO PADDING, NO MARGIN
  const containerStyle = {
    width: '100%',
    background: '#0a0a0a',
    borderTop: '1px solid #222',
    flexShrink: 0,
    margin: 0,
    padding: 0,
    lineHeight: 0,
    fontSize: 0
  };

  // Row style - NO GAPS
  const rowStyle = {
    display: 'grid',
    gap: 0,
    margin: 0,
    padding: 0,
    lineHeight: 0
  };

  // Quick action row - 4 columns
  const quickRowStyle = {
    ...rowStyle,
    gridTemplateColumns: 'repeat(4, 1fr)'
  };

  // Number row - 3 columns
  const numberRowStyle = {
    ...rowStyle,
    gridTemplateColumns: 'repeat(3, 1fr)'
  };

  // Quick action button style
  const quickScoreStyle = {
    background: '#1a1a1a',
    border: '1px solid #333',
    borderTop: 'none',
    borderLeft: 'none',
    color: '#f39c12',
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '6px 0',
    cursor: 'pointer',
    textAlign: 'center',
    margin: 0,
    borderRadius: 0,
    lineHeight: 'normal',
    display: 'block',
    width: '100%'
  };

  // Number button style
  const baseBtnStyle = {
    background: '#1a1a1a',
    border: '1px solid #333',
    borderTop: 'none',
    borderLeft: 'none',
    color: 'white',
    fontSize: '18px',
    fontWeight: 'bold',
    padding: '8px 0',
    cursor: 'pointer',
    textAlign: 'center',
    margin: 0,
    borderRadius: 0,
    lineHeight: 'normal',
    display: 'block',
    width: '100%'
  };

  // Delete button style
  const deleteBtnStyle = {
    background: '#c0392b',
    color: 'white',
    border: '1px solid #e74c3c',
    borderTop: 'none',
    borderLeft: 'none',
    fontSize: '18px',
    fontWeight: 'bold',
    padding: '8px 0',
    cursor: 'pointer',
    textAlign: 'center',
    margin: 0,
    borderRadius: 0,
    lineHeight: 'normal',
    display: 'block',
    width: '100%'
  };

  // Enter button style
  const enterBtnStyle = {
    background: '#27ae60',
    color: 'white',
    border: '1px solid #2ecc71',
    borderTop: 'none',
    borderLeft: 'none',
    fontSize: '18px',
    fontWeight: 'bold',
    padding: '8px 0',
    cursor: 'pointer',
    textAlign: 'center',
    margin: 0,
    borderRadius: 0,
    lineHeight: 'normal',
    display: 'block',
    width: '100%'
  };

  // Add left border to first column
  const getQuickStyle = (index) => ({
    ...quickScoreStyle,
    borderLeft: index % 4 === 0 ? '1px solid #333' : 'none'
  });

  const getNumStyle = (index, isFirstInRow) => ({
    ...baseBtnStyle,
    borderLeft: isFirstInRow ? '1px solid #333' : 'none'
  });

  return (
    <div style={containerStyle}>
      {/* Quick Actions Row */}
      <div style={quickRowStyle}>
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

      {/* Number Row 1: 1, 2, 3 */}
      <div style={numberRowStyle}>
        <button style={getNumStyle(0, true)} onClick={() => handleNumberClick(1)}>1</button>
        <button style={getNumStyle(1, false)} onClick={() => handleNumberClick(2)}>2</button>
        <button style={getNumStyle(2, false)} onClick={() => handleNumberClick(3)}>3</button>
      </div>

      {/* Number Row 2: 4, 5, 6 */}
      <div style={numberRowStyle}>
        <button style={getNumStyle(3, true)} onClick={() => handleNumberClick(4)}>4</button>
        <button style={getNumStyle(4, false)} onClick={() => handleNumberClick(5)}>5</button>
        <button style={getNumStyle(5, false)} onClick={() => handleNumberClick(6)}>6</button>
      </div>

      {/* Number Row 3: 7, 8, 9 */}
      <div style={numberRowStyle}>
        <button style={getNumStyle(6, true)} onClick={() => handleNumberClick(7)}>7</button>
        <button style={getNumStyle(7, false)} onClick={() => handleNumberClick(8)}>8</button>
        <button style={getNumStyle(8, false)} onClick={() => handleNumberClick(9)}>9</button>
      </div>

      {/* Number Row 4: Delete, 0, Enter */}
      <div style={numberRowStyle}>
        <button style={deleteBtnStyle} onClick={onDelete}>⌫</button>
        <button style={getNumStyle(10, false)} onClick={() => handleNumberClick(0)}>0</button>
        <button style={enterBtnStyle} onClick={onEnter}>✓</button>
      </div>
    </div>
  );
}

export default NumberPad;