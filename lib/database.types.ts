export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          sku: string
          description: string | null
          price: number
          cost_price: number
          quantity: number
          category: string | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          sku: string
          description?: string | null
          price: number
          cost_price: number
          quantity?: number
          category?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          sku?: string
          description?: string | null
          price?: number
          cost_price?: number
          quantity?: number
          category?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          phone: string | null
          email: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      purchases: {
        Row: {
          id: string
          supplier_id: string | null
          reference_number: string
          purchase_date: string
          total_amount: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_id?: string | null
          reference_number: string
          purchase_date?: string
          total_amount: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string | null
          reference_number?: string
          purchase_date?: string
          total_amount?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      purchase_items: {
        Row: {
          id: string
          purchase_id: string
          product_id: string
          quantity: number
          unit_cost: number
          total_cost: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          purchase_id: string
          product_id: string
          quantity: number
          unit_cost: number
          total_cost: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          purchase_id?: string
          product_id?: string
          quantity?: number
          unit_cost?: number
          total_cost?: number
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          receipt_number: string
          sale_date: string
          total_amount: number
          payment_method: string
          payment_reference: string | null
          notes: string | null
          customer_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          receipt_number: string
          sale_date?: string
          total_amount: number
          payment_method: string
          payment_reference?: string | null
          notes?: string | null
          customer_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          receipt_number?: string
          sale_date?: string
          total_amount?: number
          payment_method?: string
          payment_reference?: string | null
          notes?: string | null
          customer_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
          updated_at?: string
        }
      }
      counters: {
        Row: {
          id: string
          value: number
        }
        Insert: {
          id: string
          value: number
        }
        Update: {
          id?: string
          value?: number
        }
      }
      settings: {
        Row: {
          id: number
          key: string
          value: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          key: string
          value: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          key?: string
          value?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      generate_receipt_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      check_table_exists: {
        Args: {
          table_name: string
        }
        Returns: boolean
      }
      execute_sql: {
        Args: {
          sql_query: string
        }
        Returns: void
      }
    }
  }
}
