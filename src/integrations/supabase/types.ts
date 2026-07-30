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
          start_date?: string
          title?: string
        }
        Relationships: []
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
          login_email: string | null
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
          login_email?: string | null
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
          login_email?: string | null
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
            foreignKeyName: "admission_applications_admitted_to_class_id_fkey"
            columns: ["admitted_to_class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "admission_applications_applying_for_class_id_fkey"
            columns: ["applying_for_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_applications_applying_for_class_id_fkey"
            columns: ["applying_for_class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
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
        ]
      }
      admission_exam_assignments: {
        Row: {
          application_id: string
          assigned_at: string
          assigned_by: string | null
          comment: string | null
          exam_id: string
          id: string
          max_score: number | null
          percentage: number | null
          recorded_by: string | null
          resit_date: string | null
          resit_sent_at: string | null
          resit_venue: string | null
          result_sent_at: string | null
          result_status: string
          score: number | null
          source: string
          subject_scores: Json
          updated_at: string
        }
        Insert: {
          application_id: string
          assigned_at?: string
          assigned_by?: string | null
          comment?: string | null
          exam_id: string
          id?: string
          max_score?: number | null
          percentage?: number | null
          recorded_by?: string | null
          resit_date?: string | null
          resit_sent_at?: string | null
          resit_venue?: string | null
          result_sent_at?: string | null
          result_status?: string
          score?: number | null
          source?: string
          subject_scores?: Json
          updated_at?: string
        }
        Update: {
          application_id?: string
          assigned_at?: string
          assigned_by?: string | null
          comment?: string | null
          exam_id?: string
          id?: string
          max_score?: number | null
          percentage?: number | null
          recorded_by?: string | null
          resit_date?: string | null
          resit_sent_at?: string | null
          resit_venue?: string | null
          result_sent_at?: string | null
          result_status?: string
          score?: number | null
          source?: string
          subject_scores?: Json
          updated_at?: string
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
            foreignKeyName: "admission_offers_offered_class_id_fkey"
            columns: ["offered_class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
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
          is_current: boolean
          max_applicants: number | null
          required_documents: Json
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
          is_current?: boolean
          max_applicants?: number | null
          required_documents?: Json
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
          is_current?: boolean
          max_applicants?: number | null
          required_documents?: Json
          session_name?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      admission_workflow_logs: {
        Row: {
          application_id: string
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["admission_status"] | null
          id: string
          notes: string | null
          to_status: Database["public"]["Enums"]["admission_status"]
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["admission_status"] | null
          id?: string
          notes?: string | null
          to_status: Database["public"]["Enums"]["admission_status"]
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["admission_status"] | null
          id?: string
          notes?: string | null
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
          target_audience?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
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
            foreignKeyName: "assessment_types_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
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
            foreignKeyName: "assessments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
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
      asset_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      asset_movements: {
        Row: {
          asset_id: string
          from_location: string | null
          from_staff: string | null
          id: string
          moved_at: string
          moved_by: string | null
          note: string | null
          to_location: string | null
          to_staff: string | null
        }
        Insert: {
          asset_id: string
          from_location?: string | null
          from_staff?: string | null
          id?: string
          moved_at?: string
          moved_by?: string | null
          note?: string | null
          to_location?: string | null
          to_staff?: string | null
        }
        Update: {
          asset_id?: string
          from_location?: string | null
          from_staff?: string | null
          id?: string
          moved_at?: string
          moved_by?: string | null
          note?: string | null
          to_location?: string | null
          to_staff?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_movements_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_tag: string
          assigned_to_staff: string | null
          category_id: string | null
          condition: string
          cost: number | null
          created_at: string
          id: string
          location: string | null
          name: string
          notes: string | null
          purchased_on: string | null
          serial_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          asset_tag: string
          assigned_to_staff?: string | null
          category_id?: string | null
          condition?: string
          cost?: number | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          purchased_on?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          asset_tag?: string
          assigned_to_staff?: string | null
          category_id?: string | null
          condition?: string
          cost?: number | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          purchased_on?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          attachment_url: string | null
          content: string | null
          created_at: string
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          score: number | null
          student_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          student_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          student_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "v_assignment_completion"
            referencedColumns: ["assignment_id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          attachment_url: string | null
          class_id: string
          created_at: string
          due_date: string | null
          id: string
          instructions: string | null
          is_published: boolean
          max_score: number | null
          subject_id: string | null
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          class_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean
          max_score?: number | null
          subject_id?: string | null
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          class_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean
          max_score?: number | null
          subject_id?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "assignments_subject_id_fkey"
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
            foreignKeyName: "attendance_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
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
            foreignKeyName: "attendance_summary_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
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
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: string
          metadata: Json | null
          row_id: string | null
          table_name: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          row_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          row_id?: string | null
          table_name?: string | null
        }
        Relationships: []
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
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
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
            foreignKeyName: "class_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
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
            foreignKeyName: "class_timetables_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
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
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
        }
        Insert: {
          created_at?: string
          exam_id?: string | null
          id?: string
          points?: number
          question_id?: string | null
          question_order: number
        }
        Update: {
          created_at?: string
          exam_id?: string | null
          id?: string
          points?: number
          question_id?: string | null
          question_order?: number
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
          assessment_category: string | null
          class_id: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          end_date: string | null
          exam_category: string | null
          exam_mode: string
          id: string
          instructions: string | null
          paper_subjects: Json
          pass_mark: number
          question_pool_size: number | null
          questions_per_student: number | null
          randomize_questions: boolean
          sequential_navigation: boolean
          session_id: string | null
          show_results_immediately: boolean
          shuffle_answers: boolean
          start_date: string | null
          status: Database["public"]["Enums"]["exam_status"]
          subject_id: string | null
          term: string | null
          title: string
          total_questions: number
          updated_at: string
        }
        Insert: {
          allow_question_flagging?: boolean
          allow_review?: boolean
          assessment_category?: string | null
          class_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          end_date?: string | null
          exam_category?: string | null
          exam_mode?: string
          id?: string
          instructions?: string | null
          paper_subjects?: Json
          pass_mark?: number
          question_pool_size?: number | null
          questions_per_student?: number | null
          randomize_questions?: boolean
          sequential_navigation?: boolean
          session_id?: string | null
          show_results_immediately?: boolean
          shuffle_answers?: boolean
          start_date?: string | null
          status?: Database["public"]["Enums"]["exam_status"]
          subject_id?: string | null
          term?: string | null
          title: string
          total_questions?: number
          updated_at?: string
        }
        Update: {
          allow_question_flagging?: boolean
          allow_review?: boolean
          assessment_category?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          end_date?: string | null
          exam_category?: string | null
          exam_mode?: string
          id?: string
          instructions?: string | null
          paper_subjects?: Json
          pass_mark?: number
          question_pool_size?: number | null
          questions_per_student?: number | null
          randomize_questions?: boolean
          sequential_navigation?: boolean
          session_id?: string | null
          show_results_immediately?: boolean
          shuffle_answers?: boolean
          start_date?: string | null
          status?: Database["public"]["Enums"]["exam_status"]
          subject_id?: string | null
          term?: string | null
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
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "exams_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "admission_sessions"
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
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category_id: string | null
          created_at: string
          description: string | null
          expense_date: string
          id: string
          payee: string | null
          payment_method: string
          receipt_url: string | null
          recorded_by: string | null
          reference: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          payee?: string | null
          payment_method?: string
          receipt_url?: string | null
          recorded_by?: string | null
          reference?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          payee?: string | null
          payment_method?: string
          receipt_url?: string | null
          recorded_by?: string | null
          reference?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
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
        ]
      }
      fee_payments: {
        Row: {
          amount_paid: number
          created_at: string | null
          created_by: string | null
          fee_installment_id: string | null
          fee_structure_id: string | null
          id: string
          metadata: Json | null
          notes: string | null
          paid_at: string | null
          parent_user_id: string | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          receipt_number: string | null
          status: string | null
          student_id: string | null
          transaction_id: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          created_by?: string | null
          fee_installment_id?: string | null
          fee_structure_id?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          parent_user_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          receipt_number?: string | null
          status?: string | null
          student_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          created_by?: string | null
          fee_installment_id?: string | null
          fee_structure_id?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          parent_user_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          receipt_number?: string | null
          status?: string | null
          student_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_fee_installment_id_fkey"
            columns: ["fee_installment_id"]
            isOneToOne: false
            referencedRelation: "fee_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
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
          term: string | null
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
          term?: string | null
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
          term?: string | null
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
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
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
          title?: string
        }
        Relationships: []
      }
      grade_comments: {
        Row: {
          academic_year: string
          class_id: string
          comment: string
          created_at: string
          created_by: string | null
          id: string
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
            foreignKeyName: "grade_comments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
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
          session_id: string | null
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
          session_id?: string | null
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
          session_id?: string | null
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
            foreignKeyName: "gradebook_entries_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "gradebook_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "admission_sessions"
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
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          scale_data: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          scale_data?: Json
          updated_at?: string | null
        }
        Relationships: []
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
        }
        Insert: {
          comments?: string | null
          created_at?: string
          id?: string
          interview_id: string
          panel_member_id: string
          ratings?: Json
          recommendation?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          id?: string
          interview_id?: string
          panel_member_id?: string
          ratings?: Json
          recommendation?: string | null
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
        ]
      }
      interview_panels: {
        Row: {
          assigned_at: string
          id: string
          interview_id: string
          interviewer_id: string
          role: string | null
        }
        Insert: {
          assigned_at?: string
          id?: string
          interview_id: string
          interviewer_id: string
          role?: string | null
        }
        Update: {
          assigned_at?: string
          id?: string
          interview_id?: string
          interviewer_id?: string
          role?: string | null
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
        ]
      }
      job_openings: {
        Row: {
          apply_email: string
          closes_on: string | null
          created_at: string
          created_by: string | null
          department: string | null
          description: string
          employment_type: string
          id: string
          is_open: boolean
          location: string | null
          requirements: string | null
          title: string
          updated_at: string
        }
        Insert: {
          apply_email: string
          closes_on?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description: string
          employment_type?: string
          id?: string
          is_open?: boolean
          location?: string | null
          requirements?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          apply_email?: string
          closes_on?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string
          employment_type?: string
          id?: string
          is_open?: boolean
          location?: string | null
          requirements?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          approver_id: string | null
          created_at: string
          decided_at: string | null
          decision_notes: string | null
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          staff_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approver_id?: string | null
          created_at?: string
          decided_at?: string | null
          decision_notes?: string | null
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          staff_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approver_id?: string | null
          created_at?: string
          decided_at?: string | null
          decision_notes?: string | null
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          staff_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_notes: {
        Row: {
          attachment_url: string | null
          class_id: string
          content: string | null
          created_at: string
          id: string
          is_published: boolean
          session_id: string | null
          subject_id: string | null
          teacher_id: string
          term: string | null
          title: string
          updated_at: string
          week_number: number | null
        }
        Insert: {
          attachment_url?: string | null
          class_id: string
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          session_id?: string | null
          subject_id?: string | null
          teacher_id: string
          term?: string | null
          title: string
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          attachment_url?: string | null
          class_id?: string
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          session_id?: string | null
          subject_id?: string | null
          teacher_id?: string
          term?: string | null
          title?: string
          updated_at?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_notes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_notes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "lesson_notes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
          title?: string
          total_copies?: number | null
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          billing_cycle: string
          created_at: string
          days: Json
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          days?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          days?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      meal_subscriptions: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          plan_id: string
          start_date: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          plan_id: string
          start_date?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          plan_id?: string
          start_date?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_subscriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
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
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Relationships: [
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
          subject?: string | null
          type?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      other_revenue: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          payment_method: string
          recorded_by: string | null
          reference: string | null
          revenue_date: string
          source: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string
          recorded_by?: string | null
          reference?: string | null
          revenue_date?: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string
          recorded_by?: string | null
          reference?: string | null
          revenue_date?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "other_revenue_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "revenue_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          parent_user_id: string
          read_at: string | null
          sender_role: string
          sender_user_id: string
          student_id: string | null
          subject: string | null
          thread_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          parent_user_id: string
          read_at?: string | null
          sender_role: string
          sender_user_id: string
          student_id?: string | null
          subject?: string | null
          thread_id?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          parent_user_id?: string
          read_at?: string | null
          sender_role?: string
          sender_user_id?: string
          student_id?: string | null
          subject?: string | null
          thread_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      parents: {
        Row: {
          address: Json | null
          created_at: string | null
          id: string
          notification_preferences: Json
          occupation: string | null
          phone_primary: string | null
          phone_secondary: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          workplace: string | null
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          id?: string
          notification_preferences?: Json
          occupation?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          workplace?: string | null
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          id?: string
          notification_preferences?: Json
          occupation?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          workplace?: string | null
        }
        Relationships: []
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
      payroll_items: {
        Row: {
          allowances: Json
          basic_salary: number
          created_at: string
          deductions: Json
          gross_salary: number
          id: string
          net_pay: number
          notes: string | null
          paid_at: string | null
          period_id: string
          staff_id: string
          status: string
          updated_at: string
        }
        Insert: {
          allowances?: Json
          basic_salary?: number
          created_at?: string
          deductions?: Json
          gross_salary?: number
          id?: string
          net_pay?: number
          notes?: string | null
          paid_at?: string | null
          period_id: string
          staff_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          allowances?: Json
          basic_salary?: number
          created_at?: string
          deductions?: Json
          gross_salary?: number
          id?: string
          net_pay?: number
          notes?: string | null
          paid_at?: string | null
          period_id?: string
          staff_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          expense_id: string | null
          id: string
          notes: string | null
          period_month: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          expense_id?: string | null
          id?: string
          notes?: string | null
          period_month: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          expense_id?: string | null
          id?: string
          notes?: string | null
          period_month?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
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
          start_time?: string
          template_id?: string | null
        }
        Relationships: [
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
          must_change_password: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          must_change_password?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          must_change_password?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
            foreignKeyName: "promotion_history_from_class_id_fkey"
            columns: ["from_class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
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
          {
            foreignKeyName: "promotion_history_to_class_id_fkey"
            columns: ["to_class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          subscription: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          subscription: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          subscription?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      question_banks: {
        Row: {
          class_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
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
            foreignKeyName: "question_banks_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
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
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_order?: number
          option_text: string
          question_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_order?: number
          option_text?: string
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
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
          subject_id: string | null
          tags: string[] | null
          topic: string | null
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
          subject_id?: string | null
          tags?: string[] | null
          topic?: string | null
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
          subject_id?: string | null
          tags?: string[] | null
          topic?: string | null
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
            foreignKeyName: "questions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "questions_question_bank_id_fkey"
            columns: ["question_bank_id"]
            isOneToOne: false
            referencedRelation: "question_banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
            foreignKeyName: "report_card_comments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
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
      report_card_publications: {
        Row: {
          class_id: string
          id: string
          published_at: string
          published_by: string | null
          session_id: string
          student_id: string
          term: string
        }
        Insert: {
          class_id: string
          id?: string
          published_at?: string
          published_by?: string | null
          session_id: string
          student_id: string
          term: string
        }
        Update: {
          class_id?: string
          id?: string
          published_at?: string
          published_by?: string | null
          session_id?: string
          student_id?: string
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_card_publications_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_card_publications_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "report_card_publications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "admission_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_card_publications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      result_automation_settings: {
        Row: {
          above_max: number
          average_max: number
          below_max: number
          created_at: string
          id: string
          min_promotion_average: number
          principal_remark_above: string
          principal_remark_average: string
          principal_remark_below: string
          principal_remark_distinction: string
          show_parent_signature: boolean
          updated_at: string
        }
        Insert: {
          above_max?: number
          average_max?: number
          below_max?: number
          created_at?: string
          id?: string
          min_promotion_average?: number
          principal_remark_above?: string
          principal_remark_average?: string
          principal_remark_below?: string
          principal_remark_distinction?: string
          show_parent_signature?: boolean
          updated_at?: string
        }
        Update: {
          above_max?: number
          average_max?: number
          below_max?: number
          created_at?: string
          id?: string
          min_promotion_average?: number
          principal_remark_above?: string
          principal_remark_average?: string
          principal_remark_below?: string
          principal_remark_distinction?: string
          show_parent_signature?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      revenue_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
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
          updated_at?: string | null
        }
        Relationships: []
      }
      salary_components: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_active: boolean
          is_percentage: boolean
          kind: string
          name: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_percentage?: boolean
          kind?: string
          name: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_percentage?: boolean
          kind?: string
          name?: string
          staff_id?: string
          updated_at?: string
        }
        Relationships: []
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
          scan_direction: string | null
          scanned_at: string | null
          scanned_by: string | null
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
          scan_direction?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
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
          scan_direction?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          staff_id?: string
          status?: string
        }
        Relationships: []
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
          signature_url: string | null
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
          signature_url?: string | null
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
          signature_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_attendance: {
        Row: {
          attendance_session_id: string | null
          id: string
          marked_at: string | null
          marked_by: string | null
          notes: string | null
          scan_direction: string | null
          scanned_at: string | null
          scanned_by: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          attendance_session_id?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          scan_direction?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          attendance_session_id?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          scan_direction?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
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
          status?: string | null
          student_id?: string
        }
        Relationships: []
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
          linked_at: string
          notification_preferences: Json | null
          parent_id: string | null
          relationship_type: string | null
          student_id: string | null
          verified: boolean
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
          linked_at?: string
          notification_preferences?: Json | null
          parent_id?: string | null
          relationship_type?: string | null
          student_id?: string | null
          verified?: boolean
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
          linked_at?: string
          notification_preferences?: Json | null
          parent_id?: string | null
          relationship_type?: string | null
          student_id?: string | null
          verified?: boolean
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
            foreignKeyName: "student_parent_relationships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_qr_tokens: {
        Row: {
          id: string
          issued_at: string
          revoked_at: string | null
          student_id: string
          token: string
        }
        Insert: {
          id?: string
          issued_at?: string
          revoked_at?: string | null
          student_id: string
          token?: string
        }
        Update: {
          id?: string
          issued_at?: string
          revoked_at?: string | null
          student_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_qr_tokens_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_transport: {
        Row: {
          active: boolean
          created_at: string
          ended_on: string | null
          id: string
          route_id: string
          started_on: string
          stop_id: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          ended_on?: string | null
          id?: string
          route_id: string
          started_on?: string
          stop_id?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          ended_on?: string | null
          id?: string
          route_id?: string
          started_on?: string
          stop_id?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_transport_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "transport_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transport_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "transport_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transport_student_id_fkey"
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
          admission_number: string | null
          age: number | null
          archived_at: string | null
          archived_reason: string | null
          blood_group: string | null
          created_at: string | null
          date_of_birth: string | null
          emergency_contact: Json | null
          gender: string | null
          height: number | null
          id: string
          medical_info: Json | null
          photo_url: string | null
          registration_number: string | null
          section: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          weight: number | null
        }
        Insert: {
          address?: Json | null
          admission_date?: string | null
          admission_number?: string | null
          age?: number | null
          archived_at?: string | null
          archived_reason?: string | null
          blood_group?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact?: Json | null
          gender?: string | null
          height?: number | null
          id?: string
          medical_info?: Json | null
          photo_url?: string | null
          registration_number?: string | null
          section?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          weight?: number | null
        }
        Update: {
          address?: Json | null
          admission_date?: string | null
          admission_number?: string | null
          age?: number | null
          archived_at?: string | null
          archived_reason?: string | null
          blood_group?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact?: Json | null
          gender?: string | null
          height?: number | null
          id?: string
          medical_info?: Json | null
          photo_url?: string | null
          registration_number?: string | null
          section?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      subject_assignments: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          subject_id: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          subject_id: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
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
            foreignKeyName: "subject_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
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
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      teacher_class_assignments: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          teacher_id?: string
        }
        Relationships: []
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
          updated_at?: string
        }
        Relationships: []
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
          term?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transport_routes: {
        Row: {
          capacity: number
          created_at: string
          driver_name: string | null
          driver_phone: string | null
          id: string
          is_active: boolean
          monthly_fee: number
          name: string
          notes: string | null
          updated_at: string
          vehicle_reg: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          is_active?: boolean
          monthly_fee?: number
          name: string
          notes?: string | null
          updated_at?: string
          vehicle_reg?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          is_active?: boolean
          monthly_fee?: number
          name?: string
          notes?: string | null
          updated_at?: string
          vehicle_reg?: string | null
        }
        Relationships: []
      }
      transport_stops: {
        Row: {
          created_at: string
          dropoff_time: string | null
          id: string
          name: string
          pickup_time: string | null
          route_id: string
          stop_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dropoff_time?: string | null
          id?: string
          name: string
          pickup_time?: string | null
          route_id: string
          stop_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dropoff_time?: string | null
          id?: string
          name?: string
          pickup_time?: string | null
          route_id?: string
          stop_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "transport_routes"
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
      visitor_logs: {
        Row: {
          badge_no: string | null
          created_at: string
          full_name: string
          host_name: string | null
          id: string
          phone: string | null
          purpose: string | null
          signed_in_at: string
          signed_in_by: string | null
          signed_out_at: string | null
        }
        Insert: {
          badge_no?: string | null
          created_at?: string
          full_name: string
          host_name?: string | null
          id?: string
          phone?: string | null
          purpose?: string | null
          signed_in_at?: string
          signed_in_by?: string | null
          signed_out_at?: string | null
        }
        Update: {
          badge_no?: string | null
          created_at?: string
          full_name?: string
          host_name?: string | null
          id?: string
          phone?: string | null
          purpose?: string | null
          signed_in_at?: string
          signed_in_by?: string | null
          signed_out_at?: string | null
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
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      website_sections: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          page_id: string | null
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
        ]
      }
      website_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_admission_funnel: {
        Row: {
          count: number | null
          status: string | null
        }
        Relationships: []
      }
      v_assignment_completion: {
        Row: {
          assignment_id: string | null
          class_id: string | null
          class_name: string | null
          graded_count: number | null
          submitted_count: number | null
          title: string | null
          total_students: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "v_enrolment_by_class"
            referencedColumns: ["class_id"]
          },
        ]
      }
      v_attendance_trend: {
        Row: {
          absent: number | null
          day: string | null
          late: number | null
          present: number | null
          total: number | null
        }
        Relationships: []
      }
      v_enrolment_by_class: {
        Row: {
          class_id: string | null
          class_name: string | null
          student_count: number | null
        }
        Relationships: []
      }
      v_fee_collections_daily: {
        Row: {
          collected: number | null
          day: string | null
          payments: number | null
        }
        Relationships: []
      }
      v_student_term_scores: {
        Row: {
          class_id: string | null
          exam_score: number | null
          session_id: string | null
          student_id: string | null
          subject_id: string | null
          subject_position: number | null
          term: string | null
          test1: number | null
          test2: number | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_offer_by_token: {
        Args: { p_acceptance_token: string; p_decision: string }
        Returns: Json
      }
      admin_link_parent_to_student: {
        Args: {
          p_parent_user_id: string
          p_relationship_type?: string
          p_student_id: string
        }
        Returns: string
      }
      admin_unlink_parent: {
        Args: { p_relationship_id: string }
        Returns: undefined
      }
      attach_application_to_exam: {
        Args: { p_application_id: string; p_exam_id: string }
        Returns: string
      }
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
      expire_old_qr_tokens: { Args: never; Returns: number }
      get_admin_analytics: { Args: never; Returns: Json }
      get_application_documents: {
        Args: { p_application_id: string }
        Returns: {
          application_id: string
          document_name: string
          document_type: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          uploaded_at: string
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "admission_documents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_application_exam_results: {
        Args: { p_application_id: string }
        Returns: {
          assignment_id: string
          comment: string
          exam_id: string
          exam_mode: string
          exam_title: string
          max_score: number
          paper_subjects: Json
          percentage: number
          resit_date: string
          resit_sent_at: string
          resit_venue: string
          result_sent_at: string
          result_status: string
          score: number
          subject_scores: Json
        }[]
      }
      get_application_tracking: {
        Args: { p_app_no: string; p_email: string }
        Returns: Json
      }
      get_attendance_summary: {
        Args: { p_class_id?: string; p_end: string; p_start: string }
        Returns: Json
      }
      get_current_session: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_entrance_exam_results: {
        Args: { p_exam_id: string }
        Returns: {
          application_id: string
          application_number: string
          assignment_id: string
          comment: string
          email: string
          full_name: string
          max_score: number
          online_max_score: number
          online_percentage: number
          online_score: number
          percentage: number
          resit_date: string
          resit_sent_at: string
          resit_venue: string
          result_sent_at: string
          result_status: string
          score: number
          source: string
          status: string
          subject_scores: Json
        }[]
      }
      get_fees_dashboard: { Args: { p_class_id?: string }; Returns: Json }
      get_finance_summary: {
        Args: { p_end: string; p_start: string }
        Returns: Json
      }
      get_grade_for_score: { Args: { _score: number }; Returns: Json }
      get_offer_by_token: { Args: { p_token: string }; Returns: Json }
      get_or_create_scan_session: { Args: { p_date: string }; Returns: string }
      get_parent_children: {
        Args: never
        Returns: {
          admission_number: string
          can_view_attendance: boolean
          can_view_fees: boolean
          can_view_grades: boolean
          class_id: string
          class_name: string
          date_of_birth: string
          full_name: string
          gender: string
          relationship_id: string
          status: string
          student_id: string
        }[]
      }
      get_student_fee_summary: { Args: { _student_id: string }; Returns: Json }
      get_user_email: { Args: never; Returns: string }
      global_search: { Args: { q: string }; Returns: Json }
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
      is_my_parent_record: { Args: { _parent_id: string }; Returns: boolean }
      is_my_student_record: { Args: { _student_id: string }; Returns: boolean }
      is_parent_of_student: { Args: { _student_id: string }; Returns: boolean }
      is_teacher: { Args: never; Returns: boolean }
      is_teacher_v2: { Args: never; Returns: boolean }
      issue_student_qr: { Args: { p_student_id: string }; Returns: string }
      link_parent_to_student: {
        Args: {
          p_admission_number: string
          p_date_of_birth: string
          p_relationship_type?: string
        }
        Returns: Json
      }
      mark_entrance_result_sent: {
        Args: { p_assignment_id: string; p_kind: string }
        Returns: undefined
      }
      next_admission_number: { Args: never; Returns: string }
      record_scan_by_ref: {
        Args: { p_direction: string; p_ref: string }
        Returns: Json
      }
      record_staff_scan: {
        Args: { p_direction: string; p_ref: string }
        Returns: Json
      }
      record_student_scan: {
        Args: { p_direction: string; p_token: string }
        Returns: Json
      }
      resolve_scan_token: { Args: { p_token: string }; Returns: Json }
      save_entrance_exam_result:
        | {
            Args: {
              p_assignment_id: string
              p_comment: string
              p_max_score: number
              p_result_status: string
              p_score: number
              p_source?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_assignment_id: string
              p_comment: string
              p_max_score: number
              p_result_status: string
              p_score: number
              p_source?: string
              p_subject_scores?: Json
            }
            Returns: undefined
          }
      set_entrance_resit_details: {
        Args: {
          p_assignment_id: string
          p_resit_date: string
          p_resit_venue?: string
        }
        Returns: undefined
      }
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
