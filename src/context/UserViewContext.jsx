import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const UserViewContext = createContext();

export function useUserView() {
  return useContext(UserViewContext);
}

export function UserViewProvider({ children }) {
  const { currentUser, isAdmin } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [currentViewingUser, setCurrentViewingUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch all members (potential users) for admin switcher
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const membersSnapshot = await getDocs(collection(db, 'members'));
        const membersData = [];
        membersSnapshot.forEach((doc) => {
          membersData.push({ id: doc.id, ...doc.data() });
        });
        setAllUsers(membersData);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsers();
  }, []);

  // Set initial viewing user to current logged in user
  useEffect(() => {
    if (currentUser && allUsers.length > 0) {
      // Find the member record that matches this auth user
      const matchingMember = allUsers.find(m => m.authUid === currentUser.uid);
      if (matchingMember) {
        setCurrentViewingUser(matchingMember);
      }
    }
  }, [currentUser, allUsers]);

  // Set initial viewing user to current logged in user
useEffect(() => {
  if (currentUser && allUsers.length > 0) {
    const matchingMember = allUsers.find(m => m.authUid === currentUser.uid);
    if (matchingMember) {
      setCurrentViewingUser(matchingMember);
    }
  }
}, [currentUser, allUsers]);

  const switchToUser = (userId) => {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      setCurrentViewingUser(user);
    }
  };

  const switchToSelf = () => {
    if (currentUser && allUsers.length > 0) {
      const self = allUsers.find(m => m.authUid === currentUser.uid);
      if (self) {
        setCurrentViewingUser(self);
        // Close dropdown if needed
      }
    }
  };

  const value = {
    allUsers,
    currentViewingUser,
    switchToUser,
    switchToSelf,
    isAdmin,
    loading
  };

  return (
    <UserViewContext.Provider value={value}>
      {children}
    </UserViewContext.Provider>
  );
}