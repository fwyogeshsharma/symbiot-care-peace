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
      alert_recipients: {
        Row: {
          alert_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_recipients_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
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
      dashboard_layouts: {
        Row: {
          created_at: string
          id: string
          layout_config: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout_config?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          layout_config?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_association_logs: {
        Row: {
          created_at: string
          details: Json | null
          device_id: string | null
          event_type: string
          id: string
          pairing_request_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          device_id?: string | null
          event_type: string
          id?: string
          pairing_request_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          device_id?: string | null
          event_type?: string
          id?: string
          pairing_request_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_association_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_association_logs_pairing_request_id_fkey"
            columns: ["pairing_request_id"]
            isOneToOne: false
            referencedRelation: "device_pairing_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      device_companies: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
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
      device_health_logs: {
        Row: {
          battery_status: string | null
          connectivity_status: string | null
          created_at: string
          data_points_24h: number | null
          device_id: string
          error_count: number | null
          health_score: number
          id: string
          last_data_transmission: string | null
          metadata: Json | null
        }
        Insert: {
          battery_status?: string | null
          connectivity_status?: string | null
          created_at?: string
          data_points_24h?: number | null
          device_id: string
          error_count?: number | null
          health_score: number
          id?: string
          last_data_transmission?: string | null
          metadata?: Json | null
        }
        Update: {
          battery_status?: string | null
          connectivity_status?: string | null
          created_at?: string
          data_points_24h?: number | null
          device_id?: string
          error_count?: number | null
          health_score?: number
          id?: string
          last_data_transmission?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "device_health_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_models: {
        Row: {
          code: string
          company_id: string | null
          created_at: string | null
          description: string | null
          device_type_id: string
          id: string
          image_url: string | null
          is_active: boolean | null
          manufacturer: string | null
          model_number: string | null
          name: string
          specifications: Json | null
          supported_data_types: string[] | null
          updated_at: string | null
        }
        Insert: {
          code: string
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          device_type_id: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          manufacturer?: string | null
          model_number?: string | null
          name: string
          specifications?: Json | null
          supported_data_types?: string[] | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          device_type_id?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          manufacturer?: string | null
          model_number?: string | null
          name?: string
          specifications?: Json | null
          supported_data_types?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_models_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "device_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_models_device_type_id_fkey"
            columns: ["device_type_id"]
            isOneToOne: false
            referencedRelation: "device_types"
            referencedColumns: ["id"]
          },
        ]
      }
      device_pairing_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          device_id: string
          device_metadata: Json | null
          device_type: string | null
          elderly_person_id: string
          expires_at: string
          id: string
          network_info: Json | null
          paired_at: string | null
          pairing_code: string
          requested_by: string
          status: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          device_id: string
          device_metadata?: Json | null
          device_type?: string | null
          elderly_person_id: string
          expires_at: string
          id?: string
          network_info?: Json | null
          paired_at?: string | null
          pairing_code: string
          requested_by: string
          status?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          device_id?: string
          device_metadata?: Json | null
          device_type?: string | null
          elderly_person_id?: string
          expires_at?: string
          id?: string
          network_info?: Json | null
          paired_at?: string | null
          pairing_code?: string
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_pairing_requests_elderly_person_id_fkey"
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
          company_id: string | null
          created_at: string
          device_id: string
          device_name: string
          device_type: string
          elderly_person_id: string
          id: string
          last_sync: string | null
          location: string | null
          model_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string
          battery_level?: number | null
          company_id?: string | null
          created_at?: string
          device_id: string
          device_name: string
          device_type: string
          elderly_person_id: string
          id?: string
          last_sync?: string | null
          location?: string | null
          model_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          battery_level?: number | null
          company_id?: string | null
          created_at?: string
          device_id?: string
          device_name?: string
          device_type?: string
          elderly_person_id?: string
          id?: string
          last_sync?: string | null
          location?: string | null
          model_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "device_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "device_models"
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
      fcm_tokens: {
        Row: {
          created_at: string | null
          device_info: Json | null
          id: string
          last_used_at: string | null
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          last_used_at?: string | null
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          last_used_at?: string | null
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      floor_plans: {
        Row: {
          created_at: string | null
          elderly_person_id: string | null
          furniture: Json | null
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
          furniture?: Json | null
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
          furniture?: Json | null
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
      geofence_events: {
        Row: {
          created_at: string
          device_id: string
          duration_minutes: number | null
          elderly_person_id: string
          event_type: string
          id: string
          latitude: number
          longitude: number
          place_id: string
          timestamp: string
        }
        Insert: {
          created_at?: string
          device_id: string
          duration_minutes?: number | null
          elderly_person_id: string
          event_type: string
          id?: string
          latitude: number
          longitude: number
          place_id: string
          timestamp?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          duration_minutes?: number | null
          elderly_person_id?: string
          event_type?: string
          id?: string
          latitude?: number
          longitude?: number
          place_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofence_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_events_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_events_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "geofence_places"
            referencedColumns: ["id"]
          },
        ]
      }
      geofence_places: {
        Row: {
          address: string | null
          color: string | null
          created_at: string
          elderly_person_id: string
          icon: string | null
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          notes: string | null
          place_type: string
          radius_meters: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          color?: string | null
          created_at?: string
          elderly_person_id: string
          icon?: string | null
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          notes?: string | null
          place_type: string
          radius_meters?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          color?: string | null
          created_at?: string
          elderly_person_id?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          notes?: string | null
          place_type?: string
          radius_meters?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofence_places_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      geofence_state: {
        Row: {
          elderly_person_id: string
          entry_timestamp: string
          place_id: string
        }
        Insert: {
          elderly_person_id: string
          entry_timestamp?: string
          place_id: string
        }
        Update: {
          elderly_person_id?: string
          entry_timestamp?: string
          place_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofence_state_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_state_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "geofence_places"
            referencedColumns: ["id"]
          },
        ]
      }
      ideal_profiles: {
        Row: {
          baseline_data: Json
          created_at: string
          created_by: string | null
          elderly_person_id: string
          id: string
          is_active: boolean
          notes: string | null
          profile_name: string
          updated_at: string
        }
        Insert: {
          baseline_data?: Json
          created_at?: string
          created_by?: string | null
          elderly_person_id: string
          id?: string
          is_active?: boolean
          notes?: string | null
          profile_name: string
          updated_at?: string
        }
        Update: {
          baseline_data?: Json
          created_at?: string
          created_by?: string | null
          elderly_person_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          profile_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideal_profiles_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      ilq_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          affected_components: string[] | null
          alert_type: string
          created_at: string | null
          current_score: number | null
          description: string
          elderly_person_id: string
          id: string
          ilq_score_id: string | null
          previous_score: number | null
          score_change: number | null
          severity: string
          status: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_components?: string[] | null
          alert_type: string
          created_at?: string | null
          current_score?: number | null
          description: string
          elderly_person_id: string
          id?: string
          ilq_score_id?: string | null
          previous_score?: number | null
          score_change?: number | null
          severity: string
          status?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_components?: string[] | null
          alert_type?: string
          created_at?: string | null
          current_score?: number | null
          description?: string
          elderly_person_id?: string
          id?: string
          ilq_score_id?: string | null
          previous_score?: number | null
          score_change?: number | null
          severity?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ilq_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ilq_alerts_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ilq_alerts_ilq_score_id_fkey"
            columns: ["ilq_score_id"]
            isOneToOne: false
            referencedRelation: "ilq_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      ilq_benchmarks: {
        Row: {
          age_range: string
          avg_score: number
          gender: string | null
          id: string
          last_updated: string | null
          median_score: number
          sample_size: number | null
          std_deviation: number | null
        }
        Insert: {
          age_range: string
          avg_score: number
          gender?: string | null
          id?: string
          last_updated?: string | null
          median_score: number
          sample_size?: number | null
          std_deviation?: number | null
        }
        Update: {
          age_range?: string
          avg_score?: number
          gender?: string | null
          id?: string
          last_updated?: string | null
          median_score?: number
          sample_size?: number | null
          std_deviation?: number | null
        }
        Relationships: []
      }
      ilq_configurations: {
        Row: {
          cognitive_function_weight: number | null
          created_at: string | null
          description: string | null
          elderly_person_id: string | null
          emergency_response_weight: number | null
          environmental_safety_weight: number | null
          health_vitals_weight: number | null
          id: string
          is_active: boolean | null
          is_global: boolean | null
          name: string
          normalization_ranges: Json
          physical_activity_weight: number | null
          social_engagement_weight: number | null
          thresholds: Json
          updated_at: string | null
        }
        Insert: {
          cognitive_function_weight?: number | null
          created_at?: string | null
          description?: string | null
          elderly_person_id?: string | null
          emergency_response_weight?: number | null
          environmental_safety_weight?: number | null
          health_vitals_weight?: number | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean | null
          name: string
          normalization_ranges?: Json
          physical_activity_weight?: number | null
          social_engagement_weight?: number | null
          thresholds?: Json
          updated_at?: string | null
        }
        Update: {
          cognitive_function_weight?: number | null
          created_at?: string | null
          description?: string | null
          elderly_person_id?: string | null
          emergency_response_weight?: number | null
          environmental_safety_weight?: number | null
          health_vitals_weight?: number | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean | null
          name?: string
          normalization_ranges?: Json
          physical_activity_weight?: number | null
          social_engagement_weight?: number | null
          thresholds?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ilq_configurations_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      ilq_scores: {
        Row: {
          cognitive_function_score: number | null
          computation_timestamp: string
          confidence_level: number | null
          created_at: string | null
          data_points_analyzed: number
          detailed_metrics: Json | null
          elderly_person_id: string
          emergency_response_score: number | null
          environmental_safety_score: number | null
          health_vitals_score: number | null
          id: string
          physical_activity_score: number | null
          score: number
          social_engagement_score: number | null
          time_window_hours: number
          triggered_alerts: string[] | null
        }
        Insert: {
          cognitive_function_score?: number | null
          computation_timestamp?: string
          confidence_level?: number | null
          created_at?: string | null
          data_points_analyzed: number
          detailed_metrics?: Json | null
          elderly_person_id: string
          emergency_response_score?: number | null
          environmental_safety_score?: number | null
          health_vitals_score?: number | null
          id?: string
          physical_activity_score?: number | null
          score: number
          social_engagement_score?: number | null
          time_window_hours: number
          triggered_alerts?: string[] | null
        }
        Update: {
          cognitive_function_score?: number | null
          computation_timestamp?: string
          confidence_level?: number | null
          created_at?: string | null
          data_points_analyzed?: number
          detailed_metrics?: Json | null
          elderly_person_id?: string
          emergency_response_score?: number | null
          environmental_safety_score?: number | null
          health_vitals_score?: number | null
          id?: string
          physical_activity_score?: number | null
          score?: number
          social_engagement_score?: number | null
          time_window_hours?: number
          triggered_alerts?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ilq_scores_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      ilq_trends: {
        Row: {
          avg_score: number | null
          change_percentage: number | null
          created_at: string | null
          data_points_count: number | null
          elderly_person_id: string
          id: string
          max_score: number | null
          min_score: number | null
          period_end: string
          period_start: string
          period_type: string
          score_variance: number | null
          trend_direction: string | null
        }
        Insert: {
          avg_score?: number | null
          change_percentage?: number | null
          created_at?: string | null
          data_points_count?: number | null
          elderly_person_id: string
          id?: string
          max_score?: number | null
          min_score?: number | null
          period_end: string
          period_start: string
          period_type: string
          score_variance?: number | null
          trend_direction?: string | null
        }
        Update: {
          avg_score?: number | null
          change_percentage?: number | null
          created_at?: string | null
          data_points_count?: number | null
          elderly_person_id?: string
          id?: string
          max_score?: number | null
          min_score?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          score_variance?: number | null
          trend_direction?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ilq_trends_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_adherence_logs: {
        Row: {
          caregiver_alerted: boolean | null
          created_at: string
          dispenser_confirmed: boolean | null
          elderly_person_id: string
          id: string
          notes: string | null
          schedule_id: string
          scheduled_time: string
          status: string
          timestamp: string
        }
        Insert: {
          caregiver_alerted?: boolean | null
          created_at?: string
          dispenser_confirmed?: boolean | null
          elderly_person_id: string
          id?: string
          notes?: string | null
          schedule_id: string
          scheduled_time: string
          status?: string
          timestamp?: string
        }
        Update: {
          caregiver_alerted?: boolean | null
          created_at?: string
          dispenser_confirmed?: boolean | null
          elderly_person_id?: string
          id?: string
          notes?: string | null
          schedule_id?: string
          scheduled_time?: string
          status?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_adherence_logs_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_adherence_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "medication_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          dosage_mg: number | null
          dosage_unit: string | null
          elderly_person_id: string
          end_date: string | null
          frequency: string
          id: string
          instructions: string | null
          is_active: boolean | null
          medication_name: string
          start_date: string
          times: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dosage_mg?: number | null
          dosage_unit?: string | null
          elderly_person_id: string
          end_date?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          medication_name: string
          start_date?: string
          times?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dosage_mg?: number | null
          dosage_unit?: string | null
          elderly_person_id?: string
          end_date?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          medication_name?: string
          start_date?: string
          times?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_schedules_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_metrics: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          recorded_at: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          recorded_at?: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          recorded_at?: string
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blocked_at: string | null
          blocked_by: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          postal_address: string | null
          updated_at: string
          year_of_birth: number | null
        }
        Insert: {
          avatar_url?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          postal_address?: string | null
          updated_at?: string
          year_of_birth?: number | null
        }
        Update: {
          avatar_url?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          postal_address?: string | null
          updated_at?: string
          year_of_birth?: number | null
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
      report_subscriptions: {
        Row: {
          created_at: string
          elderly_person_id: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          report_type: string
          schedule_time: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          elderly_person_id: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          report_type?: string
          schedule_time?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          elderly_person_id?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          report_type?: string
          schedule_time?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_subscriptions_elderly_person_id_fkey"
            columns: ["elderly_person_id"]
            isOneToOne: false
            referencedRelation: "elderly_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_logs: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          login_at: string
          logout_at: string | null
          session_duration_minutes: number | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          login_at?: string
          logout_at?: string | null
          session_duration_minutes?: number | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          login_at?: string
          logout_at?: string | null
          session_duration_minutes?: number | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          created_at: string | null
          description: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
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
      backfill_alert_recipients: { Args: never; Returns: undefined }
      can_access_elderly_person: {
        Args: { _elderly_person_id: string; _user_id: string }
        Returns: boolean
      }
      compute_ilq_for_all_elderly: {
        Args: never
        Returns: {
          computed: boolean
          elderly_person_id: string
          message: string
          score: number
        }[]
      }
      convert_local_to_utc_time: {
        Args: { local_time: string; tz: string }
        Returns: string
      }
      convert_schedule_time_to_utc: {
        Args: { local_time: string; tz: string }
        Returns: string
      }
      delete_user_data_by_email: {
        Args: { user_email: string }
        Returns: {
          message: string
          status: string
        }[]
      }
      get_accessible_elderly_persons: {
        Args: { _user_id: string }
        Returns: {
          address: string
          created_at: string
          date_of_birth: string
          emergency_contact: string
          full_name: string
          id: string
          medical_conditions: string[]
          medications: string[]
          photo_url: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_fcm_tokens_for_elderly_person: {
        Args: { elderly_person_id: string }
        Returns: {
          device_info: Json
          token: string
          user_id: string
        }[]
      }
      get_shared_user_profiles: {
        Args: { _owner_user_id: string }
        Returns: {
          email: string
          full_name: string
          id: string
        }[]
      }
      get_subscriptions_due_now: {
        Args: { time_window_minutes?: number }
        Returns: {
          created_at: string
          elderly_person_id: string
          id: string
          report_type: string
          schedule_time: string
          timezone: string
          updated_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      lookup_user_by_email: { Args: { _email: string }; Returns: string }
      show_recent_cron_runs: {
        Args: never
        Returns: {
          duration: unknown
          message: string
          run_time: string
          status: string
        }[]
      }
      show_upcoming_reports: {
        Args: never
        Returns: {
          minutes_until_next_run: number
          person_name: string
          schedule_time_utc: string
          subscription_id: string
          user_email: string
          user_timezone: string
          will_trigger_soon: boolean
        }[]
      }
      test_http_connection: {
        Args: never
        Returns: {
          details: string
          test_result: string
        }[]
      }
      trigger_scheduled_reports: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "elderly" | "caregiver" | "relative" | "admin" | "super_admin"
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
      app_role: ["elderly", "caregiver", "relative", "admin", "super_admin"],
    },
  },
} as const
