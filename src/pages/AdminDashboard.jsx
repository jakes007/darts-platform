import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, query, where, getDocs, addDoc, 
  serverTimestamp, doc, deleteDoc, updateDoc 
} from 'firebase/firestore';
import ConfirmModal from '../components/ConfirmModal';
import ExcelService from '../services/excelService';
import './AdminDashboard.css';
import Toast from '../components/Toast';
import MatchForm from '../components/MatchForm';
import MatchService from '../services/matchService';
import RosterManager from '../components/RosterManager';
import RosterService from '../services/rosterService';
import SinglesMatchForm from '../components/SinglesMatchForm';
import UserManager from '../components/UserManager';
import { UserGroupIcon } from '@heroicons/react/24/outline';
// Hero Icons - Outline
import { 
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  TrophyIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Solid versions for more emphasis when needed
import { 
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/20/solid';



function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(1);
  
  // Form visibility states
  const [showClubForm, setShowClubForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [showRosterForm, setShowRosterForm] = useState(false);
  const [selectedRosterSeason, setSelectedRosterSeason] = useState(null);
  const [selectedRosterTeam, setSelectedRosterTeam] = useState(null);


  // Excel upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);

  // Modal states
  const [activeModal, setActiveModal] = useState(null);

  // Data lists
  const [clubs, setClubs] = useState([]);
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [rosters, setRosters] = useState([]);
  
  // Birthdays
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);

  // Toast notification
const [toast, setToast] = useState(null);

  // For filtering in forms
  const [filteredTeams, setFilteredTeams] = useState([]);

  // Form states
  const [newClub, setNewClub] = useState({ clubId: '', name: '' });
  const [newTeam, setNewTeam] = useState({ name: '', clubId: '' });

  // Match management
const [showMatchForm, setShowMatchForm] = useState(false);
const [matches, setMatches] = useState([]);
const [selectedMatch, setSelectedMatch] = useState(null);

// Match type toggle
const [matchType, setMatchType] = useState('team'); // 'team' or 'singles'

  // EXPANDED MEMBER FORM STATE - All DSA fields
  const [newMember, setNewMember] = useState({
    // Personal Details
    membershipNo: '',
    idNumber: '',
    surname: '',
    initials: '',
    firstNames: '',
    callingName: '',
    dateOfBirth: '',
    sex: '',
    race: '',
    
    // Contact Details
    homeAddress: '',
    homeTel: '',
    workTel: '',
    cellNo: '',
    email: '',
    
    // Club & Status
    clubId: '',
    teamId: '',
    status: 'active',
    category: '', // Auto-calculated
    
    // Auto-filled (not shown in form)
    province: 'Western Cape',
    district: 'Cape Town',
    association: 'Observatory'
  });

  const [newSeason, setNewSeason] = useState({
    name: '',
    type: '',
    customType: '',
    showOtherInput: false,
    startDate: '',
    endDate: ''
  });
  
  const [newRoster, setNewRoster] = useState({
    seasonId: '',
    teamId: '',
    memberIds: []
  });

  // Edit form state
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const [stats, setStats] = useState({
    totalClubs: 0,
    totalTeams: 0,
    activeMembers: 0,
    nonPlayingMembers: 0,
    inactiveMembers: 0,
    totalSeasons: 0,
    totalMatches: 0  // Make sure this line exists
  });

  // User management
const [showUserManager, setShowUserManager] = useState(false);

// Collapsible clubs state - start with empty Set (all expanded)
const [collapsedClubs, setCollapsedClubs] = useState(new Set());

  // ==================== HELPER FUNCTIONS ====================


  
  // Calculate category based on race and sex ONLY (no age)
const calculateCategory = (race, sex, dateOfBirth) => {
  console.log('Dashboard calculating category:', { race, sex, dateOfBirth });
  
  if (!race || !sex) {
    console.warn('Missing race or sex');
    return '';
  }
  
  const raceUpper = race.toUpperCase().trim();
  const sexUpper = sex.toUpperCase().trim();
  
  console.log('Dashboard normalized:', { raceUpper, sexUpper });
  
  if (raceUpper === 'WHITE') {
    const result = sexUpper === 'MALE' ? 'WM' : 'WF';
    console.log('Dashboard result (white):', result);
    return result;
  } else {
    const result = sexUpper === 'MALE' ? 'PDM' : 'PDF';
    console.log('Dashboard result (non-white):', result);
    return result;
  }
};
  // Update category when race, sex, or DOB changes
  useEffect(() => {
    const category = calculateCategory(newMember.race, newMember.sex, newMember.dateOfBirth);
    console.log('useEffect recalculating category:', category); // ADD THIS LOG
    setNewMember(prev => ({ ...prev, category }));
  }, [newMember.race, newMember.sex, newMember.dateOfBirth]);

  // Get upcoming birthdays in the next 30 days
const getUpcomingBirthdays = () => {
  console.log('Calculating birthdays from', members.length, 'members');
  
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  
  const birthdays = members.filter(member => {
    if (!member.dateOfBirth) return false;
    
    let birthDate;
    if (member.dateOfBirth?.toDate) {
      birthDate = member.dateOfBirth.toDate();
    } else if (member.dateOfBirth?.seconds) {
      birthDate = new Date(member.dateOfBirth.seconds * 1000);
    } else {
      birthDate = new Date(member.dateOfBirth);
    }
    
    // Check if date is valid
    if (isNaN(birthDate.getTime())) return false;
    
    const thisYearsBirthday = new Date(
      today.getFullYear(),
      birthDate.getMonth(),
      birthDate.getDate()
    );
    
    if (thisYearsBirthday < today) {
      thisYearsBirthday.setFullYear(today.getFullYear() + 1);
    }
    
    return thisYearsBirthday <= thirtyDaysFromNow;
  });
  
  // Sort by upcoming date
  const sorted = birthdays.sort((a, b) => {
    const getNext = (member) => {
      let date;
      if (member.dateOfBirth?.toDate) {
        date = member.dateOfBirth.toDate();
      } else if (member.dateOfBirth?.seconds) {
        date = new Date(member.dateOfBirth.seconds * 1000);
      } else {
        date = new Date(member.dateOfBirth);
      }
      
      const next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
      if (next < today) next.setFullYear(today.getFullYear() + 1);
      return next;
    };
    
    return getNext(a) - getNext(b);
  }).slice(0, 5);
  
  console.log('Found', sorted.length, 'upcoming birthdays');
  return sorted;
};

// Get matches for next 7 days
const getNext7DaysMatches = () => {
  console.log('Calculating next 7 days from', matches.length, 'matches');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  nextWeek.setHours(23, 59, 59, 999);
  
  console.log('Date range:', today, 'to', nextWeek);
  
  const filtered = matches.filter(match => {
    if (!match.date) return false;
    
    const matchDate = new Date(match.date);
    console.log('Match date:', match.date, '->', matchDate);
    
    return matchDate >= today && matchDate <= nextWeek;
  });
  
  console.log('Filtered matches:', filtered.length);
  return filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
};

// Helper to get expected player count from season type
const getExpectedPlayerCount = (seasonType) => {
  if (seasonType.includes('6')) return 6;
  if (seasonType.includes('4')) return 4;
  if (seasonType.includes('singles')) return 1;
  if (seasonType.includes('doubles')) return 2;
  return 4; // default
};

  // ==================== DATA FETCHING ====================

  // Fetch all data
const fetchAllData = async () => {
  try {
    // Get clubs
    const clubsSnapshot = await getDocs(collection(db, 'clubs'));
    const clubsData = [];
    clubsSnapshot.forEach((doc) => {
      clubsData.push({ id: doc.id, ...doc.data() });
    });
    setClubs(clubsData);
    const totalClubs = clubsData.length;

    // Get teams
    const teamsSnapshot = await getDocs(collection(db, 'teams'));
    const teamsData = [];
    teamsSnapshot.forEach((doc) => {
      teamsData.push({ id: doc.id, ...doc.data() });
    });
    setTeams(teamsData);
    const totalTeams = teamsData.length;

    // Get members
const membersSnapshot = await getDocs(collection(db, 'members'));
const membersData = [];
membersSnapshot.forEach((doc) => {
  const member = { id: doc.id, ...doc.data() };
  console.log('🔥 MEMBER FROM FIRESTORE:', { 
    id: member.id,
    name: `${member.firstNames || ''} ${member.surname || ''}`.trim(),
    CATEGORY: member.category,  // ← IN CAPS so it stands out
    sex: member.sex,
    race: member.race,
    status: member.status,
    dateOfBirth: member.dateOfBirth ? 'exists' : 'null'
  });
  membersData.push(member);
});
setMembers(membersData);

    // Count members by status - USE THE FRESH DATA, not the state
    const activeMembers = membersData.filter(m => m.status === 'active').length;
    const nonPlayingMembers = membersData.filter(m => m.status === 'non-playing').length;
    const inactiveMembers = membersData.filter(m => m.status === 'inactive').length;

    // Get seasons
    const seasonsSnapshot = await getDocs(collection(db, 'seasons'));
    const seasonsData = [];
    seasonsSnapshot.forEach((doc) => {
      seasonsData.push({ id: doc.id, ...doc.data() });
    });
    setSeasons(seasonsData);
    const totalSeasons = seasonsData.length;

    // Get matches
    const matchesSnapshot = await getDocs(collection(db, 'matches'));
    const matchesData = [];
    matchesSnapshot.forEach((doc) => {
      matchesData.push({ id: doc.id, ...doc.data() });
    });
    setMatches(matchesData);
    const totalMatches = matchesData.length;

    // Get rosters (from all seasons)
    const allRosters = [];
    for (const season of seasonsData) {
      const rostersSnapshot = await getDocs(collection(db, 'seasons', season.id, 'rosters'));
      rostersSnapshot.forEach((doc) => {
        allRosters.push({ id: doc.id, seasonId: season.id, ...doc.data() });
      });
    }
    setRosters(allRosters);

    // Calculate birthdays with fresh data
    const calculateBirthdays = (memberList) => {
      if (!memberList || memberList.length === 0) return [];
      
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      return memberList
        .filter(member => {
          if (!member.dateOfBirth) return false;
          
          let birthDate;
          if (member.dateOfBirth?.toDate) {
            birthDate = member.dateOfBirth.toDate();
          } else if (member.dateOfBirth?.seconds) {
            birthDate = new Date(member.dateOfBirth.seconds * 1000);
          } else {
            birthDate = new Date(member.dateOfBirth);
          }
          
          if (isNaN(birthDate.getTime())) return false;
          
          const thisYearsBirthday = new Date(
            today.getFullYear(),
            birthDate.getMonth(),
            birthDate.getDate()
          );
          
          if (thisYearsBirthday < today) {
            thisYearsBirthday.setFullYear(today.getFullYear() + 1);
          }
          
          return thisYearsBirthday <= thirtyDaysFromNow;
        })
        .sort((a, b) => {
          const getNext = (member) => {
            let date;
            if (member.dateOfBirth?.toDate) {
              date = member.dateOfBirth.toDate();
            } else if (member.dateOfBirth?.seconds) {
              date = new Date(member.dateOfBirth.seconds * 1000);
            } else {
              date = new Date(member.dateOfBirth);
            }
            const next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
            if (next < today) next.setFullYear(today.getFullYear() + 1);
            return next;
          };
          return getNext(a) - getNext(b);
        })
        .slice(0, 5);
    };

    const birthdayList = calculateBirthdays(membersData);
    setUpcomingBirthdays(birthdayList);

    // Set ALL stats at once with fresh data
    setStats({
      totalClubs,
      totalTeams,
      activeMembers,
      nonPlayingMembers,
      inactiveMembers,
      totalSeasons,
      totalMatches
    });

    // ===== CALCULATE ROSTERS SUMMARY HERE =====
    // Use the fresh data variables, not the state
    const calculateRostersSummary = () => {
      const summary = [];
      
      seasonsData.forEach(season => {
        const seasonRosters = allRosters.filter(r => r.seasonId === season.id);
        if (seasonRosters.length === 0) return;
        
        const seasonSummary = {
          seasonId: season.id,
          seasonName: season.name,
          seasonType: season.type,
          teams: []
        };
        
        seasonRosters.forEach(roster => {
          const team = teamsData.find(t => t.id === roster.teamId);
          if (!team) return;
          
          const club = clubsData.find(c => c.clubId === team.clubId);
          const expectedCount = (() => {
            if (season.type.includes('6')) return 6;
            if (season.type.includes('4')) return 4;
            if (season.type.includes('singles')) return 1;
            if (season.type.includes('doubles')) return 2;
            return 4;
          })();
          
          seasonSummary.teams.push({
            teamId: team.id,
            teamName: team.name,
            clubName: club?.name || 'Unknown',
            playerCount: roster.memberIds?.length || 0,
            expectedCount,
            isComplete: (roster.memberIds?.length || 0) === expectedCount
          });
        });
        
        if (seasonSummary.teams.length > 0) {
          summary.push(seasonSummary);
        }
      });
      
      return summary;
    };

 

    // Update all states
    setClubs(clubsData);
    setTeams(teamsData);
    setMembers(membersData);
    setSeasons(seasonsData);
    setMatches(matchesData);
    setRosters(allRosters);

  } catch (error) {
    console.error('Error fetching data:', error);
    setToast({
      type: 'error',
      message: '❌ Error loading dashboard data'
    });
  } finally {
    setLoading(false);
  }
};


// Add this with your other useEffects (around line 200-250)
// When modal opens, collapse all clubs
useEffect(() => {
  if (activeModal && clubs.length > 0) {
    const allCollapsed = new Set();
    clubs.forEach(club => allCollapsed.add(club.id));
    setCollapsedClubs(allCollapsed);
  }
}, [activeModal, clubs]);

// Also update when clubs data changes
useEffect(() => {
  if (activeModal && clubs.length > 0) {
    const allCollapsed = new Set();
    clubs.forEach(club => allCollapsed.add(club.id));
    setCollapsedClubs(allCollapsed);
  }
}, [clubs, activeModal]);

useEffect(() => {
  fetchAllData();
}, []);



// REMOVE the second useEffect completely - delete it

  // Filter teams when a club is selected
  useEffect(() => {
    if (newMember.clubId) {
      const filtered = teams.filter(team => team.clubId === newMember.clubId);
      setFilteredTeams(filtered);
    } else {
      setFilteredTeams([]);
    }
  }, [newMember.clubId, teams]);

  // ==================== FORM HANDLERS ====================

  const handleAddClub = async (e) => {
    e.preventDefault();
    try {
      const existingClub = clubs.find(club => club.clubId === newClub.clubId);
      if (existingClub) {
        alert('Club ID already exists. Please use a unique ID.');
        return;
      }

      await addDoc(collection(db, 'clubs'), {
        clubId: newClub.clubId,
        name: newClub.name,
        createdAt: serverTimestamp()
      });
      setNewClub({ clubId: '', name: '' });
      setShowClubForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Error adding club:', error);
    }
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'teams'), {
        name: newTeam.name,
        clubId: newTeam.clubId,
        createdAt: serverTimestamp()
      });
      setNewTeam({ name: '', clubId: '' });
      setShowTeamForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Error adding team:', error);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      // Check for duplicate ID number
      const duplicateQuery = query(collection(db, 'members'), where('idNumber', '==', newMember.idNumber));
      const duplicateSnapshot = await getDocs(duplicateQuery);
      
      if (!duplicateSnapshot.empty) {
        alert('A member with this ID Number already exists.');
        return;
      }

      const memberData = {
        ...newMember,
        surname: newMember.surname.toUpperCase(),
        initials: newMember.initials.toUpperCase(),
        firstNames: newMember.firstNames.toUpperCase(),
        callingName: newMember.callingName?.toUpperCase() || '',
        homeAddress: newMember.homeAddress?.toUpperCase() || '',
        email: newMember.email?.toLowerCase() || '',
        homeTel: newMember.homeTel?.replace(/\D/g, '') || '',
        workTel: newMember.workTel?.replace(/\D/g, '') || '',
        cellNo: newMember.cellNo?.replace(/\D/g, '') || '',
        dateOfBirth: newMember.dateOfBirth ? new Date(newMember.dateOfBirth) : null,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'members'), memberData);
      
      setNewMember({
        membershipNo: '',
        idNumber: '',
        surname: '',
        initials: '',
        firstNames: '',
        callingName: '',
        dateOfBirth: '',
        sex: '',
        race: '',
        homeAddress: '',
        homeTel: '',
        workTel: '',
        cellNo: '',
        email: '',
        clubId: '',
        teamId: '',
        status: 'active',
        category: '',
        province: 'Western Cape',
        district: 'Cape Town',
        association: 'Observatory'
      });
      setActiveTab(1);
      setShowMemberForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Error adding member. Please check all fields.');
    }
  };

  const handleAddSeason = async (e) => {
    e.preventDefault();
    try {
      const finalType = newSeason.showOtherInput ? newSeason.customType : newSeason.type;
      
      await addDoc(collection(db, 'seasons'), {
        name: newSeason.name,
        type: finalType,
        startDate: newSeason.startDate ? new Date(newSeason.startDate) : null,
        endDate: newSeason.endDate ? new Date(newSeason.endDate) : null,
        createdAt: serverTimestamp()
      });
      
      setNewSeason({ 
        name: '', 
        type: '',
        customType: '',
        showOtherInput: false,
        startDate: '',
        endDate: ''
      });
      setShowSeasonForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Error adding season:', error);
    }
  };

  // Toggle club collapse
const toggleClub = (clubId) => {
  setCollapsedClubs(prev => {
    const newSet = new Set(prev);
    if (newSet.has(clubId)) {
      newSet.delete(clubId);
    } else {
      newSet.add(clubId);
    }
    return newSet;
  });
};


  // ==================== EXCEL UPLOAD HANDLERS ====================

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadFile(file);
    setUploadLoading(true);
    
    try {
      const { headers, rows } = await ExcelService.parseExcelFile(file);
      const cleanedRows = rows.map(row => ExcelService.cleanRowData(row));
      const duplicateCheck = await ExcelService.checkDuplicates(cleanedRows, members);
      
      setUploadPreview({
        headers,
        originalRows: rows,
        cleanedRows,
        duplicateCheck
      });
    } catch (error) {
      alert('Error parsing file: ' + error.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleImportConfirm = async () => {
    if (!uploadPreview) return;
    
    setUploadLoading(true);
    
    try {
      const results = await ExcelService.processImport(
        uploadPreview.duplicateCheck,
        clubs
      );
      
      setUploadResults(results);
      fetchAllData();
    } catch (error) {
      alert('Error importing data: ' + error.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleCloseUpload = () => {
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadPreview(null);
    setUploadResults(null);
  };

  const handleDownloadMembers = () => {
    try {
      const fileName = `ODA_Members_${new Date().toISOString().split('T')[0]}.xlsx`;
      ExcelService.downloadExcel(members, clubs, fileName);
      
      // Show success toast
      setToast({
        type: 'success',
        message: `✅ Download started: ${fileName}`
      });
    } catch (error) {
      console.error('Error downloading members:', error);
      
      // Show error toast
      setToast({
        type: 'error',
        message: '❌ Error generating Excel file. Please try again.'
      });
    }
  };

  // ==================== DELETE FUNCTIONS ====================

  const handleDeleteClub = (clubId) => {
    const club = clubs.find(c => c.clubId === clubId);
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Club?',
      message: `Are you sure you want to delete "${club.name}"? This will also delete all teams and members in this club. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const clubMembers = members.filter(m => m.clubId === clubId);
          for (const member of clubMembers) {
            await deleteDoc(doc(db, 'members', member.id));
          }
          
          const clubTeams = teams.filter(t => t.clubId === clubId);
          for (const team of clubTeams) {
            await deleteDoc(doc(db, 'teams', team.id));
          }
          
          const clubToDelete = clubs.find(c => c.clubId === clubId);
          await deleteDoc(doc(db, 'clubs', clubToDelete.id));
          
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          fetchAllData();
        } catch (error) {
          console.error('Error deleting club:', error);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  const handleDeleteTeam = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    const club = clubs.find(c => c.clubId === team?.clubId);
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Team?',
      message: `Are you sure you want to delete "${team.name}" from ${club?.name || 'the club'}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'teams', teamId));
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          fetchAllData();
        } catch (error) {
          console.error('Error deleting team:', error);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  const handleDeleteMember = (memberId) => {
    const member = members.find(m => m.id === memberId);
    const club = clubs.find(c => c.clubId === member?.clubId);
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Member?',
      message: `Are you sure you want to delete "${member?.surname}, ${member?.firstNames}" from ${club?.name || 'the club'}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'members', memberId));
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          fetchAllData();
        } catch (error) {
          console.error('Error deleting member:', error);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  const handleDeleteSeason = (seasonId) => {
    const season = seasons.find(s => s.id === seasonId);
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Season?',
      message: `Are you sure you want to delete "${season?.name}"? This will also delete all rosters for this season. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const seasonRosters = rosters.filter(r => r.seasonId === seasonId);
          for (const roster of seasonRosters) {
            await deleteDoc(doc(db, 'seasons', seasonId, 'rosters', roster.id));
          }
          
          await deleteDoc(doc(db, 'seasons', seasonId));
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          fetchAllData();
        } catch (error) {
          console.error('Error deleting season:', error);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  // Handle delete match
const handleDeleteMatch = async (matchId) => {
  const match = matches.find(m => m.id === matchId);
  
  setConfirmModal({
    isOpen: true,
    title: 'Delete Match?',
    message: `Are you sure you want to delete this match? This action cannot be undone.`,
    onConfirm: async () => {
      try {
        await MatchService.deleteMatch(matchId);
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        fetchAllData(); // Refresh data
        setToast({
          type: 'success',
          message: '✅ Match deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting match:', error);
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        setToast({
          type: 'error',
          message: '❌ Error deleting match'
        });
      }
    }
  });
};

  // ==================== EDIT FUNCTIONS ====================

  const handleEditClick = (item, type) => {
    setEditingItem({ ...item, type });
    setEditForm(item);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (editingItem.type === 'club' && editingItem.clubId !== editForm.clubId) {
      const existingClub = clubs.find(c => c.clubId === editForm.clubId && c.id !== editingItem.id);
      if (existingClub) {
        alert('Club ID already exists. Please choose a different one.');
        return;
      }
      
      const teamsToUpdate = teams.filter(t => t.clubId === editingItem.clubId);
      for (const team of teamsToUpdate) {
        await updateDoc(doc(db, 'teams', team.id), { clubId: editForm.clubId });
      }

      const membersToUpdate = members.filter(m => m.clubId === editingItem.clubId);
      for (const member of membersToUpdate) {
        await updateDoc(doc(db, 'members', member.id), { clubId: editForm.clubId });
      }
    }
    
    try {
      const docRef = doc(db, editingItem.type + 's', editingItem.id);
      const { id, type, createdAt, ...updateData } = editForm;
      await updateDoc(docRef, updateData);
      setShowEditModal(false);
      setEditingItem(null);
      fetchAllData();
    } catch (error) {
      console.error('Error updating:', error);
    }
  };

  // Handle edit roster - opens roster manager with pre-selected season and team
const handleEditRoster = (seasonId, teamId) => {
  console.log('Editing roster:', { seasonId, teamId });
  setSelectedRosterSeason(seasonId);
  setSelectedRosterTeam(teamId);
  setShowRosterForm(true);
};

// Handle delete single roster
const handleDeleteRoster = (seasonId, teamId, teamName) => {
  const season = seasons.find(s => s.id === seasonId);
  
  setConfirmModal({
    isOpen: true,
    title: 'Delete Roster?',
    message: `Are you sure you want to delete the roster for ${teamName} in ${season?.name}? This will remove all player assignments for this team.`,
    onConfirm: async () => {
      try {
        // Find the roster ID
        const rosterToDelete = rosters.find(r => r.seasonId === seasonId && r.teamId === teamId);
        if (rosterToDelete) {
          await RosterService.deleteRoster(seasonId, rosterToDelete.id);
          setToast({
            type: 'success',
            message: `✅ Roster deleted successfully`
          });
          fetchAllData(); // Refresh data
        }
      } catch (error) {
        console.error('Error deleting roster:', error);
        setToast({
          type: 'error',
          message: '❌ Error deleting roster'
        });
      } finally {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    }
  });
};

// Handle delete all rosters for a season
const handleDeleteSeasonRosters = (seasonId, seasonName) => {
  setConfirmModal({
    isOpen: true,
    title: 'Delete All Rosters?',
    message: `Are you sure you want to delete ALL rosters for ${seasonName}? This cannot be undone.`,
    onConfirm: async () => {
      try {
        const seasonRosters = rosters.filter(r => r.seasonId === seasonId);
        for (const roster of seasonRosters) {
          await RosterService.deleteRoster(seasonId, roster.id);
        }
        setToast({
          type: 'success',
          message: `✅ All rosters for ${seasonName} deleted`
        });
        fetchAllData();
      } catch (error) {
        console.error('Error deleting season rosters:', error);
        setToast({
          type: 'error',
          message: '❌ Error deleting rosters'
        });
      } finally {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    }
  });
};

// Handle delete team
const handleDeleteTeamWithConfirm = (teamId, teamName) => {
  setConfirmModal({
    isOpen: true,
    title: 'Delete Team?',
    message: `Are you sure you want to delete "${teamName}"? This will also delete all rosters for this team.`,
    onConfirm: async () => {
      try {
        // Delete all rosters for this team first
        const teamRosters = rosters.filter(r => r.teamId === teamId);
        for (const roster of teamRosters) {
          await RosterService.deleteRoster(roster.seasonId, roster.id);
        }
        // Then delete the team
        await handleDeleteTeam(teamId); // Use your existing handleDeleteTeam
      } catch (error) {
        console.error('Error deleting team:', error);
      }
    }
  });
};

// Handle edit match
const handleEditMatch = (match) => {
  console.log('Editing match:', match); // Add this for debugging
  setSelectedMatch(match);
  setMatchType(match.matchType || 'team'); // Set the correct match type
  setShowMatchForm(true);
  setActiveModal(null); // Close the current modal
};

  // ==================== MODAL RENDERING ====================

// Render modal based on activeModal
const renderModal = () => {
  if (!activeModal) return null;

  const getTitle = () => {
    switch(activeModal) {
      case 'clubs': return 'All Clubs';
      case 'teams': return 'All Teams';
      case 'active': return 'Active Members';
      case 'non-playing': return 'Non-Playing Members';
      case 'inactive': return 'Inactive Members';
      case 'seasons': return 'All Seasons';
      case 'matches': return 'All Matches';
      default: return '';
    }
  };

  // Sort clubs alphabetically by name
  const sortedClubs = [...clubs].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  // Sort teams alphabetically
  const sortedTeams = [...teams].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  // Sort members alphabetically by surname then first name
  const sortMembers = (memberList) => {
    return [...memberList].sort((a, b) => {
      const nameA = `${a.surname || ''} ${a.firstNames || ''}`.trim();
      const nameB = `${b.surname || ''} ${b.firstNames || ''}`.trim();
      return nameA.localeCompare(nameB);
    });
  };

  const getContent = () => {
    switch(activeModal) {
      case 'clubs':
        return (
          <div className="modal-content">
            {sortedClubs.map(club => (
              <div key={club.id} className="list-item">
                <div className="item-info">
                  <strong>{club.clubId}</strong> - {club.name}
                </div>
                <div className="item-actions">
                  <button onClick={() => handleEditClick(club, 'club')} className="edit-btn">✏️</button>
                  <button onClick={() => handleDeleteClub(club.clubId)} className="delete-btn">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'teams':
        return (
          <div className="modal-content">
            {sortedClubs.map(club => {
              const clubTeams = sortedTeams.filter(t => t.clubId === club.clubId);
              if (clubTeams.length === 0) return null;
              
              return (
                <div key={club.id} className="club-group">
                  <div 
                    className="club-header-with-count clickable"
                    onClick={() => toggleClub(club.id)}
                  >
                    <h4 className="club-header">
                      <span className="collapse-icon">
                        {collapsedClubs.has(club.id) ? '▶' : '▼'}
                      </span>
                      {club.clubId} - {club.name}
                    </h4>
                    <span className="team-count">{clubTeams.length}</span>
                  </div>
                  
                  {!collapsedClubs.has(club.id) && (
                    <div className="club-children">
                      {clubTeams.map(team => (
                        <div key={team.id} className="list-item indented">
                          <div className="item-info">
                            {team.name}
                          </div>
                          <div className="item-actions">
                            <button onClick={() => handleEditClick(team, 'team')} className="edit-btn">✏️</button>
                            <button onClick={() => handleDeleteTeam(team.id)} className="delete-btn">🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      case 'active':
      case 'non-playing':
      case 'inactive':
        const statusFilter = activeModal;
        return (
          <div className="modal-content">
            {sortedClubs.map(club => {
              const clubMembers = sortMembers(
                members.filter(m => m.clubId === club.clubId && m.status === statusFilter)
              );
              if (clubMembers.length === 0) return null;
              
              return (
                <div key={club.id} className="club-group">
                  <div 
                    className="club-header-with-count clickable"
                    onClick={() => toggleClub(club.id)}
                  >
                    <h4 className="club-header">
                      <span className="collapse-icon">
                        {collapsedClubs.has(club.id) ? '▶' : '▼'}
                      </span>
                      {club.clubId} - {club.name}
                    </h4>
                    <span className="member-count">{clubMembers.length}</span>
                  </div>
                  
                  {!collapsedClubs.has(club.id) && (
                    <div className="club-children">
                      {clubMembers.map(member => (
                        <div key={member.id} className="list-item indented">
                          <div className="item-info">
                            {member.surname}, {member.firstNames}
                            {member.callingName && ` (${member.callingName})`}
                          </div>
                          <div className="item-actions">
                            <button onClick={() => handleEditClick(member, 'member')} className="edit-btn">✏️</button>
                            <button onClick={() => handleDeleteMember(member.id)} className="delete-btn">🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      case 'seasons':
        // Sort seasons alphabetically
        const sortedSeasons = [...seasons].sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        
        return (
          <div className="modal-content">
            {sortedSeasons.map(season => {
              const formatDate = (timestamp) => {
                if (!timestamp) return null;
                try {
                  let date;
                  if (timestamp.toDate) {
                    date = timestamp.toDate();
                  } else {
                    date = new Date(timestamp);
                  }
                  const day = date.getDate().toString().padStart(2, '0');
                  const month = (date.getMonth() + 1).toString().padStart(2, '0');
                  const year = date.getFullYear().toString().slice(-2);
                  return `${day}/${month}/${year}`;
                } catch {
                  return null;
                }
              };

              const startDateStr = formatDate(season.startDate);
              const endDateStr = formatDate(season.endDate);

              return (
                <div key={season.id} className="list-item">
                  <div className="item-info">
                    <strong>{season.name}</strong> - {season.type}
                    {(startDateStr || endDateStr) && (
                      <div className="item-dates">
                        {startDateStr && endDateStr 
                          ? `${startDateStr} - ${endDateStr}`
                          : startDateStr || endDateStr}
                      </div>
                    )}
                  </div>
                  <div className="item-actions">
                    <button onClick={() => handleEditClick(season, 'season')} className="edit-btn">✏️</button>
                    <button onClick={() => handleDeleteSeason(season.id)} className="delete-btn">🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'matches':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Sort matches by date
        const sortedMatches = [...matches].sort((a, b) => 
          new Date(a.date) - new Date(b.date)
        );
        
        // Separate upcoming and completed matches
        const upcomingMatches = sortedMatches
          .filter(m => {
            const matchDate = new Date(m.date);
            return matchDate >= today;
          });

        const completedMatches = sortedMatches
          .filter(m => {
            const matchDate = new Date(m.date);
            return matchDate < today;
          })
          .sort((a, b) => new Date(b.date) - new Date(a.date)); // Most recent first

        // Group upcoming matches by date
        const groupedByDate = upcomingMatches.reduce((groups, match) => {
          const dateStr = match.date;
          if (!groups[dateStr]) {
            groups[dateStr] = [];
          }
          groups[dateStr].push(match);
          return groups;
        }, {});

        return (
          <div className="modal-content">
            {/* Filters and New Match Button */}
            <div className="modal-filters">
              <select className="filter-select">
                <option>All Seasons</option>
                {seasons.map(season => (
                  <option key={season.id}>{season.name}</option>
                ))}
              </select>
              <select className="filter-select">
                <option>All Teams</option>
                {teams.map(team => (
                  <option key={team.id}>{team.name}</option>
                ))}
              </select>
              <button 
                className="new-match-btn"
                onClick={() => {
                  setActiveModal(null);
                  setSelectedMatch(null);
                  setShowMatchForm(true);
                }}
              >
                + New Match
              </button>
            </div>

            {/* Upcoming Matches Section */}
            {upcomingMatches.length > 0 && (
              <div className="match-section">
                <h4 className="section-header">UPCOMING MATCHES</h4>
                
                {Object.keys(groupedByDate).sort().map(dateStr => {
                  const dateMatches = groupedByDate[dateStr];
                  const matchDate = new Date(dateStr);
                  const formattedDate = matchDate.toLocaleDateString('en-ZA', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long',
                    year: 'numeric'
                  });
                  
                  return (
                    <div key={dateStr} className="date-group">
                      <div className="date-header">
                        📅 {formattedDate.toUpperCase()}
                      </div>
                      {dateMatches.map(match => {
  const homeTeam = teams.find(t => t.id === match.homeTeamId);
  const awayTeam = teams.find(t => t.id === match.awayTeamId);
  const season = seasons.find(s => s.id === match.seasonId);
  
  // For singles matches, we need player status
  const hasHomePlayer = match.homePlayerId ? true : false;
  const hasAwayPlayer = match.awayPlayerId ? true : false;
  const playerStatus = hasHomePlayer && hasAwayPlayer ? 'ready' : 'warning';
  const statusText = hasHomePlayer && hasAwayPlayer 
    ? '✅ Players set' 
    : '⚠️ Missing player';

  return (
    <div key={match.id} className="match-item-grouped">
      <div className="match-info">
        {match.matchType === 'singles' ? (
          // Singles match display
          <>
            <div className="match-teams">
              {members.find(m => m.id === match.homePlayerId)?.surname || 'Unknown'} vs{' '}
              {members.find(m => m.id === match.awayPlayerId)?.surname || 'Unknown'}
            </div>
            <div className="match-metadata">
              <span className="match-season">🏆 {season?.name || 'No season'}</span>
              <span className={`match-status ${playerStatus}`}>
                {statusText}
              </span>
            </div>
            <div className="match-players">
              ({members.find(m => m.id === match.homePlayerId)?.clubId || '?'} vs{' '}
              {members.find(m => m.id === match.awayPlayerId)?.clubId || '?'})
            </div>
          </>
        ) : (
          // Team match display (existing)
          <>
            <div className="match-teams">
              {homeTeam?.name || 'Unknown'} vs {awayTeam?.name || 'Unknown'}
            </div>
            <div className="match-metadata">
              <span className="match-season">🏆 {season?.name || 'No season'}</span>
              <span className={`match-status ${playerStatus}`}>
                {statusText}
              </span>
            </div>
          </>
        )}
      </div>
      <div className="match-actions">
        {/* Action buttons remain the same */}
        <button className="icon-btn" onClick={() => handleEditMatch(match)}>✏️</button>
        <button className="icon-btn" onClick={() => handleDeleteMatch(match.id)}>🗑️</button>
      </div>
    </div>
  );
})}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed Matches Section */}
            {completedMatches.length > 0 && (
              <div className="match-section">
                <h4 className="section-header">COMPLETED MATCHES</h4>
                
                {completedMatches.slice(0, 10).map(match => {
                  const homeTeam = teams.find(t => t.id === match.homeTeamId);
                  const awayTeam = teams.find(t => t.id === match.awayTeamId);
                  const matchDate = new Date(match.date);
                  const formattedDate = matchDate.toLocaleDateString('en-ZA', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long'
                  });
                  
                  return (
                    <div key={match.id} className="match-item-grouped completed">
                      <div className="match-info">
                        <div className="match-teams">
                          {homeTeam?.name || 'Unknown'} vs {awayTeam?.name || 'Unknown'}
                        </div>
                        <div className="match-metadata">
                          <span className="match-date-small">{formattedDate}</span>
                          <span className="match-result">
                            {match.homeScore || '?'} - {match.awayScore || '?'}
                          </span>
                        </div>
                      </div>
                      <div className="match-actions">
                        <button 
                          className="icon-btn" 
                          onClick={() => {
                            setSelectedMatch(match);
                            setActiveModal(null);
                            setShowMatchForm(true);
                          }}
                          title="Edit match"
                        >
                          ✏️
                        </button>
                      </div>
                    </div>
                  );
                })}
                {completedMatches.length > 10 && (
                  <div className="more-matches">
                    + {completedMatches.length - 10} more completed matches
                  </div>
                )}
              </div>
            )}

            {/* No matches message */}
            {matches.length === 0 && (
              <div className="no-matches">
                <p>No matches scheduled yet.</p>
                <button 
                  className="new-match-btn"
                  onClick={() => {
                    setActiveModal(null);
                    setSelectedMatch(null);
                    setShowMatchForm(true);
                  }}
                >
                  Schedule your first match
                </button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-container large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{getTitle()}</h2>
          <button className="modal-close" onClick={() => setActiveModal(null)}>✕</button>
        </div>
        {getContent()}
      </div>
    </div>
  );
};

  const renderEditModal = () => {
    if (!showEditModal || !editingItem) return null;

    const formatDateForInput = (timestamp) => {
      if (!timestamp) return '';
      try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toISOString().split('T')[0];
      } catch {
        return '';
      }
    };

    const formatDateDisplay = (timestamp) => {
      if (!timestamp) return '';
      try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        return `${day}/${month}/${year}`;
      } catch {
        return '';
      }
    };

    if (editingItem.type === 'member') {
      return (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-container large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Member: {editingItem.surname}, {editingItem.firstNames}</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            
            <div className="member-detail-tabs">
              <button 
                className={`tab-btn ${activeTab === 1 ? 'active' : ''}`}
                onClick={() => setActiveTab(1)}
              >
                Personal
              </button>
              <button 
                className={`tab-btn ${activeTab === 2 ? 'active' : ''}`}
                onClick={() => setActiveTab(2)}
              >
                Contact
              </button>
              <button 
                className={`tab-btn ${activeTab === 3 ? 'active' : ''}`}
                onClick={() => setActiveTab(3)}
              >
                Club & Status
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="edit-form">
              {activeTab === 1 && (
                <div className="tab-content">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Membership No.</label>
                      <input
                        type="text"
                        value={editForm.membershipNo || ''}
                        onChange={(e) => setEditForm({...editForm, membershipNo: e.target.value})}
                        placeholder="e.g., DSA-130013"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>ID Number *</label>
                      <input
                        type="text"
                        value={editForm.idNumber || ''}
                        onChange={(e) => setEditForm({...editForm, idNumber: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Surname *</label>
                      <input
                        type="text"
                        value={editForm.surname || ''}
                        onChange={(e) => setEditForm({...editForm, surname: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Initials</label>
                      <input
                        type="text"
                        value={editForm.initials || ''}
                        onChange={(e) => setEditForm({...editForm, initials: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>First Names *</label>
                      <input
                        type="text"
                        value={editForm.firstNames || ''}
                        onChange={(e) => setEditForm({...editForm, firstNames: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Calling Name</label>
                      <input
                        type="text"
                        value={editForm.callingName || ''}
                        onChange={(e) => setEditForm({...editForm, callingName: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Date of Birth *</label>
                      <input
                        type="date"
                        value={formatDateForInput(editForm.dateOfBirth)}
                        onChange={(e) => setEditForm({...editForm, dateOfBirth: e.target.value})}
                        required
                      />
                      {editForm.dateOfBirth && (
                        <small className="field-hint">
                          {formatDateDisplay(editForm.dateOfBirth)}
                        </small>
                      )}
                    </div>
                    
                    <div className="form-group">
                      <label>Sex *</label>
                      <select
                        value={editForm.sex || ''}
                        onChange={(e) => setEditForm({...editForm, sex: e.target.value})}
                        required
                      >
                        <option value="">Select Sex</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Race *</label>
                      <select
                        value={editForm.race || ''}
                        onChange={(e) => setEditForm({...editForm, race: e.target.value})}
                        required
                      >
                        <option value="">Select Race</option>
                        <option value="White">White</option>
                        <option value="Black">Black</option>
                        <option value="Coloured">Coloured</option>
                        <option value="Indian">Indian</option>
                        <option value="Asian">Asian</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Category</label>
                      <input
                        type="text"
                        value={editForm.category || ''}
                        readOnly
                        className="auto-field"
                      />
                      <small>Auto-calculated</small>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 2 && (
                <div className="tab-content">
                  <div className="form-group full-width">
                    <label>Home Address</label>
                    <textarea
                      value={editForm.homeAddress || ''}
                      onChange={(e) => setEditForm({...editForm, homeAddress: e.target.value})}
                      rows="3"
                      placeholder="Full home address"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Home Tel</label>
                      <input
                        type="tel"
                        value={editForm.homeTel || ''}
                        onChange={(e) => setEditForm({...editForm, homeTel: e.target.value})}
                        placeholder="021 555 1234"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Work Tel</label>
                      <input
                        type="tel"
                        value={editForm.workTel || ''}
                        onChange={(e) => setEditForm({...editForm, workTel: e.target.value})}
                        placeholder="021 555 5678"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Cell No *</label>
                      <input
                        type="tel"
                        value={editForm.cellNo || ''}
                        onChange={(e) => setEditForm({...editForm, cellNo: e.target.value})}
                        placeholder="072 123 4567"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 3 && (
                <div className="tab-content">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Club *</label>
                      <select
                        value={editForm.clubId || ''}
                        onChange={(e) => setEditForm({...editForm, clubId: e.target.value})}
                        required
                      >
                        <option value="">Select Club</option>
                        {clubs.map(club => (
                          <option key={club.id} value={club.clubId}>
                            {club.clubId} - {club.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Team</label>
                      <select
                        value={editForm.teamId || ''}
                        onChange={(e) => setEditForm({...editForm, teamId: e.target.value})}
                      >
                        <option value="">Select Team (optional)</option>
                        {teams.filter(t => t.clubId === editForm.clubId).map(team => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Status *</label>
                      <select
                        value={editForm.status || 'active'}
                        onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                        required
                      >
                        <option value="active">Active Player</option>
                        <option value="non-playing">Non-Playing Member</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Province</label>
                      <input
                        type="text"
                        value="Western Cape"
                        readOnly
                        className="auto-field"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>District</label>
                      <input
                        type="text"
                        value="Cape Town"
                        readOnly
                        className="auto-field"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Association</label>
                      <input
                        type="text"
                        value="Observatory"
                        readOnly
                        className="auto-field"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Created</label>
                      <input
                        type="text"
                        value={editForm.createdAt ? new Date(editForm.createdAt.seconds * 1000).toLocaleDateString() : ''}
                        readOnly
                        className="auto-field"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-navigation">
                {activeTab > 1 && (
                  <button type="button" className="nav-btn prev" onClick={() => setActiveTab(activeTab - 1)}>
                    ← Previous
                  </button>
                )}
                
                {activeTab < 3 ? (
                  <button type="button" className="nav-btn next" onClick={() => setActiveTab(activeTab + 1)}>
                    Next →
                  </button>
                ) : (
                  <div className="form-actions">
                    <button type="submit" className="submit-btn">Save Changes</button>
                    <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)}>Cancel</button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      );
    }

    // For non-member items
    return (
      <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
        <div className="modal-container" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Edit {editingItem.type}</h2>
            <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
          </div>
          <form onSubmit={handleEditSubmit} className="edit-form">
            {Object.keys(editForm).map(key => {
              if (key === 'id' || key === 'createdAt' || key === 'type') return null;
              
              if (key === 'status') {
                return (
                  <div key={key} className="form-group">
                    <label>Status:</label>
                    <select
                      value={editForm[key]}
                      onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                    >
                      <option value="active">Active Player</option>
                      <option value="non-playing">Non-Playing Member</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                );
              }
              
              if (key === 'sex') {
                return (
                  <div key={key} className="form-group">
                    <label>Sex:</label>
                    <select
                      value={editForm[key]}
                      onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                    >
                      <option value="">Select Sex</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                );
              }
              
              if (key === 'race') {
                return (
                  <div key={key} className="form-group">
                    <label>Race:</label>
                    <select
                      value={editForm[key]}
                      onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                    >
                      <option value="">Select Race</option>
                      <option value="White">White</option>
                      <option value="Black">Black</option>
                      <option value="Coloured">Coloured</option>
                      <option value="Indian">Indian</option>
                      <option value="Asian">Asian</option>
                    </select>
                  </div>
                );
              }
              
              if (key === 'clubId' && editingItem.type === 'club') {
                return (
                  <div key={key} className="form-group">
                    <label>Club ID:</label>
                    <input
                      type="text"
                      value={editForm[key] || ''}
                      onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                      placeholder="Enter Club ID (e.g., ODA001)"
                    />
                    <small className="field-hint">Changing this will update all teams and members linked to this club</small>
                  </div>
                );
              }
              
              if (key === 'clubId') {
                return (
                  <div key={key} className="form-group">
                    <label>Club:</label>
                    <select
                      value={editForm[key]}
                      onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                    >
                      {clubs.map(club => (
                        <option key={club.id} value={club.clubId}>
                          {club.clubId} - {club.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              
              if (key === 'teamId') {
                return (
                  <div key={key} className="form-group">
                    <label>Team:</label>
                    <select
                      value={editForm[key]}
                      onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                    >
                      <option value="">Select Team (optional)</option>
                      {teams.filter(t => t.clubId === editForm.clubId).map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              
              if (key === 'dateOfBirth') {
                return (
                  <div key={key} className="form-group">
                    <label>Date of Birth:</label>
                    <input
                      type="date"
                      value={formatDateForInput(editForm[key])}
                      onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                    />
                    {editForm[key] && (
                      <small className="field-hint">
                        Selected: {formatDateDisplay(editForm[key])}
                      </small>
                    )}
                  </div>
                );
              }
              
              if (key === 'type' && editingItem.type === 'season') {
                return (
                  <div key={key} className="form-group">
                    <label>Format:</label>
                    {['4-a-side', '6-a-side', 'singles', 'doubles'].includes(editForm[key]) ? (
                      <select
                        value={editForm[key]}
                        onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                      >
                        <option value="4-a-side">4-a-side</option>
                        <option value="6-a-side">6-a-side</option>
                        <option value="singles">Singles</option>
                        <option value="doubles">Doubles</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={editForm[key] || ''}
                        onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                        placeholder="Custom format"
                      />
                    )}
                    <small className="field-hint">Season format</small>
                  </div>
                );
              }
              
              if (key === 'startDate' || key === 'endDate') {
                return (
                  <div key={key} className="form-group">
                    <label>{key === 'startDate' ? 'Start Date' : 'End Date'}:</label>
                    <input
                      type="date"
                      value={formatDateForInput(editForm[key])}
                      onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                    />
                    {editForm[key] && (
                      <small className="field-hint">
                        Selected: {formatDateDisplay(editForm[key])}
                      </small>
                    )}
                  </div>
                );
              }
              
              return (
                <div key={key} className="form-group">
                  <label>{key}:</label>
                  <input
                    type="text"
                    value={editForm[key] || ''}
                    onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                  />
                </div>
              );
            })}
            <div className="form-actions">
              <button type="submit" className="submit-btn">Save Changes</button>
              <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ==================== RENDER ====================

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-user">
          <span>{currentUser?.email}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card clickable" onClick={() => setActiveModal('clubs')}>
          <h3>Total Clubs</h3>
          <p className="stat-number">
            {loading ? '...' : stats.totalClubs}
          </p>
        </div>
        
        <div className="stat-card clickable" onClick={() => setActiveModal('teams')}>
          <h3>Total Teams</h3>
          <p className="stat-number">
            {loading ? '...' : stats.totalTeams}
          </p>
        </div>
        
        <div className="stat-card clickable" onClick={() => setActiveModal('active')}>
          <h3>Active Members</h3>
          <p className="stat-number">
            {loading ? '...' : stats.activeMembers}
          </p>
        </div>
        
        <div className="stat-card clickable" onClick={() => setActiveModal('non-playing')}>
          <h3>Non-Playing</h3>
          <p className="stat-number">
            {loading ? '...' : stats.nonPlayingMembers}
          </p>
        </div>
        
        <div className="stat-card clickable" onClick={() => setActiveModal('inactive')}>
          <h3>Inactive</h3>
          <p className="stat-number">
            {loading ? '...' : stats.inactiveMembers}
          </p>
        </div>
        
        <div className="stat-card clickable" onClick={() => setActiveModal('seasons')}>
          <h3>Seasons</h3>
          <p className="stat-number">
            {loading ? '...' : stats.totalSeasons}
          </p>
        </div>

        <div className="stat-card clickable" onClick={() => setActiveModal('matches')}>
    <h3>Total Matches</h3>
    <p className="stat-number">
      {loading ? '...' : stats.totalMatches}
    </p>
  </div>
      </div>

      <div className="dashboard-sections">
        <div className="section">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
  <button 
    className={`action-btn ${showClubForm ? 'cancel-btn' : ''}`}
    onClick={() => setShowClubForm(!showClubForm)}
  >
    <UserGroupIcon className="btn-icon" />
    {showClubForm ? 'Cancel' : 'Add Club'}
  </button>
  
  <button 
    className={`action-btn ${showTeamForm ? 'cancel-btn' : ''}`}
    onClick={() => setShowTeamForm(!showTeamForm)}
  >
    <UserGroupIcon className="btn-icon" />
    {showTeamForm ? 'Cancel' : 'Add Team'}
  </button>
  
  <button 
    className={`action-btn ${showMemberForm ? 'cancel-btn' : ''}`}
    onClick={() => {
      setShowMemberForm(!showMemberForm);
      setActiveTab(1);
    }}
  >
    <UserIcon className="btn-icon" />
    {showMemberForm ? 'Cancel' : 'Add Member'}
  </button>
  
  <button 
    className={`action-btn ${showSeasonForm ? 'cancel-btn' : ''}`}
    onClick={() => setShowSeasonForm(!showSeasonForm)}
  >
    <TrophyIcon className="btn-icon" />
    {showSeasonForm ? 'Cancel' : 'Create Season'}
  </button>
  
  <button 
    className="action-btn upload-btn"
    onClick={() => setShowUploadModal(true)}
  >
    <CloudArrowUpIcon className="btn-icon" />
    Upload Member
  </button>
  
  <button 
    className="action-btn download-btn"
    onClick={handleDownloadMembers}
  >
    <CloudArrowDownIcon className="btn-icon" />
    Download Member
  </button>
  
  <button 
    className="action-btn roster-btn"
    onClick={() => {
      setSelectedRosterSeason(null);
      setShowRosterForm(true);
    }}
  >
    <ClipboardDocumentListIcon className="btn-icon" />
    Manage Rosters
  </button>

  <button 
  className="action-btn user-btn"
  onClick={() => setShowUserManager(true)}
>
  <UserGroupIcon className="btn-icon" />
  Manage Users
</button>
  
  <button 
    className="action-btn match-btn full-width"
    onClick={() => {
      setSelectedMatch(null);
      setShowMatchForm(true);
    }}
  >
    <CalendarIcon className="btn-icon" />
    Schedule Match
  </button>
</div>



          {/* Add Club Form */}
          {showClubForm && (
            <form onSubmit={handleAddClub} className="inline-form">
              <h3>Add New Club</h3>
              <input
                type="text"
                placeholder="Club ID (e.g., ODA001)"
                value={newClub.clubId}
                onChange={(e) => setNewClub({...newClub, clubId: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Club Name"
                value={newClub.name}
                onChange={(e) => setNewClub({...newClub, name: e.target.value})}
                required
              />
              <button type="submit" className="submit-btn">Save Club</button>
            </form>
          )}

          {/* Add Team Form */}
          {showTeamForm && (
            <form onSubmit={handleAddTeam} className="inline-form">
              <h3>Add New Team</h3>
              <input
                type="text"
                placeholder="Team Name"
                value={newTeam.name}
                onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                required
              />
              
              <select
                value={newTeam.clubId}
                onChange={(e) => setNewTeam({...newTeam, clubId: e.target.value})}
                required
              >
                <option value="">Select a Club</option>
                {clubs.map(club => (
                  <option key={club.id} value={club.clubId}>
                    {club.clubId} - {club.name}
                  </option>
                ))}
              </select>
              
              <button type="submit" className="submit-btn">Save Team</button>
            </form>
          )}

          {/* Add Member Form with Tabs */}
          {showMemberForm && (
            <div className="member-form-container">
              <h3>Add New Member</h3>
              
              <div className="form-tabs">
                <button 
                  className={`tab-btn ${activeTab === 1 ? 'active' : ''}`}
                  onClick={() => setActiveTab(1)}
                >
                  Personal
                </button>
                <button 
                  className={`tab-btn ${activeTab === 2 ? 'active' : ''}`}
                  onClick={() => setActiveTab(2)}
                >
                  Contact
                </button>
                <button 
                  className={`tab-btn ${activeTab === 3 ? 'active' : ''}`}
                  onClick={() => setActiveTab(3)}
                >
                  Club & Status
                </button>
              </div>

              <form onSubmit={handleAddMember} className="tabbed-form">
                {activeTab === 1 && (
                  <div className="tab-content">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Membership No.</label>
                        <input
                          type="text"
                          placeholder="e.g., DSA-130013"
                          value={newMember.membershipNo}
                          onChange={(e) => setNewMember({...newMember, membershipNo: e.target.value})}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>ID Number *</label>
                        <input
                          type="text"
                          placeholder="13 digit ID number"
                          value={newMember.idNumber}
                          onChange={(e) => setNewMember({...newMember, idNumber: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Surname *</label>
                        <input
                          type="text"
                          placeholder="Surname"
                          value={newMember.surname}
                          onChange={(e) => setNewMember({...newMember, surname: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Initials</label>
                        <input
                          type="text"
                          placeholder="e.g., A"
                          value={newMember.initials}
                          onChange={(e) => setNewMember({...newMember, initials: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>First Names (as per ID) *</label>
                        <input
                          type="text"
                          placeholder="Full first names"
                          value={newMember.firstNames}
                          onChange={(e) => setNewMember({...newMember, firstNames: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Calling Name</label>
                        <input
                          type="text"
                          placeholder="Nickname"
                          value={newMember.callingName}
                          onChange={(e) => setNewMember({...newMember, callingName: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Date of Birth *</label>
                        <input
                          type="date"
                          value={newMember.dateOfBirth}
                          onChange={(e) => setNewMember({...newMember, dateOfBirth: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Sex *</label>
                        <select
                          value={newMember.sex}
                          onChange={(e) => setNewMember({...newMember, sex: e.target.value})}
                          required
                        >
                          <option value="">Select Sex</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Race *</label>
                        <select
                          value={newMember.race}
                          onChange={(e) => setNewMember({...newMember, race: e.target.value})}
                          required
                        >
                          <option value="">Select Race</option>
                          <option value="White">White</option>
                          <option value="Black">Black</option>
                          <option value="Coloured">Coloured</option>
                          <option value="Indian">Indian</option>
                          <option value="Asian">Asian</option>
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Category (Auto)</label>
                        <input
                          type="text"
                          value={newMember.category}
                          readOnly
                          className="auto-field"
                        />
                        <small>Auto-calculated from race/sex/age</small>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 2 && (
                  <div className="tab-content">
                    <div className="form-group full-width">
                      <label>Home Address</label>
                      <textarea
                        placeholder="Full home address"
                        value={newMember.homeAddress}
                        onChange={(e) => setNewMember({...newMember, homeAddress: e.target.value})}
                        rows="3"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Home Tel</label>
                        <input
                          type="tel"
                          placeholder="021 555 1234"
                          value={newMember.homeTel}
                          onChange={(e) => setNewMember({...newMember, homeTel: e.target.value})}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Work Tel</label>
                        <input
                          type="tel"
                          placeholder="021 555 5678"
                          value={newMember.workTel}
                          onChange={(e) => setNewMember({...newMember, workTel: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Cell No *</label>
                        <input
                          type="tel"
                          placeholder="072 123 4567"
                          value={newMember.cellNo}
                          onChange={(e) => setNewMember({...newMember, cellNo: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Email Address</label>
                        <input
                          type="email"
                          placeholder="name@example.com"
                          value={newMember.email}
                          onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 3 && (
                  <div className="tab-content">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Club *</label>
                        <select
                          value={newMember.clubId}
                          onChange={(e) => setNewMember({...newMember, clubId: e.target.value, teamId: ''})}
                          required
                        >
                          <option value="">Select Club</option>
                          {clubs.map(club => (
                            <option key={club.id} value={club.clubId}>
                              {club.clubId} - {club.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Team</label>
                        <select
                          value={newMember.teamId}
                          onChange={(e) => setNewMember({...newMember, teamId: e.target.value})}
                          disabled={!newMember.clubId}
                        >
                          <option value="">Select Team (optional)</option>
                          {filteredTeams.map(team => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Status *</label>
                        <select
                          value={newMember.status}
                          onChange={(e) => setNewMember({...newMember, status: e.target.value})}
                          required
                        >
                          <option value="active">Active Player</option>
                          <option value="non-playing">Non-Playing Member</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      
                      <div className="form-group">
                        <label>Province</label>
                        <input
                          type="text"
                          value="Western Cape"
                          readOnly
                          className="auto-field"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>District</label>
                        <input
                          type="text"
                          value="Cape Town"
                          readOnly
                          className="auto-field"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Association</label>
                        <input
                          type="text"
                          value="Observatory"
                          readOnly
                          className="auto-field"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-navigation">
                  {activeTab > 1 && (
                    <button type="button" className="nav-btn prev" onClick={() => setActiveTab(activeTab - 1)}>
                      ← Previous
                    </button>
                  )}
                  
                  {activeTab < 3 ? (
                    <button type="button" className="nav-btn next" onClick={() => setActiveTab(activeTab + 1)}>
                      Next →
                    </button>
                  ) : (
                    <button type="submit" className="submit-btn">Save Member</button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Add Season Form */}
          {showSeasonForm && (
            <form onSubmit={handleAddSeason} className="inline-form">
              <h3>Create New Season</h3>
              <input
                type="text"
                placeholder="Season Name (e.g., Memorial 2026)"
                value={newSeason.name}
                onChange={(e) => setNewSeason({...newSeason, name: e.target.value})}
                required
              />
              
              <select
                value={newSeason.type === 'other' ? 'other' : newSeason.type}
                onChange={(e) => {
                  if (e.target.value === 'other') {
                    setNewSeason({
                      ...newSeason, 
                      type: '', 
                      showOtherInput: true,
                      customType: ''
                    });
                  } else {
                    setNewSeason({
                      ...newSeason, 
                      type: e.target.value, 
                      showOtherInput: false,
                      customType: ''
                    });
                  }
                }}
                required
              >
                <option value="">Select Format</option>
                <option value="4-a-side">4-a-side</option>
                <option value="6-a-side">6-a-side</option>
                <option value="singles">Singles</option>
                <option value="doubles">Doubles</option>
                <option value="other">Other (specify)</option>
              </select>
              
              {newSeason.showOtherInput && (
                <input
                  type="text"
                  placeholder="Enter format (e.g., 3-a-side, round robin)"
                  value={newSeason.customType || ''}
                  onChange={(e) => setNewSeason({
                    ...newSeason, 
                    customType: e.target.value,
                    type: e.target.value
                  })}
                  required
                  autoFocus
                />
              )}
              
              <div className="date-fields">
                <input
                  type="date"
                  placeholder="Start Date"
                  value={newSeason.startDate}
                  onChange={(e) => setNewSeason({...newSeason, startDate: e.target.value})}
                />
                <input
                  type="date"
                  placeholder="End Date"
                  value={newSeason.endDate}
                  onChange={(e) => setNewSeason({...newSeason, endDate: e.target.value})}
                />
              </div>
              
              <button type="submit" className="submit-btn">Create Season</button>
            </form>
          )}
        </div>

        

        <div className="section">
          <h2>🎂 Upcoming Birthdays</h2>
          <div className="birthday-list">
            {upcomingBirthdays.length > 0 ? (
              upcomingBirthdays.map((member, index) => {
                let birthDate;
                if (member.dateOfBirth?.toDate) {
                  birthDate = member.dateOfBirth.toDate();
                } else {
                  birthDate = new Date(member.dateOfBirth);
                }
                
                const today = new Date();
                const thisYearsBirthday = new Date(
                  today.getFullYear(),
                  birthDate.getMonth(),
                  birthDate.getDate()
                );
                
                if (thisYearsBirthday < today) {
                  thisYearsBirthday.setFullYear(today.getFullYear() + 1);
                }
                
                const daysUntil = Math.ceil((thisYearsBirthday - today) / (1000 * 60 * 60 * 24));
                
                const dateStr = thisYearsBirthday.toLocaleDateString('en-ZA', { 
                  day: '2-digit', 
                  month: 'short'
                });
                
                const club = clubs.find(c => c.clubId === member.clubId);
                
                return (
                  <div key={member.id} className="birthday-item">
                    <span className="birthday-date">{dateStr}</span>
                    <span className="birthday-name">
                      {member.firstNames} {member.surname}
                      {daysUntil === 0 ? ' 🎉 TODAY!' : daysUntil === 1 ? ' 🎂 Tomorrow!' : ''}
                    </span>
                    <span className="birthday-club">{club?.name || ''}</span>
                    {daysUntil > 1 && daysUntil <= 7 && (
                      <span className="birthday-soon">{daysUntil} days</span>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="no-birthdays">No upcoming birthdays in the next 30 days</p>
            )}
          </div>
        </div>
        </div>
     
       {/* Rosters Summary Tile */}
      {rosters.length > 0 && (
        <div className="full-width-section">
          <div className="section-header-with-link">
            <h2>📋 Active Rosters</h2>
            <button 
              className="view-all-link"
              onClick={() => {
                setSelectedRosterSeason(null);
                setShowRosterForm(true);
              }}
            >
              Manage All Rosters →
            </button>
          </div>
          
          <div className="rosters-summary">
            {seasons.map(season => {
              // Get rosters for this season
              const seasonRosters = rosters.filter(r => r.seasonId === season.id);
              if (seasonRosters.length === 0) return null;
              
              return (
                <div key={season.id} className="roster-season-card">
                  <div className="roster-season-header">
                    <h4>{season.name} ({season.type})</h4>
                    <button 
                      className="season-delete-btn"
                      onClick={() => handleDeleteSeasonRosters(season.id, season.name)}
                      title="Delete all rosters for this season"
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="roster-team-list">
                    {seasonRosters.map(roster => {
                      const team = teams.find(t => t.id === roster.teamId);
                      const club = clubs.find(c => c.clubId === team?.clubId);
                      const playerCount = roster.memberIds?.length || 0;
                      const expectedCount = getExpectedPlayerCount(season.type);
                      const isComplete = playerCount === expectedCount;
                      
                      return (
                        <div key={roster.id} className="roster-team-summary">
                          <div className="roster-team-info">
                            <span className="roster-team-name">
                              {club?.name} - {team?.name}
                            </span>
                            <span className={`roster-team-count ${isComplete ? 'complete' : 'incomplete'}`}>
                              {playerCount}/{expectedCount}
                              {isComplete ? ' ✓' : ' ⚠️'}
                            </span>
                          </div>
                          <div className="roster-team-actions">
                            <button 
                              className="roster-edit-btn"
                              onClick={() => handleEditRoster(season.id, team?.id)}
                              title="Edit this roster"
                            >
                              ✏️
                            </button>
                            <button 
                              className="roster-delete-btn"
                              onClick={() => handleDeleteRoster(season.id, team?.id, team?.name)}
                              title="Delete this roster"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {renderModal()}
      {renderEditModal()}
      
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={handleCloseUpload}>
          <div className="modal-container large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload DSA Excel File</h2>
              <button className="modal-close" onClick={handleCloseUpload}>✕</button>
            </div>
            
            <div className="modal-content">
              {!uploadPreview && !uploadResults && (
                <div className="upload-area">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    disabled={uploadLoading}
                    id="file-upload"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="file-upload" className="upload-label">
                    {uploadLoading ? 'Processing...' : 'Click to select Excel file'}
                  </label>
                  <p className="upload-hint">
                    Accepted formats: .xlsx, .xls, .csv
                  </p>
                </div>
              )}
              
              {uploadPreview && !uploadResults && (
                <div className="preview-area">
                  <h3>Preview Changes</h3>
                  
                  <div className="preview-stats">
                    <div className="stat-badge new">
                      <span className="stat-number">{uploadPreview.duplicateCheck.new.length}</span>
                      <span className="stat-label">New Members</span>
                    </div>
                    <div className="stat-badge update">
                      <span className="stat-number">{uploadPreview.duplicateCheck.updates.length}</span>
                      <span className="stat-label">Updates</span>
                    </div>
                    <div className="stat-badge error">
                      <span className="stat-number">{uploadPreview.duplicateCheck.errors.length}</span>
                      <span className="stat-label">Errors</span>
                    </div>
                  </div>
                  
                  {uploadPreview.duplicateCheck.updates.length > 0 && (
                    <div className="preview-section">
                      <h4>Members to Update:</h4>
                      {uploadPreview.duplicateCheck.updates.slice(0, 5).map((update, idx) => (
                        <div key={idx} className="preview-item">
                          <strong>{update.existing.surname}, {update.existing.firstNames}</strong>
                          <div className="preview-changes">
                            {Object.entries(update.changes).map(([field, values]) => (
                              <div key={field} className="change-row">
                                <span className="field">{field}:</span>
                                <span className="old">{values.old}</span>
                                <span className="arrow">→</span>
                                <span className="new">{values.new}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {uploadPreview.duplicateCheck.updates.length > 5 && (
                        <p className="more-hint">...and {uploadPreview.duplicateCheck.updates.length - 5} more</p>
                      )}
                    </div>
                  )}
                  
                  {uploadPreview.duplicateCheck.errors.length > 0 && (
                    <div className="preview-section errors">
                      <h4>Errors to Review:</h4>
                      {uploadPreview.duplicateCheck.errors.slice(0, 5).map((error, idx) => (
                        <div key={idx} className="error-item">
                          <strong>{error.row.surname}, {error.row.firstNames}</strong>
                          <p className="error-reason">{error.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="preview-actions">
                    <button className="cancel-btn" onClick={handleCloseUpload}>Cancel</button>
                    <button 
                      className="submit-btn" 
                      onClick={handleImportConfirm}
                      disabled={uploadLoading || uploadPreview.duplicateCheck.new.length === 0 && uploadPreview.duplicateCheck.updates.length === 0}
                    >
                      {uploadLoading ? 'Importing...' : 'Confirm Import'}
                    </button>
                  </div>
                </div>
              )}
              
              {uploadResults && (
                <div className="results-area">
                  <h3>Import Complete!</h3>
                  
                  <div className="results-stats">
                    <div className="stat-badge new">
                      <span className="stat-number">{uploadResults.new.length}</span>
                      <span className="stat-label">Added</span>
                    </div>
                    <div className="stat-badge update">
                      <span className="stat-number">{uploadResults.updates.length}</span>
                      <span className="stat-label">Updated</span>
                    </div>
                    <div className="stat-badge error">
                      <span className="stat-number">{uploadResults.errors.length}</span>
                      <span className="stat-label">Errors</span>
                    </div>
                  </div>
                  
                  <button className="submit-btn" onClick={handleCloseUpload}>
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Toast Notification */}
{toast && (
  <Toast
    message={toast.message}
    type={toast.type}
    onClose={() => setToast(null)}
    duration={3000}
  />
)}

{/* Match Type Toggle - ONLY SHOW WHEN CREATING NEW MATCH (not editing) */}
{showMatchForm && !selectedMatch && (
  <div className="match-type-toggle">
    <button 
      className={`toggle-btn ${matchType === 'team' ? 'active' : ''}`}
      onClick={() => setMatchType('team')}
    >
      👥 Team Match
    </button>
    <button 
      className={`toggle-btn ${matchType === 'singles' ? 'active' : ''}`}
      onClick={() => setMatchType('singles')}
    >
      🎯 Singles Match
    </button>
  </div>
)}

{/* Match Form Modal */}
{showMatchForm && (
  <div className="modal-overlay" onClick={() => {
    setShowMatchForm(false);
    setMatchType('team');
    setSelectedMatch(null);
  }}>
    <div className="modal-container large" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h2>{selectedMatch ? 'Edit Match' : 'Schedule Match'}</h2>
        <button className="modal-close" onClick={() => {
          setShowMatchForm(false);
          setMatchType('team');
          setSelectedMatch(null);
        }}>✕</button>
      </div>
      
      {/* Match Type Toggle - ONLY show when creating new match */}
      {!selectedMatch && (
        <div className="match-type-toggle">
          <button 
            className={`toggle-btn ${matchType === 'team' ? 'active' : ''}`}
            onClick={() => setMatchType('team')}
          >
            <UserGroupIcon className="toggle-icon" />
            <span>Team</span>
          </button>
          <button 
            className={`toggle-btn ${matchType === 'singles' ? 'active' : ''}`}
            onClick={() => setMatchType('singles')}
          >
            <UserIcon className="toggle-icon" />
            <span>Singles</span>
          </button>
        </div>
      )}
      
      {/* Form Content */}
      <div className="modal-content">
        {matchType === 'team' ? (
          <MatchForm
            seasons={seasons}
            teams={teams}
            members={members}
            onSubmit={async (formData) => {
              try {
                if (selectedMatch) {
                  // Update existing match - use updateMatch, NOT updateMatchResult
                  await MatchService.updateMatch(selectedMatch.id, { ...formData, matchType: 'team' });
                  setToast({ type: 'success', message: '✅ Match updated successfully!' });
                } else {
                  // Create new match
                  await MatchService.createMatch({ ...formData, matchType: 'team' });
                  setToast({ type: 'success', message: '✅ Team match scheduled successfully!' });
                }
                setShowMatchForm(false);
                setMatchType('team');
                setSelectedMatch(null);
                fetchAllData();
              } catch (error) {
                setToast({ type: 'error', message: '❌ Error scheduling match' });
              }
            }}
            onCancel={() => {
              setShowMatchForm(false);
              setMatchType('team');
              setSelectedMatch(null);
            }}
            initialData={selectedMatch}
          />
        ) : (
          <SinglesMatchForm
            seasons={seasons}
            members={members}
            onSubmit={async (formData) => {
              try {
                if (selectedMatch) {
                  // Update existing match - use updateMatch, NOT updateMatchResult
                  await MatchService.updateMatch(selectedMatch.id, { ...formData, matchType: 'singles' });
                  setToast({ type: 'success', message: '✅ Match updated successfully!' });
                } else {
                  // Create new match
                  await MatchService.createMatch({ ...formData, matchType: 'singles' });
                  setToast({ type: 'success', message: '✅ Singles match scheduled successfully!' });
                }
                setShowMatchForm(false);
                setMatchType('team');
                setSelectedMatch(null);
                fetchAllData();
              } catch (error) {
                setToast({ type: 'error', message: '❌ Error scheduling match' });
              }
            }}
            onCancel={() => {
              setShowMatchForm(false);
              setMatchType('team');
              setSelectedMatch(null);
            }}
            initialData={selectedMatch}
          />
        )}
      </div>
    </div>
  </div>
)}



{/* Roster Management Modal */}
{showRosterForm && (
  console.log('Opening roster modal with:', { 
    season: selectedRosterSeason, 
    team: selectedRosterTeam 
  }) || 
  <div className="modal-overlay" onClick={() => setShowRosterForm(false)}>
    <div className="modal-container large" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h2>Manage Team Rosters</h2>
        <button className="modal-close" onClick={() => setShowRosterForm(false)}>✕</button>
      </div>
      <RosterManager
  seasons={seasons}
  clubs={clubs}
  teams={teams}
  members={members}
  initialSeasonId={selectedRosterSeason}
  initialTeamId={selectedRosterTeam}
  onSave={() => {
    setShowRosterForm(false);
    setSelectedRosterSeason(null);
    setSelectedRosterTeam(null);
    setToast({
      type: 'success',
      message: '✅ Rosters saved successfully!'
    });
    fetchAllData();
  }}
  onCancel={() => {
    setShowRosterForm(false);
    setSelectedRosterSeason(null);
    setSelectedRosterTeam(null);
  }}
/>
    </div>
  </div>
)}
      
{/* User Management Modal */}
{showUserManager && (
  <UserManager
    seasons={seasons}
    teams={teams}
    clubs={clubs}        // ← ADD THIS LINE
    onClose={() => setShowUserManager(false)}
  />
)}

    </div>
  );
}

export default AdminDashboard;