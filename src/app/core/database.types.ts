// Generado con el MCP de Supabase (generate_typescript_types). No editar a mano:
// si cambia el esquema, volver a generarlo.
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
      accounts: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_archived: boolean
          name: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          name: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_rules: {
        Row: {
          bucket: Database["public"]["Enums"]["budget_bucket"]
          created_at: string
          id: string
          percent: number
          user_id: string
          valid_from: string
        }
        Insert: {
          bucket: Database["public"]["Enums"]["budget_bucket"]
          created_at?: string
          id?: string
          percent: number
          user_id?: string
          valid_from?: string
        }
        Update: {
          bucket?: Database["public"]["Enums"]["budget_bucket"]
          created_at?: string
          id?: string
          percent?: number
          user_id?: string
          valid_from?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          bucket: Database["public"]["Enums"]["budget_bucket"] | null
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_archived: boolean
          kind: Database["public"]["Enums"]["tx_kind"]
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket?: Database["public"]["Enums"]["budget_bucket"] | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          kind: Database["public"]["Enums"]["tx_kind"]
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          bucket?: Database["public"]["Enums"]["budget_bucket"] | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          kind?: Database["public"]["Enums"]["tx_kind"]
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goal_contributions: {
        Row: {
          amount: number
          contributed_on: string
          created_at: string
          goal_id: string
          id: string
          note: string | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          contributed_on?: string
          created_at?: string
          goal_id: string
          id?: string
          note?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          contributed_on?: string
          created_at?: string
          goal_id?: string
          id?: string
          note?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          name: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          name: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          name?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          account_id: string | null
          created_at: string
          end_on: string
          entity: string
          id: string
          notes: string | null
          payout_frequency: Database["public"]["Enums"]["payout_frequency"]
          principal: number
          product: string
          rate_ea: number
          start_on: string
          status: Database["public"]["Enums"]["investment_status"]
          updated_at: string
          user_id: string
          withholding_rate: number
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          end_on: string
          entity: string
          id?: string
          notes?: string | null
          payout_frequency?: Database["public"]["Enums"]["payout_frequency"]
          principal: number
          product?: string
          rate_ea: number
          start_on: string
          status?: Database["public"]["Enums"]["investment_status"]
          updated_at?: string
          user_id?: string
          withholding_rate?: number
        }
        Update: {
          account_id?: string | null
          created_at?: string
          end_on?: string
          entity?: string
          id?: string
          notes?: string | null
          payout_frequency?: Database["public"]["Enums"]["payout_frequency"]
          principal?: number
          product?: string
          rate_ea?: number
          start_on?: string
          status?: Database["public"]["Enums"]["investment_status"]
          updated_at?: string
          user_id?: string
          withholding_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "investments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      receivable_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          paid_on: string
          receivable_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          paid_on?: string
          receivable_id: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          paid_on?: string
          receivable_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivable_payments_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount: number
          created_at: string
          due_on: string | null
          id: string
          lent_on: string
          notes: string | null
          person: string
          status: Database["public"]["Enums"]["receivable_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_on?: string | null
          id?: string
          lent_on?: string
          notes?: string | null
          person: string
          status?: Database["public"]["Enums"]["receivable_status"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_on?: string | null
          id?: string
          lent_on?: string
          notes?: string | null
          person?: string
          status?: Database["public"]["Enums"]["receivable_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          import_hash: string | null
          kind: Database["public"]["Enums"]["tx_kind"]
          occurred_on: string
          source: string
          to_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          import_hash?: string | null
          kind: Database["public"]["Enums"]["tx_kind"]
          occurred_on?: string
          source?: string
          to_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          import_hash?: string | null
          kind?: Database["public"]["Enums"]["tx_kind"]
          occurred_on?: string
          source?: string
          to_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      monthly_summary: {
        Row: {
          bucket: Database["public"]["Enums"]["budget_bucket"] | null
          kind: Database["public"]["Enums"]["tx_kind"] | null
          month: string | null
          total: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type: "cash" | "savings" | "checking" | "wallet" | "investment"
      budget_bucket: "ahorro" | "fijos" | "gustos" | "regalos"
      investment_status: "active" | "matured" | "cancelled"
      payout_frequency: "monthly" | "quarterly" | "semiannual" | "at_maturity"
      receivable_status: "pending" | "partial" | "paid" | "written_off"
      tx_kind: "income" | "expense" | "transfer"
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
    Enums: {
      account_type: ["cash", "savings", "checking", "wallet", "investment"],
      budget_bucket: ["ahorro", "fijos", "gustos", "regalos"],
      investment_status: ["active", "matured", "cancelled"],
      payout_frequency: ["monthly", "quarterly", "semiannual", "at_maturity"],
      receivable_status: ["pending", "partial", "paid", "written_off"],
      tx_kind: ["income", "expense", "transfer"],
    },
  },
} as const
