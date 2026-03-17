/**
 * Format a date from Firestore consistently
 * @param {any} timestamp - Firestore timestamp, Date object, or string
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
export const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      let date;
      
      // Handle Firestore Timestamp
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
      else {
        return '';
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) return '';
      
      // Format as YYYY-MM-DD using UTC methods to avoid timezone shift
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };
  
  /**
   * Format a date for display (DD/MM/YYYY)
   */
  export const formatDateDisplay = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      let date;
      
      if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else {
        return '';
      }
      
      if (isNaN(date.getTime())) return '';
      
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      return '';
    }
  };