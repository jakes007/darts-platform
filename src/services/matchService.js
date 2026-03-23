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
        lineupsRevealed: false // ← ADD THIS LINE
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

// Generate round robin games after lineups are set
generateRoundRobinGames(homeLineup, awayLineup) {
  const games = [];
  let gameNumber = 1;
  
  // The rotation order you specified
  const rotationOrder = [
    // Round 1
    { homeIndex: 0, awayIndex: 1 }, // 1v2
    { homeIndex: 1, awayIndex: 0 }, // 2v1
    { homeIndex: 2, awayIndex: 3 }, // 3v4
    { homeIndex: 3, awayIndex: 2 }, // 4v3
    // Round 2
    { homeIndex: 1, awayIndex: 1 }, // 2v2
    { homeIndex: 0, awayIndex: 3 }, // 1v4
    { homeIndex: 3, awayIndex: 0 }, // 4v1
    { homeIndex: 2, awayIndex: 2 }, // 3v3
    // Round 3
    { homeIndex: 3, awayIndex: 3 }, // 4v4
    { homeIndex: 0, awayIndex: 0 }, // 1v1
    { homeIndex: 1, awayIndex: 2 }, // 2v3
    { homeIndex: 2, awayIndex: 1 }, // 3v2
    // Round 4
    { homeIndex: 0, awayIndex: 2 }, // 1v3
    { homeIndex: 1, awayIndex: 3 }, // 2v4
    { homeIndex: 2, awayIndex: 0 }, // 3v1
    { homeIndex: 3, awayIndex: 1 }  // 4v2
  ];
  
  for (const order of rotationOrder) {
    games.push({
      gameId: gameNumber,
      round: Math.ceil(gameNumber / 4),
      gameNumber: gameNumber,
      homePlayerId: homeLineup[order.homeIndex],
      awayPlayerId: awayLineup[order.awayIndex],
      homeStats: {
        tonPlus: 0,
        oneEighty: 0,
        highCheckout: 0,
        scoreLeft: 501,
        dartsUsed: 0
      },
      awayStats: {
        tonPlus: 0,
        oneEighty: 0,
        highCheckout: 0,
        scoreLeft: 501,
        dartsUsed: 0
      },
      winner: null,
      notes: '',
      completed: false
    });
    gameNumber++;
  }
  
  return games;
}

}



export default new MatchService();