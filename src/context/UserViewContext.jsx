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
  const [allClubs, setAllClubs] = useState([]); // Add clubs state
  const [currentViewingUser, setCurrentViewingUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch all members and clubs
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch members
        const membersSnapshot = await getDocs(collection(db, 'members'));
        const membersData = [];
        membersSnapshot.forEach((doc) => {
          membersData.push({ id: doc.id, ...doc.data() });
        });
        setAllUsers(membersData);

        // Fetch clubs
        const clubsSnapshot = await getDocs(collection(db, 'clubs'));
        const clubsData = [];
        clubsSnapshot.forEach((doc) => {
          clubsData.push({ id: doc.id, ...doc.data() });
        });
        setAllClubs(clubsData);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

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
      }
    }
  };

  // Helper function to get club name from clubId
  const getClubName = (clubId) => {
    if (!clubId) return 'Your Club';
    const club = allClubs.find(c => c.clubId === clubId);
    return club?.name || clubId; // Return club name if found, otherwise return the ID
  };

  const value = {
    allUsers,
    allClubs,
    currentViewingUser,
    switchToUser,
    switchToSelf,
    getClubName, // Add this helper function
    isAdmin,
    loading
  };

  return (
    <UserViewContext.Provider value={value}>
      {children}
    </UserViewContext.Provider>
  );
}