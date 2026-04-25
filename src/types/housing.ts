// Housing Management Types
export type SpecialHousingType = 
  | 'isolation_pen' 
  | 'maternity_pen' 
  | 'dry_cow_pen' 
  | 'calf_housing' 
  | 'quarantine_zone' 
  | 'weighing_zone' 
  | 'treatment_zone'
  | 'regular_housing'
  | 'milking_parlor'

export type AnimalStatus = 'assigned' | 'unassigned' | 'in_transit' | 'temporary'
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'overdue'
export type CleaningStatus = 'pending' | 'in_progress' | 'completed'

// Core Housing Entities
export interface HousingFarm {
  id: string
  farm_id: string
  name: string
  total_capacity: number
  current_occupancy: number
  status: 'active' | 'inactive'
  buildings_count: number
  created_at: string
  updated_at: string
}

export interface HousingBuilding {
  id: string
  farm_id: string
  name: string
  type: string
  total_capacity: number
  current_occupancy: number
  units_count: number
  status: 'active' | 'inactive' | 'maintenance'
  location?: string
  year_built?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface HousingUnit {
  id: string
  building_id: string
  farm_id: string
  name: string
  unit_type: 'section' | 'room' | 'section_area'
  total_capacity: number
  current_occupancy: number
  pens_count: number
  status: 'active' | 'inactive'
  environmental_conditions?: EnvironmentalConditions
  created_at: string
  updated_at: string
}

export interface HousingPen {
  id: string
  unit_id: string
  building_id: string
  farm_id: string
  pen_number: string
  special_type: SpecialHousingType
  capacity: number
  current_occupancy: number
  assigned_animals: string[] // animal IDs
  dimensions?: {
    length_meters: number
    width_meters: number
    height_meters: number
    area_sqm: number
  }
  equipment: string[] // equipment IDs
  status: 'active' | 'cleaning' | 'maintenance' | 'unavailable'
  conditions?: EnvironmentalConditions
  created_at: string
  updated_at: string
}

export interface EnvironmentalConditions {
  ventilation_quality: 'poor' | 'fair' | 'good' | 'excellent'
  lighting_type: 'natural' | 'automated' | 'supplemental' | 'mixed'
  water_access: boolean
  water_quality?: 'poor' | 'fair' | 'good' | 'excellent'
  bedding_type?: string
  drainage: 'poor' | 'fair' | 'good' | 'excellent'
  temperature_range?: { min: number; max: number } // Celsius
  humidity_range?: { min: number; max: number } // Percentage
  ammonia_level?: number
  last_checked?: string
}

// Animal Housing Assignment
export interface AnimalHousingAssignment {
  id: string
  animal_id: string
  pen_id: string
  farm_id: string
  assigned_at: string
  moved_at?: string
  previous_pen_id?: string
  status: AnimalStatus
  reason?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface AnimalMovementLog {
  id: string
  animal_id: string
  from_pen_id: string
  to_pen_id: string
  farm_id: string
  moved_at: string
  moved_by: string // user_id
  reason: string
  notes?: string
}

// Cleaning & Maintenance
export interface CleaningSchedule {
  id: string
  pen_id: string
  farm_id: string
  frequency: 'daily' | 'every_other_day' | 'weekly' | 'biweekly' | 'monthly'
  scheduled_time?: string
  start_date: string
  end_date?: string
  cleaning_type: 'spot_cleaning' | 'partial_clean' | 'deep_clean'
  status: CleaningStatus
  assigned_to?: string // user_id
  created_at: string
  updated_at: string
}

export interface CleaningLog {
  id: string
  pen_id: string
  farm_id: string
  cleaning_type: 'spot_cleaning' | 'partial_clean' | 'deep_clean'
  cleaned_at: string
  cleaned_by: string // user_id
  duration_minutes?: number
  waste_removed_kg?: number
  bedding_replaced: boolean
  notes?: string
  photos?: string[] // image URLs
  created_at: string
  updated_at: string
}

export interface MaintenanceSchedule {
  id: string
  asset_id: string
  asset_type: 'building' | 'unit' | 'pen' | 'equipment'
  farm_id: string
  task_description: string
  maintenance_type: 'preventive' | 'corrective' | 'emergency'
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'annual'
  scheduled_date: string
  status: MaintenanceStatus
  assigned_to?: string // user_id
  estimated_cost?: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
  updated_at: string
}

export interface MaintenanceLog {
  id: string
  asset_id: string
  asset_type: 'building' | 'unit' | 'pen' | 'equipment'
  farm_id: string
  task_description: string
  completed_at: string
  completed_by: string // user_id
  duration_hours?: number
  actual_cost?: number
  parts_replaced?: string[]
  notes?: string
  photos?: string[]
  next_service_date?: string
}

// Milking Facilities
export interface MilkingFacility {
  id: string
  building_id: string
  farm_id: string
  name: string
  parlor_type: 'herringbone' | 'parallel' | 'rotary' | 'carousel'
  milking_units: number
  capacity_per_hour: number // cows per hour
  current_occupancy: number
  status: 'active' | 'inactive' | 'maintenance'
  equipment_ids: string[]
  created_at: string
  updated_at: string
}

export interface MilkingSession {
  id: string
  facility_id: string
  farm_id: string
  started_at: string
  ended_at?: string
  animals_milked: string[] // animal IDs
  total_units_used: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  efficiency_percentage?: number
}

// Feeding Infrastructure
export interface FeedStation {
  id: string
  pen_id: string
  farm_id: string
  station_number: number
  station_type: 'manual' | 'automated' | 'mixed'
  capacity_kg?: number
  current_feed_kg?: number
  feed_type?: string
  automated: boolean
  last_filled?: string
  created_at: string
  updated_at: string
}

export interface AutomatedFeeder {
  id: string
  feed_station_id: string
  farm_id: string
  device_name: string
  capacity_kg: number
  current_fill_kg: number
  dispense_schedule?: string // Cron format
  status: 'operational' | 'idle' | 'offline' | 'maintenance'
  battery_level?: number
  last_dispense?: string
  created_at: string
  updated_at: string
}

export interface FeedingRecord {
  id: string
  pen_id: string
  farm_id: string
  feed_type: string
  quantity_kg: number
  fed_at: string
  fed_by: string // user_id for manual, 'system' for automated
  notes?: string
  created_at: string
  updated_at: string
}

// Water Systems
export interface WaterPoint {
  id: string
  pen_id: string
  farm_id: string
  water_point_type: 'trough' | 'bowl' | 'automatic_drinker' | 'nipple'
  quantity: number
  capacity_per_point_liters?: number
  status: 'operational' | 'offline' | 'maintenance'
  last_cleaned?: string
  last_tested?: string
  created_at: string
  updated_at: string
}

export interface WaterQualityReading {
  id: string
  water_point_id: string
  farm_id: string
  tested_at: string
  tested_by: string
  ph_level?: number
  tds_ppm?: number // Total Dissolved Solids
  turbidity_ntu?: number
  temperature_celsius?: number
  bacterial_count?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface WaterFlowLog {
  id: string
  water_point_id: string
  farm_id: string
  flow_rate_liters_per_min?: number
  recorded_at: string
  status: 'normal' | 'low' | 'high' | 'blocked'
  notes?: string
}

// Equipment Management
export interface HousingEquipment {
  id: string
  pen_id?: string
  building_id?: string
  farm_id: string
  equipment_name: string
  equipment_type: string
  manufacturer?: string
  model?: string
  serial_number?: string
  status: 'operational' | 'offline' | 'maintenance' | 'retired'
  installation_date?: string
  last_service_date?: string
  next_service_due?: string
  created_at: string
  updated_at: string
}

// Analytics & Dashboard Data
export interface HousingAnalytics {
  farm_id: string
  total_capacity: number
  total_occupancy: number
  utilization_percentage: number
  
  by_building: {
    building_id: string
    building_name: string
    occupancy: number
    capacity: number
    utilization_percentage: number
  }[]
  
  by_housing_type: {
    type: SpecialHousingType
    count: number
    occupancy: number
    capacity: number
  }[]
  
  animal_density_per_pen: {
    pen_id: string
    pen_name: string
    animal_count: number
    capacity: number
    density_sqm_per_animal?: number
  }[]
  
  facility_efficiency: {
    cleanliness_score: number // 0-100
    maintenance_compliance: number // 0-100
    equipment_uptime: number // 0-100
    environmental_quality: number // 0-100
  }
  
  disease_vs_housing_correlation?: {
    pen_id: string
    disease_incidents: number
    environmental_risks: string[]
    recommendations: string[]
  }[]
  
  last_updated: string
}

// API Request/Response Types
export interface HousingHierarchyNode {
  id: string
  name: string
  type: 'farm' | 'building' | 'unit' | 'pen'
  capacity: number
  occupancy: number
  children?: HousingHierarchyNode[]
  data?: any
}
