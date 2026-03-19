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

  // Initialize games when props change
  useEffect(() => {
    if (initialFormat && initialFormat.length > 0) {
      setGames(initialFormat);
    } else {
      // Default empty state
      setGames([]);
    }
  }, [initialFormat]);

  // Notify parent of changes
  const handleChange = (newGames) => {
    setGames(newGames);
    if (onChange) {
      onChange(newGames);
    }
  };

  // Add a new game with proper defaults
  const addGame = (type) => {
    let startingScore = null;
    
    // Set default scores based on game type
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

  // Remove a game
  const removeGame = (index) => {
    const newGames = games.filter((_, i) => i !== index);
    // Update order values
    newGames.forEach((game, i) => {
      game.order = i;
    });
    handleChange(newGames);
  };

  // Update game details (starting score)
  const updateGame = (index, updates) => {
    const newGames = [...games];
    newGames[index] = { ...newGames[index], ...updates };
    handleChange(newGames);
  };

  // Handle drag start
  const handleDragStart = (index) => {
    setDraggedItem(index);
  };

  // Handle drag over
  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverItem(index);
  };

  // Handle drop
  const handleDrop = () => {
    if (draggedItem === null || dragOverItem === null) return;
    if (draggedItem === dragOverItem) return;

    const newGames = [...games];
    const draggedGame = newGames[draggedItem];
    
    // Remove dragged item
    newGames.splice(draggedItem, 1);
    // Insert at new position
    newGames.splice(dragOverItem, 0, draggedGame);
    
    // Update order values
    newGames.forEach((game, i) => {
      game.order = i;
    });
    
    setDraggedItem(null);
    setDragOverItem(null);
    handleChange(newGames);
  };

  // Get display name for game type
  const getGameTypeDisplay = (type) => {
    switch(type) {
      case 'singles':
        return 'Singles';
      case 'doubles':
        return 'Doubles';
      case 'leg':
        return 'Leg';
      default:
        return type;
    }
  };

  // Get player count for game
  const getPlayerCount = (type) => {
    if (type === 'singles') return '1 player';
    if (type === 'doubles') return '2 players';
    if (type === 'leg') {
      const match = seasonType.match(/(\d+)/);
      const count = match ? parseInt(match[0]) : 4;
      return `${count} players`;
    }
    return '';
  };

  if (readOnly) {
    return (
      <div className="match-format-viewer">
        <h4>Match Format:</h4>
        <div className="games-list readonly">
          {games.map((game, index) => (
            <div key={game.id || index} className="game-item-readonly">
              <span className="game-order">{index + 1}.</span>
              <span className="game-type">{getGameTypeDisplay(game.type)} ({game.startingScore}) · {getPlayerCount(game.type)}</span>
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
                {/* Game type with player count */}
                <span className="game-type-text">
                  {getGameTypeDisplay(game.type)} · {getPlayerCount(game.type)}
                </span>
                
                {/* Score input for ALL game types */}
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
        <button
          type="button"
          className="add-game-btn singles"
          onClick={() => addGame('singles')}
        >
          + Add Singles
        </button>
        <button
          type="button"
          className="add-game-btn doubles"
          onClick={() => addGame('doubles')}
        >
          + Add Doubles
        </button>
        <button
          type="button"
          className="add-game-btn leg"
          onClick={() => addGame('leg')}
        >
          + Add Leg
        </button>
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