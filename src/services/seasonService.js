import { db } from '../firebase';
import { 
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where 
} from 'firebase/firestore';

class SeasonService {
  constructor() {
    this.collection = collection(db, 'seasons');
  }

  // Create a new season with match format
  async createSeason(seasonData) {
    try {
      // Ensure matchFormat exists (default to empty array if not provided)
      const season = {
        name: seasonData.name,
        type: seasonData.type,
        matchFormat: seasonData.matchFormat || [], // The game structure
        startDate: seasonData.startDate ? new Date(seasonData.startDate) : null,
        endDate: seasonData.endDate ? new Date(seasonData.endDate) : null,
        createdAt: new Date(),
        createdBy: seasonData.createdBy || null
      };
      
      const docRef = await addDoc(this.collection, season);
      return { id: docRef.id, ...season };
    } catch (error) {
      console.error('Error creating season:', error);
      throw error;
    }
  }

  // Get all seasons
  async getAllSeasons() {
    try {
      const snapshot = await getDocs(this.collection);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching seasons:', error);
      return [];
    }
  }

  // Get a single season by ID
  async getSeason(seasonId) {
    try {
      const docRef = doc(db, 'seasons', seasonId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching season:', error);
      return null;
    }
  }

  // Update a season
  async updateSeason(seasonId, seasonData) {
    try {
      const seasonRef = doc(db, 'seasons', seasonId);
      
      // Remove id and createdAt from update data
      const { id, createdAt, ...updateData } = seasonData;
      
      // Ensure dates are proper
      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate);
      }
      
      await updateDoc(seasonRef, {
        ...updateData,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error updating season:', error);
      throw error;
    }
  }

  // Delete a season
  async deleteSeason(seasonId) {
    try {
      await deleteDoc(doc(db, 'seasons', seasonId));
      return true;
    } catch (error) {
      console.error('Error deleting season:', error);
      throw error;
    }
  }

  // Get the match format for a season
  async getMatchFormat(seasonId) {
    try {
      const season = await this.getSeason(seasonId);
      return season?.matchFormat || [];
    } catch (error) {
      console.error('Error getting match format:', error);
      return [];
    }
  }

  // Update the match format for a season
  async updateMatchFormat(seasonId, matchFormat) {
    try {
      const seasonRef = doc(db, 'seasons', seasonId);
      await updateDoc(seasonRef, {
        matchFormat: matchFormat,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error updating match format:', error);
      throw error;
    }
  }

  // Validate if a match format is complete/valid
  validateMatchFormat(matchFormat, seasonType) {
    if (!matchFormat || matchFormat.length === 0) {
      return {
        valid: false,
        message: 'Match format must have at least one game'
      };
    }

    // Check each game has required fields
    for (let i = 0; i < matchFormat.length; i++) {
      const game = matchFormat[i];
      
      if (!game.type) {
        return {
          valid: false,
          message: `Game ${i + 1} is missing a type`
        };
      }

      if (game.type === 'leg' && !game.startingScore) {
        return {
          valid: false,
          message: `Leg ${i + 1} needs a starting score (e.g., 701)`
        };
      }
    }

    return { valid: true, message: 'Valid format' };
  }

  // Get player count based on game type and season type
  getPlayerCountForGame(gameType, seasonType) {
    if (gameType === 'singles') return 1;
    if (gameType === 'doubles') return 2;
    if (gameType === 'leg') {
      // Extract number from season type (e.g., "6-a-side" -> 6)
      const match = seasonType.match(/(\d+)/);
      return match ? parseInt(match[0]) : 4; // Default to 4
    }
    return 1; // Default
  }
}

export default new SeasonService();