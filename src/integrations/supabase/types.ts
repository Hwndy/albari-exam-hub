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
            foreignKeyName: "class_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
          class_id: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          end_date: string | null
          id: string
          instructions: string | null
          pass_mark: number
          randomize_questions: boolean
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
          id?: string
          instructions?: string | null
          pass_mark?: number
          randomize_questions?: boolean
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
          id?: string
          instructions?: string | null
          pass_mark?: number
          randomize_questions?: boolean
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
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: string
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
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_exam_score: {
        Args: { session_id_param: string }
        Returns: Json
      }
      cleanup_expired_otps: {
        Args: Record<PropertyKey, never>
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
      delete_user_profile: {
        Args: { user_id_param: string }
        Returns: Json
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_teacher: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
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
      difficulty_level: ["easy", "medium", "hard"],
      exam_status: ["draft", "published", "archived"],
      question_type: ["mcq", "true_false", "fill_blank", "diagram"],
      session_status: ["not_started", "in_progress", "completed", "expired"],
    },
  },
} as const
