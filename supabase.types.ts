
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
    PostgrestVersion: "12.2.3 (519615d)"
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
      _view_backups: {
        Row: {
          definition: string
          saved_at: string
          view_name: string
        }
        Insert: {
          definition: string
          saved_at?: string
          view_name: string
        }
        Update: {
          definition?: string
          saved_at?: string
          view_name?: string
        }
        Relationships: []
      }
      activity_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event: string
          id: string
          meta: Json
          target_id: string
          target_type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event: string
          id?: string
          meta?: Json
          target_id: string
          target_type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event?: string
          id?: string
          meta?: Json
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          action: string | null
          actor: string | null
          actor_id: string | null
          actor_name: string | null
          context: Json | null
          created_at: string | null
          created_by: string | null
          created_by_email: string | null
          created_by_name: string | null
          detail: Json
          environment: string | null
          event_data: Json | null
          event_type: string | null
          id: string
          message: string | null
          new_status: string | null
          order_id: string | null
          prev_status: string | null
          role: string | null
          user_id: string | null
          visible_to: string[] | null
        }
        Insert: {
          action?: string | null
          actor?: string | null
          actor_id?: string | null
          actor_name?: string | null
          context?: Json | null
          created_at?: string | null
          created_by?: string | null
          created_by_email?: string | null
          created_by_name?: string | null
          detail?: Json
          environment?: string | null
          event_data?: Json | null
          event_type?: string | null
          id?: string
          message?: string | null
          new_status?: string | null
          order_id?: string | null
          prev_status?: string | null
          role?: string | null
          user_id?: string | null
          visible_to?: string[] | null
        }
        Update: {
          action?: string | null
          actor?: string | null
          actor_id?: string | null
          actor_name?: string | null
          context?: Json | null
          created_at?: string | null
          created_by?: string | null
          created_by_email?: string | null
          created_by_name?: string | null
          detail?: Json
          environment?: string | null
          event_data?: Json | null
          event_type?: string | null
          id?: string
          message?: string | null
          new_status?: string | null
          order_id?: string | null
          prev_status?: string | null
          role?: string | null
          user_id?: string | null
          visible_to?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_all"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_dashboard_active"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      amc_lenders: {
        Row: {
          amc_id: number
          lender_id: number
        }
        Insert: {
          amc_id: number
          lender_id: number
        }
        Update: {
          amc_id?: number
          lender_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "amc_lenders_amc_id_fkey"
            columns: ["amc_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amc_lenders_amc_id_fkey"
            columns: ["amc_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amc_lenders_amc_id_fkey"
            columns: ["amc_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amc_lenders_lender_id_fkey"
            columns: ["lender_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amc_lenders_lender_id_fkey"
            columns: ["lender_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amc_lenders_lender_id_fkey"
            columns: ["lender_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      amcs: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          created_at: string | null
          date: string
          end_at: string | null
          id: string
          notes: string | null
          order_id: string | null
          start_at: string | null
          time: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          end_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          start_at?: string | null
          time?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          end_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          start_at?: string | null
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
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_all"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_dashboard_active"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified_list"
            referencedColumns: ["id"]
          },
        ]
      }
      appraiser_licenses: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          number: string
          state: string
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          number: string
          state: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          number?: string
          state?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appraiser_licenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraiser_licenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "appraiser_licenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          appraiser_id: string | null
          appraiser_user_id: string | null
          created_at: string
          created_by: string
          end_at: string
          event_type: string
          id: string
          location: string | null
          notes: string | null
          order_id: string | null
          start_at: string
          title: string
        }
        Insert: {
          appraiser_id?: string | null
          appraiser_user_id?: string | null
          created_at?: string
          created_by?: string
          end_at: string
          event_type: string
          id?: string
          location?: string | null
          notes?: string | null
          order_id?: string | null
          start_at: string
          title: string
        }
        Update: {
          appraiser_id?: string | null
          appraiser_user_id?: string | null
          created_at?: string
          created_by?: string
          end_at?: string
          event_type?: string
          id?: string
          location?: string | null
          notes?: string | null
          order_id?: string | null
          start_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_appraiser_user_fkey"
            columns: ["appraiser_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_appraiser_user_fkey"
            columns: ["appraiser_user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "calendar_events_appraiser_user_fkey"
            columns: ["appraiser_user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_all"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_dashboard_active"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified_list"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          amc_id: number | null
          amc_legacy_id: string | null
          category: string | null
          client_type: string | null
          company: string | null
          company_address: string | null
          company_group: string | null
          contact_email_1: string | null
          contact_email_2: string | null
          contact_name_1: string | null
          contact_name_2: string | null
          contact_phone_1: string | null
          contact_phone_2: string | null
          contacts: Json | null
          created_at: string | null
          default_instructions: string | null
          id: number
          is_archived: boolean
          is_merged: boolean | null
          kind: string | null
          merged_into_id: number | null
          name: string | null
          notes: string | null
          parent_id: number | null
          preferred_delivery: string | null
          status: string
        }
        Insert: {
          amc_id?: number | null
          amc_legacy_id?: string | null
          category?: string | null
          client_type?: string | null
          company?: string | null
          company_address?: string | null
          company_group?: string | null
          contact_email_1?: string | null
          contact_email_2?: string | null
          contact_name_1?: string | null
          contact_name_2?: string | null
          contact_phone_1?: string | null
          contact_phone_2?: string | null
          contacts?: Json | null
          created_at?: string | null
          default_instructions?: string | null
          id?: number
          is_archived?: boolean
          is_merged?: boolean | null
          kind?: string | null
          merged_into_id?: number | null
          name?: string | null
          notes?: string | null
          parent_id?: number | null
          preferred_delivery?: string | null
          status?: string
        }
        Update: {
          amc_id?: number | null
          amc_legacy_id?: string | null
          category?: string | null
          client_type?: string | null
          company?: string | null
          company_address?: string | null
          company_group?: string | null
          contact_email_1?: string | null
          contact_email_2?: string | null
          contact_name_1?: string | null
          contact_name_2?: string | null
          contact_phone_1?: string | null
          contact_phone_2?: string | null
          contacts?: Json | null
          created_at?: string | null
          default_instructions?: string | null
          id?: number
          is_archived?: boolean
          is_merged?: boolean | null
          kind?: string | null
          merged_into_id?: number | null
          name?: string | null
          notes?: string | null
          parent_id?: number | null
          preferred_delivery?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_amc_id_fkey"
            columns: ["amc_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_amc_id_fkey"
            columns: ["amc_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_amc_id_fkey"
            columns: ["amc_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_parent_id"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_parent_id"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_parent_id"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
        ]
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
          id?: number
          name: string
          phone?: string | null
        }
        Update: {
          client_id?: number
          created_at?: string | null
          email?: string | null
          id?: number
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
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number
          claimed_at: string | null
          created_at: string
          error: string | null
          id: string
          locked_by: string | null
          payload: Json | null
          sent_at: string | null
          status: string
          subject: string
          template: string
          to_email: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          locked_by?: string | null
          payload?: Json | null
          sent_at?: string | null
          status?: string
          subject: string
          template: string
          to_email: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          locked_by?: string | null
          payload?: Json | null
          sent_at?: string | null
          status?: string
          subject?: string
          template?: string
          to_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "email_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      notification_policies: {
        Row: {
          id: string
          key: string
          rules: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          key: string
          rules: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          key?: string
          rules?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          categories: Json | null
          dnd_until: string | null
          email_enabled: boolean | null
          push_enabled: boolean | null
          snooze_until: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          categories?: Json | null
          dnd_until?: string | null
          email_enabled?: boolean | null
          push_enabled?: boolean | null
          snooze_until?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          categories?: Json | null
          dnd_until?: string | null
          email_enabled?: boolean | null
          push_enabled?: boolean | null
          snooze_until?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notificationprefs_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notificationprefs_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_notificationprefs_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      notifications: {
        Row: {
          action: string | null
          body: string | null
          category: string | null
          created_at: string | null
          event_id: string | null
          id: string
          is_read: boolean
          link_path: string | null
          message: string | null
          order_id: string | null
          payload: Json | null
          priority: string | null
          read: boolean | null
          read_at: string | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          body?: string | null
          category?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_read?: boolean
          link_path?: string | null
          message?: string | null
          order_id?: string | null
          payload?: Json | null
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          body?: string | null
          category?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_read?: boolean
          link_path?: string | null
          message?: string | null
          order_id?: string | null
          payload?: Json | null
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_all"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_dashboard_active"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      order_activity: {
        Row: {
          action: string | null
          created_at: string
          created_by: string
          details: string | null
          event: string
          id: string
          note: string | null
          order_id: string
          user_id: string
          user_uid: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          created_by?: string
          details?: string | null
          event?: string
          id?: string
          note?: string | null
          order_id: string
          user_id?: string
          user_uid?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          created_by?: string
          details?: string | null
          event?: string
          id?: string
          note?: string | null
          order_id?: string
          user_id?: string
          user_uid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_activity_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activity_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activity_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_all"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activity_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_dashboard_active"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_activity_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activity_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_activity_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activity_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_activity_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activity_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_activity_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activity_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activity_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activity_user_uid_fkey"
            columns: ["user_uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activity_user_uid_fkey"
            columns: ["user_uid"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "order_activity_user_uid_fkey"
            columns: ["user_uid"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      order_assignments: {
        Row: {
          created_at: string | null
          flat_fee: number | null
          id: number
          order_id: string | null
          percentage: number | null
          role: string
          user_id: string | null
          user_uid: string | null
        }
        Insert: {
          created_at?: string | null
          flat_fee?: number | null
          id?: number
          order_id?: string | null
          percentage?: number | null
          role: string
          user_id?: string | null
          user_uid?: string | null
        }
        Update: {
          created_at?: string | null
          flat_fee?: number | null
          id?: number
          order_id?: string | null
          percentage?: number | null
          role?: string
          user_id?: string | null
          user_uid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_assign_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_all"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_dashboard_active"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "order_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "order_assignments_user_uid_fkey"
            columns: ["user_uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_user_uid_fkey"
            columns: ["user_uid"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "order_assignments_user_uid_fkey"
            columns: ["user_uid"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      order_counters: {
        Row: {
          last_seq: number
          year: number
        }
        Insert: {
          last_seq?: number
          year: number
        }
        Update: {
          last_seq?: number
          year?: number
        }
        Relationships: []
      }
      order_status_log: {
        Row: {
          created_at: string | null
          id: string
          new_status: string
          old_status: string
          order_id: string | null
          reason: string | null
          trigger_type: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          new_status: string
          old_status: string
          order_id?: string | null
          reason?: string | null
          trigger_type: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          new_status?: string
          old_status?: string
          order_id?: string | null
          reason?: string | null
          trigger_type?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_all"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_dashboard_active"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_log_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_log_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "order_status_log_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          amc_id: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_split: number | null
          archived: boolean | null
          assigned_to: string | null
          base_fee: number | null
          branch_id: number | null
          city: string | null
          client_due_at: string | null
          client_id: number | null
          client_invoice: string | null
          client_invoice_amount: number | null
          county: string | null
          created_at: string | null
          current_reviewer_id: string | null
          date_billed: string | null
          date_ordered: string | null
          date_paid: string | null
          due_date: string | null
          due_for_review: string | null
          due_to_client: string | null
          entry_contact_name: string | null
          entry_contact_phone: string | null
          external_order_no: string | null
          fee_amount: number | null
          final_due_at: string | null
          id: string
          inspection_date: string | null
          invoice_number: string | null
          invoice_paid: boolean
          is_archived: boolean
          location: Json | null
          managing_amc_id: number | null
          manual_appraiser: string | null
          manual_client: string | null
          manual_client_name: string | null
          notes: string | null
          order_number: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_type: string | null
          report_type: string | null
          review_claimed_at: string | null
          review_claimed_by: string | null
          review_due_at: string | null
          review_due_date: string | null
          review_route: Json | null
          review_stage: string | null
          reviewer_id: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          special_instructions: string | null
          split_pct: number | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          amc_id?: string | null
          appraiser_fee?: number | null
          appraiser_id?: string | null
          appraiser_split?: number | null
          archived?: boolean | null
          assigned_to?: string | null
          base_fee?: number | null
          branch_id?: number | null
          city?: string | null
          client_due_at?: string | null
          client_id?: number | null
          client_invoice?: string | null
          client_invoice_amount?: number | null
          county?: string | null
          created_at?: string | null
          current_reviewer_id?: string | null
          date_billed?: string | null
          date_ordered?: string | null
          date_paid?: string | null
          due_date?: string | null
          due_for_review?: string | null
          due_to_client?: string | null
          entry_contact_name?: string | null
          entry_contact_phone?: string | null
          external_order_no?: string | null
          fee_amount?: number | null
          final_due_at?: string | null
          id?: string
          inspection_date?: string | null
          invoice_number?: string | null
          invoice_paid?: boolean
          is_archived?: boolean
          location?: Json | null
          managing_amc_id?: number | null
          manual_appraiser?: string | null
          manual_client?: string | null
          manual_client_name?: string | null
          notes?: string | null
          order_number?: string | null
          paid_at?: string | null
          paid_status?: string | null
          postal_code?: string | null
          property_address?: string | null
          property_type?: string | null
          report_type?: string | null
          review_claimed_at?: string | null
          review_claimed_by?: string | null
          review_due_at?: string | null
          review_due_date?: string | null
          review_route?: Json | null
          review_stage?: string | null
          reviewer_id?: string | null
          site_visit_at?: string | null
          site_visit_date?: string | null
          special_instructions?: string | null
          split_pct?: number | null
          state?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          amc_id?: string | null
          appraiser_fee?: number | null
          appraiser_id?: string | null
          appraiser_split?: number | null
          archived?: boolean | null
          assigned_to?: string | null
          base_fee?: number | null
          branch_id?: number | null
          city?: string | null
          client_due_at?: string | null
          client_id?: number | null
          client_invoice?: string | null
          client_invoice_amount?: number | null
          county?: string | null
          created_at?: string | null
          current_reviewer_id?: string | null
          date_billed?: string | null
          date_ordered?: string | null
          date_paid?: string | null
          due_date?: string | null
          due_for_review?: string | null
          due_to_client?: string | null
          entry_contact_name?: string | null
          entry_contact_phone?: string | null
          external_order_no?: string | null
          fee_amount?: number | null
          final_due_at?: string | null
          id?: string
          inspection_date?: string | null
          invoice_number?: string | null
          invoice_paid?: boolean
          is_archived?: boolean
          location?: Json | null
          managing_amc_id?: number | null
          manual_appraiser?: string | null
          manual_client?: string | null
          manual_client_name?: string | null
          notes?: string | null
          order_number?: string | null
          paid_at?: string | null
          paid_status?: string | null
          postal_code?: string | null
          property_address?: string | null
          property_type?: string | null
          report_type?: string | null
          review_claimed_at?: string | null
          review_claimed_by?: string | null
          review_due_at?: string | null
          review_due_date?: string | null
          review_route?: Json | null
          review_stage?: string | null
          reviewer_id?: string | null
          site_visit_at?: string | null
          site_visit_date?: string | null
          special_instructions?: string | null
          split_pct?: number | null
          state?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_current_reviewer"
            columns: ["current_reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_current_reviewer"
            columns: ["current_reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_current_reviewer"
            columns: ["current_reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "orders_amc_id_fkey"
            columns: ["amc_id"]
            isOneToOne: false
            referencedRelation: "amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_managing_amc_id_fkey"
            columns: ["managing_amc_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_managing_amc_id_fkey"
            columns: ["managing_amc_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_managing_amc_id_fkey"
            columns: ["managing_amc_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      review_flow: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          comment: string | null
          created_at: string | null
          id: string
          order_id: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_flow_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_flow_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "review_flow_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "review_flow_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_flow_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "review_flow_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "review_flow_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_flow_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_flow_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_all"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_flow_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_dashboard_active"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "review_flow_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_flow_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "review_flow_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_flow_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "review_flow_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_flow_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "review_flow_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_flow_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_flow_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified_list"
            referencedColumns: ["id"]
          },
        ]
      }
      staging_orders_2025: {
        Row: {
          address: string | null
          assigned_appraiser: string | null
          client: string | null
          client_contact: string | null
          date_billed: string | null
          date_ordered: string | null
          date_paid: string | null
          due_for_review: string | null
          due_to_client: string | null
          fee: string | null
          inspection_date: string | null
          order_number: string | null
          property_type: string | null
          special_instruction: string | null
        }
        Insert: {
          address?: string | null
          assigned_appraiser?: string | null
          client?: string | null
          client_contact?: string | null
          date_billed?: string | null
          date_ordered?: string | null
          date_paid?: string | null
          due_for_review?: string | null
          due_to_client?: string | null
          fee?: string | null
          inspection_date?: string | null
          order_number?: string | null
          property_type?: string | null
          special_instruction?: string | null
        }
        Update: {
          address?: string | null
          assigned_appraiser?: string | null
          client?: string | null
          client_contact?: string | null
          date_billed?: string | null
          date_ordered?: string | null
          date_paid?: string | null
          due_for_review?: string | null
          due_to_client?: string | null
          fee?: string | null
          inspection_date?: string | null
          order_number?: string | null
          property_type?: string | null
          special_instruction?: string | null
        }
        Relationships: []
      }
      staging_raw_orders_2025_csv: {
        Row: {
          "Address of Property / \nApproaches to Value": string | null
          "Client\nContact": string | null
          "Date Billed": string | null
          "Date Ordered": string | null
          "Date Paid": string | null
          "Due for Review": string | null
          "Due to Client": string | null
          Fee: string | null
          Inspection: string | null
          "Order #": string | null
          "Property Type /\nAssigned Appraiser": string | null
        }
        Insert: {
          "Address of Property / \nApproaches to Value"?: string | null
          "Client\nContact"?: string | null
          "Date Billed"?: string | null
          "Date Ordered"?: string | null
          "Date Paid"?: string | null
          "Due for Review"?: string | null
          "Due to Client"?: string | null
          Fee?: string | null
          Inspection?: string | null
          "Order #"?: string | null
          "Property Type /\nAssigned Appraiser"?: string | null
        }
        Update: {
          "Address of Property / \nApproaches to Value"?: string | null
          "Client\nContact"?: string | null
          "Date Billed"?: string | null
          "Date Ordered"?: string | null
          "Date Paid"?: string | null
          "Due for Review"?: string | null
          "Due to Client"?: string | null
          Fee?: string | null
          Inspection?: string | null
          "Order #"?: string | null
          "Property Type /\nAssigned Appraiser"?: string | null
        }
        Relationships: []
      }
      stg_orders_import: {
        Row: {
          address_line1: string | null
          appraiser_fee: number | null
          appraiser_name: string | null
          base_fee: number | null
          city: string | null
          client_name: string | null
          final_due_at: string | null
          order_number: string | null
          postal_code: string | null
          property_type: string | null
          review_due_at: string | null
          state: string | null
          status: string | null
        }
        Insert: {
          address_line1?: string | null
          appraiser_fee?: number | null
          appraiser_name?: string | null
          base_fee?: number | null
          city?: string | null
          client_name?: string | null
          final_due_at?: string | null
          order_number?: string | null
          postal_code?: string | null
          property_type?: string | null
          review_due_at?: string | null
          state?: string | null
          status?: string | null
        }
        Update: {
          address_line1?: string | null
          appraiser_fee?: number | null
          appraiser_name?: string | null
          base_fee?: number | null
          city?: string | null
          client_name?: string | null
          final_due_at?: string | null
          order_number?: string | null
          postal_code?: string | null
          property_type?: string | null
          review_due_at?: string | null
          state?: string | null
          status?: string | null
        }
        Relationships: []
      }
      user_documents: {
        Row: {
          expires_at: string | null
          id: string
          kind: string
          storage_path: string
          title: string | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          kind: string
          storage_path: string
          title?: string | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          kind?: string
          storage_path?: string
          title?: string | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "user_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      user_notification_prefs: {
        Row: {
          channel: string
          enabled: boolean
          meta: Json | null
          type: string
          user_id: string
        }
        Insert: {
          channel: string
          enabled?: boolean
          meta?: Json | null
          type: string
          user_id: string
        }
        Update: {
          channel?: string
          enabled?: boolean
          meta?: Json | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_unp_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_unp_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_unp_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "user_notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "user_notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          color: string | null
          created_at: string
          display_name: string | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          color?: string | null
          created_at?: string
          display_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          color?: string | null
          created_at?: string
          display_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          fee_split: number | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fee_split?: number | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fee_split?: number | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      user_settings: {
        Row: {
          notify_assignments: boolean | null
          notify_reviews: boolean | null
          notify_status_changes: boolean | null
          phone: string | null
          preferences: Json
          signature: string | null
          theme_color: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          notify_assignments?: boolean | null
          notify_reviews?: boolean | null
          notify_status_changes?: boolean | null
          phone?: string | null
          preferences?: Json
          signature?: string | null
          theme_color?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          notify_assignments?: boolean | null
          notify_reviews?: boolean | null
          notify_status_changes?: boolean | null
          phone?: string | null
          preferences?: Json
          signature?: string | null
          theme_color?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string | null
          avatar_url: string | null
          bio: string | null
          color: string | null
          created_at: string | null
          display_color: string | null
          display_name: string | null
          email: string
          fee_split: number | null
          full_name: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          role: string
          split: number | null
          status: string | null
          uid: string | null
          updated_at: string | null
        }
        Insert: {
          auth_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          color?: string | null
          created_at?: string | null
          display_color?: string | null
          display_name?: string | null
          email: string
          fee_split?: number | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          role?: string
          split?: number | null
          status?: string | null
          uid?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          color?: string | null
          created_at?: string | null
          display_color?: string | null
          display_name?: string | null
          email?: string
          fee_split?: number | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          role?: string
          split?: number | null
          status?: string | null
          uid?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_admin_calendar: {
        Row: {
          address: string | null
          appraiser_id: string | null
          appraiser_name: string | null
          client_name: string | null
          end_at: string | null
          event_type: string | null
          id: string | null
          order_id: string | null
          order_no: string | null
          start_at: string | null
          title: string | null
        }
        Relationships: []
      }
      v_admin_calendar_enriched: {
        Row: {
          appraiser_color: string | null
          appraiser_id: string | null
          appraiser_name: string | null
          end_at: string | null
          event_type: string | null
          id: string | null
          order_id: string | null
          start_at: string | null
          title: string | null
        }
        Relationships: []
      }
      v_admin_calendar_v2: {
        Row: {
          client_name: string | null
          created_at: string | null
          end_at: string | null
          event_type: string | null
          id: string | null
          location: string | null
          order_id: string | null
          order_number: string | null
          source: string | null
          start_at: string | null
          status: string | null
          title: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: []
      }
      v_admin_dashboard_counts: {
        Row: {
          in_review: number | null
          ready_to_send: number | null
          total_active: number | null
        }
        Relationships: []
      }
      v_amcs: {
        Row: {
          amc_legacy_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: number | null
          name: string | null
        }
        Insert: {
          amc_legacy_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: number | null
          name?: string | null
        }
        Update: {
          amc_legacy_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: number | null
          name?: string | null
        }
        Relationships: []
      }
      v_calendar_events: {
        Row: {
          assigned_appraiser_id: string | null
          client_id: string | null
          ends_at: string | null
          kind: string | null
          order_id: string | null
          starts_at: string | null
          title: string | null
        }
        Relationships: []
      }
      v_calendar_events_admin: {
        Row: {
          assigned_appraiser_id: string | null
          client_id: string | null
          ends_at: string | null
          kind: string | null
          order_id: string | null
          starts_at: string | null
          title: string | null
        }
        Relationships: []
      }
      v_calendar_events_appraiser: {
        Row: {
          assigned_appraiser_id: string | null
          client_id: string | null
          ends_at: string | null
          kind: string | null
          order_id: string | null
          starts_at: string | null
          title: string | null
        }
        Relationships: []
      }
      v_calendar_unified: {
        Row: {
          created_at: string | null
          end_at: string | null
          event_type: string | null
          id: string | null
          location: string | null
          notes: string | null
          order_id: string | null
          source: string | null
          start_at: string | null
          title: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_client_kpis: {
        Row: {
          avg_total_fee: number | null
          client_id: string | null
          client_name: string | null
          last_order_at: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          total_orders: number | null
        }
        Relationships: []
      }
      v_client_kpis_appraiser: {
        Row: {
          avg_total_fee: number | null
          client_id: string | null
          client_name: string | null
          last_order_at: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          total_orders: number | null
        }
        Relationships: []
      }
      v_client_metrics: {
        Row: {
          id: number | null
          last_ordered_at: string | null
          name: string | null
          orders_count: number | null
          total_base_fee: number | null
        }
        Relationships: []
      }
      v_email_queue: {
        Row: {
          attempts: number | null
          claimed_at: string | null
          created_at: string | null
          error: string | null
          id: string | null
          locked_by: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          template: string | null
          to_email: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          claimed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string | null
          locked_by?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template?: string | null
          to_email?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          claimed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string | null
          locked_by?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template?: string | null
          to_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "email_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      v_is_admin: {
        Row: {
          is_admin: boolean | null
          uid: string | null
        }
        Relationships: []
      }
      v_order_activity_compat: {
        Row: {
          action: string | null
          created_at: string | null
          created_by: string | null
          details: string | null
          event: string | null
          id: string | null
          note: string | null
          order_id: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          created_by?: string | null
          details?: never
          event?: string | null
          id?: string | null
          note?: string | null
          order_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          created_by?: string | null
          details?: never
          event?: string | null
          id?: string | null
          note?: string | null
          order_id?: string | null
          user_id?: string | null
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
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_all"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_dashboard_active"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified_list"
            referencedColumns: ["id"]
          },
        ]
      }
      v_orders: {
        Row: {
          address: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_split: number | null
          assigned_to: string | null
          base_fee: number | null
          branch_id: number | null
          city: string | null
          client_id: number | null
          client_invoice_amount: number | null
          county: string | null
          created_at: string | null
          due_date: string | null
          id: string | null
          is_archived: boolean | null
          manual_client: string | null
          notes: string | null
          paid_status: string | null
          property_type: string | null
          report_type: string | null
          review_due_date: string | null
          review_stage: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          appraiser_fee?: number | null
          appraiser_id?: string | null
          appraiser_split?: number | null
          assigned_to?: string | null
          base_fee?: number | null
          branch_id?: number | null
          city?: string | null
          client_id?: number | null
          client_invoice_amount?: number | null
          county?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string | null
          is_archived?: boolean | null
          manual_client?: string | null
          notes?: string | null
          paid_status?: string | null
          property_type?: string | null
          report_type?: string | null
          review_due_date?: string | null
          review_stage?: string | null
          site_visit_at?: string | null
          site_visit_date?: string | null
          state?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          appraiser_fee?: number | null
          appraiser_id?: string | null
          appraiser_split?: number | null
          assigned_to?: string | null
          base_fee?: number | null
          branch_id?: number | null
          city?: string | null
          client_id?: number | null
          client_invoice_amount?: number | null
          county?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string | null
          is_archived?: boolean | null
          manual_client?: string | null
          notes?: string | null
          paid_status?: string | null
          property_type?: string | null
          report_type?: string | null
          review_due_date?: string | null
          review_stage?: string | null
          site_visit_at?: string | null
          site_visit_date?: string | null
          state?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      v_orders_all: {
        Row: {
          address: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_split: number | null
          assigned_to: string | null
          base_fee: number | null
          branch_id: number | null
          city: string | null
          client_id: number | null
          client_invoice_amount: number | null
          county: string | null
          created_at: string | null
          due_date: string | null
          id: string | null
          is_archived: boolean | null
          manual_client: string | null
          notes: string | null
          paid_status: string | null
          property_type: string | null
          report_type: string | null
          review_due_date: string | null
          review_stage: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          appraiser_fee?: number | null
          appraiser_id?: string | null
          appraiser_split?: number | null
          assigned_to?: string | null
          base_fee?: number | null
          branch_id?: number | null
          city?: string | null
          client_id?: number | null
          client_invoice_amount?: number | null
          county?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string | null
          is_archived?: boolean | null
          manual_client?: string | null
          notes?: string | null
          paid_status?: string | null
          property_type?: string | null
          report_type?: string | null
          review_due_date?: string | null
          review_stage?: string | null
          site_visit_at?: string | null
          site_visit_date?: string | null
          state?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          appraiser_fee?: number | null
          appraiser_id?: string | null
          appraiser_split?: number | null
          assigned_to?: string | null
          base_fee?: number | null
          branch_id?: number | null
          city?: string | null
          client_id?: number | null
          client_invoice_amount?: number | null
          county?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string | null
          is_archived?: boolean | null
          manual_client?: string | null
          notes?: string | null
          paid_status?: string | null
          property_type?: string | null
          report_type?: string | null
          review_due_date?: string | null
          review_stage?: string | null
          site_visit_at?: string | null
          site_visit_date?: string | null
          state?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      v_orders_dashboard_active: {
        Row: {
          address: string | null
          appraiser_name: string | null
          client_name: string | null
          due: string | null
          last_activity_at: string | null
          order_id: string | null
          order_no: string | null
          status: string | null
        }
        Relationships: []
      }
      v_orders_frontend: {
        Row: {
          address: string | null
          appraiser_id: string | null
          appraiser_name: string | null
          assigned_appraiser_id: string | null
          assigned_appraiser_name: string | null
          client_id: number | null
          client_name: string | null
          created_at: string | null
          date_ordered: string | null
          display_subtitle: string | null
          display_title: string | null
          due_date: string | null
          fee: number | null
          fee_amount: number | null
          final_due_at: string | null
          id: string | null
          is_archived: boolean | null
          last_activity_at: string | null
          order_id: string | null
          order_no: string | null
          property_type: string | null
          review_due_at: string | null
          site_visit_at: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["assigned_appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["assigned_appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["assigned_appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["assigned_appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["assigned_appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["assigned_appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      v_orders_frontend_v2: {
        Row: {
          address: string | null
          appraiser_id: string | null
          appraiser_name: string | null
          archived: boolean | null
          city: string | null
          client_id: number | null
          client_name: string | null
          county: string | null
          created_at: string | null
          due_at: string | null
          id: string | null
          is_archived: boolean | null
          last_activity_at: string | null
          order_number: string | null
          postal_code: string | null
          property_type: string | null
          report_type: string | null
          review_stage: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          state: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      v_orders_list: {
        Row: {
          appraiser_display_name: string | null
          appraiser_id: string | null
          appraiser_name: string | null
          client_id: number | null
          client_name: string | null
          created_at: string | null
          due_date: string | null
          last_action: string | null
          last_activity_at: string | null
          last_message: string | null
          order_id: string | null
          order_number: string | null
          review_due_date: string | null
          site_visit_at: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      v_orders_list_v2: {
        Row: {
          address: string | null
          appraiser_id: string | null
          appraiser_name: string | null
          city: string | null
          client_id: number | null
          client_name: string | null
          created_at: string | null
          due_at: string | null
          id: string | null
          last_activity_at: string | null
          order_number: string | null
          postal_code: string | null
          property_type: string | null
          report_type: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          state: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      v_orders_list_with_last_activity: {
        Row: {
          appraiser_display_name: string | null
          appraiser_id: string | null
          appraiser_name: string | null
          client_id: number | null
          client_name: string | null
          created_at: string | null
          due_date: string | null
          last_action: string | null
          last_activity_at: string | null
          last_message: string | null
          order_id: string | null
          order_number: string | null
          review_due_date: string | null
          site_visit_at: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      v_orders_list_with_last_activity_v2: {
        Row: {
          address: string | null
          appraiser_id: string | null
          appraiser_name: string | null
          city: string | null
          client_id: number | null
          client_name: string | null
          created_at: string | null
          due_at: string | null
          id: string | null
          last_activity_at: string | null
          order_number: string | null
          postal_code: string | null
          property_type: string | null
          report_type: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          state: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      v_orders_unified: {
        Row: {
          address: string | null
          appraiser_id: string | null
          appraiser_name: string | null
          archived: boolean | null
          city: string | null
          client_id: number | null
          client_name: string | null
          county: string | null
          created_at: string | null
          due_at: string | null
          id: string | null
          is_archived: boolean | null
          last_activity_at: string | null
          order_number: string | null
          postal_code: string | null
          property_type: string | null
          report_type: string | null
          review_stage: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          state: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      v_orders_unified_list: {
        Row: {
          address: string | null
          appraiser_id: string | null
          appraiser_name: string | null
          city: string | null
          client_id: number | null
          client_name: string | null
          created_at: string | null
          due_at: string | null
          id: string | null
          last_activity_at: string | null
          order_number: string | null
          postal_code: string | null
          property_type: string | null
          report_type: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          state: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser_id"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar"
            referencedColumns: ["appraiser_id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_admin_calendar_enriched"
            referencedColumns: ["appraiser_id"]
          },
        ]
      }
      v_staging_raw_orders_2025_ord: {
        Row: {
          _ctid: unknown
          col1: string | null
          col10: string | null
          col11: string | null
          col12: string | null
          col13: string | null
          col14: string | null
          col15: string | null
          col16: string | null
          col17: string | null
          col18: string | null
          col19: string | null
          col2: string | null
          col20: string | null
          col21: string | null
          col3: string | null
          col4: string | null
          col5: string | null
          col6: string | null
          col7: string | null
          col8: string | null
          col9: string | null
        }
        Insert: {
          _ctid?: never
          col1?: string | null
          col10?: string | null
          col11?: string | null
          col12?: never
          col13?: never
          col14?: never
          col15?: never
          col16?: never
          col17?: never
          col18?: never
          col19?: never
          col2?: string | null
          col20?: never
          col21?: never
          col3?: string | null
          col4?: string | null
          col5?: string | null
          col6?: string | null
          col7?: string | null
          col8?: string | null
          col9?: string | null
        }
        Update: {
          _ctid?: never
          col1?: string | null
          col10?: string | null
          col11?: string | null
          col12?: never
          col13?: never
          col14?: never
          col15?: never
          col16?: never
          col17?: never
          col18?: never
          col19?: never
          col2?: string | null
          col20?: never
          col21?: never
          col3?: string | null
          col4?: string | null
          col5?: string | null
          col6?: string | null
          col7?: string | null
          col8?: string | null
          col9?: string | null
        }
        Relationships: []
      }
      v_user_notification_prefs: {
        Row: {
          channel: string | null
          enabled: boolean | null
          meta: Json | null
          type: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _activity_insert: {
        Args: {
          p_created_by: string
          p_kind: string
          p_message: string
          p_meta: Json
          p_order_id: string
        }
        Returns: string
      }
      _col_exists: {
        Args: { p_column: string; p_schema: string; p_table: string }
        Returns: boolean
      }
      _default_notification_categories: { Args: never; Returns: Json }
      _ensure_notification_prefs_for: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      _maybe_move_fk: {
        Args: { p_col: string; p_from: number; p_table: unknown; p_to: number }
        Returns: undefined
      }
      add_order_note: {
        Args: { p_body: string; p_order_id: string }
        Returns: string
      }
      admin_list_users: {
        Args: never
        Returns: {
          auth_id: string | null
          avatar_url: string | null
          bio: string | null
          color: string | null
          created_at: string | null
          display_color: string | null
          display_name: string | null
          email: string
          fee_split: number | null
          full_name: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          role: string
          split: number | null
          status: string | null
          uid: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      assert_role: { Args: { roles: string[] }; Returns: undefined }
      assign_order: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: undefined
      }
      can_read_order: { Args: { p_order_id: string }; Returns: boolean }
      client_metrics_rollup: {
        Args: { p_client_ids: number[] }
        Returns: {
          avg_fee: number
          client_id: number
          last_order_at: string
          orders_count: number
        }[]
      }
      client_name_taken: {
        Args: { p_ignore_id?: number; p_name: string }
        Returns: boolean
      }
      current_is_admin: { Args: never; Returns: boolean }
      current_is_appraiser: { Args: never; Returns: boolean }
      current_user_id: { Args: never; Returns: string }
      current_user_public_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      fn_current_user_users_id: { Args: never; Returns: string }
      fn_to_auth_id: { Args: { p: string }; Returns: string }
      fn_to_users_id: { Args: { p: string }; Returns: string }
      get_admin_calendar_events: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          appraiser_color: string
          appraiser_id: string
          appraiser_name: string
          end_at: string
          event_type: string
          id: string
          order_id: string
          start_at: string
          title: string
        }[]
      }
      get_calendar_events:
        | {
            Args: { p_from?: string; p_to?: string }
            Returns: {
              assigned_user_id_any: string
              at: string
              kind: string
              order_id: string
            }[]
          }
        | {
            Args: never
            Returns: {
              assigned_appraiser_id: string
              client_id: string
              ends_at: string
              kind: string
              order_id: string
              starts_at: string
              title: string
            }[]
          }
      get_clients_for_user: {
        Args: never
        Returns: {
          avg_total_fee: number
          client_id: string
          client_name: string
          last_order_at: string
          primary_contact_name: string
          primary_contact_phone: string
          total_orders: number
        }[]
      }
      get_order_activity_flexible: {
        Args: { p_order_id: string }
        Returns: {
          created_at: string
          details: Json
          event: string
          id: string
          order_id: string
          user_id: string
          user_name: string
        }[]
      }
      get_order_activity_flexible_v3: {
        Args: { p_order_id: string }
        Returns: {
          created_at: string
          details: Json
          event: string
          id: string
          order_id: string
          user_id: string
          user_name: string
        }[]
      }
      import_orders_from_json: { Args: { payload: Json }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_appraiser: { Args: never; Returns: boolean }
      is_reviewer: { Args: never; Returns: boolean }
      log_activity:
        | {
            Args: {
              p_event_type: string
              p_message: string
              p_new_status?: string
              p_order_id: string
              p_prev_status?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_event: string
              p_meta?: Json
              p_target_id: string
              p_target_type: string
            }
            Returns: undefined
          }
      log_order_activity:
        | {
            Args: { p_action: string; p_note?: string; p_order_id: string }
            Returns: undefined
          }
        | {
            Args: {
              p_details: string
              p_event: string
              p_order_id: string
              p_user_id: string
            }
            Returns: {
              action: string | null
              created_at: string
              created_by: string
              details: string | null
              event: string
              id: string
              note: string | null
              order_id: string
              user_id: string
              user_uid: string | null
            }
            SetofOptions: {
              from: "*"
              to: "order_activity"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      merge_clients: {
        Args: { p_source_id: number; p_strategy?: Json; p_target_id: number }
        Returns: {
          amc_id: number | null
          amc_legacy_id: string | null
          category: string | null
          client_type: string | null
          company: string | null
          company_address: string | null
          company_group: string | null
          contact_email_1: string | null
          contact_email_2: string | null
          contact_name_1: string | null
          contact_name_2: string | null
          contact_phone_1: string | null
          contact_phone_2: string | null
          contacts: Json | null
          created_at: string | null
          default_instructions: string | null
          id: number
          is_archived: boolean
          is_merged: boolean | null
          kind: string | null
          merged_into_id: number | null
          name: string | null
          notes: string | null
          parent_id: number | null
          preferred_delivery: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      next_order_number: { Args: { p_year: number }; Returns: string }
      notify_admins: {
        Args: { p_body: string; p_message?: string; p_title: string }
        Returns: number
      }
      notify_safe: {
        Args: {
          p_body: string
          p_message?: string
          p_title: string
          p_user_id: string
        }
        Returns: boolean
      }
      remap_user_id: {
        Args: { from_id: string; to_id: string }
        Returns: undefined
      }
      replace_view_from_source: {
        Args: { source_view: string; target_view: string }
        Returns: undefined
      }
      rpc_assign_next_reviewer: {
        Args: { order_id: string }
        Returns: {
          address: string | null
          amc_id: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_split: number | null
          archived: boolean | null
          assigned_to: string | null
          base_fee: number | null
          branch_id: number | null
          city: string | null
          client_due_at: string | null
          client_id: number | null
          client_invoice: string | null
          client_invoice_amount: number | null
          county: string | null
          created_at: string | null
          current_reviewer_id: string | null
          date_billed: string | null
          date_ordered: string | null
          date_paid: string | null
          due_date: string | null
          due_for_review: string | null
          due_to_client: string | null
          entry_contact_name: string | null
          entry_contact_phone: string | null
          external_order_no: string | null
          fee_amount: number | null
          final_due_at: string | null
          id: string
          inspection_date: string | null
          invoice_number: string | null
          invoice_paid: boolean
          is_archived: boolean
          location: Json | null
          managing_amc_id: number | null
          manual_appraiser: string | null
          manual_client: string | null
          manual_client_name: string | null
          notes: string | null
          order_number: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_type: string | null
          report_type: string | null
          review_claimed_at: string | null
          review_claimed_by: string | null
          review_due_at: string | null
          review_due_date: string | null
          review_route: Json | null
          review_stage: string | null
          reviewer_id: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          special_instructions: string | null
          split_pct: number | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_assign_order:
        | {
            Args: { p_appraiser_id: string; p_order_id: string }
            Returns: {
              address: string | null
              amc_id: string | null
              appraiser_fee: number | null
              appraiser_id: string | null
              appraiser_split: number | null
              archived: boolean | null
              assigned_to: string | null
              base_fee: number | null
              branch_id: number | null
              city: string | null
              client_due_at: string | null
              client_id: number | null
              client_invoice: string | null
              client_invoice_amount: number | null
              county: string | null
              created_at: string | null
              current_reviewer_id: string | null
              date_billed: string | null
              date_ordered: string | null
              date_paid: string | null
              due_date: string | null
              due_for_review: string | null
              due_to_client: string | null
              entry_contact_name: string | null
              entry_contact_phone: string | null
              external_order_no: string | null
              fee_amount: number | null
              final_due_at: string | null
              id: string
              inspection_date: string | null
              invoice_number: string | null
              invoice_paid: boolean
              is_archived: boolean
              location: Json | null
              managing_amc_id: number | null
              manual_appraiser: string | null
              manual_client: string | null
              manual_client_name: string | null
              notes: string | null
              order_number: string | null
              paid_at: string | null
              paid_status: string | null
              postal_code: string | null
              property_address: string | null
              property_type: string | null
              report_type: string | null
              review_claimed_at: string | null
              review_claimed_by: string | null
              review_due_at: string | null
              review_due_date: string | null
              review_route: Json | null
              review_stage: string | null
              reviewer_id: string | null
              site_visit_at: string | null
              site_visit_date: string | null
              special_instructions: string | null
              split_pct: number | null
              state: string | null
              status: string | null
              title: string | null
              updated_at: string | null
              zip: string | null
            }
            SetofOptions: {
              from: "*"
              to: "orders"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { p_assigned_to: string; p_note?: string; p_order_id: string }
            Returns: {
              address: string | null
              amc_id: string | null
              appraiser_fee: number | null
              appraiser_id: string | null
              appraiser_split: number | null
              archived: boolean | null
              assigned_to: string | null
              base_fee: number | null
              branch_id: number | null
              city: string | null
              client_due_at: string | null
              client_id: number | null
              client_invoice: string | null
              client_invoice_amount: number | null
              county: string | null
              created_at: string | null
              current_reviewer_id: string | null
              date_billed: string | null
              date_ordered: string | null
              date_paid: string | null
              due_date: string | null
              due_for_review: string | null
              due_to_client: string | null
              entry_contact_name: string | null
              entry_contact_phone: string | null
              external_order_no: string | null
              fee_amount: number | null
              final_due_at: string | null
              id: string
              inspection_date: string | null
              invoice_number: string | null
              invoice_paid: boolean
              is_archived: boolean
              location: Json | null
              managing_amc_id: number | null
              manual_appraiser: string | null
              manual_client: string | null
              manual_client_name: string | null
              notes: string | null
              order_number: string | null
              paid_at: string | null
              paid_status: string | null
              postal_code: string | null
              property_address: string | null
              property_type: string | null
              report_type: string | null
              review_claimed_at: string | null
              review_claimed_by: string | null
              review_due_at: string | null
              review_due_date: string | null
              review_route: Json | null
              review_stage: string | null
              reviewer_id: string | null
              site_visit_at: string | null
              site_visit_date: string | null
              special_instructions: string | null
              split_pct: number | null
              state: string | null
              status: string | null
              title: string | null
              updated_at: string | null
              zip: string | null
            }
            SetofOptions: {
              from: "*"
              to: "orders"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      rpc_assign_reviewer: {
        Args: { order_id: string; reviewer_id: string }
        Returns: {
          address: string | null
          amc_id: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_split: number | null
          archived: boolean | null
          assigned_to: string | null
          base_fee: number | null
          branch_id: number | null
          city: string | null
          client_due_at: string | null
          client_id: number | null
          client_invoice: string | null
          client_invoice_amount: number | null
          county: string | null
          created_at: string | null
          current_reviewer_id: string | null
          date_billed: string | null
          date_ordered: string | null
          date_paid: string | null
          due_date: string | null
          due_for_review: string | null
          due_to_client: string | null
          entry_contact_name: string | null
          entry_contact_phone: string | null
          external_order_no: string | null
          fee_amount: number | null
          final_due_at: string | null
          id: string
          inspection_date: string | null
          invoice_number: string | null
          invoice_paid: boolean
          is_archived: boolean
          location: Json | null
          managing_amc_id: number | null
          manual_appraiser: string | null
          manual_client: string | null
          manual_client_name: string | null
          notes: string | null
          order_number: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_type: string | null
          report_type: string | null
          review_claimed_at: string | null
          review_claimed_by: string | null
          review_due_at: string | null
          review_due_date: string | null
          review_route: Json | null
          review_stage: string | null
          reviewer_id: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          special_instructions: string | null
          split_pct: number | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_bootstrap_admin: { Args: never; Returns: boolean }
      rpc_claim_email_batch_v1: {
        Args: { p_limit: number; p_worker?: string }
        Returns: {
          attempts: number
          claimed_at: string | null
          created_at: string
          error: string | null
          id: string
          locked_by: string | null
          payload: Json | null
          sent_at: string | null
          status: string
          subject: string
          template: string
          to_email: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "email_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rpc_client_create: {
        Args: { p: Json }
        Returns: {
          amc_id: number | null
          amc_legacy_id: string | null
          category: string | null
          client_type: string | null
          company: string | null
          company_address: string | null
          company_group: string | null
          contact_email_1: string | null
          contact_email_2: string | null
          contact_name_1: string | null
          contact_name_2: string | null
          contact_phone_1: string | null
          contact_phone_2: string | null
          contacts: Json | null
          created_at: string | null
          default_instructions: string | null
          id: number
          is_archived: boolean
          is_merged: boolean | null
          kind: string | null
          merged_into_id: number | null
          name: string | null
          notes: string | null
          parent_id: number | null
          preferred_delivery: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_client_delete: { Args: { p_client_id: string }; Returns: boolean }
      rpc_client_update: {
        Args: { p_client_id: string; p_patch: Json }
        Returns: {
          amc_id: number | null
          amc_legacy_id: string | null
          category: string | null
          client_type: string | null
          company: string | null
          company_address: string | null
          company_group: string | null
          contact_email_1: string | null
          contact_email_2: string | null
          contact_name_1: string | null
          contact_name_2: string | null
          contact_phone_1: string | null
          contact_phone_2: string | null
          contacts: Json | null
          created_at: string | null
          default_instructions: string | null
          id: number
          is_archived: boolean
          is_merged: boolean | null
          kind: string | null
          merged_into_id: number | null
          name: string | null
          notes: string | null
          parent_id: number | null
          preferred_delivery: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_create_calendar_event: {
        Args: {
          p_appraiser_id?: string
          p_end_at: string
          p_event_type: string
          p_location?: string
          p_notes?: string
          p_order_id?: string
          p_start_at: string
          p_title: string
        }
        Returns: {
          appraiser_id: string | null
          appraiser_user_id: string | null
          created_at: string
          created_by: string
          end_at: string
          event_type: string
          id: string
          location: string | null
          notes: string | null
          order_id: string | null
          start_at: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "calendar_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_create_client: {
        Args: { patch: Json }
        Returns: {
          amc_id: number | null
          amc_legacy_id: string | null
          category: string | null
          client_type: string | null
          company: string | null
          company_address: string | null
          company_group: string | null
          contact_email_1: string | null
          contact_email_2: string | null
          contact_name_1: string | null
          contact_name_2: string | null
          contact_phone_1: string | null
          contact_phone_2: string | null
          contacts: Json | null
          created_at: string | null
          default_instructions: string | null
          id: number
          is_archived: boolean
          is_merged: boolean | null
          kind: string | null
          merged_into_id: number | null
          name: string | null
          notes: string | null
          parent_id: number | null
          preferred_delivery: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_create_notifications_for_event: {
        Args: { p_event_id: string }
        Returns: number
      }
      rpc_create_notifications_for_order_event: {
        Args: { p_action: string; p_order_id: string }
        Returns: number
      }
      rpc_create_order: {
        Args: { payload: Json }
        Returns: {
          address: string | null
          amc_id: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_split: number | null
          archived: boolean | null
          assigned_to: string | null
          base_fee: number | null
          branch_id: number | null
          city: string | null
          client_due_at: string | null
          client_id: number | null
          client_invoice: string | null
          client_invoice_amount: number | null
          county: string | null
          created_at: string | null
          current_reviewer_id: string | null
          date_billed: string | null
          date_ordered: string | null
          date_paid: string | null
          due_date: string | null
          due_for_review: string | null
          due_to_client: string | null
          entry_contact_name: string | null
          entry_contact_phone: string | null
          external_order_no: string | null
          fee_amount: number | null
          final_due_at: string | null
          id: string
          inspection_date: string | null
          invoice_number: string | null
          invoice_paid: boolean
          is_archived: boolean
          location: Json | null
          managing_amc_id: number | null
          manual_appraiser: string | null
          manual_client: string | null
          manual_client_name: string | null
          notes: string | null
          order_number: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_type: string | null
          report_type: string | null
          review_claimed_at: string | null
          review_claimed_by: string | null
          review_due_at: string | null
          review_due_date: string | null
          review_route: Json | null
          review_stage: string | null
          reviewer_id: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          special_instructions: string | null
          split_pct: number | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_debug_notifications_access: {
        Args: never
        Returns: {
          ok: boolean
          rows_seen: number
        }[]
      }
      rpc_delete_client: { Args: { client_id: number }; Returns: undefined }
      rpc_enqueue_email_v1: {
        Args: {
          p_payload?: Json
          p_subject: string
          p_template: string
          p_to_email?: string
          p_user_id: string
        }
        Returns: string
      }
      rpc_get_my_role: { Args: never; Returns: string }
      rpc_get_notification_prefs_v1: {
        Args: { p_user_id?: string }
        Returns: {
          channel: string
          enabled: boolean
          meta: Json
          type: string
        }[]
      }
      rpc_is_client_name_available: {
        Args: { p_ignore_client_id?: string; p_name: string }
        Returns: boolean
      }
      rpc_is_order_number_available: {
        Args: { p_ignore_order_id?: string; p_order_number: string }
        Returns: boolean
      }
      rpc_list_admin_events: {
        Args: {
          p_appraiser_id?: string
          p_end_at?: string
          p_start_at?: string
        }
        Returns: {
          address: string
          appraiser_id: string
          end_at: string
          event_type: string
          order_id: string
          order_number: string
          start_at: string
        }[]
      }
      rpc_list_orders: {
        Args: {
          p_appraiser_id?: string
          p_limit?: number
          p_offset?: number
          p_q?: string
          p_status?: string
        }
        Returns: {
          address: string | null
          amc_id: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_split: number | null
          archived: boolean | null
          assigned_to: string | null
          base_fee: number | null
          branch_id: number | null
          city: string | null
          client_due_at: string | null
          client_id: number | null
          client_invoice: string | null
          client_invoice_amount: number | null
          county: string | null
          created_at: string | null
          current_reviewer_id: string | null
          date_billed: string | null
          date_ordered: string | null
          date_paid: string | null
          due_date: string | null
          due_for_review: string | null
          due_to_client: string | null
          entry_contact_name: string | null
          entry_contact_phone: string | null
          external_order_no: string | null
          fee_amount: number | null
          final_due_at: string | null
          id: string
          inspection_date: string | null
          invoice_number: string | null
          invoice_paid: boolean
          is_archived: boolean
          location: Json | null
          managing_amc_id: number | null
          manual_appraiser: string | null
          manual_client: string | null
          manual_client_name: string | null
          notes: string | null
          order_number: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_type: string | null
          report_type: string | null
          review_claimed_at: string | null
          review_claimed_by: string | null
          review_due_at: string | null
          review_due_date: string | null
          review_route: Json | null
          review_stage: string | null
          reviewer_id: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          special_instructions: string | null
          split_pct: number | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rpc_list_users_with_roles: {
        Args: never
        Returns: {
          display_name: string
          email: string
          fee_split: number
          id: string
          role: string
        }[]
      }
      rpc_log_event:
        | {
            Args: {
              p_action: string
              p_context?: Json
              p_message?: string
              p_new_status?: string
              p_order_id: string
              p_prev_status?: string
            }
            Returns: {
              action: string | null
              actor: string | null
              actor_id: string | null
              actor_name: string | null
              context: Json | null
              created_at: string | null
              created_by: string | null
              created_by_email: string | null
              created_by_name: string | null
              detail: Json
              environment: string | null
              event_data: Json | null
              event_type: string | null
              id: string
              message: string | null
              new_status: string | null
              order_id: string | null
              prev_status: string | null
              role: string | null
              user_id: string | null
              visible_to: string[] | null
            }
            SetofOptions: {
              from: "*"
              to: "activity_log"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { p_detail?: Json; p_order_id: string; p_type: string }
            Returns: undefined
          }
      rpc_log_note:
        | {
            Args: { p_context?: Json; p_message: string; p_order_id: string }
            Returns: {
              action: string | null
              actor: string | null
              actor_id: string | null
              actor_name: string | null
              context: Json | null
              created_at: string | null
              created_by: string | null
              created_by_email: string | null
              created_by_name: string | null
              detail: Json
              environment: string | null
              event_data: Json | null
              event_type: string | null
              id: string
              message: string | null
              new_status: string | null
              order_id: string | null
              prev_status: string | null
              role: string | null
              user_id: string | null
              visible_to: string[] | null
            }
            SetofOptions: {
              from: "*"
              to: "activity_log"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { p_message: string; p_order_id: string }
            Returns: {
              action: string | null
              actor: string | null
              actor_id: string | null
              actor_name: string | null
              context: Json | null
              created_at: string | null
              created_by: string | null
              created_by_email: string | null
              created_by_name: string | null
              detail: Json
              environment: string | null
              event_data: Json | null
              event_type: string | null
              id: string
              message: string | null
              new_status: string | null
              order_id: string | null
              prev_status: string | null
              role: string | null
              user_id: string | null
              visible_to: string[] | null
            }
            SetofOptions: {
              from: "*"
              to: "activity_log"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      rpc_log_status_change: {
        Args: {
          p_message?: string
          p_new_status: string
          p_order_id: string
          p_prev_status: string
        }
        Returns: {
          action: string | null
          actor: string | null
          actor_id: string | null
          actor_name: string | null
          context: Json | null
          created_at: string | null
          created_by: string | null
          created_by_email: string | null
          created_by_name: string | null
          detail: Json
          environment: string | null
          event_data: Json | null
          event_type: string | null
          id: string
          message: string | null
          new_status: string | null
          order_id: string | null
          prev_status: string | null
          role: string | null
          user_id: string | null
          visible_to: string[] | null
        }
        SetofOptions: {
          from: "*"
          to: "activity_log"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_mark_email_failed_v1: {
        Args: { p_error: string; p_id: string }
        Returns: undefined
      }
      rpc_mark_email_sent_v1: { Args: { p_id: string }; Returns: undefined }
      rpc_next_order_no: {
        Args: never
        Returns: {
          order_no: string
          seq: number
          year: number
        }[]
      }
      rpc_notification_create: {
        Args: { patch: Json }
        Returns: {
          action: string | null
          body: string | null
          category: string | null
          created_at: string | null
          event_id: string | null
          id: string
          is_read: boolean
          link_path: string | null
          message: string | null
          order_id: string | null
          payload: Json | null
          priority: string | null
          read: boolean | null
          read_at: string | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_notification_prefs_ensure: { Args: never; Returns: boolean }
      rpc_notification_prefs_get: {
        Args: { p_user_id?: string }
        Returns: {
          categories: Json | null
          dnd_until: string | null
          email_enabled: boolean | null
          push_enabled: boolean | null
          snooze_until: string | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_prefs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_notification_prefs_update:
        | {
            Args: { patch: Json }
            Returns: {
              categories: Json | null
              dnd_until: string | null
              email_enabled: boolean | null
              push_enabled: boolean | null
              snooze_until: string | null
              updated_at: string | null
              user_id: string
            }
            SetofOptions: {
              from: "*"
              to: "notification_prefs"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { p_user_id?: string; patch: Json }
            Returns: {
              categories: Json | null
              dnd_until: string | null
              email_enabled: boolean | null
              push_enabled: boolean | null
              snooze_until: string | null
              updated_at: string | null
              user_id: string
            }
            SetofOptions: {
              from: "*"
              to: "notification_prefs"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      rpc_notifications_list: {
        Args: {
          after?: string
          before?: string
          category?: string
          is_read?: boolean
          page_limit?: number
        }
        Returns: {
          action: string | null
          body: string | null
          category: string | null
          created_at: string | null
          event_id: string | null
          id: string
          is_read: boolean
          link_path: string | null
          message: string | null
          order_id: string | null
          payload: Json | null
          priority: string | null
          read: boolean | null
          read_at: string | null
          title: string | null
          type: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rpc_notifications_mark_all_read: { Args: never; Returns: undefined }
      rpc_notifications_mark_read: {
        Args: { ids: string[] }
        Returns: undefined
      }
      rpc_notifications_unread_count: { Args: never; Returns: number }
      rpc_notify_admins: {
        Args: { p_body: string; p_message?: string; p_title: string }
        Returns: number
      }
      rpc_notify_user: {
        Args: {
          p_body: string
          p_message?: string
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      rpc_order_archive: { Args: { p_order_id: string }; Returns: undefined }
      rpc_order_assign: {
        Args: {
          p_appraiser_id?: string
          p_order_id: string
          p_reviewer_id?: string
        }
        Returns: {
          address: string | null
          amc_id: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_split: number | null
          archived: boolean | null
          assigned_to: string | null
          base_fee: number | null
          branch_id: number | null
          city: string | null
          client_due_at: string | null
          client_id: number | null
          client_invoice: string | null
          client_invoice_amount: number | null
          county: string | null
          created_at: string | null
          current_reviewer_id: string | null
          date_billed: string | null
          date_ordered: string | null
          date_paid: string | null
          due_date: string | null
          due_for_review: string | null
          due_to_client: string | null
          entry_contact_name: string | null
          entry_contact_phone: string | null
          external_order_no: string | null
          fee_amount: number | null
          final_due_at: string | null
          id: string
          inspection_date: string | null
          invoice_number: string | null
          invoice_paid: boolean
          is_archived: boolean
          location: Json | null
          managing_amc_id: number | null
          manual_appraiser: string | null
          manual_client: string | null
          manual_client_name: string | null
          notes: string | null
          order_number: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_type: string | null
          report_type: string | null
          review_claimed_at: string | null
          review_claimed_by: string | null
          review_due_at: string | null
          review_due_date: string | null
          review_route: Json | null
          review_stage: string | null
          reviewer_id: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          special_instructions: string | null
          split_pct: number | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_order_assign_appraiser: {
        Args: { p_appraiser_id: string; p_order_id: string }
        Returns: boolean
      }
      rpc_order_create: {
        Args: { p: Json }
        Returns: {
          address: string | null
          amc_id: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_split: number | null
          archived: boolean | null
          assigned_to: string | null
          base_fee: number | null
          branch_id: number | null
          city: string | null
          client_due_at: string | null
          client_id: number | null
          client_invoice: string | null
          client_invoice_amount: number | null
          county: string | null
          created_at: string | null
          current_reviewer_id: string | null
          date_billed: string | null
          date_ordered: string | null
          date_paid: string | null
          due_date: string | null
          due_for_review: string | null
          due_to_client: string | null
          entry_contact_name: string | null
          entry_contact_phone: string | null
          external_order_no: string | null
          fee_amount: number | null
          final_due_at: string | null
          id: string
          inspection_date: string | null
          invoice_number: string | null
          invoice_paid: boolean
          is_archived: boolean
          location: Json | null
          managing_amc_id: number | null
          manual_appraiser: string | null
          manual_client: string | null
          manual_client_name: string | null
          notes: string | null
          order_number: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_type: string | null
          report_type: string | null
          review_claimed_at: string | null
          review_claimed_by: string | null
          review_due_at: string | null
          review_due_date: string | null
          review_route: Json | null
          review_stage: string | null
          reviewer_id: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          special_instructions: string | null
          split_pct: number | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_order_delete: { Args: { p_order_id: string }; Returns: boolean }
      rpc_order_log_note: {
        Args: { p_note: string; p_order_id: string }
        Returns: boolean
      }
      rpc_order_mark_complete: {
        Args: { p_note?: string; p_order_id: string }
        Returns: boolean
      }
      rpc_order_ready_to_send: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      rpc_order_send_to_client: {
        Args: { p_order_id: string; p_payload?: Json }
        Returns: boolean
      }
      rpc_order_set_dates:
        | {
            Args: {
              p_due_date?: string
              p_final_due_at?: string
              p_order_id: string
              p_review_due_at?: string
              p_site_visit_at?: string
            }
            Returns: {
              address: string | null
              amc_id: string | null
              appraiser_fee: number | null
              appraiser_id: string | null
              appraiser_split: number | null
              archived: boolean | null
              assigned_to: string | null
              base_fee: number | null
              branch_id: number | null
              city: string | null
              client_due_at: string | null
              client_id: number | null
              client_invoice: string | null
              client_invoice_amount: number | null
              county: string | null
              created_at: string | null
              current_reviewer_id: string | null
              date_billed: string | null
              date_ordered: string | null
              date_paid: string | null
              due_date: string | null
              due_for_review: string | null
              due_to_client: string | null
              entry_contact_name: string | null
              entry_contact_phone: string | null
              external_order_no: string | null
              fee_amount: number | null
              final_due_at: string | null
              id: string
              inspection_date: string | null
              invoice_number: string | null
              invoice_paid: boolean
              is_archived: boolean
              location: Json | null
              managing_amc_id: number | null
              manual_appraiser: string | null
              manual_client: string | null
              manual_client_name: string | null
              notes: string | null
              order_number: string | null
              paid_at: string | null
              paid_status: string | null
              postal_code: string | null
              property_address: string | null
              property_type: string | null
              report_type: string | null
              review_claimed_at: string | null
              review_claimed_by: string | null
              review_due_at: string | null
              review_due_date: string | null
              review_route: Json | null
              review_stage: string | null
              reviewer_id: string | null
              site_visit_at: string | null
              site_visit_date: string | null
              special_instructions: string | null
              split_pct: number | null
              state: string | null
              status: string | null
              title: string | null
              updated_at: string | null
              zip: string | null
            }
            SetofOptions: {
              from: "*"
              to: "orders"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_due_date?: string
              p_order_id: string
              p_review_due_at?: string
              p_site_visit_at?: string
            }
            Returns: {
              address: string | null
              amc_id: string | null
              appraiser_fee: number | null
              appraiser_id: string | null
              appraiser_split: number | null
              archived: boolean | null
              assigned_to: string | null
              base_fee: number | null
              branch_id: number | null
              city: string | null
              client_due_at: string | null
              client_id: number | null
              client_invoice: string | null
              client_invoice_amount: number | null
              county: string | null
              created_at: string | null
              current_reviewer_id: string | null
              date_billed: string | null
              date_ordered: string | null
              date_paid: string | null
              due_date: string | null
              due_for_review: string | null
              due_to_client: string | null
              entry_contact_name: string | null
              entry_contact_phone: string | null
              external_order_no: string | null
              fee_amount: number | null
              final_due_at: string | null
              id: string
              inspection_date: string | null
              invoice_number: string | null
              invoice_paid: boolean
              is_archived: boolean
              location: Json | null
              managing_amc_id: number | null
              manual_appraiser: string | null
              manual_client: string | null
              manual_client_name: string | null
              notes: string | null
              order_number: string | null
              paid_at: string | null
              paid_status: string | null
              postal_code: string | null
              property_address: string | null
              property_type: string | null
              report_type: string | null
              review_claimed_at: string | null
              review_claimed_by: string | null
              review_due_at: string | null
              review_due_date: string | null
              review_route: Json | null
              review_stage: string | null
              reviewer_id: string | null
              site_visit_at: string | null
              site_visit_date: string | null
              special_instructions: string | null
              split_pct: number | null
              state: string | null
              status: string | null
              title: string | null
              updated_at: string | null
              zip: string | null
            }
            SetofOptions: {
              from: "*"
              to: "orders"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      rpc_order_set_status:
        | {
            Args: { p_note?: string; p_order_id: string; p_status: string }
            Returns: {
              address: string | null
              amc_id: string | null
              appraiser_fee: number | null
              appraiser_id: string | null
              appraiser_split: number | null
              archived: boolean | null
              assigned_to: string | null
              base_fee: number | null
              branch_id: number | null
              city: string | null
              client_due_at: string | null
              client_id: number | null
              client_invoice: string | null
              client_invoice_amount: number | null
              county: string | null
              created_at: string | null
              current_reviewer_id: string | null
              date_billed: string | null
              date_ordered: string | null
              date_paid: string | null
              due_date: string | null
              due_for_review: string | null
              due_to_client: string | null
              entry_contact_name: string | null
              entry_contact_phone: string | null
              external_order_no: string | null
              fee_amount: number | null
              final_due_at: string | null
              id: string
              inspection_date: string | null
              invoice_number: string | null
              invoice_paid: boolean
              is_archived: boolean
              location: Json | null
              managing_amc_id: number | null
              manual_appraiser: string | null
              manual_client: string | null
              manual_client_name: string | null
              notes: string | null
              order_number: string | null
              paid_at: string | null
              paid_status: string | null
              postal_code: string | null
              property_address: string | null
              property_type: string | null
              report_type: string | null
              review_claimed_at: string | null
              review_claimed_by: string | null
              review_due_at: string | null
              review_due_date: string | null
              review_route: Json | null
              review_stage: string | null
              reviewer_id: string | null
              site_visit_at: string | null
              site_visit_date: string | null
              special_instructions: string | null
              split_pct: number | null
              state: string | null
              status: string | null
              title: string | null
              updated_at: string | null
              zip: string | null
            }
            SetofOptions: {
              from: "*"
              to: "orders"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | { Args: { p_order_id: string; p_status: string }; Returns: boolean }
      rpc_order_update:
        | {
            Args: { p_order_id: string; p_patch: Json }
            Returns: {
              address: string | null
              amc_id: string | null
              appraiser_fee: number | null
              appraiser_id: string | null
              appraiser_split: number | null
              archived: boolean | null
              assigned_to: string | null
              base_fee: number | null
              branch_id: number | null
              city: string | null
              client_due_at: string | null
              client_id: number | null
              client_invoice: string | null
              client_invoice_amount: number | null
              county: string | null
              created_at: string | null
              current_reviewer_id: string | null
              date_billed: string | null
              date_ordered: string | null
              date_paid: string | null
              due_date: string | null
              due_for_review: string | null
              due_to_client: string | null
              entry_contact_name: string | null
              entry_contact_phone: string | null
              external_order_no: string | null
              fee_amount: number | null
              final_due_at: string | null
              id: string
              inspection_date: string | null
              invoice_number: string | null
              invoice_paid: boolean
              is_archived: boolean
              location: Json | null
              managing_amc_id: number | null
              manual_appraiser: string | null
              manual_client: string | null
              manual_client_name: string | null
              notes: string | null
              order_number: string | null
              paid_at: string | null
              paid_status: string | null
              postal_code: string | null
              property_address: string | null
              property_type: string | null
              report_type: string | null
              review_claimed_at: string | null
              review_claimed_by: string | null
              review_due_at: string | null
              review_due_date: string | null
              review_route: Json | null
              review_stage: string | null
              reviewer_id: string | null
              site_visit_at: string | null
              site_visit_date: string | null
              special_instructions: string | null
              split_pct: number | null
              state: string | null
              status: string | null
              title: string | null
              updated_at: string | null
              zip: string | null
            }
            SetofOptions: {
              from: "*"
              to: "orders"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { p: Json; p_order_id: string }
            Returns: {
              address: string | null
              amc_id: string | null
              appraiser_fee: number | null
              appraiser_id: string | null
              appraiser_split: number | null
              archived: boolean | null
              assigned_to: string | null
              base_fee: number | null
              branch_id: number | null
              city: string | null
              client_due_at: string | null
              client_id: number | null
              client_invoice: string | null
              client_invoice_amount: number | null
              county: string | null
              created_at: string | null
              current_reviewer_id: string | null
              date_billed: string | null
              date_ordered: string | null
              date_paid: string | null
              due_date: string | null
              due_for_review: string | null
              due_to_client: string | null
              entry_contact_name: string | null
              entry_contact_phone: string | null
              external_order_no: string | null
              fee_amount: number | null
              final_due_at: string | null
              id: string
              inspection_date: string | null
              invoice_number: string | null
              invoice_paid: boolean
              is_archived: boolean
              location: Json | null
              managing_amc_id: number | null
              manual_appraiser: string | null
              manual_client: string | null
              manual_client_name: string | null
              notes: string | null
              order_number: string | null
              paid_at: string | null
              paid_status: string | null
              postal_code: string | null
              property_address: string | null
              property_type: string | null
              report_type: string | null
              review_claimed_at: string | null
              review_claimed_by: string | null
              review_due_at: string | null
              review_due_date: string | null
              review_route: Json | null
              review_stage: string | null
              reviewer_id: string | null
              site_visit_at: string | null
              site_visit_date: string | null
              special_instructions: string | null
              split_pct: number | null
              state: string | null
              status: string | null
              title: string | null
              updated_at: string | null
              zip: string | null
            }
            SetofOptions: {
              from: "*"
              to: "orders"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      rpc_order_update_dates: {
        Args: {
          p_due_date: string
          p_final_due_at: string
          p_order_id: string
          p_review_due_at: string
          p_site_visit_at: string
        }
        Returns: {
          address: string | null
          amc_id: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_split: number | null
          archived: boolean | null
          assigned_to: string | null
          base_fee: number | null
          branch_id: number | null
          city: string | null
          client_due_at: string | null
          client_id: number | null
          client_invoice: string | null
          client_invoice_amount: number | null
          county: string | null
          created_at: string | null
          current_reviewer_id: string | null
          date_billed: string | null
          date_ordered: string | null
          date_paid: string | null
          due_date: string | null
          due_for_review: string | null
          due_to_client: string | null
          entry_contact_name: string | null
          entry_contact_phone: string | null
          external_order_no: string | null
          fee_amount: number | null
          final_due_at: string | null
          id: string
          inspection_date: string | null
          invoice_number: string | null
          invoice_paid: boolean
          is_archived: boolean
          location: Json | null
          managing_amc_id: number | null
          manual_appraiser: string | null
          manual_client: string | null
          manual_client_name: string | null
          notes: string | null
          order_number: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_type: string | null
          report_type: string | null
          review_claimed_at: string | null
          review_claimed_by: string | null
          review_due_at: string | null
          review_due_date: string | null
          review_route: Json | null
          review_stage: string | null
          reviewer_id: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          special_instructions: string | null
          split_pct: number | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_review_approve: {
        Args: { p_note?: string; p_order_id: string }
        Returns: boolean
      }
      rpc_review_request_revisions: {
        Args: { p_note?: string; p_order_id: string }
        Returns: boolean
      }
      rpc_review_start: { Args: { p_order_id: string }; Returns: boolean }
      rpc_set_notification_pref: {
        Args: {
          p_channel: string
          p_enabled: boolean
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      rpc_set_notification_pref_v1: {
        Args: {
          p_channel: string
          p_enabled: boolean
          p_meta?: Json
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      rpc_set_review_route: {
        Args: { order_id: string; route: Json }
        Returns: {
          address: string | null
          amc_id: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_split: number | null
          archived: boolean | null
          assigned_to: string | null
          base_fee: number | null
          branch_id: number | null
          city: string | null
          client_due_at: string | null
          client_id: number | null
          client_invoice: string | null
          client_invoice_amount: number | null
          county: string | null
          created_at: string | null
          current_reviewer_id: string | null
          date_billed: string | null
          date_ordered: string | null
          date_paid: string | null
          due_date: string | null
          due_for_review: string | null
          due_to_client: string | null
          entry_contact_name: string | null
          entry_contact_phone: string | null
          external_order_no: string | null
          fee_amount: number | null
          final_due_at: string | null
          id: string
          inspection_date: string | null
          invoice_number: string | null
          invoice_paid: boolean
          is_archived: boolean
          location: Json | null
          managing_amc_id: number | null
          manual_appraiser: string | null
          manual_client: string | null
          manual_client_name: string | null
          notes: string | null
          order_number: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_type: string | null
          report_type: string | null
          review_claimed_at: string | null
          review_claimed_by: string | null
          review_due_at: string | null
          review_due_date: string | null
          review_route: Json | null
          review_stage: string | null
          reviewer_id: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          special_instructions: string | null
          split_pct: number | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_set_user_role: {
        Args: { p_grant: boolean; p_role: string; p_user_id: string }
        Returns: undefined
      }
      rpc_update_client: {
        Args: { client_id: number; patch: Json }
        Returns: {
          amc_id: number | null
          amc_legacy_id: string | null
          category: string | null
          client_type: string | null
          company: string | null
          company_address: string | null
          company_group: string | null
          contact_email_1: string | null
          contact_email_2: string | null
          contact_name_1: string | null
          contact_name_2: string | null
          contact_phone_1: string | null
          contact_phone_2: string | null
          contacts: Json | null
          created_at: string | null
          default_instructions: string | null
          id: number
          is_archived: boolean
          is_merged: boolean | null
          kind: string | null
          merged_into_id: number | null
          name: string | null
          notes: string | null
          parent_id: number | null
          preferred_delivery: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_update_due_dates: {
        Args: {
          p_due_date: string
          p_order_id: string
          p_review_due_date: string
        }
        Returns: {
          address: string | null
          amc_id: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_split: number | null
          archived: boolean | null
          assigned_to: string | null
          base_fee: number | null
          branch_id: number | null
          city: string | null
          client_due_at: string | null
          client_id: number | null
          client_invoice: string | null
          client_invoice_amount: number | null
          county: string | null
          created_at: string | null
          current_reviewer_id: string | null
          date_billed: string | null
          date_ordered: string | null
          date_paid: string | null
          due_date: string | null
          due_for_review: string | null
          due_to_client: string | null
          entry_contact_name: string | null
          entry_contact_phone: string | null
          external_order_no: string | null
          fee_amount: number | null
          final_due_at: string | null
          id: string
          inspection_date: string | null
          invoice_number: string | null
          invoice_paid: boolean
          is_archived: boolean
          location: Json | null
          managing_amc_id: number | null
          manual_appraiser: string | null
          manual_client: string | null
          manual_client_name: string | null
          notes: string | null
          order_number: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_type: string | null
          report_type: string | null
          review_claimed_at: string | null
          review_claimed_by: string | null
          review_due_at: string | null
          review_due_date: string | null
          review_route: Json | null
          review_stage: string | null
          reviewer_id: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          special_instructions: string | null
          split_pct: number | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_update_order: {
        Args: { order_id: string; patch: Json }
        Returns: {
          address: string | null
          amc_id: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_split: number | null
          archived: boolean | null
          assigned_to: string | null
          base_fee: number | null
          branch_id: number | null
          city: string | null
          client_due_at: string | null
          client_id: number | null
          client_invoice: string | null
          client_invoice_amount: number | null
          county: string | null
          created_at: string | null
          current_reviewer_id: string | null
          date_billed: string | null
          date_ordered: string | null
          date_paid: string | null
          due_date: string | null
          due_for_review: string | null
          due_to_client: string | null
          entry_contact_name: string | null
          entry_contact_phone: string | null
          external_order_no: string | null
          fee_amount: number | null
          final_due_at: string | null
          id: string
          inspection_date: string | null
          invoice_number: string | null
          invoice_paid: boolean
          is_archived: boolean
          location: Json | null
          managing_amc_id: number | null
          manual_appraiser: string | null
          manual_client: string | null
          manual_client_name: string | null
          notes: string | null
          order_number: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_type: string | null
          report_type: string | null
          review_claimed_at: string | null
          review_claimed_by: string | null
          review_due_at: string | null
          review_due_date: string | null
          review_route: Json | null
          review_stage: string | null
          reviewer_id: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          special_instructions: string | null
          split_pct: number | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_update_order_dates: {
        Args: {
          final_due_at: string
          order_id: string
          review_due_at: string
          site_visit_at: string
        }
        Returns: {
          address: string | null
          amc_id: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_split: number | null
          archived: boolean | null
          assigned_to: string | null
          base_fee: number | null
          branch_id: number | null
          city: string | null
          client_due_at: string | null
          client_id: number | null
          client_invoice: string | null
          client_invoice_amount: number | null
          county: string | null
          created_at: string | null
          current_reviewer_id: string | null
          date_billed: string | null
          date_ordered: string | null
          date_paid: string | null
          due_date: string | null
          due_for_review: string | null
          due_to_client: string | null
          entry_contact_name: string | null
          entry_contact_phone: string | null
          external_order_no: string | null
          fee_amount: number | null
          final_due_at: string | null
          id: string
          inspection_date: string | null
          invoice_number: string | null
          invoice_paid: boolean
          is_archived: boolean
          location: Json | null
          managing_amc_id: number | null
          manual_appraiser: string | null
          manual_client: string | null
          manual_client_name: string | null
          notes: string | null
          order_number: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_type: string | null
          report_type: string | null
          review_claimed_at: string | null
          review_claimed_by: string | null
          review_due_at: string | null
          review_due_date: string | null
          review_route: Json | null
          review_stage: string | null
          reviewer_id: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          special_instructions: string | null
          split_pct: number | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_update_order_status: {
        Args: { next_status: string; order_id: string }
        Returns: {
          address: string | null
          amc_id: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_split: number | null
          archived: boolean | null
          assigned_to: string | null
          base_fee: number | null
          branch_id: number | null
          city: string | null
          client_due_at: string | null
          client_id: number | null
          client_invoice: string | null
          client_invoice_amount: number | null
          county: string | null
          created_at: string | null
          current_reviewer_id: string | null
          date_billed: string | null
          date_ordered: string | null
          date_paid: string | null
          due_date: string | null
          due_for_review: string | null
          due_to_client: string | null
          entry_contact_name: string | null
          entry_contact_phone: string | null
          external_order_no: string | null
          fee_amount: number | null
          final_due_at: string | null
          id: string
          inspection_date: string | null
          invoice_number: string | null
          invoice_paid: boolean
          is_archived: boolean
          location: Json | null
          managing_amc_id: number | null
          manual_appraiser: string | null
          manual_client: string | null
          manual_client_name: string | null
          notes: string | null
          order_number: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_type: string | null
          report_type: string | null
          review_claimed_at: string | null
          review_claimed_by: string | null
          review_due_at: string | null
          review_due_date: string | null
          review_route: Json | null
          review_stage: string | null
          reviewer_id: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          special_instructions: string | null
          split_pct: number | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_update_order_status_with_note: {
        Args: { next_status: string; note: string; order_id: string }
        Returns: {
          address: string | null
          amc_id: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_split: number | null
          archived: boolean | null
          assigned_to: string | null
          base_fee: number | null
          branch_id: number | null
          city: string | null
          client_due_at: string | null
          client_id: number | null
          client_invoice: string | null
          client_invoice_amount: number | null
          county: string | null
          created_at: string | null
          current_reviewer_id: string | null
          date_billed: string | null
          date_ordered: string | null
          date_paid: string | null
          due_date: string | null
          due_for_review: string | null
          due_to_client: string | null
          entry_contact_name: string | null
          entry_contact_phone: string | null
          external_order_no: string | null
          fee_amount: number | null
          final_due_at: string | null
          id: string
          inspection_date: string | null
          invoice_number: string | null
          invoice_paid: boolean
          is_archived: boolean
          location: Json | null
          managing_amc_id: number | null
          manual_appraiser: string | null
          manual_client: string | null
          manual_client_name: string | null
          notes: string | null
          order_number: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_type: string | null
          report_type: string | null
          review_claimed_at: string | null
          review_claimed_by: string | null
          review_due_at: string | null
          review_due_date: string | null
          review_route: Json | null
          review_stage: string | null
          reviewer_id: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          special_instructions: string | null
          split_pct: number | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_update_order_v1: {
        Args: {
          p_actor?: Json
          p_appraiser_id?: string
          p_final_due?: string
          p_order_id: string
          p_review_due?: string
          p_site_visit?: string
          p_status?: string
        }
        Returns: undefined
      }
      rpc_update_profile: {
        Args: {
          p_avatar_url: string
          p_color: string
          p_display_name: string
          p_phone: string
        }
        Returns: {
          avatar_url: string | null
          color: string | null
          created_at: string
          display_name: string | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_user_set_color: {
        Args: { p_auth_id: string; p_color: string }
        Returns: boolean
      }
      rpc_user_set_fee_split: {
        Args: { p_auth_id: string; p_fee: number }
        Returns: boolean
      }
      rpc_user_set_role: {
        Args: { p_auth_id: string; p_role: string }
        Returns: boolean
      }
      rpc_user_set_status: {
        Args: { p_auth_id: string; p_status: string }
        Returns: boolean
      }
      safe_uuid: { Args: { p_text: string }; Returns: string }
      set_order_appointment: {
        Args: { p_datetime: string; p_note?: string; p_order_id: string }
        Returns: string
      }
      set_order_status: {
        Args: { p_order_id: string; p_status: string }
        Returns: undefined
      }
      team_list_users: {
        Args: never
        Returns: {
          auth_id: string | null
          avatar_url: string | null
          bio: string | null
          color: string | null
          created_at: string | null
          display_color: string | null
          display_name: string | null
          email: string
          fee_split: number | null
          full_name: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          role: string
          split: number | null
          status: string | null
          uid: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_user_profile_basic: {
        Args: { p_email: string; p_name: string; p_user_id: string }
        Returns: undefined
      }
      upsert_user_settings: {
        Args: { p_phone: string; p_preferences: Json; p_user_id: string }
        Returns: undefined
      }
      user_has_role: { Args: { p_role: string }; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
