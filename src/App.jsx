import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import AdminModal from "./components/AdminModal.jsx";
import { AuthProvider } from "./context/AuthContext";
import { UserViewProvider } from "./context/UserViewContext"; // ← ADD THIS
import "./App.css";
import ClubDashboard from './pages/club/ClubDashboard';

// Public Pages
import Home from './pages/public/Home';
import Leaderboards from './pages/public/Leaderboards';
import Fixtures from './pages/public/Fixtures';
import Results from './pages/public/Results';
import PlayerProfile from './pages/public/PlayerProfile';

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminRoute from "./components/AdminRoute.jsx";

function App() {
  const [showAdminModal, setShowAdminModal] = useState(false);

  return (
    <Router>
      <AuthProvider>
        <UserViewProvider> {/* ← ADD THIS WRAPPER */}
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

                {/* Club Dashboard (protected - logged in users only) */}
<Route path="/dashboard" element={
  <ClubDashboard />
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