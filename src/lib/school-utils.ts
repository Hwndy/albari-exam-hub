/**
 * Utility functions for detecting and managing school context
 */

/**
 * Detects the school ID from the current domain/subdomain
 * Maps domains to school IDs for multi-tenancy support
 */
export const detectSchoolFromDomain = (): string => {
  const hostname = window.location.hostname;
  
  // Default school ID mapping
  // In production, this would be fetched from a configuration API
  const schoolMapping: Record<string, string> = {
    'default': 'bbe68d9f-b5b4-481e-81d9-0766f4e030da', // Albari Model Schools
    'albari-exam-hub.vercel.app': 'bbe68d9f-b5b4-481e-81d9-0766f4e030da',
    'localhost': 'bbe68d9f-b5b4-481e-81d9-0766f4e030da',
    '127.0.0.1': 'bbe68d9f-b5b4-481e-81d9-0766f4e030da',
    // Add other school subdomains as needed
    // 'kings-Group of Schools.example.com': 'd27769ed-a00d-40c7-aa15-76823f3a4143',
  };
  
  return schoolMapping[hostname] || schoolMapping['default'];
};

/**
 * Gets the current school context
 * Returns null if no school can be detected
 */
export const getCurrentSchoolId = (): string | null => {
  try {
    return detectSchoolFromDomain();
  } catch (error) {
    console.error('Error detecting school:', error);
    return null;
  }
};
