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
      assignments: {
        Row: {
          activity_name: string | null
          approved_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string | null
          created_at: string | null
          date: string
          employee_ids: string[]
          end_time: string
          id: string
          job_type: string | null
          partner_approval_required: boolean | null
          partner_approved_by: string | null
          start_time: string
          status: string
          updated_at: string | null
        }
        Insert: {
          activity_name?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string | null
          created_at?: string | null
          date: string
          employee_ids?: string[]
          end_time?: string
          id?: string
          job_type?: string | null
          partner_approval_required?: boolean | null
          partner_approved_by?: string | null
          start_time?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          activity_name?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string | null
          created_at?: string | null
          date?: string
          employee_ids?: string[]
          end_time?: string
          id?: string
          job_type?: string | null
          partner_approval_required?: boolean | null
          partner_approved_by?: string | null
          start_time?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          client_code: string | null
          color_class: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          client_code?: string | null
          color_class?: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          client_code?: string | null
          color_class?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string | null
          date: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      leaves: {
        Row: {
          approved_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          employee_id: string
          end_date: string
          end_time: string | null
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          partner_approval_required: boolean | null
          partner_approved_by: string | null
          reason: string
          start_date: string
          start_time: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          employee_id: string
          end_date: string
          end_time?: string | null
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          partner_approval_required?: boolean | null
          partner_approved_by?: string | null
          reason: string
          start_date: string
          start_time?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          employee_id?: string
          end_date?: string
          end_time?: string | null
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          partner_approval_required?: boolean | null
          partner_approved_by?: string | null
          reason?: string
          start_date?: string
          start_time?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      position_role_mappings: {
        Row: {
          created_at: string | null
          id: string
          position: Database["public"]["Enums"]["employee_position"]
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          position: Database["public"]["Enums"]["employee_position"]
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          position?: Database["public"]["Enums"]["employee_position"]
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          employee_code: string | null
          id: string
          must_change_password: boolean
          name: string
          position: Database["public"]["Enums"]["employee_position"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          employee_code?: string | null
          id: string
          must_change_password?: boolean
          name: string
          position?: Database["public"]["Enums"]["employee_position"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          employee_code?: string | null
          id?: string
          must_change_password?: boolean
          name?: string
          position?: Database["public"]["Enums"]["employee_position"]
          updated_at?: string | null
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_approve_leaves: { Args: { _user_id: string }; Returns: boolean }
      can_user_edit: { Args: { _user_id: string }; Returns: boolean }
      create_user_account: {
        Args: {
          _email?: string
          _employee_code: string
          _name: string
          _position: Database["public"]["Enums"]["employee_position"]
        }
        Returns: Json
      }
      get_email_by_employee_code: {
        Args: { _employee_code: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_partner: { Args: { _user_id: string }; Returns: boolean }
      is_position_higher_than: {
        Args: { _target_employee_id: string; _user_id: string }
        Returns: boolean
      }
      is_senior_or_above: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer" | "super_admin"
      employee_position:
        | "A1"
        | "A2"
        | "Semi-Senior"
        | "Senior"
        | "Supervisor"
        | "AM"
        | "M"
        | "SM"
        | "Partner"
        | "System Admin"
        | "Assistant Manager"
        | "Manager"
        | "Senior Manager"
        | "Admin"
        | "Director"
      job_type:
        | "Interim"
        | "นับ Stock"
        | "Q1"
        | "Q2"
        | "Q3"
        | "Year-End Audit"
        | "YE"
        | "อื่น ๆ"
      leave_type: "Annual Leave" | "Personal Leave" | "Sick Leave" | "CPA Leave"
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
      app_role: ["admin", "editor", "viewer", "super_admin"],
      employee_position: [
        "A1",
        "A2",
        "Semi-Senior",
        "Senior",
        "Supervisor",
        "AM",
        "M",
        "SM",
        "Partner",
        "System Admin",
        "Assistant Manager",
        "Manager",
        "Senior Manager",
        "Admin",
        "Director",
      ],
      job_type: [
        "Interim",
        "นับ Stock",
        "Q1",
        "Q2",
        "Q3",
        "Year-End Audit",
        "YE",
        "อื่น ๆ",
      ],
      leave_type: ["Annual Leave", "Personal Leave", "Sick Leave", "CPA Leave"],
    },
  },
} as const
