import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';

export const fetchFixturesWithTeamNames = async (options = {}) => {
  const {
    status = 'scheduled',
    dateFilter = true,
    limitCount = null,
    clubId = null
  } = options;

  try {
    const today = new Date().toISOString().split('T')[0];
    let matchesQuery;
    
    // Build the base query
    let constraints = [];
    
    if (status) {
      constraints.push(where('status', '==', status));
    }
    
    if (dateFilter && status === 'scheduled') {
      constraints.push(where('date', '>=', today));
    }
    
    if (clubId) {
      // If clubId is provided, we need to get all teams in that club first
      const teamsQuery = query(
        collection(db, 'teams'),
        where('clubId', '==', clubId)
      );
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamIds = teamsSnapshot.docs.map(doc => doc.id);
      
      if (teamIds.length === 0) return [];
      
      // Get matches for these teams
      const homeMatchesQuery = query(
        collection(db, 'matches'),
        where('homeTeamId', 'in', teamIds),
        ...constraints
      );
      
      const awayMatchesQuery = query(
        collection(db, 'matches'),
        where('awayTeamId', 'in', teamIds),
        ...constraints
      );
      
      const [homeSnapshot, awaySnapshot] = await Promise.all([
        getDocs(homeMatchesQuery),
        getDocs(awayMatchesQuery)
      ]);
      
      // Combine matches
      const matchesMap = new Map();
      homeSnapshot.forEach(doc => matchesMap.set(doc.id, { id: doc.id, ...doc.data() }));
      awaySnapshot.forEach(doc => matchesMap.set(doc.id, { id: doc.id, ...doc.data() }));
      
      matchesQuery = Array.from(matchesMap.values());
    } else {
      // Get all matches
      const matchesSnapshot = await getDocs(query(collection(db, 'matches'), ...constraints));
      matchesQuery = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Sort by date
    matchesQuery.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Apply limit if specified
    const limitedMatches = limitCount ? matchesQuery.slice(0, limitCount) : matchesQuery;

    // Fetch team names for each match
    const matchesWithTeams = await Promise.all(limitedMatches.map(async (match) => {
      const [homeTeamDoc, awayTeamDoc] = await Promise.all([
        getDoc(doc(db, 'teams', match.homeTeamId)),
        getDoc(doc(db, 'teams', match.awayTeamId))
      ]);

      return {
        ...match,
        homeTeamName: homeTeamDoc.exists() ? homeTeamDoc.data().name : 'Unknown Team',
        awayTeamName: awayTeamDoc.exists() ? awayTeamDoc.data().name : 'Unknown Team',
        homeTeamLogo: homeTeamDoc.exists() ? homeTeamDoc.data().logo : null,
        awayTeamLogo: awayTeamDoc.exists() ? awayTeamDoc.data().logo : null
      };
    }));

    return matchesWithTeams;
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    return [];
  }
};