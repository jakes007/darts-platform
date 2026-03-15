import { db } from '../firebase';
import { 
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where 
} from 'firebase/firestore';

class RosterService {
  constructor() {
    this.collection = collection(db, 'rosters');
  }

  // Create or update a roster for a team in a season
  async setTeamRoster(seasonId, teamId, memberIds) {
    try {
      // Check if roster already exists for this team in this season
      const q = query(
        collection(db, 'seasons', seasonId, 'rosters'),
        where('teamId', '==', teamId)
      );
      const snapshot = await getDocs(q);
      
      const rosterData = {
        teamId,
        memberIds,
        updatedAt: new Date()
      };

      if (snapshot.empty) {
        // Create new roster
        const docRef = await addDoc(collection(db, 'seasons', seasonId, 'rosters'), {
          ...rosterData,
          createdAt: new Date()
        });
        return { id: docRef.id, ...rosterData };
      } else {
        // Update existing roster
        const rosterDoc = snapshot.docs[0];
        await updateDoc(doc(db, 'seasons', seasonId, 'rosters', rosterDoc.id), rosterData);
        return { id: rosterDoc.id, ...rosterData };
      }
    } catch (error) {
      console.error('Error saving roster:', error);
      throw error;
    }
  }

  // Get roster for a team in a season
  async getTeamRoster(seasonId, teamId) {
    try {
      const q = query(
        collection(db, 'seasons', seasonId, 'rosters'),
        where('teamId', '==', teamId)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error fetching roster:', error);
      return null;
    }
  }

  // Get all rosters for a season
  async getSeasonRosters(seasonId) {
    try {
      const snapshot = await getDocs(collection(db, 'seasons', seasonId, 'rosters'));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching season rosters:', error);
      return [];
    }
  }

  // Delete a roster
  async deleteRoster(seasonId, rosterId) {
    try {
      await deleteDoc(doc(db, 'seasons', seasonId, 'rosters', rosterId));
      return true;
    } catch (error) {
      console.error('Error deleting roster:', error);
      throw error;
    }
  }
}

export default new RosterService();