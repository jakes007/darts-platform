import React from 'react';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

function AdminDashboard() {
  const { currentUser, logout } = useAuth();

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-user">
          <span>{currentUser?.email}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Players</h3>
          <p className="stat-number">0</p>
        </div>
        <div className="stat-card">
          <h3>Active Leagues</h3>
          <p className="stat-number">0</p>
        </div>
        <div className="stat-card">
          <h3>Matches</h3>
          <p className="stat-number">0</p>
        </div>
        <div className="stat-card">
          <h3>Teams</h3>
          <p className="stat-number">0</p>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="section">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <button className="action-btn">Add Player</button>
            <button className="action-btn">Create League</button>
            <button className="action-btn">Schedule Match</button>
            <button className="action-btn">Enter Results</button>
          </div>
        </div>

        <div className="section">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            <p className="no-activity">No recent activity</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;