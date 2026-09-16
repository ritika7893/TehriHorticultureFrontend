/**
 * Date utility functions for handling DD/MM/YYYY and YYYY-MM-DD formats
 * Users interact with DD/MM/YYYY format, while backend uses YYYY-MM-DD format
 */
 
/**
 * Convert DD/MM/YYYY to YYYY-MM-DD format for backend
 * @param {string} dateString - Date in DD/MM/YYYY format
 * @returns {string} Date in YYYY-MM-DD format
 */
export const convertToBackendFormat = (dateString) => {
  if (!dateString) return "";
 
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
 
  // Try parsing DD/MM/YYYY format
  const parts = dateString.split(/[-\/\.]/);
  if (parts.length === 3) {
    // Check if first part is day (DD/MM/YYYY)
    if (parseInt(parts[0]) <= 31 && parseInt(parts[1]) <= 12) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${month}-${day}`;
    }
    // Check if first part is year (YYYY/MM/DD)
    if (parseInt(parts[0]) > 31) {
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${parts[0]}-${month}-${day}`;
    }
  }
 
  // Try standard JavaScript Date parsing
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
 
  return dateString;
};
 
/**
 * Convert YYYY-MM-DD (backend format) to DD/MM/YYYY for display
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Date in DD/MM/YYYY format
 */
export const convertToDisplayFormat = (dateString) => {
  if (!dateString) return "";
 
  // If already in DD/MM/YYYY format, return as-is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return dateString;
  }
 
  // Try parsing YYYY-MM-DD format
  const parts = dateString.split(/[-\/\.]/);
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
   
    // Check if it looks like YYYY-MM-DD (year is 4 digits)
    if (year.length === 4 && parseInt(month) <= 12 && parseInt(day) <= 31) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }
 
  // Try standard JavaScript Date parsing
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
 
  return dateString;
};
 
/**
 * Format date for Excel display - returns DD/MM/YYYY
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Date in DD/MM/YYYY format
 */
export const formatDateForExcel = (dateString) => {
  return convertToDisplayFormat(dateString);
};
 
/**
 * Parse date from Excel input (various formats) to YYYY-MM-DD for backend
 * @param {string} value - Date value from Excel (could be various formats)
 * @returns {string} Date in YYYY-MM-DD format
 */
export const parseDateFromExcel = (val) => {
  if (val === null || val === undefined || val === '') return "";
 
  // If already a Date object
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      return val.toISOString().split('T')[0];
    }
    return "";
  }
 
  // If it's a number (Excel serial date)
  if (typeof val === 'number') {
    try {
      // Excel stores dates as serial numbers (days since 1899-12-30)
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const ms = Math.round(val * 24 * 60 * 60 * 1000);
      const date = new Date(excelEpoch.getTime() + ms);
      return date.toISOString().split('T')[0];
    } catch (e) {
      return "";
    }
  }
 
  // Try parsing as string
  const strVal = String(val).trim();
 
  // Try YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) {
    return strVal;
  }
 
  // Try DD/MM/YYYY format
  const parts = strVal.split(/[-\/\.]/);
  if (parts.length === 3) {
    const p1 = parseInt(parts[0]);
    const p2 = parseInt(parts[1]);
    const p3 = parseInt(parts[2]);
   
    // If third part is 4 digits (year), assume DD/MM/YYYY format
    if (p3 > 1000 && p1 <= 31 && p2 <= 12) {
      const day = String(p1).padStart(2, '0');
      const month = String(p2).padStart(2, '0');
      return `${p3}-${month}-${day}`;
    }
   
    // If first part > 12, it's likely DD/MM/YYYY
    if (p1 > 12 && p2 <= 12 && p3 > 1000) {
      const day = String(p1).padStart(2, '0');
      const month = String(p2).padStart(2, '0');
      return `${p3}-${month}-${day}`;
    }
   
    // If first part <= 12 and third part is 2 digits, assume DD/MM/YY
    if (p1 <= 12 && p2 <= 12 && parts[2].length === 2) {
      const year = parseInt(parts[2]) + 2000;
      const day = String(p1).padStart(2, '0');
      const month = String(p2).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
   
    // If first part > 31, it's likely YYYY/MM/DD
    if (p1 > 31) {
      const month = String(p2).padStart(2, '0');
      const day = String(p3).padStart(2, '0');
      return `${p1}-${month}-${day}`;
    }
  }
 
  // Fallback to standard Date parsing
  const date = new Date(strVal);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
 
  return "";
};
 
/**
 * Get today's date in DD/MM/YYYY format
 * @returns {string} Today's date in DD/MM/YYYY format
 */
export const getTodayInDisplayFormat = () => {
  return convertToDisplayFormat(new Date().toISOString().split('T')[0]);
};
 
/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export const getTodayInBackendFormat = () => {
  return new Date().toISOString().split('T')[0];
};
 
/**
 * Validate DD/MM/YYYY date format
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid DD/MM/YYYY format
 */
export const isValidDisplayDate = (dateString) => {
  if (!dateString) return false;
 
  const parts = dateString.split('/');
  if (parts.length !== 3) return false;
 
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const year = parseInt(parts[2]);
 
  if (day < 1 || day > 31) return false;
  if (month < 1 || month > 12) return false;
  if (year < 1900 || year > 2100) return false;
 
  return true;
}; 