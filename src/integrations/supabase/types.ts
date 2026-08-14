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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          display_label: string | null
          display_order: number
          id: string
          key: string
          section: string
          updated_at: string
          value: string | null
          value_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_label?: string | null
          display_order?: number
          id?: string
          key: string
          section: string
          updated_at?: string
          value?: string | null
          value_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_label?: string | null
          display_order?: number
          id?: string
          key?: string
          section?: string
          updated_at?: string
          value?: string | null
          value_type?: string
        }
        Relationships: []
      }
      artwork_token_log: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          duty_rate_pct: number | null
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          duty_rate_pct?: number | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          duty_rate_pct?: number | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string
          created_at: string
          email: string
          first_request_at: string
          id: string
          last_request_at: string
          marketing_opt_in: boolean
          name: string
          phone: string | null
          request_count: number
          territory: string
          updated_at: string
        }
        Insert: {
          company?: string
          created_at?: string
          email: string
          first_request_at?: string
          id?: string
          last_request_at?: string
          marketing_opt_in?: boolean
          name?: string
          phone?: string | null
          request_count?: number
          territory?: string
          updated_at?: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          first_request_at?: string
          id?: string
          last_request_at?: string
          marketing_opt_in?: boolean
          name?: string
          phone?: string | null
          request_count?: number
          territory?: string
          updated_at?: string
        }
        Relationships: []
      }
      decoration_methods: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          notes: string | null
          sub_rule_type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          sub_rule_type: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          sub_rule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      destinations: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      detail_labels: {
        Row: {
          created_at: string
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_log: {
        Row: {
          created_at: string
          error: string | null
          html: string | null
          id: string
          quote_request_id: string | null
          recipient: string
          status: string
          subject: string
          type: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          html?: string | null
          id?: string
          quote_request_id?: string | null
          recipient: string
          status: string
          subject: string
          type: string
        }
        Update: {
          created_at?: string
          error?: string | null
          html?: string | null
          id?: string
          quote_request_id?: string | null
          recipient?: string
          status?: string
          subject?: string
          type?: string
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          created_at: string
          customer_confirm_enabled: boolean
          from_name: string
          id: string
          recipients: string[]
          reply_to: string
          staff_notify_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_confirm_enabled?: boolean
          from_name?: string
          id?: string
          recipients?: string[]
          reply_to?: string
          staff_notify_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_confirm_enabled?: boolean
          from_name?: string
          id?: string
          recipients?: string[]
          reply_to?: string
          staff_notify_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          heading: string
          signoff: string
          subject: string
          template_type: string
          updated_at: string
          updated_by: string | null
          updated_by_name: string
        }
        Insert: {
          body?: string
          heading: string
          signoff?: string
          subject: string
          template_type: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string
        }
        Update: {
          body?: string
          heading?: string
          signoff?: string
          subject?: string
          template_type?: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string
        }
        Relationships: []
      }
      method_details: {
        Row: {
          code: string
          created_at: string
          decoration_method_id: string
          detail: string
          id: string
          n_run: number
          n_setup: number
          notes: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          decoration_method_id: string
          detail: string
          id?: string
          n_run?: number
          n_setup?: number
          notes?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          decoration_method_id?: string
          detail?: string
          id?: string
          n_run?: number
          n_setup?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "method_details_decoration_method_id_fkey"
            columns: ["decoration_method_id"]
            isOneToOne: false
            referencedRelation: "decoration_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      origins: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          notes: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          notes?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_access_locks: {
        Row: {
          created_at: string
          id: string
          page: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page?: string
          user_id?: string
        }
        Relationships: []
      }
      product_decoration_bands: {
        Row: {
          created_at: string
          id: string
          inland_freight_usd: number | null
          product_decoration_id: string
          qty: number
          setup_cost: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inland_freight_usd?: number | null
          product_decoration_id: string
          qty: number
          setup_cost?: number
          unit_cost: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inland_freight_usd?: number | null
          product_decoration_id?: string
          qty?: number
          setup_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_decoration_bands_product_decoration_id_fkey"
            columns: ["product_decoration_id"]
            isOneToOne: false
            referencedRelation: "product_decorations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_decorations: {
        Row: {
          created_at: string
          id: string
          method_detail_id: string
          notes: string | null
          product_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          method_detail_id: string
          notes?: string | null
          product_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          method_detail_id?: string
          notes?: string | null
          product_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_decorations_method_detail_id_fkey"
            columns: ["method_detail_id"]
            isOneToOne: false
            referencedRelation: "method_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_decorations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_details: {
        Row: {
          created_at: string
          detail_label_id: string
          id: string
          product_id: string
          sort_order: number
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          detail_label_id: string
          id?: string
          product_id: string
          sort_order?: number
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          detail_label_id?: string
          id?: string
          product_id?: string
          sort_order?: number
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_details_detail_label_id_fkey"
            columns: ["detail_label_id"]
            isOneToOne: false
            referencedRelation: "detail_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sourcing: {
        Row: {
          carton_height: number | null
          carton_length: number | null
          carton_pack: number | null
          carton_weight: number | null
          carton_width: number | null
          created_at: string
          dimension_unit: string | null
          id: string
          product_id: string
          supplier_id: string | null
          supplier_item_name: string | null
          supplier_item_no: string | null
          updated_at: string
          variant_label: string | null
          weight_unit: string | null
        }
        Insert: {
          carton_height?: number | null
          carton_length?: number | null
          carton_pack?: number | null
          carton_weight?: number | null
          carton_width?: number | null
          created_at?: string
          dimension_unit?: string | null
          id?: string
          product_id: string
          supplier_id?: string | null
          supplier_item_name?: string | null
          supplier_item_no?: string | null
          updated_at?: string
          variant_label?: string | null
          weight_unit?: string | null
        }
        Update: {
          carton_height?: number | null
          carton_length?: number | null
          carton_pack?: number | null
          carton_weight?: number | null
          carton_width?: number | null
          created_at?: string
          dimension_unit?: string | null
          id?: string
          product_id?: string
          supplier_id?: string | null
          supplier_item_name?: string | null
          supplier_item_no?: string | null
          updated_at?: string
          variant_label?: string | null
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_sourcing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sourcing_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          capacity: string | null
          category_id: string | null
          colour_option: string | null
          created_at: string
          decoration_methods: string[]
          description: string | null
          details: string | null
          features: string | null
          id: string
          images: string[]
          inventory_source: string
          is_active: boolean
          is_featured: boolean
          material: string | null
          moq: number | null
          name: string
          price: number | null
          production_max_days: number | null
          production_min_days: number | null
          rush_enabled: boolean
          rush_production_max_days: number | null
          rush_production_min_days: number | null
          shipping_methods: string
          show_price: boolean
          size: string | null
          sku: string | null
          slug: string
          subcategory_id: string
          updated_at: string
          weight: string | null
        }
        Insert: {
          capacity?: string | null
          category_id?: string | null
          colour_option?: string | null
          created_at?: string
          decoration_methods?: string[]
          description?: string | null
          details?: string | null
          features?: string | null
          id?: string
          images?: string[]
          inventory_source?: string
          is_active?: boolean
          is_featured?: boolean
          material?: string | null
          moq?: number | null
          name: string
          price?: number | null
          production_max_days?: number | null
          production_min_days?: number | null
          rush_enabled?: boolean
          rush_production_max_days?: number | null
          rush_production_min_days?: number | null
          shipping_methods?: string
          show_price?: boolean
          size?: string | null
          sku?: string | null
          slug: string
          subcategory_id: string
          updated_at?: string
          weight?: string | null
        }
        Update: {
          capacity?: string | null
          category_id?: string | null
          colour_option?: string | null
          created_at?: string
          decoration_methods?: string[]
          description?: string | null
          details?: string | null
          features?: string | null
          id?: string
          images?: string[]
          inventory_source?: string
          is_active?: boolean
          is_featured?: boolean
          material?: string | null
          moq?: number | null
          name?: string
          price?: number | null
          production_max_days?: number | null
          production_min_days?: number | null
          rush_enabled?: boolean
          rush_production_max_days?: number | null
          rush_production_min_days?: number | null
          shipping_methods?: string
          show_price?: boolean
          size?: string | null
          sku?: string | null
          slug?: string
          subcategory_id?: string
          updated_at?: string
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          email?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_request_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string | null
          product_name: string
          quantity: number
          quote_request_id: string
          shipping_methods: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number
          quote_request_id: string
          shipping_methods?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          quote_request_id?: string
          shipping_methods?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_request_items_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          artwork_url: string | null
          company: string
          created_at: string
          customer_name: string
          email: string
          id: string
          internal_notes: string | null
          internal_notes_updated_at: string | null
          internal_notes_updated_by: string | null
          internal_notes_updated_by_name: string
          message: string | null
          phone: string | null
          status: string
          territory: string
        }
        Insert: {
          artwork_url?: string | null
          company: string
          created_at?: string
          customer_name: string
          email: string
          id?: string
          internal_notes?: string | null
          internal_notes_updated_at?: string | null
          internal_notes_updated_by?: string | null
          internal_notes_updated_by_name?: string
          message?: string | null
          phone?: string | null
          status?: string
          territory: string
        }
        Update: {
          artwork_url?: string | null
          company?: string
          created_at?: string
          customer_name?: string
          email?: string
          id?: string
          internal_notes?: string | null
          internal_notes_updated_at?: string | null
          internal_notes_updated_by?: string | null
          internal_notes_updated_by_name?: string
          message?: string | null
          phone?: string | null
          status?: string
          territory?: string
        }
        Relationships: []
      }
      quote_submission_log: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
        }
        Relationships: []
      }
      rounding_rules: {
        Row: {
          band_max: number | null
          band_min: number
          created_at: string
          description: string | null
          display_order: number
          id: string
          round_up_to: number
          updated_at: string
        }
        Insert: {
          band_max?: number | null
          band_min: number
          created_at?: string
          description?: string | null
          display_order: number
          id?: string
          round_up_to: number
          updated_at?: string
        }
        Update: {
          band_max?: number | null
          band_min?: number
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          round_up_to?: number
          updated_at?: string
        }
        Relationships: []
      }
      shipping_method_routes: {
        Row: {
          created_at: string
          destination_id: string
          fixed_cost: number
          id: string
          include_inland_freight: boolean
          lac_fixed_bbd: number
          lac_per_cbm_bbd: number
          notes: string | null
          origin_id: string
          shipping_method_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination_id: string
          fixed_cost?: number
          id?: string
          include_inland_freight?: boolean
          lac_fixed_bbd?: number
          lac_per_cbm_bbd?: number
          notes?: string | null
          origin_id: string
          shipping_method_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination_id?: string
          fixed_cost?: number
          id?: string
          include_inland_freight?: boolean
          lac_fixed_bbd?: number
          lac_per_cbm_bbd?: number
          notes?: string | null
          origin_id?: string
          shipping_method_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_method_routes_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_method_routes_origin_id_fkey"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_method_routes_shipping_method_id_fkey"
            columns: ["shipping_method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_method_tiers: {
        Row: {
          band_from: number
          band_to: number | null
          created_at: string
          id: string
          notes: string | null
          rate: number
          route_id: string
          updated_at: string
        }
        Insert: {
          band_from?: number
          band_to?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          rate?: number
          route_id: string
          updated_at?: string
        }
        Update: {
          band_from?: number
          band_to?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          rate?: number
          route_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_method_tiers_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "shipping_method_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_methods: {
        Row: {
          buffer_pct: number
          chargeable_metric: string
          chargeable_unit: string
          code: string
          created_at: string
          fuel_surcharge_pct: number
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          buffer_pct?: number
          chargeable_metric?: string
          chargeable_unit?: string
          code: string
          created_at?: string
          fuel_surcharge_pct?: number
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          buffer_pct?: number
          chargeable_metric?: string
          chargeable_unit?: string
          code?: string
          created_at?: string
          fuel_surcharge_pct?: number
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shipping_settings: {
        Row: {
          air_max_days: number
          air_min_days: number
          created_at: string
          sea_max_weeks: number
          sea_min_weeks: number
          source: string
          updated_at: string
        }
        Insert: {
          air_max_days?: number
          air_min_days?: number
          created_at?: string
          sea_max_weeks?: number
          sea_min_weeks?: number
          source: string
          updated_at?: string
        }
        Update: {
          air_max_days?: number
          air_min_days?: number
          created_at?: string
          sea_max_weeks?: number
          sea_min_weeks?: number
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          duty_rate_pct: number | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          duty_rate_pct?: number | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          duty_rate_pct?: number | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          code: string
          contact: string | null
          created_at: string
          default_shipping_mode: string
          id: string
          is_archived: boolean
          name: string
          notes: string
          origin_id: string | null
          unit_system: string
          updated_at: string
        }
        Insert: {
          code: string
          contact?: string | null
          created_at?: string
          default_shipping_mode?: string
          id?: string
          is_archived?: boolean
          name: string
          notes?: string
          origin_id?: string | null
          unit_system?: string
          updated_at?: string
        }
        Update: {
          code?: string
          contact?: string | null
          created_at?: string
          default_shipping_mode?: string
          id?: string
          is_archived?: boolean
          name?: string
          notes?: string
          origin_id?: string | null
          unit_system?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_origin_id_fkey"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "origins"
            referencedColumns: ["id"]
          },
        ]
      }
      user_prefs: {
        Row: {
          created_at: string
          prefs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          prefs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          prefs?: Json
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_use_page: {
        Args: { _page: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
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
      app_role: ["admin", "staff"],
    },
  },
} as const
