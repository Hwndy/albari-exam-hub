export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      academic_calendar: {
        Row: {
          classes_affected: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          is_recurring: boolean | null
          is_school_wide: boolean | null
          recurrence_pattern: Json | null
          school_id: string | null
          start_date: string
          title: string
        }
        Insert: {
          classes_affected?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type: string
          id?: string
          is_recurring?: boolean | null
          is_school_wide?: boolean | null
          recurrence_pattern?: Json | null
          school_id?: string | null
          start_date: string
          title: string
        }
        Update: {
          classes_affected?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          is_recurring?: boolean | null
          is_school_wide?: boolean | null
          recurrence_pattern?: Json | null
          school_id?: string | null
          start_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_calendar_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_applications: {
        Row: {
          address: Json
          admission_date: string | null
          admitted_to_class_id: string | null
          allergies: string | null
          application_date: string
          application_number: string
          applying_for_class_id: string | null
          blood_group: string | null
          combined_score: number | null
          created_at: string
          date_of_birth: string
          email: string
          first_name: string
          gender: string
          id: string
          last_name: string
          lga: string | null
          medical_conditions: string | null
          merit_rank: number | null
          middle_name: string | null
          nationality: string | null
          parent_guardian_info: Json
          phone: string
          previous_class: string | null
          previous_school: string | null
          religion: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          special_needs: string | null
          state_of_origin: string | null
          status: Database["public"]["Enums"]["admission_status"]
          student_id: string | null
          updated_at: string
        }
        Insert: {
          address: Json
          admission_date?: string | null
          admitted_to_class_id?: string | null
          allergies?: string | null
          application_date?: string
          application_number?: string
          applying_for_class_id?: string | null
          blood_group?: string | null
          combined_score?: number | null
          created_at?: string
          date_of_birth: string
          email: string
          first_name: string
          gender: string
          id?: string
          last_name: string
          lga?: string | null
          medical_conditions?: string | null
          merit_rank?: number | null
          middle_name?: string | null
          nationality?: string | null
          parent_guardian_info: Json
          phone: string
          previous_class?: string | null
          previous_school?: string | null
          religion?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          special_needs?: string | null
          state_of_origin?: string | null
          status?: Database["public"]["Enums"]["admission_status"]
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json
          admission_date?: string | null
          admitted_to_class_id?: string | null
          allergies?: string | null
          application_date?: string
          application_number?: string
          applying_for_class_id?: string | null
          blood_group?: string | null
          combined_score?: number | null
          created_at?: string
          date_of_birth?: string
          email?: string
          first_name?: string
          gender?: string
          id?: string
          last_name?: string
          lga?: string | null
          medical_conditions?: string | null
          merit_rank?: number | null
          middle_name?: string | null
          nationality?: string | null
          parent_guardian_info?: Json
          phone?: string
          previous_class?: string | null
          previous_school?: string | null
          religion?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          special_needs?: string | null
          state_of_origin?: string | null
          status?: Database["public"]["Enums"]["admission_status"]
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_applications_admitted_to_class_id_fkey"
            columns: ["admitted_to_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_applications_applying_for_class_id_fkey"
            columns: ["applying_for_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_applications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_documents: {
        Row: {
          application_id: string
          document_name: string
          document_type: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          school_id: string
          uploaded_at: string
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          application_id: string
          document_name: string
          document_type: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          school_id: string
          uploaded_at?: string
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          application_id?: string
          document_name?: string
          document_type?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          school_id?: string
          uploaded_at?: string
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "admission_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_documents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_exam_assignments: {
        Row: {
          application_id: string
          assigned_at: string
          assigned_by: string | null
          exam_id: string
          id: string
          school_id: string | null
        }
        Insert: {
          application_id: string
          assigned_at?: string
          assigned_by?: string | null
          exam_id: string
          id?: string
          school_id?: string | null
        }
        Update: {
          application_id?: string
          assigned_at?: string
          assigned_by?: string | null
          exam_id?: string
          id?: string
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_exam_assignments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "admission_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_exam_assignments_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_exam_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_interviews: {
        Row: {
          aggregate_score: number | null
          application_id: string
          created_at: string
          feedback: string | null
          id: string
          interview_type: string
          interviewer_id: string | null
          location: string | null
          panel_decision: string | null
          scheduled_date: string
          school_id: string
          score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          aggregate_score?: number | null
          application_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          interview_type?: string
          interviewer_id?: string | null
          location?: string | null
          panel_decision?: string | null
          scheduled_date: string
          school_id: string
          score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          aggregate_score?: number | null
          application_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          interview_type?: string
          interviewer_id?: string | null
          location?: string | null
          panel_decision?: string | null
          scheduled_date?: string
          school_id?: string
          score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "admission_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_interviews_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_offers: {
        Row: {
          acceptance_deadline: string
          acceptance_fee: number
          acceptance_token: string | null
          accepted_at: string | null
          application_id: string
          created_at: string
          declined_at: string | null
          id: string
          offer_letter_url: string | null
          offered_class_id: string | null
          school_id: string
          status: string
          updated_at: string
        }
        Insert: {
          acceptance_deadline: string
          acceptance_fee: number
          acceptance_token?: string | null
          accepted_at?: string | null
          application_id: string
          created_at?: string
          declined_at?: string | null
          id?: string
          offer_letter_url?: string | null
          offered_class_id?: string | null
          school_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          acceptance_deadline?: string
          acceptance_fee?: number
          acceptance_token?: string | null
          accepted_at?: string | null
          application_id?: string
          created_at?: string
          declined_at?: string | null
          id?: string
          offer_letter_url?: string | null
          offered_class_id?: string | null
          school_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_offers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "admission_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_offers_offered_class_id_fkey"
            columns: ["offered_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_offers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_payments: {
        Row: {
          amount: number
          application_id: string
          created_at: string
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_type: string
          school_id: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          application_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_type?: string
          school_id: string
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          application_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_type?: string
          school_id?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_payments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "admission_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_sessions: {
        Row: {
          academic_year: string
          application_fee: number
          classes_open: Json
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          max_applicants: number | null
          required_documents: Json
          school_id: string | null
          session_name: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          application_fee: number
          classes_open?: Json
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          max_applicants?: number | null
          required_documents?: Json
          school_id?: string | null
          session_name: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          application_fee?: number
          classes_open?: Json
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          max_applicants?: number | null
          required_documents?: Json
          school_id?: string | null
          session_name?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_workflow_logs: {
        Row: {
          application_id: string
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["admission_status"] | null
          id: string
          notes: string | null
          school_id: string
          to_status: Database["public"]["Enums"]["admission_status"]
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["admission_status"] | null
          id?: string
          notes?: string | null
          school_id: string
          to_status: Database["public"]["Enums"]["admission_status"]
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["admission_status"] | null
          id?: string
          notes?: string | null
          school_id?: string
          to_status?: Database["public"]["Enums"]["admission_status"]
        }
        Relationships: [
          {
            foreignKeyName: "admission_workflow_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "admission_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_workflow_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          attachments: Json | null
          class_ids: string[] | null
          content: string
          created_at: string | null
          created_by: string | null
          expire_date: string | null
          id: string
          is_published: boolean | null
          priority: string | null
          publish_date: string | null
          school_id: string
          target_audience: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          class_ids?: string[] | null
          content: string
          created_at?: string | null
          created_by?: string | null
          expire_date?: string | null
          id?: string
          is_published?: boolean | null
          priority?: string | null
          publish_date?: string | null
          school_id: string
          target_audience?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          class_ids?: string[] | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          expire_date?: string | null
          id?: string
          is_published?: boolean | null
          priority?: string | null
          publish_date?: string | null
          school_id?: string
          target_audience?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      assessment_types: {
        Row: {
          class_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          school_id: string | null
          subject_id: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          school_id?: string | null
          subject_id?: string | null
          updated_at?: string
          weight?: number
        }
        Update: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          school_id?: string | null
          subject_id?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_types_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_types_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_types_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          assessment_type_id: string
          class_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          max_score: number
          school_id: string | null
          subject_id: string
          teacher_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assessment_type_id: string
          class_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          max_score: number
          school_id?: string | null
          subject_id: string
          teacher_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assessment_type_id?: string
          class_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          max_score?: number
          school_id?: string | null
          subject_id?: string
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_assessment_type_id_fkey"
            columns: ["assessment_type_id"]
            isOneToOne: false
            referencedRelation: "assessment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          class_id: string | null
          created_at: string | null
          date: string | null
          end_time: string | null
          id: string
          period_number: number | null
          school_id: string | null
          start_time: string | null
          status: string | null
          subject_id: string | null
          teacher_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          date?: string | null
          end_time?: string | null
          id?: string
          period_number?: number | null
          school_id?: string | null
          start_time?: string | null
          status?: string | null
          subject_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          date?: string | null
          end_time?: string | null
          id?: string
          period_number?: number | null
          school_id?: string | null
          start_time?: string | null
          status?: string | null
          subject_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_summary: {
        Row: {
          academic_year: string
          class_id: string | null
          created_at: string | null
          days_absent: number | null
          days_present: number | null
          days_school_opened: number | null
          id: string
          school_id: string | null
          student_id: string
          term: string
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          class_id?: string | null
          created_at?: string | null
          days_absent?: number | null
          days_present?: number | null
          days_school_opened?: number | null
          id?: string
          school_id?: string | null
          student_id: string
          term: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          class_id?: string | null
          created_at?: string | null
          days_absent?: number | null
          days_present?: number | null
          days_school_opened?: number | null
          id?: string
          school_id?: string | null
          student_id?: string
          term?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_summary_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_summary_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_summary_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      book_issues: {
        Row: {
          book_id: string | null
          created_at: string | null
          due_date: string | null
          fine_amount: number | null
          id: string
          issued_by: string | null
          issued_date: string | null
          returned_date: string | null
          school_id: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          book_id?: string | null
          created_at?: string | null
          due_date?: string | null
          fine_amount?: number | null
          id?: string
          issued_by?: string | null
          issued_date?: string | null
          returned_date?: string | null
          school_id?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          book_id?: string | null
          created_at?: string | null
          due_date?: string | null
          fine_amount?: number | null
          id?: string
          issued_by?: string | null
          issued_date?: string | null
          returned_date?: string | null
          school_id?: string | null
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_issues_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "library_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_issues_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_issues_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_assignments: {
        Row: {
          class_id: string
          created_at: string
          id: string
          school_id: string | null
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          school_id?: string | null
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          school_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      class_timetables: {
        Row: {
          class_id: string | null
          created_at: string | null
          day_of_week: number
          id: string
          notes: string | null
          period_id: string | null
          room_id: string | null
          school_id: string | null
          subject_id: string | null
          teacher_id: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          day_of_week: number
          id?: string
          notes?: string | null
          period_id?: string | null
          room_id?: string | null
          school_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          day_of_week?: number
          id?: string
          notes?: string | null
          period_id?: string | null
          room_id?: string | null
          school_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_timetables_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_timetables_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_timetables_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_timetables_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_timetables_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_timetables_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "timetable_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          school_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          application_id: string | null
          created_at: string | null
          email_type: string
          error_message: string | null
          id: string
          recipient_email: string
          resend_id: string | null
          retry_count: number | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          recipient_email: string
          resend_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          resend_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "admission_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          created_at: string
          exam_id: string | null
          id: string
          points: number
          question_id: string | null
          question_order: number
          school_id: string | null
        }
        Insert: {
          created_at?: string
          exam_id?: string | null
          id?: string
          points?: number
          question_id?: string | null
          question_order: number
          school_id?: string | null
        }
        Update: {
          created_at?: string
          exam_id?: string | null
          id?: string
          points?: number
          question_id?: string | null
          question_order?: number
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sessions: {
        Row: {
          created_at: string
          current_question_index: number | null
          ended_at: string | null
          exam_id: string | null
          id: string
          ip_address: unknown
          max_score: number | null
          passed: boolean | null
          percentage: number | null
          school_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          student_id: string
          time_remaining_seconds: number | null
          total_score: number | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          current_question_index?: number | null
          ended_at?: string | null
          exam_id?: string | null
          id?: string
          ip_address?: unknown
          max_score?: number | null
          passed?: boolean | null
          percentage?: number | null
          school_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          student_id: string
          time_remaining_seconds?: number | null
          total_score?: number | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          current_question_index?: number | null
          ended_at?: string | null
          exam_id?: string | null
          id?: string
          ip_address?: unknown
          max_score?: number | null
          passed?: boolean | null
          percentage?: number | null
          school_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          student_id?: string
          time_remaining_seconds?: number | null
          total_score?: number | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_exam_sessions_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exams: {
        Row: {
          allow_question_flagging: boolean
          allow_review: boolean
          class_id: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          end_date: string | null
          exam_category: string | null
          id: string
          instructions: string | null
          pass_mark: number
          question_pool_size: number | null
          questions_per_student: number | null
          randomize_questions: boolean
          school_id: string | null
          sequential_navigation: boolean
          show_results_immediately: boolean
          shuffle_answers: boolean
          start_date: string | null
          status: Database["public"]["Enums"]["exam_status"]
          subject_id: string | null
          title: string
          total_questions: number
          updated_at: string
        }
        Insert: {
          allow_question_flagging?: boolean
          allow_review?: boolean
          class_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          end_date?: string | null
          exam_category?: string | null
          id?: string
          instructions?: string | null
          pass_mark?: number
          question_pool_size?: number | null
          questions_per_student?: number | null
          randomize_questions?: boolean
          school_id?: string | null
          sequential_navigation?: boolean
          show_results_immediately?: boolean
          shuffle_answers?: boolean
          start_date?: string | null
          status?: Database["public"]["Enums"]["exam_status"]
          subject_id?: string | null
          title: string
          total_questions?: number
          updated_at?: string
        }
        Update: {
          allow_question_flagging?: boolean
          allow_review?: boolean
          class_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          end_date?: string | null
          exam_category?: string | null
          id?: string
          instructions?: string | null
          pass_mark?: number
          question_pool_size?: number | null
          questions_per_student?: number | null
          randomize_questions?: boolean
          school_id?: string | null
          sequential_navigation?: boolean
          show_results_immediately?: boolean
          shuffle_answers?: boolean
          start_date?: string | null
          status?: Database["public"]["Enums"]["exam_status"]
          subject_id?: string | null
          title?: string
          total_questions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_installment_plans: {
        Row: {
          created_at: string | null
          created_by: string | null
          fee_structure_id: string | null
          id: string
          number_of_installments: number
          school_id: string | null
          start_date: string
          status: string | null
          student_id: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          fee_structure_id?: string | null
          id?: string
          number_of_installments: number
          school_id?: string | null
          start_date: string
          status?: string | null
          student_id: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          fee_structure_id?: string | null
          id?: string
          number_of_installments?: number
          school_id?: string | null
          start_date?: string
          status?: string | null
          student_id?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_installment_plans_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_installment_plans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_installment_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_installments: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          id: string
          installment_number: number
          paid_amount: number | null
          paid_at: string | null
          payment_id: string | null
          plan_id: string | null
          school_id: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          id?: string
          installment_number: number
          paid_amount?: number | null
          paid_at?: string | null
          payment_id?: string | null
          plan_id?: string | null
          school_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          paid_amount?: number | null
          paid_at?: string | null
          payment_id?: string | null
          plan_id?: string | null
          school_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_installments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "fee_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_installments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "fee_installment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_installments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount_paid: number
          created_at: string | null
          created_by: string | null
          fee_structure_id: string | null
          id: string
          payment_date: string | null
          payment_method: string | null
          receipt_number: string | null
          school_id: string | null
          status: string | null
          student_id: string | null
          transaction_id: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          created_by?: string | null
          fee_structure_id?: string | null
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          school_id?: string | null
          status?: string | null
          student_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          created_by?: string | null
          fee_structure_id?: string | null
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          school_id?: string | null
          status?: string | null
          student_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_reminder_logs: {
        Row: {
          error_message: string | null
          fee_structure_id: string | null
          id: string
          installment_id: string | null
          reminder_type: string
          school_id: string | null
          sent_at: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          error_message?: string | null
          fee_structure_id?: string | null
          id?: string
          installment_id?: string | null
          reminder_type: string
          school_id?: string | null
          sent_at?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          error_message?: string | null
          fee_structure_id?: string | null
          id?: string
          installment_id?: string | null
          reminder_type?: string
          school_id?: string | null
          sent_at?: string | null
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_reminder_logs_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_reminder_logs_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "fee_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_reminder_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_reminder_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_year: string
          amount: number
          class_id: string | null
          created_at: string | null
          due_date: string | null
          fee_type: string
          id: string
          is_mandatory: boolean | null
          school_id: string | null
        }
        Insert: {
          academic_year: string
          amount: number
          class_id?: string | null
          created_at?: string | null
          due_date?: string | null
          fee_type: string
          id?: string
          is_mandatory?: boolean | null
          school_id?: string | null
        }
        Update: {
          academic_year?: string
          amount?: number
          class_id?: string | null
          created_at?: string | null
          due_date?: string | null
          fee_type?: string
          id?: string
          is_mandatory?: boolean | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery: {
        Row: {
          alt_text: string | null
          category: string
          created_at: string
          created_by: string
          description: string | null
          display_order: number
          id: string
          image_url: string
          is_featured: boolean
          school_id: string | null
          title: string
        }
        Insert: {
          alt_text?: string | null
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number
          id?: string
          image_url: string
          is_featured?: boolean
          school_id?: string | null
          title: string
        }
        Update: {
          alt_text?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string
          is_featured?: boolean
          school_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_comments: {
        Row: {
          academic_year: string
          class_id: string
          comment: string
          created_at: string
          created_by: string | null
          id: string
          school_id: string | null
          student_id: string
          subject_id: string
          term: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          class_id: string
          comment: string
          created_at?: string
          created_by?: string | null
          id?: string
          school_id?: string | null
          student_id: string
          subject_id: string
          term: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_id?: string
          comment?: string
          created_at?: string
          created_by?: string | null
          id?: string
          school_id?: string | null
          student_id?: string
          subject_id?: string
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_comments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_comments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_comments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_comments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      gradebook_entries: {
        Row: {
          academic_year: string | null
          assessment_date: string | null
          assessment_name: string
          assessment_type: string
          class_id: string | null
          created_at: string | null
          exam_score: number | null
          grade: string | null
          id: string
          max_score: number
          obtained_score: number | null
          remarks: string | null
          school_id: string | null
          student_id: string | null
          subject_id: string | null
          teacher_id: string | null
          term: string | null
          test1_score: number | null
          test2_score: number | null
        }
        Insert: {
          academic_year?: string | null
          assessment_date?: string | null
          assessment_name: string
          assessment_type: string
          class_id?: string | null
          created_at?: string | null
          exam_score?: number | null
          grade?: string | null
          id?: string
          max_score: number
          obtained_score?: number | null
          remarks?: string | null
          school_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          term?: string | null
          test1_score?: number | null
          test2_score?: number | null
        }
        Update: {
          academic_year?: string | null
          assessment_date?: string | null
          assessment_name?: string
          assessment_type?: string
          class_id?: string | null
          created_at?: string | null
          exam_score?: number | null
          grade?: string | null
          id?: string
          max_score?: number
          obtained_score?: number | null
          remarks?: string | null
          school_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          term?: string | null
          test1_score?: number | null
          test2_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gradebook_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradebook_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradebook_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradebook_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          assessment_id: string
          created_at: string
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          school_id: string | null
          score: number
          student_id: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          school_id?: string | null
          score: number
          student_id: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          school_id?: string | null
          score?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_scales: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          scale_data: Json
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          scale_data: Json
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          scale_data?: Json
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grading_scales_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_feedback: {
        Row: {
          comments: string | null
          created_at: string
          id: string
          interview_id: string
          panel_member_id: string
          ratings: Json
          recommendation: string | null
          school_id: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          id?: string
          interview_id: string
          panel_member_id: string
          ratings?: Json
          recommendation?: string | null
          school_id?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          id?: string
          interview_id?: string
          panel_member_id?: string
          ratings?: Json
          recommendation?: string | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_feedback_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "admission_interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_feedback_panel_member_id_fkey"
            columns: ["panel_member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "interview_feedback_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_panels: {
        Row: {
          assigned_at: string
          id: string
          interview_id: string
          interviewer_id: string
          role: string | null
          school_id: string | null
        }
        Insert: {
          assigned_at?: string
          id?: string
          interview_id: string
          interviewer_id: string
          role?: string | null
          school_id?: string | null
        }
        Update: {
          assigned_at?: string
          id?: string
          interview_id?: string
          interviewer_id?: string
          role?: string | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_panels_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "admission_interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_panels_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "interview_panels_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      library_books: {
        Row: {
          author: string | null
          available_copies: number | null
          category: string | null
          created_at: string | null
          id: string
          isbn: string | null
          location: string | null
          publisher: string | null
          school_id: string | null
          title: string
          total_copies: number | null
        }
        Insert: {
          author?: string | null
          available_copies?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          isbn?: string | null
          location?: string | null
          publisher?: string | null
          school_id?: string | null
          title: string
          total_copies?: number | null
        }
        Update: {
          author?: string | null
          available_copies?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          isbn?: string | null
          location?: string | null
          publisher?: string | null
          school_id?: string | null
          title?: string
          total_copies?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "library_books_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string
          event_date: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          is_published: boolean
          published_at: string | null
          school_id: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by: string
          event_date?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          school_id?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string
          event_date?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          school_id?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_articles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          recipient_type: string | null
          recipients: Json | null
          scheduled_at: string | null
          school_id: string | null
          sent_at: string | null
          status: string | null
          template_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          recipient_type?: string | null
          recipients?: Json | null
          scheduled_at?: string | null
          school_id?: string | null
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          recipient_type?: string | null
          recipients?: Json | null
          scheduled_at?: string | null
          school_id?: string | null
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          school_id: string | null
          subject: string | null
          type: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          school_id?: string | null
          subject?: string | null
          type: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          school_id?: string | null
          subject?: string | null
          type?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          address: Json | null
          created_at: string | null
          id: string
          occupation: string | null
          phone_primary: string | null
          phone_secondary: string | null
          school_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          workplace: string | null
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          id?: string
          occupation?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          school_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          workplace?: string | null
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          id?: string
          occupation?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          school_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          workplace?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          updated_at: string
          used: boolean
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          updated_at?: string
          used?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          updated_at?: string
          used?: boolean
        }
        Relationships: []
      }
      paystack_webhooks: {
        Row: {
          created_at: string
          error_message: string | null
          event_data: Json
          event_type: string
          id: string
          processed: boolean
          processed_at: string | null
          reference: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_data: Json
          event_type: string
          id?: string
          processed?: boolean
          processed_at?: string | null
          reference?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          processed?: boolean
          processed_at?: string | null
          reference?: string | null
        }
        Relationships: []
      }
      periods: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          is_teaching_period: boolean | null
          period_name: string | null
          period_number: number
          period_type: string | null
          school_id: string | null
          start_time: string
          template_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          is_teaching_period?: boolean | null
          period_name?: string | null
          period_number: number
          period_type?: string | null
          school_id?: string | null
          start_time: string
          template_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          is_teaching_period?: boolean | null
          period_name?: string | null
          period_number?: number
          period_type?: string | null
          school_id?: string | null
          start_time?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "periods_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periods_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "timetable_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          school_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          school_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          school_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_history: {
        Row: {
          academic_year: string
          created_at: string | null
          from_class_id: string | null
          id: string
          notes: string | null
          promoted_at: string | null
          promoted_by: string | null
          promotion_type: string
          school_id: string | null
          student_id: string
          to_class_id: string | null
        }
        Insert: {
          academic_year: string
          created_at?: string | null
          from_class_id?: string | null
          id?: string
          notes?: string | null
          promoted_at?: string | null
          promoted_by?: string | null
          promotion_type: string
          school_id?: string | null
          student_id: string
          to_class_id?: string | null
        }
        Update: {
          academic_year?: string
          created_at?: string | null
          from_class_id?: string | null
          id?: string
          notes?: string | null
          promoted_at?: string | null
          promoted_by?: string | null
          promotion_type?: string
          school_id?: string | null
          student_id?: string
          to_class_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_history_from_class_id_fkey"
            columns: ["from_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_history_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_history_to_class_id_fkey"
            columns: ["to_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          school_id: string | null
          subscription: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          school_id?: string | null
          subscription: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          school_id?: string | null
          subscription?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      question_banks: {
        Row: {
          class_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          school_id: string | null
          subject_id: string | null
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          school_id?: string | null
          subject_id?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          school_id?: string | null
          subject_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_banks_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_banks_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_banks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      question_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          option_order: number
          option_text: string
          question_id: string | null
          school_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_order?: number
          option_text: string
          question_id?: string | null
          school_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_order?: number
          option_text?: string
          question_id?: string | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_options_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      question_responses: {
        Row: {
          answered_at: string | null
          id: string
          is_correct: boolean | null
          is_flagged: boolean | null
          points_earned: number | null
          question_id: string | null
          school_id: string | null
          selected_option_id: string | null
          session_id: string | null
          text_answer: string | null
          time_spent_seconds: number | null
        }
        Insert: {
          answered_at?: string | null
          id?: string
          is_correct?: boolean | null
          is_flagged?: boolean | null
          points_earned?: number | null
          question_id?: string | null
          school_id?: string | null
          selected_option_id?: string | null
          session_id?: string | null
          text_answer?: string | null
          time_spent_seconds?: number | null
        }
        Update: {
          answered_at?: string | null
          id?: string
          is_correct?: boolean | null
          is_flagged?: boolean | null
          points_earned?: number | null
          question_id?: string | null
          school_id?: string | null
          selected_option_id?: string | null
          session_id?: string | null
          text_answer?: string | null
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "question_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_responses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_responses_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          allow_multiple_correct: boolean | null
          class_id: string | null
          created_at: string
          created_by: string
          difficulty_level: Database["public"]["Enums"]["difficulty_level"]
          explanation: string | null
          formula_latex: string | null
          has_media: boolean
          id: string
          media_url: string | null
          points: number
          question_bank_id: string | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          school_id: string | null
          updated_at: string
        }
        Insert: {
          allow_multiple_correct?: boolean | null
          class_id?: string | null
          created_at?: string
          created_by: string
          difficulty_level?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          formula_latex?: string | null
          has_media?: boolean
          id?: string
          media_url?: string | null
          points?: number
          question_bank_id?: string | null
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          allow_multiple_correct?: boolean | null
          class_id?: string | null
          created_at?: string
          created_by?: string
          difficulty_level?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string | null
          formula_latex?: string | null
          has_media?: boolean
          id?: string
          media_url?: string | null
          points?: number
          question_bank_id?: string | null
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_question_bank_id_fkey"
            columns: ["question_bank_id"]
            isOneToOne: false
            referencedRelation: "question_banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action: string
          attempts: number | null
          blocked_until: string | null
          created_at: string | null
          id: string
          identifier: string
          updated_at: string | null
          window_start: string | null
        }
        Insert: {
          action: string
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier: string
          updated_at?: string | null
          window_start?: string | null
        }
        Update: {
          action?: string
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier?: string
          updated_at?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      report_card_comments: {
        Row: {
          academic_year: string
          class_id: string | null
          class_teacher_comment: string | null
          created_at: string | null
          head_teacher_comment: string | null
          id: string
          principal_comment: string | null
          school_id: string | null
          student_id: string
          term: string
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          class_id?: string | null
          class_teacher_comment?: string | null
          created_at?: string | null
          head_teacher_comment?: string | null
          id?: string
          principal_comment?: string | null
          school_id?: string | null
          student_id: string
          term: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          class_id?: string | null
          class_teacher_comment?: string | null
          created_at?: string | null
          head_teacher_comment?: string | null
          id?: string
          principal_comment?: string | null
          school_id?: string | null
          student_id?: string
          term?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_card_comments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_card_comments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_card_comments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number | null
          created_at: string | null
          facilities: Json | null
          id: string
          is_active: boolean | null
          room_name: string | null
          room_number: string
          room_type: string | null
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          facilities?: Json | null
          id?: string
          is_active?: boolean | null
          room_name?: string | null
          room_number: string
          room_type?: string | null
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          facilities?: Json | null
          id?: string
          is_active?: boolean | null
          room_name?: string | null
          room_number?: string
          room_type?: string | null
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_info: {
        Row: {
          category: string
          created_at: string
          id: string
          info_key: string
          info_value: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          info_key: string
          info_value: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          info_key?: string
          info_value?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          address: Json | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          primary_color: string | null
          registration_token: string | null
          secondary_color: string | null
          settings: Json | null
          subdomain: string
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          primary_color?: string | null
          registration_token?: string | null
          secondary_color?: string | null
          settings?: Json | null
          subdomain: string
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          registration_token?: string | null
          secondary_color?: string | null
          settings?: Json | null
          subdomain?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          id: string
          leave_type: string | null
          marked_by: string | null
          notes: string | null
          school_id: string | null
          staff_id: string
          status: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date: string
          id?: string
          leave_type?: string | null
          marked_by?: string | null
          notes?: string | null
          school_id?: string | null
          staff_id: string
          status: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          id?: string
          leave_type?: string | null
          marked_by?: string | null
          notes?: string | null
          school_id?: string | null
          staff_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_details: {
        Row: {
          bank_details: Json | null
          created_at: string | null
          department: string | null
          designation: string | null
          documents: Json | null
          emergency_contact: Json | null
          employee_id: string | null
          employment_type: string | null
          id: string
          join_date: string | null
          qualifications: Json | null
          salary: number | null
          school_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bank_details?: Json | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          documents?: Json | null
          emergency_contact?: Json | null
          employee_id?: string | null
          employment_type?: string | null
          id?: string
          join_date?: string | null
          qualifications?: Json | null
          salary?: number | null
          school_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bank_details?: Json | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          documents?: Json | null
          emergency_contact?: Json | null
          employee_id?: string | null
          employment_type?: string | null
          id?: string
          join_date?: string | null
          qualifications?: Json | null
          salary?: number | null
          school_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_details_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_attendance: {
        Row: {
          attendance_session_id: string | null
          id: string
          marked_at: string | null
          marked_by: string | null
          notes: string | null
          school_id: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          attendance_session_id?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          school_id?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          attendance_session_id?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          school_id?: string | null
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_attendance_session_id_fkey"
            columns: ["attendance_session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_id_cards: {
        Row: {
          academic_year: string
          card_number: string
          created_at: string
          expiry_date: string
          id: string
          issue_date: string
          school_id: string | null
          status: string | null
          student_id: string
        }
        Insert: {
          academic_year: string
          card_number: string
          created_at?: string
          expiry_date: string
          id?: string
          issue_date?: string
          school_id?: string | null
          status?: string | null
          student_id: string
        }
        Update: {
          academic_year?: string
          card_number?: string
          created_at?: string
          expiry_date?: string
          id?: string
          issue_date?: string
          school_id?: string | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_id_cards_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_parent_relationships: {
        Row: {
          access_level: string | null
          can_view_attendance: boolean | null
          can_view_fees: boolean | null
          can_view_grades: boolean | null
          created_at: string | null
          id: string
          is_emergency_contact: boolean | null
          is_primary_contact: boolean | null
          notification_preferences: Json | null
          parent_id: string | null
          relationship_type: string | null
          school_id: string | null
          student_id: string | null
        }
        Insert: {
          access_level?: string | null
          can_view_attendance?: boolean | null
          can_view_fees?: boolean | null
          can_view_grades?: boolean | null
          created_at?: string | null
          id?: string
          is_emergency_contact?: boolean | null
          is_primary_contact?: boolean | null
          notification_preferences?: Json | null
          parent_id?: string | null
          relationship_type?: string | null
          school_id?: string | null
          student_id?: string | null
        }
        Update: {
          access_level?: string | null
          can_view_attendance?: boolean | null
          can_view_fees?: boolean | null
          can_view_grades?: boolean | null
          created_at?: string | null
          id?: string
          is_emergency_contact?: boolean | null
          is_primary_contact?: boolean | null
          notification_preferences?: Json | null
          parent_id?: string | null
          relationship_type?: string | null
          school_id?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_parent_relationships_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parent_relationships_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parent_relationships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: Json | null
          admission_date: string | null
          admission_number: string
          age: number | null
          blood_group: string | null
          created_at: string | null
          date_of_birth: string | null
          emergency_contact: Json | null
          gender: string | null
          height: number | null
          id: string
          medical_info: Json | null
          registration_number: string | null
          school_id: string
          section: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          weight: number | null
        }
        Insert: {
          address?: Json | null
          admission_date?: string | null
          admission_number: string
          age?: number | null
          blood_group?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact?: Json | null
          gender?: string | null
          height?: number | null
          id?: string
          medical_info?: Json | null
          registration_number?: string | null
          school_id: string
          section?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          weight?: number | null
        }
        Update: {
          address?: Json | null
          admission_date?: string | null
          admission_number?: string
          age?: number | null
          blood_group?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact?: Json | null
          gender?: string | null
          height?: number | null
          id?: string
          medical_info?: Json | null
          registration_number?: string | null
          school_id?: string
          section?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_assignments: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          school_id: string | null
          subject_id: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          school_id?: string | null
          subject_id: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          school_id?: string | null
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          school_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_class_assignments: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          school_id: string | null
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          school_id?: string | null
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          school_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_class_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          image_url: string | null
          is_featured: boolean
          is_published: boolean
          name: string
          rating: number | null
          role: string
          school_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          name: string
          rating?: number | null
          role: string
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          name?: string
          rating?: number | null
          role?: string
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_templates: {
        Row: {
          academic_year: string
          created_at: string | null
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean | null
          name: string
          school_id: string | null
          term: string
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          created_at?: string | null
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          school_id?: string | null
          term: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          created_at?: string | null
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          school_id?: string | null
          term?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_templates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      website_pages: {
        Row: {
          content: string | null
          created_at: string
          created_by: string
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          school_id: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          school_id?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          school_id?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_pages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      website_sections: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          page_id: string | null
          school_id: string | null
          section_order: number
          section_type: string
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          page_id?: string | null
          school_id?: string | null
          section_order?: number
          section_type: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          page_id?: string | null
          school_id?: string | null
          section_order?: number
          section_type?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "website_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_sections_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      website_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          school_id: string | null
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          school_id?: string | null
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          school_id?: string | null
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_exam_score: {
        Args: { session_id_param: string }
        Returns: Json
      }
      check_timetable_conflict: {
        Args: {
          p_day_of_week: number
          p_exclude_id?: string
          p_period_id: string
          p_room_id: string
          p_teacher_id: string
          p_template_id: string
        }
        Returns: Json
      }
      cleanup_expired_otps: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      create_super_admin: {
        Args: { admin_user_id: string }
        Returns: undefined
      }
      create_teacher_class_assignments: {
        Args: { p_class_ids: string[]; p_teacher_id: string }
        Returns: undefined
      }
      create_user_with_profile: {
        Args: {
          user_email: string
          user_full_name: string
          user_password: string
          user_role: string
        }
        Returns: Json
      }
      delete_user_profile: { Args: { user_id_param: string }; Returns: Json }
      get_application_tracking: {
        Args: { p_app_no: string; p_email: string }
        Returns: Json
      }
      get_current_user_role: { Args: never; Returns: string }
      get_user_email: { Args: never; Returns: string }
      get_user_school_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      interview_exists: { Args: { interview_uuid: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_admin_v2: { Args: never; Returns: boolean }
      is_same_school: { Args: { target_school_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_teacher: { Args: never; Returns: boolean }
      is_teacher_v2: { Args: never; Returns: boolean }
      is_user_super_admin: { Args: { check_user_id: string }; Returns: boolean }
      submit_admission_application: { Args: { payload: Json }; Returns: Json }
      transition_admission_status: {
        Args: {
          p_application_id: string
          p_new_status: Database["public"]["Enums"]["admission_status"]
          p_notes?: string
        }
        Returns: Json
      }
    }
    Enums: {
      admission_status:
        | "submitted"
        | "under_review"
        | "interview_scheduled"
        | "accepted"
        | "rejected"
        | "payment_pending"
        | "enrolled"
        | "withdrawn"
      app_role: "admin" | "teacher" | "student" | "parent"
      difficulty_level: "easy" | "medium" | "hard"
      exam_status: "draft" | "published" | "archived"
      question_type: "mcq" | "true_false" | "fill_blank" | "diagram"
      session_status: "not_started" | "in_progress" | "completed" | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admission_status: [
        "submitted",
        "under_review",
        "interview_scheduled",
        "accepted",
        "rejected",
        "payment_pending",
        "enrolled",
        "withdrawn",
      ],
      app_role: ["admin", "teacher", "student", "parent"],
      difficulty_level: ["easy", "medium", "hard"],
      exam_status: ["draft", "published", "archived"],
      question_type: ["mcq", "true_false", "fill_blank", "diagram"],
      session_status: ["not_started", "in_progress", "completed", "expired"],
    },
  },
} as const
