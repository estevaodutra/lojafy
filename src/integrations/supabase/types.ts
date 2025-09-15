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
      addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string
          id: string
          is_default: boolean | null
          neighborhood: string
          number: string
          state: string
          street: string
          type: string
          updated_at: string
          user_id: string
          zip_code: string
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          neighborhood: string
          number: string
          state: string
          street: string
          type: string
          updated_at?: string
          user_id: string
          zip_code: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          neighborhood?: string
          number?: string
          state?: string
          street?: string
          type?: string
          updated_at?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          active: boolean
          api_key: string
          created_at: string
          expires_at: string | null
          id: string
          key_name: string
          last_used: string | null
          permissions: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          api_key: string
          created_at?: string
          expires_at?: string | null
          id?: string
          key_name: string
          last_used?: string | null
          permissions?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          api_key?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          key_name?: string
          last_used?: string | null
          permissions?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          active: boolean
          button_link: string | null
          button_text: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string
          position: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          position?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          position?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean | null
          color: string | null
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          name: string
          product_count: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          product_count?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          product_count?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_products: {
        Row: {
          active: boolean
          created_at: string
          id: string
          is_auto_selected: boolean
          position: number
          product_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          is_auto_selected?: boolean
          position?: number
          product_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          is_auto_selected?: boolean
          position?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_categories: {
        Row: {
          active: boolean
          category_id: string
          created_at: string
          custom_color: string | null
          custom_description: string | null
          custom_icon: string | null
          custom_image_url: string | null
          custom_title: string | null
          id: string
          is_featured: boolean
          position: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id: string
          created_at?: string
          custom_color?: string | null
          custom_description?: string | null
          custom_icon?: string | null
          custom_image_url?: string | null
          custom_title?: string | null
          id?: string
          is_featured?: boolean
          position?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string
          created_at?: string
          custom_color?: string | null
          custom_description?: string | null
          custom_icon?: string | null
          custom_image_url?: string | null
          custom_title?: string | null
          id?: string
          is_featured?: boolean
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_config: {
        Row: {
          active: boolean
          background_color: string | null
          button_color: string | null
          button_text: string
          created_at: string
          custom_image_url: string | null
          description: string | null
          email_placeholder: string
          icon_name: string | null
          id: string
          privacy_text: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          background_color?: string | null
          button_color?: string | null
          button_text?: string
          created_at?: string
          custom_image_url?: string | null
          description?: string | null
          email_placeholder?: string
          icon_name?: string | null
          id?: string
          privacy_text?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          background_color?: string | null
          button_color?: string | null
          button_text?: string
          created_at?: string
          custom_image_url?: string | null
          description?: string | null
          email_placeholder?: string
          icon_name?: string | null
          id?: string
          privacy_text?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_snapshot: Json | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_snapshot?: Json | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_snapshot?: Json | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_shipping_files: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          id: string
          order_id: string
          uploaded_at: string
        }
        Insert: {
          file_name: string
          file_path: string
          file_size: number
          id?: string
          order_id: string
          uploaded_at?: string
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          order_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_shipping_files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          created_at: string
          external_reference: string | null
          has_shipping_file: boolean | null
          id: string
          notes: string | null
          order_number: string
          payment_id: string | null
          payment_method: string | null
          payment_status: string | null
          pix_qr_code: string | null
          pix_qr_code_base64: string | null
          shipping_address: Json | null
          shipping_amount: number | null
          shipping_estimated_days: number | null
          shipping_method_id: string | null
          shipping_method_name: string | null
          status: string
          tax_amount: number | null
          total_amount: number
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string
          external_reference?: string | null
          has_shipping_file?: boolean | null
          id?: string
          notes?: string | null
          order_number: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          shipping_estimated_days?: number | null
          shipping_method_id?: string | null
          shipping_method_name?: string | null
          status?: string
          tax_amount?: number | null
          total_amount: number
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_address?: Json | null
          created_at?: string
          external_reference?: string | null
          has_shipping_file?: boolean | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          shipping_estimated_days?: number | null
          shipping_method_id?: string | null
          shipping_method_name?: string | null
          status?: string
          tax_amount?: number | null
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_shipping_method_id_fkey"
            columns: ["shipping_method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          price_modifier: number | null
          product_id: string
          stock_quantity: number | null
          type: string
          updated_at: string
          value: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          price_modifier?: number | null
          product_id: string
          stock_quantity?: number | null
          type: string
          updated_at?: string
          value: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          price_modifier?: number | null
          product_id?: string
          stock_quantity?: number | null
          type?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_variants_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          badge: string | null
          brand: string | null
          category_id: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          featured: boolean | null
          gtin_ean13: string | null
          height: number | null
          id: string
          image_url: string | null
          images: string[] | null
          length: number | null
          low_stock_alert: boolean | null
          main_image_url: string | null
          min_stock_level: number | null
          name: string
          original_price: number | null
          price: number
          rating: number | null
          review_count: number | null
          sku: string | null
          specifications: Json | null
          stock_quantity: number | null
          subcategory_id: string | null
          updated_at: string
          weight: number | null
          width: number | null
        }
        Insert: {
          active?: boolean | null
          badge?: string | null
          brand?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          featured?: boolean | null
          gtin_ean13?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          length?: number | null
          low_stock_alert?: boolean | null
          main_image_url?: string | null
          min_stock_level?: number | null
          name: string
          original_price?: number | null
          price: number
          rating?: number | null
          review_count?: number | null
          sku?: string | null
          specifications?: Json | null
          stock_quantity?: number | null
          subcategory_id?: string | null
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Update: {
          active?: boolean | null
          badge?: string | null
          brand?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          featured?: boolean | null
          gtin_ean13?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          length?: number | null
          low_stock_alert?: boolean | null
          main_image_url?: string | null
          min_stock_level?: number | null
          name?: string
          original_price?: number | null
          price?: number
          rating?: number | null
          review_count?: number | null
          sku?: string | null
          specifications?: Json | null
          stock_quantity?: number | null
          subcategory_id?: string | null
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_subcategory"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cpf: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_methods: {
        Row: {
          active: boolean
          base_price: number
          created_at: string
          description: string | null
          estimated_days: number
          id: string
          is_free_above_amount: number | null
          is_label_method: boolean
          max_file_size_mb: number | null
          name: string
          priority: number
          requires_upload: boolean
          transporter: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price?: number
          created_at?: string
          description?: string | null
          estimated_days?: number
          id?: string
          is_free_above_amount?: number | null
          is_label_method?: boolean
          max_file_size_mb?: number | null
          name: string
          priority?: number
          requires_upload?: boolean
          transporter?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price?: number
          created_at?: string
          description?: string | null
          estimated_days?: number
          id?: string
          is_free_above_amount?: number | null
          is_label_method?: boolean
          max_file_size_mb?: number | null
          name?: string
          priority?: number
          requires_upload?: boolean
          transporter?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shipping_rules: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          max_order_value: number | null
          max_weight: number | null
          min_order_value: number | null
          min_weight: number | null
          percentage_modifier: number | null
          price_modifier: number
          shipping_method_id: string
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          max_order_value?: number | null
          max_weight?: number | null
          min_order_value?: number | null
          min_weight?: number | null
          percentage_modifier?: number | null
          price_modifier?: number
          shipping_method_id: string
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          max_order_value?: number | null
          max_weight?: number | null
          min_order_value?: number | null
          min_weight?: number | null
          percentage_modifier?: number | null
          price_modifier?: number
          shipping_method_id?: string
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rules_shipping_method_id_fkey"
            columns: ["shipping_method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rules_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          zip_code_end: string
          zip_code_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          zip_code_end: string
          zip_code_start: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          zip_code_end?: string
          zip_code_start?: string
        }
        Relationships: []
      }
      store_config: {
        Row: {
          accent_color: string | null
          active: boolean
          benefits_config: Json | null
          buy_button_color: string | null
          buy_button_text_color: string | null
          buy_now_button_color: string | null
          buy_now_button_text_color: string | null
          cart_button_color: string | null
          cart_button_text_color: string | null
          checkout_button_color: string | null
          checkout_button_text_color: string | null
          continue_shopping_text_color: string | null
          created_at: string
          header_background_color: string | null
          header_message: string | null
          header_message_color: string | null
          id: string
          logo_url: string | null
          order_highlight_bg_color: string | null
          order_summary_highlight_color: string | null
          order_summary_highlight_text: string | null
          primary_color: string | null
          product_info_color: string | null
          secondary_color: string | null
          security_text_color: string | null
          store_name: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          active?: boolean
          benefits_config?: Json | null
          buy_button_color?: string | null
          buy_button_text_color?: string | null
          buy_now_button_color?: string | null
          buy_now_button_text_color?: string | null
          cart_button_color?: string | null
          cart_button_text_color?: string | null
          checkout_button_color?: string | null
          checkout_button_text_color?: string | null
          continue_shopping_text_color?: string | null
          created_at?: string
          header_background_color?: string | null
          header_message?: string | null
          header_message_color?: string | null
          id?: string
          logo_url?: string | null
          order_highlight_bg_color?: string | null
          order_summary_highlight_color?: string | null
          order_summary_highlight_text?: string | null
          primary_color?: string | null
          product_info_color?: string | null
          secondary_color?: string | null
          security_text_color?: string | null
          store_name?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          active?: boolean
          benefits_config?: Json | null
          buy_button_color?: string | null
          buy_button_text_color?: string | null
          buy_now_button_color?: string | null
          buy_now_button_text_color?: string | null
          cart_button_color?: string | null
          cart_button_text_color?: string | null
          checkout_button_color?: string | null
          checkout_button_text_color?: string | null
          continue_shopping_text_color?: string | null
          created_at?: string
          header_background_color?: string | null
          header_message?: string | null
          header_message_color?: string | null
          id?: string
          logo_url?: string | null
          order_highlight_bg_color?: string | null
          order_summary_highlight_color?: string | null
          order_summary_highlight_text?: string | null
          primary_color?: string | null
          product_info_color?: string | null
          secondary_color?: string | null
          security_text_color?: string | null
          store_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          active: boolean | null
          category_id: string
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category_id: string
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_subcategories_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          active: boolean
          comment: string
          created_at: string
          customer_avatar_url: string | null
          customer_initials: string | null
          customer_name: string
          id: string
          position: number
          product_purchased: string | null
          rating: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          comment: string
          created_at?: string
          customer_avatar_url?: string | null
          customer_initials?: string | null
          customer_name: string
          id?: string
          position?: number
          product_purchased?: string | null
          rating?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          comment?: string
          created_at?: string
          customer_avatar_url?: string | null
          customer_initials?: string | null
          customer_name?: string
          id?: string
          position?: number
          product_purchased?: string | null
          rating?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_api_key: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_gtin_ean13: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_sku: {
        Args: { brand_name?: string; category_name?: string }
        Returns: string
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "admin" | "super_admin"
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
      app_role: ["customer", "admin", "super_admin"],
    },
  },
} as const
