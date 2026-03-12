import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { MemberModel } from '../models/MemberModel';

class MemberService {
  constructor() {
    this.collection = collection(db, 'members');
  }

  // Clean member data before saving
  cleanMemberData(data) {
    const cleaned = { ...data };
    
    // Clean text fields (proper case)
    const textFields = ['surname', 'firstNames', 'callingName', 'homeAddress'];
    textFields.forEach(field => {
      if (cleaned[field]) {
        cleaned[field] = MemberModel.cleaners.text(cleaned[field]);
      }
    });

    // Clean phone fields (digits only)
    const phoneFields = ['homeTel', 'workTel', 'cellNo'];
    phoneFields.forEach(field => {
      if (cleaned[field]) {
        cleaned[field] = MemberModel.cleaners.phone(cleaned[field]);
      }
    });

    // Email to lowercase (standard)
    if (cleaned.email) {
      cleaned.email = cleaned.email.toLowerCase().trim();
    }

    // ID Number: uppercase and remove spaces
    if (cleaned.idNumber) {
      cleaned.idNumber = cleaned.idNumber.replace(/\s/g, '').toUpperCase();
    }

    // Membership No: uppercase and trim
    if (cleaned.membershipNo) {
      cleaned.membershipNo = cleaned.membershipNo.toUpperCase().trim();
    }

    // Sex and Race: store in proper case for display
    if (cleaned.sex) {
      cleaned.sex = cleaned.sex.charAt(0).toUpperCase() + 
        cleaned.sex.slice(1).toLowerCase();
    }
    
    if (cleaned.race) {
      cleaned.race = cleaned.race.charAt(0).toUpperCase() + 
        cleaned.race.slice(1).toLowerCase();
    }

    // Calculate category if not provided
    if (!cleaned.category && cleaned.race && cleaned.sex && cleaned.dateOfBirth) {
      cleaned.category = MemberModel.calculateCategory(
        cleaned.race, 
        cleaned.sex, 
        cleaned.dateOfBirth
      );
    }

    return cleaned;
  }

  // Add new member
  async addMember(data) {
    const cleanedData = this.cleanMemberData(data);
    
    // Check for duplicate ID number
    const duplicateQuery = query(
      this.collection, 
      where('idNumber', '==', cleanedData.idNumber)
    );
    const duplicateSnapshot = await getDocs(duplicateQuery);
    
    if (!duplicateSnapshot.empty) {
      throw new Error('Member with this ID Number already exists');
    }

    // Add timestamps
    cleanedData.createdAt = serverTimestamp();
    cleanedData.updatedAt = serverTimestamp();

    return await addDoc(this.collection, cleanedData);
  }

  // Update existing member
  async updateMember(id, data) {
    const cleanedData = this.cleanMemberData(data);
    
    // Check for duplicate ID number (excluding this member)
    const duplicateQuery = query(
      this.collection, 
      where('idNumber', '==', cleanedData.idNumber)
    );
    const duplicateSnapshot = await getDocs(duplicateQuery);
    
    const duplicateExists = !duplicateSnapshot.empty && 
      duplicateSnapshot.docs[0].id !== id;
    
    if (duplicateExists) {
      throw new Error('Member with this ID Number already exists');
    }

    cleanedData.updatedAt = serverTimestamp();
    
    const docRef = doc(db, 'members', id);
    return await updateDoc(docRef, cleanedData);
  }

  // Get all members
  async getAllMembers() {
    const snapshot = await getDocs(this.collection);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  // Get member by ID number
  async getMemberByIdNumber(idNumber) {
    const q = query(this.collection, where('idNumber', '==', idNumber));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  }

  // Delete member
  async deleteMember(id) {
    const docRef = doc(db, 'members', id);
    return await deleteDoc(docRef);
  }

  // Export for DSA (ALL CAPS)
  formatForDSA(member) {
    const getClubName = (clubId) => {
      // This will be filled in later when we build export
      return clubId || '';
    };

    return {
      'Membership No.': member.membershipNo?.toUpperCase() || '',
      'Province': 'WESTERN CAPE',
      'District': 'CAPE TOWN',
      'Association': 'OBSERVATORY',
      'Sex': member.sex?.toUpperCase() || '',
      'Race': member.race?.toUpperCase() || '',
      'Category': member.category?.toUpperCase() || '',
      'Status': member.status?.toUpperCase() || '',
      'Surname': member.surname?.toUpperCase() || '',
      'Initials': member.initials?.toUpperCase() || '',
      'First Names (as per ID)': member.firstNames?.toUpperCase() || '',
      'Calling Name': member.callingName?.toUpperCase() || '',
      'ID Number': member.idNumber?.toUpperCase() || '',
      'Date of Birth (yyyy-mm-dd)': member.dateOfBirth ? 
        new Date(member.dateOfBirth).toISOString().split('T')[0] : '',
      'Home Address': member.homeAddress?.toUpperCase() || '',
      'Home Tel No': member.homeTel || '',
      'Work Tel No': member.workTel || '',
      'Cell No': member.cellNo || '',
      'eMail address': member.email?.toLowerCase() || '',
      'Club': getClubName(member.clubId) // Club name, not team
    };
  }
}

export default new MemberService();