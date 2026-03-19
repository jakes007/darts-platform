import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const UserViewContext = createContext();

export function useUserView() {
  return useContext(UserViewContext);
}

export function UserViewProvider({ children }) {
  const { currentUser, isAdmin } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [allClubs, setAllClubs] = useState([]);
  const [currentViewingUser, setCurrentViewingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // NEW: Role management states
  const [userRoles, setUserRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Fetch all members and clubs
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch members
        const membersSnapshot = await getDocs(collection(db, 'members'));
        const membersData = [];
        membersSnapshot.forEach((doc) => {
          membersData.push({ 
            id: doc.id, 
            ...doc.data(),
            displayName: `${doc.data().firstNames || ''} ${doc.data().surname || ''}`.trim() || 'Unnamed'
          });
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

  // NEW: Fetch competition assignments for a user
  const fetchUserAssignments = async (userId, userEmail) => {
    if (!userId && !userEmail) return [];
    
    setRolesLoading(true);
    try {
      const assignmentsQuery = query(
        collection(db, 'competitionAssignments'),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(assignmentsQuery);
      const userAssignments = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Match by either userId or email
        if (data.userId === userId || data.userEmail === userEmail) {
          userAssignments.push({ id: doc.id, ...data });
        }
      });
      
      setUserRoles(userAssignments);
      return userAssignments;
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return [];
    } finally {
      setRolesLoading(false);
    }
  };

  // UPDATED: Set initial viewing user and fetch their roles
  useEffect(() => {
    const loadUserAndRoles = async () => {
      if (currentUser && allUsers.length > 0) {
        // Find the member that matches this auth user
        const matchingMember = allUsers.find(m => m.authUid === currentUser.uid);
        
        if (matchingMember) {
          setCurrentViewingUser(matchingMember);
          // Fetch their roles/assignments
          await fetchUserAssignments(matchingMember.id, matchingMember.email);
        } else {
          // If no matching member found, maybe the user is just an admin without a member record
          if (isAdmin) {
            setCurrentViewingUser(null);
            // Check if they have any assignments via email
            await fetchUserAssignments(null, currentUser.email);
          }
        }
      }
    };

    loadUserAndRoles();
  }, [currentUser, allUsers, isAdmin]);

  const switchToUser = async (userId) => {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      setCurrentViewingUser(user);
      // Fetch roles for the user we're switching to
      await fetchUserAssignments(user.id, user.email);
    }
  };

  const switchToSelf = async () => {
    if (currentUser && allUsers.length > 0) {
      const self = allUsers.find(m => m.authUid === currentUser.uid);
      if (self) {
        setCurrentViewingUser(self);
        // Fetch roles for self
        await fetchUserAssignments(self.id, self.email);
      }
    }
  };

  // Helper function to get club name from clubId
  const getClubName = (clubId) => {
    if (!clubId) return 'Your Club';
    const club = allClubs.find(c => c.clubId === clubId);
    return club?.name || clubId;
  };

  // NEW: Permission checking functions
  const hasPermission = (competitionId, match, requiredRole) => {
    // Super admin (isAdmin from auth) can do everything
    if (isAdmin) return true;

    // Check specific roles from assignments
    return userRoles.some(role => {
      // Competition admin can do everything in their competition
      if (role.role === 'admin' && role.competitionId === competitionId) return true;

      // Captain can only edit their team's matches
      if (role.role === 'captain' && 
          role.competitionId === competitionId && 
          role.teamId === match?.homeTeamId) return true;

      // Controller permissions (for singles matches maybe)
      if (role.role === 'controller' && role.competitionId === competitionId) {
        return requiredRole === 'controller';
      }

      return false;
    });
  };

  const canEditMatch = (match) => {
    if (!match || !match.seasonId) return false;
    // Only allow editing if match is not completed
    if (match.status === 'completed') return false;
    
    return hasPermission(match.seasonId, match, 'captain');
  };

  // Helper to check if current user is a captain for a specific team in a competition
  const isTeamCaptain = (competitionId, teamId) => {
    return userRoles.some(role => 
      role.role === 'captain' && 
      role.competitionId === competitionId && 
      role.teamId === teamId
    );
  };

  // Helper to get all competitions user has roles in
  const getUserCompetitions = () => {
    const competitionIds = [...new Set(userRoles.map(r => r.competitionId))];
    return competitionIds;
  };

  // Helper to get user's role badge text
  const getUserRoleBadge = () => {
    if (isAdmin) return '👑 Admin';
    if (userRoles.length === 0) return '👤 Member';
    
    const roles = userRoles.map(r => {
      if (r.role === 'captain') return '🏆 Captain';
      if (r.role === 'controller') return '🎯 Controller';
      return r.role;
    });
    
    return roles.join(', ');
  };

  const value = {
    allUsers,
    allClubs,
    currentViewingUser,
    switchToUser,
    switchToSelf,
    getClubName,
    isAdmin,
    loading,
    // New role/permission stuff
    userRoles,
    rolesLoading,
    hasPermission,
    canEditMatch,
    isTeamCaptain,
    getUserCompetitions,
    getUserRoleBadge,
    refreshRoles: () => fetchUserAssignments(
      currentViewingUser?.id, 
      currentViewingUser?.email || currentUser?.email
    )
  };

  return (
    <UserViewContext.Provider value={value}>
      {children}
    </UserViewContext.Provider>
  );
}