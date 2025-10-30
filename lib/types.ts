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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      companies: {
        Row: {
          base_pay: number | null
          created_at: string | null
          default_cpm: number | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          base_pay?: number | null
          created_at?: string | null
          default_cpm?: number | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          base_pay?: number | null
          created_at?: string | null
          default_cpm?: number | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      creators: {
        Row: {
          base_pay: number | null
          company_id: string
          cpm: number | null
          created_at: string | null
          email: string | null
          id: string
          instagram_handle: string | null
          invite_accepted_at: string | null
          invite_token: string | null
          is_active: boolean | null
          name: string
          niche_id: string | null
          notes: string | null
          phone: string | null
          tiktok_handle: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          base_pay?: number | null
          company_id: string
          cpm?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          instagram_handle?: string | null
          invite_accepted_at?: string | null
          invite_token?: string | null
          is_active?: boolean | null
          name: string
          niche_id?: string | null
          notes?: string | null
          phone?: string | null
          tiktok_handle?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          base_pay?: number | null
          company_id?: string
          cpm?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          instagram_handle?: string | null
          invite_accepted_at?: string | null
          invite_token?: string | null
          is_active?: boolean | null
          name?: string
          niche_id?: string | null
          notes?: string | null
          phone?: string | null
          tiktok_handle?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creators_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creators_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
        ]
      }
      niches: {
        Row: {
          base_pay: number | null
          company_id: string
          cpm: number | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          base_pay?: number | null
          company_id: string
          cpm?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          base_pay?: number | null
          company_id?: string
          cpm?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "niches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_tiers: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          creator_id: string | null
          description: string | null
          id: string
          niche_id: string | null
          tier_name: string
          updated_at: string | null
          view_count_threshold: number
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          niche_id?: string | null
          tier_name?: string
          updated_at?: string | null
          view_count_threshold?: number
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          niche_id?: string | null
          tier_name?: string
          updated_at?: string | null
          view_count_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_tiers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_tiers_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_tiers_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      video_feedback: {
        Row: {
          admin_id: string
          created_at: string | null
          feedback: string
          id: string
          updated_at: string | null
          video_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          feedback: string
          id?: string
          updated_at?: string | null
          video_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          feedback?: string
          id?: string
          updated_at?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_feedback_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_feedback_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_tier_payments: {
        Row: {
          base_payment: number | null
          cpm_payment: number | null
          created_at: string | null
          id: string
          paid: boolean | null
          paid_at: string | null
          payment_amount: number | null
          reached: boolean | null
          tier_amount_payment: number | null
          tier_id: string
          updated_at: string | null
          video_id: string
        }
        Insert: {
          base_payment?: number | null
          cpm_payment?: number | null
          created_at?: string | null
          id?: string
          paid?: boolean | null
          paid_at?: string | null
          payment_amount?: number | null
          reached?: boolean | null
          tier_amount_payment?: number | null
          tier_id: string
          updated_at?: string | null
          video_id: string
        }
        Update: {
          base_payment?: number | null
          cpm_payment?: number | null
          created_at?: string | null
          id?: string
          paid?: boolean | null
          paid_at?: string | null
          payment_amount?: number | null
          reached?: boolean | null
          tier_amount_payment?: number | null
          tier_id?: string
          updated_at?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_tier_payments_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "payment_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_tier_payments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          approved_at: string | null
          base_cpm_paid: boolean | null
          base_cpm_paid_at: string | null
          base_payment_amount: number | null
          comments: number | null
          company_id: string
          cpm_payment_amount: number | null
          created_at: string | null
          creator_id: string
          description: string | null
          id: string
          likes: number | null
          platform: string | null
          status: Database["public"]["Enums"]["video_status"] | null
          submitted_at: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_url: string | null
          views: number | null
        }
        Insert: {
          approved_at?: string | null
          base_cpm_paid?: boolean | null
          base_cpm_paid_at?: string | null
          base_payment_amount?: number | null
          comments?: number | null
          company_id: string
          cpm_payment_amount?: number | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          id?: string
          likes?: number | null
          platform?: string | null
          status?: Database["public"]["Enums"]["video_status"] | null
          submitted_at?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_url?: string | null
          views?: number | null
        }
        Update: {
          approved_at?: string | null
          base_cpm_paid?: boolean | null
          base_cpm_paid_at?: string | null
          base_payment_amount?: number | null
          comments?: number | null
          company_id?: string
          cpm_payment_amount?: number | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          id?: string
          likes?: number | null
          platform?: string | null
          status?: Database["public"]["Enums"]["video_status"] | null
          submitted_at?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      regenerate_video_tier_payments: {
        Args: { p_video_id: string }
        Returns: undefined
      }
      regenerate_video_tier_payments_batch: {
        Args: { p_video_ids: string[] }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "company_admin" | "creator"
      video_status: "pending" | "approved" | "rejected"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      user_role: ["company_admin", "creator"],
      video_status: ["pending", "approved", "rejected"],
    },
  },
} as const
