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
          actor_user_id: string | null
          company_id: string | null
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
          actor_user_id?: string | null
          company_id?: string | null
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
          actor_user_id?: string | null
          company_id?: string | null
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
            foreignKeyName: "activity_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_legacy"
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
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "amc_lenders_amc_id_fkey"
            columns: ["amc_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "amc_lenders_amc_id_fkey"
            columns: ["amc_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "amc_lenders_lender_id_fkey"
            columns: ["lender_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "amc_lenders_lender_id_fkey"
            columns: ["lender_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
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
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["order_id"]
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
        ]
      }
      calendar_events: {
        Row: {
          appraiser_id: string | null
          appraiser_user_id: string | null
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
            foreignKeyName: "calendar_events_appraiser_id_fkey"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["auth_id"]
          },
          {
            foreignKeyName: "calendar_events_appraiser_id_fkey"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_appraiser_id_fkey"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "calendar_events_appraiser_user_fkey"
            columns: ["appraiser_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
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
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["order_id"]
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "clients_amc_id_fkey"
            columns: ["amc_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "clients_amc_id_fkey"
            columns: ["amc_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "clients_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "clients_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_parent_id"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_parent_id"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
        ]
      }
      companies: {
        Row: {
          company_type: string
          created_at: string
          id: string
          locale: string
          name: string
          operating_mode_settings: Json
          settings: Json
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          company_type?: string
          created_at?: string
          id?: string
          locale?: string
          name: string
          operating_mode_settings?: Json
          settings?: Json
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          company_type?: string
          created_at?: string
          id?: string
          locale?: string
          name?: string
          operating_mode_settings?: Json
          settings?: Json
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_company_type_fkey"
            columns: ["company_type"]
            isOneToOne: false
            referencedRelation: "company_types"
            referencedColumns: ["key"]
          },
        ]
      }
      company_audit_events: {
        Row: {
          actor_auth_id: string | null
          actor_kind: string
          actor_user_id: string | null
          company_id: string | null
          created_at: string
          event_type: string
          id: string
          idempotency_key: string | null
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          actor_auth_id?: string | null
          actor_kind?: string
          actor_user_id?: string | null
          company_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          actor_auth_id?: string | null
          actor_kind?: string
          actor_user_id?: string | null
          company_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_audit_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_audit_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_member_invitations: {
        Row: {
          accepted_at: string | null
          auth_error_code: string | null
          auth_error_message: string | null
          auth_invite_sent_at: string | null
          cancelled_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          finalized_at: string | null
          id: string
          invited_auth_id: string | null
          invited_by_user_id: string
          invited_user_id: string | null
          membership_id: string | null
          metadata: Json
          normalized_email: string
          prepared_at: string
          primary_role_id: string | null
          reason: string | null
          request_id: string | null
          role_ids: string[]
          role_snapshot: Json
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          auth_error_code?: string | null
          auth_error_message?: string | null
          auth_invite_sent_at?: string | null
          cancelled_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at: string
          finalized_at?: string | null
          id?: string
          invited_auth_id?: string | null
          invited_by_user_id: string
          invited_user_id?: string | null
          membership_id?: string | null
          metadata?: Json
          normalized_email: string
          prepared_at?: string
          primary_role_id?: string | null
          reason?: string | null
          request_id?: string | null
          role_ids: string[]
          role_snapshot?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          auth_error_code?: string | null
          auth_error_message?: string | null
          auth_invite_sent_at?: string | null
          cancelled_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          finalized_at?: string | null
          id?: string
          invited_auth_id?: string | null
          invited_by_user_id?: string
          invited_user_id?: string | null
          membership_id?: string | null
          metadata?: Json
          normalized_email?: string
          prepared_at?: string
          primary_role_id?: string | null
          reason?: string | null
          request_id?: string | null
          role_ids?: string[]
          role_snapshot?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_member_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_member_invitations_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_member_invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_member_invitations_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "company_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_member_invitations_primary_role_id_fkey"
            columns: ["primary_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_memberships: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          is_primary: boolean
          joined_at: string | null
          membership_type: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_primary?: boolean
          joined_at?: string | null
          membership_type?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_primary?: boolean
          joined_at?: string | null
          membership_type?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_relationship_types: {
        Row: {
          allowed_source_company_types: string[]
          allowed_target_company_types: string[]
          created_at: string
          default_settings: Json
          description: string | null
          is_active: boolean
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allowed_source_company_types?: string[]
          allowed_target_company_types?: string[]
          created_at?: string
          default_settings?: Json
          description?: string | null
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allowed_source_company_types?: string[]
          allowed_target_company_types?: string[]
          created_at?: string
          default_settings?: Json
          description?: string | null
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      company_relationships: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          archived_at: string | null
          archived_by_user_id: string | null
          compliance: Json
          created_at: string
          declined_at: string | null
          declined_by_user_id: string | null
          ends_at: string | null
          id: string
          invited_at: string | null
          invited_by_user_id: string | null
          notes: string | null
          relationship_type: string
          settings: Json
          source_company_id: string
          starts_at: string | null
          status: string
          suspended_at: string | null
          suspended_by_user_id: string | null
          target_company_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          archived_at?: string | null
          archived_by_user_id?: string | null
          compliance?: Json
          created_at?: string
          declined_at?: string | null
          declined_by_user_id?: string | null
          ends_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by_user_id?: string | null
          notes?: string | null
          relationship_type: string
          settings?: Json
          source_company_id: string
          starts_at?: string | null
          status?: string
          suspended_at?: string | null
          suspended_by_user_id?: string | null
          target_company_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          archived_at?: string | null
          archived_by_user_id?: string | null
          compliance?: Json
          created_at?: string
          declined_at?: string | null
          declined_by_user_id?: string | null
          ends_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by_user_id?: string | null
          notes?: string | null
          relationship_type?: string
          settings?: Json
          source_company_id?: string
          starts_at?: string | null
          status?: string
          suspended_at?: string | null
          suspended_by_user_id?: string | null
          target_company_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_relationships_approved_by_user_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_relationships_archived_by_user_fkey"
            columns: ["archived_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_relationships_declined_by_user_fkey"
            columns: ["declined_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_relationships_invited_by_user_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_relationships_relationship_type_fkey"
            columns: ["relationship_type"]
            isOneToOne: false
            referencedRelation: "company_relationship_types"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "company_relationships_source_company_fkey"
            columns: ["source_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_relationships_suspended_by_user_fkey"
            columns: ["suspended_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_relationships_target_company_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_types: {
        Row: {
          created_at: string
          default_settings: Json
          description: string | null
          is_active: boolean
          key: string
          label: string
          onboarding_defaults: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_settings?: Json
          description?: string | null
          is_active?: boolean
          key: string
          label: string
          onboarding_defaults?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_settings?: Json
          description?: string | null
          is_active?: boolean
          key?: string
          label?: string
          onboarding_defaults?: Json
          sort_order?: number
          updated_at?: string
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string
          error: string | null
          id: string
          notification_id: string | null
          sent_at: string | null
          status: string
          subject: string
          to_email: string
          to_user_id: string
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          error?: string | null
          id?: string
          notification_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
          to_user_id: string
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          error?: string | null
          id?: string
          notification_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
        ]
      }
      identity_role_backfill_log: {
        Row: {
          created_at: string
          migration_tag: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          migration_tag: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          migration_tag?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      identity_role_review_log: {
        Row: {
          auth_id: string | null
          canonical_user_roles_role: string | null
          created_at: string
          details: Json
          email: string | null
          id: number
          issue_type: string
          migration_tag: string
          user_id: string | null
          users_role: string | null
        }
        Insert: {
          auth_id?: string | null
          canonical_user_roles_role?: string | null
          created_at?: string
          details?: Json
          email?: string | null
          id?: number
          issue_type: string
          migration_tag: string
          user_id?: string | null
          users_role?: string | null
        }
        Update: {
          auth_id?: string | null
          canonical_user_roles_role?: string | null
          created_at?: string
          details?: Json
          email?: string | null
          id?: number
          issue_type?: string
          migration_tag?: string
          user_id?: string | null
          users_role?: string | null
        }
        Relationships: []
      }
      instance_blueprint: {
        Row: {
          created_at: string
          default_status: string
          description: string
          evidence_hint: string | null
          id: number
          metadata: Json
          owner_role: string | null
          phase: string
          required: boolean
          step_key: string
          step_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_status?: string
          description: string
          evidence_hint?: string | null
          id?: number
          metadata?: Json
          owner_role?: string | null
          phase: string
          required?: boolean
          step_key: string
          step_order: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_status?: string
          description?: string
          evidence_hint?: string | null
          id?: number
          metadata?: Json
          owner_role?: string | null
          phase?: string
          required?: boolean
          step_key?: string
          step_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      instance_blueprint_backup_20260319: {
        Row: {
          artifact_name: string | null
          artifact_type: string | null
          created_at: string | null
          domain: string | null
          id: number | null
          install_phase: number | null
          notes: string | null
          purpose: string | null
          requirement_level: string | null
          updated_at: string | null
        }
        Insert: {
          artifact_name?: string | null
          artifact_type?: string | null
          created_at?: string | null
          domain?: string | null
          id?: number | null
          install_phase?: number | null
          notes?: string | null
          purpose?: string | null
          requirement_level?: string | null
          updated_at?: string | null
        }
        Update: {
          artifact_name?: string | null
          artifact_type?: string | null
          created_at?: string | null
          domain?: string | null
          id?: number | null
          install_phase?: number | null
          notes?: string | null
          purpose?: string | null
          requirement_level?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      notification_preferences: {
        Row: {
          digest_mode: string | null
          email_address: string | null
          email_enabled: boolean
          quiet_hours: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          digest_mode?: string | null
          email_address?: string | null
          email_enabled?: boolean
          quiet_hours?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          digest_mode?: string | null
          email_address?: string | null
          email_enabled?: boolean
          quiet_hours?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
      notifications: {
        Row: {
          action: string | null
          body: string | null
          category: string | null
          company_id: string | null
          created_at: string | null
          dismissed_at: string | null
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
          company_id?: string | null
          created_at?: string | null
          dismissed_at?: string | null
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
          company_id?: string | null
          created_at?: string | null
          dismissed_at?: string | null
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
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activity_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activity_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["order_id"]
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
            foreignKeyName: "order_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["auth_id"]
          },
          {
            foreignKeyName: "order_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "order_activity_user_uid_fkey"
            columns: ["user_uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["order_id"]
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
            foreignKeyName: "order_assignments_user_uid_fkey"
            columns: ["user_uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_company_assignment_activity: {
        Row: {
          actor_company_id: string | null
          actor_side: string
          actor_user_id: string | null
          assigned_company_id: string
          assignment_id: string
          created_at: string
          event_type: string
          id: string
          message: string | null
          order_id: string
          owner_company_id: string
          payload: Json
          relationship_id: string
        }
        Insert: {
          actor_company_id?: string | null
          actor_side?: string
          actor_user_id?: string | null
          assigned_company_id: string
          assignment_id: string
          created_at?: string
          event_type: string
          id?: string
          message?: string | null
          order_id: string
          owner_company_id: string
          payload?: Json
          relationship_id: string
        }
        Update: {
          actor_company_id?: string | null
          actor_side?: string
          actor_user_id?: string | null
          assigned_company_id?: string
          assignment_id?: string
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          order_id?: string
          owner_company_id?: string
          payload?: Json
          relationship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_company_assignment_activity_actor_company_fkey"
            columns: ["actor_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_actor_user_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_assigned_company_fkey"
            columns: ["assigned_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_assignment_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "order_company_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_all"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_dashboard_active"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_owner_company_fkey"
            columns: ["owner_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignment_activity_relationship_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "company_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      order_company_assignments: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          assigned_company_id: string
          assignment_type: string
          cancelled_at: string | null
          cancelled_by_user_id: string | null
          completed_at: string | null
          completed_by_user_id: string | null
          compliance_snapshot: Json
          created_at: string
          declined_at: string | null
          declined_by_user_id: string | null
          due_at: string | null
          expires_at: string | null
          handoff_payload: Json
          id: string
          instructions: string | null
          offered_at: string | null
          offered_by_user_id: string | null
          order_id: string
          owner_company_id: string
          relationship_id: string
          review_due_at: string | null
          revoked_at: string | null
          revoked_by_user_id: string | null
          started_at: string | null
          status: string
          submission_payload: Json
          submitted_at: string | null
          submitted_by_user_id: string | null
          terms: Json
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          assigned_company_id: string
          assignment_type: string
          cancelled_at?: string | null
          cancelled_by_user_id?: string | null
          completed_at?: string | null
          completed_by_user_id?: string | null
          compliance_snapshot?: Json
          created_at?: string
          declined_at?: string | null
          declined_by_user_id?: string | null
          due_at?: string | null
          expires_at?: string | null
          handoff_payload?: Json
          id?: string
          instructions?: string | null
          offered_at?: string | null
          offered_by_user_id?: string | null
          order_id: string
          owner_company_id: string
          relationship_id: string
          review_due_at?: string | null
          revoked_at?: string | null
          revoked_by_user_id?: string | null
          started_at?: string | null
          status?: string
          submission_payload?: Json
          submitted_at?: string | null
          submitted_by_user_id?: string | null
          terms?: Json
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          assigned_company_id?: string
          assignment_type?: string
          cancelled_at?: string | null
          cancelled_by_user_id?: string | null
          completed_at?: string | null
          completed_by_user_id?: string | null
          compliance_snapshot?: Json
          created_at?: string
          declined_at?: string | null
          declined_by_user_id?: string | null
          due_at?: string | null
          expires_at?: string | null
          handoff_payload?: Json
          id?: string
          instructions?: string | null
          offered_at?: string | null
          offered_by_user_id?: string | null
          order_id?: string
          owner_company_id?: string
          relationship_id?: string
          review_due_at?: string | null
          revoked_at?: string | null
          revoked_by_user_id?: string | null
          started_at?: string | null
          status?: string
          submission_payload?: Json
          submitted_at?: string | null
          submitted_by_user_id?: string | null
          terms?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_company_assignments_accepted_by_user_fkey"
            columns: ["accepted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_assigned_company_fkey"
            columns: ["assigned_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_cancelled_by_user_fkey"
            columns: ["cancelled_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_completed_by_user_fkey"
            columns: ["completed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_declined_by_user_fkey"
            columns: ["declined_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_offered_by_user_fkey"
            columns: ["offered_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_company_assignments_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_all"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_dashboard_active"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_company_assignments_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_company_assignments_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_company_assignments_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_company_assignments_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_list_with_last_activity_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_order_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_unified_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_owner_company_fkey"
            columns: ["owner_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_relationship_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "company_relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_revoked_by_user_fkey"
            columns: ["revoked_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_company_assignments_submitted_by_user_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
      order_number_counters: {
        Row: {
          counter_year: number
          created_at: string
          id: number
          last_value: number
          rule_id: number
          updated_at: string
        }
        Insert: {
          counter_year: number
          created_at?: string
          id?: never
          last_value?: number
          rule_id: number
          updated_at?: string
        }
        Update: {
          counter_year?: number
          created_at?: string
          id?: never
          last_value?: number
          rule_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_number_counters_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "order_numbering_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      order_numbering_rules: {
        Row: {
          company_key: string
          created_at: string
          format_kind: string
          id: number
          is_active: boolean
          manual_override_allowed: boolean
          reset_period: string
          sequence_digits: number
          updated_at: string
          year_digits: number
        }
        Insert: {
          company_key: string
          created_at?: string
          format_kind?: string
          id?: never
          is_active?: boolean
          manual_override_allowed?: boolean
          reset_period?: string
          sequence_digits?: number
          updated_at?: string
          year_digits?: number
        }
        Update: {
          company_key?: string
          created_at?: string
          format_kind?: string
          id?: never
          is_active?: boolean
          manual_override_allowed?: boolean
          reset_period?: string
          sequence_digits?: number
          updated_at?: string
          year_digits?: number
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
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["order_id"]
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
        ]
      }
      orders: {
        Row: {
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
          access_notes?: string | null
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
          company_id?: string | null
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
          owner_id?: string | null
          paid_at?: string | null
          paid_status?: string | null
          postal_code?: string | null
          property_address?: string | null
          property_contact_name?: string | null
          property_contact_phone?: string | null
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
          access_notes?: string | null
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
          company_id?: string | null
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
          owner_id?: string | null
          paid_at?: string | null
          paid_status?: string | null
          postal_code?: string | null
          property_address?: string | null
          property_contact_name?: string | null
          property_contact_phone?: string | null
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_current_reviewer"
            columns: ["current_reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_owner"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
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
            foreignKeyName: "orders_amc_id_fkey"
            columns: ["amc_id"]
            isOneToOne: false
            referencedRelation: "amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "orders_managing_amc_id_fkey"
            columns: ["managing_amc_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "orders_managing_amc_id_fkey"
            columns: ["managing_amc_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          is_owner_only: boolean
          is_system: boolean
          key: string
          label: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          is_owner_only?: boolean
          is_system?: boolean
          key: string
          label: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          is_owner_only?: boolean
          is_system?: boolean
          key?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles_legacy: {
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
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["auth_id"]
          },
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["uid"]
          },
        ]
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
            foreignKeyName: "review_flow_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_flow_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_flow_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["order_id"]
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
      role_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          permission_key: string
          role_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          permission_key: string
          role_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_owner_role: boolean
          is_system: boolean
          is_template: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_owner_role?: boolean
          is_system?: boolean
          is_template?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_owner_role?: boolean
          is_system?: boolean
          is_template?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      schema_decisions: {
        Row: {
          category: string
          created_at: string
          decided_by: string
          decided_on: string
          decision_key: string
          decision_status: string
          id: number
          impact: string | null
          metadata: Json
          rationale: string
          related_objects: Json
          supersedes_decision_key: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          decided_by?: string
          decided_on?: string
          decision_key: string
          decision_status: string
          id?: number
          impact?: string | null
          metadata?: Json
          rationale: string
          related_objects?: Json
          supersedes_decision_key?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          decided_by?: string
          decided_on?: string
          decision_key?: string
          decision_status?: string
          id?: number
          impact?: string | null
          metadata?: Json
          rationale?: string
          related_objects?: Json
          supersedes_decision_key?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      schema_decisions_backup_20260319: {
        Row: {
          consequence: string | null
          created_at: string | null
          decision: string | null
          decision_key: string | null
          domain: string | null
          id: number | null
          rationale: string | null
          status: string | null
          supersedes_key: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          consequence?: string | null
          created_at?: string | null
          decision?: string | null
          decision_key?: string | null
          domain?: string | null
          id?: number | null
          rationale?: string | null
          status?: string | null
          supersedes_key?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          consequence?: string | null
          created_at?: string | null
          decision?: string | null
          decision_key?: string | null
          domain?: string | null
          id?: number | null
          rationale?: string | null
          status?: string | null
          supersedes_key?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      schema_registry: {
        Row: {
          created_at: string
          domain: string
          id: number
          introduced_in_migration: string | null
          lifecycle: string
          metadata: Json
          notes: string | null
          object_name: string
          object_type: string
          owner_team: string | null
          product_core: boolean
          replaced_by: string | null
          schema_name: string
          source_of_truth: boolean
          sunset_target_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: number
          introduced_in_migration?: string | null
          lifecycle: string
          metadata?: Json
          notes?: string | null
          object_name: string
          object_type: string
          owner_team?: string | null
          product_core?: boolean
          replaced_by?: string | null
          schema_name?: string
          source_of_truth?: boolean
          sunset_target_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: number
          introduced_in_migration?: string | null
          lifecycle?: string
          metadata?: Json
          notes?: string | null
          object_name?: string
          object_type?: string
          owner_team?: string | null
          product_core?: boolean
          replaced_by?: string | null
          schema_name?: string
          source_of_truth?: boolean
          sunset_target_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      schema_registry_backup_20260319: {
        Row: {
          app_read_allowed: boolean | null
          app_write_allowed: boolean | null
          artifact_name: string | null
          artifact_type: string | null
          created_at: string | null
          domain: string | null
          id: number | null
          include_in_new_instances: boolean | null
          notes: string | null
          owned_by_layer: string | null
          replacement_artifact: string | null
          source_of_truth: boolean | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          app_read_allowed?: boolean | null
          app_write_allowed?: boolean | null
          artifact_name?: string | null
          artifact_type?: string | null
          created_at?: string | null
          domain?: string | null
          id?: number | null
          include_in_new_instances?: boolean | null
          notes?: string | null
          owned_by_layer?: string | null
          replacement_artifact?: string | null
          source_of_truth?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          app_read_allowed?: boolean | null
          app_write_allowed?: boolean | null
          artifact_name?: string | null
          artifact_type?: string | null
          created_at?: string | null
          domain?: string | null
          id?: number | null
          include_in_new_instances?: boolean | null
          notes?: string | null
          owned_by_layer?: string | null
          replacement_artifact?: string | null
          source_of_truth?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
            foreignKeyName: "user_notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          color: string | null
          created_at: string
          display_color: string | null
          display_name: string | null
          fee_split: number | null
          full_name: string | null
          is_active: boolean
          is_owner: boolean
          name: string | null
          phone: string | null
          role: string | null
          split: number | null
          split_pct: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          color?: string | null
          created_at?: string
          display_color?: string | null
          display_name?: string | null
          fee_split?: number | null
          full_name?: string | null
          is_active?: boolean
          is_owner?: boolean
          name?: string | null
          phone?: string | null
          role?: string | null
          split?: number | null
          split_pct?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          color?: string | null
          created_at?: string
          display_color?: string | null
          display_name?: string | null
          fee_split?: number | null
          full_name?: string | null
          is_active?: boolean
          is_owner?: boolean
          name?: string | null
          phone?: string | null
          role?: string | null
          split?: number | null
          split_pct?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["auth_id"]
          },
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["uid"]
          },
        ]
      }
      user_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_primary: boolean
          role_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_primary?: boolean
          role_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_primary?: boolean
          role_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
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
          is_admin: boolean
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
          is_admin?: boolean
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
          is_admin?: boolean
          name?: string
          phone?: string | null
          role?: string
          split?: number | null
          status?: string | null
          uid?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_auth_fk"
            columns: ["auth_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["auth_id"]
          },
          {
            foreignKeyName: "users_auth_fk"
            columns: ["auth_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_auth_fk"
            columns: ["auth_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["uid"]
          },
        ]
      }
    }
    Views: {
      profiles: {
        Row: {
          auth_id: string | null
          avatar_url: string | null
          color: string | null
          created_at: string | null
          display_color: string | null
          display_name: string | null
          email: string | null
          fee_split: number | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          phone: string | null
          role: string | null
          split: number | null
          split_pct: number | null
          status: string | null
          uid: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_admin_calendar: {
        Row: {
          address: string | null
          appraiser_color: string | null
          appraiser_id: string | null
          appraiser_name: string | null
          appraiser_user_id: string | null
          city: string | null
          client_name: string | null
          company_id: string | null
          end_at: string | null
          event_type: string | null
          id: string | null
          order_id: string | null
          order_no: string | null
          order_number: string | null
          start_at: string | null
          state: string | null
          status: string | null
          street_address: string | null
          title: string | null
          zip: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_appraiser_id_fkey"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["auth_id"]
          },
          {
            foreignKeyName: "calendar_events_appraiser_id_fkey"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_appraiser_id_fkey"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "calendar_events_appraiser_user_fkey"
            columns: ["appraiser_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["order_id"]
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
      v_admin_calendar_enriched: {
        Row: {
          address: string | null
          appraiser_color: string | null
          appraiser_id: string | null
          appraiser_name: string | null
          appraiser_user_id: string | null
          city: string | null
          client_name: string | null
          company_id: string | null
          end_at: string | null
          event_icon: string | null
          event_type: string | null
          id: string | null
          order_id: string | null
          order_no: string | null
          order_number: string | null
          start_at: string | null
          state: string | null
          status: string | null
          street_address: string | null
          title: string | null
          zip: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_appraiser_id_fkey"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["auth_id"]
          },
          {
            foreignKeyName: "calendar_events_appraiser_id_fkey"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_appraiser_id_fkey"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "calendar_events_appraiser_user_fkey"
            columns: ["appraiser_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["order_id"]
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
          active_orders: number | null
          avg_total_fee: number | null
          category: string | null
          client_id: number | null
          client_name: string | null
          client_type: string | null
          company_id: string | null
          completed_orders: number | null
          kind: string | null
          last_order_date: string | null
          name: string | null
          orders_count: number | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          status: string | null
          total_orders: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_client_kpis_appraiser: {
        Row: {
          avg_total_fee: number | null
          client_id: number | null
          client_name: string | null
          company_id: string | null
          last_order_at: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          total_orders: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_client_metrics: {
        Row: {
          active_orders: number | null
          avg_total_fee: number | null
          category: string | null
          client_id: number | null
          client_name: string | null
          client_type: string | null
          company_id: string | null
          completed_orders: number | null
          kind: string | null
          last_order_date: string | null
          name: string | null
          orders_count: number | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          status: string | null
          total_orders: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["order_id"]
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
      v_order_activity_feed: {
        Row: {
          created_at: string | null
          created_by: string | null
          created_by_email: string | null
          created_by_name: string | null
          detail: Json | null
          event_type: string | null
          id: string | null
          message: string | null
          order_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_legacy"
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
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_active_frontend_v4"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_frontend_v4"
            referencedColumns: ["order_id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
        ]
      }
      v_orders_active_frontend_v4: {
        Row: {
          access_notes: string | null
          address: string | null
          address_line1: string | null
          amc_id: string | null
          amc_name: string | null
          appraiser_color: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_name: string | null
          assigned_appraiser_id: string | null
          assigned_appraiser_name: string | null
          assigned_to: string | null
          base_fee: number | null
          city: string | null
          client_id: number | null
          client_name: string | null
          company_id: string | null
          created_at: string | null
          date_ordered: string | null
          display_subtitle: string | null
          display_title: string | null
          due_date: string | null
          entry_contact_name: string | null
          entry_contact_phone: string | null
          fee: number | null
          fee_amount: number | null
          final_due_at: string | null
          final_due_date: string | null
          id: string | null
          is_archived: boolean | null
          last_activity_at: string | null
          managing_amc_id: number | null
          notes: string | null
          order_id: string | null
          order_no: string | null
          order_number: string | null
          postal_code: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
          property_type: string | null
          report_type: string | null
          review_due_at: string | null
          review_due_date: string | null
          reviewer_color: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          split_pct: number | null
          state: string | null
          status: string | null
          updated_at: string | null
          zip: string | null
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_amc_id_fkey"
            columns: ["amc_id"]
            isOneToOne: false
            referencedRelation: "amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "orders_managing_amc_id_fkey"
            columns: ["managing_amc_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "orders_managing_amc_id_fkey"
            columns: ["managing_amc_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
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
          appraiser_color: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_name: string | null
          assigned_to: string | null
          base_fee: number | null
          city: string | null
          client_id: number | null
          client_name: string | null
          created_at: string | null
          due_date: string | null
          fee_amount: number | null
          final_due_at: string | null
          id: string | null
          is_archived: boolean | null
          order_number: string | null
          property_type: string | null
          report_type: string | null
          review_due_at: string | null
          reviewer_color: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          site_visit_at: string | null
          state: string | null
          status: string | null
          zip: string | null
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      v_orders_frontend_v4: {
        Row: {
          access_notes: string | null
          address: string | null
          address_line1: string | null
          amc_id: string | null
          amc_name: string | null
          appraiser_color: string | null
          appraiser_fee: number | null
          appraiser_id: string | null
          appraiser_name: string | null
          assigned_appraiser_id: string | null
          assigned_appraiser_name: string | null
          assigned_to: string | null
          base_fee: number | null
          city: string | null
          client_id: number | null
          client_name: string | null
          company_id: string | null
          created_at: string | null
          date_ordered: string | null
          display_subtitle: string | null
          display_title: string | null
          due_date: string | null
          entry_contact_name: string | null
          entry_contact_phone: string | null
          fee: number | null
          fee_amount: number | null
          final_due_at: string | null
          final_due_date: string | null
          id: string | null
          is_archived: boolean | null
          last_activity_at: string | null
          managing_amc_id: number | null
          notes: string | null
          order_id: string | null
          order_no: string | null
          order_number: string | null
          postal_code: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
          property_type: string | null
          report_type: string | null
          review_due_at: string | null
          review_due_date: string | null
          reviewer_color: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          site_visit_at: string | null
          site_visit_date: string | null
          split_pct: number | null
          state: string | null
          status: string | null
          updated_at: string | null
          zip: string | null
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_amc_id_fkey"
            columns: ["amc_id"]
            isOneToOne: false
            referencedRelation: "amcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "orders_managing_amc_id_fkey"
            columns: ["managing_amc_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "orders_managing_amc_id_fkey"
            columns: ["managing_amc_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
        ]
      }
      v_orders_list: {
        Row: {
          address: string | null
          appraiser_id: string | null
          assigned_to: string | null
          branch_id: number | null
          city: string | null
          client_id: number | null
          company_id: string | null
          county: string | null
          created_at: string | null
          display_address: string | null
          due_date: string | null
          due_in_days: number | null
          has_site_visit: boolean | null
          is_archived: boolean | null
          is_overdue: boolean | null
          is_review_overdue: boolean | null
          order_id: string | null
          order_number: string | null
          paid_status: string | null
          priority: string | null
          review_due_date: string | null
          review_due_in_days: number | null
          site_visit_at: string | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          appraiser_id?: string | null
          assigned_to?: string | null
          branch_id?: number | null
          city?: string | null
          client_id?: number | null
          company_id?: string | null
          county?: string | null
          created_at?: string | null
          display_address?: never
          due_date?: string | null
          due_in_days?: never
          has_site_visit?: never
          is_archived?: never
          is_overdue?: never
          is_review_overdue?: never
          order_id?: string | null
          order_number?: string | null
          paid_status?: string | null
          priority?: never
          review_due_date?: string | null
          review_due_in_days?: never
          site_visit_at?: string | null
          state?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          appraiser_id?: string | null
          assigned_to?: string | null
          branch_id?: number | null
          city?: string | null
          client_id?: number | null
          company_id?: string | null
          county?: string | null
          created_at?: string | null
          display_address?: never
          due_date?: string | null
          due_in_days?: never
          has_site_visit?: never
          is_archived?: never
          is_overdue?: never
          is_review_overdue?: never
          order_id?: string | null
          order_number?: string | null
          paid_status?: string | null
          priority?: never
          review_due_date?: string | null
          review_due_in_days?: never
          site_visit_at?: string | null
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      v_orders_list_with_last_activity: {
        Row: {
          address: string | null
          appraiser_id: string | null
          assigned_to: string | null
          branch_id: number | null
          city: string | null
          client_id: number | null
          company_id: string | null
          county: string | null
          created_at: string | null
          display_address: string | null
          due_date: string | null
          due_in_days: number | null
          has_site_visit: boolean | null
          is_archived: boolean | null
          is_overdue: boolean | null
          is_review_overdue: boolean | null
          last_action: string | null
          last_activity_at: string | null
          last_message: string | null
          order_id: string | null
          order_number: string | null
          paid_status: string | null
          priority: string | null
          review_due_date: string | null
          review_due_in_days: number | null
          site_visit_at: string | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zip: string | null
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_branch_id"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_appraiser"
            columns: ["appraiser_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "v_client_kpis"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_kpis_appraiser"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_metrics"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_orders_reviewer"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      v_staging_raw_orders_2025_ord: {
        Row: {
          _ctid: unknown | null
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
      _activity_actor: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
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
      _default_notification_categories: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      _ensure_notification_prefs_for: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      _maybe_move_fk: {
        Args: { p_col: string; p_from: number; p_table: unknown; p_to: number }
        Returns: undefined
      }
      _notification_email_pref: {
        Args: { p_user_id: string }
        Returns: {
          email_address: string
          email_enabled: boolean
        }[]
      }
      _notification_email_target: {
        Args: { p_user_id: string }
        Returns: {
          email_address: string
          email_enabled: boolean
          to_user_id: string
        }[]
      }
      _notify_user: {
        Args:
          | {
              p_body: string
              p_category?: string
              p_link_path: string
              p_order_id: string
              p_payload: Json
              p_priority?: string
              p_title: string
              p_type: string
              p_user_id: string
            }
          | {
              p_body: string
              p_order_id: string
              p_title: string
              p_to_user_id: string
              p_type: string
            }
        Returns: undefined
      }
      add_order_note: {
        Args: { p_body: string; p_order_id: string }
        Returns: string
      }
      admin_list_users: {
        Args: Record<PropertyKey, never>
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
          is_admin: boolean
          name: string
          phone: string | null
          role: string
          split: number | null
          status: string | null
          uid: string | null
          updated_at: string | null
        }[]
      }
      app_user_has_company_role: {
        Args: {
          p_company_id: string
          p_role_names: string[]
          p_user_id: string
        }
        Returns: boolean
      }
      assert_company_will_have_owner: {
        Args: { p_company_id: string; p_excluding_user_id?: string }
        Returns: boolean
      }
      assert_role: {
        Args: { roles: string[] }
        Returns: undefined
      }
      assign_order: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: undefined
      }
      can_read_order: {
        Args: { p_order_id: string }
        Returns: boolean
      }
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
      company_active_owner_count: {
        Args: { p_company_id: string }
        Returns: number
      }
      current_app_user_can_access_notification_row: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: boolean
      }
      current_app_user_can_approve_company_relationship: {
        Args: { p_source_company_id: string; p_target_company_id: string }
        Returns: boolean
      }
      current_app_user_can_archive_company_relationship: {
        Args: { p_source_company_id: string; p_target_company_id: string }
        Returns: boolean
      }
      current_app_user_can_assign_order_target: {
        Args: {
          p_assignment_kind: string
          p_company_id: string
          p_target_user_id: string
        }
        Returns: boolean
      }
      current_app_user_can_attach_order_amc: {
        Args: { p_client_id: number }
        Returns: boolean
      }
      current_app_user_can_attach_order_client: {
        Args: { p_client_id: number }
        Returns: boolean
      }
      current_app_user_can_create_client: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      current_app_user_can_create_order: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      current_app_user_can_delete_client_row: {
        Args: { p_client_id: number; p_company_id: string }
        Returns: boolean
      }
      current_app_user_can_invite_company_relationship: {
        Args: { p_relationship_type: string; p_target_company_id: string }
        Returns: boolean
      }
      current_app_user_can_manage_company_relationship_compliance: {
        Args: { p_source_company_id: string; p_target_company_id: string }
        Returns: boolean
      }
      current_app_user_can_read_client_row: {
        Args: { p_client_id: number; p_company_id: string }
        Returns: boolean
      }
      current_app_user_can_read_company_relationship_row: {
        Args: { p_source_company_id: string; p_target_company_id: string }
        Returns: boolean
      }
      current_app_user_can_read_order: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      current_app_user_can_read_order_row: {
        Args: {
          p_appraiser_id: string
          p_assigned_to: string
          p_company_id: string
          p_reviewer_id: string
          p_status: string
        }
        Returns: boolean
      }
      current_app_user_can_suspend_company_relationship: {
        Args: { p_source_company_id: string; p_target_company_id: string }
        Returns: boolean
      }
      current_app_user_can_update_client_row: {
        Args: { p_client_id: number; p_company_id: string }
        Returns: boolean
      }
      current_app_user_can_update_order_row: {
        Args: {
          p_appraiser_id: string
          p_assigned_to: string
          p_company_id: string
          p_reviewer_id: string
          p_status: string
        }
        Returns: boolean
      }
      current_app_user_can_use_order_form_client_options: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      current_app_user_can_write_order_activity: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      current_app_user_company_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      current_app_user_has_all_permissions: {
        Args: { p_permission_keys: string[] }
        Returns: boolean
      }
      current_app_user_has_all_permissions_for_company: {
        Args: { p_company_id: string; p_permission_keys: string[] }
        Returns: boolean
      }
      current_app_user_has_any_permission: {
        Args: { p_permission_keys: string[] }
        Returns: boolean
      }
      current_app_user_has_any_permission_for_company: {
        Args: { p_company_id: string; p_permission_keys: string[] }
        Returns: boolean
      }
      current_app_user_has_company: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      current_app_user_has_current_company: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      current_app_user_has_permission: {
        Args: { p_permission_key: string }
        Returns: boolean
      }
      current_app_user_has_permission_for_company: {
        Args: { p_company_id: string; p_permission_key: string }
        Returns: boolean
      }
      current_app_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_app_user_permission_keys: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      current_app_user_permission_keys_for_company: {
        Args: { p_company_id: string }
        Returns: string[]
      }
      current_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      current_is_appraiser: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      current_public_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_user_has_role: {
        Args: { p_role: string }
        Returns: boolean
      }
      current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_user_public_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      default_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      fn_current_user_users_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      fn_to_auth_id: {
        Args: { p: string }
        Returns: string
      }
      fn_to_users_id: {
        Args: { p: string }
        Returns: string
      }
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
      get_calendar_events: {
        Args: Record<PropertyKey, never> | { p_from: string; p_to: string }
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
        Args: Record<PropertyKey, never>
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
      import_orders_from_json: {
        Args: { payload: Json }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_appraiser: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_reviewer: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_activity: {
        Args:
          | {
              p_event: string
              p_meta?: Json
              p_target_id: string
              p_target_type: string
            }
          | {
              p_event_type: string
              p_message: string
              p_new_status?: string
              p_order_id: string
              p_prev_status?: string
            }
        Returns: undefined
      }
      log_order_activity: {
        Args:
          | { p_action: string; p_note?: string; p_order_id: string }
          | {
              p_details: string
              p_event: string
              p_order_id: string
              p_user_id: string
            }
        Returns: undefined
      }
      log_order_company_assignment_event: {
        Args: {
          p_actor_company_id?: string
          p_actor_user_id?: string
          p_assignment_id: string
          p_event_type: string
          p_message?: string
          p_payload?: Json
        }
        Returns: string
      }
      merge_clients: {
        Args: { p_source_id: number; p_strategy?: Json; p_target_id: number }
        Returns: Json
      }
      next_order_number: {
        Args: { p_year: number }
        Returns: string
      }
      notify_admins: {
        Args: { p_body: string; p_message?: string; p_title: string }
        Returns: number
      }
      notify_order_company_assignment_event: {
        Args: {
          p_actor_company_id?: string
          p_actor_user_id?: string
          p_assignment_id: string
          p_event_type: string
          p_payload?: Json
        }
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
      order_company_assignment_assigned_notification_recipients: {
        Args: {
          p_actor_user_id?: string
          p_assignment_id: string
          p_event_type: string
        }
        Returns: string[]
      }
      order_company_assignment_expected_type: {
        Args: { p_relationship_type: string }
        Returns: string
      }
      order_company_assignment_owner_notification_recipients: {
        Args: {
          p_actor_user_id?: string
          p_assignment_id: string
          p_event_type: string
        }
        Returns: string[]
      }
      order_company_assignment_user_has_permission: {
        Args: {
          p_company_id: string
          p_permission_key: string
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
      rpc_admin_set_user_active: {
        Args: { p_is_active: boolean; p_user_id: string }
        Returns: undefined
      }
      rpc_admin_set_user_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: undefined
      }
      rpc_admin_update_user_profile: {
        Args: {
          p_avatar_url?: string
          p_color?: string
          p_display_color?: string
          p_display_name?: string
          p_fee_split?: number
          p_full_name?: string
          p_is_active?: boolean
          p_name?: string
          p_phone?: string
          p_split?: number
          p_split_pct?: number
          p_status?: string
          p_user_id: string
        }
        Returns: undefined
      }
      rpc_admin_users_set_active: {
        Args: { p_is_active: boolean; p_user_id: string }
        Returns: undefined
      }
      rpc_admin_users_update: {
        Args: { p_patch?: Json; p_user_id: string }
        Returns: undefined
      }
      rpc_assign_next_reviewer: {
        Args: { order_id: string }
        Returns: {
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
      }
      rpc_assign_order: {
        Args:
          | { p_appraiser_id: string; p_order_id: string }
          | { p_assigned_to: string; p_note: string; p_order_id: string }
        Returns: {
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
      }
      rpc_assign_reviewer: {
        Args: { order_id: string; reviewer_id: string }
        Returns: {
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
      }
      rpc_bootstrap_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
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
      }
      rpc_claim_email_outbox: {
        Args: { p_limit?: number }
        Returns: {
          body_html: string | null
          body_text: string | null
          created_at: string
          error: string | null
          id: string
          notification_id: string | null
          sent_at: string | null
          status: string
          subject: string
          to_email: string
          to_user_id: string
        }[]
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
          company_id: string | null
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
      }
      rpc_client_delete: {
        Args: { p_client_id: string }
        Returns: boolean
      }
      rpc_client_management_amc_options: {
        Args: Record<PropertyKey, never>
        Returns: {
          amc_id: number
          amc_name: string
        }[]
      }
      rpc_client_management_archive: {
        Args: { p_client_id: number; p_reason?: string; p_request_id?: string }
        Returns: {
          changed: boolean
          client_id: number
          is_archived: boolean
          status: string
        }[]
      }
      rpc_client_management_create: {
        Args: { p_client: Json }
        Returns: {
          amc_id: number
          amc_name: string
          category: string
          client_id: number
          client_name: string
          contact_email_1: string
          contact_name_1: string
          contact_phone_1: string
          notes: string
          status: string
        }[]
      }
      rpc_client_management_detail: {
        Args: { p_client_id: number }
        Returns: {
          amc_id: number
          amc_name: string
          avg_fee: number
          category: string
          client_id: number
          client_name: string
          contact_email_1: string
          contact_email_2: string
          contact_name_1: string
          contact_name_2: string
          contact_phone_1: string
          contact_phone_2: string
          is_merged: boolean
          last_order_date: string
          merged_into_id: number
          notes: string
          order_count: number
          status: string
        }[]
      }
      rpc_client_management_list: {
        Args: { p_category?: string; p_search?: string; p_sort?: string }
        Returns: {
          amc_id: number
          amc_name: string
          avg_fee: number
          category: string
          client_id: number
          client_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          is_merged: boolean
          last_order_date: string
          merged_into_id: number
          order_count: number
          status: string
        }[]
      }
      rpc_client_management_update: {
        Args: { p_client_id: number; p_patch: Json }
        Returns: {
          amc_id: number
          amc_name: string
          category: string
          client_id: number
          client_name: string
          contact_email_1: string
          contact_name_1: string
          contact_phone_1: string
          notes: string
          status: string
        }[]
      }
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
          company_id: string | null
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
      }
      rpc_company_assignable_users: {
        Args: { p_purpose?: string }
        Returns: {
          avatar_url: string
          can_be_appraiser: boolean
          can_be_reviewer: boolean
          default_split_pct: number
          display_color: string
          display_name: string
          email: string
          full_name: string
          is_active: boolean
          membership_status: string
          name: string
          role_assignments: Json
          role_keys: string[]
          status: string
          user_id: string
        }[]
      }
      rpc_company_bootstrap: {
        Args: {
          p_company_name: string
          p_company_slug: string
          p_company_type?: string
          p_idempotency_key?: string
          p_locale?: string
          p_metadata?: Json
          p_owner_auth_id?: string
          p_owner_email?: string
          p_owner_name?: string
          p_owner_phone?: string
          p_timezone?: string
        }
        Returns: {
          active_company_metadata: Json
          bootstrap_status: string
          company_id: string
          company_name: string
          company_slug: string
          company_status: string
          company_type: string
          idempotency_key: string
          membership_id: string
          owner_auth_id: string
          owner_email: string
          owner_role_assignment_id: string
          owner_role_id: string
          owner_user_id: string
        }[]
      }
      rpc_company_member_invitation_cancel: {
        Args: {
          p_invitation_id: string
          p_reason?: string
          p_request_id?: string
        }
        Returns: {
          cancelled_at: string
          changed: boolean
          invitation_id: string
          invitation_status: string
        }[]
      }
      rpc_company_member_invitation_resend_finalize: {
        Args: {
          p_auth_email?: string
          p_auth_error?: string
          p_auth_invite_sent: boolean
          p_auth_user_id?: string
          p_invitation_id: string
          p_provider_metadata?: Json
          p_request_id?: string
        }
        Returns: {
          company_id: string
          expires_at: string
          invitation_id: string
          invitation_status: string
          invite_email: string
          invited_user_id: string
          membership_id: string
        }[]
      }
      rpc_company_member_invitation_resend_prepare: {
        Args: {
          p_expires_in?: unknown
          p_invitation_id: string
          p_reason?: string
          p_request_id?: string
        }
        Returns: {
          company_id: string
          company_name: string
          company_slug: string
          expires_at: string
          invitation_id: string
          invitation_status: string
          invite_email: string
          prior_invitation_id: string
          role_assignments: Json
        }[]
      }
      rpc_company_member_invitations_list: {
        Args: { p_limit?: number; p_status?: string }
        Returns: {
          accepted_at: string
          auth_invite_sent_at: string
          can_cancel: boolean
          can_resend: boolean
          cancelled_at: string
          created_at: string
          expires_at: string
          invitation_id: string
          invitation_status: string
          invite_email: string
          invited_by_display_name: string
          primary_role_id: string
          role_assignments: Json
        }[]
      }
      rpc_company_member_invite_accept: {
        Args: { p_invitation_id: string; p_request_id?: string }
        Returns: {
          accepted_at: string
          active_company_context_valid: boolean
          company_id: string
          company_name: string
          company_slug: string
          invitation_id: string
          invitation_status: string
          invite_email: string
          membership_id: string
          session_refresh_required: boolean
          user_id: string
        }[]
      }
      rpc_company_member_invite_finalize: {
        Args: {
          p_auth_email: string
          p_auth_error_code?: string
          p_auth_error_message?: string
          p_auth_invite_sent?: boolean
          p_auth_user_id: string
          p_invitation_id: string
          p_provider_metadata?: Json
        }
        Returns: {
          company_id: string
          expires_at: string
          invitation_id: string
          invitation_status: string
          invite_email: string
          invited_user_id: string
          membership_id: string
        }[]
      }
      rpc_company_member_invite_prepare: {
        Args: {
          p_email: string
          p_expires_in?: unknown
          p_primary_role_id?: string
          p_reason?: string
          p_request_id?: string
          p_role_ids: string[]
        }
        Returns: {
          company_id: string
          company_name: string
          company_slug: string
          existing_app_user_id: string
          existing_auth_id: string
          expires_at: string
          invitation_id: string
          invitation_status: string
          invite_email: string
          requires_auth_invite: boolean
          role_assignments: Json
        }[]
      }
      rpc_company_member_list: {
        Args: { p_include_inactive?: boolean }
        Returns: {
          auth_linked: boolean
          avatar_url: string
          can_deactivate: boolean
          can_reactivate: boolean
          can_update_roles: boolean
          display_color: string
          display_name: string
          email: string
          full_name: string
          is_owner: boolean
          is_primary: boolean
          joined_at: string
          membership_id: string
          membership_status: string
          membership_type: string
          phone: string
          role_assignments: Json
          user_id: string
        }[]
      }
      rpc_company_member_role_update: {
        Args: {
          p_primary_role_id?: string
          p_reason?: string
          p_request_id?: string
          p_role_ids: string[]
          p_user_id: string
        }
        Returns: {
          active_owner_count: number
          changed: boolean
          membership_id: string
          role_assignments: Json
          user_id: string
        }[]
      }
      rpc_company_member_set_status: {
        Args: {
          p_reason?: string
          p_request_id?: string
          p_status: string
          p_user_id: string
        }
        Returns: {
          active_owner_count: number
          changed: boolean
          membership_id: string
          membership_status: string
          previous_status: string
          user_id: string
        }[]
      }
      rpc_company_relationship_accept: {
        Args: {
          p_compliance?: Json
          p_notes?: string
          p_relationship_id: string
        }
        Returns: string
      }
      rpc_company_relationship_archive: {
        Args: { p_notes?: string; p_relationship_id: string }
        Returns: string
      }
      rpc_company_relationship_decline: {
        Args: { p_notes?: string; p_relationship_id: string }
        Returns: string
      }
      rpc_company_relationship_detail: {
        Args: { p_relationship_id: string }
        Returns: {
          approved_at: string
          archived_at: string
          compliance: Json
          created_at: string
          declined_at: string
          ends_at: string
          id: string
          invited_at: string
          notes: string
          relationship_type: string
          relationship_type_label: string
          settings: Json
          source_company_id: string
          source_company_name: string
          starts_at: string
          status: string
          suspended_at: string
          target_company_id: string
          target_company_name: string
          updated_at: string
        }[]
      }
      rpc_company_relationship_invite: {
        Args: {
          p_compliance?: Json
          p_notes?: string
          p_relationship_type: string
          p_settings?: Json
          p_target_company_id: string
        }
        Returns: string
      }
      rpc_company_relationship_list: {
        Args: { p_scope?: string; p_status?: string }
        Returns: {
          approved_at: string
          archived_at: string
          compliance: Json
          created_at: string
          declined_at: string
          ends_at: string
          id: string
          invited_at: string
          notes: string
          relationship_type: string
          relationship_type_label: string
          settings: Json
          source_company_id: string
          source_company_name: string
          starts_at: string
          status: string
          suspended_at: string
          target_company_id: string
          target_company_name: string
          updated_at: string
        }[]
      }
      rpc_company_relationship_reactivate: {
        Args: { p_notes?: string; p_relationship_id: string }
        Returns: string
      }
      rpc_company_relationship_suspend: {
        Args: { p_notes?: string; p_relationship_id: string }
        Returns: string
      }
      rpc_company_relationship_target_search: {
        Args: { p_limit?: number; p_query: string; p_relationship_type: string }
        Returns: {
          blocked_reason: string
          company_id: string
          company_name: string
          company_slug: string
          company_type: string
          company_type_label: string
          current_relationship_status: string
          eligible_for_invite: boolean
          relationship_type: string
          relationship_type_label: string
        }[]
      }
      rpc_company_role_preset_list: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_assignment_count: number
          assignable_by_current_user: boolean
          description: string
          is_owner_role: boolean
          is_system: boolean
          is_template: boolean
          owner_only_permission_count: number
          permission_count: number
          role_id: string
          role_key: string
          role_name: string
        }[]
      }
      rpc_company_setup_context: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_company_claim_id: string
          active_company_context_valid: boolean
          active_member_count: number
          active_owner_count: number
          active_role_assignment_count: number
          assignment_readiness: Json
          audit_readiness: Json
          checklist: Json
          company_id: string
          company_name: string
          company_slug: string
          company_status: string
          company_type: string
          dashboard_readiness: Json
          locale: string
          owner_invariant_ok: boolean
          owner_role_ready: boolean
          profile_complete: boolean
          relationship_readiness: Json
          role_presets_ready: boolean
          setup_blockers: Json
          setup_complete: boolean
          timezone: string
        }[]
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
        Returns: string
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
          company_id: string | null
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
      }
      rpc_create_order: {
        Args: { payload: Json }
        Returns: {
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
      }
      rpc_current_company_context: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_company_claim_id: string
          app_user_id: string
          auth_user_id: string
          current_company_id: string
          has_current_company_membership: boolean
          permission_count: number
          role_assignments: Json
        }[]
      }
      rpc_current_user_app_context: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          company_name: string
          company_slug: string
          current_company_id: string
          display_color: string
          display_name: string
          email: string
          full_name: string
          has_current_company_membership: boolean
          is_admin_role: boolean
          is_appraiser_role: boolean
          is_owner: boolean
          is_reviewer_role: boolean
          primary_role_key: string
          role_assignments: Json
          role_keys: string[]
          user_id: string
        }[]
      }
      rpc_current_user_settings_get: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          color: string
          display_color: string
          display_name: string
          email: string
          full_name: string
          phone: string
          user_id: string
        }[]
      }
      rpc_current_user_settings_update: {
        Args: { p_patch: Json }
        Returns: {
          avatar_url: string
          color: string
          display_color: string
          display_name: string
          email: string
          full_name: string
          phone: string
          user_id: string
        }[]
      }
      rpc_debug_notifications_access: {
        Args: Record<PropertyKey, never>
        Returns: {
          ok: boolean
          rows_seen: number
        }[]
      }
      rpc_delete_client: {
        Args: { client_id: number }
        Returns: undefined
      }
      rpc_dismiss_notification: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      rpc_dismiss_seen_notifications: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
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
      rpc_get_activity_feed: {
        Args: { p_order_id: string }
        Returns: {
          actor_name: string
          actor_role: string
          body: string
          created_at: string
          event_type: string
          id: string
          title: string
        }[]
      }
      rpc_get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      rpc_get_next_order_number: {
        Args: { p_company_key?: string; p_effective_at?: string }
        Returns: string
      }
      rpc_get_notification_prefs_v1: {
        Args: { p_user_id?: string }
        Returns: {
          channel: string
          enabled: boolean
          meta: Json
          type: string
        }[]
      }
      rpc_get_notifications: {
        Args: { p_before?: string; p_limit?: number }
        Returns: {
          action: string | null
          body: string | null
          category: string | null
          company_id: string | null
          created_at: string | null
          dismissed_at: string | null
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
      }
      rpc_get_unread_count: {
        Args: Record<PropertyKey, never>
        Returns: number
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
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
      }
      rpc_list_users_with_roles: {
        Args: Record<PropertyKey, never>
        Returns: {
          display_name: string
          email: string
          fee_split: number
          id: string
          role: string
        }[]
      }
      rpc_log_event: {
        Args:
          | { p_details?: Json; p_event_type: string; p_order_id: string }
          | {
              p_event_type: string
              p_message?: string
              p_order_id: string
              p_payload?: Json
            }
        Returns: string
      }
      rpc_log_note: {
        Args: { p_context?: Json; p_message: string; p_order_id: string }
        Returns: {
          action: string | null
          actor: string | null
          actor_id: string | null
          actor_name: string | null
          actor_user_id: string | null
          company_id: string | null
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
          actor_user_id: string | null
          company_id: string | null
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
      }
      rpc_mark_all_notifications_read: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      rpc_mark_email_failed_v1: {
        Args: { p_error: string; p_id: string }
        Returns: undefined
      }
      rpc_mark_email_outbox_failed: {
        Args: { p_error: string; p_id: string }
        Returns: {
          body_html: string | null
          body_text: string | null
          created_at: string
          error: string | null
          id: string
          notification_id: string | null
          sent_at: string | null
          status: string
          subject: string
          to_email: string
          to_user_id: string
        }
      }
      rpc_mark_email_outbox_sent: {
        Args: { p_id: string }
        Returns: {
          body_html: string | null
          body_text: string | null
          created_at: string
          error: string | null
          id: string
          notification_id: string | null
          sent_at: string | null
          status: string
          subject: string
          to_email: string
          to_user_id: string
        }
      }
      rpc_mark_email_sent_v1: {
        Args: { p_id: string }
        Returns: undefined
      }
      rpc_mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      rpc_next_order_no: {
        Args: Record<PropertyKey, never>
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
          company_id: string | null
          created_at: string | null
          dismissed_at: string | null
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
      }
      rpc_notification_prefs_ensure: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
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
      }
      rpc_notification_prefs_update: {
        Args: { p_user_id?: string; patch: Json } | { patch: Json }
        Returns: {
          categories: Json | null
          dnd_until: string | null
          email_enabled: boolean | null
          push_enabled: boolean | null
          snooze_until: string | null
          updated_at: string | null
          user_id: string
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
          company_id: string | null
          created_at: string | null
          dismissed_at: string | null
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
      }
      rpc_notifications_mark_all_read: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      rpc_notifications_mark_read: {
        Args: { ids: string[] }
        Returns: undefined
      }
      rpc_notifications_unread_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
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
      rpc_order_archive: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      rpc_order_assign: {
        Args: {
          p_appraiser_id?: string
          p_order_id: string
          p_reviewer_id?: string
        }
        Returns: {
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
      }
      rpc_order_assign_appraiser: {
        Args: { p_appraiser_id: string; p_order_id: string }
        Returns: boolean
      }
      rpc_order_company_assignment_accept: {
        Args: { p_assignment_id: string }
        Returns: string
      }
      rpc_order_company_assignment_activity: {
        Args: { p_assignment_id: string }
        Returns: {
          actor_company_id: string
          actor_company_name: string
          actor_side: string
          assignment_id: string
          created_at: string
          event_note: string
          event_type: string
          id: string
          message: string
        }[]
      }
      rpc_order_company_assignment_cancel: {
        Args: { p_assignment_id: string; p_reason?: string }
        Returns: string
      }
      rpc_order_company_assignment_complete: {
        Args: { p_assignment_id: string; p_completion_note?: string }
        Returns: string
      }
      rpc_order_company_assignment_decline: {
        Args: { p_assignment_id: string; p_reason?: string }
        Returns: string
      }
      rpc_order_company_assignment_detail: {
        Args: { p_assignment_id: string }
        Returns: {
          accepted_at: string
          assigned_company_id: string
          assigned_company_name: string
          assignment_type: string
          cancelled_at: string
          completed_at: string
          compliance_snapshot: Json
          created_at: string
          declined_at: string
          due_at: string
          expires_at: string
          handoff_payload: Json
          id: string
          instructions: string
          offered_at: string
          order_id: string
          owner_company_id: string
          relationship_id: string
          relationship_type: string
          review_due_at: string
          revoked_at: string
          started_at: string
          status: string
          submission_payload: Json
          submitted_at: string
          terms: Json
          updated_at: string
        }[]
      }
      rpc_order_company_assignment_inbox: {
        Args: { p_assignment_type?: string; p_status?: string }
        Returns: {
          accepted_at: string
          assigned_company_id: string
          assignment_id: string
          assignment_status: string
          assignment_type: string
          cancelled_at: string
          city: string
          completed_at: string
          due_at: string
          expires_at: string
          handoff_payload: Json
          instructions: string
          offered_at: string
          order_id: string
          order_number: string
          order_status: string
          owner_company_id: string
          owner_company_name: string
          property_type: string
          relationship_id: string
          relationship_type: string
          report_type: string
          review_due_at: string
          revoked_at: string
          started_at: string
          state: string
          submitted_at: string
          terms: Json
        }[]
      }
      rpc_order_company_assignment_list: {
        Args: { p_assignment_type?: string; p_status?: string }
        Returns: {
          accepted_at: string
          assigned_company_id: string
          assigned_company_name: string
          assignment_type: string
          cancelled_at: string
          completed_at: string
          compliance_snapshot: Json
          created_at: string
          declined_at: string
          due_at: string
          expires_at: string
          handoff_payload: Json
          id: string
          instructions: string
          offered_at: string
          order_id: string
          owner_company_id: string
          relationship_id: string
          relationship_type: string
          review_due_at: string
          revoked_at: string
          started_at: string
          status: string
          submission_payload: Json
          submitted_at: string
          terms: Json
          updated_at: string
        }[]
      }
      rpc_order_company_assignment_list_for_order: {
        Args: { p_order_id: string }
        Returns: {
          accepted_at: string
          assigned_company_id: string
          assigned_company_name: string
          assignment_type: string
          cancelled_at: string
          completed_at: string
          created_at: string
          declined_at: string
          due_at: string
          expires_at: string
          id: string
          instructions: string
          offered_at: string
          order_id: string
          owner_company_id: string
          relationship_id: string
          relationship_status: string
          relationship_type: string
          review_due_at: string
          revoked_at: string
          started_at: string
          status: string
          submitted_at: string
          updated_at: string
        }[]
      }
      rpc_order_company_assignment_offer: {
        Args: {
          p_assigned_company_id: string
          p_assignment_type: string
          p_due_at?: string
          p_expires_at?: string
          p_handoff_payload?: Json
          p_instructions?: string
          p_order_id: string
          p_relationship_id: string
          p_review_due_at?: string
          p_terms?: Json
        }
        Returns: string
      }
      rpc_order_company_assignment_offer_packet: {
        Args: { p_assignment_id: string }
        Returns: {
          assigned_company_id: string
          assignment_id: string
          assignment_status: string
          assignment_type: string
          city: string
          due_at: string
          expires_at: string
          handoff_payload: Json
          instructions: string
          offered_at: string
          order_number: string
          order_status: string
          owner_company_id: string
          owner_company_name: string
          property_type: string
          relationship_id: string
          relationship_type: string
          report_type: string
          review_due_at: string
          state: string
          terms: Json
        }[]
      }
      rpc_order_company_assignment_owner_packet: {
        Args: { p_assignment_id: string }
        Returns: {
          accepted_at: string
          assigned_company_id: string
          assigned_company_name: string
          assignment_id: string
          assignment_review_due_at: string
          assignment_status: string
          assignment_type: string
          cancelled_at: string
          city: string
          completed_at: string
          compliance_snapshot: Json
          declined_at: string
          due_at: string
          expires_at: string
          final_due_at: string
          handoff_payload: Json
          instructions: string
          offered_at: string
          order_id: string
          order_number: string
          order_review_due_at: string
          order_status: string
          owner_company_id: string
          postal_code: string
          property_address: string
          property_type: string
          relationship_id: string
          relationship_status: string
          relationship_type: string
          report_type: string
          revoked_at: string
          site_visit_at: string
          started_at: string
          state: string
          submission_payload: Json
          submitted_at: string
          terms: Json
        }[]
      }
      rpc_order_company_assignment_revoke: {
        Args: { p_assignment_id: string; p_reason?: string }
        Returns: string
      }
      rpc_order_company_assignment_start: {
        Args: { p_assignment_id: string }
        Returns: string
      }
      rpc_order_company_assignment_submit: {
        Args: { p_assignment_id: string; p_submission_payload?: Json }
        Returns: string
      }
      rpc_order_company_assignment_work_packet: {
        Args: { p_assignment_id: string }
        Returns: {
          accepted_at: string
          assigned_company_id: string
          assignment_id: string
          assignment_review_due_at: string
          assignment_status: string
          assignment_type: string
          cancelled_at: string
          city: string
          completed_at: string
          compliance_snapshot: Json
          due_at: string
          expires_at: string
          final_due_at: string
          handoff_payload: Json
          instructions: string
          offered_at: string
          order_id: string
          order_number: string
          order_review_due_at: string
          order_status: string
          owner_company_id: string
          owner_company_name: string
          postal_code: string
          property_address: string
          property_type: string
          relationship_id: string
          relationship_type: string
          report_type: string
          revoked_at: string
          site_visit_at: string
          started_at: string
          state: string
          submission_payload: Json
          submitted_at: string
          terms: Json
        }[]
      }
      rpc_order_create: {
        Args: { p: Json }
        Returns: {
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
      }
      rpc_order_delete: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      rpc_order_filter_clients: {
        Args: Record<PropertyKey, never>
        Returns: {
          client_id: number
          client_name: string
        }[]
      }
      rpc_order_form_client_create: {
        Args: { p_client: Json }
        Returns: {
          amc_id: number
          category: string
          client_id: number
          client_name: string
          status: string
        }[]
      }
      rpc_order_form_client_name_search: {
        Args: { p_limit?: number; p_search: string }
        Returns: {
          category: string
          client_id: number
          client_name: string
          is_merged: boolean
          merged_into_id: number
          status: string
        }[]
      }
      rpc_order_form_client_options: {
        Args: Record<PropertyKey, never>
        Returns: {
          amc_id: number
          category: string
          client_id: number
          client_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          is_merged: boolean
        }[]
      }
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
      rpc_order_set_dates: {
        Args:
          | {
              p_due_date?: string
              p_final_due_at?: string
              p_order_id: string
              p_review_due_at?: string
              p_site_visit_at?: string
            }
          | {
              p_due_date?: string
              p_order_id: string
              p_review_due_at?: string
              p_site_visit_at?: string
            }
        Returns: {
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
      }
      rpc_order_set_status: {
        Args:
          | { p_note?: string; p_order_id: string; p_status: string }
          | { p_order_id: string; p_status: string }
        Returns: boolean
      }
      rpc_order_update: {
        Args:
          | { p: Json; p_order_id: string }
          | { p_order_id: string; p_patch: Json }
        Returns: {
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
      }
      rpc_review_approve: {
        Args: { p_note?: string; p_order_id: string }
        Returns: boolean
      }
      rpc_review_request_revisions: {
        Args: { p_note?: string; p_order_id: string }
        Returns: boolean
      }
      rpc_review_start: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      rpc_set_admin_status: {
        Args: { p_is_admin: boolean; p_user_id: string }
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
          is_admin: boolean
          name: string
          phone: string | null
          role: string
          split: number | null
          status: string | null
          uid: string | null
          updated_at: string | null
        }
      }
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
      rpc_set_notification_preferences: {
        Args: { p_email_address?: string; p_email_enabled: boolean }
        Returns: {
          digest_mode: string | null
          email_address: string | null
          email_enabled: boolean
          quiet_hours: Json | null
          updated_at: string
          user_id: string
        }
      }
      rpc_set_review_route: {
        Args: { order_id: string; route: Json }
        Returns: {
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
      }
      rpc_set_user_role: {
        Args:
          | { p_grant: boolean; p_role: string; p_user_id: string }
          | { p_role: string; p_user_id: string }
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
          is_admin: boolean
          name: string
          phone: string | null
          role: string
          split: number | null
          status: string | null
          uid: string | null
          updated_at: string | null
        }
      }
      rpc_system_insert_notification: {
        Args: {
          p_body: string
          p_category?: string
          p_link_path: string
          p_order_id: string
          p_payload?: Json
          p_priority?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      rpc_transition_order_status: {
        Args: { p_note?: string; p_order_id: string; p_transition_key: string }
        Returns: {
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
          company_id: string | null
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
      }
      rpc_update_due_dates: {
        Args: {
          p_due_date: string
          p_order_id: string
          p_review_due_date: string
        }
        Returns: {
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
      }
      rpc_update_order: {
        Args: { order_id: string; patch: Json }
        Returns: {
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
      }
      rpc_update_order_dates: {
        Args: {
          final_due_at: string
          order_id: string
          review_due_at: string
          site_visit_at: string
        }
        Returns: {
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
      }
      rpc_update_order_status: {
        Args: { next_status: string; order_id: string }
        Returns: {
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
      }
      rpc_update_order_status_with_note: {
        Args: { next_status: string; note: string; order_id: string }
        Returns: {
          access_notes: string | null
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
          company_id: string | null
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
          owner_id: string | null
          paid_at: string | null
          paid_status: string | null
          postal_code: string | null
          property_address: string | null
          property_contact_name: string | null
          property_contact_phone: string | null
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
          display_color: string | null
          display_name: string | null
          fee_split: number | null
          full_name: string | null
          is_active: boolean
          is_owner: boolean
          name: string | null
          phone: string | null
          role: string | null
          split: number | null
          split_pct: number | null
          status: string
          updated_at: string
          user_id: string
        }
      }
      rpc_update_user_profile: {
        Args: {
          p_display_color: string
          p_display_name: string
          p_phone: string
          p_user_id: string
        }
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
          is_admin: boolean
          name: string
          phone: string | null
          role: string
          split: number | null
          status: string | null
          uid: string | null
          updated_at: string | null
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
      safe_uuid: {
        Args: { p_text: string }
        Returns: string
      }
      set_order_appointment: {
        Args: { p_datetime: string; p_note?: string; p_order_id: string }
        Returns: string
      }
      set_order_status: {
        Args: { p_order_id: string; p_status: string }
        Returns: undefined
      }
      team_get_user: {
        Args: { user_id: string }
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
          is_admin: boolean
          name: string
          phone: string | null
          role: string
          split: number | null
          status: string | null
          uid: string | null
          updated_at: string | null
        }
      }
      team_list_users: {
        Args: Record<PropertyKey, never> | { include_inactive?: boolean }
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
          is_admin: boolean
          name: string
          phone: string | null
          role: string
          split: number | null
          status: string | null
          uid: string | null
          updated_at: string | null
        }[]
      }
      update_user_profile_basic: {
        Args: { p_email: string; p_name: string; p_user_id: string }
        Returns: undefined
      }
      upsert_user_settings: {
        Args: { p_phone: string; p_preferences: Json; p_user_id: string }
        Returns: undefined
      }
      user_has_owner_role_in_company: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: boolean
      }
      user_has_role: {
        Args: { p_role: string }
        Returns: boolean
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
