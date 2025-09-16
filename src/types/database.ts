// src/types/database.ts - Complete Type Definitions
export type UserRole = 'farm_owner' | 'farm_manager' | 'worker' | 'super_admin'
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired'
export type AnimalStatus = 'active' | 'sold' | 'deceased' | 'dry'
export type AnimalGender = 'male' | 'female'
export type AnimalSource = 'newborn_calf' | 'purchased_animal'
export type ProductionStatus = 'calf' | 'heifer' | 'served' | 'lactating' | 'dry'
export type HealthStatus = 'healthy' | 'sick' | 'requires_attention' | 'quarantined'
export type ServiceMethod = 'artificial_insemination' | 'natural_breeding'

// Base Animal interface - Updated to match Supabase null types
export interface Animal {
  id: string
  farm_id: string
  tag_number: string
  name: string | null  // Changed from string | undefined to string | null
  breed: string | null // Changed from string | undefined to string | null
  gender: AnimalGender
  birth_date: string | null // Changed from string | undefined to string | null
  weight: number | null // Changed from number | undefined to number | null
  status: AnimalStatus
  notes: string | null // Changed from string | undefined to string | null
  created_at: string
  updated_at: string
  animal_source: AnimalSource
  mother_id: string | null // Changed from string | undefined to string | null
  father_id: string | null // Changed from string | undefined to string | null
  purchase_date: string | null // Changed from string | undefined to string | null
  health_status: HealthStatus | null // Changed from HealthStatus | undefined to HealthStatus | null
  production_status: ProductionStatus | null // Changed from ProductionStatus | undefined to ProductionStatus | null
  service_date: string | null // Changed from string | undefined to string | null
  service_method: ServiceMethod | null // Changed from ServiceMethod | undefined to ServiceMethod | null
  expected_calving_date: string | null // Changed from string | undefined to string | null
  current_daily_production: number | null // Changed from number | undefined to number | null
  days_in_milk: number | null // Changed from number | undefined to number | null
  lactation_number: number | null // Changed from number | undefined to number | null
  mother_production_info: {
    daily_production?: number
    lactation_number?: number
    peak_production?: number
  } | null // Changed from undefined to null

  // Purchase-specific fields
  purchase_price: number | null // Changed from number | undefined to number | null
  seller_info: string | null // Changed from string | undefined to string | null

  // Birth-specific fields
  father_info: string | null // Changed from string | undefined to string | null
  birth_weight: number | null // Changed from number | undefined to number | null

  // Relations (for joined queries)
  mother?: {
    id: string
    tag_number: string
    name: string | null // Changed from string | undefined to string | null
    breed: string | null // Added breed field
  }
  father?: {
    id: string
    tag_number: string
    name: string | null // Changed from string | undefined to string | null
    breed: string | null // Added breed field
  }
  requires_health_record?: boolean
  health_record_created?: boolean
  auto_health_record_id?: string | null
  health_record_completed?: boolean
  health_concern_notes?: string | null
}

// Form data types for the new animal forms
export interface NewbornCalfFormData {
  tag_number: string
  name?: string
  breed: string
  gender: AnimalGender
  birth_date: string
  mother_id: string
  father_info?: string
  health_status: HealthStatus
  birth_weight?: number
  notes?: string
}

export interface PurchasedAnimalFormData {
  tag_number: string
  name?: string
  breed: string
  gender: AnimalGender
  birth_date?: string
  purchase_date: string
  health_status: HealthStatus
  production_status: ProductionStatus
  purchase_weight?: number
  purchase_price?: number
  seller_info?: string
  notes?: string

  // Conditional fields based on production status
  mother_daily_production?: number
  mother_lactation_number?: number
  mother_peak_production?: number
  service_date?: string
  service_method?: string
  expected_calving_date?: string
  current_daily_production?: number
  days_in_milk?: number
  lactation_number?: number
}

// Available mother type for form selection
export interface AvailableMother {
  id: string
  tag_number: string
  name: string | null
  breed: string | null
  production_status: string | null
  birth_date: string | null
}

// Add to your types/database.ts file
export interface ReleaseRecord {
  id: string
  animal_id: string
  farm_id: string
  released_by: string
  release_reason: 'sold' | 'died' | 'transferred' | 'culled' | 'other'
  release_date: string
  sale_price?: number
  buyer_info?: string
  death_cause?: string
  transfer_location?: string
  notes: string
  animal_data: any // Complete animal data at time of release
  created_at: string
}

export interface ReleaseFormData {
  release_reason: 'sold' | 'died' | 'transferred' | 'culled' | 'other'
  release_date: string
  sale_price?: number
  buyer_info?: string
  death_cause?: string
  transfer_location?: string
  notes: string
}

// Farm interfaces
export interface Farm {
  id: string
  name: string
  location?: string
  farm_type?: string
  created_at: string
  updated_at: string
}

export interface UserRole_Table {
  id: string
  user_id: string
  farm_id?: string
  role_type: UserRole
  status: string
  created_at: string
}

export interface FarmProfile {
  id: string
  user_id: string
  farm_id?: string
  farm_name?: string
  location?: string
  herd_size?: number
  onboarding_completed: boolean
  completion_percentage: number
  created_at: string
  updated_at: string
}

export interface Invitation {
  id: string
  token: string
  farm_id?: string
  email: string
  role_type: UserRole
  invited_by: string
  status: InvitationStatus
  expires_at: string
  created_at: string
}

// Health record interfaces
export interface HealthRecord {
  id: string
  animal_id: string
  record_date: string
  record_type: 'vaccination' | 'treatment' | 'checkup' | 'injury' | 'illness'
  description?: string
  veterinarian?: string
  cost?: number
  notes?: string
  created_at: string

  is_auto_generated?: boolean
  completion_status?: HealthRecordCompletionStatus
  symptoms?: string | null
  treatment?: string | null
  medication?: string | null
  severity?: SeverityLevel | null
  next_due_date?: string | null
  original_record_id?: string | null
  follow_up_status?: FollowUpStatus
  treatment_effectiveness?: TreatmentEffectiveness
  is_follow_up?: boolean
  is_resolved?: boolean
  resolved_date?: string | null
}

// Production record interfaces
export interface ProductionRecord {
  id: string
  animal_id: string
  record_date: string
  milk_volume?: number
  fat_content?: number
  protein_content?: number
  somatic_cell_count?: number
  notes?: string
  created_at: string
}

// Breeding-related interfaces
export interface BreedingRecord {
  id: string
  animal_id: string
  farm_id: string
  breeding_type: 'natural' | 'artificial_insemination' | 'embryo_transfer'
  breeding_date: string
  sire_id?: string
  sire_name?: string
  sire_breed?: string
  sire_registration_number?: string
  technician_name?: string
  notes?: string
  cost?: number
  success_rate?: number
  created_at: string
  updated_at: string
}

export interface PregnancyRecord {
  id: string
  breeding_record_id: string
  animal_id: string
  farm_id: string
  pregnancy_status: 'suspected' | 'confirmed' | 'false' | 'aborted' | 'completed'
  confirmed_date?: string
  confirmation_method?: 'ultrasound' | 'blood_test' | 'rectal_palpation' | 'visual'
  expected_calving_date?: string
  actual_calving_date?: string
  gestation_length?: number
  pregnancy_notes?: string
  veterinarian?: string
  created_at: string
  updated_at: string
}

export interface CalvingRecord {
  id: string
  pregnancy_record_id: string
  mother_id: string
  farm_id: string
  calving_date: string
  calving_time?: string
  calving_difficulty: 'easy' | 'normal' | 'difficult' | 'assisted' | 'cesarean'
  assistance_required: boolean
  veterinarian?: string
  complications?: string
  birth_weight?: number
  calf_gender?: 'male' | 'female'
  calf_alive: boolean
  calf_health_status: 'healthy' | 'weak' | 'sick' | 'deceased'
  colostrum_quality?: 'excellent' | 'good' | 'fair' | 'poor'
  notes?: string
  created_at: string
  updated_at: string
}

export interface CalfRecord {
  id: string
  calving_record_id: string
  animal_id?: string
  farm_id: string
  temporary_id?: string
  birth_date: string
  gender: 'male' | 'female'
  birth_weight?: number
  breed?: string
  sire_info?: string
  dam_id: string
  health_status: string
  weaning_date?: string
  weaning_weight?: number
  registration_number?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface BreedingCalendarEvent {
  id: string
  farm_id: string
  animal_id: string
  event_type: 'heat_expected' | 'breeding_planned' | 'pregnancy_check' | 'calving_expected' | 'dry_off' | 'rebreeding'
  scheduled_date: string
  status: 'scheduled' | 'completed' | 'missed' | 'rescheduled'
  notes?: string
  reminder_sent: boolean
  created_at: string
}

// Extended Animal type with breeding info
export interface AnimalWithBreeding extends Animal {
  current_pregnancy?: PregnancyRecord
  last_breeding?: BreedingRecord
  breeding_status: 'open' | 'bred' | 'confirmed_pregnant' | 'dry' | 'calved'
  days_since_calving?: number
  days_pregnant?: number

}

// Extended Animal type with health info
export interface AnimalWithHealth extends Animal {
  recent_health_records?: HealthRecord[]
  last_checkup?: HealthRecord
  vaccination_status?: 'up_to_date' | 'due' | 'overdue'
  health_alerts?: string[]
}

// Extended Animal type with production info
export interface AnimalWithProduction extends Animal {
  recent_production?: ProductionRecord[]
  average_daily_production?: number
  last_production_date?: string
  production_trend?: 'increasing' | 'stable' | 'decreasing'
}

// Complete Animal type with all related data
export interface AnimalComplete extends Animal {
  // Breeding info
  current_pregnancy?: PregnancyRecord
  last_breeding?: BreedingRecord
  breeding_status: 'open' | 'bred' | 'confirmed_pregnant' | 'dry' | 'calved'
  days_since_calving?: number
  days_pregnant?: number


  // Health info
  recent_health_records?: HealthRecord[]
  last_checkup?: HealthRecord
  vaccination_status?: 'up_to_date' | 'due' | 'overdue'
  health_alerts?: string[]

  // Production info
  recent_production?: ProductionRecord[]
  average_daily_production?: number
  last_production_date?: string
  production_trend?: 'increasing' | 'stable' | 'decreasing'
}

// Supabase Auth User type extension
export interface User {
  id: string
  email?: string
  user_metadata: {
    full_name?: string
    avatar_url?: string
  }
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  count: number
  page: number
  limit: number
}

// Form data types
export interface SignUpData {
  email: string
  password: string
  fullName: string
  invitationToken?: string
}

export interface SignInData {
  email: string
  password: string
}

export interface FarmBasicsData {
  farm_name: string
  location: string
  farm_type: 'dairy' | 'beef' | 'mixed' | 'other'
  herd_size: number
}

export interface AnimalFormData {
  tag_number: string
  name?: string
  breed?: string
  gender: AnimalGender
  birth_date?: string
  weight?: number
  notes?: string
}

export interface BreedingFormData {
  animal_id: string
  breeding_type: 'natural' | 'artificial_insemination' | 'embryo_transfer'
  breeding_date: string
  sire_id?: string
  sire_name?: string
  sire_breed?: string
  sire_registration_number?: string
  technician_name?: string
  cost?: number
  success_rate?: number
  notes?: string
}

export interface PregnancyCheckData {
  breeding_record_id: string
  animal_id: string
  farm_id: string
  pregnancy_status: 'suspected' | 'confirmed' | 'false' | 'aborted'
  confirmed_date?: string
  confirmation_method?: 'ultrasound' | 'blood_test' | 'rectal_palpation' | 'visual'
  expected_calving_date?: string
  pregnancy_notes?: string
  veterinarian?: string
}

export interface HealthRecordFormData {
  animal_id: string
  record_date: string
  record_type: 'vaccination' | 'treatment' | 'checkup' | 'injury' | 'illness'
  description?: string
  veterinarian?: string
  cost?: number
  notes?: string
}

export interface ProductionRecordFormData {
  animal_id: string
  record_date: string
  milk_volume?: number
  fat_content?: number
  protein_content?: number
  somatic_cell_count?: number
  notes?: string
}

// Database operation types
export type FarmProfileUpdate = Partial<Omit<FarmProfile, 'id' | 'created_at' | 'updated_at'>>
export type FarmUpdate = Partial<Omit<Farm, 'id' | 'created_at' | 'updated_at'>>
export type AnimalInsert = Omit<Animal, 'id' | 'created_at' | 'updated_at'>
export type AnimalUpdate = Partial<Omit<Animal, 'id' | 'farm_id' | 'created_at' | 'updated_at'>>
export type BreedingRecordInsert = Omit<BreedingRecord, 'id' | 'created_at' | 'updated_at'>
export type PregnancyRecordInsert = Omit<PregnancyRecord, 'id' | 'created_at' | 'updated_at'>
export type HealthRecordInsert = Omit<HealthRecord, 'id' | 'created_at'>
export type ProductionRecordInsert = Omit<ProductionRecord, 'id' | 'created_at'>
export type InvitationInsert = Omit<Invitation, 'id' | 'created_at'>
export type UserRoleInsert = Omit<UserRole_Table, 'id' | 'created_at'>

// Dashboard stats types
export interface AnimalStats {
  total: number
  female: number
  male: number
  bySource: {
    newborn_calves: number
    purchased: number
  }
  byProduction: {
    calves: number
    heifers: number
    served: number
    lactating: number
    dry: number
  }
  byHealth: {
    healthy: number
    needsAttention: number
  }
  averageAge?: number
  averageProduction?: number

}

export interface TeamStats {
  total: number
  pending: number
  owners: number
  managers: number
  workers: number
}

export interface BreedingStats {
  totalBreedings: number
  currentPregnant: number
  expectedCalvingsThisMonth: number
  conceptionRate: number
}

export interface ProductionStats {
  dailyAverage: number
  monthlyTotal: number
  averagePerCow: number
  topProducers: AnimalWithProduction[]
}

// export interface HealthStats {
//   healthyAnimals: number
//   animalsNeedingAttention: number
//   upcomingVaccinations: number
//   recentTreatments: number
// }

// Report types
export interface ProductionReport {
  farmId: string
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  startDate: string
  endDate: string
  totalProduction: number
  averagePerAnimal: number
  topPerformers: AnimalWithProduction[]
  trends: {
    date: string
    production: number
  }[]
}

export interface BreedingReport {
  farmId: string
  period: 'monthly' | 'yearly'
  totalBreedings: number
  conceptionRate: number
  pregnantAnimals: number
  expectedCalvings: {
    date: string
    count: number
  }[]
}

export interface HealthReport {
  farmId: string
  period: 'monthly' | 'yearly'
  totalTreatments: number
  vaccinationCompliance: number
  commonIssues: {
    type: string
    count: number
  }[]
  healthTrends: {
    date: string
    healthyCount: number
    sickCount: number
  }[]
}

// Error types
export interface DatabaseError {
  message: string
  code?: string
  details?: string
}

export interface ValidationError {
  field: string
  message: string
}

// Utility types
export type SortDirection = 'asc' | 'desc'
export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in'

export interface SortConfig {
  field: string
  direction: SortDirection
}

export interface FilterConfig {
  field: string
  operator: FilterOperator
  value: any
}

export interface PaginationConfig {
  page: number
  limit: number
  total?: number
}

// Permission types
export type Permission =
  | 'manage_farm'
  | 'manage_team'
  | 'manage_animals'
  | 'manage_breeding'
  | 'manage_health'
  | 'manage_production'
  | 'view_reports'
  | 'export_data'
  | 'system_admin'

export interface RolePermissions {
  [key: string]: Permission[]
}

// Notification types
export interface Notification {
  id: string
  user_id: string
  farm_id: string
  type: 'breeding_reminder' | 'health_alert' | 'production_alert' | 'team_invitation' | 'system_update'
  title: string
  message: string
  read: boolean
  action_url?: string
  created_at: string
}

// Calendar event types
export interface CalendarEvent {
  id: string
  title: string
  date: string
  type: 'breeding' | 'health' | 'production' | 'general'
  animal_id?: string
  description?: string
  status: 'scheduled' | 'completed' | 'missed'
}

export type InventoryCategory = 'feed' | 'medical' | 'equipment' | 'supplies' | 'chemicals' | 'maintenance' | 'other'
export type EquipmentStatus = 'operational' | 'maintenance_due' | 'in_maintenance' | 'broken' | 'retired'

export interface Supplier {
  id: string
  farm_id: string
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  supplier_type?: string
  payment_terms?: string
  notes?: string
  status: string
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: string
  farm_id: string
  name: string
  description?: string
  category: InventoryCategory
  sku?: string
  unit_of_measure: string
  current_stock: number
  minimum_stock: number
  maximum_stock?: number
  unit_cost?: number
  supplier_id?: string
  storage_location?: string
  expiry_date?: string
  notes?: string
  status: string
  created_at: string
  updated_at: string
  supplier?: Supplier
}

export interface InventoryTransaction {
  id: string
  farm_id: string
  inventory_item_id: string
  transaction_type: 'in' | 'out' | 'adjustment'
  quantity: number
  unit_cost?: number
  total_cost?: number
  reference_type?: string
  reference_id?: string
  transaction_date: string
  performed_by?: string
  notes?: string
  created_at: string
  inventory_item?: InventoryItem
}

export interface Equipment {
  id: string
  farm_id: string
  name: string
  description?: string
  equipment_type: string
  brand?: string
  model?: string
  serial_number?: string
  purchase_date?: string
  purchase_cost?: number
  supplier_id?: string
  warranty_expiry?: string
  status: EquipmentStatus
  location?: string
  notes?: string
  created_at: string
  updated_at: string
  supplier?: Supplier
}

export interface EquipmentMaintenance {
  id: string
  equipment_id: string
  maintenance_type: 'scheduled' | 'repair' | 'inspection'
  description: string
  maintenance_date: string
  next_maintenance_date?: string
  cost?: number
  performed_by?: string
  supplier_id?: string
  parts_used?: string
  labor_hours?: number
  notes?: string
  status: string
  created_at: string
  equipment?: Equipment
  supplier?: Supplier
}

export interface PurchaseOrder {
  id: string
  farm_id: string
  po_number: string
  supplier_id: string
  order_date: string
  expected_delivery_date?: string
  actual_delivery_date?: string
  total_amount?: number
  status: 'draft' | 'sent' | 'confirmed' | 'delivered' | 'cancelled'
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  supplier?: Supplier
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  inventory_item_id?: string
  description: string
  quantity: number
  unit_cost: number
  total_cost: number
  received_quantity: number
  created_at: string
  inventory_item?: InventoryItem
}



// Health-specific types
export type HealthRecordType = 'vaccination' | 'treatment' | 'checkup' | 'injury' | 'illness'
export type VaccineType = 'core' | 'risk_based' | 'elective'
export type AdministrationRoute = 'intramuscular' | 'subcutaneous' | 'intranasal' | 'oral'
export type VisitType = 'routine_checkup' | 'vaccination' | 'emergency' | 'consultation' | 'breeding' | 'other'
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent'
export type VisitStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'
export type OutbreakStatus = 'active' | 'contained' | 'resolved'
export type ProtocolType = 'vaccination' | 'treatment' | 'checkup' | 'breeding' | 'nutrition'
export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time'
export type TargetAnimals = 'all' | 'group' | 'individual'
export type AnimalHealthStatus = 'infected' | 'recovered' | 'deceased'


// Updated to include new health record types
export interface AnimalHealthRecord {
  id: string
  animal_id: string
  record_date: string
  record_type: HealthRecordType
  description: string
  veterinarian?: string
  cost?: number
  notes?: string
  created_at: string
  // Navigation properties
  animals?: Animal
}

export interface AnimalProductionRecord {
  id: string
  animal_id: string
  record_date: string
  milk_volume?: number
  fat_content?: number
  protein_content?: number
  somatic_cell_count?: number
  notes?: string
  created_at: string
  // Navigation properties
  animals?: Animal
}

// ============================================================================
// NEW HEALTH MANAGEMENT TABLES
// ============================================================================

export interface VeterinaryVisit {
  id: string
  farm_id: string
  visit_type: VisitType
  visit_purpose: string
  scheduled_datetime: string
  duration_hours?: number
  veterinarian_name: string
  veterinarian_clinic?: string
  veterinarian_phone?: string
  veterinarian_email?: string
  priority_level: PriorityLevel
  location_details?: string
  special_instructions?: string
  estimated_cost?: number
  actual_cost?: number
  status: VisitStatus
  preparation_notes?: string
  visit_notes?: string
  follow_up_required: boolean
  follow_up_date?: string
  send_reminder: boolean
  reminder_days_before: number
  created_at: string
  updated_at: string
  // Navigation properties
  visit_animals?: VisitAnimal[]
  animals_treated?: Animal[]
  veterinarian?: Veterinarian
}
export interface VisitAnimal {
  id: string
  visit_id: string
  animal_id: string
  // Navigation properties
  veterinary_visits?: VeterinaryVisit
  animals?: Animal
}

export interface Vaccination {
  id: string
  farm_id: string
  vaccine_name: string
  vaccine_type: VaccineType
  manufacturer?: string
  batch_number?: string
  vaccination_date: string
  next_due_date?: string
  route_of_administration: AdministrationRoute
  dosage: string
  vaccination_site?: string
  veterinarian?: string
  cost_per_dose?: number
  total_cost?: number
  side_effects?: string
  notes?: string
  create_reminder: boolean
  created_at: string
  updated_at: string
  // Navigation properties
  vaccination_animals?: VaccinationAnimal[]
  animals_vaccinated?: Animal[]
}

export interface VaccinationAnimal {
  id: string
  vaccination_id: string
  animal_id: string
  // Navigation properties
  vaccinations?: Vaccination
  animals?: Animal
}

export interface DiseaseOutbreak {
  id: string
  farm_id: string
  outbreak_name: string
  disease_type: string
  severity_level: SeverityLevel
  first_detected_date: string
  description: string
  symptoms: string
  quarantine_required: boolean
  quarantine_area?: string
  treatment_protocol?: string
  veterinarian?: string
  estimated_duration?: number
  actual_duration?: number
  preventive_measures?: string
  status: OutbreakStatus
  resolved_date?: string
  notes?: string
  created_at: string
  updated_at: string
  // Navigation properties
  outbreak_animals?: OutbreakAnimal[]
  affected_animals?: Animal[]
}

export interface OutbreakAnimal {
  id: string
  outbreak_id: string
  animal_id: string
  infection_date?: string
  recovery_date?: string
  status: AnimalHealthStatus
  // Navigation properties
  disease_outbreaks?: DiseaseOutbreak
  animals?: Animal
}
export interface HealthProtocol {
  id: string
  farm_id: string
  protocol_name: string
  protocol_type: ProtocolType
  description: string
  frequency_type: FrequencyType
  frequency_value: number
  start_date: string
  end_date?: string
  target_animals: TargetAnimals
  veterinarian?: string
  estimated_cost?: number
  notes?: string
  auto_create_records: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  // Navigation properties
  protocol_animals?: ProtocolAnimal[]
  target_animal_list?: Animal[]
}

export interface ProtocolAnimal {
  id: string
  protocol_id: string
  animal_id: string
  // Navigation properties
  health_protocols?: HealthProtocol
  animals?: Animal
}

export interface Veterinarian {
  id: string
  farm_id: string
  name: string
  practice_name?: string
  phone?: string
  email?: string
  address?: string
  specialization?: string
  license_number?: string
  is_primary: boolean
  created_at: string
  // Navigation properties
  veterinary_visits?: VeterinaryVisit[]
}

// ============================================================================
// INSERT TYPES (for creating new records)
// ============================================================================

export interface VeterinaryVisitInsert {
  farm_id: string
  visit_type: VisitType
  visit_purpose: string
  scheduled_datetime: string
  duration_hours?: number
  veterinarian_name: string
  veterinarian_clinic?: string
  veterinarian_phone?: string
  veterinarian_email?: string
  priority_level: PriorityLevel
  location_details?: string
  special_instructions?: string
  estimated_cost?: number
  preparation_notes?: string
  send_reminder?: boolean
  reminder_days_before?: number
}

export interface VaccinationInsert {
  farm_id: string
  vaccine_name: string
  vaccine_type: VaccineType
  manufacturer?: string
  batch_number?: string
  vaccination_date: string
  next_due_date?: string
  route_of_administration: AdministrationRoute
  dosage: string
  vaccination_site?: string
  veterinarian?: string
  cost_per_dose?: number
  total_cost?: number
  side_effects?: string
  notes?: string
  create_reminder?: boolean
}

export interface DiseaseOutbreakInsert {
  farm_id: string
  outbreak_name: string
  disease_type: string
  severity_level: SeverityLevel
  first_detected_date: string
  description: string
  symptoms: string
  quarantine_required?: boolean
  quarantine_area?: string
  treatment_protocol?: string
  veterinarian?: string
  estimated_duration?: number
  preventive_measures?: string
  notes?: string
}

export interface HealthProtocolInsert {
  farm_id: string
  protocol_name: string
  protocol_type: ProtocolType
  description: string
  frequency_type: FrequencyType
  frequency_value: number
  start_date: string
  end_date?: string
  target_animals: TargetAnimals
  veterinarian?: string
  estimated_cost?: number
  notes?: string
  auto_create_records?: boolean
}

export interface VeterinarianInsert {
  farm_id: string
  name: string
  practice_name?: string
  phone?: string
  email?: string
  address?: string
  specialization?: string
  license_number?: string
  is_primary?: boolean
}

// ============================================================================
// UPDATE TYPES (for updating existing records)
// ============================================================================

export interface VeterinaryVisitUpdate {
  visit_type?: VisitType
  visit_purpose?: string
  scheduled_datetime?: string
  duration_hours?: number
  veterinarian_name?: string
  veterinarian_clinic?: string
  veterinarian_phone?: string
  veterinarian_email?: string
  priority_level?: PriorityLevel
  location_details?: string
  special_instructions?: string
  estimated_cost?: number
  actual_cost?: number
  status?: VisitStatus
  preparation_notes?: string
  visit_notes?: string
  follow_up_required?: boolean
  follow_up_date?: string
  send_reminder?: boolean
  reminder_days_before?: number
}

export interface VaccinationUpdate {
  vaccine_name?: string
  vaccine_type?: VaccineType
  manufacturer?: string
  batch_number?: string
  vaccination_date?: string
  next_due_date?: string
  route_of_administration?: AdministrationRoute
  dosage?: string
  vaccination_site?: string
  veterinarian?: string
  cost_per_dose?: number
  total_cost?: number
  side_effects?: string
  notes?: string
  create_reminder?: boolean
}

export interface DiseaseOutbreakUpdate {
  outbreak_name?: string
  disease_type?: string
  severity_level?: SeverityLevel
  description?: string
  symptoms?: string
  quarantine_required?: boolean
  quarantine_area?: string
  treatment_protocol?: string
  veterinarian?: string
  estimated_duration?: number
  actual_duration?: number
  preventive_measures?: string
  status?: OutbreakStatus
  resolved_date?: string
  notes?: string
}

export interface HealthProtocolUpdate {
  protocol_name?: string
  protocol_type?: ProtocolType
  description?: string
  frequency_type?: FrequencyType
  frequency_value?: number
  start_date?: string
  end_date?: string
  target_animals?: TargetAnimals
  veterinarian?: string
  estimated_cost?: number
  notes?: string
  auto_create_records?: boolean
  is_active?: boolean
}

// ============================================================================
// COMPLEX TYPES FOR API RESPONSES
// ============================================================================

export interface VeterinaryVisitWithAnimals extends VeterinaryVisit {
  animals_involved: Animal[]
  veterinarian_info?: Veterinarian
}

export interface VaccinationWithAnimals extends Vaccination {
  vaccinated_animals: Animal[]
}

export interface OutbreakWithAnimals extends DiseaseOutbreak {
  affected_animals: (Animal & {
    infection_date?: string
    recovery_date?: string
    outbreak_status: AnimalHealthStatus
  })[]
}

export interface ProtocolWithAnimals extends HealthProtocol {
  target_animal_list: Animal[]
}

// ============================================================================
// HEALTH DASHBOARD TYPES
// ============================================================================

export interface HealthStats {
  totalHealthRecords: number
  veterinariansRegistered: number
  protocolsRecorded: number
  outbreaksReported: number
  vaccinationsAdministered: number
  upcomingTasks: number
  incompleteRecords: number
  autoGeneratedRecords: number
  overdueFollowUps: number
  resolvedIssues: number
  animalsNeedingAttention: number
  // overdueCount: number
  // recentRecords: number
  // vaccinationsDue: number
  // activeOutbreaks: number
  // scheduledVisits: number
  // activeProtocols: number
}

export interface UpcomingTask {
  id: string
  type: 'vaccination' | 'visit' | 'protocol' | 'followup'
  title: string
  description: string
  due_date: string
  priority: PriorityLevel
  animal_id?: string
  animal_name?: string
  animal_tag?: string
  is_overdue: boolean
  days_until_due: number
}

export interface HealthSummary {
  animal_id: string
  animal_name?: string
  animal_tag: string
  last_checkup?: string
  last_vaccination?: string
  health_score: 'excellent' | 'good' | 'fair' | 'poor'
  active_treatments: number
  upcoming_tasks: number
  overdue_items: number
}

// ============================================================================
// FORM DATA TYPES (for your modals)
// ============================================================================

export interface ScheduleVisitFormData {
  visit_type: VisitType
  visit_purpose: string
  scheduled_date: string
  scheduled_time: string
  duration_hours: number
  veterinarian_name: string
  veterinarian_clinic?: string
  veterinarian_phone?: string
  veterinarian_email?: string
  priority_level: PriorityLevel
  animals_involved?: string[]
  location_details?: string
  special_instructions?: string
  estimated_cost?: number
  preparation_notes?: string
  send_reminder: boolean
  reminder_days_before: number
}

export interface VaccinationFormData {
  vaccine_name: string
  vaccine_type: VaccineType
  manufacturer?: string
  batch_number?: string
  vaccination_date: string
  next_due_date?: string
  route_of_administration: AdministrationRoute
  dosage: string
  vaccination_site?: string
  selected_animals: string[]
  veterinarian?: string
  cost_per_dose?: number
  total_cost?: number
  side_effects?: string
  notes?: string
  create_reminder: boolean
}

export interface OutbreakFormData {
  outbreak_name: string
  disease_type: string
  severity_level: SeverityLevel
  first_detected_date: string
  description: string
  symptoms: string
  affected_animals: string[]
  quarantine_required: boolean
  quarantine_area?: string
  treatment_protocol?: string
  veterinarian?: string
  estimated_duration?: number
  preventive_measures?: string
  notes?: string
}

export interface ProtocolFormData {
  protocol_name: string
  protocol_type: ProtocolType
  description: string
  frequency_type: FrequencyType
  frequency_value: number
  start_date: string
  end_date?: string
  target_animals: TargetAnimals
  animal_groups?: string[]
  individual_animals?: string[]
  veterinarian?: string
  estimated_cost?: number
  notes?: string
  auto_create_records: boolean
}
// Add these type definitions to your existing src/types/database.ts file

// ============================================================================
// HEALTH TRACKING ENHANCEMENTS (Add to existing type definitions)
// ============================================================================

// Add these new enum types near your other type definitions
export type HealthRecordCompletionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type FollowUpStatus = 'improving' | 'stable' | 'worsening' | 'resolved'
export type TreatmentEffectiveness = 'very_effective' | 'effective' | 'somewhat_effective' | 'not_effective'

// ============================================================================
// ENHANCED ANIMAL INTERFACE - Add these properties to your existing Animal interface
// ============================================================================

// Add these optional properties to your existing Animal interface:
/*
  // Health tracking fields (add these to your Animal interface)
  requires_health_record?: boolean
  health_record_created?: boolean
  auto_health_record_id?: string | null
  health_record_completed?: boolean
  health_concern_notes?: string | null
*/

// ============================================================================
// ENHANCED HEALTH RECORD INTERFACE - Add these to your AnimalHealthRecord
// ============================================================================

// Add these properties to your existing AnimalHealthRecord interface:
/*
  // Auto-generation and completion tracking
  is_auto_generated?: boolean
  completion_status?: HealthRecordCompletionStatus
  symptoms?: string | null
  treatment?: string | null
  medication?: string | null
  severity?: SeverityLevel | null
  next_due_date?: string | null
  
  // Follow-up tracking
  original_record_id?: string | null
  follow_up_status?: FollowUpStatus
  treatment_effectiveness?: TreatmentEffectiveness
  is_follow_up?: boolean
  is_resolved?: boolean
  resolved_date?: string | null
*/

// ============================================================================
// NEW INTERFACES FOR HEALTH TRACKING
// ============================================================================

export interface HealthRecordFollowUp {
  id: string
  original_record_id: string
  follow_up_record_id: string
  status: FollowUpStatus
  treatment_effectiveness?: TreatmentEffectiveness
  is_resolved: boolean
  created_at: string
  updated_at: string

  // Navigation properties
  original_record?: AnimalHealthRecord
  follow_up_record?: AnimalHealthRecord
}

export interface IncompleteHealthRecord {
  id: string
  animal_id: string
  record_date: string
  record_type: HealthRecordType
  description: string
  severity: SeverityLevel
  created_at: string
  is_auto_generated: boolean
  completion_status: HealthRecordCompletionStatus

  // Animal information
  animal: {
    id: string
    tag_number: string
    name?: string
    breed?: string
  }
}

export interface HealthAlert {
  type: 'incomplete_records' | 'overdue_followups' | 'missing_records' | 'health_concerns'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  count: number
  message: string
  records?: IncompleteHealthRecord[]
  animals?: Animal[]
}

export interface AnimalHealthSummary {
  animal_id: string
  animal_name?: string
  animal_tag: string
  health_status: HealthStatus
  requires_health_record: boolean
  health_record_created: boolean
  health_record_completed: boolean
  auto_health_record_id?: string
  last_health_record_date?: string
  pending_follow_ups: number
  overdue_tasks: number
  health_concern_notes?: string
}

export interface FarmHealthOverview {
  total_animals: number
  animals_needing_health_records: number
  incomplete_health_records: number
  overdue_follow_ups: number
  animals_with_health_concerns: number
  recent_health_alerts: HealthAlert[]
  health_completion_rate: number
}

export interface HealthTrackingStats {
  totalAnimalsNeedingRecords: number
  animalsWithPendingRecords: number
  animalsWithCompletedRecords: number
  autoGeneratedRecords: number
  incompleteRecords: number
}

// ============================================================================
// API RESPONSE TYPES FOR HEALTH INTEGRATION
// ============================================================================

export interface CreateAnimalResponse {
  success: boolean
  animal: Animal
  healthRecordCreated: boolean
  healthRecord?: AnimalHealthRecord
  requiresHealthDetails: boolean
  message: string
}

// ============================================================================
// FORM DATA TYPES FOR HEALTH COMPLETION
// ============================================================================

export interface CompleteHealthRecordFormData {
  symptoms?: string
  veterinarian?: string
  medication?: string
  treatment?: string
  cost?: number
  next_due_date?: string
  notes?: string
  severity: SeverityLevel
}

export interface FollowUpHealthRecordFormData {
  record_date: string
  follow_up_status: FollowUpStatus
  treatment_effectiveness?: TreatmentEffectiveness
  symptoms?: string
  veterinarian?: string
  medication?: string
  treatment?: string
  cost?: number
  next_due_date?: string
  notes?: string
  severity: SeverityLevel
  is_resolved: boolean
}

// ============================================================================
// ENHANCED INSERT/UPDATE TYPES
// ============================================================================

export interface AutoHealthRecordInsert {
  farm_id: string
  animal_id: string
  record_date: string
  record_type: HealthRecordType
  description: string
  severity: SeverityLevel
  created_by: string
  is_auto_generated: boolean
  completion_status: HealthRecordCompletionStatus
  notes?: string
}

export interface HealthRecordUpdate {
  symptoms?: string | null
  veterinarian?: string | null
  medication?: string | null
  treatment?: string | null
  cost?: number | null
  next_due_date?: string | null
  notes?: string | null
  severity?: SeverityLevel
  completion_status?: HealthRecordCompletionStatus
  is_auto_generated?: boolean
  is_resolved?: boolean
  resolved_date?: string | null
}

export interface FollowUpRecordInsert extends AutoHealthRecordInsert {
  original_record_id: string
  follow_up_status: FollowUpStatus
  treatment_effectiveness?: TreatmentEffectiveness
  is_follow_up: boolean
  is_resolved: boolean
}

// ============================================================================
// ENHANCED HEALTH STATS - Update your existing HealthStats interface
// ============================================================================

// Add these properties to your existing HealthStats interface:
/*
  // Enhanced stats for health tracking
  incompleteRecords: number
  autoGeneratedRecords: number
  overdueFollowUps: number
  resolvedIssues: number
  animalsNeedingAttention: number
*/

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

export interface CompleteHealthRecordModalProps {
  isOpen: boolean
  onClose: () => void
  healthRecord: AnimalHealthRecord
  animal: Animal
  onHealthRecordUpdated: (record: AnimalHealthRecord) => void
}

export interface HealthNotificationBannerProps {
  farmId: string
  onRecordClick?: (recordId: string) => void
  className?: string
}

export interface AddAnimalModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onAnimalAdded: (animal: Animal) => void
  onHealthRecordCreated?: (record: AnimalHealthRecord) => void
}

// ============================================================================
// UTILITY TYPES FOR HEALTH INTEGRATION
// ============================================================================

export type HealthRecordAutoGeneration = {
  shouldCreate: boolean
  recordType: HealthRecordType
  severity: SeverityLevel
  description: string
  reason: string
}

export type HealthStatusMappingType = {
  [K in HealthStatus]: {
    requiresRecord: boolean;
    recordType: HealthRecordType;
    severity: SeverityLevel;
    description: (animalName: string) => string;
  };
};

export interface HealthStatusMapping extends HealthStatusMappingType { }

export type HealthRecordCompleteness = {
  isComplete: boolean
  missingFields: string[]
  completionPercentage: number
  requiredFields: string[]
  optionalFields: string[]
}

// ============================================================================
// DATABASE INTERFACE FOR HEALTH RECORD DATA
// ============================================================================

export interface HealthRecordData {
  animal_id: string
  record_date: string
  record_type: HealthRecordType
  description: string
  veterinarian?: string | null
  cost?: number
  notes?: string | null
  next_due_date?: string | null
  medication?: string | null
  severity?: SeverityLevel | null
  created_by: string
  farm_id: string

  // Enhanced fields
  symptoms?: string | null
  treatment?: string | null
  is_auto_generated?: boolean
  completion_status?: HealthRecordCompletionStatus
}

export interface TaggingSettings {
  method: 'basic' | 'structured' | 'automated'
  tagPrefix: string
  numberingSystem: 'sequential' | 'custom' | 'barcode'
  nextNumber: number
  enablePhotoTags: boolean
  enableColorCoding: boolean
  enableQRCodes: boolean
  enableHierarchicalTags: boolean
  enableBatchTagging: boolean
  enableSmartAlerts: boolean
  enableRFID: boolean
  enableNFC: boolean
  enableGPS: boolean
  enableBiometric: boolean
  qrCodeSize: 'small' | 'medium' | 'large'
  rfidFrequency: '134.2khz' | '125khz' | '13.56mhz'
  gpsUpdateInterval: number
  customAttributes: CustomAttribute[]
  colorCoding: ColorCode[]
  smartAlerts: SmartAlertSettings
}

export interface CustomAttribute {
  id?: string
  name: string
  values: string[]
  required: boolean
  sortOrder: number
  createdAt?: string
  updatedAt?: string
}

export interface ColorCode {
  name: string
  color: string
  value: string
  description?: string
}

export interface SmartAlertSettings {
  healthReminders: boolean
  breedingReminders: boolean
  vaccinationReminders: boolean
  productionAlerts: boolean
}

export interface AnimalTag {
  id: string
  animalId: string
  tagType: 'custom_attribute' | 'color_code' | 'status' | 'system'
  tagKey: string
  tagValue: string
  appliedAt: string
  appliedBy: string
  metadata?: Record<string, any>
}

export interface BatchTagOperation {
  farmId: string
  animalIds: string[]
  tags: TagData[]
  operation: 'add' | 'remove' | 'replace'
  appliedBy: string
}

export interface TagData {
  type: 'custom_attribute' | 'color_code' | 'status' | 'system'
  key: string
  value: string
  display?: string
  color?: string
  metadata?: Record<string, any>
}

export interface TagFilter {
  type?: string
  key?: string
  value?: string
  operator?: 'equals' | 'contains' | 'starts_with' | 'in'
}

export interface TagStatistics {
  totalTaggedAnimals: number
  tagsByType: Record<string, number>
  mostUsedTags: Array<{
    key: string
    value: string
    count: number
    percentage: number
  }>
  recentlyUsedTags: Array<{
    key: string
    value: string
    lastUsed: string
  }>
}

export interface QRCodeOptions {
  size: 'small' | 'medium' | 'large'
  format: 'png' | 'svg' | 'pdf'
  includeText: boolean
  includeAnimalName: boolean
  includeQRBorder: boolean
  margin: number
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'
}

export interface QRCodeData {
  animalId: string
  tagNumber: string
  farmId: string
  timestamp: string
  version: string
  additionalData?: Record<string, any>
}

export interface TagValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

export interface TagGenerationOptions {
  prefix?: string
  numberingSystem?: 'sequential' | 'custom' | 'barcode'
  startingNumber?: number
  paddingLength?: number
  includeChecksum?: boolean
}

export interface RFIDSettings {
  frequency: '134.2khz' | '125khz' | '13.56mhz'
  readRange: number // in meters
  encryptionEnabled: boolean
  batchReadingEnabled: boolean
}

export interface NFCSettings {
  enabled: boolean
  writeProtection: boolean
  customDataFields: string[]
}

export interface GPSSettings {
  enabled: boolean
  updateInterval: number // in minutes
  geofencingEnabled: boolean
  trackingAccuracy: 'high' | 'medium' | 'low'
}

export interface BiometricSettings {
  enabled: boolean
  type: 'facial_recognition' | 'muzzle_print' | 'retinal_scan'
  confidenceThreshold: number
}

export interface TaggingMethod {
  id: 'basic' | 'structured' | 'automated'
  title: string
  description: string
  features: string[]
  recommendedFor: {
    minHerdSize: number
    maxHerdSize: number
    description: string
  }
  requiredFeatures: string[]
  optionalFeatures: string[]
}

export interface TagTemplate {
  id: string
  name: string
  description: string
  tags: TagData[]
  applicableToStatuses: string[]
  createdBy: string
  createdAt: string
}

export interface TagHistory {
  id: string
  animalId: string
  action: 'added' | 'removed' | 'modified'
  tagData: TagData
  previousValue?: string
  performedBy: string
  performedAt: string
  reason?: string
}

export interface AlertRule {
  id: string
  name: string
  description: string
  triggerConditions: {
    tagType?: string
    tagKey?: string
    tagValue?: string
    animalStatus?: string
    daysSinceLastUpdate?: number
  }
  alertType: 'email' | 'sms' | 'push' | 'in_app'
  recipients: string[]
  enabled: boolean
  createdBy: string
  createdAt: string
}

// Database table interfaces matching SQL schema
export interface AnimalTaggingSettingsDB {
  id: string
  farm_id: string
  method: string
  tag_prefix: string
  numbering_system: string
  next_number: number
  enable_photo_tags: boolean
  enable_color_coding: boolean
  enable_qr_codes: boolean
  enable_hierarchical: boolean
  enable_batch_tagging: boolean
  enable_smart_alerts: boolean
  enable_rfid: boolean
  enable_nfc: boolean
  enable_gps: boolean
  enable_biometric: boolean
  qr_code_size: string
  rfid_frequency: string
  gps_update_interval: number
  created_at: string
  updated_at: string
}

export interface CustomAttributeDB {
  id: string
  farm_id: string
  name: string
  values: string[]
  required: boolean
  sort_order: number
  created_at: string
}

export interface AnimalTagDB {
  id: string
  animal_id: string
  tag_type: string
  tag_key: string
  tag_value: string
  applied_at: string
  applied_by: string
}

export interface AnimalQRCodeDB {
  id: string
  animal_id: string
  qr_data: string
  size: string
  generated_at: string
  last_scanned?: string
  scan_count: number
}

// API Response types
export interface TaggingSettingsResponse {
  success: boolean
  settings?: TaggingSettings
  error?: string
}

export interface BatchTagResponse {
  success: boolean
  message?: string
  affectedCount?: number
  tags?: TagData[]
  error?: string
}

export interface QRCodeGenerationResponse {
  success: boolean
  pdfBuffer?: Buffer
  qrCodes?: Array<{
    animalId: string
    tagNumber: string
    qrDataUrl: string
  }>
  error?: string
}

export interface AvailableTagsResponse {
  success: boolean
  availableTags?: TagData[]
  batchTaggingEnabled?: boolean
  error?: string
}