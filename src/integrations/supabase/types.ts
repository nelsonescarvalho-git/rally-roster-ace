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
      lineups: {
        Row: {
          created_at: string
          id: string
          match_id: string
          rot1: string | null
          rot2: string | null
          rot3: string | null
          rot4: string | null
          rot5: string | null
          rot6: string | null
          set_no: number
          side: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          rot1?: string | null
          rot2?: string | null
          rot3?: string | null
          rot4?: string | null
          rot5?: string | null
          rot6?: string | null
          set_no: number
          side: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          rot1?: string | null
          rot2?: string | null
          rot3?: string | null
          rot4?: string | null
          rot5?: string | null
          rot6?: string | null
          set_no?: number
          side?: string
        }
        Relationships: [
          {
            foreignKeyName: "lineups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineups_rot1_fkey"
            columns: ["rot1"]
            isOneToOne: false
            referencedRelation: "match_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineups_rot2_fkey"
            columns: ["rot2"]
            isOneToOne: false
            referencedRelation: "match_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineups_rot3_fkey"
            columns: ["rot3"]
            isOneToOne: false
            referencedRelation: "match_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineups_rot4_fkey"
            columns: ["rot4"]
            isOneToOne: false
            referencedRelation: "match_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineups_rot5_fkey"
            columns: ["rot5"]
            isOneToOne: false
            referencedRelation: "match_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineups_rot6_fkey"
            columns: ["rot6"]
            isOneToOne: false
            referencedRelation: "match_players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          created_at: string
          id: string
          jersey_number: number
          match_id: string
          name: string
          position: string | null
          side: string
          team_id: string
          team_player_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          jersey_number: number
          match_id: string
          name: string
          position?: string | null
          side: string
          team_id: string
          team_player_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          jersey_number?: number
          match_id?: string
          name?: string
          position?: string | null
          side?: string
          team_id?: string
          team_player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_team_player_id_fkey"
            columns: ["team_player_id"]
            isOneToOne: false
            referencedRelation: "team_players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_name: string
          away_team_id: string | null
          created_at: string
          first_serve_side: string
          home_name: string
          home_team_id: string | null
          id: string
          match_date: string
          set5_serve_side: string | null
          title: string
        }
        Insert: {
          away_name?: string
          away_team_id?: string | null
          created_at?: string
          first_serve_side?: string
          home_name?: string
          home_team_id?: string | null
          id?: string
          match_date?: string
          set5_serve_side?: string | null
          title: string
        }
        Update: {
          away_name?: string
          away_team_id?: string | null
          created_at?: string
          first_serve_side?: string
          home_name?: string
          home_team_id?: string | null
          id?: string
          match_date?: string
          set5_serve_side?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          id: string
          jersey_number: number
          match_id: string
          name: string
          position: string | null
          side: string
        }
        Insert: {
          created_at?: string
          id?: string
          jersey_number: number
          match_id: string
          name: string
          position?: string | null
          side: string
        }
        Update: {
          created_at?: string
          id?: string
          jersey_number?: number
          match_id?: string
          name?: string
          position?: string | null
          side?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      rallies: {
        Row: {
          a_code: number | null
          a_no: number | null
          a_pass_quality: number | null
          a_player_id: string | null
          b_code: number | null
          b1_no: number | null
          b1_player_id: string | null
          b2_no: number | null
          b2_player_id: string | null
          b3_no: number | null
          b3_player_id: string | null
          created_at: string
          d_code: number | null
          d_no: number | null
          d_player_id: string | null
          id: string
          k_phase: string | null
          kill_type: string | null
          match_id: string
          pass_code: number | null
          pass_destination: string | null
          phase: number
          point_won_by: string | null
          r_code: number | null
          r_no: number | null
          r_player_id: string | null
          rally_no: number
          reason: string | null
          recv_rot: number
          recv_side: string
          s_code: number | null
          s_no: number | null
          s_player_id: string | null
          serve_rot: number
          serve_side: string
          set_no: number
          setter_player_id: string | null
        }
        Insert: {
          a_code?: number | null
          a_no?: number | null
          a_pass_quality?: number | null
          a_player_id?: string | null
          b_code?: number | null
          b1_no?: number | null
          b1_player_id?: string | null
          b2_no?: number | null
          b2_player_id?: string | null
          b3_no?: number | null
          b3_player_id?: string | null
          created_at?: string
          d_code?: number | null
          d_no?: number | null
          d_player_id?: string | null
          id?: string
          k_phase?: string | null
          kill_type?: string | null
          match_id: string
          pass_code?: number | null
          pass_destination?: string | null
          phase?: number
          point_won_by?: string | null
          r_code?: number | null
          r_no?: number | null
          r_player_id?: string | null
          rally_no: number
          reason?: string | null
          recv_rot: number
          recv_side: string
          s_code?: number | null
          s_no?: number | null
          s_player_id?: string | null
          serve_rot: number
          serve_side: string
          set_no: number
          setter_player_id?: string | null
        }
        Update: {
          a_code?: number | null
          a_no?: number | null
          a_pass_quality?: number | null
          a_player_id?: string | null
          b_code?: number | null
          b1_no?: number | null
          b1_player_id?: string | null
          b2_no?: number | null
          b2_player_id?: string | null
          b3_no?: number | null
          b3_player_id?: string | null
          created_at?: string
          d_code?: number | null
          d_no?: number | null
          d_player_id?: string | null
          id?: string
          k_phase?: string | null
          kill_type?: string | null
          match_id?: string
          pass_code?: number | null
          pass_destination?: string | null
          phase?: number
          point_won_by?: string | null
          r_code?: number | null
          r_no?: number | null
          r_player_id?: string | null
          rally_no?: number
          reason?: string | null
          recv_rot?: number
          recv_side?: string
          s_code?: number | null
          s_no?: number | null
          s_player_id?: string | null
          serve_rot?: number
          serve_side?: string
          set_no?: number
          setter_player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rallies_a_player_id_fkey"
            columns: ["a_player_id"]
            isOneToOne: false
            referencedRelation: "match_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rallies_b1_player_id_fkey"
            columns: ["b1_player_id"]
            isOneToOne: false
            referencedRelation: "match_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rallies_b2_player_id_fkey"
            columns: ["b2_player_id"]
            isOneToOne: false
            referencedRelation: "match_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rallies_b3_player_id_fkey"
            columns: ["b3_player_id"]
            isOneToOne: false
            referencedRelation: "match_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rallies_d_player_id_fkey"
            columns: ["d_player_id"]
            isOneToOne: false
            referencedRelation: "match_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rallies_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rallies_r_player_id_fkey"
            columns: ["r_player_id"]
            isOneToOne: false
            referencedRelation: "match_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rallies_s_player_id_fkey"
            columns: ["s_player_id"]
            isOneToOne: false
            referencedRelation: "match_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rallies_setter_player_id_fkey"
            columns: ["setter_player_id"]
            isOneToOne: false
            referencedRelation: "match_players"
            referencedColumns: ["id"]
          },
        ]
      }
      substitutions: {
        Row: {
          created_at: string
          id: string
          is_libero: boolean
          match_id: string
          player_in_id: string
          player_out_id: string
          rally_no: number
          set_no: number
          side: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_libero?: boolean
          match_id: string
          player_in_id: string
          player_out_id: string
          rally_no: number
          set_no: number
          side: string
        }
        Update: {
          created_at?: string
          id?: string
          is_libero?: boolean
          match_id?: string
          player_in_id?: string
          player_out_id?: string
          rally_no?: number
          set_no?: number
          side?: string
        }
        Relationships: [
          {
            foreignKeyName: "substitutions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitutions_player_in_id_fkey"
            columns: ["player_in_id"]
            isOneToOne: false
            referencedRelation: "match_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "substitutions_player_out_id_fkey"
            columns: ["player_out_id"]
            isOneToOne: false
            referencedRelation: "match_players"
            referencedColumns: ["id"]
          },
        ]
      }
      team_players: {
        Row: {
          active: boolean
          created_at: string
          id: string
          jersey_number: number
          name: string
          position: string | null
          team_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          jersey_number: number
          name: string
          position?: string | null
          team_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          jersey_number?: number
          name?: string
          position?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
