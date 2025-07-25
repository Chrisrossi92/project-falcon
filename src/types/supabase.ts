export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string | null
          context: Json | null
          created_at: string | null
          id: string
          order_id: number | null
          role: string | null
          user_id: number | null
          visible_to: string[] | null
        }
        Insert: {
          action?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          order_id?: number | null
          role?: string | null
          user_id?: number | null
          visible_to?: string[] | null
        }
        Update: {
          action?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          order_id?: number | null
          role?: string | null
          user_id?: number | null
          visible_to?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string | null
          date: string
          id: string
          notes: string | null
          order_id: number | null
          time: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          order_id?: number | null
          time?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          order_id?: number | null
          time?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company: string | null
          company_group: string | null
          contact: string | null
          contacts: Json | null
          created_at: string | null
          default_instructions: string | null
          email: string | null
          id: number
          name: string | null
          notes: string | null
          phone: string | null
          preferred_delivery: string | null
        }
        Insert: {
          company?: string | null
          company_group?: string | null
          contact?: string | null
          contacts?: Json | null
          created_at?: string | null
          default_instructions?: string | null
          email?: string | null
          id?: number
          name?: string | null
          notes?: string | null
          phone?: string | null
          preferred_delivery?: string | null
        }
        Update: {
          company?: string | null
          company_group?: string | null
          contact?: string | null
          contacts?: Json | null
          created_at?: string | null
          default_instructions?: string | null
          email?: string | null
          id?: number
          name?: string | null
          notes?: string | null
          phone?: string | null
          preferred_delivery?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          client_id: number
          created_at: string | null
          email: string | null
          id: number
          name: string
          phone: string | null
        }
        Insert: {
          client_id: number
          created_at?: string | null
          email?: string | null
          id?: never
          name: string
          phone?: string | null
        }
        Update: {
          client_id?: number
          created_at?: string | null
          email?: string | null
          id?: never
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          appointment_date: string | null
          appraiser: string | null
          appraiser_id: number | null
          appraiser_split: number | null
          base_fee: string | null
          client_id: number | null
          due_date: string | null
          id: number
          manual_client: string | null
          notes: string | null
          status: string | null
        }
        Insert: {
          address?: string | null
          appointment_date?: string | null
          appraiser?: string | null
          appraiser_id?: number | null
          appraiser_split?: number | null
          base_fee?: string | null
          client_id?: number | null
          due_date?: string | null
          id?: number
          manual_client?: string | null
          notes?: string | null
          status?: string | null
        }
        Update: {
          address?: string | null
          appointment_date?: string | null
          appraiser?: string | null
          appraiser_id?: number | null
          appraiser_split?: number | null
          base_fee?: string | null
          client_id?: number | null
          due_date?: string | null
          id?: number
          manual_client?: string | null
          notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          email: string | null
          id: number
          name: string | null
          role: string | null
          split: number | null
        }
        Insert: {
          email?: string | null
          id?: number
          name?: string | null
          role?: string | null
          split?: number | null
        }
        Update: {
          email?: string | null
          id?: number
          name?: string | null
          role?: string | null
          split?: number | null
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
