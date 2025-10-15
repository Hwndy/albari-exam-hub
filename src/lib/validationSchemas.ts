import { z } from 'zod';

// Admission Form Validation Schema
export const admissionFormSchema = z.object({
  // Personal Information
  first_name: z.string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  last_name: z.string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  middle_name: z.string()
    .trim()
    .max(100, 'Middle name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]*$/, 'Middle name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  
  date_of_birth: z.date({
    required_error: 'Date of birth is required',
    invalid_type_error: 'Invalid date format',
  }).refine((date) => {
    const age = (new Date().getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return age >= 3 && age <= 25;
  }, 'Applicant must be between 3 and 25 years old'),
  
  gender: z.enum(['male', 'female'], {
    required_error: 'Gender is required',
  }),
  
  nationality: z.string()
    .trim()
    .min(1, 'Nationality is required')
    .max(100, 'Nationality must be less than 100 characters'),
  
  state_of_origin: z.string()
    .trim()
    .min(1, 'State of origin is required')
    .max(100, 'State must be less than 100 characters'),
  
  lga: z.string()
    .trim()
    .min(1, 'LGA is required')
    .max(100, 'LGA must be less than 100 characters'),
  
  // Contact Information
  address: z.string()
    .trim()
    .min(1, 'Address is required')
    .max(500, 'Address must be less than 500 characters'),
  
  city: z.string()
    .trim()
    .min(1, 'City is required')
    .max(100, 'City must be less than 100 characters'),
  
  state: z.string()
    .trim()
    .min(1, 'State is required')
    .max(100, 'State must be less than 100 characters'),
  
  postal_code: z.string()
    .trim()
    .regex(/^\d{6}$/, 'Postal code must be 6 digits')
    .optional()
    .or(z.literal('')),
  
  phone: z.string()
    .trim()
    .regex(/^(\+234|0)[789]\d{9}$/, 'Phone number must be a valid Nigerian number (e.g., 08012345678 or +2348012345678)'),
  
  email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  
  // Academic Information
  applying_for_class: z.string()
    .min(1, 'Please select a class'),
  
  previous_school: z.string()
    .trim()
    .max(200, 'School name must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  
  previous_class: z.string()
    .trim()
    .max(100, 'Previous class must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  
  reason_for_leaving: z.string()
    .trim()
    .max(500, 'Reason must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  
  // Parent/Guardian Information
  father_name: z.string()
    .trim()
    .max(200, 'Name must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  
  father_occupation: z.string()
    .trim()
    .max(200, 'Occupation must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  
  father_phone: z.string()
    .trim()
    .regex(/^(\+234|0)[789]\d{9}$|^$/, 'Phone number must be a valid Nigerian number')
    .optional()
    .or(z.literal('')),
  
  father_email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  
  mother_name: z.string()
    .trim()
    .max(200, 'Name must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  
  mother_occupation: z.string()
    .trim()
    .max(200, 'Occupation must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  
  mother_phone: z.string()
    .trim()
    .regex(/^(\+234|0)[789]\d{9}$|^$/, 'Phone number must be a valid Nigerian number')
    .optional()
    .or(z.literal('')),
  
  mother_email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  
  guardian_name: z.string()
    .trim()
    .max(200, 'Name must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  
  guardian_relationship: z.string()
    .trim()
    .max(100, 'Relationship must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  
  guardian_phone: z.string()
    .trim()
    .regex(/^(\+234|0)[789]\d{9}$|^$/, 'Phone number must be a valid Nigerian number')
    .optional()
    .or(z.literal('')),
  
  guardian_email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  
  // Medical Information
  blood_group: z.string()
    .trim()
    .max(10, 'Blood group must be less than 10 characters')
    .optional()
    .or(z.literal('')),
  
  allergies: z.string()
    .trim()
    .max(1000, 'Allergies description must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
  
  medical_conditions: z.string()
    .trim()
    .max(1000, 'Medical conditions must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
  
  emergency_contact_name: z.string()
    .trim()
    .min(1, 'Emergency contact name is required')
    .max(200, 'Name must be less than 200 characters'),
  
  emergency_contact_phone: z.string()
    .trim()
    .regex(/^(\+234|0)[789]\d{9}$/, 'Phone number must be a valid Nigerian number'),
  
  emergency_contact_relationship: z.string()
    .trim()
    .min(1, 'Relationship is required')
    .max(100, 'Relationship must be less than 100 characters'),
  
  // Declaration
  declaration_accepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the declaration to proceed' }),
  }),
});

export type AdmissionFormData = z.infer<typeof admissionFormSchema>;

// File validation helper
export const validateFile = (file: File | null, options: {
  required?: boolean;
  maxSize?: number; // in MB
  allowedTypes?: string[];
}): string | null => {
  const { required = false, maxSize = 5, allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'] } = options;
  
  if (!file) {
    return required ? 'This file is required' : null;
  }
  
  // Check file size
  const maxSizeBytes = maxSize * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File size must be less than ${maxSize}MB`;
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    const allowedExtensions = allowedTypes.map(type => type.split('/')[1]).join(', ');
    return `File must be one of: ${allowedExtensions}`;
  }
  
  return null;
};
