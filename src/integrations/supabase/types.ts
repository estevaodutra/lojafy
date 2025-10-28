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
      ai_knowledge_base: {
        Row: {
          active: boolean | null
          category: Database["public"]["Enums"]["knowledge_category"]
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          keywords: string[] | null
          priority: number | null
          subcategory: string | null
          target_audience: string
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category: Database["public"]["Enums"]["knowledge_category"]
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          keywords?: string[] | null
          priority?: number | null
          subcategory?: string | null
          target_audience?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: Database["public"]["Enums"]["knowledge_category"]
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          keywords?: string[] | null
          priority?: number | null
          subcategory?: string | null
          target_audience?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_base_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ai_pending_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          asked_count: number | null
          created_at: string | null
          first_asked_at: string | null
          id: string
          keywords: string[] | null
          last_asked_at: string | null
          question: string
          similar_questions: Json | null
          status: string
          ticket_id: string | null
          updated_at: string | null
          user_role: string | null
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asked_count?: number | null
          created_at?: string | null
          first_asked_at?: string | null
          id?: string
          keywords?: string[] | null
          last_asked_at?: string | null
          question: string
          similar_questions?: Json | null
          status?: string
          ticket_id?: string | null
          updated_at?: string | null
          user_role?: string | null
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asked_count?: number | null
          created_at?: string | null
          first_asked_at?: string | null
          id?: string
          keywords?: string[] | null
          last_asked_at?: string | null
          question?: string
          similar_questions?: Json | null
          status?: string
          ticket_id?: string | null
          updated_at?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_pending_questions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_support_config: {
        Row: {
          ai_tone: string
          created_at: string | null
          escalation_keywords: string[] | null
          id: string
          max_response_length: number | null
          platform_context: string
          updated_at: string | null
        }
        Insert: {
          ai_tone?: string
          created_at?: string | null
          escalation_keywords?: string[] | null
          id?: string
          max_response_length?: number | null
          platform_context?: string
          updated_at?: string | null
        }
        Update: {
          ai_tone?: string
          created_at?: string | null
          escalation_keywords?: string[] | null
          id?: string
          max_response_length?: number | null
          platform_context?: string
          updated_at?: string | null
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
          banner_type: string | null
          button_link: string | null
          button_text: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string
          link_url: string | null
          mobile_height: number | null
          mobile_image_url: string | null
          open_new_tab: boolean | null
          position: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          banner_type?: string | null
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          link_url?: string | null
          mobile_height?: number | null
          mobile_image_url?: string | null
          open_new_tab?: boolean | null
          position?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          banner_type?: string | null
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          link_url?: string | null
          mobile_height?: number | null
          mobile_image_url?: string | null
          open_new_tab?: boolean | null
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
      chat_messages: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          metadata: Json | null
          read_at: string | null
          sender_id: string | null
          sender_type: Database["public"]["Enums"]["message_sender_type"]
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string | null
          sender_type: Database["public"]["Enums"]["message_sender_type"]
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string | null
          sender_type?: Database["public"]["Enums"]["message_sender_type"]
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string | null
          expires_at: string | null
          id: string
          progress_percentage: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string | null
          expires_at?: string | null
          id?: string
          progress_percentage?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string | null
          expires_at?: string | null
          id?: string
          progress_percentage?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          attachments: Json | null
          content: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_published: boolean | null
          lesson_description: string | null
          module_id: string
          position: number | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          attachments?: Json | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          lesson_description?: string | null
          module_id: string
          position?: number | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          lesson_description?: string | null
          module_id?: string
          position?: number | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          position: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          position?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          position?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          access_level: Database["public"]["Enums"]["course_access_level"]
          created_at: string | null
          description: string | null
          duration_hours: number | null
          id: string
          instructor_name: string | null
          is_published: boolean | null
          level: string | null
          position: number | null
          price: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["course_access_level"]
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          instructor_name?: string | null
          is_published?: boolean | null
          level?: string | null
          position?: number | null
          price?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          access_level?: Database["public"]["Enums"]["course_access_level"]
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          instructor_name?: string | null
          is_published?: boolean | null
          level?: string | null
          position?: number | null
          price?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      demo_order_items: {
        Row: {
          created_at: string
          demo_order_id: string
          id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          demo_order_id: string
          id?: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          demo_order_id?: string
          id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "demo_order_items_demo_order_id_fkey"
            columns: ["demo_order_id"]
            isOneToOne: false
            referencedRelation: "demo_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_orders: {
        Row: {
          created_at: string
          demo_type: string
          demo_user_id: string
          id: string
          order_number: string
          shipping_amount: number | null
          status: string
          tax_amount: number | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          demo_type?: string
          demo_user_id: string
          id?: string
          order_number: string
          shipping_amount?: number | null
          status?: string
          tax_amount?: number | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          demo_type?: string
          demo_user_id?: string
          id?: string
          order_number?: string
          shipping_amount?: number | null
          status?: string
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_orders_demo_user_id_fkey"
            columns: ["demo_user_id"]
            isOneToOne: false
            referencedRelation: "demo_users"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_users: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
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
      financial_transactions: {
        Row: {
          amount: number
          available_at: string | null
          created_at: string | null
          description: string | null
          fee_amount: number | null
          id: string
          net_amount: number
          order_id: string | null
          processed_at: string | null
          status: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          available_at?: string | null
          created_at?: string | null
          description?: string | null
          fee_amount?: number | null
          id?: string
          net_amount: number
          order_id?: string | null
          processed_at?: string | null
          status?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          available_at?: string | null
          created_at?: string | null
          description?: string | null
          fee_amount?: number | null
          id?: string
          net_amount?: number
          order_id?: string | null
          processed_at?: string | null
          status?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          enrollment_id: string
          id: string
          is_completed: boolean | null
          last_position_seconds: number | null
          lesson_id: string
          notes: string | null
          updated_at: string | null
          user_id: string
          watch_time_seconds: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          enrollment_id: string
          id?: string
          is_completed?: boolean | null
          last_position_seconds?: number | null
          lesson_id: string
          notes?: string | null
          updated_at?: string | null
          user_id: string
          watch_time_seconds?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          enrollment_id?: string
          id?: string
          is_completed?: boolean | null
          last_position_seconds?: number | null
          lesson_id?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string
          watch_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "course_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      mandatory_notification_views: {
        Row: {
          action_clicked: boolean
          button_clicked: boolean
          days_viewed: number | null
          id: string
          last_viewed_date: string | null
          notification_id: string
          user_id: string
          video_completed: boolean
          video_watched_seconds: number | null
          viewed_at: string
        }
        Insert: {
          action_clicked?: boolean
          button_clicked?: boolean
          days_viewed?: number | null
          id?: string
          last_viewed_date?: string | null
          notification_id: string
          user_id: string
          video_completed?: boolean
          video_watched_seconds?: number | null
          viewed_at?: string
        }
        Update: {
          action_clicked?: boolean
          button_clicked?: boolean
          days_viewed?: number | null
          id?: string
          last_viewed_date?: string | null
          notification_id?: string
          user_id?: string
          video_completed?: boolean
          video_watched_seconds?: number | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mandatory_notification_views_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "mandatory_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      mandatory_notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          priority: number
          target_audience: string
          title: string
          updated_at: string
          video_aspect_ratio: string | null
          video_provider: string | null
          video_url: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          priority?: number
          target_audience?: string
          title: string
          updated_at?: string
          video_aspect_ratio?: string | null
          video_provider?: string | null
          video_url?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          priority?: number
          target_audience?: string
          title?: string
          updated_at?: string
          video_aspect_ratio?: string | null
          video_provider?: string | null
          video_url?: string | null
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
      notification_campaigns: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string | null
          created_by: string
          id: string
          message: string
          metadata: Json | null
          sent_count: number | null
          target_audience: string
          target_user_ids: string[] | null
          title: string
          type: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          message: string
          metadata?: Json | null
          sent_count?: number | null
          target_audience: string
          target_user_ids?: string[] | null
          title: string
          type: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          message?: string
          metadata?: Json | null
          sent_count?: number | null
          target_audience?: string
          target_user_ids?: string[] | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          action_label: string | null
          action_url_template: string | null
          active: boolean
          conditions: Json | null
          created_at: string | null
          id: string
          last_sent_at: string | null
          message_template: string
          target_audience: string
          title_template: string
          total_read: number | null
          total_sent: number | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          action_label?: string | null
          action_url_template?: string | null
          active?: boolean
          conditions?: Json | null
          created_at?: string | null
          id?: string
          last_sent_at?: string | null
          message_template: string
          target_audience?: string
          title_template: string
          total_read?: number | null
          total_sent?: number | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          action_label?: string | null
          action_url_template?: string | null
          active?: boolean
          conditions?: Json | null
          created_at?: string | null
          id?: string
          last_sent_at?: string | null
          message_template?: string
          target_audience?: string
          title_template?: string
          total_read?: number | null
          total_sent?: number | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
      order_refund_documents: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          id: string
          order_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_path: string
          file_size: number
          id?: string
          order_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          order_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_refund_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      platform_settings: {
        Row: {
          additional_costs: Json | null
          auto_withdrawal_enabled: boolean | null
          auto_withdrawal_frequency: string | null
          created_at: string | null
          gateway_fee_percentage: number | null
          guarantee_period_days: number | null
          id: string
          platform_fee_type: string | null
          platform_fee_value: number | null
          reseller_withdrawal_fee_type: string | null
          reseller_withdrawal_fee_value: number | null
          updated_at: string | null
          withdrawal_processing_days: number | null
        }
        Insert: {
          additional_costs?: Json | null
          auto_withdrawal_enabled?: boolean | null
          auto_withdrawal_frequency?: string | null
          created_at?: string | null
          gateway_fee_percentage?: number | null
          guarantee_period_days?: number | null
          id?: string
          platform_fee_type?: string | null
          platform_fee_value?: number | null
          reseller_withdrawal_fee_type?: string | null
          reseller_withdrawal_fee_value?: number | null
          updated_at?: string | null
          withdrawal_processing_days?: number | null
        }
        Update: {
          additional_costs?: Json | null
          auto_withdrawal_enabled?: boolean | null
          auto_withdrawal_frequency?: string | null
          created_at?: string | null
          gateway_fee_percentage?: number | null
          guarantee_period_days?: number | null
          id?: string
          platform_fee_type?: string | null
          platform_fee_value?: number | null
          reseller_withdrawal_fee_type?: string | null
          reseller_withdrawal_fee_value?: number | null
          updated_at?: string | null
          withdrawal_processing_days?: number | null
        }
        Relationships: []
      }
      product_ranking: {
        Row: {
          average_profit: number
          average_sales_value: number
          created_at: string
          daily_sales: number
          id: string
          position: number
          product_id: string | null
          sku: string
          updated_at: string
        }
        Insert: {
          average_profit: number
          average_sales_value: number
          created_at?: string
          daily_sales: number
          id?: string
          position: number
          product_id?: string | null
          sku: string
          updated_at?: string
        }
        Update: {
          average_profit?: number
          average_sales_value?: number
          created_at?: string
          daily_sales?: number
          id?: string
          position?: number
          product_id?: string | null
          sku?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_ranking_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
          high_rotation: boolean | null
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
          supplier_id: string | null
          updated_at: string
          use_auto_pricing: boolean | null
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
          high_rotation?: boolean | null
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
          supplier_id?: string | null
          updated_at?: string
          use_auto_pricing?: boolean | null
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
          high_rotation?: boolean | null
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
          supplier_id?: string | null
          updated_at?: string
          use_auto_pricing?: boolean | null
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
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_address: string | null
          business_cnpj: string | null
          business_name: string | null
          cpf: string | null
          created_at: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          subdomain: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          business_address?: string | null
          business_cnpj?: string | null
          business_name?: string | null
          cpf?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          subdomain?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          business_address?: string | null
          business_cnpj?: string | null
          business_name?: string | null
          cpf?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          subdomain?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reseller_banners: {
        Row: {
          active: boolean
          banner_type: string
          created_at: string | null
          desktop_image_url: string
          id: string
          link_url: string | null
          mobile_image_url: string | null
          open_new_tab: boolean | null
          position: number
          reseller_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          banner_type?: string
          created_at?: string | null
          desktop_image_url: string
          id?: string
          link_url?: string | null
          mobile_image_url?: string | null
          open_new_tab?: boolean | null
          position?: number
          reseller_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          banner_type?: string
          created_at?: string | null
          desktop_image_url?: string
          id?: string
          link_url?: string | null
          mobile_image_url?: string | null
          open_new_tab?: boolean | null
          position?: number
          reseller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_banners_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reseller_products: {
        Row: {
          active: boolean | null
          created_at: string | null
          custom_description: string | null
          custom_price: number | null
          id: string
          position: number | null
          product_id: string
          reseller_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          custom_description?: string | null
          custom_price?: number | null
          id?: string
          position?: number | null
          product_id: string
          reseller_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          custom_description?: string | null
          custom_price?: number | null
          id?: string
          position?: number | null
          product_id?: string
          reseller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_products_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reseller_store_pages: {
        Row: {
          active: boolean
          content: Json
          created_at: string
          id: string
          page_type: string
          reseller_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          content?: Json
          created_at?: string
          id?: string
          page_type: string
          reseller_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          content?: Json
          created_at?: string
          id?: string
          page_type?: string
          reseller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reseller_stores: {
        Row: {
          accent_color: string | null
          active: boolean | null
          banner_image_url: string | null
          banner_subtitle: string | null
          banner_title: string | null
          benefits_config: Json | null
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          default_margin: number | null
          id: string
          logo_url: string | null
          payment_methods: Json | null
          policies: Json | null
          primary_color: string | null
          reseller_id: string
          secondary_color: string | null
          store_name: string
          store_slug: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          accent_color?: string | null
          active?: boolean | null
          banner_image_url?: string | null
          banner_subtitle?: string | null
          banner_title?: string | null
          benefits_config?: Json | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          default_margin?: number | null
          id?: string
          logo_url?: string | null
          payment_methods?: Json | null
          policies?: Json | null
          primary_color?: string | null
          reseller_id: string
          secondary_color?: string | null
          store_name: string
          store_slug?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          accent_color?: string | null
          active?: boolean | null
          banner_image_url?: string | null
          banner_subtitle?: string | null
          banner_title?: string | null
          benefits_config?: Json | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          default_margin?: number | null
          id?: string
          logo_url?: string | null
          payment_methods?: Json | null
          policies?: Json | null
          primary_color?: string | null
          reseller_id?: string
          secondary_color?: string | null
          store_name?: string
          store_slug?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_stores_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
          business_hours: string | null
          buy_button_color: string | null
          buy_button_text_color: string | null
          buy_now_button_color: string | null
          buy_now_button_text_color: string | null
          cart_button_color: string | null
          cart_button_text_color: string | null
          checkout_button_color: string | null
          checkout_button_text_color: string | null
          company_address: string | null
          company_cnpj: string | null
          company_email: string | null
          company_phone: string | null
          continue_shopping_text_color: string | null
          created_at: string
          facebook_url: string | null
          footer_description: string | null
          footer_developed_text: string | null
          header_background_color: string | null
          header_message: string | null
          header_message_color: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          order_highlight_bg_color: string | null
          order_summary_highlight_color: string | null
          order_summary_highlight_text: string | null
          primary_color: string | null
          product_info_color: string | null
          secondary_color: string | null
          security_text_color: string | null
          store_name: string | null
          twitter_url: string | null
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          accent_color?: string | null
          active?: boolean
          benefits_config?: Json | null
          business_hours?: string | null
          buy_button_color?: string | null
          buy_button_text_color?: string | null
          buy_now_button_color?: string | null
          buy_now_button_text_color?: string | null
          cart_button_color?: string | null
          cart_button_text_color?: string | null
          checkout_button_color?: string | null
          checkout_button_text_color?: string | null
          company_address?: string | null
          company_cnpj?: string | null
          company_email?: string | null
          company_phone?: string | null
          continue_shopping_text_color?: string | null
          created_at?: string
          facebook_url?: string | null
          footer_description?: string | null
          footer_developed_text?: string | null
          header_background_color?: string | null
          header_message?: string | null
          header_message_color?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          order_highlight_bg_color?: string | null
          order_summary_highlight_color?: string | null
          order_summary_highlight_text?: string | null
          primary_color?: string | null
          product_info_color?: string | null
          secondary_color?: string | null
          security_text_color?: string | null
          store_name?: string | null
          twitter_url?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          accent_color?: string | null
          active?: boolean
          benefits_config?: Json | null
          business_hours?: string | null
          buy_button_color?: string | null
          buy_button_text_color?: string | null
          buy_now_button_color?: string | null
          buy_now_button_text_color?: string | null
          cart_button_color?: string | null
          cart_button_text_color?: string | null
          checkout_button_color?: string | null
          checkout_button_text_color?: string | null
          company_address?: string | null
          company_cnpj?: string | null
          company_email?: string | null
          company_phone?: string | null
          continue_shopping_text_color?: string | null
          created_at?: string
          facebook_url?: string | null
          footer_description?: string | null
          footer_developed_text?: string | null
          header_background_color?: string | null
          header_message?: string | null
          header_message_color?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          order_highlight_bg_color?: string | null
          order_summary_highlight_color?: string | null
          order_summary_highlight_text?: string | null
          primary_color?: string | null
          product_info_color?: string | null
          secondary_color?: string | null
          security_text_color?: string | null
          store_name?: string | null
          twitter_url?: string | null
          updated_at?: string
          youtube_url?: string | null
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
      support_tickets: {
        Row: {
          ai_handled: boolean | null
          assigned_to: string | null
          created_at: string | null
          customer_email: string
          customer_name: string | null
          id: string
          last_message_at: string | null
          metadata: Json | null
          priority: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          tags: string[] | null
          unread_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_handled?: boolean | null
          assigned_to?: string | null
          created_at?: string | null
          customer_email: string
          customer_name?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_handled?: boolean | null
          assigned_to?: string | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject?: string
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
      withdrawal_requests: {
        Row: {
          amount: number
          bank_details: Json
          created_at: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_details: Json
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_details?: Json
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: string
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
      approve_withdrawal: {
        Args: { p_admin_id: string; p_withdrawal_id: string }
        Returns: undefined
      }
      calculate_available_balance: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_blocked_balance: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_pending_withdrawals: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_total_withdrawn: {
        Args: { p_user_id: string }
        Returns: number
      }
      complete_withdrawal: {
        Args: { p_admin_id: string; p_withdrawal_id: string }
        Returns: undefined
      }
      generate_api_key: { Args: never; Returns: string }
      generate_gtin_ean13: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      generate_sku: {
        Args: { brand_name?: string; category_name?: string }
        Returns: string
      }
      generate_unique_store_slug: {
        Args: { store_id_param?: string; store_name_param: string }
        Returns: string
      }
      get_customer_display_name: {
        Args: { customer_user_id: string }
        Returns: string
      }
      get_last_message_preview: {
        Args: { p_ticket_id: string }
        Returns: {
          content: string
          created_at: string
          sender_type: string
        }[]
      }
      get_mandatory_notification_metrics: {
        Args: { notification_uuid: string }
        Returns: {
          action_clicked_count: number
          button_clicked_count: number
          ctr_action_click: number
          ctr_button_click: number
          ctr_video_completion: number
          total_views: number
          video_completed_count: number
        }[]
      }
      get_safe_demo_user_data: {
        Args: never
        Returns: {
          created_at: string
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_safe_demo_user_data_for_ranking: {
        Args: never
        Returns: {
          created_at: string
          first_name: string
          id: string
          last_name: string
        }[]
      }
      get_safe_order_data_for_public_ranking: {
        Args: never
        Returns: {
          created_at: string
          id: string
          status: string
          total_amount: number
        }[]
      }
      get_safe_order_data_for_ranking: {
        Args: never
        Returns: {
          created_at: string
          id: string
          status: string
          total_amount: number
        }[]
      }
      get_users_with_email: {
        Args: never
        Returns: {
          avatar_url: string
          business_address: string
          business_cnpj: string
          business_name: string
          cpf: string
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          subdomain: string
          updated_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: { user_role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_admin_user: { Args: never; Returns: boolean }
      reject_withdrawal: {
        Args: { p_admin_id: string; p_reason: string; p_withdrawal_id: string }
        Returns: undefined
      }
      send_automatic_notification: {
        Args: {
          p_target_user_ids?: string[]
          p_trigger_type: string
          p_variables: Json
        }
        Returns: number
      }
      send_notification_campaign: {
        Args: {
          p_action_label: string
          p_action_url: string
          p_campaign_id: string
          p_message: string
          p_metadata: Json
          p_target_audience: string
          p_target_user_ids: string[]
          p_title: string
          p_type: string
        }
        Returns: number
      }
    }
    Enums: {
      app_role: "customer" | "admin" | "super_admin" | "supplier" | "reseller"
      course_access_level: "all" | "customer" | "supplier" | "reseller"
      knowledge_category:
        | "faq"
        | "policy"
        | "product_info"
        | "general"
        | "academy_lesson"
      message_sender_type: "customer" | "ai" | "admin" | "system"
      ticket_priority: "low" | "normal" | "high" | "urgent"
      ticket_status:
        | "open"
        | "waiting_customer"
        | "waiting_admin"
        | "resolved"
        | "closed"
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
      app_role: ["customer", "admin", "super_admin", "supplier", "reseller"],
      course_access_level: ["all", "customer", "supplier", "reseller"],
      knowledge_category: [
        "faq",
        "policy",
        "product_info",
        "general",
        "academy_lesson",
      ],
      message_sender_type: ["customer", "ai", "admin", "system"],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: [
        "open",
        "waiting_customer",
        "waiting_admin",
        "resolved",
        "closed",
      ],
    },
  },
} as const
