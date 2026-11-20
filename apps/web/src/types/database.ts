export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      admins: {
        Row: {
          created_at: string
          full_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          address: string | null
          cnic: string | null
          created_at: string
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          fee_amount: number
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          join_date: string
          member_code: number
          next_due_date: string
          notes: string | null
          phone: string
          photo_public_id: string | null
          plan_id: string | null
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnic?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          fee_amount: number
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          join_date?: string
          member_code?: never
          next_due_date: string
          notes?: string | null
          phone: string
          photo_public_id?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnic?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          fee_amount?: number
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          join_date?: string
          member_code?: never
          next_due_date?: string
          notes?: string | null
          phone?: string
          photo_public_id?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          member_id: string
          method: Database["public"]["Enums"]["payment_method"]
          months: number | null
          note: string | null
          paid_on: string
          period_end: string | null
          period_start: string | null
          received_by: string | null
          type: Database["public"]["Enums"]["payment_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          member_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          months?: number | null
          note?: string | null
          paid_on?: string
          period_end?: string | null
          period_start?: string | null
          received_by?: string | null
          type?: Database["public"]["Enums"]["payment_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          member_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          months?: number | null
          note?: string | null
          paid_on?: string
          period_end?: string | null
          period_start?: string | null
          received_by?: string | null
          type?: Database["public"]["Enums"]["payment_type"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          duration_months: number
          id: string
          is_active: boolean
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          duration_months: number
          id?: string
          is_active?: boolean
          name: string
          price: number
        }
        Update: {
          created_at?: string
          duration_months?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
        }
        Relationships: []
      }
      reminders: {
        Row: {
          channel: string
          created_at: string
          due_date: string
          error: string | null
          id: string
          kind: Database["public"]["Enums"]["reminder_kind"]
          member_id: string
          message: string
          provider: string
          provider_message_id: string | null
          sent_at: string | null
          sequence: number
          status: Database["public"]["Enums"]["reminder_status"]
        }
        Insert: {
          channel?: string
          created_at?: string
          due_date: string
          error?: string | null
          id?: string
          kind: Database["public"]["Enums"]["reminder_kind"]
          member_id: string
          message: string
          provider: string
          provider_message_id?: string | null
          sent_at?: string | null
          sequence?: number
          status?: Database["public"]["Enums"]["reminder_status"]
        }
        Update: {
          channel?: string
          created_at?: string
          due_date?: string
          error?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["reminder_kind"]
          member_id?: string
          message?: string
          provider?: string
          provider_message_id?: string | null
          sent_at?: string | null
          sequence?: number
          status?: Database["public"]["Enums"]["reminder_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reminders_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          currency: string
          gym_name: string
          gym_phone: string | null
          id: number
          overdue_max_reminders: number
          overdue_repeat_days: number
          reminder_days_before: number[]
          template_before_due: string
          template_on_due: string
          template_overdue: string
          template_receipt: string
          timezone: string
          upcoming_window_days: number
          updated_at: string
          whatsapp_provider: string
        }
        Insert: {
          currency?: string
          gym_name?: string
          gym_phone?: string | null
          id?: number
          overdue_max_reminders?: number
          overdue_repeat_days?: number
          reminder_days_before?: number[]
          template_before_due?: string
          template_on_due?: string
          template_overdue?: string
          template_receipt?: string
          timezone?: string
          upcoming_window_days?: number
          updated_at?: string
          whatsapp_provider?: string
        }
        Update: {
          currency?: string
          gym_name?: string
          gym_phone?: string | null
          id?: number
          overdue_max_reminders?: number
          overdue_repeat_days?: number
          reminder_days_before?: number[]
          template_before_due?: string
          template_on_due?: string
          template_overdue?: string
          template_receipt?: string
          timezone?: string
          upcoming_window_days?: number
          updated_at?: string
          whatsapp_provider?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analytics_summary: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      dashboard_stats: { Args: { p_month?: string }; Returns: Json }
      generate_reminders: { Args: { p_today?: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      missed_cycles: {
        Args: { p_due: string; p_duration_months: number; p_today: string }
        Returns: number
      }
      record_payment: {
        Args: {
          p_amount: number
          p_member_id: string
          p_method?: Database["public"]["Enums"]["payment_method"]
          p_months?: number
          p_note?: string
          p_paid_on?: string
          p_type?: Database["public"]["Enums"]["payment_type"]
        }
        Returns: {
          amount: number
          created_at: string
          id: string
          member_id: string
          method: Database["public"]["Enums"]["payment_method"]
          months: number | null
          note: string | null
          paid_on: string
          period_end: string | null
          period_start: string | null
          received_by: string | null
          type: Database["public"]["Enums"]["payment_type"]
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      render_member_message: {
        Args: {
          m: Database["public"]["Tables"]["members"]["Row"]
          p_template: string
          s: Database["public"]["Tables"]["settings"]["Row"]
        }
        Returns: string
      }
      top_overdue: {
        Args: { p_limit?: number }
        Returns: {
          amount_due: number
          cycles: number
          days_overdue: number
          full_name: string
          id: string
          member_code: number
          next_due_date: string
          phone: string
          photo_public_id: string
        }[]
      }
      undo_payment: { Args: { p_payment_id: string }; Returns: undefined }
    }
    Enums: {
      gender_type: "male" | "female" | "other"
      member_status: "active" | "paused" | "left"
      payment_method:
        | "cash"
        | "bank"
        | "jazzcash"
        | "easypaisa"
        | "card"
        | "other"
      payment_type: "membership" | "admission" | "personal_training" | "other"
      reminder_kind: "before_due" | "on_due" | "overdue" | "receipt"
      reminder_status: "pending" | "sent" | "failed" | "skipped"
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
      gender_type: ["male", "female", "other"],
      member_status: ["active", "paused", "left"],
      payment_method: [
        "cash",
        "bank",
        "jazzcash",
        "easypaisa",
        "card",
        "other",
      ],
      payment_type: ["membership", "admission", "personal_training", "other"],
      reminder_kind: ["before_due", "on_due", "overdue", "receipt"],
      reminder_status: ["pending", "sent", "failed", "skipped"],
    },
  },
} as const

