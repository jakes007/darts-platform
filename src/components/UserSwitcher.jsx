import React, { useState, useEffect, useRef } from 'react';
import { useUserView } from '../context/UserViewContext';
import { useAuth } from '../context/AuthContext';
import './UserSwitcher.css';

function UserSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const { allUsers, currentViewingUser, switchToUser, switchToSelf, isAdmin } = useUserView();
  const { currentUser } = useAuth();

  // Find current user's name
  const currentUserMember = allUsers.find(m => m.authUid === currentUser?.uid);
  const isViewingSelf = currentViewingUser?.authUid === currentUser?.uid;

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

  // Filter users based on search
  const filteredUsers = allUsers.filter(user => 
    `${user.firstNames} ${user.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.clubId?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 8); // Show only first 8 for performance

  // If not admin, don't show the switcher
  if (!isAdmin) return null;

  return (
    <div className="user-switcher" ref={dropdownRef}>
      <button 
        className="switcher-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="switcher-icon">👤</span>
        <span className="switcher-name">
          {currentViewingUser ? 
            `${currentViewingUser.firstNames} ${currentViewingUser.surname}` : 
            'Select User'}
        </span>
        <span className={`switcher-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="switcher-dropdown">
          {!isViewingSelf && (
            <div className="viewing-indicator">
              👁️ Viewing as: <strong>{currentViewingUser?.firstNames} {currentViewingUser?.surname}</strong>
              <button className="switch-to-self" onClick={() => {
                switchToSelf();
                setIsOpen(false);
              }}>
                Switch to me
              </button>
            </div>
          )}

          <div className="search-box">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              autoFocus
            />
          </div>

          <div className="users-list">
            {filteredUsers.map(user => (
              <button
                key={user.id}
                className={`user-item ${currentViewingUser?.id === user.id ? 'active' : ''}`}
                onClick={() => {
                  switchToUser(user.id);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                <span className="user-name">{user.firstNames} {user.surname}</span>
                <span className="user-club">{user.clubId}</span>
                {user.authUid === currentUser?.uid && (
                  <span className="user-badge">You</span>
                )}
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <div className="no-results">No users found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserSwitcher;