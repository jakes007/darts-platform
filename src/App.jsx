import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"; // Make sure Navigate is imported
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import AdminModal from "./components/AdminModal.jsx";
import { AuthProvider } from "./context/AuthContext";
import { UserViewProvider } from "./context/UserViewContext";
import { useAuth } from './context/AuthContext'; // Add this for the dashboard route
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
                
                {/* Catch-all */}
                <Route path="*" element={<Home />} />
              </Routes>
            </main>
            
            <Footer />
            
            {/* Admin Modal - for super admin login only */}
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

export default App;