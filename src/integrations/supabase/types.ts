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
          cargo: string | null
          company: string | null
          created_at: string | null
          email: string | null
          faixa_de_faturamento: string | null
          first_name: string
          hubspot_id: number | null
          id: string
          last_name: string | null
          manychat_id: string | null
          motivo_para_aprender_ia: string | null
          numero_de_liderados: string | null
          objetivo_com_a_comunidade: string | null
          owner_id: string | null
          phone: string | null
          produto_interesse:
            | Database["public"]["Enums"]["product_type"][]
            | null
          renda_mensal: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          whatsapp_opt_in: boolean
        }
        Insert: {
          cargo?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          faixa_de_faturamento?: string | null
          first_name: string
          hubspot_id?: number | null
          id?: string
          last_name?: string | null
          manychat_id?: string | null
          motivo_para_aprender_ia?: string | null
          numero_de_liderados?: string | null
          objetivo_com_a_comunidade?: string | null
          owner_id?: string | null
          phone?: string | null
          produto_interesse?:
            | Database["public"]["Enums"]["product_type"][]
            | null
          renda_mensal?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp_opt_in?: boolean
        }
        Update: {
          cargo?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          faixa_de_faturamento?: string | null
          first_name?: string
          hubspot_id?: number | null
          id?: string
          last_name?: string | null
          manychat_id?: string | null
          motivo_para_aprender_ia?: string | null
          numero_de_liderados?: string | null
          objetivo_com_a_comunidade?: string | null
          owner_id?: string | null
          phone?: string | null
          produto_interesse?:
            | Database["public"]["Enums"]["product_type"][]
            | null
          renda_mensal?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp_opt_in?: boolean
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
          product: Database["public"]["Enums"]["product_type"]
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
          product: Database["public"]["Enums"]["product_type"]
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
          product?: Database["public"]["Enums"]["product_type"]
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
          product: Database["public"]["Enums"]["product_type"]
          sequence_order: number
          subject: string
        }
        Insert: {
          body_html: string
          created_at?: string | null
          delay_days?: number
          id?: string
          is_active?: boolean
          product: Database["public"]["Enums"]["product_type"]
          sequence_order: number
          subject: string
        }
        Update: {
          body_html?: string
          created_at?: string | null
          delay_days?: number
          id?: string
          is_active?: boolean
          product?: Database["public"]["Enums"]["product_type"]
          sequence_order?: number
          subject?: string
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
          product: Database["public"]["Enums"]["product_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          product: Database["public"]["Enums"]["product_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          product?: Database["public"]["Enums"]["product_type"]
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
    }
    Views: {
      avg_time_in_stage: {
        Row: {
          avg_days: number | null
          display_order: number | null
          product: Database["public"]["Enums"]["product_type"] | null
          stage_name: string | null
          transitions: number | null
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
          product: Database["public"]["Enums"]["product_type"] | null
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
      mql_volume: {
        Row: {
          mql_count: number | null
          product: Database["public"]["Enums"]["product_type"] | null
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
          product: Database["public"]["Enums"]["product_type"] | null
          win_rate: number | null
          won_deals: number | null
        }
        Relationships: []
      }
      stage_conversion: {
        Row: {
          deal_count: number | null
          display_order: number | null
          product: Database["public"]["Enums"]["product_type"] | null
          stage_name: string | null
          total_amount: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      qualify_academy: { Args: { p_contact_id: string }; Returns: string }
      qualify_business: { Args: { p_contact_id: string }; Returns: string }
      qualify_contact: {
        Args: {
          p_contact_id: string
          p_product: Database["public"]["Enums"]["product_type"]
        }
        Returns: string
      }
      qualify_skills: { Args: { p_contact_id: string }; Returns: string }
    }
    Enums: {
      product_type: "business" | "skills" | "academy"
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
      product_type: ["business", "skills", "academy"],
    },
  },
} as const
