export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      animal_disease_records: {
        Row: {
          animal_id: string
          created_at: string | null
          created_by: string
          diagnosis_date: string
          disease_id: string
          id: string
          notes: string | null
          outbreak_id: string | null
          recovery_date: string | null
          status: string | null
          symptoms_observed: string[] | null
          treatment_plan: string | null
          veterinarian_id: string | null
        }
        Insert: {
          animal_id: string
          created_at?: string | null
          created_by: string
          diagnosis_date: string
          disease_id: string
          id?: string
          notes?: string | null
          outbreak_id?: string | null
          recovery_date?: string | null
          status?: string | null
          symptoms_observed?: string[] | null
          treatment_plan?: string | null
          veterinarian_id?: string | null
        }
        Update: {
          animal_id?: string
          created_at?: string | null
          created_by?: string
          diagnosis_date?: string
          disease_id?: string
          id?: string
          notes?: string | null
          outbreak_id?: string | null
          recovery_date?: string | null
          status?: string | null
          symptoms_observed?: string[] | null
          treatment_plan?: string | null
          veterinarian_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_disease_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_disease_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_disease_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_disease_records_disease_id_fkey"
            columns: ["disease_id"]
            isOneToOne: false
            referencedRelation: "diseases_conditions"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_health_records: {
        Row: {
          animal_id: string
          cost: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          farm_id: string | null
          id: string
          medication: string | null
          next_due_date: string | null
          notes: string | null
          outbreak_id: string | null
          record_date: string
          record_type: string
          severity: string | null
          symptoms: string | null
          treatment: string | null
          veterinarian: string | null
        }
        Insert: {
          animal_id: string
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          farm_id?: string | null
          id?: string
          medication?: string | null
          next_due_date?: string | null
          notes?: string | null
          outbreak_id?: string | null
          record_date: string
          record_type: string
          severity?: string | null
          symptoms?: string | null
          treatment?: string | null
          veterinarian?: string | null
        }
        Update: {
          animal_id?: string
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          farm_id?: string | null
          id?: string
          medication?: string | null
          next_due_date?: string | null
          notes?: string | null
          outbreak_id?: string | null
          record_date?: string
          record_type?: string
          severity?: string | null
          symptoms?: string | null
          treatment?: string | null
          veterinarian?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_health_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_health_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_health_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_health_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_health_records_outbreak_id_fkey"
            columns: ["outbreak_id"]
            isOneToOne: false
            referencedRelation: "disease_outbreaks"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_production_records: {
        Row: {
          animal_id: string
          created_at: string | null
          fat_content: number | null
          id: string
          milk_volume: number | null
          notes: string | null
          protein_content: number | null
          record_date: string
          somatic_cell_count: number | null
        }
        Insert: {
          animal_id: string
          created_at?: string | null
          fat_content?: number | null
          id?: string
          milk_volume?: number | null
          notes?: string | null
          protein_content?: number | null
          record_date: string
          somatic_cell_count?: number | null
        }
        Update: {
          animal_id?: string
          created_at?: string | null
          fat_content?: number | null
          id?: string
          milk_volume?: number | null
          notes?: string | null
          protein_content?: number | null
          record_date?: string
          somatic_cell_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_production_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_production_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_production_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_releases: {
        Row: {
          animal_data: Json
          animal_id: string
          buyer_info: string | null
          created_at: string | null
          death_cause: string | null
          farm_id: string
          id: string
          notes: string
          release_date: string
          release_reason: string
          released_by: string
          sale_price: number | null
          transfer_location: string | null
        }
        Insert: {
          animal_data: Json
          animal_id: string
          buyer_info?: string | null
          created_at?: string | null
          death_cause?: string | null
          farm_id: string
          id?: string
          notes: string
          release_date: string
          release_reason: string
          released_by: string
          sale_price?: number | null
          transfer_location?: string | null
        }
        Update: {
          animal_data?: Json
          animal_id?: string
          buyer_info?: string | null
          created_at?: string | null
          death_cause?: string | null
          farm_id?: string
          id?: string
          notes?: string
          release_date?: string
          release_reason?: string
          released_by?: string
          sale_price?: number | null
          transfer_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_releases_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_releases_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_releases_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_releases_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_sales: {
        Row: {
          animal_id: string
          buyer_contact: string | null
          buyer_name: string | null
          created_at: string | null
          farm_id: string
          id: string
          reason_for_sale: string | null
          sale_date: string
          sale_price: number
          transaction_id: string | null
          updated_at: string | null
          weight_at_sale: number | null
        }
        Insert: {
          animal_id: string
          buyer_contact?: string | null
          buyer_name?: string | null
          created_at?: string | null
          farm_id: string
          id?: string
          reason_for_sale?: string | null
          sale_date: string
          sale_price: number
          transaction_id?: string | null
          updated_at?: string | null
          weight_at_sale?: number | null
        }
        Update: {
          animal_id?: string
          buyer_contact?: string | null
          buyer_name?: string | null
          created_at?: string | null
          farm_id?: string
          id?: string
          reason_for_sale?: string | null
          sale_date?: string
          sale_price?: number
          transaction_id?: string | null
          updated_at?: string | null
          weight_at_sale?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_sales_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_sales_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_sales_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_sales_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_sales_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          animal_source: string
          birth_date: string | null
          birth_weight: number | null
          breed: string | null
          created_at: string | null
          current_daily_production: number | null
          days_in_milk: number | null
          expected_calving_date: string | null
          farm_id: string
          father_id: string | null
          father_info: string | null
          gender: string | null
          health_status: string | null
          id: string
          lactation_number: number | null
          mother_id: string | null
          mother_production_info: Json | null
          name: string | null
          notes: string | null
          production_status: string | null
          purchase_date: string | null
          purchase_price: number | null
          release_date: string | null
          release_reason: string | null
          seller_info: string | null
          service_date: string | null
          service_method: string | null
          status: string | null
          tag_number: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          animal_source: string
          birth_date?: string | null
          birth_weight?: number | null
          breed?: string | null
          created_at?: string | null
          current_daily_production?: number | null
          days_in_milk?: number | null
          expected_calving_date?: string | null
          farm_id: string
          father_id?: string | null
          father_info?: string | null
          gender?: string | null
          health_status?: string | null
          id?: string
          lactation_number?: number | null
          mother_id?: string | null
          mother_production_info?: Json | null
          name?: string | null
          notes?: string | null
          production_status?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          release_date?: string | null
          release_reason?: string | null
          seller_info?: string | null
          service_date?: string | null
          service_method?: string | null
          status?: string | null
          tag_number: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          animal_source?: string
          birth_date?: string | null
          birth_weight?: number | null
          breed?: string | null
          created_at?: string | null
          current_daily_production?: number | null
          days_in_milk?: number | null
          expected_calving_date?: string | null
          farm_id?: string
          father_id?: string | null
          father_info?: string | null
          gender?: string | null
          health_status?: string | null
          id?: string
          lactation_number?: number | null
          mother_id?: string | null
          mother_production_info?: Json | null
          name?: string | null
          notes?: string | null
          production_status?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          release_date?: string | null
          release_reason?: string | null
          seller_info?: string | null
          service_date?: string | null
          service_method?: string | null
          status?: string | null
          tag_number?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "animals_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_father_id_fkey"
            columns: ["father_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_father_id_fkey"
            columns: ["father_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_father_id_fkey"
            columns: ["father_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
        ]
      }
      breeding_calendar: {
        Row: {
          animal_id: string
          created_at: string | null
          event_type: string
          farm_id: string
          id: string
          notes: string | null
          reminder_sent: boolean | null
          scheduled_date: string
          status: string | null
        }
        Insert: {
          animal_id: string
          created_at?: string | null
          event_type: string
          farm_id: string
          id?: string
          notes?: string | null
          reminder_sent?: boolean | null
          scheduled_date: string
          status?: string | null
        }
        Update: {
          animal_id?: string
          created_at?: string | null
          event_type?: string
          farm_id?: string
          id?: string
          notes?: string | null
          reminder_sent?: boolean | null
          scheduled_date?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "breeding_calendar_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_calendar_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_calendar_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_calendar_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      breeding_events: {
        Row: {
          animal_id: string
          calf_gender: string | null
          calf_health_status: string | null
          calf_tag_number: string | null
          calf_weight: number | null
          calving_outcome: Database["public"]["Enums"]["calving_outcome"] | null
          created_at: string | null
          created_by: string
          estimated_due_date: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["breeding_event_type"]
          examination_method: string | null
          farm_id: string
          heat_action_taken: string | null
          heat_signs: string[] | null
          id: string
          insemination_method:
            | Database["public"]["Enums"]["insemination_method"]
            | null
          notes: string | null
          pregnancy_result:
            | Database["public"]["Enums"]["pregnancy_result"]
            | null
          semen_bull_code: string | null
          technician_name: string | null
          updated_at: string | null
          veterinarian_name: string | null
        }
        Insert: {
          animal_id: string
          calf_gender?: string | null
          calf_health_status?: string | null
          calf_tag_number?: string | null
          calf_weight?: number | null
          calving_outcome?:
            | Database["public"]["Enums"]["calving_outcome"]
            | null
          created_at?: string | null
          created_by: string
          estimated_due_date?: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["breeding_event_type"]
          examination_method?: string | null
          farm_id: string
          heat_action_taken?: string | null
          heat_signs?: string[] | null
          id?: string
          insemination_method?:
            | Database["public"]["Enums"]["insemination_method"]
            | null
          notes?: string | null
          pregnancy_result?:
            | Database["public"]["Enums"]["pregnancy_result"]
            | null
          semen_bull_code?: string | null
          technician_name?: string | null
          updated_at?: string | null
          veterinarian_name?: string | null
        }
        Update: {
          animal_id?: string
          calf_gender?: string | null
          calf_health_status?: string | null
          calf_tag_number?: string | null
          calf_weight?: number | null
          calving_outcome?:
            | Database["public"]["Enums"]["calving_outcome"]
            | null
          created_at?: string | null
          created_by?: string
          estimated_due_date?: string | null
          event_date?: string
          event_type?: Database["public"]["Enums"]["breeding_event_type"]
          examination_method?: string | null
          farm_id?: string
          heat_action_taken?: string | null
          heat_signs?: string[] | null
          id?: string
          insemination_method?:
            | Database["public"]["Enums"]["insemination_method"]
            | null
          notes?: string | null
          pregnancy_result?:
            | Database["public"]["Enums"]["pregnancy_result"]
            | null
          semen_bull_code?: string | null
          technician_name?: string | null
          updated_at?: string | null
          veterinarian_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "breeding_events_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_events_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_events_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_events_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      breeding_records: {
        Row: {
          animal_id: string
          breeding_date: string
          breeding_type: string
          cost: number | null
          created_at: string | null
          farm_id: string
          id: string
          notes: string | null
          sire_breed: string | null
          sire_id: string | null
          sire_name: string | null
          sire_registration_number: string | null
          success_rate: number | null
          technician_name: string | null
          updated_at: string | null
        }
        Insert: {
          animal_id: string
          breeding_date: string
          breeding_type: string
          cost?: number | null
          created_at?: string | null
          farm_id: string
          id?: string
          notes?: string | null
          sire_breed?: string | null
          sire_id?: string | null
          sire_name?: string | null
          sire_registration_number?: string | null
          success_rate?: number | null
          technician_name?: string | null
          updated_at?: string | null
        }
        Update: {
          animal_id?: string
          breeding_date?: string
          breeding_type?: string
          cost?: number | null
          created_at?: string | null
          farm_id?: string
          id?: string
          notes?: string | null
          sire_breed?: string | null
          sire_id?: string | null
          sire_name?: string | null
          sire_registration_number?: string | null
          success_rate?: number | null
          technician_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "breeding_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_records_sire_id_fkey"
            columns: ["sire_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_records_sire_id_fkey"
            columns: ["sire_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_records_sire_id_fkey"
            columns: ["sire_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_plans: {
        Row: {
          created_at: string | null
          equipment_budget: number | null
          farm_id: string
          feed_budget: number | null
          id: string
          is_active: boolean | null
          labor_budget: number | null
          maintenance_budget: number | null
          monthly_expense_limit: number | null
          monthly_income_target: number | null
          plan_name: string
          plan_year: number
          updated_at: string | null
          veterinary_budget: number | null
        }
        Insert: {
          created_at?: string | null
          equipment_budget?: number | null
          farm_id: string
          feed_budget?: number | null
          id?: string
          is_active?: boolean | null
          labor_budget?: number | null
          maintenance_budget?: number | null
          monthly_expense_limit?: number | null
          monthly_income_target?: number | null
          plan_name: string
          plan_year: number
          updated_at?: string | null
          veterinary_budget?: number | null
        }
        Update: {
          created_at?: string | null
          equipment_budget?: number | null
          farm_id?: string
          feed_budget?: number | null
          id?: string
          is_active?: boolean | null
          labor_budget?: number | null
          maintenance_budget?: number | null
          monthly_expense_limit?: number | null
          monthly_income_target?: number | null
          plan_name?: string
          plan_year?: number
          updated_at?: string | null
          veterinary_budget?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_plans_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      calf_records: {
        Row: {
          animal_id: string | null
          birth_date: string
          birth_weight: number | null
          breed: string | null
          calving_record_id: string
          created_at: string | null
          dam_id: string
          farm_id: string
          gender: string
          health_status: string | null
          id: string
          notes: string | null
          registration_number: string | null
          sire_info: string | null
          temporary_id: string | null
          updated_at: string | null
          weaning_date: string | null
          weaning_weight: number | null
        }
        Insert: {
          animal_id?: string | null
          birth_date: string
          birth_weight?: number | null
          breed?: string | null
          calving_record_id: string
          created_at?: string | null
          dam_id: string
          farm_id: string
          gender: string
          health_status?: string | null
          id?: string
          notes?: string | null
          registration_number?: string | null
          sire_info?: string | null
          temporary_id?: string | null
          updated_at?: string | null
          weaning_date?: string | null
          weaning_weight?: number | null
        }
        Update: {
          animal_id?: string | null
          birth_date?: string
          birth_weight?: number | null
          breed?: string | null
          calving_record_id?: string
          created_at?: string | null
          dam_id?: string
          farm_id?: string
          gender?: string
          health_status?: string | null
          id?: string
          notes?: string | null
          registration_number?: string | null
          sire_info?: string | null
          temporary_id?: string | null
          updated_at?: string | null
          weaning_date?: string | null
          weaning_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "calf_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calf_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calf_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calf_records_calving_record_id_fkey"
            columns: ["calving_record_id"]
            isOneToOne: false
            referencedRelation: "calving_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calf_records_dam_id_fkey"
            columns: ["dam_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calf_records_dam_id_fkey"
            columns: ["dam_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calf_records_dam_id_fkey"
            columns: ["dam_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calf_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      calving_records: {
        Row: {
          assistance_required: boolean | null
          birth_weight: number | null
          calf_alive: boolean | null
          calf_gender: string | null
          calf_health_status: string | null
          calving_date: string
          calving_difficulty: string | null
          calving_time: string | null
          colostrum_quality: string | null
          complications: string | null
          created_at: string | null
          farm_id: string
          id: string
          mother_id: string
          notes: string | null
          pregnancy_record_id: string
          updated_at: string | null
          veterinarian: string | null
        }
        Insert: {
          assistance_required?: boolean | null
          birth_weight?: number | null
          calf_alive?: boolean | null
          calf_gender?: string | null
          calf_health_status?: string | null
          calving_date: string
          calving_difficulty?: string | null
          calving_time?: string | null
          colostrum_quality?: string | null
          complications?: string | null
          created_at?: string | null
          farm_id: string
          id?: string
          mother_id: string
          notes?: string | null
          pregnancy_record_id: string
          updated_at?: string | null
          veterinarian?: string | null
        }
        Update: {
          assistance_required?: boolean | null
          birth_weight?: number | null
          calf_alive?: boolean | null
          calf_gender?: string | null
          calf_health_status?: string | null
          calving_date?: string
          calving_difficulty?: string | null
          calving_time?: string | null
          colostrum_quality?: string | null
          complications?: string | null
          created_at?: string | null
          farm_id?: string
          id?: string
          mother_id?: string
          notes?: string | null
          pregnancy_record_id?: string
          updated_at?: string | null
          veterinarian?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calving_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calving_records_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calving_records_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calving_records_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calving_records_pregnancy_record_id_fkey"
            columns: ["pregnancy_record_id"]
            isOneToOne: false
            referencedRelation: "pregnancy_records"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_feed_summary: {
        Row: {
          animals_fed: number | null
          cost_per_animal: number | null
          created_at: string | null
          farm_id: string
          feed_types_used: number | null
          id: string
          summary_date: string
          total_feed_cost: number | null
          total_quantity_kg: number | null
          updated_at: string | null
        }
        Insert: {
          animals_fed?: number | null
          cost_per_animal?: number | null
          created_at?: string | null
          farm_id: string
          feed_types_used?: number | null
          id?: string
          summary_date: string
          total_feed_cost?: number | null
          total_quantity_kg?: number | null
          updated_at?: string | null
        }
        Update: {
          animals_fed?: number | null
          cost_per_animal?: number | null
          created_at?: string | null
          farm_id?: string
          feed_types_used?: number | null
          id?: string
          summary_date?: string
          total_feed_cost?: number | null
          total_quantity_kg?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_feed_summary_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_production_summary: {
        Row: {
          animals_milked: number | null
          average_fat_content: number | null
          average_protein_content: number | null
          created_at: string | null
          farm_id: string
          id: string
          record_date: string
          sessions_recorded: number | null
          total_milk_volume: number | null
          updated_at: string | null
        }
        Insert: {
          animals_milked?: number | null
          average_fat_content?: number | null
          average_protein_content?: number | null
          created_at?: string | null
          farm_id: string
          id?: string
          record_date: string
          sessions_recorded?: number | null
          total_milk_volume?: number | null
          updated_at?: string | null
        }
        Update: {
          animals_milked?: number | null
          average_fat_content?: number | null
          average_protein_content?: number | null
          created_at?: string | null
          farm_id?: string
          id?: string
          record_date?: string
          sessions_recorded?: number | null
          total_milk_volume?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_production_summary_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      disease_outbreaks: {
        Row: {
          affected_animals: Json
          created_at: string | null
          description: string
          disease_type: string
          estimated_duration: number | null
          farm_id: string
          first_detected_date: string
          id: string
          notes: string | null
          outbreak_name: string
          preventive_measures: string | null
          quarantine_area: string | null
          quarantine_required: boolean | null
          resolved_date: string | null
          severity_level: string
          status: string | null
          symptoms: string
          treatment_protocol: string | null
          updated_at: string | null
          veterinarian: string | null
        }
        Insert: {
          affected_animals?: Json
          created_at?: string | null
          description: string
          disease_type: string
          estimated_duration?: number | null
          farm_id: string
          first_detected_date: string
          id?: string
          notes?: string | null
          outbreak_name: string
          preventive_measures?: string | null
          quarantine_area?: string | null
          quarantine_required?: boolean | null
          resolved_date?: string | null
          severity_level: string
          status?: string | null
          symptoms: string
          treatment_protocol?: string | null
          updated_at?: string | null
          veterinarian?: string | null
        }
        Update: {
          affected_animals?: Json
          created_at?: string | null
          description?: string
          disease_type?: string
          estimated_duration?: number | null
          farm_id?: string
          first_detected_date?: string
          id?: string
          notes?: string | null
          outbreak_name?: string
          preventive_measures?: string | null
          quarantine_area?: string | null
          quarantine_required?: boolean | null
          resolved_date?: string | null
          severity_level?: string
          status?: string | null
          symptoms?: string
          treatment_protocol?: string | null
          updated_at?: string | null
          veterinarian?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disease_outbreaks_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      diseases_conditions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_contagious: boolean | null
          name: string
          quarantine_days: number | null
          reporting_required: boolean | null
          symptoms: string[] | null
          treatment_notes: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_contagious?: boolean | null
          name: string
          quarantine_days?: number | null
          reporting_required?: boolean | null
          symptoms?: string[] | null
          treatment_notes?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_contagious?: boolean | null
          name?: string
          quarantine_days?: number | null
          reporting_required?: boolean | null
          symptoms?: string[] | null
          treatment_notes?: string | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          brand: string | null
          created_at: string | null
          description: string | null
          equipment_type: string
          farm_id: string
          id: string
          location: string | null
          model: string | null
          name: string
          notes: string | null
          purchase_cost: number | null
          purchase_date: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["equipment_status"] | null
          supplier_id: string | null
          updated_at: string | null
          warranty_expiry: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          description?: string | null
          equipment_type: string
          farm_id: string
          id?: string
          location?: string | null
          model?: string | null
          name: string
          notes?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"] | null
          supplier_id?: string | null
          updated_at?: string | null
          warranty_expiry?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          description?: string | null
          equipment_type?: string
          farm_id?: string
          id?: string
          location?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"] | null
          supplier_id?: string | null
          updated_at?: string | null
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_maintenance: {
        Row: {
          cost: number | null
          created_at: string | null
          description: string
          equipment_id: string
          id: string
          labor_hours: number | null
          maintenance_date: string
          maintenance_type: string
          next_maintenance_date: string | null
          notes: string | null
          parts_used: string | null
          performed_by: string | null
          status: string | null
          supplier_id: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          description: string
          equipment_id: string
          id?: string
          labor_hours?: number | null
          maintenance_date: string
          maintenance_type: string
          next_maintenance_date?: string | null
          notes?: string | null
          parts_used?: string | null
          performed_by?: string | null
          status?: string | null
          supplier_id?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          description?: string
          equipment_id?: string
          id?: string
          labor_hours?: number | null
          maintenance_date?: string
          maintenance_type?: string
          next_maintenance_date?: string | null
          notes?: string | null
          parts_used?: string | null
          performed_by?: string | null
          status?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_maintenance_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_maintenance_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_profiles: {
        Row: {
          completion_percentage: number | null
          created_at: string | null
          enable_reminders: boolean | null
          farm_id: string | null
          farm_name: string | null
          feature_frequencies: Json | null
          goal_timeline: string | null
          herd_growth_target: number | null
          herd_size: number | null
          id: string
          location: string | null
          milk_production_target: number | null
          onboarding_completed: boolean | null
          preferred_schedule: string | null
          primary_goal: string | null
          reminder_time: string | null
          revenue_target: number | null
          specific_challenges: Json | null
          success_metrics: Json | null
          tracking_features: Json | null
          tracking_preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string | null
          enable_reminders?: boolean | null
          farm_id?: string | null
          farm_name?: string | null
          feature_frequencies?: Json | null
          goal_timeline?: string | null
          herd_growth_target?: number | null
          herd_size?: number | null
          id?: string
          location?: string | null
          milk_production_target?: number | null
          onboarding_completed?: boolean | null
          preferred_schedule?: string | null
          primary_goal?: string | null
          reminder_time?: string | null
          revenue_target?: number | null
          specific_challenges?: Json | null
          success_metrics?: Json | null
          tracking_features?: Json | null
          tracking_preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string | null
          enable_reminders?: boolean | null
          farm_id?: string | null
          farm_name?: string | null
          feature_frequencies?: Json | null
          goal_timeline?: string | null
          herd_growth_target?: number | null
          herd_size?: number | null
          id?: string
          location?: string | null
          milk_production_target?: number | null
          onboarding_completed?: boolean | null
          preferred_schedule?: string | null
          primary_goal?: string | null
          reminder_time?: string | null
          revenue_target?: number | null
          specific_challenges?: Json | null
          success_metrics?: Json | null
          tracking_features?: Json | null
          tracking_preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_profiles_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          created_at: string | null
          farm_type: string | null
          id: string
          location: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          farm_type?: string | null
          id?: string
          location?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          farm_type?: string | null
          id?: string
          location?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feed_consumption: {
        Row: {
          animal_id: string | null
          consumption_date: string
          cost_per_kg: number | null
          created_at: string | null
          farm_id: string
          feed_type_id: string
          feeding_session: string | null
          id: string
          notes: string | null
          quantity_kg: number
          recorded_by: string | null
          updated_at: string | null
        }
        Insert: {
          animal_id?: string | null
          consumption_date: string
          cost_per_kg?: number | null
          created_at?: string | null
          farm_id: string
          feed_type_id: string
          feeding_session?: string | null
          id?: string
          notes?: string | null
          quantity_kg: number
          recorded_by?: string | null
          updated_at?: string | null
        }
        Update: {
          animal_id?: string | null
          consumption_date?: string
          cost_per_kg?: number | null
          created_at?: string | null
          farm_id?: string
          feed_type_id?: string
          feeding_session?: string | null
          id?: string
          notes?: string | null
          quantity_kg?: number
          recorded_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_consumption_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_consumption_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_consumption_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_consumption_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_consumption_feed_type_id_fkey"
            columns: ["feed_type_id"]
            isOneToOne: false
            referencedRelation: "feed_types"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_inventory: {
        Row: {
          batch_number: string | null
          cost_per_kg: number | null
          created_at: string | null
          expiry_date: string | null
          farm_id: string
          feed_type_id: string
          id: string
          notes: string | null
          purchase_date: string | null
          quantity_kg: number
          supplier: string | null
          updated_at: string | null
        }
        Insert: {
          batch_number?: string | null
          cost_per_kg?: number | null
          created_at?: string | null
          expiry_date?: string | null
          farm_id: string
          feed_type_id: string
          id?: string
          notes?: string | null
          purchase_date?: string | null
          quantity_kg: number
          supplier?: string | null
          updated_at?: string | null
        }
        Update: {
          batch_number?: string | null
          cost_per_kg?: number | null
          created_at?: string | null
          expiry_date?: string | null
          farm_id?: string
          feed_type_id?: string
          id?: string
          notes?: string | null
          purchase_date?: string | null
          quantity_kg?: number
          supplier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_inventory_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_inventory_feed_type_id_fkey"
            columns: ["feed_type_id"]
            isOneToOne: false
            referencedRelation: "feed_types"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_types: {
        Row: {
          created_at: string | null
          description: string | null
          farm_id: string
          id: string
          name: string
          nutritional_info: Json | null
          supplier: string | null
          typical_cost_per_kg: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          farm_id: string
          id?: string
          name: string
          nutritional_info?: Json | null
          supplier?: string | null
          typical_cost_per_kg?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          farm_id?: string
          id?: string
          name?: string
          nutritional_info?: Json | null
          supplier?: string | null
          typical_cost_per_kg?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_types_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      feeding_schedules: {
        Row: {
          created_at: string | null
          description: string | null
          farm_id: string
          feed_mix: Json
          id: string
          is_active: boolean | null
          name: string
          schedule_times: Json
          target_animals: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          farm_id: string
          feed_mix: Json
          id?: string
          is_active?: boolean | null
          name: string
          schedule_times: Json
          target_animals?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          farm_id?: string
          feed_mix?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          schedule_times?: Json
          target_animals?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feeding_schedules_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          animal_id: string | null
          created_at: string | null
          created_by: string
          customer_name: string | null
          description: string
          expense_category:
            | Database["public"]["Enums"]["expense_category"]
            | null
          farm_id: string
          id: string
          income_category: Database["public"]["Enums"]["income_category"] | null
          invoice_number: string | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          receipt_number: string | null
          reference_number: string | null
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          animal_id?: string | null
          created_at?: string | null
          created_by: string
          customer_name?: string | null
          description: string
          expense_category?:
            | Database["public"]["Enums"]["expense_category"]
            | null
          farm_id: string
          id?: string
          income_category?:
            | Database["public"]["Enums"]["income_category"]
            | null
          invoice_number?: string | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_number?: string | null
          reference_number?: string | null
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          animal_id?: string | null
          created_at?: string | null
          created_by?: string
          customer_name?: string | null
          description?: string
          expense_category?:
            | Database["public"]["Enums"]["expense_category"]
            | null
          farm_id?: string
          id?: string
          income_category?:
            | Database["public"]["Enums"]["income_category"]
            | null
          invoice_number?: string | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_number?: string | null
          reference_number?: string | null
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      health_protocols: {
        Row: {
          animal_groups: string[] | null
          auto_create_records: boolean | null
          created_at: string | null
          created_by: string
          description: string
          end_date: string | null
          estimated_cost: number | null
          farm_id: string
          frequency_type: string
          frequency_value: number
          id: string
          individual_animals: string[] | null
          is_active: boolean | null
          notes: string | null
          protocol_name: string
          protocol_type: string
          start_date: string
          target_animals: string
          updated_at: string | null
          veterinarian: string | null
        }
        Insert: {
          animal_groups?: string[] | null
          auto_create_records?: boolean | null
          created_at?: string | null
          created_by: string
          description: string
          end_date?: string | null
          estimated_cost?: number | null
          farm_id: string
          frequency_type: string
          frequency_value: number
          id?: string
          individual_animals?: string[] | null
          is_active?: boolean | null
          notes?: string | null
          protocol_name: string
          protocol_type: string
          start_date: string
          target_animals: string
          updated_at?: string | null
          veterinarian?: string | null
        }
        Update: {
          animal_groups?: string[] | null
          auto_create_records?: boolean | null
          created_at?: string | null
          created_by?: string
          description?: string
          end_date?: string | null
          estimated_cost?: number | null
          farm_id?: string
          frequency_type?: string
          frequency_value?: number
          id?: string
          individual_animals?: string[] | null
          is_active?: boolean | null
          notes?: string | null
          protocol_name?: string
          protocol_type?: string
          start_date?: string
          target_animals?: string
          updated_at?: string | null
          veterinarian?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_protocols_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: Database["public"]["Enums"]["inventory_category"]
          created_at: string | null
          current_stock: number | null
          description: string | null
          expiry_date: string | null
          farm_id: string
          id: string
          maximum_stock: number | null
          minimum_stock: number | null
          name: string
          notes: string | null
          sku: string | null
          status: string | null
          storage_location: string | null
          supplier_id: string | null
          unit_cost: number | null
          unit_of_measure: string
          updated_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["inventory_category"]
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          expiry_date?: string | null
          farm_id: string
          id?: string
          maximum_stock?: number | null
          minimum_stock?: number | null
          name: string
          notes?: string | null
          sku?: string | null
          status?: string | null
          storage_location?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
          unit_of_measure: string
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["inventory_category"]
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          expiry_date?: string | null
          farm_id?: string
          id?: string
          maximum_stock?: number | null
          minimum_stock?: number | null
          name?: string
          notes?: string | null
          sku?: string | null
          status?: string | null
          storage_location?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
          unit_of_measure?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          farm_id: string
          id: string
          inventory_item_id: string
          notes: string | null
          performed_by: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          total_cost: number | null
          transaction_date: string | null
          transaction_type: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          farm_id: string
          id?: string
          inventory_item_id: string
          notes?: string | null
          performed_by?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          transaction_date?: string | null
          transaction_type: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          farm_id?: string
          id?: string
          inventory_item_id?: string
          notes?: string | null
          performed_by?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          transaction_date?: string | null
          transaction_type?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          farm_id: string | null
          id: string
          invited_by: string
          role_type: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["invitation_status"] | null
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          farm_id?: string | null
          id?: string
          invited_by: string
          role_type: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"] | null
          token: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          farm_id?: string | null
          id?: string
          invited_by?: string
          role_type?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"] | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_administrations: {
        Row: {
          administered_by: string
          administered_date: string
          administration_method: string | null
          animal_id: string
          created_at: string | null
          dose_amount: number
          dose_unit: string | null
          id: string
          medication_id: string
          notes: string | null
          withdrawal_end_date: string | null
        }
        Insert: {
          administered_by: string
          administered_date: string
          administration_method?: string | null
          animal_id: string
          created_at?: string | null
          dose_amount: number
          dose_unit?: string | null
          id?: string
          medication_id: string
          notes?: string | null
          withdrawal_end_date?: string | null
        }
        Update: {
          administered_by?: string
          administered_date?: string
          administration_method?: string | null
          animal_id?: string
          created_at?: string | null
          dose_amount?: number
          dose_unit?: string | null
          id?: string
          medication_id?: string
          notes?: string | null
          withdrawal_end_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_administrations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_administrations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_administrations_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_administrations_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          batch_number: string | null
          cost_per_unit: number | null
          created_at: string | null
          expiry_date: string | null
          farm_id: string
          id: string
          is_prescription: boolean | null
          manufacturer: string | null
          name: string
          quantity_available: number | null
          storage_requirements: string | null
          type: string
          unit: string | null
          withdrawal_period_days: number | null
        }
        Insert: {
          batch_number?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          expiry_date?: string | null
          farm_id: string
          id?: string
          is_prescription?: boolean | null
          manufacturer?: string | null
          name: string
          quantity_available?: number | null
          storage_requirements?: string | null
          type: string
          unit?: string | null
          withdrawal_period_days?: number | null
        }
        Update: {
          batch_number?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          expiry_date?: string | null
          farm_id?: string
          id?: string
          is_prescription?: boolean | null
          manufacturer?: string | null
          name?: string
          quantity_available?: number | null
          storage_requirements?: string | null
          type?: string
          unit?: string | null
          withdrawal_period_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medications_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      milk_sales: {
        Row: {
          buyer_name: string | null
          created_at: string | null
          farm_id: string
          fat_content: number | null
          id: string
          price_per_liter: number
          protein_content: number | null
          quality_grade: string | null
          sale_date: string
          somatic_cell_count: number | null
          total_amount: number
          transaction_id: string | null
          updated_at: string | null
          volume_liters: number
        }
        Insert: {
          buyer_name?: string | null
          created_at?: string | null
          farm_id: string
          fat_content?: number | null
          id?: string
          price_per_liter: number
          protein_content?: number | null
          quality_grade?: string | null
          sale_date: string
          somatic_cell_count?: number | null
          total_amount: number
          transaction_id?: string | null
          updated_at?: string | null
          volume_liters: number
        }
        Update: {
          buyer_name?: string | null
          created_at?: string | null
          farm_id?: string
          fat_content?: number | null
          id?: string
          price_per_liter?: number
          protein_content?: number | null
          quality_grade?: string | null
          sale_date?: string
          somatic_cell_count?: number | null
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string | null
          volume_liters?: number
        }
        Relationships: [
          {
            foreignKeyName: "milk_sales_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milk_sales_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      outbreak_animals: {
        Row: {
          animal_id: string
          id: string
          infection_date: string | null
          outbreak_id: string
          recovery_date: string | null
          status: string | null
        }
        Insert: {
          animal_id: string
          id?: string
          infection_date?: string | null
          outbreak_id: string
          recovery_date?: string | null
          status?: string | null
        }
        Update: {
          animal_id?: string
          id?: string
          infection_date?: string | null
          outbreak_id?: string
          recovery_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbreak_animals_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbreak_animals_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbreak_animals_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
        ]
      }
      pregnancy_records: {
        Row: {
          actual_calving_date: string | null
          animal_id: string
          breeding_record_id: string
          confirmation_method: string | null
          confirmed_date: string | null
          created_at: string | null
          expected_calving_date: string | null
          farm_id: string
          gestation_length: number | null
          id: string
          pregnancy_notes: string | null
          pregnancy_status: string
          updated_at: string | null
          veterinarian: string | null
        }
        Insert: {
          actual_calving_date?: string | null
          animal_id: string
          breeding_record_id: string
          confirmation_method?: string | null
          confirmed_date?: string | null
          created_at?: string | null
          expected_calving_date?: string | null
          farm_id: string
          gestation_length?: number | null
          id?: string
          pregnancy_notes?: string | null
          pregnancy_status?: string
          updated_at?: string | null
          veterinarian?: string | null
        }
        Update: {
          actual_calving_date?: string | null
          animal_id?: string
          breeding_record_id?: string
          confirmation_method?: string | null
          confirmed_date?: string | null
          created_at?: string | null
          expected_calving_date?: string | null
          farm_id?: string
          gestation_length?: number | null
          id?: string
          pregnancy_notes?: string | null
          pregnancy_status?: string
          updated_at?: string | null
          veterinarian?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pregnancy_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_records_breeding_record_id_fkey"
            columns: ["breeding_record_id"]
            isOneToOne: false
            referencedRelation: "breeding_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pregnancy_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      production_records: {
        Row: {
          animal_id: string
          created_at: string | null
          farm_id: string
          fat_content: number | null
          id: string
          lactose_content: number | null
          milk_volume: number | null
          milking_session: string | null
          notes: string | null
          ph_level: number | null
          protein_content: number | null
          record_date: string
          recorded_by: string | null
          somatic_cell_count: number | null
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          animal_id: string
          created_at?: string | null
          farm_id: string
          fat_content?: number | null
          id?: string
          lactose_content?: number | null
          milk_volume?: number | null
          milking_session?: string | null
          notes?: string | null
          ph_level?: number | null
          protein_content?: number | null
          record_date: string
          recorded_by?: string | null
          somatic_cell_count?: number | null
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          animal_id?: string
          created_at?: string | null
          farm_id?: string
          fat_content?: number | null
          id?: string
          lactose_content?: number | null
          milk_volume?: number | null
          milking_session?: string | null
          notes?: string | null
          ph_level?: number | null
          protein_content?: number | null
          record_date?: string
          recorded_by?: string | null
          somatic_cell_count?: number | null
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          raw_user_meta_data: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          raw_user_meta_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          raw_user_meta_data?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      protocol_animals: {
        Row: {
          animal_id: string
          id: string
          protocol_id: string
        }
        Insert: {
          animal_id: string
          id?: string
          protocol_id: string
        }
        Update: {
          animal_id?: string
          id?: string
          protocol_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_animals_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_animals_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_animals_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          inventory_item_id: string | null
          purchase_order_id: string
          quantity: number
          received_quantity: number | null
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          inventory_item_id?: string | null
          purchase_order_id: string
          quantity: number
          received_quantity?: number | null
          total_cost: number
          unit_cost: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          inventory_item_id?: string | null
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number | null
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          actual_delivery_date: string | null
          created_at: string | null
          created_by: string | null
          expected_delivery_date: string | null
          farm_id: string
          id: string
          notes: string | null
          order_date: string | null
          po_number: string
          status: string | null
          supplier_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date?: string | null
          farm_id: string
          id?: string
          notes?: string | null
          order_date?: string | null
          po_number: string
          status?: string | null
          supplier_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date?: string | null
          farm_id?: string
          id?: string
          notes?: string | null
          order_date?: string | null
          po_number?: string
          status?: string | null
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          farm_id: string
          id: string
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          status: string | null
          supplier_type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          farm_id: string
          id?: string
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string | null
          supplier_type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          farm_id?: string
          id?: string
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string | null
          supplier_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          farm_id: string | null
          id: string
          role_type: Database["public"]["Enums"]["user_role"]
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          farm_id?: string | null
          id?: string
          role_type: Database["public"]["Enums"]["user_role"]
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          farm_id?: string | null
          id?: string
          role_type?: Database["public"]["Enums"]["user_role"]
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccination_animals: {
        Row: {
          animal_id: string
          id: string
          vaccination_id: string
        }
        Insert: {
          animal_id: string
          id?: string
          vaccination_id: string
        }
        Update: {
          animal_id?: string
          id?: string
          vaccination_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_animals_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_animals_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_animals_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_animals_vaccination_id_fkey"
            columns: ["vaccination_id"]
            isOneToOne: false
            referencedRelation: "vaccinations"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccination_protocols: {
        Row: {
          age_at_first_dose_days: number | null
          booster_schedule: string[] | null
          created_at: string | null
          created_by: string
          description: string | null
          farm_id: string
          frequency_days: number
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          vaccine_name: string
        }
        Insert: {
          age_at_first_dose_days?: number | null
          booster_schedule?: string[] | null
          created_at?: string | null
          created_by: string
          description?: string | null
          farm_id: string
          frequency_days: number
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          vaccine_name: string
        }
        Update: {
          age_at_first_dose_days?: number | null
          booster_schedule?: string[] | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          farm_id?: string
          frequency_days?: number
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          vaccine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_protocols_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccination_schedules: {
        Row: {
          actual_date: string | null
          administered_by: string | null
          animal_id: string
          created_at: string | null
          id: string
          notes: string | null
          protocol_id: string
          reminder_sent: boolean | null
          scheduled_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_date?: string | null
          administered_by?: string | null
          animal_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          protocol_id: string
          reminder_sent?: boolean | null
          scheduled_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_date?: string | null
          administered_by?: string | null
          animal_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          protocol_id?: string
          reminder_sent?: boolean | null
          scheduled_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_schedules_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_schedules_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_schedules_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_schedules_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "vaccination_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccinations: {
        Row: {
          batch_number: string | null
          cost_per_dose: number | null
          create_reminder: boolean | null
          created_at: string | null
          dosage: string
          farm_id: string
          id: string
          manufacturer: string | null
          next_due_date: string | null
          notes: string | null
          route_of_administration: string | null
          side_effects: string | null
          total_cost: number | null
          updated_at: string | null
          vaccination_date: string
          vaccination_site: string | null
          vaccine_name: string
          vaccine_type: string | null
          veterinarian: string | null
        }
        Insert: {
          batch_number?: string | null
          cost_per_dose?: number | null
          create_reminder?: boolean | null
          created_at?: string | null
          dosage: string
          farm_id: string
          id?: string
          manufacturer?: string | null
          next_due_date?: string | null
          notes?: string | null
          route_of_administration?: string | null
          side_effects?: string | null
          total_cost?: number | null
          updated_at?: string | null
          vaccination_date: string
          vaccination_site?: string | null
          vaccine_name: string
          vaccine_type?: string | null
          veterinarian?: string | null
        }
        Update: {
          batch_number?: string | null
          cost_per_dose?: number | null
          create_reminder?: boolean | null
          created_at?: string | null
          dosage?: string
          farm_id?: string
          id?: string
          manufacturer?: string | null
          next_due_date?: string | null
          notes?: string | null
          route_of_administration?: string | null
          side_effects?: string | null
          total_cost?: number | null
          updated_at?: string | null
          vaccination_date?: string
          vaccination_site?: string | null
          vaccine_name?: string
          vaccine_type?: string | null
          veterinarian?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vaccinations_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      veterinarians: {
        Row: {
          address_city: string
          address_country: string
          address_postal: string
          address_state: string
          address_street: string
          availability_hours: string | null
          clinic_name: string
          created_at: string | null
          created_by: string
          email: string
          emergency_available: boolean | null
          farm_id: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          license_number: string
          name: string
          notes: string | null
          phone_emergency: string | null
          phone_primary: string
          preferred_payment: string[] | null
          rates_consultation: number | null
          rates_emergency: number | null
          rating: number | null
          service_types: string[] | null
          specialization: string | null
          travel_radius_km: number | null
          updated_at: string | null
        }
        Insert: {
          address_city: string
          address_country?: string
          address_postal: string
          address_state: string
          address_street: string
          availability_hours?: string | null
          clinic_name: string
          created_at?: string | null
          created_by: string
          email: string
          emergency_available?: boolean | null
          farm_id: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          license_number: string
          name: string
          notes?: string | null
          phone_emergency?: string | null
          phone_primary: string
          preferred_payment?: string[] | null
          rates_consultation?: number | null
          rates_emergency?: number | null
          rating?: number | null
          service_types?: string[] | null
          specialization?: string | null
          travel_radius_km?: number | null
          updated_at?: string | null
        }
        Update: {
          address_city?: string
          address_country?: string
          address_postal?: string
          address_state?: string
          address_street?: string
          availability_hours?: string | null
          clinic_name?: string
          created_at?: string | null
          created_by?: string
          email?: string
          emergency_available?: boolean | null
          farm_id?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          license_number?: string
          name?: string
          notes?: string | null
          phone_emergency?: string | null
          phone_primary?: string
          preferred_payment?: string[] | null
          rates_consultation?: number | null
          rates_emergency?: number | null
          rating?: number | null
          service_types?: string[] | null
          specialization?: string | null
          travel_radius_km?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veterinarians_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      veterinary_visits: {
        Row: {
          actual_cost: number | null
          created_at: string | null
          created_by: string | null
          duration_hours: number | null
          estimated_cost: number | null
          farm_id: string
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          location_details: string | null
          preparation_notes: string | null
          priority_level: string | null
          reminder_days_before: number | null
          scheduled_datetime: string
          send_reminder: boolean | null
          special_instructions: string | null
          status: string | null
          updated_at: string | null
          veterinarian_clinic: string | null
          veterinarian_email: string | null
          veterinarian_name: string
          veterinarian_phone: string | null
          visit_notes: string | null
          visit_purpose: string
          visit_type: string
        }
        Insert: {
          actual_cost?: number | null
          created_at?: string | null
          created_by?: string | null
          duration_hours?: number | null
          estimated_cost?: number | null
          farm_id: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          location_details?: string | null
          preparation_notes?: string | null
          priority_level?: string | null
          reminder_days_before?: number | null
          scheduled_datetime: string
          send_reminder?: boolean | null
          special_instructions?: string | null
          status?: string | null
          updated_at?: string | null
          veterinarian_clinic?: string | null
          veterinarian_email?: string | null
          veterinarian_name: string
          veterinarian_phone?: string | null
          visit_notes?: string | null
          visit_purpose: string
          visit_type: string
        }
        Update: {
          actual_cost?: number | null
          created_at?: string | null
          created_by?: string | null
          duration_hours?: number | null
          estimated_cost?: number | null
          farm_id?: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          location_details?: string | null
          preparation_notes?: string | null
          priority_level?: string | null
          reminder_days_before?: number | null
          scheduled_datetime?: string
          send_reminder?: boolean | null
          special_instructions?: string | null
          status?: string | null
          updated_at?: string | null
          veterinarian_clinic?: string | null
          veterinarian_email?: string | null
          veterinarian_name?: string
          veterinarian_phone?: string | null
          visit_notes?: string | null
          visit_purpose?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "veterinary_visits_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_animals: {
        Row: {
          animal_id: string
          created_at: string | null
          id: string
          visit_id: string
        }
        Insert: {
          animal_id: string
          created_at?: string | null
          id?: string
          visit_id: string
        }
        Update: {
          animal_id?: string
          created_at?: string | null
          id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_animals_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_animals_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_animals_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_animals_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "overdue_follow_ups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_animals_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "upcoming_visits_with_animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_animals_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "veterinary_visits"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      animals_with_parents: {
        Row: {
          animal_source: string | null
          birth_date: string | null
          birth_weight: number | null
          breed: string | null
          created_at: string | null
          current_daily_production: number | null
          days_in_milk: number | null
          expected_calving_date: string | null
          farm_id: string | null
          father_breed: string | null
          father_id: string | null
          father_info: string | null
          father_name: string | null
          father_tag_number: string | null
          gender: string | null
          health_status: string | null
          id: string | null
          lactation_number: number | null
          mother_breed: string | null
          mother_id: string | null
          mother_name: string | null
          mother_production_info: Json | null
          mother_tag_number: string | null
          name: string | null
          notes: string | null
          production_status: string | null
          purchase_date: string | null
          purchase_price: number | null
          seller_info: string | null
          service_date: string | null
          service_method: string | null
          status: string | null
          tag_number: string | null
          updated_at: string | null
          weight: number | null
        }
        Relationships: [
          {
            foreignKeyName: "animals_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_father_id_fkey"
            columns: ["father_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_father_id_fkey"
            columns: ["father_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_father_id_fkey"
            columns: ["father_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
        ]
      }
      available_mothers: {
        Row: {
          birth_date: string | null
          breed: string | null
          current_daily_production: number | null
          farm_id: string | null
          id: string | null
          name: string | null
          production_status: string | null
          tag_number: string | null
        }
        Insert: {
          birth_date?: string | null
          breed?: string | null
          current_daily_production?: number | null
          farm_id?: string | null
          id?: string | null
          name?: string | null
          production_status?: string | null
          tag_number?: string | null
        }
        Update: {
          birth_date?: string | null
          breed?: string | null
          current_daily_production?: number | null
          farm_id?: string | null
          id?: string | null
          name?: string | null
          production_status?: string | null
          tag_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animals_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      overdue_follow_ups: {
        Row: {
          actual_cost: number | null
          animals_involved: Json | null
          created_at: string | null
          created_by: string | null
          duration_hours: number | null
          estimated_cost: number | null
          farm_id: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string | null
          location_details: string | null
          preparation_notes: string | null
          priority_level: string | null
          reminder_days_before: number | null
          scheduled_datetime: string | null
          send_reminder: boolean | null
          special_instructions: string | null
          status: string | null
          updated_at: string | null
          veterinarian_clinic: string | null
          veterinarian_email: string | null
          veterinarian_name: string | null
          veterinarian_phone: string | null
          visit_notes: string | null
          visit_purpose: string | null
          visit_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veterinary_visits_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      upcoming_health_tasks: {
        Row: {
          animal_id: string | null
          animal_name: string | null
          breed: string | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          farm_id: string | null
          id: string | null
          medication: string | null
          next_due_date: string | null
          notes: string | null
          record_date: string | null
          record_type: string | null
          severity: string | null
          tag_number: string | null
          urgency_level: string | null
          veterinarian: string | null
        }
        Relationships: [
          {
            foreignKeyName: "animal_health_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_health_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals_with_parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animal_health_records_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "available_mothers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      upcoming_visits_with_animals: {
        Row: {
          actual_cost: number | null
          animals_involved: Json | null
          created_at: string | null
          created_by: string | null
          duration_hours: number | null
          estimated_cost: number | null
          farm_id: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string | null
          location_details: string | null
          preparation_notes: string | null
          priority_level: string | null
          reminder_days_before: number | null
          scheduled_datetime: string | null
          send_reminder: boolean | null
          special_instructions: string | null
          status: string | null
          updated_at: string | null
          veterinarian_clinic: string | null
          veterinarian_email: string | null
          veterinarian_name: string | null
          veterinarian_phone: string | null
          visit_notes: string | null
          visit_purpose: string | null
          visit_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veterinary_visits_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_animal_age: {
        Args: { birth_date: string }
        Returns: number
      }
      calculate_days_pregnant: {
        Args: { service_date: string }
        Returns: number
      }
      create_missing_user_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          email: string
          created: boolean
        }[]
      }
      get_animals_needing_attention: {
        Args: { farm_id_param: string }
        Returns: {
          animal_id: string
          tag_number: string
          name: string
          attention_type: string
          attention_reason: string
          priority: string
          due_date: string
        }[]
      }
      get_recent_farm_activities: {
        Args: { p_farm_id: string; p_limit?: number }
        Returns: {
          id: string
          type: string
          title: string
          description: string
          activity_timestamp: string
          icon: string
        }[]
      }
      get_team_member_by_identifier: {
        Args: { identifier_value: string; identifier_type?: string }
        Returns: {
          id: string
          farm_id: string
          user_id: string
          pre_generated_user_id: string
          name: string
          email: string
          role: string
          status: string
          farm_name: string
          farm_owner_name: string
        }[]
      }
      get_user_farms: {
        Args: { user_uuid: string }
        Returns: string[]
      }
      get_visit_statistics: {
        Args: { farm_uuid: string }
        Returns: Json
      }
      handle_invitation_acceptance: {
        Args: { user_uuid: string; invitation_token: string }
        Returns: undefined
      }
      has_farm_access: {
        Args: { user_uuid: string; farm_uuid: string }
        Returns: boolean
      }
      is_farm_owner: {
        Args: { user_uuid: string; farm_uuid: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      test_user_profile_creation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      breeding_event_type:
        | "heat_detection"
        | "insemination"
        | "pregnancy_check"
        | "calving"
      calving_outcome: "normal" | "assisted" | "difficult" | "caesarean"
      equipment_status:
        | "operational"
        | "maintenance_due"
        | "in_maintenance"
        | "broken"
        | "retired"
      expense_category:
        | "feed"
        | "veterinary"
        | "labor"
        | "equipment"
        | "utilities"
        | "maintenance"
        | "insurance"
        | "breeding"
        | "supplies"
        | "transportation"
        | "other_expense"
      income_category:
        | "milk_sales"
        | "animal_sales"
        | "breeding_fees"
        | "insurance_claims"
        | "grants"
        | "other_income"
      insemination_method: "artificial_insemination" | "natural_breeding"
      inventory_category:
        | "feed"
        | "medical"
        | "equipment"
        | "supplies"
        | "chemicals"
        | "maintenance"
        | "other"
      invitation_status: "pending" | "accepted" | "declined" | "expired"
      payment_method:
        | "cash"
        | "check"
        | "bank_transfer"
        | "credit_card"
        | "debit_card"
      pregnancy_result: "pregnant" | "not_pregnant" | "uncertain"
      transaction_type: "income" | "expense"
      user_role: "farm_owner" | "farm_manager" | "worker" | "super_admin"
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
      breeding_event_type: [
        "heat_detection",
        "insemination",
        "pregnancy_check",
        "calving",
      ],
      calving_outcome: ["normal", "assisted", "difficult", "caesarean"],
      equipment_status: [
        "operational",
        "maintenance_due",
        "in_maintenance",
        "broken",
        "retired",
      ],
      expense_category: [
        "feed",
        "veterinary",
        "labor",
        "equipment",
        "utilities",
        "maintenance",
        "insurance",
        "breeding",
        "supplies",
        "transportation",
        "other_expense",
      ],
      income_category: [
        "milk_sales",
        "animal_sales",
        "breeding_fees",
        "insurance_claims",
        "grants",
        "other_income",
      ],
      insemination_method: ["artificial_insemination", "natural_breeding"],
      inventory_category: [
        "feed",
        "medical",
        "equipment",
        "supplies",
        "chemicals",
        "maintenance",
        "other",
      ],
      invitation_status: ["pending", "accepted", "declined", "expired"],
      payment_method: [
        "cash",
        "check",
        "bank_transfer",
        "credit_card",
        "debit_card",
      ],
      pregnancy_result: ["pregnant", "not_pregnant", "uncertain"],
      transaction_type: ["income", "expense"],
      user_role: ["farm_owner", "farm_manager", "worker", "super_admin"],
    },
  },
} as const

// ============================================================================
// CONVENIENCE TYPES FOR EASIER DEVELOPMENT
// ============================================================================

// Direct type aliases for easier usage
export type UserRole = Database["public"]["Enums"]["user_role"]
export type InvitationStatus = Database["public"]["Enums"]["invitation_status"]

// Table row types (for reading data)
export type Farm = Tables<"farms">
export type UserRoleRecord = Tables<"user_roles">
export type FarmProfile = Tables<"farm_profiles">
export type Invitation = Tables<"invitations">
export type AdminUser = Tables<"admin_users">
export type Animal = Tables<"animals">
export type AnimalHealthRecord = Tables<"animal_health_records">
export type AnimalProductionRecord = Tables<"animal_production_records">

// Insert types (for creating new records)
export type FarmInsert = TablesInsert<"farms">
export type UserRoleInsert = TablesInsert<"user_roles">
export type FarmProfileInsert = TablesInsert<"farm_profiles">
export type InvitationInsert = TablesInsert<"invitations">
export type AdminUserInsert = TablesInsert<"admin_users">
export type AnimalInsert = TablesInsert<"animals">
export type AnimalHealthRecordInsert = TablesInsert<"animal_health_records">
export type AnimalProductionRecordInsert = TablesInsert<"animal_production_records">

// Update types (for updating existing records)
export type FarmUpdate = TablesUpdate<"farms">
export type UserRoleUpdate = TablesUpdate<"user_roles">
export type FarmProfileUpdate = TablesUpdate<"farm_profiles">
export type InvitationUpdate = TablesUpdate<"invitations">
export type AdminUserUpdate = TablesUpdate<"admin_users">
export type AnimalUpdate = TablesUpdate<"animals">
export type AnimalHealthRecordUpdate = TablesUpdate<"animal_health_records">
export type AnimalProductionRecordUpdate = TablesUpdate<"animal_production_records">

// Extended types for better development experience
export interface UserWithRole {
  id: string
  email: string
  user_metadata: {
    full_name?: string
    avatar_url?: string
  }
  role?: UserRole
  farm_id?: string
  farm_name?: string
}

export interface FarmWithProfile extends Farm {
  profile?: FarmProfile
  member_count?: number
  owner_name?: string
  animal_count?: number
}

export interface AnimalWithRecords extends Animal {
  health_records?: AnimalHealthRecord[]
  production_records?: AnimalProductionRecord[]
  latest_health_record?: AnimalHealthRecord
  latest_production_record?: AnimalProductionRecord
}

export interface InvitationWithFarm extends Invitation {
  farm?: Farm
  inviter_name?: string
}

// Form types for validation
export interface SignUpFormData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  invitationToken?: string
}

export interface SignInFormData {
  email: string
  password: string
}

export interface FarmBasicsFormData {
  farm_name: string
  location: string
  farm_type: 'dairy' | 'beef' | 'mixed' | 'other'
  herd_size: number
}

export interface AnimalFormData {
  tag_number: string
  name?: string
  breed?: string
  gender: 'male' | 'female'
  birth_date?: string
  weight?: number
  notes?: string
}

export interface AnimalHealthFormData {
  record_date: string
  record_type: 'vaccination' | 'treatment' | 'checkup' | 'injury' | 'illness'
  description?: string
  veterinarian?: string
  cost?: number
  notes?: string
}

export interface AnimalProductionFormData {
  record_date: string
  milk_volume?: number
  fat_content?: number
  protein_content?: number
  somatic_cell_count?: number
  notes?: string
}

export interface InvitationFormData {
  email: string
  fullName: string
  role: UserRole
}

export interface OnboardingStepData {
  farm_name?: string
  location?: string
  farm_type?: string
  herd_size?: number
  tracking_features?: string[]
}

// API response types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
  success?: boolean
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  count: number
  page: number
  limit: number
  has_more: boolean
}

// Statistics types
export interface FarmStats {
  total_animals: number
  female_animals: number
  male_animals: number
  active_animals: number
  average_age: number
  total_milk_production: number
  average_milk_per_animal: number
}

export interface AnimalStats {
  total_health_records: number
  total_production_records: number
  average_milk_production: number
  last_health_checkup: string | null
  age_in_days: number
  status: string
}

// Dashboard types
export interface DashboardData {
  farm: FarmWithProfile
  animals: Animal[]
  recent_activities: any[]
  stats: FarmStats
  team_members: UserWithRole[]
}

// Database function types (based on your generated types)
export type CreateMissingUserProfilesFunction = Database["public"]["Functions"]["create_missing_user_profiles"]
export type GetTeamMemberByIdentifierFunction = Database["public"]["Functions"]["get_team_member_by_identifier"]
export type GetUserFarmsFunction = Database["public"]["Functions"]["get_user_farms"]
export type HandleInvitationAcceptanceFunction = Database["public"]["Functions"]["handle_invitation_acceptance"]
export type HasFarmAccessFunction = Database["public"]["Functions"]["has_farm_access"]
export type IsFarmOwnerFunction = Database["public"]["Functions"]["is_farm_owner"]
export type IsSuperAdminFunction = Database["public"]["Functions"]["is_super_admin"]
export type TestUserProfileCreationFunction = Database["public"]["Functions"]["test_user_profile_creation"]

// Enum type guards
export const isValidUserRole = (role: string): role is UserRole => {
  return Constants.public.Enums.user_role.includes(role as UserRole)
}

export const isValidInvitationStatus = (status: string): status is InvitationStatus => {
  return Constants.public.Enums.invitation_status.includes(status as InvitationStatus)
}

// Health record types
export type HealthRecordType = 'vaccination' | 'treatment' | 'checkup' | 'injury' | 'illness'
export const HEALTH_RECORD_TYPES: HealthRecordType[] = ['vaccination', 'treatment', 'checkup', 'injury', 'illness']

// Animal gender and status types
export type AnimalGender = 'male' | 'female'
export type AnimalStatus = 'active' | 'sold' | 'deceased' | 'dry'
export const ANIMAL_GENDERS: AnimalGender[] = ['male', 'female']
export const ANIMAL_STATUSES: AnimalStatus[] = ['active', 'sold', 'deceased', 'dry']

// Farm types
export type FarmType = 'dairy' | 'beef' | 'mixed' | 'other'
export const FARM_TYPES: FarmType[] = ['dairy', 'beef', 'mixed', 'other']
