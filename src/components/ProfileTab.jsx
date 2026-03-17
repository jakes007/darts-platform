import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useUserView } from '../context/UserViewContext';
import { formatDateDisplay } from '../utils/dateHelpers'; // Add this import
import './ProfileTab.css';

function ProfileTab() {
  const { currentViewingUser } = useUserView();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Initialize form data when user loads
  React.useEffect(() => {
    if (currentViewingUser) {
      setFormData({
        firstNames: currentViewingUser.firstNames || '',
        surname: currentViewingUser.surname || '',
        initials: currentViewingUser.initials || '',
        callingName: currentViewingUser.callingName || '',
        cellNo: currentViewingUser.cellNo || '',
        email: currentViewingUser.email || '',
        homeTel: currentViewingUser.homeTel || '',
        workTel: currentViewingUser.workTel || '',
        homeAddress: currentViewingUser.homeAddress || ''
      });
    }
  }, [currentViewingUser]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await updateDoc(doc(db, 'members', currentViewingUser.id), formData);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to original data
    setFormData({
      firstNames: currentViewingUser.firstNames || '',
      surname: currentViewingUser.surname || '',
      initials: currentViewingUser.initials || '',
      callingName: currentViewingUser.callingName || '',
      cellNo: currentViewingUser.cellNo || '',
      email: currentViewingUser.email || '',
      homeTel: currentViewingUser.homeTel || '',
      workTel: currentViewingUser.workTel || '',
      homeAddress: currentViewingUser.homeAddress || ''
    });
  };

  if (!currentViewingUser) return null;

  return (
    <div className="profile-tab">
      <div className="profile-header">
        <h2>Profile Information</h2>
        {!isEditing && (
          <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-section">
            <h3>Personal Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>First Names</label>
                <input
                  type="text"
                  name="firstNames"
                  value={formData.firstNames}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Surname</label>
                <input
                  type="text"
                  name="surname"
                  value={formData.surname}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Initials</label>
                <input
                  type="text"
                  name="initials"
                  value={formData.initials}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Calling Name</label>
                <input
                  type="text"
                  name="callingName"
                  value={formData.callingName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group readonly">
                <label>ID Number</label>
                <input
                  type="text"
                  value={currentViewingUser.idNumber || ''}
                  readOnly
                  disabled
                />
                <small>Cannot be changed</small>
              </div>
              <div className="form-group readonly">
                <label>Date of Birth</label>
                <input
                  type="text"
                  value={formatDateDisplay(currentViewingUser.dateOfBirth)}
                  readOnly
                  disabled
                />
                <small>Cannot be changed</small>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Contact Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Cell Number</label>
                <input
                  type="tel"
                  name="cellNo"
                  value={formData.cellNo}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Home Telephone</label>
                <input
                  type="tel"
                  name="homeTel"
                  value={formData.homeTel}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Work Telephone</label>
                <input
                  type="tel"
                  name="workTel"
                  value={formData.workTel}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Home Address</label>
              <textarea
                name="homeAddress"
                value={formData.homeAddress}
                onChange={handleChange}
                rows="3"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="profile-view">
          <div className="info-section">
            <h3>Personal Details</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Name:</span>
                <span className="info-value">{currentViewingUser.firstNames} {currentViewingUser.surname}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Initials:</span>
                <span className="info-value">{currentViewingUser.initials || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Calling Name:</span>
                <span className="info-value">{currentViewingUser.callingName || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">ID Number:</span>
                <span className="info-value">{currentViewingUser.idNumber || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Date of Birth:</span>
                <span className="info-value">
                  {formatDateDisplay(currentViewingUser.dateOfBirth)}
                </span>
              </div>
            </div>
          </div>

          <div className="info-section">
            <h3>Contact Details</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Cell:</span>
                <span className="info-value">{currentViewingUser.cellNo || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{currentViewingUser.email || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Home Tel:</span>
                <span className="info-value">{currentViewingUser.homeTel || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Work Tel:</span>
                <span className="info-value">{currentViewingUser.workTel || '—'}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">Address:</span>
                <span className="info-value">{currentViewingUser.homeAddress || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileTab;