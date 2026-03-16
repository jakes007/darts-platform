import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, writeBatch, doc } from 'firebase/firestore';

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

  // ==================== PARSE & CLEAN METHODS ====================

  // Parse Excel file and convert to JSON
  parseExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Look for the "Membership" sheet specifically
          const sheetNames = workbook.SheetNames;
          const membershipSheetName = sheetNames.find(name => 
            name.toLowerCase().includes('membership')
          );
          
          if (!membershipSheetName) {
            reject(new Error('Could not find "Membership" sheet in the Excel file'));
            return;
          }
          
          const worksheet = workbook.Sheets[membershipSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '' // Default value for empty cells
          });
          
          // Find the row that contains headers (look for row with "Membership No.")
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(10, jsonData.length); i++) {
            const row = jsonData[i];
            if (row && row.some(cell => 
              cell && cell.toString().includes('Membership No.')
            )) {
              headerRowIndex = i;
              break;
            }
          }
          
          if (headerRowIndex === -1) {
            reject(new Error('Could not find header row containing "Membership No."'));
            return;
          }
          
          // Extract headers
          const headers = jsonData[headerRowIndex];
          
          // Validate headers match expected format
          const missingColumns = this.requiredColumns.filter(
            col => !headers.includes(col)
          );
          
          if (missingColumns.length > 0) {
            reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
            return;
          }
          
          // Convert rows to objects (starting after header row)
          const rows = [];
          for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0 || row.every(cell => !cell)) continue; // Skip empty rows
            
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
  const rawSex = row['Sex']?.toString();
  console.log('Raw sex from Excel:', rawSex);
  
  const cleanedSex = this.cleanSex(rawSex);
  console.log('Cleaned sex:', cleanedSex);
  
  const rawRace = row['Race']?.toString().trim();
  const cleanedRace = this.cleanRace(rawRace);
  
  const dateOfBirth = this.parseDate(row['Date of Birth (yyyy-mm-dd)']);
  
  // Calculate category with debug
  const category = this.calculateCategory(cleanedRace, cleanedSex, dateOfBirth);
  console.log('Calculated category:', category, 'for race:', cleanedRace, 'sex:', cleanedSex);
  
  return {
    membershipNo: row['Membership No.']?.toString().trim() || '',
    idNumber: row['ID Number']?.toString().replace(/\s/g, '').trim() || '',
    surname: row['Surname']?.toString().toUpperCase().trim() || '',
    initials: row['Initials']?.toString().toUpperCase().trim() || '',
    firstNames: row['First Names (as per ID)']?.toString().toUpperCase().trim() || '',
    callingName: row['Calling Name']?.toString().toUpperCase().trim() || '',
    dateOfBirth: dateOfBirth,
    sex: cleanedSex,
    race: cleanedRace,
    status: this.cleanStatus(row['Status']?.toString().trim()),
    homeAddress: row['Home Address']?.toString().toUpperCase().trim() || '',
    homeTel: row['Home Tel No']?.toString().replace(/\D/g, '') || '',
    workTel: row['Work Tel No']?.toString().replace(/\D/g, '') || '',
    cellNo: row['Cell No']?.toString().replace(/\D/g, '') || '',
    email: row['eMail address']?.toString().toLowerCase().trim() || '',
    clubName: row['Club']?.toString().trim() || '',
    province: 'Western Cape',
    district: 'Cape Town',
    association: 'Observatory'
  };
}

  // Robust date parsing with debug logging
parseDate(dateValue) {
  console.log('Raw date value:', dateValue, 'Type:', typeof dateValue);
  
  if (!dateValue) {
    console.log('Date is empty/null');
    return null;
  }
  
  try {
    // Handle Excel serial numbers (sometimes dates come as numbers)
    if (typeof dateValue === 'number') {
      console.log('Processing as Excel serial number:', dateValue);
      
      // Excel dates start from 1900-01-01
      // Excel incorrectly treats 1900 as leap year, so we need to adjust
      const excelEpoch = new Date(1900, 0, 1);
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      // Subtract 2 days: 1 for Excel's leap year bug, 1 for 1-indexed days
      const date = new Date(excelEpoch.getTime() + (dateValue - 2) * millisecondsPerDay);
      
      console.log('Converted Excel date to:', date.toString());
      
      // Validate the date is reasonable (between 1900 and 2100)
      if (date.getFullYear() > 1900 && date.getFullYear() < 2100) {
        return date;
      } else {
        console.log('Date out of reasonable range:', date.getFullYear());
      }
    }
    
    // Handle string dates
    if (typeof dateValue === 'string') {
      const dateStr = dateValue.trim();
      console.log('Processing as string:', dateStr);
      
      // Check if it's in YYYY-MM-DD format
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        console.log('Matched YYYY-MM-DD format');
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          console.log('Parsed to:', date.toString());
          return date;
        }
      }
      
      // Check if it's in DD/MM/YYYY format
      if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        console.log('Matched DD/MM/YYYY format');
        const [day, month, year] = dateStr.split('/');
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
          console.log('Parsed to:', date.toString());
          return date;
        }
      }
      
      // Check if it's in DD-MM-YYYY format
      if (dateStr.match(/^\d{2}-\d{2}-\d{4}/)) {
        console.log('Matched DD-MM-YYYY format');
        const [day, month, year] = dateStr.split('-');
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
          console.log('Parsed to:', date.toString());
          return date;
        }
      }
      
      // Check if it's in YYYY/MM/DD format
      if (dateStr.match(/^\d{4}\/\d{2}\/\d{2}/)) {
        console.log('Matched YYYY/MM/DD format');
        const [year, month, day] = dateStr.split('/');
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
          console.log('Parsed to:', date.toString());
          return date;
        }
      }
      
      // Try native Date parsing as last resort
      console.log('Trying native Date parsing');
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        // Validate year is reasonable
        const year = date.getFullYear();
        if (year > 1900 && year < 2100) {
          console.log('Native parsing succeeded:', date.toString());
          return date;
        }
      }
      
      console.log('Could not parse date string:', dateStr);
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing date:', dateValue, error);
    return null;
  }
}

  // Clean sex values - AGGRESSIVE VERSION
cleanSex(sex) {
  if (!sex) {
    console.warn('Sex is empty/null');
    return '';
  }
  
  const sexStr = sex.toString().trim();
  console.log('Raw sex value:', sexStr);
  
  // Check for female indicators
  if (sexStr.toLowerCase().includes('female') || 
      sexStr.toLowerCase().includes('fem') ||
      sexStr === 'F' ||
      sexStr === 'VROU') {
    console.log('Detected Female');
    return 'Female';
  }
  
  // Check for male indicators
  if (sexStr.toLowerCase().includes('male') ||
      sexStr === 'M' ||
      sexStr === 'MAN') {
    console.log('Detected Male');
    return 'Male';
  }
  
  // Check first character
  const firstChar = sexStr.charAt(0).toLowerCase();
  if (firstChar === 'f') {
    console.log('Detected Female (first letter)');
    return 'Female';
  }
  if (firstChar === 'm') {
    console.log('Detected Male (first letter)');
    return 'Male';
  }
  
  console.warn('Unknown sex value:', sex, 'defaulting to Male');
  return 'Male';
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

  // Calculate category based on race and sex ONLY (no age)
calculateCategory(race, sex, dateOfBirth) {
  console.log('Calculating category for:', { race, sex, dateOfBirth });
  
  if (!race || !sex) {
    console.warn('Missing race or sex for category calculation');
    return '';
  }
  
  const raceUpper = race.toUpperCase().trim();
  const sexUpper = sex.toUpperCase().trim();
  
  console.log('Normalized:', { raceUpper, sexUpper });
  
  // Determine category - NO AGE CHECK
  let category;
  if (raceUpper === 'WHITE') {
    category = sexUpper === 'MALE' ? 'WM' : 'WF';
    console.log('White category:', category);
  } else {
    category = sexUpper === 'MALE' ? 'PDM' : 'PDF';
    console.log('Non-white category:', category);
  }
  
  console.log('Final category:', category);
  return category;
}

  // ==================== DUPLICATE CHECK METHODS ====================

  // Check for duplicates in existing data
  async checkDuplicates(cleanedRows, existingMembers) {
    const results = {
      new: [],
      updates: [],
      errors: [],
      total: cleanedRows.length
    };

    for (const row of cleanedRows) {
      // Skip rows without ID number
      if (!row.idNumber) {
        results.errors.push({
          row,
          reason: 'Missing ID number'
        });
        continue;
      }

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
            reason: 'No changes detected - record identical'
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

  // ==================== CLUB MANAGEMENT ====================

  // Find or create club based on club name
  async findOrCreateClub(clubName, existingClubs) {
    if (!clubName) return null;
    
    const clubNameUpper = clubName.toUpperCase().trim();
    
    // Try to find existing club by name (case insensitive)
    let club = existingClubs.find(c => 
      c.name.toUpperCase() === clubNameUpper
    );
    
    if (club) return club.clubId; // Return existing Club ID (ODA001, etc.)
    
    // Club doesn't exist - need to create it
    
    // Find the highest existing Club ID number
    let maxNum = 0;
    existingClubs.forEach(c => {
      const match = c.clubId.match(/ODA(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    
    // Generate new Club ID (ODA001, ODA002, etc.)
    const newNum = maxNum + 1;
    const newClubId = `ODA${newNum.toString().padStart(3, '0')}`;
    
    // Create the club
    const newClub = {
      clubId: newClubId,
      name: clubName,
      createdAt: new Date()
    };
    
    await addDoc(collection(db, 'clubs'), newClub);
    
    // Add to existingClubs array for future lookups
    existingClubs.push(newClub);
    
    return newClubId;
  }

  // ==================== IMPORT PROCESSING ====================

// Process import with batch writes
async processImport(results, existingClubs) {
  console.log('=== STARTING IMPORT PROCESS ===');
  console.log('Results:', {
    new: results.new.length,
    updates: results.updates.length,
    errors: results.errors.length
  });

  const batch = writeBatch(db);
  const membersCollection = collection(db, 'members');
  const processedResults = {
    new: [],
    updates: [],
    errors: [...results.errors],
    clubsCreated: [] // Track clubs we create
  };

  // First, collect all unique club names from new members and updates
  const uniqueClubNames = new Set();
  
  // Add clubs from new members
  results.new.forEach(row => {
    if (row.clubName) uniqueClubNames.add(row.clubName.trim());
  });
  
  // Add clubs from updates (in case they're changing clubs)
  results.updates.forEach(update => {
    if (update.new.clubName) uniqueClubNames.add(update.new.clubName.trim());
  });

  console.log('Unique clubs to process:', Array.from(uniqueClubNames));

  // Process clubs first - create any that don't exist
  const clubIdMap = new Map(); // Map club name -> clubId
  
  for (const clubName of uniqueClubNames) {
    if (!clubName) continue;
    
    console.log('Processing club:', clubName);
    
    // Find or create club - using the improved method
    const clubId = await this.findOrCreateClub(clubName, existingClubs);
    if (clubId) {
      clubIdMap.set(clubName, clubId);
      console.log(`Club ${clubName} mapped to ID: ${clubId}`);
      
      // Track if this is a newly created club
      const clubExists = existingClubs.some(c => c.clubId === clubId);
      if (!clubExists) {
        processedResults.clubsCreated.push(clubName);
        console.log(`New club created: ${clubName} (${clubId})`);
      }
    }
  }

  console.log('Club mapping complete:', Object.fromEntries(clubIdMap));

  // Process new members
  console.log('=== PROCESSING NEW MEMBERS ===');
  console.log(`Total new members: ${results.new.length}`);
  
  for (const row of results.new) {
    try {
      console.log('--- New Member ---');
      console.log('Raw row data:', {
        name: `${row.firstNames} ${row.surname}`,
        race: row.race,
        sex: row.sex,
        dateOfBirth: row.dateOfBirth,
        clubName: row.clubName
      });

      const clubId = clubIdMap.get(row.clubName);
      if (!clubId) {
        console.error('Could not determine club for:', row.clubName);
        processedResults.errors.push({
          row,
          reason: 'Could not determine club'
        });
        continue;
      }
      
      // Calculate category
      const category = this.calculateCategory(row.race, row.sex, row.dateOfBirth);
      console.log('Calculated category:', category);
      console.log('Category calculation inputs:', {
        race: row.race,
        sex: row.sex,
        dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth).toISOString() : null
      });
      
      // Prepare member document
      const memberDoc = {
        membershipNo: row.membershipNo,
        idNumber: row.idNumber,
        surname: row.surname,
        initials: row.initials,
        firstNames: row.firstNames,
        callingName: row.callingName,
        dateOfBirth: row.dateOfBirth,
        sex: row.sex,
        race: row.race,
        status: row.status,
        category,
        homeAddress: row.homeAddress,
        homeTel: row.homeTel,
        workTel: row.workTel,
        cellNo: row.cellNo,
        email: row.email,
        clubId,
        province: row.province,
        district: row.district,
        association: row.association,
        createdAt: new Date()
      };
      
      console.log('Member document to save:', {
        name: `${memberDoc.firstNames} ${memberDoc.surname}`,
        category: memberDoc.category,
        sex: memberDoc.sex,
        race: memberDoc.race,
        clubId: memberDoc.clubId
      });
      
      console.log('🚨 FINAL CATEGORY BEING SAVED:', category);
console.log('🚨 FULL MEMBER DOC:', JSON.stringify(memberDoc, null, 2));
      const newDocRef = doc(membersCollection);
      batch.set(newDocRef, memberDoc);
      processedResults.new.push(row);
      console.log('✅ New member added to batch');
      
    } catch (error) {
      console.error('Error processing new member:', error);
      processedResults.errors.push({
        row,
        reason: `Error processing: ${error.message}`
      });
    }
  }
  
  // Process updates
  console.log('=== PROCESSING UPDATES ===');
  console.log(`Total updates: ${results.updates.length}`);
  
  for (const update of results.updates) {
    try {
      console.log('--- Update ---');
      console.log('Existing member:', {
        id: update.existing.id,
        name: `${update.existing.firstNames} ${update.existing.surname}`,
        category: update.existing.category,
        sex: update.existing.sex,
        race: update.existing.race
      });
      
      console.log('New data:', {
        name: `${update.new.firstNames} ${update.new.surname}`,
        race: update.new.race,
        sex: update.new.sex,
        dateOfBirth: update.new.dateOfBirth,
        clubName: update.new.clubName
      });
      
      console.log('Changes detected:', update.changes);
      
      // Get clubId (might be different if club changed)
      const clubId = clubIdMap.get(update.new.clubName) || update.existing.clubId;
      console.log('Using clubId:', clubId);
      
      // Prepare update data
      const updateData = { 
        ...update.new,
        clubId 
      };
      
      // Recalculate category if race, sex, or DOB changed
      if (update.changes.race || update.changes.sex || update.changes.dateOfBirth) {
        console.log('⚠️ Race/sex/DOB changed - recalculating category');
        updateData.category = this.calculateCategory(
          update.new.race || update.existing.race,
          update.new.sex || update.existing.sex,
          update.new.dateOfBirth || update.existing.dateOfBirth
        );
        console.log('Recalculated category:', updateData.category);
      } else {
        console.log('No race/sex/DOB changes - keeping existing category:', update.existing.category);
        updateData.category = update.existing.category;
      }
      
      // Remove fields that shouldn't be updated
      delete updateData.clubName;
      delete updateData.province;
      delete updateData.district;
      delete updateData.association;
      
      console.log('Final update data:', {
        category: updateData.category,
        sex: updateData.sex,
        race: updateData.race,
        status: updateData.status
      });
      
      const memberRef = doc(db, 'members', update.existing.id);
      batch.update(memberRef, updateData);
      processedResults.updates.push(update);
      console.log('✅ Update added to batch');
      
    } catch (error) {
      console.error('Error processing update:', error);
      processedResults.errors.push({
        row: update.new,
        reason: `Error updating: ${error.message}`
      });
    }
  }
  
  console.log('=== COMMITTING BATCH ===');
  console.log('Batch summary:', {
    newMembers: processedResults.new.length,
    updates: processedResults.updates.length,
    errors: processedResults.errors.length,
    clubsCreated: processedResults.clubsCreated
  });
  
  await batch.commit();
  console.log('✅ Batch committed successfully');
  
  return processedResults;
}

  // ==================== EXPORT METHODS ====================

  // Format members for DSA export
  formatMembersForExport(members, clubs) {
    // Filter out any members without required fields
    const validMembers = members.filter(m => m.idNumber && m.surname);
    
    return validMembers.map(member => {
      // Find club name from clubId
      const club = clubs.find(c => c.clubId === member.clubId);
      
      // Format date as yyyy-mm-dd for export
const formatDate = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    let date;
    
    // Handle Firestore Timestamp (has toDate method)
    if (timestamp && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } 
    // Handle JavaScript Date object
    else if (timestamp instanceof Date) {
      date = timestamp;
    }
    // Handle string date
    else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    }
    // Handle number (timestamp in milliseconds)
    else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    }
    // Handle Excel serial number (if stored that way)
    else if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
      // Firebase sometimes returns {seconds, nanoseconds}
      date = new Date(timestamp.seconds * 1000);
    }
    else {
      console.warn('Unknown date format:', timestamp);
      return '';
    }
    
    // Check if date is valid
    if (!date || isNaN(date.getTime())) {
      console.warn('Invalid date:', timestamp);
      return '';
    }
    
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Validate year is reasonable (not 1970)
    if (year < 1980 || year > 2100) {
      console.warn('Suspicious year:', year, 'for date:', date);
    }
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for export:', error, timestamp);
    return '';
  }
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
        'Date of Birth (yyyy-mm-dd)': formatDate(member.dateOfBirth),
        'Home Address': member.homeAddress?.toUpperCase() || '',
        'Home Tel No': member.homeTel || '',
        'Work Tel No': member.workTel || '',
        'Cell No': member.cellNo || '',
        'eMail address': member.email?.toLowerCase() || '',
        'Club': club?.name?.toUpperCase() || ''
      };
    });
  }

  // Generate Excel file and trigger download
  downloadExcel(members, clubs, fileName = 'DSA_Members_Export.xlsx') {
    const formattedData = this.formatMembersForExport(members, clubs);
    
    if (formattedData.length === 0) {
      throw new Error('No valid members to export');
    }
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(formattedData, {
      header: this.requiredColumns
    });
    
    // Set column widths (optional, makes file look better)
    const colWidths = [
      { wch: 15 }, // Membership No.
      { wch: 12 }, // Province
      { wch: 12 }, // District
      { wch: 15 }, // Association
      { wch: 8 },  // Sex
      { wch: 10 }, // Race
      { wch: 8 },  // Category
      { wch: 10 }, // Status
      { wch: 15 }, // Surname
      { wch: 8 },  // Initials
      { wch: 20 }, // First Names
      { wch: 15 }, // Calling Name
      { wch: 15 }, // ID Number
      { wch: 12 }, // Date of Birth
      { wch: 30 }, // Home Address
      { wch: 15 }, // Home Tel
      { wch: 15 }, // Work Tel
      { wch: 15 }, // Cell No
      { wch: 25 }, // Email
      { wch: 20 }  // Club
    ];
    worksheet['!cols'] = colWidths;
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Membership');
    
    // Generate Excel file
    XLSX.writeFile(workbook, fileName);
  }

  // ==================== ERROR REPORT GENERATION ====================

  // Generate error report for failed imports
  generateErrorReport(errors) {
    const errorRows = errors.map((error, index) => ({
      'Row': index + 1,
      'Membership No.': error.row?.membershipNo || '',
      'ID Number': error.row?.idNumber || '',
      'Name': `${error.row?.surname || ''} ${error.row?.firstNames || ''}`.trim(),
      'Error Reason': error.reason
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(errorRows);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Errors');
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `Import_Errors_${timestamp}.xlsx`;
    
    // Download error report
    XLSX.writeFile(workbook, fileName);
  }
}

export default new ExcelService();