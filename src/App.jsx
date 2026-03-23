import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import AdminModal from "./components/AdminModal.jsx";
import { AuthProvider } from "./context/AuthContext";
import { UserViewProvider } from "./context/UserViewContext";
import { useAuth } from './context/AuthContext';
import "./App.css";

// Public Pages
import Home from './pages/public/Home';
import Leaderboards from './pages/public/Leaderboards';
import Fixtures from './pages/public/Fixtures';
import Results from './pages/public/Results';
import PlayerProfile from './pages/public/PlayerProfile';

// Club Dashboard
import ClubDashboard from './pages/club/ClubDashboard';

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminRoute from "./components/AdminRoute.jsx";

// Import the new page
import MatchLineup from './pages/MatchLineup';

import TournamentDashboard from './pages/TournamentDashboard';
import TournamentManager from './components/SinglesTournamentManager';

import TournamentView from './pages/TournamentView';

import RoundRobinScoring from './pages/RoundRobinScoring';

// ScrollToTop Component
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}

// Protected Dashboard Route Component
function ProtectedDashboardRoute({ children }) {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/" />;
  }
  
  return children;
}

function App() {
  const [showAdminModal, setShowAdminModal] = useState(false);

  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <UserViewProvider>
          <div className="App">
            <Header onAdminLoginClick={() => setShowAdminModal(true)} />
            
            <main>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/leaderboards" element={<Leaderboards />} />
                <Route path="/fixtures" element={<Fixtures />} />
                <Route path="/results" element={<Results />} />
                <Route path="/player/:id" element={<PlayerProfile />} />
                
                {/* Club Dashboard - Protected */}
                <Route path="/dashboard" element={
                  <ProtectedDashboardRoute>
                    <ClubDashboard />
                  </ProtectedDashboardRoute>
                } />
                
                {/* Admin Route (Protected) */}
                <Route path="/admin" element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } />

                {/* Singles Tournament Routes */}
                <Route path="/admin/tournaments" element={
                  <AdminRoute>
                    <TournamentDashboard />
                  </AdminRoute>
                } />
                <Route path="/admin/create-tournament" element={
                  <AdminRoute>
                    {/* useNavigate needs to be inside Router, so we create a wrapper */}
                    <CreateTournamentWrapper />
                  </AdminRoute>
                } />

<Route path="/tournament/:id" element={<TournamentView />} />
                
                {/* Match Lineup Route */}
                <Route path="/match/:id/lineup" element={<MatchLineup />} />
                
                {/* Catch-all */}
                <Route path="*" element={<Home />} />

                <Route path="/match/:matchId/scoring" element={<RoundRobinScoring />} />

              </Routes>
            </main>
            
            <Footer />
            
            <AdminModal 
              isOpen={showAdminModal} 
              onClose={() => setShowAdminModal(false)} 
            />
          </div>
        </UserViewProvider>
      </AuthProvider>
    </Router>
  );
}

// Create a wrapper component to handle navigation
function CreateTournamentWrapper() {
  const navigate = useNavigate();
  return <TournamentManager onClose={() => navigate('/admin/tournaments')} />;
}

export default App;