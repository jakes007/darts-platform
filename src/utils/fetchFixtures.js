import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';

export const fetchFixturesWithTeamNames = async (options = {}) => {
  const {
    filter = 'all', // 'all', 'upcoming', 'completed'
    limitCount = null,
    clubId = null
  } = options;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    let matches = [];
    
    if (clubId) {
      // If clubId is provided, get all teams in that club first
      const teamsQuery = query(
        collection(db, 'teams'),
        where('clubId', '==', clubId)
      );
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamIds = teamsSnapshot.docs.map(doc => doc.id);
      
      if (teamIds.length === 0) return [];
      
      // Get matches for these teams (home or away)
      const homeMatchesQuery = query(
        collection(db, 'matches'),
        where('homeTeamId', 'in', teamIds)
      );
      
      const awayMatchesQuery = query(
        collection(db, 'matches'),
        where('awayTeamId', 'in', teamIds)
      );
      
      const [homeSnapshot, awaySnapshot] = await Promise.all([
        getDocs(homeMatchesQuery),
        getDocs(awayMatchesQuery)
      ]);
      
      // Combine matches
      const matchesMap = new Map();
      homeSnapshot.forEach(doc => matchesMap.set(doc.id, { id: doc.id, ...doc.data() }));
      awaySnapshot.forEach(doc => matchesMap.set(doc.id, { id: doc.id, ...doc.data() }));
      
      matches = Array.from(matchesMap.values());
    } else {
      // Get all matches
      const matchesSnapshot = await getDocs(query(collection(db, 'matches')));
      matches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Fetch all teams for caching
    const teamsSnapshot = await getDocs(collection(db, 'teams'));
    const teamsCache = {};
    teamsSnapshot.docs.forEach(doc => {
      teamsCache[doc.id] = doc.data();
    });

    // Add team names to matches
    const matchesWithTeams = matches.map(match => ({
      ...match,
      homeTeamName: teamsCache[match.homeTeamId]?.name || match.homeTeamId,
      awayTeamName: teamsCache[match.awayTeamId]?.name || match.awayTeamId,
      homeTeamLogo: teamsCache[match.homeTeamId]?.logo || null,
      awayTeamLogo: teamsCache[match.awayTeamId]?.logo || null
    }));

    // Determine if match is upcoming or completed based on date and scores
    const processedMatches = matchesWithTeams.map(match => {
      const matchDate = match.date;
      const hasScores = match.homeScore !== undefined && match.awayScore !== undefined && 
                       (match.homeScore !== null || match.awayScore !== null);
      
      return {
        ...match,
        isUpcoming: matchDate >= todayStr && !hasScores,
        isCompleted: !(matchDate >= todayStr && !hasScores)
      };
    });

    // Filter based on the filter parameter
let filteredMatches = processedMatches;
if (filter === 'upcoming') {
  filteredMatches = processedMatches.filter(m => m.isUpcoming);
} else if (filter === 'completed') {
  filteredMatches = processedMatches.filter(m => m.isCompleted);
}

// Sort appropriately
if (filter === 'upcoming') {
  filteredMatches.sort((a, b) => a.date.localeCompare(b.date)); // Ascending for upcoming
} else if (filter === 'completed') {
  filteredMatches.sort((a, b) => b.date.localeCompare(a.date)); // Descending for completed
} else {
  // For 'all', sort ALL fixtures by date ascending (oldest first)
  filteredMatches.sort((a, b) => a.date.localeCompare(b.date));
}

// Apply limit if specified
if (limitCount) {
  filteredMatches = filteredMatches.slice(0, limitCount);
}

return filteredMatches;
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    return [];
  }
};