import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Components
import Header from './components/Header';
import StatsGrid from './components/StatsGrid';
import AdminLoginModal from './components/AdminLoginModal';
import UserLoginModal from './components/UserLoginModal';
import RegisterModal from './components/RegisterModal';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  return (
    <Router>
      <div className="App">
        {/* Header - always visible */}
        <Header 
          onLoginClick={() => setIsUserModalOpen(true)}
          onRegisterClick={() => setIsRegisterModalOpen(true)}
        />

        {/* Routes */}
        <Routes>
          {/* Landing Page Route (home) */}
          <Route path="/" element={
            <main>
              {/* Hero Section */}
              <section className="hero">
                <h1 className="hero-title">GUEST DASHBOARD</h1>
                <p className="hero-subtitle"></p>
              </section>

              {/* Stats Grid */}
              <StatsGrid />

              {/* Coming Soon Section */}
              <section className="coming-soon">
                <h2>STATS & TOURNAMENTS</h2>
                <div className="feature-cards">
                  <div className="feature-card">
                    <h3>Match Stats</h3>
                    <p>Coming Soon</p>
                  </div>
                  <div className="feature-card">
                    <h3>Competitions</h3>
                    <p>Coming Soon</p>
                  </div>
                  <div className="feature-card">
                    <h3>Player Profiles</h3>
                    <p>Coming Soon</p>
                  </div>
                </div>
              </section>

              {/* Footer with Admin Login */}
              <footer className="footer">
                <button 
                  className="admin-login-link"
                  onClick={() => setIsAdminModalOpen(true)}
                >
                  Admin Login
                </button>
                <p className="copyright">© 2026 SUPERSTATS</p>
              </footer>
            </main>
          } />

          {/* Protected Admin Route */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />
        </Routes>

        {/* Modals - always available */}
        <AdminLoginModal 
          isOpen={isAdminModalOpen} 
          onClose={() => setIsAdminModalOpen(false)} 
        />
        <UserLoginModal 
          isOpen={isUserModalOpen} 
          onClose={() => setIsUserModalOpen(false)} 
        />
        <RegisterModal 
          isOpen={isRegisterModalOpen} 
          onClose={() => setIsRegisterModalOpen(false)} 
        />
      </div>
    </Router>
  );
}

export default App;