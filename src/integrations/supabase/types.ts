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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          current_stage: string | null
          decay_event_id: string | null
          id: string
          is_read: boolean | null
          item_id: string | null
          item_title: string | null
          owner_id: string
          reason: string
          semantic_score: number | null
          simulated_year: number
          storage_pressure: number | null
          target_stage: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          current_stage?: string | null
          decay_event_id?: string | null
          id?: string
          is_read?: boolean | null
          item_id?: string | null
          item_title?: string | null
          owner_id: string
          reason: string
          semantic_score?: number | null
          simulated_year: number
          storage_pressure?: number | null
          target_stage?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          current_stage?: string | null
          decay_event_id?: string | null
          id?: string
          is_read?: boolean | null
          item_id?: string | null
          item_title?: string | null
          owner_id?: string
          reason?: string
          semantic_score?: number | null
          simulated_year?: number
          storage_pressure?: number | null
          target_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_decay_event_id_fkey"
            columns: ["decay_event_id"]
            isOneToOne: false
            referencedRelation: "decay_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "archive_items"
            referencedColumns: ["id"]
          },
        ]
      }
      archive_items: {
        Row: {
          compressed_content: string | null
          content: string | null
          created_at: string | null
          current_size_kb: number
          embedding: string | null
          id: string
          ingested_at: string | null
          item_type: string
          minimal_json: Json | null
          original_date: string | null
          owner_id: string
          semantic_score: number | null
          size_kb: number
          source_url: string | null
          stage: string
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          val_reconstructability: number | null
          val_relevance: number | null
          val_uniqueness: number | null
        }
        Insert: {
          compressed_content?: string | null
          content?: string | null
          created_at?: string | null
          current_size_kb: number
          embedding?: string | null
          id?: string
          ingested_at?: string | null
          item_type: string
          minimal_json?: Json | null
          original_date?: string | null
          owner_id: string
          semantic_score?: number | null
          size_kb: number
          source_url?: string | null
          stage?: string
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          val_reconstructability?: number | null
          val_relevance?: number | null
          val_uniqueness?: number | null
        }
        Update: {
          compressed_content?: string | null
          content?: string | null
          created_at?: string | null
          current_size_kb?: number
          embedding?: string | null
          id?: string
          ingested_at?: string | null
          item_type?: string
          minimal_json?: Json | null
          original_date?: string | null
          owner_id?: string
          semantic_score?: number | null
          size_kb?: number
          source_url?: string | null
          stage?: string
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          val_reconstructability?: number | null
          val_relevance?: number | null
          val_uniqueness?: number | null
        }
        Relationships: []
      }
      baseline_results: {
        Row: {
          created_at: string | null
          id: string
          items_remaining: number | null
          knowledge_coverage: number | null
          owner_id: string
          reconstruction_quality: number | null
          retrieval_quality: number | null
          semantic_diversity: number | null
          simulation_year: number
          storage_efficiency: number | null
          strategy: string
          total_size_kb: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          items_remaining?: number | null
          knowledge_coverage?: number | null
          owner_id: string
          reconstruction_quality?: number | null
          retrieval_quality?: number | null
          semantic_diversity?: number | null
          simulation_year: number
          storage_efficiency?: number | null
          strategy: string
          total_size_kb?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          items_remaining?: number | null
          knowledge_coverage?: number | null
          owner_id?: string
          reconstruction_quality?: number | null
          retrieval_quality?: number | null
          semantic_diversity?: number | null
          simulation_year?: number
          storage_efficiency?: number | null
          strategy?: string
          total_size_kb?: number | null
        }
        Relationships: []
      }
      decay_events: {
        Row: {
          capacity_after_kb: number
          capacity_before_kb: number
          created_at: string | null
          event_no: number
          id: string
          items_affected: number | null
          owner_id: string
          simulated_year: number
          storage_after_kb: number
          storage_before_kb: number
        }
        Insert: {
          capacity_after_kb: number
          capacity_before_kb: number
          created_at?: string | null
          event_no: number
          id?: string
          items_affected?: number | null
          owner_id: string
          simulated_year: number
          storage_after_kb: number
          storage_before_kb: number
        }
        Update: {
          capacity_after_kb?: number
          capacity_before_kb?: number
          created_at?: string | null
          event_no?: number
          id?: string
          items_affected?: number | null
          owner_id?: string
          simulated_year?: number
          storage_after_kb?: number
          storage_before_kb?: number
        }
        Relationships: []
      }
      degradation_logs: {
        Row: {
          created_at: string | null
          decay_event_id: string | null
          id: string
          item_id: string | null
          item_title: string | null
          new_stage: string
          owner_id: string
          prev_stage: string
          reason: string
          reconstructability_score: number | null
          redundancy_score: number | null
          semantic_score: number | null
          size_after_kb: number | null
          size_before_kb: number | null
          storage_pressure: number | null
        }
        Insert: {
          created_at?: string | null
          decay_event_id?: string | null
          id?: string
          item_id?: string | null
          item_title?: string | null
          new_stage: string
          owner_id: string
          prev_stage: string
          reason: string
          reconstructability_score?: number | null
          redundancy_score?: number | null
          semantic_score?: number | null
          size_after_kb?: number | null
          size_before_kb?: number | null
          storage_pressure?: number | null
        }
        Update: {
          created_at?: string | null
          decay_event_id?: string | null
          id?: string
          item_id?: string | null
          item_title?: string | null
          new_stage?: string
          owner_id?: string
          prev_stage?: string
          reason?: string
          reconstructability_score?: number | null
          redundancy_score?: number | null
          semantic_score?: number | null
          size_after_kb?: number | null
          size_before_kb?: number | null
          storage_pressure?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "degradation_logs_decay_event_id_fkey"
            columns: ["decay_event_id"]
            isOneToOne: false
            referencedRelation: "decay_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "degradation_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "archive_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      query_logs: {
        Row: {
          created_at: string | null
          id: string
          owner_id: string
          query: string
          response: string | null
          sources_used: Json | null
          uncertainty: string | null
          used_degraded_data: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          owner_id: string
          query: string
          response?: string | null
          sources_used?: Json | null
          uncertainty?: string | null
          used_degraded_data?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          owner_id?: string
          query?: string
          response?: string | null
          sources_used?: Json | null
          uncertainty?: string | null
          used_degraded_data?: boolean | null
        }
        Relationships: []
      }
      simulation_settings: {
        Row: {
          created_at: string | null
          current_capacity_kb: number
          current_year: number
          decay_interval_years: number
          decay_percent: number
          id: string
          is_running: boolean | null
          owner_id: string
          start_capacity_kb: number
          time_scale_ms: number | null
          total_years: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_capacity_kb?: number
          current_year?: number
          decay_interval_years?: number
          decay_percent?: number
          id?: string
          is_running?: boolean | null
          owner_id: string
          start_capacity_kb?: number
          time_scale_ms?: number | null
          total_years?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_capacity_kb?: number
          current_year?: number
          decay_interval_years?: number
          decay_percent?: number
          id?: string
          is_running?: boolean | null
          owner_id?: string
          start_capacity_kb?: number
          time_scale_ms?: number | null
          total_years?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      valuation_weights: {
        Row: {
          created_at: string | null
          id: string
          owner_id: string
          updated_at: string | null
          weight_reconstructability: number
          weight_relevance: number
          weight_uniqueness: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          owner_id: string
          updated_at?: string | null
          weight_reconstructability?: number
          weight_relevance?: number
          weight_uniqueness?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          owner_id?: string
          updated_at?: string | null
          weight_reconstructability?: number
          weight_relevance?: number
          weight_uniqueness?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_archive_items: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_owner_id?: string
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          semantic_score: number
          similarity: number
          stage: string
          summary: string
          title: string
        }[]
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
