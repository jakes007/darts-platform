import { db } from '../firebase';
import { 
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, orderBy 
} from 'firebase/firestore';

class MatchService {
  constructor() {
    this.collection = collection(db, 'matches');
  }

  // Create a new match
async createMatch(matchData) {
  try {
    const match = {
      ...matchData,
      createdAt: new Date(),
      status: matchData.status || 'scheduled',
      lineupsRevealed: false  // ← ADD THIS LINE
    };
    const docRef = await addDoc(this.collection, match);
    return { id: docRef.id, ...match };
  } catch (error) {
    console.error('Error creating match:', error);
    throw error;
  }
}

  // Get all matches for a season
  async getMatchesBySeason(seasonId) {
    try {
      const q = query(
        this.collection, 
        where('seasonId', '==', seasonId),
        orderBy('date', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching matches:', error);
      return [];
    }
  }

  // Get matches for a specific team
  async getMatchesByTeam(teamId) {
    try {
      const q = query(
        this.collection,
        where('homeTeamId', '==', teamId),
        orderBy('date', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching matches:', error);
      return [];
    }
  }

  // Update match result
  async updateMatchResult(matchId, resultData) {
    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        ...resultData,
        status: 'completed',
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error updating match:', error);
      throw error;
    }
  }

  // Update match details (date, teams, players, etc.)
async updateMatch(matchId, matchData) {
  try {
    const matchRef = doc(db, 'matches', matchId);
    await updateDoc(matchRef, {
      ...matchData,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error('Error updating match:', error);
    throw error;
  }
}

  // Add player stats to a match
  async addPlayerStats(matchId, team, playerId, stats) {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      const matchData = matchDoc.data();
      
      const updatedStats = {
        ...matchData.stats,
        [team]: {
          ...matchData.stats?.[team],
          [playerId]: stats
        }
      };
      
      await updateDoc(matchRef, { stats: updatedStats });
      return true;
    } catch (error) {
      console.error('Error adding player stats:', error);
      throw error;
    }
  }

  // Delete a match
  async deleteMatch(matchId) {
    try {
      await deleteDoc(doc(db, 'matches', matchId));
      return true;
    } catch (error) {
      console.error('Error deleting match:', error);
      throw error;
    }
  }

  // Create a match that inherits format from season
async createMatchFromSeason(seasonId, matchData) {
  try {
    // First, get the season to access its matchFormat
    const seasonRef = doc(db, 'seasons', seasonId);
    const seasonSnap = await getDoc(seasonRef);
    
    if (!seasonSnap.exists()) {
      throw new Error('Season not found');
    }
    
    const season = seasonSnap.data();
    
    // Create match with season's format
    const match = {
      ...matchData,
      seasonId,
      seasonFormat: season.matchFormat || [], // Inherit format from season
      createdAt: new Date(),
      status: matchData.status || 'scheduled',
      results: {} // Empty results object to be filled later
    };
    
    const docRef = await addDoc(this.collection, match);
    return { id: docRef.id, ...match };
  } catch (error) {
    console.error('Error creating match from season:', error);
    throw error;
  }
}

}



export default new MatchService();