import React from 'react';

function AdminHeader({ user, onLogout }) {
  return (
    <div className="admin-header">
      <h1>Admin Dashboard</h1>
      <div className="admin-user">
        <span>{user?.email}</span>
        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </div>
  );
}

export default AdminHeader;