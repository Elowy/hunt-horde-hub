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
      animals: {
        Row: {
          age: string | null
          animal_id: string
          class: string | null
          condition: string | null
          cooling_date: string | null
          created_at: string
          expiry_date: string | null
          gender: string | null
          hunter_name: string | null
          hunter_type: string | null
          id: string
          notes: string | null
          sample_date: string | null
          sample_id: string | null
          species: string
          storage_location_id: string
          updated_at: string
          user_id: string
          vet_check: boolean | null
          vet_notes: string | null
          weight: number | null
        }
        Insert: {
          age?: string | null
          animal_id: string
          class?: string | null
          condition?: string | null
          cooling_date?: string | null
          created_at?: string
          expiry_date?: string | null
          gender?: string | null
          hunter_name?: string | null
          hunter_type?: string | null
          id?: string
          notes?: string | null
          sample_date?: string | null
          sample_id?: string | null
          species: string
          storage_location_id: string
          updated_at?: string
          user_id: string
          vet_check?: boolean | null
          vet_notes?: string | null
          weight?: number | null
        }
        Update: {
          age?: string | null
          animal_id?: string
          class?: string | null
          condition?: string | null
          cooling_date?: string | null
          created_at?: string
          expiry_date?: string | null
          gender?: string | null
          hunter_name?: string | null
          hunter_type?: string | null
          id?: string
          notes?: string | null
          sample_date?: string | null
          sample_id?: string | null
          species?: string
          storage_location_id?: string
          updated_at?: string
          user_id?: string
          vet_check?: boolean | null
          vet_notes?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "animals_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      buyers: {
        Row: {
          address: string | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_settings: {
        Row: {
          class: string
          created_at: string
          id: string
          price_per_kg: number
          species: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class: string
          created_at?: string
          id?: string
          price_per_kg?: number
          species: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class?: string
          created_at?: string
          id?: string
          price_per_kg?: number
          species?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          company_name: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          updated_at: string
          user_type: string | null
          vat_rate: number | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id: string
          updated_at?: string
          user_type?: string | null
          vat_rate?: number | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_type?: string | null
          vat_rate?: number | null
        }
        Relationships: []
      }
      purchase_offers: {
        Row: {
          buyer_id: string
          class: string
          created_at: string
          hunter_society_id: string
          id: string
          max_quantity: number | null
          min_quantity: number | null
          notes: string | null
          price_per_kg: number
          species: string
          status: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          buyer_id: string
          class: string
          created_at?: string
          hunter_society_id: string
          id?: string
          max_quantity?: number | null
          min_quantity?: number | null
          notes?: string | null
          price_per_kg: number
          species: string
          status?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          buyer_id?: string
          class?: string
          created_at?: string
          hunter_society_id?: string
          id?: string
          max_quantity?: number | null
          min_quantity?: number | null
          notes?: string | null
          price_per_kg?: number
          species?: string
          status?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_offers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_locations: {
        Row: {
          address: string | null
          capacity: number | null
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transport_document_items: {
        Row: {
          animal_id: string
          created_at: string
          id: string
          transport_document_id: string
        }
        Insert: {
          animal_id: string
          created_at?: string
          id?: string
          transport_document_id: string
        }
        Update: {
          animal_id?: string
          created_at?: string
          id?: string
          transport_document_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_document_items_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_document_items_transport_document_id_fkey"
            columns: ["transport_document_id"]
            isOneToOne: false
            referencedRelation: "transport_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_documents: {
        Row: {
          animal_count: number
          created_at: string
          document_number: string
          id: string
          ticket_number: string | null
          total_price: number
          total_weight: number
          transport_date: string
          transporter_id: string | null
          transporter_name: string | null
          updated_at: string
          user_id: string
          vehicle_plate: string | null
        }
        Insert: {
          animal_count?: number
          created_at?: string
          document_number: string
          id?: string
          ticket_number?: string | null
          total_price?: number
          total_weight?: number
          transport_date?: string
          transporter_id?: string | null
          transporter_name?: string | null
          updated_at?: string
          user_id: string
          vehicle_plate?: string | null
        }
        Update: {
          animal_count?: number
          created_at?: string
          document_number?: string
          id?: string
          ticket_number?: string | null
          total_price?: number
          total_weight?: number
          transport_date?: string
          transporter_id?: string | null
          transporter_name?: string | null
          updated_at?: string
          user_id?: string
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_documents_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: false
            referencedRelation: "transporters"
            referencedColumns: ["id"]
          },
        ]
      }
      transporter_prices: {
        Row: {
          class: string
          created_at: string
          id: string
          price_per_kg: number
          species: string
          transporter_id: string
          updated_at: string
        }
        Insert: {
          class: string
          created_at?: string
          id?: string
          price_per_kg: number
          species: string
          transporter_id: string
          updated_at?: string
        }
        Update: {
          class?: string
          created_at?: string
          id?: string
          price_per_kg?: number
          species?: string
          transporter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transporter_prices_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: false
            referencedRelation: "transporters"
            referencedColumns: ["id"]
          },
        ]
      }
      transporters: {
        Row: {
          address: string | null
          company_name: string
          contact_name: string | null
          created_at: string
          id: string
          tax_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string
          id?: string
          tax_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string
          id?: string
          tax_number?: string | null
          updated_at?: string
          user_id?: string
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
