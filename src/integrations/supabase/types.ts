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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bmi_logs: {
        Row: {id:string;user_id:string;weight_kg:number;height_cm:number;bmi:number;adult_confirmed:boolean;recorded_at:string}
        Insert: {id?:string;user_id?:string;weight_kg:number;height_cm:number;adult_confirmed?:boolean;recorded_at?:string}
        Update: {weight_kg?:number;height_cm?:number;adult_confirmed?:boolean}
        Relationships: []
      }
      account_deletion_requests: {
        Row: {id:string;user_id:string;requested_at:string;status:string}
        Insert: {id?:string;user_id?:string;requested_at?:string;status?:string}
        Update: {status?:string}
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          equipment: string
          id: string
          instructions: string | null
          is_system_exercise: boolean
          is_unilateral: boolean
          name: string
          primary_muscle_group: string
          suggested_reps: string | null
          suggested_sets: number
          tracking_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment: string
          id?: string
          instructions?: string | null
          is_system_exercise?: boolean
          is_unilateral?: boolean
          name: string
          primary_muscle_group: string
          suggested_reps?: string | null
          suggested_sets?: number
          tracking_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment?: string
          id?: string
          instructions?: string | null
          is_system_exercise?: boolean
          is_unilateral?: boolean
          name?: string
          primary_muscle_group?: string
          suggested_reps?: string | null
          suggested_sets?: number
          tracking_type?: string
        }
        Relationships: []
      }
      fitness_goals: {
        Row: {
          created_at: string
          daily_calorie_target: number
          daily_protein_target_g: number
          goal_type: string
          id: string
          start_date: string
          starting_weight_kg: number
          status: string
          target_weight_kg: number
          updated_at: string
          user_id: string
          weekly_weight_change_target_kg: number
        }
        Insert: {
          created_at?: string
          daily_calorie_target: number
          daily_protein_target_g: number
          goal_type: string
          id?: string
          start_date?: string
          starting_weight_kg: number
          status?: string
          target_weight_kg: number
          updated_at?: string
          user_id?: string
          weekly_weight_change_target_kg?: number
        }
        Update: {
          created_at?: string
          daily_calorie_target?: number
          daily_protein_target_g?: number
          goal_type?: string
          id?: string
          start_date?: string
          starting_weight_kg?: number
          status?: string
          target_weight_kg?: number
          updated_at?: string
          user_id?: string
          weekly_weight_change_target_kg?: number
        }
        Relationships: []
      }
      food_logs: {
        Row: {
          calories_snapshot: number
          carbs_snapshot_g: number
          consumed_at: string
          created_at: string
          fat_snapshot_g: number
          food_id: string | null
          food_name_snapshot: string
          id: string
          log_date: string
          meal_type: string
          protein_snapshot_g: number
          quantity: number
          serving_multiplier: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calories_snapshot: number
          carbs_snapshot_g: number
          consumed_at?: string
          created_at?: string
          fat_snapshot_g: number
          food_id?: string | null
          food_name_snapshot: string
          id?: string
          log_date: string
          meal_type: string
          protein_snapshot_g: number
          quantity: number
          serving_multiplier: number
          unit: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          calories_snapshot?: number
          carbs_snapshot_g?: number
          consumed_at?: string
          created_at?: string
          fat_snapshot_g?: number
          food_id?: string | null
          food_name_snapshot?: string
          id?: string
          log_date?: string
          meal_type?: string
          protein_snapshot_g?: number
          quantity?: number
          serving_multiplier?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_logs_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          created_by: string | null
          fat_g: number
          id: string
          is_system_food: boolean
          name: string
          protein_g: number
          serving_description: string | null
          serving_size: number
          serving_unit: string
          source_note: string | null
        }
        Insert: {
          calories: number
          carbs_g?: number
          created_at?: string
          created_by?: string | null
          fat_g?: number
          id?: string
          is_system_food?: boolean
          name: string
          protein_g?: number
          serving_description?: string | null
          serving_size: number
          serving_unit: string
          source_note?: string | null
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          created_by?: string | null
          fat_g?: number
          id?: string
          is_system_food?: boolean
          name?: string
          protein_g?: number
          serving_description?: string | null
          serving_size?: number
          serving_unit?: string
          source_note?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          social_links: Json
          activity_level: string | null
          created_at: string
          date_of_birth: string | null
          equipment: string[]
          experience_level: string | null
          full_name: string | null
          height_cm: number | null
          id: string
          onboarding_completed: boolean
          preferred_days: number[]
          sex: string | null
          updated_at: string
          workout_location: string | null
        }
        Insert: {
          avatar_url?: string | null
          social_links?: Json
          activity_level?: string | null
          created_at?: string
          date_of_birth?: string | null
          equipment?: string[]
          experience_level?: string | null
          full_name?: string | null
          height_cm?: number | null
          id: string
          onboarding_completed?: boolean
          preferred_days?: number[]
          sex?: string | null
          updated_at?: string
          workout_location?: string | null
        }
        Update: {
          avatar_url?: string | null
          social_links?: Json
          activity_level?: string | null
          created_at?: string
          date_of_birth?: string | null
          equipment?: string[]
          experience_level?: string | null
          full_name?: string | null
          height_cm?: number | null
          id?: string
          onboarding_completed?: boolean
          preferred_days?: number[]
          sex?: string | null
          updated_at?: string
          workout_location?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          date_format: string
          default_landing: string
          height_unit: string
          id: string
          theme: string
          timezone: string
          updated_at: string
          user_id: string
          weight_unit: string
        }
        Insert: {
          created_at?: string
          date_format?: string
          default_landing?: string
          height_unit?: string
          id?: string
          theme?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          weight_unit?: string
        }
        Update: {
          created_at?: string
          date_format?: string
          default_landing?: string
          height_unit?: string
          id?: string
          theme?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          weight_unit?: string
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          created_at: string
          id: string
          measured_at: string
          notes: string | null
          updated_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          measured_at?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          measured_at?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      workout_plan_exercises: {
        Row: {
          exercise_id: string
          exercise_order: number
          id: string
          rest_seconds: number
          target_duration_seconds: number | null
          target_reps_max: number | null
          target_reps_min: number | null
          target_sets: number
          user_id: string
          workout_plan_id: string
        }
        Insert: {
          exercise_id: string
          exercise_order?: number
          id?: string
          rest_seconds?: number
          target_duration_seconds?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_sets?: number
          user_id?: string
          workout_plan_id: string
        }
        Update: {
          exercise_id?: string
          exercise_order?: number
          id?: string
          rest_seconds?: number
          target_duration_seconds?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_sets?: number
          user_id?: string
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_exercises_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_schedule: {
        Row: {
          day_of_week: number
          effective_from: string
          effective_until: string | null
          id: string
          user_id: string
          week_parity: string
          workout_plan_id: string
        }
        Insert: {
          day_of_week: number
          effective_from?: string
          effective_until?: string | null
          id?: string
          user_id?: string
          week_parity?: string
          workout_plan_id: string
        }
        Update: {
          day_of_week?: number
          effective_from?: string
          effective_until?: string | null
          id?: string
          user_id?: string
          week_parity?: string
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_schedule_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_session_exercises: {
        Row: {
          exercise_id: string
          exercise_order: number
          id: string
          rest_seconds: number
          status: string
          target_duration_seconds: number | null
          target_reps_max: number | null
          target_reps_min: number | null
          target_sets: number
          user_id: string
          workout_session_id: string
        }
        Insert: {
          exercise_id: string
          exercise_order?: number
          id?: string
          rest_seconds?: number
          status?: string
          target_duration_seconds?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_sets?: number
          user_id?: string
          workout_session_id: string
        }
        Update: {
          exercise_id?: string
          exercise_order?: number
          id?: string
          rest_seconds?: number
          status?: string
          target_duration_seconds?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_sets?: number
          user_id?: string
          workout_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_session_exercises_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          notes: string | null
          started_at: string
          status: string
          title: string
          user_id: string
          workout_plan_id: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          title: string
          user_id?: string
          workout_plan_id?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          title?: string
          user_id?: string
          workout_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          completed_at: string
          duration_seconds: number | null
          id: string
          repetitions: number | null
          set_number: number
          side: string | null
          user_id: string
          weight_basis: string
          weight_kg: number | null
          workout_session_exercise_id: string
        }
        Insert: {
          completed_at?: string
          duration_seconds?: number | null
          id?: string
          repetitions?: number | null
          set_number: number
          side?: string | null
          user_id?: string
          weight_basis?: string
          weight_kg?: number | null
          workout_session_exercise_id: string
        }
        Update: {
          completed_at?: string
          duration_seconds?: number | null
          id?: string
          repetitions?: number | null
          set_number?: number
          side?: string | null
          user_id?: string
          weight_basis?: string
          weight_kg?: number | null
          workout_session_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_session_exercise_id_fkey"
            columns: ["workout_session_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_onboarding: { Args: { payload: Json }; Returns: undefined }
      start_workout: { Args: { plan_id: string }; Returns: string }
      reorder_plan_exercises: { Args: { first_id: string; second_id: string }; Returns: undefined }
      set_workout_day: { Args: { plan_id: string; day_number: number; parity: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

