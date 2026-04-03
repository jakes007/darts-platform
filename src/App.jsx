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
import PublicLiveGameViewer from './pages/public/PublicLiveGameViewer';

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

// ScrollToTop Component - MUST be inside Router
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

// Component that uses useLocation - MUST be inside Router
function AppContent() {
  const [showAdminModal, setShowAdminModal] = useState(false);
  const location = useLocation();
  
  // Check if we're on the live match page (hide header and footer)
  const isLiveMatchPage = location.pathname.startsWith('/live-match');

  return (
    <div className="App">
      {/* Only show header if NOT on live match page */}
      {!isLiveMatchPage && <Header onAdminLoginClick={() => setShowAdminModal(true)} />}
      
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
              <CreateTournamentWrapper />
            </AdminRoute>
          } />

          <Route path="/tournament/:id" element={<TournamentView />} />
          
          {/* Match Lineup Route */}
          <Route path="/match/:id/lineup" element={<MatchLineup />} />
          
          {/* Match Scoring Route */}
          <Route path="/match/:matchId/scoring" element={<RoundRobinScoring />} />

          {/* Public Live Match Viewer - No header/footer */}
          <Route path="/live-match/:matchId/game/:gameId" element={<PublicLiveGameViewer />} />
          
          {/* Catch-all */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      
      {/* Only show footer if NOT on live match page */}
      {!isLiveMatchPage && <Footer />}
      
      <AdminModal 
        isOpen={showAdminModal} 
        onClose={() => setShowAdminModal(false)} 
      />
    </div>
  );
}

// Create a wrapper component to handle navigation
function CreateTournamentWrapper() {
  const navigate = useNavigate();
  return <TournamentManager onClose={() => navigate('/admin/tournaments')} />;
}

// Main App component - Router is the parent
function App() {
  return (
    <Router>
      <AuthProvider>
        <UserViewProvider>
          <AppContent />
        </UserViewProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;