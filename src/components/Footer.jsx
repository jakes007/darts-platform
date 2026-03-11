import React, { useState } from 'react';
import './Footer.css';
import { FiMail, FiPhone, FiFacebook, FiInstagram } from 'react-icons/fi';
import AdminModal from './AdminModal';

function Footer() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (e) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <footer className="footer">
        <div className="container footer-container">
          {/* Left Column - Phone, Facebook, Instagram */}
          <div className="footer-contact">
            <div className="contact-item">
              <FiPhone className="contact-icon" />
              <a href="tel:+27648896677">+27 64 890 6677</a>
            </div>
            <div className="contact-item">
              <FiFacebook className="contact-icon" />
              <a href="https://www.facebook.com/obsdarts" target="_blank" rel="noopener noreferrer">obsdarts</a>
            </div>
            <div className="contact-item">
              <FiInstagram className="contact-icon" />
              <a href="https://www.instagram.com/observatorydarts" target="_blank" rel="noopener noreferrer">observatorydarts</a>
            </div>
          </div>

          {/* Center Column - Email & Copyright */}
          <div className="footer-center">
            <div className="email-item">
              <FiMail className="email-icon" />
              <a href="mailto:info@observatorydarts.co.za">info@observatorydarts.co.za</a>
            </div>
            <div className="copyright-text">
              <p>© ODA 2026</p>
            </div>
          </div>

          {/* Right Column - Admin Login */}
          <div className="footer-admin">
            <a href="#" onClick={openModal} className="admin-login-link">Admin Login</a>
          </div>
        </div>
      </footer>

      <AdminModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}

export default Footer;