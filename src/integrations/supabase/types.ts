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
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          description: string | null
          elderly_person_id: string
          id: string
          resolved_at: string | null
          severity: string
          status: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          description?: string | null
          elderly_person_id: string
          id?: string
          resolved_at?: string | null
          severity: string
          status?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          description?: string | null
          elderly_person_id?: string
          id?: string
          resolved_at?: string | null
          severity?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_assignments: {
        Row: {
          assignment_type: string | null
          caregiver_user_id: string
          created_at: string
          elderly_person_id: string
          id: string
        }
        Insert: {
          assignment_type?: string | null
          caregiver_user_id: string
          created_at?: string
          elderly_person_id: string
          id?: string
        }
        Update: {
          assignment_type?: string | null
          caregiver_user_id?: string
          created_at?: string
          elderly_person_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_assignments_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      device_data: {
        Row: {
          created_at: string
          data_type: string
          device_id: string
          elderly_person_id: string
          id: string
          recorded_at: string
          unit: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          data_type: string
          device_id: string
          elderly_person_id: string
          id?: string
          recorded_at?: string
          unit?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          data_type?: string
          device_id?: string
          elderly_person_id?: string
          id?: string
          recorded_at?: string
          unit?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "device_data_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_data_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      device_type_data_configs: {
        Row: {
          created_at: string | null
          data_type: string
          device_type_id: string
          display_name: string
          id: string
          is_required: boolean | null
          sample_data_config: Json | null
          sort_order: number | null
          unit: string | null
          updated_at: string | null
          value_type: string
        }
        Insert: {
          created_at?: string | null
          data_type: string
          device_type_id: string
          display_name: string
          id?: string
          is_required?: boolean | null
          sample_data_config?: Json | null
          sort_order?: number | null
          unit?: string | null
          updated_at?: string | null
          value_type: string
        }
        Update: {
          created_at?: string | null
          data_type?: string
          device_type_id?: string
          display_name?: string
          id?: string
          is_required?: boolean | null
          sample_data_config?: Json | null
          sort_order?: number | null
          unit?: string | null
          updated_at?: string | null
          value_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_type_data_configs_device_type_id_fkey"
            columns: ["device_type_id"]
            isOneToOne: false
            referencedRelation: "device_types"
            referencedColumns: ["id"]
          },
        ]
      }
      device_types: {
        Row: {
          category: string
          code: string
          created_at: string | null
          data_frequency_per_day: number
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          supports_position_tracking: boolean | null
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          data_frequency_per_day?: number
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          supports_position_tracking?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          data_frequency_per_day?: number
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          supports_position_tracking?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      devices: {
        Row: {
          api_key: string
          battery_level: number | null
          created_at: string
          device_id: string
          device_name: string
          device_type: string
          elderly_person_id: string
          id: string
          last_sync: string | null
          location: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string
          battery_level?: number | null
          created_at?: string
          device_id: string
          device_name: string
          device_type: string
          elderly_person_id: string
          id?: string
          last_sync?: string | null
          location?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          battery_level?: number | null
          created_at?: string
          device_id?: string
          device_name?: string
          device_type?: string
          elderly_person_id?: string
          id?: string
          last_sync?: string | null
          location?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_devices_device_type"
            columns: ["device_type"]
            isOneToOne: false
            referencedRelation: "device_types"
            referencedColumns: ["code"]
          },
        ]
      }
      elderly_persons: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          emergency_contact: string | null
          full_name: string
          id: string
          medical_conditions: string[] | null
          medications: string[] | null
          photo_url: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          full_name: string
          id?: string
          medical_conditions?: string[] | null
          medications?: string[] | null
          photo_url?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          full_name?: string
          id?: string
          medical_conditions?: string[] | null
          medications?: string[] | null
          photo_url?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      floor_plans: {
        Row: {
          created_at: string | null
          elderly_person_id: string | null
          grid_size: number | null
          height: number
          id: string
          image_url: string | null
          name: string
          updated_at: string | null
          width: number
          zones: Json | null
        }
        Insert: {
          created_at?: string | null
          elderly_person_id?: string | null
          grid_size?: number | null
          height: number
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string | null
          width: number
          zones?: Json | null
        }
        Update: {
          created_at?: string | null
          elderly_person_id?: string | null
          grid_size?: number | null
          height?: number
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string | null
          width?: number
          zones?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "floor_plans_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      relative_assignments: {
        Row: {
          created_at: string
          elderly_person_id: string
          id: string
          relationship: string | null
          relative_user_id: string
        }
        Insert: {
          created_at?: string
          elderly_person_id: string
          id?: string
          relationship?: string | null
          relative_user_id: string
        }
        Update: {
          created_at?: string
          elderly_person_id?: string
          id?: string
          relationship?: string | null
          relative_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relative_assignments_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      can_access_elderly_person: {
        Args: { _elderly_person_id: string; _user_id: string }
        Returns: boolean
      }
      get_accessible_elderly_persons: {
        Args: { _user_id: string }
        Returns: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          emergency_contact: string | null
          full_name: string
          id: string
          medical_conditions: string[] | null
          medications: string[] | null
          photo_url: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "elderly_persons"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_user_by_email: { Args: { _email: string }; Returns: string }
    }
    Enums: {
      app_role: "elderly" | "caregiver" | "relative" | "admin"
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
      app_role: ["elderly", "caregiver", "relative", "admin"],
    },
  },
} as const
