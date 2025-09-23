export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  class?: string;
  subject?: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ClassAssignment {
  id: string;
  student_id: string;
  class_id: string;
  created_at: string;
}

export interface SubjectAssignment {
  id: string;
  user_id: string;
  subject_id: string;
  class_id?: string;
  created_at: string;
}

export interface AppSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}