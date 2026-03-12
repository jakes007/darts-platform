import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, writeBatch } from 'firebase/firestore';

class ExcelService {
  constructor() {
    this.requiredColumns = [
      'Membership No.',
      'Province',
      'District',
      'Association',
      'Sex',
      'Race',
      'Category',
      'Status',
      'Surname',
      'Initials',
      'First Names (as per ID)',
      'Calling Name',
      'ID Number',
      'Date of Birth (yyyy-mm-dd)',
      'Home Address',
      'Home Tel No',
      'Work Tel No',
      'Cell No',
      'eMail address',
      'Club'
    ];
  }

  // Parse Excel file and convert to JSON
  parseExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first sheet (usually 'Membership')
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Extract headers (first row)
          const headers = jsonData[0];
          
          // Validate headers match expected format
          const missingColumns = this.requiredColumns.filter(
            col => !headers.includes(col)
          );
          
          if (missingColumns.length > 0) {
            reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
            return;
          }
          
          // Convert rows to objects
          const rows = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row.length === 0 || row.every(cell => !cell)) continue; // Skip empty rows
            
            const rowObject = {};
            headers.forEach((header, index) => {
              rowObject[header] = row[index] || '';
            });
            rows.push(rowObject);
          }
          
          resolve({ headers, rows });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  // Clean and prepare data for import
  cleanRowData(row) {
    return {
      membershipNo: row['Membership No.']?.toString().trim() || '',
      idNumber: row['ID Number']?.toString().replace(/\s/g, '').trim() || '',
      surname: row['Surname']?.toString().toUpperCase().trim() || '',
      initials: row['Initials']?.toString().toUpperCase().trim() || '',
      firstNames: row['First Names (as per ID)']?.toString().toUpperCase().trim() || '',
      callingName: row['Calling Name']?.toString().toUpperCase().trim() || '',
      dateOfBirth: row['Date of Birth (yyyy-mm-dd)'] ? new Date(row['Date of Birth (yyyy-mm-dd)']) : null,
      sex: row['Sex']?.toString().toLowerCase() === 'male' ? 'Male' : 'Female',
      race: this.cleanRace(row['Race']?.toString().trim()),
      status: this.cleanStatus(row['Status']?.toString().trim()),
      homeAddress: row['Home Address']?.toString().toUpperCase().trim() || '',
      homeTel: row['Home Tel No']?.toString().replace(/\D/g, '') || '',
      workTel: row['Work Tel No']?.toString().replace(/\D/g, '') || '',
      cellNo: row['Cell No']?.toString().replace(/\D/g, '') || '',
      email: row['eMail address']?.toString().toLowerCase().trim() || '',
      clubName: row['Club']?.toString().trim() || '',
      // Auto fields
      province: 'Western Cape',
      district: 'Cape Town',
      association: 'Observatory'
    };
  }

  // Clean race values to match our dropdown
  cleanRace(race) {
    if (!race) return '';
    const raceUpper = race.toUpperCase();
    if (raceUpper.includes('WHITE')) return 'White';
    if (raceUpper.includes('BLACK')) return 'Black';
    if (raceUpper.includes('COLOURED')) return 'Coloured';
    if (raceUpper.includes('INDIAN')) return 'Indian';
    if (raceUpper.includes('ASIAN')) return 'Asian';
    return race; // fallback
  }

  // Clean status values
  cleanStatus(status) {
    if (!status) return 'active';
    const statusUpper = status.toUpperCase();
    if (statusUpper.includes('ACTIVE')) return 'active';
    if (statusUpper.includes('NON-PLAYING') || statusUpper.includes('NON PLAYING')) return 'non-playing';
    if (statusUpper.includes('INACTIVE')) return 'inactive';
    return 'active'; // default
  }

  // Calculate category based on race, sex, and age
  calculateCategory(race, sex, dateOfBirth) {
    if (!race || !sex || !dateOfBirth) return '';
    
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    const raceUpper = race.toUpperCase();
    const sexUpper = sex.toUpperCase();
    
    if (age < 18) {
      return sexUpper === 'MALE' ? 'YM' : 'YF';
    }
    
    if (raceUpper === 'WHITE') {
      return sexUpper === 'MALE' ? 'WM' : 'WF';
    } else {
      return sexUpper === 'MALE' ? 'PDM' : 'PDF';
    }
  }

  // Check for duplicates in existing data
  async checkDuplicates(cleanedRows, existingMembers) {
    const results = {
      new: [],
      updates: [],
      errors: [],
      total: cleanedRows.length
    };

    for (const row of cleanedRows) {
      // Check by ID number
      const existingById = existingMembers.find(m => m.idNumber === row.idNumber);
      
      if (existingById) {
        // Check what fields have changed
        const changes = this.getChangedFields(existingById, row);
        if (Object.keys(changes).length > 0) {
          results.updates.push({
            existing: existingById,
            new: row,
            changes
          });
        } else {
          // No changes, skip
          results.errors.push({
            row,
            reason: 'No changes detected'
          });
        }
      } else {
        // Check by membership number if available
        if (row.membershipNo) {
          const existingByMembership = existingMembers.find(m => m.membershipNo === row.membershipNo);
          if (existingByMembership) {
            results.errors.push({
              row,
              reason: `Membership number ${row.membershipNo} exists but with different ID number`
            });
            continue;
          }
        }
        results.new.push(row);
      }
    }

    return results;
  }

  // Compare two member objects and return changed fields
  getChangedFields(oldMember, newMember) {
    const changes = {};
    const fields = ['surname', 'initials', 'firstNames', 'callingName', 'sex', 'race', 
                    'status', 'homeAddress', 'homeTel', 'workTel', 'cellNo', 'email'];
    
    fields.forEach(field => {
      if (oldMember[field] !== newMember[field]) {
        changes[field] = {
          old: oldMember[field],
          new: newMember[field]
        };
      }
    });
    
    return changes;
  }

  // Find or create club based on club name
  async findOrCreateClub(clubName, existingClubs) {
    if (!clubName) return null;
    
    const clubNameUpper = clubName.toUpperCase();
    
    // Try to find existing club
    let club = existingClubs.find(c => 
      c.name.toUpperCase() === clubNameUpper || 
      c.clubId === clubNameUpper
    );
    
    if (club) return club.clubId;
    
    // Create new club
    const clubId = clubNameUpper.replace(/\s+/g, '').substring(0, 10);
    const newClub = {
      clubId,
      name: clubName,
      createdAt: new Date()
    };
    
    const docRef = await addDoc(collection(db, 'clubs'), newClub);
    return clubId;
  }

  // Process import with batch writes
  async processImport(results, existingClubs) {
    const batch = writeBatch(db);
    const membersCollection = collection(db, 'members');
    
    for (const row of results.new) {
      // Find or create club
      const clubId = await this.findOrCreateClub(row.clubName, existingClubs);
      if (!clubId) {
        results.errors.push({
          row,
          reason: 'Could not determine club'
        });
        continue;
      }
      
      // Calculate category
      const category = this.calculateCategory(row.race, row.sex, row.dateOfBirth);
      
      // Prepare member document
      const memberDoc = {
        ...row,
        clubId,
        category,
        createdAt: new Date()
      };
      delete memberDoc.clubName; // Remove temporary field
      
      const newDocRef = doc(membersCollection);
      batch.set(newDocRef, memberDoc);
    }
    
    for (const update of results.updates) {
      // Update existing member
      const memberRef = doc(db, 'members', update.existing.id);
      batch.update(memberRef, update.new);
    }
    
    await batch.commit();
    return results;
  }
}

export default new ExcelService();