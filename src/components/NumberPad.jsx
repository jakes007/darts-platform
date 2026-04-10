import React from 'react';
import './NumberPad.css';

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

  return (
    <div className="number-pad-container">
      {/* Quick Scores Row */}
      <div className="quick-scores-row">
        {quickScores.map(score => (
          <button
            key={score}
            className="quick-score-btn"
            onClick={() => handleQuickScore(score)}
          >
            {score}
          </button>
        ))}
      </div>

      {/* Number Pad Grid */}
      <div className="number-pad-grid">
        <button className="num-btn" onClick={() => handleNumberClick(1)}>1</button>
        <button className="num-btn" onClick={() => handleNumberClick(2)}>2</button>
        <button className="num-btn" onClick={() => handleNumberClick(3)}>3</button>
        
        <button className="num-btn" onClick={() => handleNumberClick(4)}>4</button>
        <button className="num-btn" onClick={() => handleNumberClick(5)}>5</button>
        <button className="num-btn" onClick={() => handleNumberClick(6)}>6</button>
        
        <button className="num-btn" onClick={() => handleNumberClick(7)}>7</button>
        <button className="num-btn" onClick={() => handleNumberClick(8)}>8</button>
        <button className="num-btn" onClick={() => handleNumberClick(9)}>9</button>
        
        {/* Delete button with INLINE STYLE to force red background */}
        <button 
          className="action-btn delete-btn" 
          onClick={onDelete}
          style={{ backgroundColor: '#c0392b', color: 'white', borderColor: '#e74c3c' }}
        >
          ⌫
        </button>
        
        <button className="num-btn" onClick={() => handleNumberClick(0)}>0</button>
        
        {/* Enter button with inline style */}
        <button 
          className="action-btn enter-btn" 
          onClick={onEnter}
          style={{ backgroundColor: '#27ae60', color: 'white', borderColor: '#2ecc71' }}
        >
          ✓
        </button>
      </div>
    </div>
  );
}

export default NumberPad;