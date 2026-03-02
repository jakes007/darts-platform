import React, { useState, useEffect, useRef } from 'react';
import './RegisterModal.css';

const RegisterModal = ({ isOpen, onClose }) => {
  const modalRef = useRef(null);
  
  // Form field states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    province: '',
    district: '',
    association: '',
    club: ''
  });

  // Search term states for each dropdown
  const [searchTerms, setSearchTerms] = useState({
    province: '',
    district: '',
    association: '',
    club: ''
  });

  // Dropdown open/close states
  const [openDropdown, setOpenDropdown] = useState(null);

  // Error states
  const [errors, setErrors] = useState({});

  // Password requirements
  const hasCapitalLetter = (str) => /[A-Z]/.test(str);
  const hasSpecialSymbol = (str) => /[!@#$%^&*(),.?":{}|<>]/.test(str);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // ESC key to close
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.addEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        province: '',
        district: '',
        association: '',
        club: ''
      });
      setSearchTerms({
        province: '',
        district: '',
        association: '',
        club: ''
      });
      setErrors({});
      setOpenDropdown(null);
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSearchChange = (field, value) => {
    setSearchTerms(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSelectOption = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setSearchTerms(prev => ({
      ...prev,
      [field]: value
    }));
    setOpenDropdown(null);
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const toggleDropdown = (field) => {
    setOpenDropdown(openDropdown === field ? null : field);
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      if (!hasCapitalLetter(formData.password)) {
        newErrors.password = 'Password must contain at least one capital letter';
      } else if (!hasSpecialSymbol(formData.password)) {
        newErrors.password = 'Password must contain at least one special symbol';
      }
    }

    // Confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Check all dropdown fields are filled
    if (!formData.province) newErrors.province = 'Province is required';
    if (!formData.district) newErrors.district = 'District is required';
    if (!formData.association) newErrors.association = 'Association is required';
    if (!formData.club) newErrors.club = 'Club is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = () => {
    if (validateForm()) {
      // For now, just show that validation passed
      console.log('Form is valid:', formData);
      // Modal stays open for now
    }
  };

  const handleCancel = () => {
    onClose();
  };

  // Dropdown component for searchable selects
  const SearchableDropdown = ({ field, placeholder, value, searchTerm }) => (
    <div className="dropdown-container">
      <div 
        className={`dropdown-input ${errors[field] ? 'error' : ''}`}
        onClick={() => toggleDropdown(field)}
      >
        <input
          type="text"
          placeholder={placeholder}
          value={openDropdown === field ? searchTerm : value}
          onChange={(e) => handleSearchChange(field, e.target.value)}
          onFocus={() => toggleDropdown(field)}
          readOnly={openDropdown !== field}
        />
        <span className="dropdown-arrow">▼</span>
      </div>
      
      {openDropdown === field && (
        <div className="dropdown-menu">
          <div className="no-options">
            No options available
          </div>
        </div>
      )}
      {errors[field] && <span className="error-message">{errors[field]}</span>}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="register-modal" ref={modalRef}>
        <div className="modal-header">
          <h2>Register</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-subtitle">
          Create your account
        </div>

        <div className="modal-body">
          {/* Email Field */}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={handleInputChange}
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleInputChange}
              className={errors.password ? 'error' : ''}
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          {/* Confirm Password Field */}
          <div className="form-group">
            <label>Re-Enter Password</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={errors.confirmPassword ? 'error' : ''}
            />
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>

          {/* Province Dropdown */}
          <div className="form-group">
            <label>Province</label>
            <SearchableDropdown
              field="province"
              placeholder="Search province..."
              value={formData.province}
              searchTerm={searchTerms.province}
            />
          </div>

          {/* District Dropdown */}
          <div className="form-group">
            <label>District</label>
            <SearchableDropdown
              field="district"
              placeholder="Search district..."
              value={formData.district}
              searchTerm={searchTerms.district}
            />
          </div>

          {/* Association Dropdown */}
          <div className="form-group">
            <label>Association</label>
            <SearchableDropdown
              field="association"
              placeholder="Search association..."
              value={formData.association}
              searchTerm={searchTerms.association}
            />
          </div>

          {/* Club Dropdown */}
          <div className="form-group">
            <label>Club</label>
            <SearchableDropdown
              field="club"
              placeholder="Search club..."
              value={formData.club}
              searchTerm={searchTerms.club}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={handleCancel}>
            Cancel
          </button>
          <button className="register-button" onClick={handleRegister}>
            Register
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;