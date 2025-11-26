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
      profile_completion_progress: {
        Row: {
          completed_at: string
          id: string
          step_completed: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          step_completed: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          step_completed?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_completion_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      public_services: {
        Row: {
          address: string
          average_rating: number | null
          city: string
          created_at: string | null
          district: string
          id: string
          latitude: number
          longitude: number
          name: string
          opening_hours: Json | null
          phone: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          state: string
          total_ratings: number | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address: string
          average_rating?: number | null
          city?: string
          created_at?: string | null
          district: string
          id?: string
          latitude: number
          longitude: number
          name: string
          opening_hours?: Json | null
          phone?: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          state?: string
          total_ratings?: number | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          average_rating?: number | null
          city?: string
          created_at?: string | null
          district?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          state?: string
          total_ratings?: number | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      rating_referrals: {
        Row: {
          council_member_name: string
          council_member_party: string | null
          created_at: string | null
          id: string
          notes: string | null
          rating_id: string
          status: Database["public"]["Enums"]["referral_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          council_member_name: string
          council_member_party?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          rating_id: string
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          council_member_name?: string
          council_member_party?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          rating_id?: string
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_referrals_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "service_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      service_ratings: {
        Row: {
          anonymized_at: string | null
          created_at: string | null
          id: string
          is_anonymous: boolean | null
          rating_stars: number
          rating_text: string | null
          sentiment: string | null
          service_id: string
          updated_at: string | null
          user_id: string
          visit_id: string
        }
        Insert: {
          anonymized_at?: string | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          rating_stars: number
          rating_text?: string | null
          sentiment?: string | null
          service_id: string
          updated_at?: string | null
          user_id: string
          visit_id: string
        }
        Update: {
          anonymized_at?: string | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          rating_stars?: number
          rating_text?: string | null
          sentiment?: string | null
          service_id?: string
          updated_at?: string | null
          user_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_ratings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "public_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ratings_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "service_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      service_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          service_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          service_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          service_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_subscriptions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "public_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_visits: {
        Row: {
          created_at: string | null
          detected_at: string
          expires_at: string
          id: string
          rating_requested_at: string | null
          service_id: string
          status: Database["public"]["Enums"]["visit_status"]
          updated_at: string | null
          user_id: string
          visited_at: string
        }
        Insert: {
          created_at?: string | null
          detected_at?: string
          expires_at: string
          id?: string
          rating_requested_at?: string | null
          service_id: string
          status?: Database["public"]["Enums"]["visit_status"]
          updated_at?: string | null
          user_id: string
          visited_at?: string
        }
        Update: {
          created_at?: string | null
          detected_at?: string
          expires_at?: string
          id?: string
          rating_requested_at?: string | null
          service_id?: string
          status?: Database["public"]["Enums"]["visit_status"]
          updated_at?: string | null
          user_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_visits_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "public_services"
            referencedColumns: ["id"]
          },
        ]
      }
      user_addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string
          id: string
          is_primary: boolean
          latitude: number | null
          longitude: number | null
          neighborhood: string
          number: string
          state: string
          street: string
          updated_at: string
          user_id: string
          zip_code: string
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          latitude?: number | null
          longitude?: number | null
          neighborhood: string
          number: string
          state: string
          street: string
          updated_at?: string
          user_id: string
          zip_code: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string
          number?: string
          state?: string
          street?: string
          updated_at?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_demographics: {
        Row: {
          birth_date: string | null
          created_at: string
          gender: string | null
          id: string
          race: string | null
          social_class: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          race?: string | null
          social_class?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          race?: string | null
          social_class?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_demographics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interests: {
        Row: {
          created_at: string
          id: string
          interest_category: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_category: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_category?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean
          id: string
          newsletter: boolean
          profile_visibility: string
          push_notifications: boolean
          show_email: boolean
          show_phone: boolean
          sms_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          newsletter?: boolean
          profile_visibility?: string
          push_notifications?: boolean
          show_email?: boolean
          show_phone?: boolean
          sms_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          newsletter?: boolean
          profile_visibility?: string
          push_notifications?: boolean
          show_email?: boolean
          show_phone?: boolean
          sms_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      referral_status: "pending" | "sent" | "acknowledged" | "resolved"
      service_type:
        | "ubs"
        | "school"
        | "ceu"
        | "hospital"
        | "library"
        | "sports_center"
        | "other"
      visit_status: "pending" | "completed" | "expired" | "skipped"
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
      referral_status: ["pending", "sent", "acknowledged", "resolved"],
      service_type: [
        "ubs",
        "school",
        "ceu",
        "hospital",
        "library",
        "sports_center",
        "other",
      ],
      visit_status: ["pending", "completed", "expired", "skipped"],
    },
  },
} as const
