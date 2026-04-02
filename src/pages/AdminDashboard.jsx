// ============================================
// ADMIN DASHBOARD - Main control panel for club management
// ============================================
// This file handles:
// - Club, Team, Member, Season, Roster management
// - Excel import/export
// - Match scheduling and scoring
// - Tournament management
// ============================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, query, where, getDocs, addDoc, 
  serverTimestamp, doc, deleteDoc, updateDoc 
} from 'firebase/firestore';
import ConfirmModal from '../components/ConfirmModal';
import ExcelService from '../services/excelService';
import '../styles/admin/admin-dashboard-base.css';
import '../styles/admin/admin-dashboard-buttons.css';
import '../styles/admin/admin-dashboard-forms.css';
import '../styles/admin/admin-dashboard-modals.css';
import '../styles/admin/admin-dashboard-lists.css';
import './AdminDashboard.css';
import Toast from '../components/Toast';
import MatchForm from '../components/MatchForm';
import MatchService from '../services/matchService';
import RosterManager from '../components/RosterManager';
import RosterService from '../services/rosterService';
import SinglesMatchForm from '../components/SinglesMatchForm';
import UserManager from '../components/UserManager';
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
  ExclamationTriangleIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { 
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/20/solid';
import MatchFormatBuilder from '../components/MatchFormatBuilder';
import SeasonService from '../services/seasonService';
import SinglesTournamentManager from '../components/SinglesTournamentManager';
import { useNavigate } from 'react-router-dom';
import AdminHeader from '../components/admin/AdminHeader';
import AdminStatsCards from '../components/admin/AdminStatsCards';
import AdminQuickActions from '../components/admin/AdminQuickActions';

// ============================================
// IMPORTS COMPLETE
// ============================================

// ============================================================================

// ============================================
// MAIN COMPONENT
// ============================================

function AdminDashboard() {

// ============================================
  // STATE VARIABLES
  // ============================================
  
  // ---------- UI State (what the user sees) ----------

  const { currentUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(1);

  // ---------- Modal & Form Visibility ----------
  
  const [showClubForm, setShowClubForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [showRosterForm, setShowRosterForm] = useState(false);
  const [selectedRosterSeason, setSelectedRosterSeason] = useState(null);
  const [selectedRosterTeam, setSelectedRosterTeam] = useState(null);

  const [showTournamentManager, setShowTournamentManager] = useState(false);

  const navigate = useNavigate();

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
    endDate: '',
    matchFormat: [],
    matchType: 'standard',
    legsPerGame: 1,        // ← ADD THIS
    pointsPerWin: 1,       // ← ADD THIS
    pointsPerDraw: 0,      // ← ADD THIS
    allowDraws: false      // ← ADD THIS
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


  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  // --------------------------------------------
  // CATEGORY CALCULATION (WM, WF, PDM, PDF)
  // --------------------------------------------
  // Determines player category based on race and sex
  // - White Male = WM
  // - White Female = WF  
  // - Non-White Male = PDM
  // - Non-White Female = PDF
  // --------------------------------------------
  const calculateCategory = (race, sex, dateOfBirth) => {
    console.log('Dashboard calculating category:', { race, sex, dateOfBirth });
    
    if (!race || !sex) {
      console.warn('Missing race or sex');
      return '';
    }
    
    const raceUpper = race.toUpperCase().trim();
    const sexUpper = sex.toUpperCase().trim();
    const isWhite = raceUpper === 'WHITE';
    const isMale = sexUpper === 'MALE';
    
    if (isWhite) {
      return isMale ? 'WM' : 'WF';
    } else {
      return isMale ? 'PDM' : 'PDF';
    }
  };

  // --------------------------------------------
  // ROUND ROBIN CALCULATION
  // --------------------------------------------
  // Returns total games in a round robin tournament
  // Example: 4 players = 16 games (4x4)
  // --------------------------------------------
  const getRoundRobinGameCount = (type) => {
    const playersPerTeam = parseInt(type) || 4;
    return playersPerTeam * playersPerTeam;
  };

  // --------------------------------------------
  // AUTO-UPDATE CATEGORY WHEN RACE/SEX/DOB CHANGES
  // --------------------------------------------
  useEffect(() => {
    const category = calculateCategory(newMember.race, newMember.sex, newMember.dateOfBirth);
    setNewMember(prev => ({ ...prev, category }));
  }, [newMember.race, newMember.sex, newMember.dateOfBirth]);

  // --------------------------------------------
  // GET UPCOMING BIRTHDAYS (next 30 days)
  // --------------------------------------------
  // Returns up to 5 members with birthdays in the next 30 days
  // Sorted by closest upcoming birthday first
  // --------------------------------------------
  const getUpcomingBirthdays = () => {
    console.log('Calculating birthdays from', members.length, 'members');
    
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    // Helper: Parse date from Firestore Timestamp or string
    const parseBirthDate = (member) => {
      const dob = member.dateOfBirth;
      if (!dob) return null;
      
      if (dob?.toDate) return dob.toDate();
      if (dob?.seconds) return new Date(dob.seconds * 1000);
      return new Date(dob);
    };
    
    // Helper: Get next birthday date for a member
    const getNextBirthday = (birthDate) => {
      const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      if (nextBirthday < today) {
        nextBirthday.setFullYear(today.getFullYear() + 1);
      }
      return nextBirthday;
    };
    
    const birthdays = members
      .filter(member => {
        const birthDate = parseBirthDate(member);
        if (!birthDate || isNaN(birthDate.getTime())) return false;
        
        const nextBirthday = getNextBirthday(birthDate);
        return nextBirthday <= thirtyDaysFromNow;
      })
      .sort((a, b) => {
        const dateA = parseBirthDate(a);
        const dateB = parseBirthDate(b);
        return getNextBirthday(dateA) - getNextBirthday(dateB);
      })
      .slice(0, 5);
    
    console.log('Found', birthdays.length, 'upcoming birthdays');
    return birthdays;
  };

  // --------------------------------------------
  // GET MATCHES FOR NEXT 7 DAYS
  // --------------------------------------------
  // Returns all matches scheduled in the next 7 days
  // Sorted by earliest first
  // --------------------------------------------
  const getNext7DaysMatches = () => {
    console.log('Calculating next 7 days from', matches.length, 'matches');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);
    
    const filtered = matches
      .filter(match => {
        if (!match.date) return false;
        const matchDate = new Date(match.date);
        return matchDate >= today && matchDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    console.log('Filtered matches:', filtered.length);
    return filtered;
  };

  // --------------------------------------------
  // GET EXPECTED PLAYER COUNT FROM SEASON TYPE
  // --------------------------------------------
  // Maps season type string to number of players per team
  // Examples: "6-player" → 6, "4-player" → 4, "singles" → 1
  // --------------------------------------------
  const getExpectedPlayerCount = (seasonType) => {
    if (seasonType.includes('6')) return 6;
    if (seasonType.includes('4')) return 4;
    if (seasonType.includes('singles')) return 1;
    if (seasonType.includes('doubles')) return 2;
    return 4; // default fallback
  };

    // ============================================
  // DATA FETCHING
  // ============================================
  // Loads all data from Firestore:
  // - Clubs, Teams, Members, Seasons, Matches, Rosters
  // - Also calculates upcoming birthdays and stats
  // ============================================

  const fetchAllData = async () => {
    try {
      // --------------------------------------------
      // 1. FETCH CLUBS
      // --------------------------------------------
      const clubsSnapshot = await getDocs(collection(db, 'clubs'));
      const clubsData = [];
      clubsSnapshot.forEach((doc) => {
        clubsData.push({ id: doc.id, ...doc.data() });
      });
      const totalClubs = clubsData.length;

      // --------------------------------------------
      // 2. FETCH TEAMS
      // --------------------------------------------
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      const teamsData = [];
      teamsSnapshot.forEach((doc) => {
        teamsData.push({ id: doc.id, ...doc.data() });
      });
      const totalTeams = teamsData.length;

      // --------------------------------------------
      // 3. FETCH MEMBERS (with debug logging)
      // --------------------------------------------
      const membersSnapshot = await getDocs(collection(db, 'members'));
      const membersData = [];
      membersSnapshot.forEach((doc) => {
        const member = { id: doc.id, ...doc.data() };
        console.log('🔥 MEMBER FROM FIRESTORE:', { 
          id: member.id,
          name: `${member.firstNames || ''} ${member.surname || ''}`.trim(),
          CATEGORY: member.category,
          sex: member.sex,
          race: member.race,
          status: member.status,
          dateOfBirth: member.dateOfBirth ? 'exists' : 'null'
        });
        membersData.push(member);
      });

      // --------------------------------------------
      // 4. COUNT MEMBERS BY STATUS
      // --------------------------------------------
      const activeMembers = membersData.filter(m => m.status === 'active').length;
      const nonPlayingMembers = membersData.filter(m => m.status === 'non-playing').length;
      const inactiveMembers = membersData.filter(m => m.status === 'inactive').length;

      // --------------------------------------------
      // 5. FETCH SEASONS
      // --------------------------------------------
      const seasonsSnapshot = await getDocs(collection(db, 'seasons'));
      const seasonsData = [];
      seasonsSnapshot.forEach((doc) => {
        seasonsData.push({ id: doc.id, ...doc.data() });
      });
      const totalSeasons = seasonsData.length;

      // --------------------------------------------
      // 6. FETCH MATCHES
      // --------------------------------------------
      const matchesSnapshot = await getDocs(collection(db, 'matches'));
      const matchesData = [];
      matchesSnapshot.forEach((doc) => {
        matchesData.push({ id: doc.id, ...doc.data() });
      });
      const totalMatches = matchesData.length;

      // --------------------------------------------
      // 7. FETCH ROSTERS (from all seasons)
      // --------------------------------------------
      const allRosters = [];
      for (const season of seasonsData) {
        const rostersSnapshot = await getDocs(collection(db, 'seasons', season.id, 'rosters'));
        rostersSnapshot.forEach((doc) => {
          allRosters.push({ id: doc.id, seasonId: season.id, ...doc.data() });
        });
      }

      // --------------------------------------------
      // 8. CALCULATE UPCOMING BIRTHDAYS
      // --------------------------------------------
      const calculateBirthdays = (memberList) => {
        if (!memberList || memberList.length === 0) return [];
        
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        
        // Helper: Parse date from Firestore
        const parseDate = (member) => {
          const dob = member.dateOfBirth;
          if (!dob) return null;
          if (dob?.toDate) return dob.toDate();
          if (dob?.seconds) return new Date(dob.seconds * 1000);
          return new Date(dob);
        };
        
        // Helper: Get next birthday date
        const getNextBirthday = (birthDate) => {
          const next = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
          if (next < today) next.setFullYear(today.getFullYear() + 1);
          return next;
        };
        
        return memberList
          .filter(member => {
            const birthDate = parseDate(member);
            if (!birthDate || isNaN(birthDate.getTime())) return false;
            return getNextBirthday(birthDate) <= thirtyDaysFromNow;
          })
          .sort((a, b) => {
            const dateA = parseDate(a);
            const dateB = parseDate(b);
            return getNextBirthday(dateA) - getNextBirthday(dateB);
          })
          .slice(0, 5);
      };

      const birthdayList = calculateBirthdays(membersData);
      setUpcomingBirthdays(birthdayList);

      // --------------------------------------------
      // 9. CALCULATE ROSTERS SUMMARY
      // --------------------------------------------
      // Creates a summary of all rosters across seasons
      // Shows which teams have complete/incomplete player counts
      // --------------------------------------------
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
            
            // Expected player count based on season type
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

      // --------------------------------------------
      // 10. UPDATE ALL STATE VARIABLES
      // --------------------------------------------
      setClubs(clubsData);
      setTeams(teamsData);
      setMembers(membersData);
      setSeasons(seasonsData);
      setMatches(matchesData);
      setRosters(allRosters);

      // --------------------------------------------
      // 11. UPDATE STATS
      // --------------------------------------------
      setStats({
        totalClubs,
        totalTeams,
        activeMembers,
        nonPlayingMembers,
        inactiveMembers,
        totalSeasons,
        totalMatches
      });

    } catch (error) {
      // --------------------------------------------
      // ERROR HANDLING
      // --------------------------------------------
      console.error('Error fetching data:', error);
      setToast({
        type: 'error',
        message: '❌ Error loading dashboard data'
      });
    } finally {
      // Always turn off loading indicator
      setLoading(false);
    }
  };

  // ============================================
  // EFFECTS (useEffect hooks)
  // ============================================

  // --------------------------------------------
  // EFFECT 1: Fetch all data when dashboard loads
  // --------------------------------------------
  useEffect(() => {
    fetchAllData();
  }, []);

  // --------------------------------------------
  // EFFECT 2: When modal opens, collapse all clubs
  // (for better UI in selection dropdowns)
  // --------------------------------------------
  useEffect(() => {
    if (activeModal && clubs.length > 0) {
      const allCollapsed = new Set();
      clubs.forEach(club => allCollapsed.add(club.id));
      setCollapsedClubs(allCollapsed);
    }
  }, [activeModal, clubs]);

  // --------------------------------------------
  // EFFECT 3: Filter teams based on selected club
  // Used in member form to show only teams from selected club
  // --------------------------------------------
  useEffect(() => {
    if (newMember.clubId) {
      const filtered = teams.filter(team => team.clubId === newMember.clubId);
      setFilteredTeams(filtered);
    } else {
      setFilteredTeams([]);
    }
  }, [newMember.clubId, teams]);

    // ============================================
  // FORM HANDLERS
  // ============================================
  // These functions handle adding new records to Firestore:
  // - Clubs, Teams, Members, Seasons
  // ============================================

  // --------------------------------------------
  // HANDLE ADD CLUB
  // --------------------------------------------


  const handleAddClub = async (e) => {
    e.preventDefault();
    try {
      // Check for duplicate Club ID
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
      
      // Reset form and close modal
      setNewClub({ clubId: '', name: '' });
      setShowClubForm(false);
      fetchAllData(); // Refresh the dashboard
    } catch (error) {
      console.error('Error adding club:', error);
    }
  };

  // --------------------------------------------
  // HANDLE ADD TEAM
  // --------------------------------------------
  const handleAddTeam = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'teams'), {
        name: newTeam.name,
        clubId: newTeam.clubId,
        createdAt: serverTimestamp()
      });
      
      // Reset form and close modal
      setNewTeam({ name: '', clubId: '' });
      setShowTeamForm(false);
      fetchAllData(); // Refresh the dashboard
    } catch (error) {
      console.error('Error adding team:', error);
    }
  };

  // --------------------------------------------
  // HANDLE ADD MEMBER
  // --------------------------------------------
  // Creates a new member with data formatting:
  // - Converts text fields to UPPERCASE
  // - Removes non-digits from phone numbers
  // - Checks for duplicate ID numbers
  // --------------------------------------------
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

      // Format all data before saving
      const memberData = {
        ...newMember,
        // Text fields → UPPERCASE
        surname: newMember.surname.toUpperCase(),
        initials: newMember.initials.toUpperCase(),
        firstNames: newMember.firstNames.toUpperCase(),
        callingName: newMember.callingName?.toUpperCase() || '',
        homeAddress: newMember.homeAddress?.toUpperCase() || '',
        email: newMember.email?.toLowerCase() || '',
        // Phone numbers → digits only
        homeTel: newMember.homeTel?.replace(/\D/g, '') || '',
        workTel: newMember.workTel?.replace(/\D/g, '') || '',
        cellNo: newMember.cellNo?.replace(/\D/g, '') || '',
        // Date conversion
        dateOfBirth: newMember.dateOfBirth ? new Date(newMember.dateOfBirth) : null,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'members'), memberData);
      
      // Reset form to default values
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
      
      // Close form and refresh
      setActiveTab(1);
      setShowMemberForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Error adding member. Please check all fields.');
    }
  };

  // --------------------------------------------
  // HANDLE ADD SEASON
  // --------------------------------------------
  // Creates a new season with match format configuration
  // Supports standard matches (with game formats) and singles tournaments
  // --------------------------------------------
  const handleAddSeason = async (e) => {
    e.preventDefault();
    try {
      // Use custom type if "Other" was selected
      const finalType = newSeason.showOtherInput ? newSeason.customType : newSeason.type;
      
      // Validate: Standard matches need at least one game format
      if (newSeason.matchType === 'standard' && (!newSeason.matchFormat || newSeason.matchFormat.length === 0)) {
        alert('Please add at least one game to the match format');
        return;
      }
      
      await addDoc(collection(db, 'seasons'), {
        name: newSeason.name,
        type: finalType,
        matchType: newSeason.matchType,
        matchFormat: newSeason.matchType === 'standard' ? newSeason.matchFormat : [],
        startDate: newSeason.startDate ? new Date(newSeason.startDate) : null,
        endDate: newSeason.endDate ? new Date(newSeason.endDate) : null,
        createdAt: serverTimestamp()
      });
      
      // Reset form to default values
      setNewSeason({ 
        name: '', 
        type: '',
        customType: '',
        showOtherInput: false,
        startDate: '',
        endDate: '',
        matchFormat: [],
        matchType: 'standard'
      });
      
      // Close form and refresh
      setShowSeasonForm(false);
      fetchAllData();
    } catch (error) {
      console.error('Error adding season:', error);
      alert('Error creating season');
    }
  };

  // --------------------------------------------
  // TOGGLE CLUB COLLAPSE (for UI accordion)
  // --------------------------------------------
  // Expands or collapses a club section in the UI
  // Used in member/club selection dropdowns
  // --------------------------------------------
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


    // ============================================
  // EXCEL UPLOAD HANDLERS
  // ============================================
  // Handles importing members from Excel files
  // and exporting member data to Excel
  // ============================================

  // --------------------------------------------
  // HANDLE FILE SELECT (parse Excel)
  // --------------------------------------------
  // When user picks an Excel file:
  // 1. Parses the file
  // 2. Cleans the data
  // 3. Checks for duplicates against existing members
  // 4. Shows preview before import
  // --------------------------------------------
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

  // --------------------------------------------
  // HANDLE IMPORT CONFIRM (after preview)
  // --------------------------------------------
  // User has reviewed the preview and confirmed import
  // Processes all new members and adds them to Firestore
  // --------------------------------------------
  const handleImportConfirm = async () => {
    if (!uploadPreview) return;
    
    setUploadLoading(true);
    
    try {
      const results = await ExcelService.processImport(
        uploadPreview.duplicateCheck,
        clubs
      );
      
      setUploadResults(results);
      fetchAllData(); // Refresh the dashboard with new members
    } catch (error) {
      alert('Error importing data: ' + error.message);
    } finally {
      setUploadLoading(false);
    }
  };

  // --------------------------------------------
  // HANDLE CLOSE UPLOAD MODAL
  // --------------------------------------------
  // Clears all upload-related state and closes the modal
  // --------------------------------------------
  const handleCloseUpload = () => {
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadPreview(null);
    setUploadResults(null);
  };

  // --------------------------------------------
  // HANDLE DOWNLOAD MEMBERS TO EXCEL
  // --------------------------------------------
  // Exports all members to an Excel file
  // File name format: ODA_Members_YYYY-MM-DD.xlsx
  // --------------------------------------------
  const handleDownloadMembers = () => {
    try {
      // Sort members by surname alphabetically (A to Z)
      const sortedMembers = [...members].sort((a, b) => {
        const surnameA = (a.surname || '').toUpperCase();
        const surnameB = (b.surname || '').toUpperCase();
        if (surnameA < surnameB) return -1;
        if (surnameA > surnameB) return 1;
        return 0;
      });
      
      const fileName = `ODA_Members_${new Date().toISOString().split('T')[0]}.xlsx`;
      ExcelService.downloadExcel(sortedMembers, clubs, fileName);
      
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

        // ============================================
  // DELETE FUNCTIONS
  // ============================================
  // These functions handle deleting records from Firestore.
  // Each shows a confirmation modal before deleting.
  // ============================================

  // --------------------------------------------
  // DELETE CLUB (and all associated teams & members)
  // --------------------------------------------
  // WARNING: This cascades to all teams and members in the club
  // --------------------------------------------
  const handleDeleteClub = (clubId) => {
    const club = clubs.find(c => c.clubId === clubId);
    
    // Count affected items for the warning message
    const memberCount = members.filter(m => m.clubId === clubId).length;
    const teamCount = teams.filter(t => t.clubId === clubId).length;
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Club?',
      message: `Are you sure you want to delete "${club.name}"?\n\nThis will also delete:\n• ${teamCount} team(s)\n• ${memberCount} member(s)\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        try {
          // Delete all members in this club
          const clubMembers = members.filter(m => m.clubId === clubId);
          for (const member of clubMembers) {
            await deleteDoc(doc(db, 'members', member.id));
          }
          
          // Delete all teams in this club
          const clubTeams = teams.filter(t => t.clubId === clubId);
          for (const team of clubTeams) {
            await deleteDoc(doc(db, 'teams', team.id));
          }
          
          // Delete the club itself
          const clubToDelete = clubs.find(c => c.clubId === clubId);
          await deleteDoc(doc(db, 'clubs', clubToDelete.id));
          
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          fetchAllData(); // Refresh the dashboard
          
          // Show success toast
          setToast({
            type: 'success',
            message: `✅ Club "${club.name}" and ${memberCount} member(s) deleted`
          });
        } catch (error) {
          console.error('Error deleting club:', error);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          setToast({
            type: 'error',
            message: '❌ Error deleting club'
          });
        }
      }
    });
  };

  // --------------------------------------------
  // DELETE TEAM
  // --------------------------------------------
  // Deletes a single team (members are NOT automatically deleted)
  // --------------------------------------------
  const handleDeleteTeam = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    const club = clubs.find(c => c.clubId === team?.clubId);
    
    // Count members in this team
    const memberCount = members.filter(m => m.teamId === teamId).length;
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Team?',
      message: `Are you sure you want to delete "${team.name}" from ${club?.name || 'the club'}?\n\nThis team has ${memberCount} member(s). They will NOT be deleted, but will no longer be assigned to this team.\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        try {
          // Optional: Remove teamId from members before deleting team
          // This prevents orphaned references
          const teamMembers = members.filter(m => m.teamId === teamId);
          for (const member of teamMembers) {
            await updateDoc(doc(db, 'members', member.id), { teamId: null });
          }
          
          await deleteDoc(doc(db, 'teams', teamId));
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          fetchAllData(); // Refresh the dashboard
          
          setToast({
            type: 'success',
            message: `✅ Team "${team.name}" deleted`
          });
        } catch (error) {
          console.error('Error deleting team:', error);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          setToast({
            type: 'error',
            message: '❌ Error deleting team'
          });
        }
      }
    });
  };

  // --------------------------------------------
  // DELETE TEAM (WITH ROSTER CLEANUP)
  // --------------------------------------------
  // Deletes a team and all associated rosters
  // --------------------------------------------
  const handleDeleteTeamWithConfirm = (teamId, teamName) => {
    const rosterCount = rosters.filter(r => r.teamId === teamId).length;
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Team?',
      message: `Are you sure you want to delete "${teamName}"?\n\nThis will also delete ${rosterCount} roster(s) for this team.`,
      onConfirm: async () => {
        try {
          // Delete all rosters for this team first
          const teamRosters = rosters.filter(r => r.teamId === teamId);
          for (const roster of teamRosters) {
            await RosterService.deleteRoster(roster.seasonId, roster.id);
          }
          // Then delete the team
          await handleDeleteTeam(teamId);
          
          setToast({
            type: 'success',
            message: `✅ Team "${teamName}" and ${rosterCount} roster(s) deleted`
          });
        } catch (error) {
          console.error('Error deleting team:', error);
          setToast({
            type: 'error',
            message: '❌ Error deleting team'
          });
        }
      }
    });
  };

  // --------------------------------------------
  // DELETE MEMBER
  // --------------------------------------------
  // Deletes a single member from the database
  // --------------------------------------------
  const handleDeleteMember = (memberId) => {
    const member = members.find(m => m.id === memberId);
    const club = clubs.find(c => c.clubId === member?.clubId);
    const memberName = `${member?.surname || ''}, ${member?.firstNames || ''}`.trim();
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Member?',
      message: `Are you sure you want to delete "${memberName}" from ${club?.name || 'the club'}?\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'members', memberId));
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          fetchAllData(); // Refresh the dashboard
          
          setToast({
            type: 'success',
            message: `✅ Member "${memberName}" deleted`
          });
        } catch (error) {
          console.error('Error deleting member:', error);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          setToast({
            type: 'error',
            message: '❌ Error deleting member'
          });
        }
      }
    });
  };

  // --------------------------------------------
  // DELETE SEASON (and all associated rosters)
  // --------------------------------------------
  // WARNING: This cascades to all rosters in the season
  // --------------------------------------------
  const handleDeleteSeason = (seasonId) => {
    const season = seasons.find(s => s.id === seasonId);
    
    // Count rosters in this season
    const rosterCount = rosters.filter(r => r.seasonId === seasonId).length;
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Season?',
      message: `Are you sure you want to delete "${season?.name}"?\n\nThis will also delete:\n• ${rosterCount} roster(s)\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        try {
          // Delete all rosters in this season
          const seasonRosters = rosters.filter(r => r.seasonId === seasonId);
          for (const roster of seasonRosters) {
            await deleteDoc(doc(db, 'seasons', seasonId, 'rosters', roster.id));
          }
          
          // Delete the season itself
          await deleteDoc(doc(db, 'seasons', seasonId));
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          fetchAllData(); // Refresh the dashboard
          
          setToast({
            type: 'success',
            message: `✅ Season "${season?.name}" and ${rosterCount} roster(s) deleted`
          });
        } catch (error) {
          console.error('Error deleting season:', error);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          setToast({
            type: 'error',
            message: '❌ Error deleting season'
          });
        }
      }
    });
  };

  // --------------------------------------------
  // DELETE MATCH
  // --------------------------------------------
  // Uses MatchService to handle match deletion
  // Shows success/error toast notifications
  // --------------------------------------------
  const handleDeleteMatch = async (matchId) => {
    const match = matches.find(m => m.id === matchId);
    const matchDisplay = match?.homeTeam || match?.name || 'this match';
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Match?',
      message: `Are you sure you want to delete "${matchDisplay}"?\n\nThis action cannot be undone.`,
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

  // --------------------------------------------
  // DELETE SINGLE ROSTER
  // --------------------------------------------
  // Removes a specific team's roster from a season
  // --------------------------------------------
  const handleDeleteRoster = (seasonId, teamId, teamName) => {
    const season = seasons.find(s => s.id === seasonId);
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Roster?',
      message: `Are you sure you want to delete the roster for "${teamName}" in ${season?.name}?\n\nThis will remove all player assignments for this team.`,
      onConfirm: async () => {
        try {
          // Find the roster ID
          const rosterToDelete = rosters.find(r => r.seasonId === seasonId && r.teamId === teamId);
          if (rosterToDelete) {
            await RosterService.deleteRoster(seasonId, rosterToDelete.id);
            setToast({
              type: 'success',
              message: `✅ Roster for "${teamName}" deleted successfully`
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

  // --------------------------------------------
  // DELETE ALL ROSTERS FOR A SEASON
  // --------------------------------------------
  // Bulk delete - removes every roster in a season
  // --------------------------------------------
  const handleDeleteSeasonRosters = (seasonId, seasonName) => {
    const rosterCount = rosters.filter(r => r.seasonId === seasonId).length;
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete All Rosters?',
      message: `Are you sure you want to delete ALL ${rosterCount} roster(s) for "${seasonName}"?\n\nThis cannot be undone.`,
      onConfirm: async () => {
        try {
          const seasonRosters = rosters.filter(r => r.seasonId === seasonId);
          for (const roster of seasonRosters) {
            await RosterService.deleteRoster(seasonId, roster.id);
          }
          setToast({
            type: 'success',
            message: `✅ All ${rosterCount} roster(s) for "${seasonName}" deleted`
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

    // ============================================
  // EDIT FUNCTIONS
  // ============================================
  // Handles editing clubs, teams, members, seasons, rosters, and matches
  // ============================================

  // --------------------------------------------
  // GENERIC EDIT HANDLER (Clubs, Teams, Members, Seasons)
  // --------------------------------------------
  // Opens edit modal with pre-filled form data
  // --------------------------------------------
    // --------------------------------------------
  // GENERIC EDIT HANDLER (Clubs, Teams, Members, Seasons)
  // --------------------------------------------
  // Opens edit modal with pre-filled form data
  // --------------------------------------------
  const handleEditClick = (item, type) => {
    console.log('🔧 Editing item:', { item, type }); // Debug log
    
    // Make sure we have a clean copy of the item to edit
    const itemToEdit = { ...item };
    
    // Remove any Firestore-specific fields that shouldn't be edited
    delete itemToEdit.id;
    delete itemToEdit.createdAt;
    
    setEditingItem({ ...item, type });
    setEditForm(itemToEdit);
    setShowEditModal(true);
    
    console.log('📝 Edit form set to:', itemToEdit); // Debug log
  };

  // --------------------------------------------
  // SUBMIT EDITS TO DATABASE
  // --------------------------------------------
  // Handles the actual update after form submission
  // Special handling for club ID changes (updates child records)
  // --------------------------------------------
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    // SPECIAL CASE: If editing a club and Club ID changed
    // Update all teams and members to use the new Club ID
    if (editingItem.type === 'club' && editingItem.clubId !== editForm.clubId) {
      // Check if new Club ID already exists
      const existingClub = clubs.find(c => c.clubId === editForm.clubId && c.id !== editingItem.id);
      if (existingClub) {
        alert('Club ID already exists. Please choose a different one.');
        return;
      }
      
      // Update all teams with the new Club ID
      const teamsToUpdate = teams.filter(t => t.clubId === editingItem.clubId);
      for (const team of teamsToUpdate) {
        await updateDoc(doc(db, 'teams', team.id), { clubId: editForm.clubId });
      }

      // Update all members with the new Club ID
      const membersToUpdate = members.filter(m => m.clubId === editingItem.clubId);
      for (const member of membersToUpdate) {
        await updateDoc(doc(db, 'members', member.id), { clubId: editForm.clubId });
      }
    }
    
    try {
      // Remove fields that shouldn't be updated (id, type, createdAt)
      const docRef = doc(db, editingItem.type + 's', editingItem.id);
      const { id, type, createdAt, ...updateData } = editForm;
      await updateDoc(docRef, updateData);
      
      setShowEditModal(false);
      setEditingItem(null);
      fetchAllData(); // Refresh the dashboard
      
      setToast({
        type: 'success',
        message: `✅ ${editingItem.type} updated successfully`
      });
    } catch (error) {
      console.error('Error updating:', error);
      setToast({
        type: 'error',
        message: `❌ Error updating ${editingItem.type}`
      });
    }
  };

  // --------------------------------------------
  // EDIT ROSTER
  // --------------------------------------------
  // Opens RosterManager with pre-selected season and team
  // --------------------------------------------
  const handleEditRoster = (seasonId, teamId) => {
    console.log('Editing roster:', { seasonId, teamId });
    setSelectedRosterSeason(seasonId);
    setSelectedRosterTeam(teamId);
    setShowRosterForm(true);
  };

  // --------------------------------------------
  // EDIT MATCH
  // --------------------------------------------
  // Opens match form with pre-filled match data
  // --------------------------------------------
  const handleEditMatch = (match) => {
    console.log('Editing match:', match);
    setSelectedMatch(match);
    setMatchType(match.matchType || 'team');
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
  {club.name}
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
  {club.name}
</h4>
                    <span className="member-count">{clubMembers.length}</span>
                  </div>
                  
                  {!collapsedClubs.has(club.id) && (
                    <div className="club-children">
                      {[...clubMembers]
  .sort((a, b) => {
    const surnameA = (a.surname || '').toUpperCase();
    const surnameB = (b.surname || '').toUpperCase();
    if (surnameA < surnameB) return -1;
    if (surnameA > surnameB) return 1;
    return 0;
  })
  .map(member => (
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
                {/* Singles status */}
                {(() => {
                  const hasHomePlayer = match.homePlayerId ? true : false;
                  const hasAwayPlayer = match.awayPlayerId ? true : false;
                  const playerStatus = hasHomePlayer && hasAwayPlayer ? 'ready' : 'warning';
                  const statusText = hasHomePlayer && hasAwayPlayer 
                    ? '✅ Players set' 
                    : '⚠️ Missing player';
                  return (
                    <span className={`match-status ${playerStatus}`}>
                      {statusText}
                    </span>
                  );
                })()}
              </div>
              <div className="match-players">
                ({members.find(m => m.id === match.homePlayerId)?.clubId || '?'} vs{' '}
                {members.find(m => m.id === match.awayPlayerId)?.clubId || '?'})
              </div>
            </>
          ) : (
            // Team match display
            <>
              <div className="match-teams">
                {homeTeam?.name || 'Unknown'} vs {awayTeam?.name || 'Unknown'}
              </div>
              <div className="match-metadata">
                <span className="match-season">🏆 {season?.name || 'No season'}</span>
                {/* Team match status */}
                {(() => {
                  const hasHomePlayers = match.homePlayers?.length > 0;
                  const hasAwayPlayers = match.awayPlayers?.length > 0;
                  
                  let statusClass = 'scheduled';
                  let statusText = '📅 Scheduled';
                  
                  if (hasHomePlayers || hasAwayPlayers) {
                    if (hasHomePlayers && hasAwayPlayers) {
                      statusClass = 'ready';
                      statusText = '✅ Players set';
                    } else {
                      statusClass = 'warning';
                      statusText = '⚠️ Partial roster';
                    }
                  }
                  
                  return (
                    <span className={`match-status ${statusClass}`}>
                      {statusText}
                    </span>
                  );
                })()}
              </div>
            </>
          )}
        </div>
        <div className="match-actions">
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
              <h2>{editingItem.surname}, {editingItem.firstNames}</h2>
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
          <h2>Edit {editingItem.type === 'club' ? 'Club' : editingItem.type === 'team' ? 'Team' : editingItem.type}</h2>
          <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
        </div>
        
        <form onSubmit={handleEditSubmit} className="edit-form">
          
          {/* ========== SEASON EDITING (FULL CUSTOM LAYOUT) ========== */}
          {editingItem.type === 'season' && (
            <>
              {/* 1. Season Name */}
              <div className="form-group">
                <label>Season Name:</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  placeholder="e.g., Summer League 2026"
                />
              </div>
              
              {/* 2. Format Type */}
              <div className="form-group">
                <label>Format:</label>
                {['4-a-side', '6-a-side', 'singles', 'doubles'].includes(editForm.type) ? (
                  <select
                    value={editForm.type || ''}
                    onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                  >
                    <option value="4-a-side">4-a-side</option>
                    <option value="6-a-side">6-a-side</option>
                    <option value="singles">Singles</option>
                    <option value="doubles">Doubles</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={editForm.type || ''}
                    onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                    placeholder="Custom format (e.g., 7-a-side)"
                  />
                )}
              </div>
              
              {/* 3. Match Format Type */}
              <div className="form-group">
                <label>Match Format:</label>
                <select
                  value={editForm.matchType || 'standard'}
                  onChange={(e) => {
                    const newMatchType = e.target.value;
                    setEditForm({
                      ...editForm,
                      matchType: newMatchType,
                      matchFormat: newMatchType === 'standard' ? (editForm.matchFormat || []) : [],
                      legsPerGame: newMatchType === 'round_robin' ? (editForm.legsPerGame || 1) : undefined
                    });
                  }}
                >
                  <option value="standard">Standard (Singles, Doubles, Legs)</option>
                  <option value="round_robin">Round Robin (Each player plays each opponent)</option>
                </select>
              </div>
              
              {/* 4. Conditional Section */}
              {editForm.matchType === 'standard' ? (
                <div className="form-group full-width">
                  <label>Build Match Format (Order of Play):</label>
                  <MatchFormatBuilder
                    initialFormat={editForm.matchFormat || []}
                    seasonType={editForm.type || '6-a-side'}
                    onChange={(format) => setEditForm({...editForm, matchFormat: format})}
                  />
                </div>
              ) : (
                <>
                  <div className="round-robin-info-card">
                    <h4>Round Robin Format</h4>
                    <p>Each player will play every player from the opposing team.</p>
                    <p>For a {editForm.type || '4-a-side'} match, this means {getRoundRobinGameCount(editForm.type)} games.</p>
                    <p className="info-note">The playing order follows a standard rotation to ensure fairness.</p>
                  </div>
                  
                  <div className="points-system-section">
                    <h4>Legs per Game</h4>
                    <div className="legs-options">
                      <label className={`leg-option ${editForm.legsPerGame === 1 ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="legsPerGame"
                          value="1"
                          checked={editForm.legsPerGame === 1}
                          onChange={() => {
                            setEditForm({
                              ...editForm,
                              legsPerGame: 1,
                              pointsPerWin: 1,
                              pointsPerDraw: 0,
                              allowDraws: false
                            });
                          }}
                        />
                        <span>1 leg (sudden death - win = 1 point)</span>
                      </label>
                      <label className={`leg-option ${editForm.legsPerGame === 2 ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="legsPerGame"
                          value="2"
                          checked={editForm.legsPerGame === 2}
                          onChange={() => {
                            setEditForm({
                              ...editForm,
                              legsPerGame: 2,
                              pointsPerWin: 2,
                              pointsPerDraw: 1,
                              allowDraws: true
                            });
                          }}
                        />
                        <span>2 legs (win = 2 points, draw = 1 point)</span>
                      </label>
                    </div>
                    <div className="points-preview">
                      <p>Each game: {editForm.legsPerGame === 1 ? '1 leg (sudden death)' : '2 legs (best of 2)'}</p>
                      <p>Win = {editForm.legsPerGame === 1 ? 1 : 2} point{editForm.legsPerGame === 1 ? '' : 's'}</p>
                      {editForm.legsPerGame === 2 && <p>Draw = 1 point (if 1-1)</p>}
                      <p>Total match points: {16 * (editForm.legsPerGame === 1 ? 1 : 2)}</p>
                    </div>
                  </div>
                </>
              )}
              
              {/* 5. Start Date & End Date */}
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date:</label>
                  <input
                    type="date"
                    value={formatDateForInput(editForm.startDate)}
                    onChange={(e) => setEditForm({...editForm, startDate: e.target.value})}
                  />
                  {editForm.startDate && (
                    <small className="field-hint">
                      Selected: {formatDateDisplay(editForm.startDate)}
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label>End Date:</label>
                  <input
                    type="date"
                    value={formatDateForInput(editForm.endDate)}
                    onChange={(e) => setEditForm({...editForm, endDate: e.target.value})}
                  />
                  {editForm.endDate && (
                    <small className="field-hint">
                      Selected: {formatDateDisplay(editForm.endDate)}
                    </small>
                  )}
                </div>
              </div>
            </>
          )}
          
          {/* ========== CLUB EDITING ========== */}
          {editingItem.type === 'club' && (
            <>
              <div className="form-group">
                <label>Club ID:</label>
                <input
                  type="text"
                  value={editForm.clubId || ''}
                  onChange={(e) => setEditForm({...editForm, clubId: e.target.value})}
                  placeholder="e.g., ODA001"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Club Name:</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  placeholder="Enter club name"
                  required
                />
              </div>
            </>
          )}
          
          {/* ========== TEAM EDITING ========== */}
          {editingItem.type === 'team' && (
              <>
                <div className="form-group">
                  <label>Team Name:</label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    placeholder="Enter team name"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Club:</label>
                  <select
                    value={editForm.clubId || ''}
                    onChange={(e) => setEditForm({...editForm, clubId: e.target.value})}
                    required
                  >
                    <option value="">Select a club</option>
                    {clubs.map(club => (
                      <option key={club.id} value={club.clubId}>
                        {club.name} ({club.clubId})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          
          {/* ========== FORM ACTIONS ========== */}
          <div className="form-actions">
            <button type="submit" className="submit-btn">Save Changes</button>
            <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)}>Cancel</button>
          </div>
          
        </form>
      </div>
    </div>
  );
  };

   // ============================================
  // RENDER (UI)
  // ============================================

  return (
    <div className="admin-dashboard">
      
      {/* HEADER */}
      <AdminHeader user={currentUser} onLogout={logout} />

      {/* STATS CARDS */}
      <AdminStatsCards 
        loading={loading} 
        stats={stats} 
        onCardClick={setActiveModal} 
      />
      
      {/* TWO-COLUMN LAYOUT */}
      <div className="dashboard-sections">
        
        {/* LEFT COLUMN: Quick Actions Buttons */}
        <AdminQuickActions
          showClubForm={showClubForm}
          showTeamForm={showTeamForm}
          showMemberForm={showMemberForm}
          showSeasonForm={showSeasonForm}
          setShowClubForm={setShowClubForm}
          setShowTeamForm={setShowTeamForm}
          setShowMemberForm={setShowMemberForm}
          setShowSeasonForm={setShowSeasonForm}
          setShowRosterForm={setShowRosterForm}
          setShowUserManager={setShowUserManager}
          setShowUploadModal={setShowUploadModal}
          setSelectedRosterSeason={setSelectedRosterSeason}
          setActiveTab={setActiveTab}
          setSelectedMatch={setSelectedMatch}
          setShowMatchForm={setShowMatchForm}
          handleDownloadMembers={handleDownloadMembers}
          navigate={navigate}
        />
        
        {/* RIGHT COLUMN: Forms */}
        <div className="section">

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
        placeholder="Enter format (e.g., 7-a-side, 3-a-side, round robin)"
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
    
    {/* NEW: Match Type Selection */}
    <div className="form-group">
      <label>Match Format</label>
      <select
        value={newSeason.matchType}
        onChange={(e) => setNewSeason({...newSeason, matchType: e.target.value})}
        className="match-type-select"
      >
        <option value="standard">Standard (Singles, Doubles, Legs)</option>
        <option value="round_robin">Round Robin (Each player plays each opponent)</option>
      </select>
    </div>
    
    {/* Match Format Builder - Only show for standard matches */}
    {newSeason.matchType === 'standard' && (
      <MatchFormatBuilder
        initialFormat={newSeason.matchFormat}
        seasonType={newSeason.type || '6-a-side'}
        onChange={(format) => setNewSeason({...newSeason, matchFormat: format})}
      />
    )}

    {/* Round Robin Info - Only show for round robin */}
{newSeason.matchType === 'round_robin' && (
  <div className="round-robin-info-card">
    <h4>Round Robin Format</h4>
    <p>Each player will play every player from the opposing team.</p>
    <p>For a {newSeason.type || '4-a-side'} match, this means {getRoundRobinGameCount(newSeason.type)} games.</p>
    <p className="info-note">The playing order follows a standard rotation to ensure fairness.</p>
  </div>
)}

{/* 👇 ADD THE POINTS SYSTEM SECTION RIGHT HERE 👇 */}
{/* Points System - Only show for round robin */}
{newSeason.matchType === 'round_robin' && (
  <div className="points-system-section">
    <h4>Points System</h4>
    
    <div className="legs-options">
      <label className={`leg-option ${newSeason.legsPerGame === 1 ? 'active' : ''}`}>
        <input
          type="radio"
          name="legsPerGame"
          value="1"
          checked={newSeason.legsPerGame === 1}
          onChange={() => {
            setNewSeason({
              ...newSeason,
              legsPerGame: 1,
              pointsPerWin: 1,
              pointsPerDraw: 0,
              allowDraws: false
            });
          }}
        />
        <span>16-point system (1 leg - win = 1 point, no draws)</span>
      </label>
      
      <label className={`leg-option ${newSeason.legsPerGame === 2 ? 'active' : ''}`}>
        <input
          type="radio"
          name="legsPerGame"
          value="2"
          checked={newSeason.legsPerGame === 2}
          onChange={() => {
            setNewSeason({
              ...newSeason,
              legsPerGame: 2,
              pointsPerWin: 2,
              pointsPerDraw: 1,
              allowDraws: true
            });
          }}
        />
        <span>32-point system (2 legs - win = 2 points, draw = 1 point)</span>
      </label>
    </div>
    
    <div className="points-preview">
      <p>Each game: {newSeason.legsPerGame === 1 ? '1 leg (sudden death)' : '2 legs (best of 2)'}</p>
      <p>Win = {newSeason.legsPerGame === 1 ? 1 : 2} point{newSeason.legsPerGame === 1 ? '' : 's'}</p>
      {newSeason.legsPerGame === 2 && <p>Draw = 1 point (if 1-1)</p>}
      <p>Total match points: {16 * (newSeason.legsPerGame === 1 ? 1 : 2)}</p>
    </div>
  </div>
)}
{/* 👆 END OF ADDED CODE */}

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
    <h2>📋 Active Rosters</h2>
    
    <div className="rosters-summary">
      {seasons.map(season => {
        // Get rosters for this season - ONLY those with players
        const seasonRosters = rosters.filter(r => r.seasonId === season.id && (r.memberIds?.length > 0));
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
  <div className="modal-overlay" onClick={() => setShowRosterForm(false)}>
    <div className="modal-container large" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h2>Manage Team Rosters</h2>
        <button className="modal-close" onClick={() => setShowRosterForm(false)}>✕</button>
      </div>
      <div className="modal-content">
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
            setToast({ type: 'success', message: '✅ Rosters saved successfully!' });
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

{/* Singles Tournament Manager Modal */}
{showTournamentManager && (
  <SinglesTournamentManager onClose={() => setShowTournamentManager(false)} />
)}

    </div>
  );
}

export default AdminDashboard;