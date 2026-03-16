import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import AdminModal from "./components/AdminModal.jsx";
import { AuthProvider } from "./context/AuthContext";
import "./App.css";

function App() {
  const [showAdminModal, setShowAdminModal] = useState(false);

  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Header onAdminLoginClick={() => setShowAdminModal(true)} />
          <main>
            <Routes>
              <Route path="/" element={<div>{/* Landing page */}</div>} />
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
            </Routes>
          </main>
          <Footer />
          
          {/* Admin Modal */}
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