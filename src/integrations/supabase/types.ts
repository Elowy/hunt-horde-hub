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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      animals: {
        Row: {
          age: string | null
          animal_id: string
          archived: boolean | null
          average_tusk_length: number | null
          class: string | null
          condition: string | null
          cooling_date: string | null
          created_at: string
          expiry_date: string | null
          gender: string | null
          hunter_name: string | null
          hunter_type: string | null
          hunting_registration_id: string | null
          id: string
          is_transported: boolean | null
          judgement_number: string | null
          notes: string | null
          reservation_note: string | null
          reservation_status: string | null
          reserved_at: string | null
          reserved_by: string | null
          sample_date: string | null
          sample_id: string | null
          security_zone_id: string | null
          species: string
          storage_location_id: string
          transport_cooling_price: number | null
          transport_cooling_vat_rate: number | null
          transport_price_per_kg: number | null
          transport_vat_rate: number | null
          transported_at: string | null
          updated_at: string
          user_id: string
          vet_check: boolean | null
          vet_doctor_name: string | null
          vet_notes: string | null
          vet_result: string | null
          vet_sample_id: string | null
          weight: number | null
        }
        Insert: {
          age?: string | null
          animal_id: string
          archived?: boolean | null
          average_tusk_length?: number | null
          class?: string | null
          condition?: string | null
          cooling_date?: string | null
          created_at?: string
          expiry_date?: string | null
          gender?: string | null
          hunter_name?: string | null
          hunter_type?: string | null
          hunting_registration_id?: string | null
          id?: string
          is_transported?: boolean | null
          judgement_number?: string | null
          notes?: string | null
          reservation_note?: string | null
          reservation_status?: string | null
          reserved_at?: string | null
          reserved_by?: string | null
          sample_date?: string | null
          sample_id?: string | null
          security_zone_id?: string | null
          species: string
          storage_location_id: string
          transport_cooling_price?: number | null
          transport_cooling_vat_rate?: number | null
          transport_price_per_kg?: number | null
          transport_vat_rate?: number | null
          transported_at?: string | null
          updated_at?: string
          user_id: string
          vet_check?: boolean | null
          vet_doctor_name?: string | null
          vet_notes?: string | null
          vet_result?: string | null
          vet_sample_id?: string | null
          weight?: number | null
        }
        Update: {
          age?: string | null
          animal_id?: string
          archived?: boolean | null
          average_tusk_length?: number | null
          class?: string | null
          condition?: string | null
          cooling_date?: string | null
          created_at?: string
          expiry_date?: string | null
          gender?: string | null
          hunter_name?: string | null
          hunter_type?: string | null
          hunting_registration_id?: string | null
          id?: string
          is_transported?: boolean | null
          judgement_number?: string | null
          notes?: string | null
          reservation_note?: string | null
          reservation_status?: string | null
          reserved_at?: string | null
          reserved_by?: string | null
          sample_date?: string | null
          sample_id?: string | null
          security_zone_id?: string | null
          species?: string
          storage_location_id?: string
          transport_cooling_price?: number | null
          transport_cooling_vat_rate?: number | null
          transport_price_per_kg?: number | null
          transport_vat_rate?: number | null
          transported_at?: string | null
          updated_at?: string
          user_id?: string
          vet_check?: boolean | null
          vet_doctor_name?: string | null
          vet_notes?: string | null
          vet_result?: string | null
          vet_sample_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "animals_hunting_registration_id_fkey"
            columns: ["hunting_registration_id"]
            isOneToOne: false
            referencedRelation: "hunting_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_security_zone_id_fkey"
            columns: ["security_zone_id"]
            isOneToOne: false
            referencedRelation: "security_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          expires_at: string | null
          id: string
          is_archived: boolean | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_archived?: boolean | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_archived?: boolean | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      cooling_prices: {
        Row: {
          cooling_price_per_kg: number
          cooling_vat_rate: number
          created_at: string
          id: string
          is_archived: boolean
          storage_location_id: string
          updated_at: string
          user_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          cooling_price_per_kg?: number
          cooling_vat_rate?: number
          created_at?: string
          id?: string
          is_archived?: boolean
          storage_location_id: string
          updated_at?: string
          user_id: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          cooling_price_per_kg?: number
          cooling_vat_rate?: number
          created_at?: string
          id?: string
          is_archived?: boolean
          storage_location_id?: string
          updated_at?: string
          user_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cooling_prices_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      hired_hunters: {
        Row: {
          created_at: string
          email: string | null
          id: string
          license_number: string | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          license_number?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          license_number?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hunting_locations: {
        Row: {
          created_at: string
          display_order: number
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          security_zone_id: string
          type: Database["public"]["Enums"]["hunting_location_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          security_zone_id: string
          type: Database["public"]["Enums"]["hunting_location_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          security_zone_id?: string
          type?: Database["public"]["Enums"]["hunting_location_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hunting_locations_security_zone_id_fkey"
            columns: ["security_zone_id"]
            isOneToOne: false
            referencedRelation: "security_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      hunting_registrations: {
        Row: {
          admin_note: string | null
          created_at: string
          end_time: string
          guest_address: string | null
          guest_email: string | null
          guest_license_number: string | null
          guest_name: string | null
          guest_phone: string | null
          hired_hunter_id: string | null
          hunting_location_id: string | null
          id: string
          is_guest: boolean | null
          map_zone_id: string | null
          requires_admin_approval: boolean
          security_zone_id: string
          start_time: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          end_time: string
          guest_address?: string | null
          guest_email?: string | null
          guest_license_number?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          hired_hunter_id?: string | null
          hunting_location_id?: string | null
          id?: string
          is_guest?: boolean | null
          map_zone_id?: string | null
          requires_admin_approval?: boolean
          security_zone_id: string
          start_time: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          end_time?: string
          guest_address?: string | null
          guest_email?: string | null
          guest_license_number?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          hired_hunter_id?: string | null
          hunting_location_id?: string | null
          id?: string
          is_guest?: boolean | null
          map_zone_id?: string | null
          requires_admin_approval?: boolean
          security_zone_id?: string
          start_time?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hunting_registrations_hired_hunter_id_fkey"
            columns: ["hired_hunter_id"]
            isOneToOne: false
            referencedRelation: "hired_hunters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hunting_registrations_hunting_location_id_fkey"
            columns: ["hunting_location_id"]
            isOneToOne: false
            referencedRelation: "hunting_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hunting_registrations_map_zone_id_fkey"
            columns: ["map_zone_id"]
            isOneToOne: false
            referencedRelation: "map_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hunting_registrations_security_zone_id_fkey"
            columns: ["security_zone_id"]
            isOneToOne: false
            referencedRelation: "security_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted: boolean | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          accepted?: boolean | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      lifetime_subscriptions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          tier: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          tier: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      map_pois: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          latitude: number
          longitude: number
          name: string
          updated_at: string | null
          user_id: string
          zone_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          latitude: number
          longitude: number
          name: string
          updated_at?: string | null
          user_id: string
          zone_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          updated_at?: string | null
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "map_pois_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "map_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      map_zones: {
        Row: {
          created_at: string | null
          description: string | null
          geojson: Json
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          geojson: Json
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          geojson?: Json
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          created_at: string | null
          email_data: Json | null
          email_sent: boolean | null
          id: string
          ip_address: string | null
          notification_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_data?: Json | null
          email_sent?: boolean | null
          id?: string
          ip_address?: string | null
          notification_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_data?: Json | null
          email_sent?: boolean | null
          id?: string
          ip_address?: string | null
          notification_type?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string | null
          id: string
          notify_on_animal_add: boolean | null
          notify_on_animal_delete: boolean | null
          notify_on_animal_update: boolean | null
          notify_on_storage_full: boolean | null
          notify_on_transport: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notify_on_animal_add?: boolean | null
          notify_on_animal_delete?: boolean | null
          notify_on_animal_update?: boolean | null
          notify_on_storage_full?: boolean | null
          notify_on_transport?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notify_on_animal_add?: boolean | null
          notify_on_animal_delete?: boolean | null
          notify_on_animal_update?: boolean | null
          notify_on_storage_full?: boolean | null
          notify_on_transport?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      price_settings: {
        Row: {
          class: string
          created_at: string
          id: string
          is_archived: boolean
          price_per_kg: number
          species: string
          updated_at: string
          user_id: string
          valid_from: string
          valid_to: string | null
          vat_rate: number
        }
        Insert: {
          class: string
          created_at?: string
          id?: string
          is_archived?: boolean
          price_per_kg?: number
          species: string
          updated_at?: string
          user_id: string
          valid_from?: string
          valid_to?: string | null
          vat_rate?: number
        }
        Update: {
          class?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          price_per_kg?: number
          species?: string
          updated_at?: string
          user_id?: string
          valid_from?: string
          valid_to?: string | null
          vat_rate?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          ban_reason: string | null
          banned_until: string | null
          birth_date: string | null
          company_name: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          hunter_category: Database["public"]["Enums"]["hunter_category"] | null
          hunter_license_number: string | null
          id: string
          privacy_policy_accepted: boolean | null
          privacy_policy_accepted_at: string | null
          tax_number: string | null
          updated_at: string
          user_type: string | null
          vat_rate: number | null
        }
        Insert: {
          address?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          birth_date?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          hunter_category?:
            | Database["public"]["Enums"]["hunter_category"]
            | null
          hunter_license_number?: string | null
          id: string
          privacy_policy_accepted?: boolean | null
          privacy_policy_accepted_at?: string | null
          tax_number?: string | null
          updated_at?: string
          user_type?: string | null
          vat_rate?: number | null
        }
        Update: {
          address?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          birth_date?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          hunter_category?:
            | Database["public"]["Enums"]["hunter_category"]
            | null
          hunter_license_number?: string | null
          id?: string
          privacy_policy_accepted?: boolean | null
          privacy_policy_accepted_at?: string | null
          tax_number?: string | null
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
      quick_actions_settings: {
        Row: {
          action_1: string
          action_2: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_1?: string
          action_2?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_1?: string
          action_2?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_zone_closures: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string
          security_zone_id: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason: string
          security_zone_id: string
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string
          security_zone_id?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_zone_closures_security_zone_id_fkey"
            columns: ["security_zone_id"]
            isOneToOne: false
            referencedRelation: "security_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      security_zones: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          settlement_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          settlement_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          settlement_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_zones_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      storage_locations: {
        Row: {
          address: string | null
          capacity: number | null
          cooling_price_per_kg: number | null
          cooling_vat_rate: number | null
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
          cooling_price_per_kg?: number | null
          cooling_vat_rate?: number | null
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
          cooling_price_per_kg?: number | null
          cooling_vat_rate?: number | null
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
      subscription_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          duration: string
          expires_at: string
          id: string
          notes: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          tier: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          duration: string
          expires_at: string
          id?: string
          notes?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          tier: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          duration?: string
          expires_at?: string
          id?: string
          notes?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          tier?: string
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          category: string
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          message: string
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          message: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          message?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
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
          is_default: boolean | null
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
          is_default?: boolean | null
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
          is_default?: boolean | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trial_subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          newsletter_subscribed: boolean
          started_at: string
          tier: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          newsletter_subscribed?: boolean
          started_at?: string
          tier?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          newsletter_subscribed?: boolean
          started_at?: string
          tier?: string
          user_id?: string
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
      point_in_polygon: {
        Args: { lat: number; lng: number; polygon: Json }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer" | "hunter" | "super_admin"
      hunter_category:
        | "tag"
        | "vendeg"
        | "bervadasz"
        | "ib_vendeg"
        | "trofeas_vadasz"
        | "egyeb"
      hunting_location_type:
        | "fedett_les"
        | "nem_fedett_les"
        | "magan_szoro"
        | "kozponti_szoro"
        | "csapda"
      ticket_status: "open" | "in_progress" | "closed"
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
      app_role: ["admin", "editor", "viewer", "hunter", "super_admin"],
      hunter_category: [
        "tag",
        "vendeg",
        "bervadasz",
        "ib_vendeg",
        "trofeas_vadasz",
        "egyeb",
      ],
      hunting_location_type: [
        "fedett_les",
        "nem_fedett_les",
        "magan_szoro",
        "kozponti_szoro",
        "csapda",
      ],
      ticket_status: ["open", "in_progress", "closed"],
    },
  },
} as const
