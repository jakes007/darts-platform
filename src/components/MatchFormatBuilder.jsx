import React, { useState, useEffect } from 'react';
import './MatchFormatBuilder.css';

function MatchFormatBuilder({ 
  initialFormat = [], 
  seasonType = '6-a-side',
  onChange,
  readOnly = false
}) {
  const [games, setGames] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  // Get number of players for leg based on season type
  const getLegPlayerCount = () => {
    const type = seasonType?.toLowerCase() || '';
    if (type === '4-a-side') return 4;
    if (type === '6-a-side') return 6;
    if (type === 'singles') return 1;
    if (type === 'doubles') return 2;
    // Extract number from custom type (e.g., "7-a-side" -> 7)
    const match = type.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[0]);
      if (num >= 1 && num <= 12) return num;
    }
    return 4;
  };

  // Initialize games when props change
  useEffect(() => {
    if (initialFormat && initialFormat.length > 0) {
      setGames(initialFormat);
    } else {
      setGames([]);
    }
  }, [initialFormat]);

  const handleChange = (newGames) => {
    setGames(newGames);
    if (onChange) {
      onChange(newGames);
    }
  };

  const addGame = (type) => {
    let startingScore = null;
    if (type === 'singles') startingScore = 501;
    if (type === 'doubles') startingScore = 701;
    if (type === 'leg') startingScore = 1001;
    
    const newGame = {
      id: `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type,
      order: games.length,
      startingScore: startingScore
    };

    const newGames = [...games, newGame];
    handleChange(newGames);
  };

  const removeGame = (index) => {
    const newGames = games.filter((_, i) => i !== index);
    newGames.forEach((game, i) => {
      game.order = i;
    });
    handleChange(newGames);
  };

  const updateGame = (index, updates) => {
    const newGames = [...games];
    newGames[index] = { ...newGames[index], ...updates };
    handleChange(newGames);
  };

  const handleDragStart = (index) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverItem(index);
  };

  const handleDrop = () => {
    if (draggedItem === null || dragOverItem === null) return;
    if (draggedItem === dragOverItem) return;

    const newGames = [...games];
    const draggedGame = newGames[draggedItem];
    
    newGames.splice(draggedItem, 1);
    newGames.splice(dragOverItem, 0, draggedGame);
    
    newGames.forEach((game, i) => {
      game.order = i;
    });
    
    setDraggedItem(null);
    setDragOverItem(null);
    handleChange(newGames);
  };

  const getGameTypeDisplay = (type, game) => {
    switch(type) {
      case 'singles':
        return `Singles (${game.startingScore || 501})`;
      case 'doubles':
        return `Doubles (${game.startingScore || 701})`;
      case 'leg':
        return `Leg (${game.startingScore || 1001}) · ${getLegPlayerCount()} players`;
      default:
        return type;
    }
  };

  if (readOnly) {
    return (
      <div className="match-format-viewer">
        <h4>Match Format:</h4>
        <div className="games-list readonly">
          {games.map((game, index) => (
            <div key={game.id || index} className="game-item-readonly">
              <span className="game-order">{index + 1}.</span>
              <span className="game-type">{getGameTypeDisplay(game.type, game)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="match-format-builder">
      <h4>Build Match Format (Order of Play):</h4>
      
      {games.length === 0 ? (
        <div className="empty-format">
          <p>No games added yet. Click the buttons below to add games.</p>
        </div>
      ) : (
        <div className="games-list">
          {games.map((game, index) => (
            <div
              key={game.id || index}
              className={`game-item ${draggedItem === index ? 'dragging' : ''} ${dragOverItem === index ? 'drag-over' : ''}`}
              draggable={!readOnly}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              onDragEnd={() => setDraggedItem(null)}
            >
              <div className="game-order">
                <span className="order-number">{index + 1}.</span>
                <span className="drag-handle">⋮⋮</span>
              </div>
              
              <div className="game-details">
                <span className="game-type-text">{getGameTypeDisplay(game.type, game)}</span>
                
                <input
                  type="number"
                  className="score-input"
                  value={game.startingScore || 501}
                  onChange={(e) => updateGame(index, { startingScore: parseInt(e.target.value) || 501 })}
                  min="301"
                  max="1001"
                  step="100"
                  placeholder="501"
                />
              </div>
              
              <div className="game-actions">
                <button
                  type="button"
                  className="remove-game-btn"
                  onClick={() => removeGame(index)}
                  title="Remove game"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="add-game-buttons">
        <button type="button" className="add-game-btn singles" onClick={() => addGame('singles')}>+ Add Singles</button>
        <button type="button" className="add-game-btn doubles" onClick={() => addGame('doubles')}>+ Add Doubles</button>
        <button type="button" className="add-game-btn leg" onClick={() => addGame('leg')}>+ Add Leg</button>
      </div>

      {games.length > 0 && (
        <div className="format-summary">
          <strong>Total Games:</strong> {games.length} (
            {games.filter(g => g.type === 'singles').length} Singles, 
            {games.filter(g => g.type === 'doubles').length} Doubles, 
            {games.filter(g => g.type === 'leg').length} Legs
          )
        </div>
      )}
    </div>
  );
}

export default MatchFormatBuilder;