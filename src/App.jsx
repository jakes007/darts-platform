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
        {/* Animated Background */}
        <div className="animated-bg"></div>
        
        {/* Optional: Add floating particles for extra effect */}
        <div className="particles">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 20}s`,
                animationDuration: `${15 + Math.random() * 20}s`
              }}
            />
          ))}
        </div>

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
                <h1 className="hero-title animate-item">GUEST DASHBOARD</h1>
                <p className="hero-subtitle animate-item delay-1"></p>
              </section>

              {/* Stats Grid */}
              <StatsGrid />

              {/* Coming Soon Section */}
              <section className="coming-soon">
                <h2 className="animate-item delay-3">STATS & TOURNAMENTS</h2>
                <div className="feature-cards">
                  <div className="feature-card animate-item delay-4">
                    <h3>Match Stats</h3>
                    <p>Coming Soon</p>
                  </div>
                  <div className="feature-card animate-item delay-5">
                    <h3>Competitions</h3>
                    <p>Coming Soon</p>
                  </div>
                  <div className="feature-card animate-item delay-6">
                    <h3>Player Profiles</h3>
                    <p>Coming Soon</p>
                  </div>
                </div>
              </section>

              {/* Footer with Admin Login */}
              <footer className="footer">
                <button 
                  className="admin-login-link animate-item delay-7"
                  onClick={() => setIsAdminModalOpen(true)}
                >
                  Admin Login
                </button>
                <p className="copyright animate-item delay-8">© 2026 SUPERSTATS</p>
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