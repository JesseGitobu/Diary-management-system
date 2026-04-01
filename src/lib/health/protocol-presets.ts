/**
 * Health Protocol Type Presets
 * Defines what data each protocol type should collect and how it automates activities
 * This enables intelligent form field configuration and data capture
 */

export type ProtocolTypeKey = 'vaccination' | 'treatment' | 'checkup' | 'breeding' | 'nutrition' | 'deworming_parasites' | 'dehorning' | 'post_mortem'

export interface ProtocolFieldConfig {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multi-select' | 'checkbox' | 'time'
  required: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  step?: number
  helperText?: string
}

export interface ProtocolPreset {
  id: ProtocolTypeKey
  name: string
  description: string
  icon: string
  color: string
  badge_color: string
  
  // Data collection
  fields: ProtocolFieldConfig[]
  
  // Automation settings
  auto_create_health_record: boolean
  default_health_record_type?: 'vaccination' | 'treatment' | 'checkup' | 'injury' | 'illness' | 'reproductive' | 'deworming' | 'dehorning' | 'post_mortem'
  
  // Frequency guidelines
  default_frequency_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time'
  default_frequency_value: number
  
  // Cost tracking
  track_cost: boolean
  
  // Follow-up tracking
  track_follow_up: boolean
  
  // Veterinarian requirement
  require_veterinarian: boolean
  
  // Scheduling
  allow_scheduling: boolean
  
  // Remarks
  additional_config?: {
    [key: string]: any
  }
}

/**
 * Protocol Presets Configuration
 * Each protocol type comes with predefined fields and automation rules
 */
export const PROTOCOL_PRESETS: Record<ProtocolTypeKey, ProtocolPreset> = {
  vaccination: {
    id: 'vaccination',
    name: 'Vaccination',
    description: 'Preventive vaccination programs and immunization schedules',
    icon: '💉',
    color: 'bg-green-100',
    badge_color: 'bg-green-100 text-green-800 border-green-200',
    
    fields: [
      {
        key: 'vaccine_name',
        label: 'Vaccine Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Brucella Vaccine, FMD Vaccine',
        helperText: 'The specific vaccine being administered',
      },
      {
        key: 'vaccine_type',
        label: 'Vaccine Type',
        type: 'select',
        required: true,
        options: [
          { value: 'core', label: 'Core Vaccine (Essential)' },
          { value: 'risk_based', label: 'Risk-Based Vaccine' },
          { value: 'elective', label: 'Elective Vaccine' },
        ],
      },
      {
        key: 'manufacturer',
        label: 'Manufacturer',
        type: 'text',
        required: false,
        placeholder: 'e.g., Boehringer Ingelheim',
      },
      {
        key: 'batch_number',
        label: 'Batch/Lot Number',
        type: 'text',
        required: false,
        placeholder: 'For traceability',
      },
      {
        key: 'route_of_administration',
        label: 'Route of Administration',
        type: 'select',
        required: true,
        options: [
          { value: 'intramuscular', label: 'Intramuscular (IM)' },
          { value: 'subcutaneous', label: 'Subcutaneous (SQ)' },
          { value: 'intranasal', label: 'Intranasal' },
          { value: 'oral', label: 'Oral' },
        ],
      },
      {
        key: 'dosage',
        label: 'Dosage',
        type: 'text',
        required: true,
        placeholder: 'e.g., 5ml, 10ml',
      },
      {
        key: 'side_effects_observed',
        label: 'Side Effects Observed',
        type: 'textarea',
        required: false,
        placeholder: 'Document any adverse reactions',
      },
    ],
    
    auto_create_health_record: true,
    default_health_record_type: 'vaccination',
    
    default_frequency_type: 'yearly',
    default_frequency_value: 1,
    
    track_cost: true,
    track_follow_up: true,
    require_veterinarian: true,
    allow_scheduling: true,
  },

  treatment: {
    id: 'treatment',
    name: 'Treatment',
    description: 'Therapeutic treatment protocols and medication regimens',
    icon: '💊',
    color: 'bg-blue-100',
    badge_color: 'bg-blue-100 text-blue-800 border-blue-200',
    
    fields: [
      {
        key: 'treatment_name',
        label: 'Treatment Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Antibiotic Therapy, Deworming Treatment',
      },
      {
        key: 'medication_name',
        label: 'Medication/Drug Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Amoxicillin, Ivermectin',
      },
      {
        key: 'dosage',
        label: 'Dosage',
        type: 'text',
        required: true,
        placeholder: 'e.g., 250mg/kg, 1ml per 10kg',
      },
      {
        key: 'route_of_administration',
        label: 'Route of Administration',
        type: 'select',
        required: true,
        options: [
          { value: 'oral', label: 'Oral (PO)' },
          { value: 'intramuscular', label: 'Intramuscular (IM)' },
          { value: 'subcutaneous', label: 'Subcutaneous (SQ)' },
          { value: 'intravenous', label: 'Intravenous (IV)' },
          { value: 'topical', label: 'Topical' },
        ],
      },
      {
        key: 'treatment_duration',
        label: 'Treatment Duration (Days)',
        type: 'number',
        required: true,
        min: 1,
        max: 365,
        placeholder: 'Number of days',
      },
      {
        key: 'condition_treated',
        label: 'Condition Being Treated',
        type: 'textarea',
        required: true,
        placeholder: 'Describe the condition or disease',
      },
      {
        key: 'expected_outcome',
        label: 'Expected Outcome',
        type: 'textarea',
        required: false,
        placeholder: 'Expected response to treatment',
      },
      {
        key: 'withdrawal_period_days',
        label: 'Withdrawal Period (Days)',
        type: 'number',
        required: false,
        min: 0,
        placeholder: 'Days animal cannot be used for milk/meat',
      },
    ],
    
    auto_create_health_record: true,
    default_health_record_type: 'treatment',
    
    default_frequency_type: 'one_time',
    default_frequency_value: 1,
    
    track_cost: true,
    track_follow_up: true,
    require_veterinarian: true,
    allow_scheduling: true,
  },

  checkup: {
    id: 'checkup',
    name: 'Health Checkup',
    description: 'Regular health check-ups and clinical examinations',
    icon: '🩺',
    color: 'bg-purple-100',
    badge_color: 'bg-purple-100 text-purple-800 border-purple-200',
    
    fields: [
      {
        key: 'checkup_type',
        label: 'Checkup Type',
        type: 'select',
        required: true,
        options: [
          { value: 'routine', label: 'Routine Checkup' },
          { value: 'pre_breeding', label: 'Pre-Breeding Checkup' },
          { value: 'post_pregnancy', label: 'Post-Pregnancy Checkup' },
          { value: 'preventive', label: 'Preventive Screening' },
          { value: 'complaint', label: 'Complaint-Based Checkup' },
        ],
      },
      {
        key: 'body_condition_score',
        label: 'Body Condition Score (1-5)',
        type: 'number',
        required: false,
        min: 1,
        max: 5,
        step: 0.5,
      },
      {
        key: 'weight',
        label: 'Weight (kg)',
        type: 'number',
        required: false,
        min: 0,
        placeholder: 'Optional weight measurement',
      },
      {
        key: 'temperature',
        label: 'Temperature (°C)',
        type: 'number',
        required: false,
        min: 35,
        max: 42,
        step: 0.1,
        placeholder: 'Normal: 38-40°C',
      },
      {
        key: 'pulse',
        label: 'Pulse (beats/min)',
        type: 'number',
        required: false,
        min: 0,
        max: 200,
        placeholder: 'Normal: 40-60',
      },
      {
        key: 'respiration',
        label: 'Respiration Rate (breaths/min)',
        type: 'number',
        required: false,
        min: 0,
        max: 100,
        placeholder: 'Normal: 20-30',
      },
      {
        key: 'physical_exam_findings',
        label: 'Physical Examination Findings',
        type: 'textarea',
        required: true,
        placeholder: 'Document observations from physical exam',
      },
      {
        key: 'recommended_actions',
        label: 'Recommended Actions',
        type: 'textarea',
        required: false,
        placeholder: 'Any follow-up treatments or recommendations',
      },
    ],
    
    auto_create_health_record: true,
    default_health_record_type: 'checkup',
    
    default_frequency_type: 'monthly',
    default_frequency_value: 1,
    
    track_cost: true,
    track_follow_up: true,
    require_veterinarian: true,
    allow_scheduling: true,
  },

  breeding: {
    id: 'breeding',
    name: 'Breeding Protocol',
    description: 'Breeding programs, reproduction management, and genetic tracking',
    icon: '🐄',
    color: 'bg-orange-100',
    badge_color: 'bg-orange-100 text-orange-800 border-orange-200',
    
    fields: [
      {
        key: 'breeding_strategy',
        label: 'Breeding Strategy',
        type: 'select',
        required: true,
        options: [
          { value: 'artificial_insemination', label: 'Artificial Insemination (AI)' },
          { value: 'natural_service', label: 'Natural Service' },
          { value: 'embryo_transfer', label: 'Embryo Transfer' },
        ],
      },
      {
        key: 'sire_name_or_id',
        label: 'Sire Name/ID',
        type: 'text',
        required: true,
        placeholder: 'Bull ID or name',
      },
      {
        key: 'sire_genetics',
        label: 'Sire Genetics/Breed',
        type: 'text',
        required: false,
        placeholder: 'e.g., Holstein, Jersey',
      },
      {
        key: 'breeding_objective',
        label: 'Breeding Objective',
        type: 'textarea',
        required: true,
        placeholder: 'e.g., Increase milk production, improve health traits',
      },
      {
        key: 'ai_technician',
        label: 'AI Technician Name',
        type: 'text',
        required: false,
        placeholder: 'For AI breedings',
      },
      {
        key: 'expected_calving_date',
        label: 'Expected Calving Date',
        type: 'date',
        required: false,
      },
      {
        key: 'genetic_markers',
        label: 'Genetic Markers/Tests',
        type: 'textarea',
        required: false,
        placeholder: 'e.g., Disease resistance tests, productivity indices',
      },
    ],
    
    auto_create_health_record: true,
    default_health_record_type: 'reproductive',
    
    default_frequency_type: 'yearly',
    default_frequency_value: 2,
    
    track_cost: true,
    track_follow_up: true,
    require_veterinarian: false,
    allow_scheduling: true,
  },

  nutrition: {
    id: 'nutrition',
    name: 'Nutrition Program',
    description: 'Feeding protocols, nutrition management, and diet programs',
    icon: '🌾',
    color: 'bg-yellow-100',
    badge_color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    
    fields: [
      {
        key: 'diet_type',
        label: 'Diet Type',
        type: 'select',
        required: true,
        options: [
          { value: 'pasture', label: 'Pasture-Based' },
          { value: 'supplemented', label: 'Pasture + Supplements' },
          { value: 'total_mixed_ration', label: 'Total Mixed Ration (TMR)' },
          { value: 'concentrate', label: 'Concentrate Feeding' },
          { value: 'specialized', label: 'Specialized Diet' },
        ],
      },
      {
        key: 'forage_type',
        label: 'Primary Forage',
        type: 'text',
        required: true,
        placeholder: 'e.g., Alfalfa hay, Napier grass, Maize silage',
      },
      {
        key: 'forage_quantity_kg_per_day',
        label: 'Daily Forage (kg/day)',
        type: 'number',
        required: false,
        min: 0,
        step: 0.5,
      },
      {
        key: 'concentrate_formula',
        label: 'Concentrate Formula/Mix',
        type: 'textarea',
        required: false,
        placeholder: 'e.g., dairy mix 16%, grains, minerals',
      },
      {
        key: 'concentrate_quantity_kg_per_day',
        label: 'Daily Concentrate (kg/day)',
        type: 'number',
        required: false,
        min: 0,
        step: 0.5,
      },
      {
        key: 'mineral_supplement',
        label: 'Mineral Supplement',
        type: 'text',
        required: false,
        placeholder: 'e.g., trace mineral premix, salt block',
      },
      {
        key: 'water_provision',
        label: 'Water Provision (liters/day)',
        type: 'number',
        required: false,
        min: 0,
        placeholder: 'Expected daily water requirement',
      },
      {
        key: 'nutritional_goals',
        label: 'Nutritional Goals',
        type: 'textarea',
        required: true,
        placeholder: 'e.g., increase milk yield, maintain body condition',
      },
    ],
    
    auto_create_health_record: false,
    default_health_record_type: undefined,
    
    default_frequency_type: 'daily',
    default_frequency_value: 1,
    
    track_cost: true,
    track_follow_up: false,
    require_veterinarian: false,
    allow_scheduling: true,
  },

  deworming_parasites: {
    id: 'deworming_parasites',
    name: 'Deworming & Parasites',
    description: 'Parasite control programs, deworming schedules, and ECO management',
    icon: '🪱',
    color: 'bg-red-100',
    badge_color: 'bg-red-100 text-red-800 border-red-200',
    
    fields: [
      {
        key: 'parasite_type',
        label: 'Parasite Type',
        type: 'select',
        required: true,
        options: [
          { value: 'internal', label: 'Internal Parasites (Worms)' },
          { value: 'external', label: 'External Parasites (Ticks, Mites)' },
          { value: 'mixed', label: 'Mixed Internal & External' },
        ],
      },
      {
        key: 'dewormer_name',
        label: 'Dewormer/Antiparasitic Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Ivermectin, Albendazole',
      },
      {
        key: 'dewormer_type',
        label: 'Dewormer Type',
        type: 'select',
        required: true,
        options: [
          { value: 'broad_spectrum', label: 'Broad Spectrum' },
          { value: 'targeted', label: 'Targeted (Specific parasites)' },
          { value: 'combination', label: 'Combination Therapy' },
        ],
      },
      {
        key: 'dosage_kg',
        label: 'Dosage (mg/kg)',
        type: 'text',
        required: true,
        placeholder: 'e.g., 200mg/kg',
      },
      {
        key: 'route_of_administration',
        label: 'Route of Administration',
        type: 'select',
        required: true,
        options: [
          { value: 'oral', label: 'Oral (PO)' },
          { value: 'intramuscular', label: 'Intramuscular (IM)' },
          { value: 'subcutaneous', label: 'Subcutaneous (SQ)' },
          { value: 'topical', label: 'Topical/Pour-on' },
          { value: 'intravenous', label: 'Intravenous (IV)' },
        ],
      },
      {
        key: 'fecal_examination_notes',
        label: 'Fecal Examination Results',
        type: 'textarea',
        required: false,
        placeholder: 'Egg count, parasite types identified',
      },
      {
        key: 'next_deworming_date',
        label: 'Next Deworming Date',
        type: 'date',
        required: false,
      },
      {
        key: 'grazing_management',
        label: 'Grazing Management Recommendations',
        type: 'textarea',
        required: false,
        placeholder: 'e.g., rotational grazing, pasture rest periods',
      },
    ],
    
    auto_create_health_record: true,
    default_health_record_type: 'deworming',
    
    default_frequency_type: 'quarterly',
    default_frequency_value: 1,
    
    track_cost: true,
    track_follow_up: true,
    require_veterinarian: true,
    allow_scheduling: true,
  },

  dehorning: {
    id: 'dehorning',
    name: 'Dehorning',
    description: 'Dehorning procedures, post-operative care, and complication tracking',
    icon: '🐄',
    color: 'bg-amber-100',
    badge_color: 'bg-amber-100 text-amber-800 border-amber-200',
    
    fields: [
      {
        key: 'dehorning_method',
        label: 'Dehorning Method',
        type: 'select',
        required: true,
        options: [
          { value: 'hot_iron', label: 'Hot Iron/Branding' },
          { value: 'disbudding', label: 'Disbudding (Young Animals)' },
          { value: 'surgical', label: 'Surgical Removal' },
          { value: 'caustic_paste', label: 'Caustic Paste' },
          { value: 'laser', label: 'Laser' },
        ],
      },
      {
        key: 'dehorning_reason',
        label: 'Reason for Dehorning',
        type: 'text',
        required: true,
        placeholder: 'e.g., Safety, Farm policy, Behavioral management',
      },
      {
        key: 'dehorning_age',
        label: 'Animal Age at Dehorning (months)',
        type: 'number',
        required: false,
        min: 0,
        max: 200,
      },
      {
        key: 'anesthesia_used',
        label: 'Anesthesia Used?',
        type: 'select',
        required: true,
        options: [
          { value: 'none', label: 'None' },
          { value: 'local', label: 'Local' },
          { value: 'regional', label: 'Regional' },
          { value: 'general', label: 'General' },
        ],
      },
      {
        key: 'post_dehorning_care',
        label: 'Post-Operative Care',
        type: 'textarea',
        required: false,
        placeholder: 'Wound care, pain management, infection prevention measures...',
      },
      {
        key: 'dehorning_veterinarian',
        label: 'Performed by',
        type: 'text',
        required: false,
        placeholder: 'Veterinarian or technician name',
      },
      {
        key: 'dehorning_complications',
        label: 'Complications Noted',
        type: 'textarea',
        required: false,
        placeholder: 'Any adverse reactions, infections, behavioral changes...',
      },
    ],
    
    auto_create_health_record: true,
    default_health_record_type: 'dehorning',
    
    default_frequency_type: 'one_time',
    default_frequency_value: 1,
    
    track_cost: true,
    track_follow_up: true,
    require_veterinarian: false,
    allow_scheduling: true,
  },

  post_mortem: {
    id: 'post_mortem',
    name: 'Post Mortem',
    description: 'Post-mortem examination, necropsy records, and animal disposal',
    icon: '📋',
    color: 'bg-gray-100',
    badge_color: 'bg-gray-100 text-gray-800 border-gray-200',
    
    fields: [
      {
        key: 'necropsy_performed',
        label: 'Necropsy Performed?',
        type: 'select',
        required: true,
        options: [
          { value: 'yes', label: 'Yes - Full Necropsy' },
          { value: 'partial', label: 'Partial Necropsy' },
          { value: 'no', label: 'No Necropsy' },
        ],
      },
      {
        key: 'cause_of_death_suspected',
        label: 'Suspected Cause of Death',
        type: 'text',
        required: true,
        placeholder: 'e.g., Disease outbreak, Injury, Unknown',
      },
      {
        key: 'external_findings',
        label: 'External Findings',
        type: 'textarea',
        required: false,
        placeholder: 'Describe visible external condition, injuries, discharge, etc.',
      },
      {
        key: 'internal_findings',
        label: 'Internal Findings (Necropsy)',
        type: 'textarea',
        required: false,
        placeholder: 'Organ conditions, lesions, abnormalities',
      },
      {
        key: 'disease_investigation',
        label: 'Disease Investigation Required?',
        type: 'checkbox',
        required: false,
      },
      {
        key: 'samples_collected',
        label: 'Samples Collected',
        type: 'multi-select',
        required: false,
        options: [
          { value: 'blood', label: 'Blood' },
          { value: 'organs', label: 'Organ Samples' },
          { value: 'tissues', label: 'Tissue Samples' },
          { value: 'fecal', label: 'Fecal Matter' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        key: 'disposal_method',
        label: 'Disposal Method',
        type: 'select',
        required: true,
        options: [
          { value: 'burial', label: 'Burial' },
          { value: 'incineration', label: 'Incineration' },
          { value: 'composting', label: 'Composting' },
          { value: 'rendering', label: 'Rendering' },
        ],
      },
      {
        key: 'disposal_location',
        label: 'Disposal Location',
        type: 'text',
        required: true,
        placeholder: 'Specific location where animal was disposed',
      },
      {
        key: 'follow_up_required',
        label: 'Follow-up Required?',
        type: 'textarea',
        required: false,
        placeholder: 'e.g., Quarantine, herd screening, environmental cleaning',
      },
    ],
    
    auto_create_health_record: true,
    default_health_record_type: 'post_mortem',
    
    default_frequency_type: 'one_time',
    default_frequency_value: 1,
    
    track_cost: true,
    track_follow_up: true,
    require_veterinarian: false,
    allow_scheduling: false,
  },
}

/**
 * Get all available protocol types
 */
export function getAllProtocolTypes(): ProtocolTypeKey[] {
  return Object.keys(PROTOCOL_PRESETS) as ProtocolTypeKey[]
}

/**
 * Get preset configuration for a specific protocol type
 */
export function getProtocolPreset(type: ProtocolTypeKey): ProtocolPreset | null {
  return PROTOCOL_PRESETS[type] || null
}

/**
 * Get fields for a specific protocol type
 */
export function getProtocolFields(type: ProtocolTypeKey): ProtocolFieldConfig[] {
  const preset = getProtocolPreset(type)
  return preset?.fields || []
}

/**
 * Format protocol type for display (with icon and name)
 */
export function formatProtocolType(type: ProtocolTypeKey): string {
  const preset = getProtocolPreset(type)
  return preset ? `${preset.icon} ${preset.name}` : type
}

/**
 * Get icon for protocol type
 */
export function getProtocolIcon(type: ProtocolTypeKey): string {
  const preset = getProtocolPreset(type)
  return preset?.icon || '📋'
}

/**
 * Get color classes for protocol type
 */
export function getProtocolColors(type: ProtocolTypeKey) {
  const preset = getProtocolPreset(type)
  return {
    bg: preset?.color || 'bg-gray-100',
    badge: preset?.badge_color || 'bg-gray-100 text-gray-800 border-gray-200',
  }
}
