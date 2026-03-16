import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import AdminModal from "./components/AdminModal.jsx";
import { AuthProvider } from "./context/AuthContext";
import "./App.css";

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
              
              {/* Admin Route (Protected) */}
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
              
              {/* Catch-all - redirect to home */}
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
          
          <Footer />
          
          {/* Admin Modal - for super admin login */}
          <AdminModal 
            isOpen={showAdminModal} 
            onClose={() => setShowAdminModal(false)} 
          />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;