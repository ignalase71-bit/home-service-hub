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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          distance_km: number | null
          email: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          distance_km?: number | null
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          distance_km?: number | null
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      installer_blocks: {
        Row: {
          created_at: string
          end_date: string
          end_time: string | null
          id: string
          installer_id: string
          kind: string
          reason: string | null
          start_date: string
          start_time: string | null
        }
        Insert: {
          created_at?: string
          end_date: string
          end_time?: string | null
          id?: string
          installer_id: string
          kind?: string
          reason?: string | null
          start_date: string
          start_time?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string
          end_time?: string | null
          id?: string
          installer_id?: string
          kind?: string
          reason?: string | null
          start_date?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installer_blocks_installer_id_fkey"
            columns: ["installer_id"]
            isOneToOne: false
            referencedRelation: "installers"
            referencedColumns: ["id"]
          },
        ]
      }
      installer_schedules: {
        Row: {
          created_at: string
          end_time: string
          id: string
          installer_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          installer_id: string
          start_time: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          installer_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "installer_schedules_installer_id_fkey"
            columns: ["installer_id"]
            isOneToOne: false
            referencedRelation: "installers"
            referencedColumns: ["id"]
          },
        ]
      }
      installer_services: {
        Row: {
          created_at: string
          installer_id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          installer_id: string
          service_id: string
        }
        Update: {
          created_at?: string
          installer_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installer_services_installer_id_fkey"
            columns: ["installer_id"]
            isOneToOne: false
            referencedRelation: "installers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installer_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      installers: {
        Row: {
          active: boolean
          color: string
          created_at: string
          email: string | null
          express_enabled: boolean
          hourly_cost: number
          id: string
          max_daily_minutes: number
          max_visit_minutes: number
          name: string
          phone: string | null
          specialties: string[]
          updated_at: string
          zones: string[]
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          email?: string | null
          express_enabled?: boolean
          hourly_cost?: number
          id?: string
          max_daily_minutes?: number
          max_visit_minutes?: number
          name: string
          phone?: string | null
          specialties?: string[]
          updated_at?: string
          zones?: string[]
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          email?: string | null
          express_enabled?: boolean
          hourly_cost?: number
          id?: string
          max_daily_minutes?: number
          max_visit_minutes?: number
          name?: string
          phone?: string | null
          specialties?: string[]
          updated_at?: string
          zones?: string[]
        }
        Relationships: []
      }
      request_items: {
        Row: {
          created_at: string
          duration_minutes: number
          express: boolean
          express_fee: number
          id: string
          quantity: number
          request_id: string
          service_id: string | null
          service_name: string
          specialty: string | null
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          express?: boolean
          express_fee?: number
          id?: string
          quantity?: number
          request_id: string
          service_id?: string | null
          service_name: string
          specialty?: string | null
          subtotal?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          express?: boolean
          express_fee?: number
          id?: string
          quantity?: number
          request_id?: string
          service_id?: string | null
          service_name?: string
          specialty?: string | null
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          assigned_at: string | null
          chosen_at: string | null
          chosen_slot: string | null
          created_at: string
          customer_id: string
          distance_fee: number
          distance_km: number
          duration_minutes: number
          express: boolean
          express_professionals: number
          express_total: number
          id: string
          installer_id: string | null
          notes: string | null
          proposal_note: string | null
          proposed_slot_1: string | null
          proposed_slot_2: string | null
          proposed_slot_3: string | null
          public_token: string
          request_number: number
          services_total: number
          status: string
          total: number
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          chosen_at?: string | null
          chosen_slot?: string | null
          created_at?: string
          customer_id: string
          distance_fee?: number
          distance_km?: number
          duration_minutes?: number
          express?: boolean
          express_professionals?: number
          express_total?: number
          id?: string
          installer_id?: string | null
          notes?: string | null
          proposal_note?: string | null
          proposed_slot_1?: string | null
          proposed_slot_2?: string | null
          proposed_slot_3?: string | null
          public_token?: string
          request_number?: number
          services_total?: number
          status?: string
          total?: number
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          chosen_at?: string | null
          chosen_slot?: string | null
          created_at?: string
          customer_id?: string
          distance_fee?: number
          distance_km?: number
          duration_minutes?: number
          express?: boolean
          express_professionals?: number
          express_total?: number
          id?: string
          installer_id?: string | null
          notes?: string | null
          proposal_note?: string | null
          proposed_slot_1?: string | null
          proposed_slot_2?: string | null
          proposed_slot_3?: string | null
          public_token?: string
          request_number?: number
          services_total?: number
          status?: string
          total?: number
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_installer_id_fkey"
            columns: ["installer_id"]
            isOneToOne: false
            referencedRelation: "installers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          addon_duration_minutes: number
          base_price: number
          category_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          emoji: string | null
          express_available: boolean
          express_fee: number
          id: string
          name: string
          slug: string
          sort_order: number
          specialty: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          addon_duration_minutes?: number
          base_price?: number
          category_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          emoji?: string | null
          express_available?: boolean
          express_fee?: number
          id?: string
          name: string
          slug: string
          sort_order?: number
          specialty: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          addon_duration_minutes?: number
          base_price?: number
          category_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          emoji?: string | null
          express_available?: boolean
          express_fee?: number
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          specialty?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visit_services: {
        Row: {
          base_price: number
          created_at: string
          duration_minutes: number
          express: boolean
          express_fee: number
          extras: number
          id: string
          installer_cost: number
          notes: string | null
          quantity: number
          service_id: string | null
          service_name: string
          specialty: string | null
          subtotal: number
          visit_id: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          duration_minutes?: number
          express?: boolean
          express_fee?: number
          extras?: number
          id?: string
          installer_cost?: number
          notes?: string | null
          quantity?: number
          service_id?: string | null
          service_name: string
          specialty?: string | null
          subtotal?: number
          visit_id: string
        }
        Update: {
          base_price?: number
          created_at?: string
          duration_minutes?: number
          express?: boolean
          express_fee?: number
          extras?: number
          id?: string
          installer_cost?: number
          notes?: string | null
          quantity?: number
          service_id?: string | null
          service_name?: string
          specialty?: string | null
          subtotal?: number
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_services_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          address: string | null
          allow_overlap: boolean
          city: string | null
          created_at: string
          customer_id: string
          distance_fee: number
          distance_km: number
          end_time: string
          express: boolean
          express_total: number
          id: string
          installer_cost: number
          installer_id: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          payment_status: string
          services_total: number
          start_time: string
          status: string
          total: number
          updated_at: string
          visit_date: string
          visit_number: number
        }
        Insert: {
          address?: string | null
          allow_overlap?: boolean
          city?: string | null
          created_at?: string
          customer_id: string
          distance_fee?: number
          distance_km?: number
          end_time: string
          express?: boolean
          express_total?: number
          id?: string
          installer_cost?: number
          installer_id?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          payment_status?: string
          services_total?: number
          start_time: string
          status?: string
          total?: number
          updated_at?: string
          visit_date: string
          visit_number?: number
        }
        Update: {
          address?: string | null
          allow_overlap?: boolean
          city?: string | null
          created_at?: string
          customer_id?: string
          distance_fee?: number
          distance_km?: number
          end_time?: string
          express?: boolean
          express_total?: number
          id?: string
          installer_cost?: number
          installer_id?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          payment_status?: string
          services_total?: number
          start_time?: string
          status?: string
          total?: number
          updated_at?: string
          visit_date?: string
          visit_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "visits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_installer_id_fkey"
            columns: ["installer_id"]
            isOneToOne: false
            referencedRelation: "installers"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          active: boolean
          created_at: string
          fee: number
          id: string
          max_km: number
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          fee?: number
          id?: string
          max_km: number
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          fee?: number
          id?: string
          max_km?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
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
      app_role: ["admin", "staff"],
    },
  },
} as const
