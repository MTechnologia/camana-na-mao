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
      agenda_cache: {
        Row: {
          cached_at: string | null
          description: string | null
          event_date: string | null
          event_time: string | null
          event_type: string | null
          id: string
          link: string | null
          location: string | null
          organizer: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          cached_at?: string | null
          description?: string | null
          event_date?: string | null
          event_time?: string | null
          event_type?: string | null
          id: string
          link?: string | null
          location?: string | null
          organizer?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          cached_at?: string | null
          description?: string | null
          event_date?: string | null
          event_time?: string | null
          event_type?: string | null
          id?: string
          link?: string | null
          location?: string | null
          organizer?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          context: string | null
          created_at: string
          id: string
          journey_id: string | null
          last_message_at: string
          messages: Json
          status: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          journey_id?: string | null
          last_message_at?: string
          messages?: Json
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          journey_id?: string | null
          last_message_at?: string
          messages?: Json
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audiencia_inscricoes: {
        Row: {
          audiencia_id: string
          created_at: string
          id: string
          notified: boolean | null
          status: string
          user_id: string
        }
        Insert: {
          audiencia_id: string
          created_at?: string
          id?: string
          notified?: boolean | null
          status?: string
          user_id: string
        }
        Update: {
          audiencia_id?: string
          created_at?: string
          id?: string
          notified?: boolean | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audiencia_inscricoes_audiencia_id_fkey"
            columns: ["audiencia_id"]
            isOneToOne: false
            referencedRelation: "audiencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audiencia_inscricoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audiencias: {
        Row: {
          ap_code: string | null
          comissao: string | null
          created_at: string
          data: string
          descricao: string | null
          documentos: Json | null
          hora: string
          id: string
          inscricoes_abertas: boolean | null
          link_transmissao: string | null
          local: string
          slug: string | null
          splegis_chave: string | null
          status: string
          tema: string
          titulo: string
          updated_at: string
          vagas_disponiveis: number | null
        }
        Insert: {
          ap_code?: string | null
          comissao?: string | null
          created_at?: string
          data: string
          descricao?: string | null
          documentos?: Json | null
          hora: string
          id?: string
          inscricoes_abertas?: boolean | null
          link_transmissao?: string | null
          local: string
          slug?: string | null
          splegis_chave?: string | null
          status?: string
          tema: string
          titulo: string
          updated_at?: string
          vagas_disponiveis?: number | null
        }
        Update: {
          ap_code?: string | null
          comissao?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          documentos?: Json | null
          hora?: string
          id?: string
          inscricoes_abertas?: boolean | null
          link_transmissao?: string | null
          local?: string
          slug?: string | null
          splegis_chave?: string | null
          status?: string
          tema?: string
          titulo?: string
          updated_at?: string
          vagas_disponiveis?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      category_usage_log: {
        Row: {
          category: string
          created_at: string | null
          description_hash: string
          description_sample: string | null
          id: string
          keywords_detected: string[] | null
          subcategory: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description_hash: string
          description_sample?: string | null
          id?: string
          keywords_detected?: string[] | null
          subcategory?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description_hash?: string
          description_sample?: string | null
          id?: string
          keywords_detected?: string[] | null
          subcategory?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      citizen_learning_profile: {
        Row: {
          avg_message_length: number | null
          common_categories: string[] | null
          common_keywords: string[] | null
          communication_style: string | null
          created_at: string | null
          frequent_services: string[] | null
          frequent_transport_lines: string[] | null
          id: string
          last_interaction_at: string | null
          last_known_address: Json | null
          preferred_neighborhood: string | null
          preferred_region: string | null
          prefers_short_responses: boolean | null
          report_frequency: string | null
          total_conversations: number | null
          total_reports: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_message_length?: number | null
          common_categories?: string[] | null
          common_keywords?: string[] | null
          communication_style?: string | null
          created_at?: string | null
          frequent_services?: string[] | null
          frequent_transport_lines?: string[] | null
          id?: string
          last_interaction_at?: string | null
          last_known_address?: Json | null
          preferred_neighborhood?: string | null
          preferred_region?: string | null
          prefers_short_responses?: boolean | null
          report_frequency?: string | null
          total_conversations?: number | null
          total_reports?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_message_length?: number | null
          common_categories?: string[] | null
          common_keywords?: string[] | null
          communication_style?: string | null
          created_at?: string | null
          frequent_services?: string[] | null
          frequent_transport_lines?: string[] | null
          id?: string
          last_interaction_at?: string | null
          last_known_address?: Json | null
          preferred_neighborhood?: string | null
          preferred_region?: string | null
          prefers_short_responses?: boolean | null
          report_frequency?: string | null
          total_conversations?: number | null
          total_reports?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      council_member_referrals: {
        Row: {
          acknowledged_at: string | null
          citizen_message: string | null
          council_member_id: string
          council_member_name: string
          council_member_party: string | null
          created_at: string | null
          id: string
          match_reasons: string[] | null
          match_score: number | null
          resolved_at: string | null
          response_text: string | null
          sent_at: string | null
          service_rating_id: string | null
          status: string
          transport_report_id: string | null
          updated_at: string | null
          urban_report_id: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          citizen_message?: string | null
          council_member_id: string
          council_member_name: string
          council_member_party?: string | null
          created_at?: string | null
          id?: string
          match_reasons?: string[] | null
          match_score?: number | null
          resolved_at?: string | null
          response_text?: string | null
          sent_at?: string | null
          service_rating_id?: string | null
          status?: string
          transport_report_id?: string | null
          updated_at?: string | null
          urban_report_id?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          citizen_message?: string | null
          council_member_id?: string
          council_member_name?: string
          council_member_party?: string | null
          created_at?: string | null
          id?: string
          match_reasons?: string[] | null
          match_score?: number | null
          resolved_at?: string | null
          response_text?: string | null
          sent_at?: string | null
          service_rating_id?: string | null
          status?: string
          transport_report_id?: string | null
          updated_at?: string | null
          urban_report_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_member_referrals_service_rating_id_fkey"
            columns: ["service_rating_id"]
            isOneToOne: false
            referencedRelation: "service_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_member_referrals_transport_report_id_fkey"
            columns: ["transport_report_id"]
            isOneToOne: false
            referencedRelation: "transport_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_member_referrals_urban_report_id_fkey"
            columns: ["urban_report_id"]
            isOneToOne: false
            referencedRelation: "urban_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      council_members_cache: {
        Row: {
          andar: string | null
          cached_at: string | null
          email: string | null
          gv: string | null
          id: string
          initials: string | null
          is_government_leader: boolean | null
          is_leader: boolean | null
          is_on_leave: boolean | null
          is_substitute: boolean | null
          name: string
          party: string
          phone: string | null
          photo: string | null
          region: string | null
          sala: string | null
          updated_at: string | null
        }
        Insert: {
          andar?: string | null
          cached_at?: string | null
          email?: string | null
          gv?: string | null
          id: string
          initials?: string | null
          is_government_leader?: boolean | null
          is_leader?: boolean | null
          is_on_leave?: boolean | null
          is_substitute?: boolean | null
          name: string
          party: string
          phone?: string | null
          photo?: string | null
          region?: string | null
          sala?: string | null
          updated_at?: string | null
        }
        Update: {
          andar?: string | null
          cached_at?: string | null
          email?: string | null
          gv?: string | null
          id?: string
          initials?: string | null
          is_government_leader?: boolean | null
          is_leader?: boolean | null
          is_on_leave?: boolean | null
          is_substitute?: boolean | null
          name?: string
          party?: string
          phone?: string | null
          photo?: string | null
          region?: string | null
          sala?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dashboards: {
        Row: {
          config: Json
          created_at: string | null
          description: string | null
          id: string
          is_approved: boolean | null
          is_public: boolean | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_approved?: boolean | null
          is_public?: boolean | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_approved?: boolean | null
          is_public?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dynamic_categories: {
        Row: {
          ai_confidence: number | null
          approved_at: string | null
          approved_by: string | null
          category_key: string
          created_at: string | null
          description_patterns: string[] | null
          display_name: string
          first_detected_at: string | null
          id: string
          keywords: string[]
          last_used_at: string | null
          merged_into: string | null
          parent_category: string
          sample_descriptions: string[] | null
          status: string | null
          usage_count: number | null
        }
        Insert: {
          ai_confidence?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category_key: string
          created_at?: string | null
          description_patterns?: string[] | null
          display_name: string
          first_detected_at?: string | null
          id?: string
          keywords?: string[]
          last_used_at?: string | null
          merged_into?: string | null
          parent_category?: string
          sample_descriptions?: string[] | null
          status?: string | null
          usage_count?: number | null
        }
        Update: {
          ai_confidence?: number | null
          approved_at?: string | null
          approved_by?: string | null
          category_key?: string
          created_at?: string | null
          description_patterns?: string[] | null
          display_name?: string
          first_detected_at?: string | null
          id?: string
          keywords?: string[]
          last_used_at?: string | null
          merged_into?: string | null
          parent_category?: string
          sample_descriptions?: string[] | null
          status?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      export_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          export_type: string
          filters: Json | null
          format: string
          id: string
          row_count: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          export_type: string
          filters?: Json | null
          format: string
          id?: string
          row_count?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          export_type?: string
          filters?: Json | null
          format?: string
          id?: string
          row_count?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          content: string
          content_type: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          source_id: string | null
          source_table: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          content_type: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_id?: string | null
          source_table?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_id?: string | null
          source_table?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      n8n_integration_logs: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json | null
          response: Json | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          response?: Json | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          response?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      n8n_settings: {
        Row: {
          created_at: string | null
          enabled_events: Json | null
          id: string
          is_connected: boolean | null
          secret_key: string | null
          updated_at: string | null
          user_id: string | null
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          enabled_events?: Json | null
          id?: string
          is_connected?: boolean | null
          secret_key?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          enabled_events?: Json | null
          id?: string
          is_connected?: boolean | null
          secret_key?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_url?: string
        }
        Relationships: []
      }
      news_cache: {
        Row: {
          cached_at: string | null
          category: string | null
          description: string | null
          full_content: string | null
          id: string
          image_url: string | null
          link: string | null
          pub_date: string | null
          read_time: string | null
          title: string
          updated_at: string | null
          views: number | null
        }
        Insert: {
          cached_at?: string | null
          category?: string | null
          description?: string | null
          full_content?: string | null
          id: string
          image_url?: string | null
          link?: string | null
          pub_date?: string | null
          read_time?: string | null
          title: string
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          cached_at?: string | null
          category?: string | null
          description?: string | null
          full_content?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          pub_date?: string | null
          read_time?: string | null
          title?: string
          updated_at?: string | null
          views?: number | null
        }
        Relationships: []
      }
      noticias: {
        Row: {
          autor: string | null
          categoria: string
          conteudo: string
          created_at: string
          data_publicacao: string
          destaque: boolean | null
          fonte: string | null
          id: string
          imagem_url: string | null
          resumo: string | null
          tags: string[] | null
          titulo: string
        }
        Insert: {
          autor?: string | null
          categoria: string
          conteudo: string
          created_at?: string
          data_publicacao?: string
          destaque?: boolean | null
          fonte?: string | null
          id?: string
          imagem_url?: string | null
          resumo?: string | null
          tags?: string[] | null
          titulo: string
        }
        Update: {
          autor?: string | null
          categoria?: string
          conteudo?: string
          created_at?: string
          data_publicacao?: string
          destaque?: boolean | null
          fonte?: string | null
          id?: string
          imagem_url?: string | null
          resumo?: string | null
          tags?: string[] | null
          titulo?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          categories_enabled: string[] | null
          created_at: string
          email_enabled: boolean | null
          id: string
          max_daily_notifications: number | null
          newsletter_enabled: boolean | null
          push_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          categories_enabled?: string[] | null
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          max_daily_notifications?: number | null
          newsletter_enabled?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          categories_enabled?: string[] | null
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          max_daily_notifications?: number | null
          newsletter_enabled?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh_key: string
          auth_key: string
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh_key: string
          auth_key: string
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh_key?: string
          auth_key?: string
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          priority: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          expo_push_token: string | null
          full_name: string
          id: string
          onboarding_completed_at: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          expo_push_token?: string | null
          full_name: string
          id: string
          onboarding_completed_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          expo_push_token?: string | null
          full_name?: string
          id?: string
          onboarding_completed_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      protocol_sequences: {
        Row: {
          current_sequence: number
          current_year: number
          id: string
          sequence_type: string
          updated_at: string | null
        }
        Insert: {
          current_sequence?: number
          current_year: number
          id?: string
          sequence_type: string
          updated_at?: string | null
        }
        Update: {
          current_sequence?: number
          current_year?: number
          id?: string
          sequence_type?: string
          updated_at?: string | null
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
      report_patterns: {
        Row: {
          average_severity: string | null
          description: string
          first_detected_at: string | null
          id: string
          last_occurrence_at: string | null
          line_id: string | null
          occurrence_count: number | null
          pattern_type: string
          status: string | null
          suggested_action: string | null
        }
        Insert: {
          average_severity?: string | null
          description: string
          first_detected_at?: string | null
          id?: string
          last_occurrence_at?: string | null
          line_id?: string | null
          occurrence_count?: number | null
          pattern_type: string
          status?: string | null
          suggested_action?: string | null
        }
        Update: {
          average_severity?: string | null
          description?: string
          first_detected_at?: string | null
          id?: string
          last_occurrence_at?: string | null
          line_id?: string | null
          occurrence_count?: number | null
          pattern_type?: string
          status?: string | null
          suggested_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_patterns_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "transport_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      report_referrals: {
        Row: {
          council_member_name: string
          council_member_party: string | null
          created_at: string | null
          id: string
          reason: string | null
          report_id: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          council_member_name: string
          council_member_party?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          report_id: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          council_member_name?: string
          council_member_party?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          report_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_referrals_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "transport_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          result_count: number | null
          search_query: string
          search_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          result_count?: number | null
          search_query: string
          search_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          result_count?: number | null
          search_query?: string
          search_type?: string
          user_id?: string
        }
        Relationships: []
      }
      service_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          scheduled_for: string | null
          sent_at: string | null
          service_id: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          scheduled_for?: string | null
          sent_at?: string | null
          service_id?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          scheduled_for?: string | null
          sent_at?: string | null
          service_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_alerts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "public_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_corrections: {
        Row: {
          created_at: string | null
          current_value: string | null
          field_name: string
          id: string
          service_id: string
          status: string | null
          suggested_value: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_value?: string | null
          field_name: string
          id?: string
          service_id: string
          status?: string | null
          suggested_value: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_value?: string | null
          field_name?: string
          id?: string
          service_id?: string
          status?: string | null
          suggested_value?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_corrections_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "public_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_plan_items: {
        Row: {
          estimated_duration: number | null
          id: string
          notes: string | null
          order_index: number | null
          plan_id: string
          service_id: string | null
        }
        Insert: {
          estimated_duration?: number | null
          id?: string
          notes?: string | null
          order_index?: number | null
          plan_id: string
          service_id?: string | null
        }
        Update: {
          estimated_duration?: number | null
          id?: string
          notes?: string | null
          order_index?: number | null
          plan_id?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "service_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_plan_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "public_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_plans: {
        Row: {
          created_at: string | null
          id: string
          name: string
          planned_date: string | null
          planned_time: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          planned_date?: string | null
          planned_time?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          planned_date?: string | null
          planned_time?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
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
      system_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      transport_lines: {
        Row: {
          created_at: string | null
          id: string
          line_code: string
          line_name: string
          line_type: string
          regions: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          line_code: string
          line_name: string
          line_type?: string
          regions?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          line_code?: string
          line_name?: string
          line_type?: string
          regions?: string[] | null
        }
        Relationships: []
      }
      transport_report_responses: {
        Row: {
          created_at: string | null
          id: string
          is_public: boolean | null
          report_id: string
          responder_id: string
          response_text: string
          response_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          report_id: string
          responder_id: string
          response_text: string
          response_type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          report_id?: string
          responder_id?: string
          response_text?: string
          response_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_report_responses_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "transport_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_reports: {
        Row: {
          ai_category: string | null
          ai_pattern_detected: boolean | null
          ai_sentiment: string | null
          created_at: string | null
          description: string | null
          first_response_time: unknown
          id: string
          impact_description: string | null
          line_code_custom: string | null
          line_id: string | null
          location: string | null
          n8n_enriched_data: Json | null
          n8n_priority: string | null
          n8n_processed: boolean | null
          n8n_processed_at: string | null
          n8n_tags: string[] | null
          n8n_validated_category: string | null
          n8n_workflow_id: string | null
          occurrence_date: string
          occurrence_time: string | null
          protocol_code: string | null
          report_type: string
          responded_at: string | null
          severity: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_category?: string | null
          ai_pattern_detected?: boolean | null
          ai_sentiment?: string | null
          created_at?: string | null
          description?: string | null
          first_response_time?: unknown
          id?: string
          impact_description?: string | null
          line_code_custom?: string | null
          line_id?: string | null
          location?: string | null
          n8n_enriched_data?: Json | null
          n8n_priority?: string | null
          n8n_processed?: boolean | null
          n8n_processed_at?: string | null
          n8n_tags?: string[] | null
          n8n_validated_category?: string | null
          n8n_workflow_id?: string | null
          occurrence_date: string
          occurrence_time?: string | null
          protocol_code?: string | null
          report_type: string
          responded_at?: string | null
          severity?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_category?: string | null
          ai_pattern_detected?: boolean | null
          ai_sentiment?: string | null
          created_at?: string | null
          description?: string | null
          first_response_time?: unknown
          id?: string
          impact_description?: string | null
          line_code_custom?: string | null
          line_id?: string | null
          location?: string | null
          n8n_enriched_data?: Json | null
          n8n_priority?: string | null
          n8n_processed?: boolean | null
          n8n_processed_at?: string | null
          n8n_tags?: string[] | null
          n8n_validated_category?: string | null
          n8n_workflow_id?: string | null
          occurrence_date?: string
          occurrence_time?: string | null
          protocol_code?: string | null
          report_type?: string
          responded_at?: string | null
          severity?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_reports_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "transport_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          line_id: string | null
          pattern_id: string | null
          subscription_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          line_id?: string | null
          pattern_id?: string | null
          subscription_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          line_id?: string | null
          pattern_id?: string | null
          subscription_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_subscriptions_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "transport_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_subscriptions_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "report_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      urban_report_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          report_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          report_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          report_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "urban_report_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "urban_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      urban_report_likes: {
        Row: {
          created_at: string
          id: string
          report_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          report_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "urban_report_likes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "urban_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      urban_reports: {
        Row: {
          active_consequences: string[] | null
          affected_estimate: number | null
          affected_scope: string | null
          ai_classification: Json | null
          category: string
          cep: string | null
          created_at: string | null
          description: string | null
          id: string
          latitude: number | null
          location_address: string | null
          longitude: number | null
          n8n_enriched_data: Json | null
          n8n_priority: string | null
          n8n_processed: boolean | null
          n8n_processed_at: string | null
          n8n_tags: string[] | null
          n8n_validated_category: string | null
          n8n_workflow_id: string | null
          neighborhood: string | null
          photos: string[] | null
          protocol_code: string | null
          reference_point: string | null
          risk_level: string | null
          risk_types: string[] | null
          severity: string | null
          status: string | null
          street: string | null
          street_number: string | null
          subcategory: string | null
          updated_at: string | null
          urgency_reason: string | null
          user_id: string
        }
        Insert: {
          active_consequences?: string[] | null
          affected_estimate?: number | null
          affected_scope?: string | null
          ai_classification?: Json | null
          category: string
          cep?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          n8n_enriched_data?: Json | null
          n8n_priority?: string | null
          n8n_processed?: boolean | null
          n8n_processed_at?: string | null
          n8n_tags?: string[] | null
          n8n_validated_category?: string | null
          n8n_workflow_id?: string | null
          neighborhood?: string | null
          photos?: string[] | null
          protocol_code?: string | null
          reference_point?: string | null
          risk_level?: string | null
          risk_types?: string[] | null
          severity?: string | null
          status?: string | null
          street?: string | null
          street_number?: string | null
          subcategory?: string | null
          updated_at?: string | null
          urgency_reason?: string | null
          user_id: string
        }
        Update: {
          active_consequences?: string[] | null
          affected_estimate?: number | null
          affected_scope?: string | null
          ai_classification?: Json | null
          category?: string
          cep?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          n8n_enriched_data?: Json | null
          n8n_priority?: string | null
          n8n_processed?: boolean | null
          n8n_processed_at?: string | null
          n8n_tags?: string[] | null
          n8n_validated_category?: string | null
          n8n_workflow_id?: string | null
          neighborhood?: string | null
          photos?: string[] | null
          protocol_code?: string | null
          reference_point?: string | null
          risk_level?: string | null
          risk_types?: string[] | null
          severity?: string | null
          status?: string | null
          street?: string | null
          street_number?: string | null
          subcategory?: string | null
          updated_at?: string | null
          urgency_reason?: string | null
          user_id?: string
        }
        Relationships: []
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
          font_size: string | null
          id: string
          newsletter: boolean
          profile_visibility: string
          push_notifications: boolean
          reading_mode: boolean | null
          show_email: boolean
          show_phone: boolean
          sms_notifications: boolean
          text_spacing: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          font_size?: string | null
          id?: string
          newsletter?: boolean
          profile_visibility?: string
          push_notifications?: boolean
          reading_mode?: boolean | null
          show_email?: boolean
          show_phone?: boolean
          sms_notifications?: boolean
          text_spacing?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          font_size?: string | null
          id?: string
          newsletter?: boolean
          profile_visibility?: string
          push_notifications?: boolean
          reading_mode?: boolean | null
          show_email?: boolean
          show_phone?: boolean
          sms_notifications?: boolean
          text_spacing?: boolean | null
          theme?: string | null
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
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      generate_protocol_code: { Args: { p_type: string }; Returns: string }
      get_reports_with_demographics: {
        Args: {
          p_age_group?: string
          p_end_date?: string
          p_gender?: string
          p_race?: string
          p_report_type?: string
          p_social_class?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_documents: {
        Args: {
          filter_content_type?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          content_type: string
          id: string
          metadata: Json
          similarity: number
          source_id: string
          source_table: string
          title: string
        }[]
      }
      notify_admins: {
        Args: {
          p_action_url?: string
          p_message: string
          p_metadata?: Json
          p_priority?: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "gestor"
        | "vereador"
        | "assessor"
        | "cidadao"
        | "cidadao_engajado"
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
      app_role: [
        "admin",
        "gestor",
        "vereador",
        "assessor",
        "cidadao",
        "cidadao_engajado",
      ],
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
