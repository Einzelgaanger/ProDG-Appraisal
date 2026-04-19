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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      appraisal_responses: {
        Row: {
          analyzes_change_score: number | null
          approachable_score: number | null
          confidence_integrity_score: number | null
          continue_doing: string | null
          created_at: string | null
          cultural_fit_comments: string | null
          effective_direction_score: number | null
          empowers_team_score: number | null
          establishes_rapport_score: number | null
          final_say_score: number | null
          flat_collaborative_score: number | null
          id: string
          manager_name: string
          mentors_coaches_score: number | null
          open_to_ideas_score: number | null
          patient_humble_score: number | null
          relationship: string | null
          response_number: number | null
          results_orientation_comments: string | null
          sense_of_urgency_score: number | null
          sets_clear_goals_score: number | null
          start_doing: string | null
          stop_doing: string | null
          team_leadership_comments: string | null
          timestamp: string | null
        }
        Insert: {
          analyzes_change_score?: number | null
          approachable_score?: number | null
          confidence_integrity_score?: number | null
          continue_doing?: string | null
          created_at?: string | null
          cultural_fit_comments?: string | null
          effective_direction_score?: number | null
          empowers_team_score?: number | null
          establishes_rapport_score?: number | null
          final_say_score?: number | null
          flat_collaborative_score?: number | null
          id?: string
          manager_name: string
          mentors_coaches_score?: number | null
          open_to_ideas_score?: number | null
          patient_humble_score?: number | null
          relationship?: string | null
          response_number?: number | null
          results_orientation_comments?: string | null
          sense_of_urgency_score?: number | null
          sets_clear_goals_score?: number | null
          start_doing?: string | null
          stop_doing?: string | null
          team_leadership_comments?: string | null
          timestamp?: string | null
        }
        Update: {
          analyzes_change_score?: number | null
          approachable_score?: number | null
          confidence_integrity_score?: number | null
          continue_doing?: string | null
          created_at?: string | null
          cultural_fit_comments?: string | null
          effective_direction_score?: number | null
          empowers_team_score?: number | null
          establishes_rapport_score?: number | null
          final_say_score?: number | null
          flat_collaborative_score?: number | null
          id?: string
          manager_name?: string
          mentors_coaches_score?: number | null
          open_to_ideas_score?: number | null
          patient_humble_score?: number | null
          relationship?: string | null
          response_number?: number | null
          results_orientation_comments?: string | null
          sense_of_urgency_score?: number | null
          sets_clear_goals_score?: number | null
          start_doing?: string | null
          stop_doing?: string | null
          team_leadership_comments?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      demo_appraisal_responses: {
        Row: {
          analyzes_change_score: number | null
          approachable_score: number | null
          confidence_integrity_score: number | null
          continue_doing: string | null
          created_at: string | null
          cultural_fit_comments: string | null
          effective_direction_score: number | null
          empowers_team_score: number | null
          establishes_rapport_score: number | null
          final_say_score: number | null
          flat_collaborative_score: number | null
          id: string
          manager_name: string
          mentors_coaches_score: number | null
          open_to_ideas_score: number | null
          patient_humble_score: number | null
          relationship: string | null
          response_number: number | null
          results_orientation_comments: string | null
          sense_of_urgency_score: number | null
          sets_clear_goals_score: number | null
          start_doing: string | null
          stop_doing: string | null
          team_leadership_comments: string | null
          timestamp: string | null
        }
        Insert: {
          analyzes_change_score?: number | null
          approachable_score?: number | null
          confidence_integrity_score?: number | null
          continue_doing?: string | null
          created_at?: string | null
          cultural_fit_comments?: string | null
          effective_direction_score?: number | null
          empowers_team_score?: number | null
          establishes_rapport_score?: number | null
          final_say_score?: number | null
          flat_collaborative_score?: number | null
          id?: string
          manager_name: string
          mentors_coaches_score?: number | null
          open_to_ideas_score?: number | null
          patient_humble_score?: number | null
          relationship?: string | null
          response_number?: number | null
          results_orientation_comments?: string | null
          sense_of_urgency_score?: number | null
          sets_clear_goals_score?: number | null
          start_doing?: string | null
          stop_doing?: string | null
          team_leadership_comments?: string | null
          timestamp?: string | null
        }
        Update: {
          analyzes_change_score?: number | null
          approachable_score?: number | null
          confidence_integrity_score?: number | null
          continue_doing?: string | null
          created_at?: string | null
          cultural_fit_comments?: string | null
          effective_direction_score?: number | null
          empowers_team_score?: number | null
          establishes_rapport_score?: number | null
          final_say_score?: number | null
          flat_collaborative_score?: number | null
          id?: string
          manager_name?: string
          mentors_coaches_score?: number | null
          open_to_ideas_score?: number | null
          patient_humble_score?: number | null
          relationship?: string | null
          response_number?: number | null
          results_orientation_comments?: string | null
          sense_of_urgency_score?: number | null
          sets_clear_goals_score?: number | null
          start_doing?: string | null
          stop_doing?: string | null
          team_leadership_comments?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      demo_manager_summaries: {
        Row: {
          avg_cultural_fit: number | null
          avg_results_orientation: number | null
          avg_team_leadership: number | null
          created_at: string | null
          id: string
          manager_name: string
          overall_score: number | null
          total_responses: number | null
          updated_at: string | null
        }
        Insert: {
          avg_cultural_fit?: number | null
          avg_results_orientation?: number | null
          avg_team_leadership?: number | null
          created_at?: string | null
          id?: string
          manager_name: string
          overall_score?: number | null
          total_responses?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_cultural_fit?: number | null
          avg_results_orientation?: number | null
          avg_team_leadership?: number | null
          created_at?: string | null
          id?: string
          manager_name?: string
          overall_score?: number | null
          total_responses?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          id: string
          name: string
          role: string | null
          sort_order: number | null
          subsidiary_id: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          name: string
          role?: string | null
          sort_order?: number | null
          subsidiary_id: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          name?: string
          role?: string | null
          sort_order?: number | null
          subsidiary_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_subsidiary_id_fkey"
            columns: ["subsidiary_id"]
            isOneToOne: false
            referencedRelation: "subsidiaries"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_summaries: {
        Row: {
          avg_cultural_fit: number | null
          avg_results_orientation: number | null
          avg_team_leadership: number | null
          created_at: string | null
          id: string
          manager_name: string
          overall_score: number | null
          total_responses: number | null
          updated_at: string | null
        }
        Insert: {
          avg_cultural_fit?: number | null
          avg_results_orientation?: number | null
          avg_team_leadership?: number | null
          created_at?: string | null
          id?: string
          manager_name: string
          overall_score?: number | null
          total_responses?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_cultural_fit?: number | null
          avg_results_orientation?: number | null
          avg_team_leadership?: number | null
          created_at?: string | null
          id?: string
          manager_name?: string
          overall_score?: number | null
          total_responses?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          department: string | null
          email: string
          employee_id: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email: string
          employee_id?: string | null
          id: string
          name: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string
          employee_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      review_completions: {
        Row: {
          completed_at: string | null
          employee_id: string
          id: string
          reviewer_id: string
        }
        Insert: {
          completed_at?: string | null
          employee_id: string
          id?: string
          reviewer_id: string
        }
        Update: {
          completed_at?: string | null
          employee_id?: string
          id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_completions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      review_milestones_notified: {
        Row: {
          employee_id: string
          id: string
          notified_at: string
          review_count: number
        }
        Insert: {
          employee_id: string
          id?: string
          notified_at?: string
          review_count: number
        }
        Update: {
          employee_id?: string
          id?: string
          notified_at?: string
          review_count?: number
        }
        Relationships: []
      }
      subsidiaries: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      survey_answers: {
        Row: {
          created_at: string | null
          id: string
          question_id: string
          response_id: string
          score: number | null
          text_answer: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id: string
          response_id: string
          score?: number | null
          text_answer?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: string
          response_id?: string
          score?: number | null
          text_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      survey_questions: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          question_text: string
          question_type: string
          sort_order: number | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          question_text: string
          question_type?: string
          sort_order?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          question_text?: string
          question_type?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "survey_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          subsidiary_id: string
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          subsidiary_id: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          subsidiary_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_subsidiary_id_fkey"
            columns: ["subsidiary_id"]
            isOneToOne: false
            referencedRelation: "subsidiaries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
