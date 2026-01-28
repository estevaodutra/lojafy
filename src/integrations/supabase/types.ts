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
      ai_corrections: {
        Row: {
          ai_response: string
          correct_response: string
          corrected_by: string | null
          created_at: string | null
          created_knowledge_id: string | null
          created_standard_answer_id: string | null
          customer_question: string
          id: string
          keywords: string[] | null
          original_message_id: string | null
          ticket_id: string | null
          updated_at: string | null
        }
        Insert: {
          ai_response: string
          correct_response: string
          corrected_by?: string | null
          created_at?: string | null
          created_knowledge_id?: string | null
          created_standard_answer_id?: string | null
          customer_question: string
          id?: string
          keywords?: string[] | null
          original_message_id?: string | null
          ticket_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_response?: string
          correct_response?: string
          corrected_by?: string | null
          created_at?: string | null
          created_knowledge_id?: string | null
          created_standard_answer_id?: string | null
          customer_question?: string
          id?: string
          keywords?: string[] | null
          original_message_id?: string | null
          ticket_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_corrections_created_knowledge_id_fkey"
            columns: ["created_knowledge_id"]
            isOneToOne: false
            referencedRelation: "ai_knowledge_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_corrections_created_standard_answer_id_fkey"
            columns: ["created_standard_answer_id"]
            isOneToOne: false
            referencedRelation: "ai_standard_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_corrections_original_message_id_fkey"
            columns: ["original_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_corrections_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge_base: {
        Row: {
          active: boolean | null
          attachments: Json | null
          category: Database["public"]["Enums"]["knowledge_category"]
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          keywords: string[] | null
          priority: number | null
          related_course_id: string | null
          related_lesson_id: string | null
          related_module_id: string | null
          subcategory: string | null
          target_audience: string
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          attachments?: Json | null
          category: Database["public"]["Enums"]["knowledge_category"]
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          keywords?: string[] | null
          priority?: number | null
          related_course_id?: string | null
          related_lesson_id?: string | null
          related_module_id?: string | null
          subcategory?: string | null
          target_audience?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          attachments?: Json | null
          category?: Database["public"]["Enums"]["knowledge_category"]
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          keywords?: string[] | null
          priority?: number | null
          related_course_id?: string | null
          related_lesson_id?: string | null
          related_module_id?: string | null
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
          {
            foreignKeyName: "ai_knowledge_base_related_course_id_fkey"
            columns: ["related_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_knowledge_base_related_lesson_id_fkey"
            columns: ["related_lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_knowledge_base_related_module_id_fkey"
            columns: ["related_module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_pending_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          asked_count: number | null
          attachments: Json | null
          created_at: string | null
          first_asked_at: string | null
          id: string
          keywords: string[] | null
          last_asked_at: string | null
          question: string
          related_course_id: string | null
          related_lesson_id: string | null
          related_module_id: string | null
          similar_questions: Json | null
          standard_answer_id: string | null
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
          attachments?: Json | null
          created_at?: string | null
          first_asked_at?: string | null
          id?: string
          keywords?: string[] | null
          last_asked_at?: string | null
          question: string
          related_course_id?: string | null
          related_lesson_id?: string | null
          related_module_id?: string | null
          similar_questions?: Json | null
          standard_answer_id?: string | null
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
          attachments?: Json | null
          created_at?: string | null
          first_asked_at?: string | null
          id?: string
          keywords?: string[] | null
          last_asked_at?: string | null
          question?: string
          related_course_id?: string | null
          related_lesson_id?: string | null
          related_module_id?: string | null
          similar_questions?: Json | null
          standard_answer_id?: string | null
          status?: string
          ticket_id?: string | null
          updated_at?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_pending_questions_related_course_id_fkey"
            columns: ["related_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_pending_questions_related_lesson_id_fkey"
            columns: ["related_lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_pending_questions_related_module_id_fkey"
            columns: ["related_module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_pending_questions_standard_answer_id_fkey"
            columns: ["standard_answer_id"]
            isOneToOne: false
            referencedRelation: "ai_standard_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_pending_questions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_standard_answers: {
        Row: {
          active: boolean | null
          answer: string
          attachments: Json | null
          auto_trigger_enabled: boolean | null
          button_link: string | null
          button_text: string | null
          created_at: string | null
          created_by: string | null
          id: string
          keywords: string[] | null
          name: string
          related_course_id: string | null
          related_lesson_id: string | null
          related_module_id: string | null
          trigger_keywords: string[] | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          active?: boolean | null
          answer: string
          attachments?: Json | null
          auto_trigger_enabled?: boolean | null
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          keywords?: string[] | null
          name: string
          related_course_id?: string | null
          related_lesson_id?: string | null
          related_module_id?: string | null
          trigger_keywords?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          active?: boolean | null
          answer?: string
          attachments?: Json | null
          auto_trigger_enabled?: boolean | null
          button_link?: string | null
          button_text?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          keywords?: string[] | null
          name?: string
          related_course_id?: string | null
          related_lesson_id?: string | null
          related_module_id?: string | null
          trigger_keywords?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_standard_answers_related_course_id_fkey"
            columns: ["related_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_standard_answers_related_lesson_id_fkey"
            columns: ["related_lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_standard_answers_related_module_id_fkey"
            columns: ["related_module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
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
          thumbnail_url: string | null
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
          thumbnail_url?: string | null
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
          thumbnail_url?: string | null
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
          thumbnail_url: string | null
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
          thumbnail_url?: string | null
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
          thumbnail_url?: string | null
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
      feature_transactions: {
        Row: {
          created_at: string | null
          executado_por: string | null
          feature_id: string
          id: string
          metadata: Json | null
          motivo: string | null
          tipo: Database["public"]["Enums"]["feature_transaction_tipo"]
          tipo_periodo: Database["public"]["Enums"]["feature_periodo"] | null
          user_id: string
          valor: number | null
        }
        Insert: {
          created_at?: string | null
          executado_por?: string | null
          feature_id: string
          id?: string
          metadata?: Json | null
          motivo?: string | null
          tipo: Database["public"]["Enums"]["feature_transaction_tipo"]
          tipo_periodo?: Database["public"]["Enums"]["feature_periodo"] | null
          user_id: string
          valor?: number | null
        }
        Update: {
          created_at?: string | null
          executado_por?: string | null
          feature_id?: string
          id?: string
          metadata?: Json | null
          motivo?: string | null
          tipo?: Database["public"]["Enums"]["feature_transaction_tipo"]
          tipo_periodo?: Database["public"]["Enums"]["feature_periodo"] | null
          user_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_transactions_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
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
      features: {
        Row: {
          ativo: boolean | null
          categoria: string
          created_at: string | null
          descricao: string | null
          icone: string | null
          id: string
          metadata: Json | null
          nome: string
          ordem_exibicao: number | null
          preco_anual: number | null
          preco_mensal: number | null
          preco_vitalicio: number | null
          requer_features: string[] | null
          roles_permitidas: string[] | null
          slug: string
          trial_dias: number | null
          updated_at: string | null
          visivel_catalogo: boolean | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          metadata?: Json | null
          nome: string
          ordem_exibicao?: number | null
          preco_anual?: number | null
          preco_mensal?: number | null
          preco_vitalicio?: number | null
          requer_features?: string[] | null
          roles_permitidas?: string[] | null
          slug: string
          trial_dias?: number | null
          updated_at?: string | null
          visivel_catalogo?: boolean | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          metadata?: Json | null
          nome?: string
          ordem_exibicao?: number | null
          preco_anual?: number | null
          preco_mensal?: number | null
          preco_vitalicio?: number | null
          requer_features?: string[] | null
          roles_permitidas?: string[] | null
          slug?: string
          trial_dias?: number | null
          updated_at?: string | null
          visivel_catalogo?: boolean | null
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
      order_ticket_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string | null
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id?: string | null
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_ticket_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "order_ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "order_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      order_ticket_messages: {
        Row: {
          author_id: string
          author_type: Database["public"]["Enums"]["ticket_author_type"]
          created_at: string | null
          id: string
          is_internal: boolean | null
          message: string
          ticket_id: string
        }
        Insert: {
          author_id: string
          author_type: Database["public"]["Enums"]["ticket_author_type"]
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message: string
          ticket_id: string
        }
        Update: {
          author_id?: string
          author_type?: Database["public"]["Enums"]["ticket_author_type"]
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "order_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tickets: {
        Row: {
          created_at: string | null
          current_responsible: string | null
          customer_id: string
          first_responded_at: string | null
          id: string
          order_id: string
          reason: string
          refund_amount: number | null
          reseller_id: string | null
          resolution: string | null
          resolved_at: string | null
          sla_first_response: string | null
          sla_resolution: string | null
          status: Database["public"]["Enums"]["order_ticket_status"] | null
          supplier_id: string | null
          ticket_number: string
          tipo: Database["public"]["Enums"]["order_ticket_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_responsible?: string | null
          customer_id: string
          first_responded_at?: string | null
          id?: string
          order_id: string
          reason: string
          refund_amount?: number | null
          reseller_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          sla_first_response?: string | null
          sla_resolution?: string | null
          status?: Database["public"]["Enums"]["order_ticket_status"] | null
          supplier_id?: string | null
          ticket_number: string
          tipo: Database["public"]["Enums"]["order_ticket_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_responsible?: string | null
          customer_id?: string
          first_responded_at?: string | null
          id?: string
          order_id?: string
          reason?: string
          refund_amount?: number | null
          reseller_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          sla_first_response?: string | null
          sla_resolution?: string | null
          status?: Database["public"]["Enums"]["order_ticket_status"] | null
          supplier_id?: string | null
          ticket_number?: string
          tipo?: Database["public"]["Enums"]["order_ticket_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_tickets_order_id_fkey"
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
          payment_expires_at: string | null
          payment_id: string | null
          payment_method: string | null
          payment_status: string | null
          pix_qr_code: string | null
          pix_qr_code_base64: string | null
          reseller_id: string | null
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
          payment_expires_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          reseller_id?: string | null
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
          payment_expires_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          reseller_id?: string | null
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
            foreignKeyName: "orders_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_shipping_method_id_fkey"
            columns: ["shipping_method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_refunds: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string
          id: string
          processed_at: string | null
          processed_by: string | null
          status: string | null
          ticket_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          ticket_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_refunds_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "order_tickets"
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
      product_approval_history: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_status: string
          notes: string | null
          performed_by: string
          previous_status: string | null
          product_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_status: string
          notes?: string | null
          performed_by: string
          previous_status?: string | null
          product_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          performed_by?: string
          previous_status?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_approval_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
          cost_price: number | null
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
          cost_price?: number | null
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
          cost_price?: number | null
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
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          badge: string | null
          brand: string | null
          category_id: string | null
          cost_price: number | null
          created_at: string
          created_by: string | null
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
          reference_ad_url: string | null
          rejected_at: string | null
          rejection_reason: string | null
          requires_approval: boolean | null
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
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          badge?: string | null
          brand?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
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
          reference_ad_url?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          requires_approval?: boolean | null
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
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          badge?: string | null
          brand?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          created_by?: string | null
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
          reference_ad_url?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          requires_approval?: boolean | null
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
          origem_loja_id: string | null
          origem_metadata: Json | null
          origem_tipo: Database["public"]["Enums"]["origem_tipo"] | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          subdomain: string | null
          subscription_expires_at: string | null
          subscription_payment_url: string | null
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
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
          origem_loja_id?: string | null
          origem_metadata?: Json | null
          origem_tipo?: Database["public"]["Enums"]["origem_tipo"] | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          subdomain?: string | null
          subscription_expires_at?: string | null
          subscription_payment_url?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
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
          origem_loja_id?: string | null
          origem_metadata?: Json | null
          origem_tipo?: Database["public"]["Enums"]["origem_tipo"] | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          subdomain?: string | null
          subscription_expires_at?: string | null
          subscription_payment_url?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
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
      reseller_coupons: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          current_uses: number | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          min_order_value: number | null
          reseller_id: string
          starts_at: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          current_uses?: number | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_value?: number | null
          reseller_id: string
          starts_at?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_value?: number | null
          reseller_id?: string
          starts_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_coupons_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reseller_onboarding_progress: {
        Row: {
          completed_at: string | null
          id: string
          step_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          step_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          step_id?: string
          user_id?: string
        }
        Relationships: []
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
          product_name_snapshot: string | null
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
          product_name_snapshot?: string | null
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
          product_name_snapshot?: string | null
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
      reseller_shipping_rules: {
        Row: {
          additional_days: number | null
          created_at: string | null
          enabled_shipping_methods: string[] | null
          free_shipping_enabled: boolean | null
          free_shipping_min_value: number | null
          id: string
          regional_rates: Json | null
          reseller_id: string
          updated_at: string | null
        }
        Insert: {
          additional_days?: number | null
          created_at?: string | null
          enabled_shipping_methods?: string[] | null
          free_shipping_enabled?: boolean | null
          free_shipping_min_value?: number | null
          id?: string
          regional_rates?: Json | null
          reseller_id: string
          updated_at?: string | null
        }
        Update: {
          additional_days?: number | null
          created_at?: string | null
          enabled_shipping_methods?: string[] | null
          free_shipping_enabled?: boolean | null
          free_shipping_min_value?: number | null
          id?: string
          regional_rates?: Json | null
          reseller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_shipping_rules_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: true
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
      reseller_testimonials: {
        Row: {
          active: boolean | null
          comment: string
          created_at: string | null
          customer_avatar_url: string | null
          customer_initials: string | null
          customer_name: string
          id: string
          position: number | null
          product_purchased: string | null
          rating: number | null
          reseller_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          comment: string
          created_at?: string | null
          customer_avatar_url?: string | null
          customer_initials?: string | null
          customer_name: string
          id?: string
          position?: number | null
          product_purchased?: string | null
          rating?: number | null
          reseller_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          comment?: string
          created_at?: string | null
          customer_avatar_url?: string | null
          customer_initials?: string | null
          customer_name?: string
          id?: string
          position?: number | null
          product_purchased?: string | null
          rating?: number | null
          reseller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_testimonials_reseller_id_fkey"
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
      role_transition_logs: {
        Row: {
          created_at: string | null
          from_role: Database["public"]["Enums"]["app_role"]
          id: string
          to_role: Database["public"]["Enums"]["app_role"]
          transitioned_by: string | null
          user_id: string
          webhook_sent: boolean | null
          webhook_sent_at: string | null
          welcome_popup_seen: boolean | null
          welcome_popup_seen_at: string | null
        }
        Insert: {
          created_at?: string | null
          from_role: Database["public"]["Enums"]["app_role"]
          id?: string
          to_role: Database["public"]["Enums"]["app_role"]
          transitioned_by?: string | null
          user_id: string
          webhook_sent?: boolean | null
          webhook_sent_at?: string | null
          welcome_popup_seen?: boolean | null
          welcome_popup_seen_at?: string | null
        }
        Update: {
          created_at?: string | null
          from_role?: Database["public"]["Enums"]["app_role"]
          id?: string
          to_role?: Database["public"]["Enums"]["app_role"]
          transitioned_by?: string | null
          user_id?: string
          webhook_sent?: boolean | null
          webhook_sent_at?: string | null
          welcome_popup_seen?: boolean | null
          welcome_popup_seen_at?: string | null
        }
        Relationships: []
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
      user_cleanup_logs: {
        Row: {
          action: string
          days_inactive: number
          email: string
          id: string
          performed_at: string
          performed_by: string | null
          reason: string
          user_id: string
        }
        Insert: {
          action: string
          days_inactive: number
          email: string
          id?: string
          performed_at?: string
          performed_by?: string | null
          reason: string
          user_id: string
        }
        Update: {
          action?: string
          days_inactive?: number
          email?: string
          id?: string
          performed_at?: string
          performed_by?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      user_features: {
        Row: {
          atribuido_por: string | null
          created_at: string | null
          data_expiracao: string | null
          data_inicio: string | null
          feature_id: string
          id: string
          metadata: Json | null
          motivo: string | null
          origem: string | null
          status: Database["public"]["Enums"]["feature_status"] | null
          tipo_periodo: Database["public"]["Enums"]["feature_periodo"]
          trial_usado: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          atribuido_por?: string | null
          created_at?: string | null
          data_expiracao?: string | null
          data_inicio?: string | null
          feature_id: string
          id?: string
          metadata?: Json | null
          motivo?: string | null
          origem?: string | null
          status?: Database["public"]["Enums"]["feature_status"] | null
          tipo_periodo: Database["public"]["Enums"]["feature_periodo"]
          trial_usado?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          atribuido_por?: string | null
          created_at?: string | null
          data_expiracao?: string | null
          data_inicio?: string | null
          feature_id?: string
          id?: string
          metadata?: Json | null
          motivo?: string | null
          origem?: string | null
          status?: Database["public"]["Enums"]["feature_status"] | null
          tipo_periodo?: Database["public"]["Enums"]["feature_periodo"]
          trial_usado?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      cancel_expired_order: { Args: { p_order_id: string }; Returns: boolean }
      complete_withdrawal: {
        Args: { p_admin_id: string; p_withdrawal_id: string }
        Returns: undefined
      }
      delete_inactive_users: {
        Args: never
        Returns: {
          affected_count: number
          user_emails: string[]
        }[]
      }
      disable_inactive_users: {
        Args: never
        Returns: {
          affected_count: number
          user_emails: string[]
        }[]
      }
      generate_api_key: { Args: never; Returns: string }
      generate_gtin_ean13: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      generate_sku: {
        Args: { brand_name?: string; category_name?: string }
        Returns: string
      }
      generate_ticket_number: { Args: never; Returns: string }
      generate_unique_store_slug: {
        Args: { store_id_param?: string; store_name_param: string }
        Returns: string
      }
      get_customer_display_name: {
        Args: { customer_user_id: string }
        Returns: string
      }
      get_expired_orders: {
        Args: never
        Returns: {
          created_at: string
          minutes_expired: number
          order_id: string
          order_number: string
          payment_expires_at: string
        }[]
      }
      get_feature_user_count: { Args: { _feature_id: string }; Returns: number }
      get_inactive_users_for_cleanup: {
        Args: never
        Returns: {
          action_needed: string
          created_at: string
          days_since_creation: number
          email: string
          is_banned: boolean
          last_sign_in_at: string
          user_id: string
        }[]
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
      get_user_active_features: {
        Args: { _user_id: string }
        Returns: {
          atribuido_por: string
          categoria: string
          data_expiracao: string
          data_inicio: string
          dias_restantes: number
          feature_icone: string
          feature_id: string
          feature_nome: string
          feature_slug: string
          motivo: string
          status: Database["public"]["Enums"]["feature_status"]
          tipo_periodo: Database["public"]["Enums"]["feature_periodo"]
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_users_with_email: {
        Args: never
        Returns: {
          avatar_url: string
          banned_until: string
          business_address: string
          business_cnpj: string
          business_name: string
          cpf: string
          created_at: string
          deleted_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          last_sign_in_at: string
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          subdomain: string
          subscription_expires_at: string
          subscription_payment_url: string
          subscription_plan: string
          updated_at: string
          user_id: string
        }[]
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: { user_role: Database["public"]["Enums"]["app_role"] }
            Returns: boolean
          }
      has_supplier_access_to_order: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      is_admin_user: { Args: never; Returns: boolean }
      is_ticket_participant: {
        Args: { _ticket_id: string; _user_id: string }
        Returns: boolean
      }
      is_users_order: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
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
      user_has_feature: {
        Args: { _feature_slug: string; _user_id: string }
        Returns: boolean
      }
      user_has_feature_or_superadmin: {
        Args: { _feature_slug: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "admin" | "super_admin" | "supplier" | "reseller"
      course_access_level: "all" | "customer" | "supplier" | "reseller"
      feature_periodo: "mensal" | "anual" | "vitalicio" | "trial" | "cortesia"
      feature_status: "ativo" | "trial" | "expirado" | "cancelado" | "revogado"
      feature_transaction_tipo:
        | "atribuicao"
        | "revogacao"
        | "renovacao"
        | "expiracao"
        | "trial_inicio"
        | "trial_fim"
      knowledge_category:
        | "faq"
        | "policy"
        | "product_info"
        | "general"
        | "academy_lesson"
      message_sender_type: "customer" | "ai" | "admin" | "system"
      order_ticket_status:
        | "aberto"
        | "em_analise"
        | "aguardando_cliente"
        | "resolvido"
        | "cancelado"
      order_ticket_type: "reembolso" | "troca" | "cancelamento"
      origem_tipo: "lojafy" | "loja" | "importado" | "convite"
      subscription_plan: "free" | "premium"
      ticket_author_type:
        | "cliente"
        | "revendedor"
        | "fornecedor"
        | "superadmin"
        | "sistema"
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
      feature_periodo: ["mensal", "anual", "vitalicio", "trial", "cortesia"],
      feature_status: ["ativo", "trial", "expirado", "cancelado", "revogado"],
      feature_transaction_tipo: [
        "atribuicao",
        "revogacao",
        "renovacao",
        "expiracao",
        "trial_inicio",
        "trial_fim",
      ],
      knowledge_category: [
        "faq",
        "policy",
        "product_info",
        "general",
        "academy_lesson",
      ],
      message_sender_type: ["customer", "ai", "admin", "system"],
      order_ticket_status: [
        "aberto",
        "em_analise",
        "aguardando_cliente",
        "resolvido",
        "cancelado",
      ],
      order_ticket_type: ["reembolso", "troca", "cancelamento"],
      origem_tipo: ["lojafy", "loja", "importado", "convite"],
      subscription_plan: ["free", "premium"],
      ticket_author_type: [
        "cliente",
        "revendedor",
        "fornecedor",
        "superadmin",
        "sistema",
      ],
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
