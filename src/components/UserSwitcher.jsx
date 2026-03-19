import React, { useState, useEffect, useRef } from 'react';
import { useUserView } from '../context/UserViewContext';
import { useAuth } from '../context/AuthContext';
import './UserSwitcher.css';

function UserSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const { 
    allUsers, 
    currentViewingUser, 
    switchToUser, 
    switchToSelf, 
    isAdmin,
    userRoles,
    rolesLoading 
  } = useUserView();
  const { currentUser } = useAuth();

  // Find current user's member record
  const currentUserMember = allUsers.find(m => m.authUid === currentUser?.uid);
  const isViewingSelf = currentViewingUser?.authUid === currentUser?.uid;

  // Get display name for the button
  const getDisplayName = () => {
    if (currentViewingUser) {
      return `${currentViewingUser.firstNames || ''} ${currentViewingUser.surname || ''}`.trim() || 'Unnamed User';
    }
    return 'Select User';
  };

  // Check if current viewing user has a captain role
  const hasCaptainRole = () => {
    if (!currentViewingUser) return false;
    
    // If viewing self and admin, don't show captain badge
    if (isAdmin && isViewingSelf) return false;
    
    return userRoles.some(role => role.role === 'captain');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter users based on search (only by name now)
  const filteredUsers = allUsers.filter(user => 
    `${user.firstNames || ''} ${user.surname || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 8); // Show only first 8 for performance

  // If not admin, don't show the switcher
  if (!isAdmin) return null;

  const showCaptainBadge = hasCaptainRole();
  const displayName = getDisplayName();

  return (
    <div className="user-switcher" ref={dropdownRef}>
      <button 
        className="switcher-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="switcher-icon">👤</span>
        <span className="switcher-name">{displayName}</span>
        {showCaptainBadge && (
          <span className="captain-badge-switcher">🏆 Captain</span>
        )}
        <span className={`switcher-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="switcher-dropdown">
          {/* Viewing indicator and switch to self */}
          {!isViewingSelf && currentUserMember && (
            <div className="viewing-indicator">
              <div className="viewing-info">
                <span className="viewing-icon">👁️</span>
                <span className="viewing-text">
                  Viewing: <strong>{currentViewingUser?.firstNames || ''} {currentViewingUser?.surname || ''}</strong>
                </span>
              </div>
              <button 
                className="switch-to-self" 
                onClick={() => {
                  switchToSelf();
                  setIsOpen(false);
                }}
              >
                Switch to me
              </button>
            </div>
          )}

          {/* Search box */}
          <div className="search-box">
            <input
              type="text"
              placeholder="Search players by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              autoFocus
            />
          </div>

          {/* Users list */}
          <div className="users-list">
            {/* Show current user first */}
            {currentUserMember && (
              <button
                key={currentUserMember.id}
                className={`user-item ${isViewingSelf ? 'active' : ''}`}
                onClick={() => {
                  switchToSelf();
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                <span className="user-name">
                  {currentUserMember.firstNames || ''} {currentUserMember.surname || ''}
                </span>
                {isAdmin && isViewingSelf && (
                  <span className="admin-badge">Admin</span>
                )}
              </button>
            )}

            {/* Show other users */}
            {filteredUsers
              .filter(user => user.authUid !== currentUser?.uid) // Exclude current user
              .map(user => {
                // Check if this user has captain role (we'd need to pre-fetch or check assignments)
                // For now, we'll just show the name - roles will show in the main button when selected
                const isSelected = currentViewingUser?.id === user.id && !isViewingSelf;
                
                return (
                  <button
                    key={user.id}
                    className={`user-item ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      switchToUser(user.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <span className="user-name">
                      {user.firstNames || ''} {user.surname || ''}
                    </span>
                  </button>
                );
              })}
              
            {filteredUsers.length === 0 && (
              <div className="no-results">No players found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserSwitcher;