export const STUDENT_DEFAULT_PASSWORD = 'password123';

export const STUDENT_EMAIL_DOMAIN = 'albari.com.ng';

export const generateStudentEmail = (fullName: string, suffix = 1): string => {
  const localPart = fullName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join('.');

  if (!localPart) return '';
  const uniquePart = suffix > 1 ? `.${suffix}` : '';
  return `${localPart}${uniquePart}@${STUDENT_EMAIL_DOMAIN}`;
};