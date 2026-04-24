// src/lib/database/feedSettingsConstants.ts
// ⚠️  NO server imports in this file — it is used by both server and client code.

export const DAYS_OF_WEEK = [
  { value: 1, label: 'Mon', full: 'Monday' },
  { value: 2, label: 'Tue', full: 'Tuesday' },
  { value: 3, label: 'Wed', full: 'Wednesday' },
  { value: 4, label: 'Thu', full: 'Thursday' },
  { value: 5, label: 'Fri', full: 'Friday' },
  { value: 6, label: 'Sat', full: 'Saturday' },
  { value: 7, label: 'Sun', full: 'Sunday' },
]

export const ALERT_TYPE_META: Record<
  string,
  { label: string; unit: 'kg' | 'days' | 'percent'; description: string; min: number; max: number }
> = {
  low_stock_kg: {
    label: 'Low Stock (kg)',
    unit: 'kg',
    description: 'Alert when any feed type stock falls below this amount',
    min: 0,
    max: 10000,
  },
  low_stock_days: {
    label: 'Low Stock (days remaining)',
    unit: 'days',
    description: 'Alert when estimated stock will run out within this many days',
    min: 1,
    max: 90,
  },
  expiry_warning_days: {
    label: 'Expiry Warning',
    unit: 'days',
    description: 'Alert when any inventory batch expires within this window',
    min: 1,
    max: 90,
  },
  waste_threshold_percent: {
    label: 'Waste Threshold',
    unit: 'percent',
    description: 'Alert when recorded waste exceeds this % of quantity fed',
    min: 0,
    max: 50,
  },
  overfeeding_percent: {
    label: 'Overfeeding Threshold',
    unit: 'percent',
    description: 'Alert when actual feeding exceeds planned ration by this %',
    min: 0,
    max: 100,
  },
}

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface FeedTimeSlot {
  id: string
  farm_id: string
  slot_name: string
  scheduled_time: string
  days_of_week: number[]
  is_active: boolean
  sort_order: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface FeedAlertSetting {
  id: string
  farm_id: string
  alert_type: string
  threshold_value: number
  threshold_unit: 'kg' | 'days' | 'percent'
  is_enabled: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface FeedFrequencyDefault {
  id: string
  farm_id: string
  animal_category_id: string
  feedings_per_day: number
  default_quantity_kg_per_feeding: number
  waste_factor_percent: number
  notes: string | null
  created_at: string
  updated_at: string
  animal_categories?: { id: string; name: string } | null
}
