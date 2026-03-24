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
      activities: {
        Row: {
          body: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          deal_id: string | null
          direction: string | null
          id: string
          metadata: Json | null
          subject: string | null
          type: string
        }
        Insert: {
          body?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          direction?: string | null
          id?: string
          metadata?: Json | null
          subject?: string | null
          type: string
        }
        Update: {
          body?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          direction?: string | null
          id?: string
          metadata?: Json | null
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          area_atuacao: string | null
          cargo: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          email: string | null
          faixa_de_faturamento: string | null
          first_conversion: string | null
          first_conversion_date: string | null
          first_name: string
          fonte_registro: string | null
          hubspot_id: number | null
          hubspot_owner: string | null
          id: string
          instagram_opt_in: boolean
          last_activity_at: string | null
          last_name: string | null
          lead_status: string | null
          lifecycle_stage: string | null
          linkedin_url: string | null
          manychat_id: string | null
          marketing_status: string | null
          motivo_para_aprender_ia: string | null
          numero_de_liderados: string | null
          objetivo_com_a_comunidade: string | null
          owner_id: string | null
          phone: string | null
          produto_interesse: string[] | null
          renda_mensal: string | null
          state: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          website_url: string | null
          whatsapp: string | null
          whatsapp_opt_in: boolean
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          area_atuacao?: string | null
          cargo?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          faixa_de_faturamento?: string | null
          first_conversion?: string | null
          first_conversion_date?: string | null
          first_name: string
          fonte_registro?: string | null
          hubspot_id?: number | null
          hubspot_owner?: string | null
          id?: string
          instagram_opt_in?: boolean
          last_activity_at?: string | null
          last_name?: string | null
          lead_status?: string | null
          lifecycle_stage?: string | null
          linkedin_url?: string | null
          manychat_id?: string | null
          marketing_status?: string | null
          motivo_para_aprender_ia?: string | null
          numero_de_liderados?: string | null
          objetivo_com_a_comunidade?: string | null
          owner_id?: string | null
          phone?: string | null
          produto_interesse?: string[] | null
          renda_mensal?: string | null
          state?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          website_url?: string | null
          whatsapp?: string | null
          whatsapp_opt_in?: boolean
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          area_atuacao?: string | null
          cargo?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          faixa_de_faturamento?: string | null
          first_conversion?: string | null
          first_conversion_date?: string | null
          first_name?: string
          fonte_registro?: string | null
          hubspot_id?: number | null
          hubspot_owner?: string | null
          id?: string
          instagram_opt_in?: boolean
          last_activity_at?: string | null
          last_name?: string | null
          lead_status?: string | null
          lifecycle_stage?: string | null
          linkedin_url?: string | null
          manychat_id?: string | null
          marketing_status?: string | null
          motivo_para_aprender_ia?: string | null
          numero_de_liderados?: string | null
          objetivo_com_a_comunidade?: string | null
          owner_id?: string | null
          phone?: string | null
          produto_interesse?: string[] | null
          renda_mensal?: string | null
          state?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          website_url?: string | null
          whatsapp?: string | null
          whatsapp_opt_in?: boolean
          zip_code?: string | null
        }
        Relationships: []
      }
      dashboard_snapshots: {
        Row: {
          collected_at: string | null
          data: Json
          errors: string[] | null
          id: string
          source: string
        }
        Insert: {
          collected_at?: string | null
          data?: Json
          errors?: string[] | null
          id?: string
          source: string
        }
        Update: {
          collected_at?: string | null
          data?: Json
          errors?: string[] | null
          id?: string
          source?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          amount: number | null
          canal_origem: string | null
          closed_at: string | null
          contact_id: string | null
          created_at: string | null
          hubspot_id: number | null
          id: string
          is_won: boolean | null
          motivo_perda: string | null
          name: string
          owner_id: string | null
          pipeline_id: string
          product: string
          qualification_status: string
          stage_entered_at: string | null
          stage_id: string
          ultimo_contato: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          canal_origem?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          hubspot_id?: number | null
          id?: string
          is_won?: boolean | null
          motivo_perda?: string | null
          name: string
          owner_id?: string | null
          pipeline_id: string
          product?: string
          qualification_status?: string
          stage_entered_at?: string | null
          stage_id: string
          ultimo_contato?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          canal_origem?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          hubspot_id?: number | null
          id?: string
          is_won?: boolean | null
          motivo_perda?: string | null
          name?: string
          owner_id?: string | null
          pipeline_id?: string
          product?: string
          qualification_status?: string
          stage_entered_at?: string | null
          stage_id?: string
          ultimo_contato?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string | null
          delay_days: number
          id: string
          is_active: boolean
          product: string
          sequence_order: number
          subject: string
        }
        Insert: {
          body_html: string
          created_at?: string | null
          delay_days?: number
          id?: string
          is_active?: boolean
          product?: string
          sequence_order: number
          subject: string
        }
        Update: {
          body_html?: string
          created_at?: string | null
          delay_days?: number
          id?: string
          is_active?: boolean
          product?: string
          sequence_order?: number
          subject?: string
        }
        Relationships: []
      }
      form_fields: {
        Row: {
          created_at: string | null
          display_order: number
          field_name: string
          field_type: string
          form_id: string
          id: string
          is_hidden: boolean
          label: string
          maps_to: string | null
          options: Json | null
          placeholder: string | null
          required: boolean
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          field_name: string
          field_type?: string
          form_id: string
          id?: string
          is_hidden?: boolean
          label: string
          maps_to?: string | null
          options?: Json | null
          placeholder?: string | null
          required?: boolean
        }
        Update: {
          created_at?: string | null
          display_order?: number
          field_name?: string
          field_type?: string
          form_id?: string
          id?: string
          is_hidden?: boolean
          label?: string
          maps_to?: string | null
          options?: Json | null
          placeholder?: string | null
          required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_metrics"
            referencedColumns: ["form_id"]
          },
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          contact_id: string | null
          deal_id: string | null
          form_id: string
          id: string
          ip_address: string | null
          page_url: string | null
          qualification_result: string | null
          raw_data: Json
          referrer: string | null
          submitted_at: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          contact_id?: string | null
          deal_id?: string | null
          form_id: string
          id?: string
          ip_address?: string | null
          page_url?: string | null
          qualification_result?: string | null
          raw_data?: Json
          referrer?: string | null
          submitted_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          contact_id?: string | null
          deal_id?: string | null
          form_id?: string
          id?: string
          ip_address?: string | null
          page_url?: string | null
          qualification_result?: string | null
          raw_data?: Json
          referrer?: string | null
          submitted_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_metrics"
            referencedColumns: ["form_id"]
          },
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          notify_emails: string[] | null
          product: string
          redirect_url: string | null
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          notify_emails?: string[] | null
          product?: string
          redirect_url?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notify_emails?: string[] | null
          product?: string
          redirect_url?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ig_poll_state: {
        Row: {
          automation_id: string
          created_at: string | null
          id: number
          phase: string
          post_id: string
          request_id: number
        }
        Insert: {
          automation_id: string
          created_at?: string | null
          id?: number
          phase?: string
          post_id: string
          request_id: number
        }
        Update: {
          automation_id?: string
          created_at?: string | null
          id?: number
          phase?: string
          post_id?: string
          request_id?: number
        }
        Relationships: []
      }
      instagram_automations: {
        Row: {
          comment_reply: string
          created_at: string | null
          dm_link: string | null
          dm_message: string
          id: string
          is_active: boolean
          keyword: string
          post_id: string | null
          post_url: string
          replies_count: number
          updated_at: string | null
        }
        Insert: {
          comment_reply: string
          created_at?: string | null
          dm_link?: string | null
          dm_message: string
          id?: string
          is_active?: boolean
          keyword?: string
          post_id?: string | null
          post_url: string
          replies_count?: number
          updated_at?: string | null
        }
        Update: {
          comment_reply?: string
          created_at?: string | null
          dm_link?: string | null
          dm_message?: string
          id?: string
          is_active?: boolean
          keyword?: string
          post_id?: string | null
          post_url?: string
          replies_count?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      instagram_comment_logs: {
        Row: {
          automation_id: string
          comment_id: string
          comment_text: string | null
          commenter_ig_id: string | null
          commenter_username: string | null
          contact_id: string | null
          dm_error: string | null
          dm_sent: boolean
          id: string
          replied_at: string | null
        }
        Insert: {
          automation_id: string
          comment_id: string
          comment_text?: string | null
          commenter_ig_id?: string | null
          commenter_username?: string | null
          contact_id?: string | null
          dm_error?: string | null
          dm_sent?: boolean
          id?: string
          replied_at?: string | null
        }
        Update: {
          automation_id?: string
          comment_id?: string
          comment_text?: string | null
          commenter_ig_id?: string | null
          commenter_username?: string | null
          contact_id?: string | null
          dm_error?: string | null
          dm_sent?: boolean
          id?: string
          replied_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_comment_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "instagram_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_comment_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_comment_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean
          message: string | null
          related_contact_id: string | null
          related_deal_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          related_contact_id?: string | null
          related_deal_id?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          related_contact_id?: string | null
          related_deal_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_contact_id_fkey"
            columns: ["related_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_contact_id_fkey"
            columns: ["related_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_deal_id_fkey"
            columns: ["related_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_deal_id_fkey"
            columns: ["related_deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string | null
          id: string
          name: string
          product: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          product?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          product?: string
        }
        Relationships: []
      }
      receita_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          metric: string | null
          priority: string | null
          product: string | null
          source_context: string | null
          status: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metric?: string | null
          priority?: string | null
          product?: string | null
          source_context?: string | null
          status?: string
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metric?: string | null
          priority?: string | null
          product?: string | null
          source_context?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      stages: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          pipeline_id: string
          probability: number
        }
        Insert: {
          created_at?: string | null
          display_order: number
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          pipeline_id: string
          probability?: number
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
          pipeline_id?: string
          probability?: number
        }
        Relationships: [
          {
            foreignKeyName: "stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      stale_alert_configs: {
        Row: {
          id: string
          is_active: boolean
          pipeline_id: string
          stage_id: string
          threshold_days: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          pipeline_id: string
          stage_id: string
          threshold_days?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          pipeline_id?: string
          stage_id?: string
          threshold_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "stale_alert_configs_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stale_alert_configs_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          contact_id: string | null
          created_at: string | null
          data_venda: string
          email: string | null
          forma_pagamento: string | null
          hubspot_stage: string | null
          id: string
          nome: string
          parcelas: number | null
          produto: string
          status: string
          valor: number
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          data_venda: string
          email?: string | null
          forma_pagamento?: string | null
          hubspot_stage?: string | null
          id?: string
          nome: string
          parcelas?: number | null
          produto: string
          status?: string
          valor?: number
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          data_venda?: string
          email?: string | null
          forma_pagamento?: string | null
          hubspot_stage?: string | null
          id?: string
          nome?: string
          parcelas?: number | null
          produto?: string
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      avg_time_in_stage: {
        Row: {
          avg_days: number | null
          display_order: number | null
          product: string | null
          stage_name: string | null
          transitions: number | null
        }
        Relationships: []
      }
      contacts_full: {
        Row: {
          active_deals_count: number | null
          activities_count: number | null
          address: string | null
          area_atuacao: string | null
          cargo: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          days_since_creation: number | null
          days_since_last_activity: number | null
          deals_count: number | null
          email: string | null
          faixa_de_faturamento: string | null
          first_conversion: string | null
          first_conversion_date: string | null
          first_name: string | null
          fonte_registro: string | null
          full_name: string | null
          hubspot_id: number | null
          hubspot_owner: string | null
          id: string | null
          instagram_opt_in: boolean | null
          last_activity_at: string | null
          last_activity_date: string | null
          last_activity_subject: string | null
          last_activity_type: string | null
          last_deal_amount: number | null
          last_deal_name: string | null
          last_deal_product: string | null
          last_deal_stage: string | null
          last_name: string | null
          lead_status: string | null
          lifecycle_stage: string | null
          linkedin_url: string | null
          lost_deals_count: number | null
          manychat_id: string | null
          marketing_status: string | null
          motivo_para_aprender_ia: string | null
          numero_de_liderados: string | null
          objetivo_com_a_comunidade: string | null
          owner_id: string | null
          phone: string | null
          produto_interesse: string[] | null
          renda_mensal: string | null
          state: string | null
          total_deal_value: number | null
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          website_url: string | null
          whatsapp: string | null
          whatsapp_opt_in: boolean | null
          won_deal_value: number | null
          won_deals_count: number | null
          zip_code: string | null
        }
        Relationships: []
      }
      deals_full: {
        Row: {
          amount: number | null
          canal_origem: string | null
          closed_at: string | null
          contact_company: string | null
          contact_email: string | null
          contact_first_name: string | null
          contact_id: string | null
          contact_last_name: string | null
          contact_phone: string | null
          created_at: string | null
          days_in_stage: number | null
          hubspot_id: number | null
          id: string | null
          is_won: boolean | null
          motivo_perda: string | null
          name: string | null
          owner_id: string | null
          pipeline_id: string | null
          pipeline_name: string | null
          product: string | null
          qualification_status: string | null
          stage_entered_at: string | null
          stage_id: string | null
          stage_name: string | null
          stage_order: number | null
          stage_probability: number | null
          ultimo_contato: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      form_metrics: {
        Row: {
          form_id: string | null
          form_name: string | null
          last_submission_at: string | null
          product: string | null
          slug: string | null
          submissions_last_30d: number | null
          submissions_last_7d: number | null
          total_submissions: number | null
          unique_sources: number | null
        }
        Relationships: []
      }
      mql_volume: {
        Row: {
          mql_count: number | null
          product: string | null
          total_count: number | null
          week: string | null
        }
        Relationships: []
      }
      product_metrics: {
        Row: {
          active_deals: number | null
          avg_deal_size: number | null
          lost_deals: number | null
          pipeline_value: number | null
          product: string | null
          win_rate: number | null
          won_deals: number | null
        }
        Relationships: []
      }
      stage_conversion: {
        Row: {
          deal_count: number | null
          display_order: number | null
          product: string | null
          stage_name: string | null
          total_amount: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_secret: {
        Args: { new_secret: string; secret_name: string }
        Returns: undefined
      }
      get_secret: { Args: { secret_name: string }; Returns: string }
      get_secrets: {
        Args: { secret_names: string[] }
        Returns: {
          name: string
          secret: string
        }[]
      }
      ig_poll_phase1: { Args: never; Returns: number }
      ig_poll_phase2: { Args: never; Returns: Json }
      increment_replies_count: {
        Args: { automation_uuid: string }
        Returns: undefined
      }
      poll_ig_comments: { Args: never; Returns: Json }
      process_ig_comment: {
        Args: {
          p_comment_id: string
          p_comment_text: string
          p_media_id: string
          p_user_id: string
          p_username: string
        }
        Returns: Json
      }
      qualify_academy: { Args: { p_contact_id: string }; Returns: string }
      qualify_business: { Args: { p_contact_id: string }; Returns: string }
      qualify_contact: {
        Args: { p_contact_id: string; p_product: string }
        Returns: string
      }
      qualify_skills: { Args: { p_contact_id: string }; Returns: string }
      update_secret: {
        Args: { new_secret: string; secret_name: string }
        Returns: undefined
      }
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
    Enums: {},
  },
} as const
