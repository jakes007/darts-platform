import React, { useState } from 'react';
import './Footer.css';
import { FiMail, FiPhone, FiFacebook, FiInstagram } from 'react-icons/fi';
import AdminModal from './AdminModal';
import { FaWhatsapp } from "react-icons/fa";

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
          {/* Left Column - Phone, Facebook, Instagram (DESKTOP ORDER) */}
          <div className="footer-contact">
  <div className="contact-item phone-item">
    <FaWhatsapp className="contact-icon" />
    <a
      href="https://wa.me/27648896677"
      target="_blank"
      rel="noopener noreferrer"
    >
      +27 64 890 6677
    </a>
  </div>
            
            {/* Mobile Email - ONLY VISIBLE ON MOBILE */}
            <div className="mobile-email">
              <FiMail className="email-icon" />
              <a href="mailto:observatorydarts@gmail.com">observatorydarts@gmail.com</a>
            </div>
            
            <div className="contact-item facebook-item">
              <FiFacebook className="contact-icon" />
              <a href="https://www.facebook.com/obsdarts" target="_blank" rel="noopener noreferrer">obsdarts</a>
            </div>
            
            <div className="contact-item instagram-item">
              <FiInstagram className="contact-icon" />
              <a href="https://www.instagram.com/observatorydarts" target="_blank" rel="noopener noreferrer">observatorydarts</a>
            </div>
          </div>

          {/* Center Column - Email & Copyright (DESKTOP ORDER) */}
          <div className="footer-center">
            <div className="email-item desktop-email">
              <FiMail className="email-icon" />
              <a href="mailto:observatorydarts@gmail.com">observatorydarts@gmail.com</a>
            </div>
            <div className="copyright-text">
              <p>© ODA 2026 - Created by Jason Isaacs</p>
            </div>
          </div>

          {/* Right Column - Admin Login - Desktop Only */}
<div className="footer-admin desktop-only">
  <a href="#" onClick={openModal} className="admin-login-link">Admin Login</a>
</div>
        </div>
      </footer>

      <AdminModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}

export default Footer;