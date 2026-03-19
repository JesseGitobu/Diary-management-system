-- 016_create_farm_production_settings_table.sql
-- Drop existing production_settings table and create new farm_production_settings table
-- with comprehensive column structure for all production settings

-- Drop existing table if it exists (with cascade to handle dependencies)
DROP TABLE IF EXISTS public.production_settings CASCADE;

-- Create new farm_production_settings table
CREATE TABLE public.farm_production_settings (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL UNIQUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 1. General Production Settings
  production_tracking_mode VARCHAR(50) DEFAULT 'basic', -- basic, advanced, quality_focused
  enable_production_tracking BOOLEAN DEFAULT TRUE,
  default_recording_method VARCHAR(50) DEFAULT 'manual', -- manual, automated, hybrid
  production_unit VARCHAR(20) DEFAULT 'liters', -- liters, gallons, kg
  
  -- 2. Milking Session Configuration
  enabled_sessions TEXT[] DEFAULT ARRAY['morning', 'afternoon', 'evening'],
  default_session VARCHAR(50) DEFAULT 'morning',
  session_times JSONB DEFAULT '{"morning":"06:00","afternoon":"14:00","evening":"18:00"}'::jsonb,
  allow_multiple_sessions_per_day BOOLEAN DEFAULT TRUE,
  require_session_time_recording BOOLEAN DEFAULT FALSE,
  session_interval_hours INTEGER DEFAULT 8,
  enable_smart_session_banner BOOLEAN DEFAULT FALSE,
  session_late_threshold_minutes INTEGER DEFAULT 30,
  
  -- 3. Quality Tracking Settings
  enable_quality_tracking BOOLEAN DEFAULT FALSE,
  quality_tracking_level VARCHAR(50) DEFAULT 'basic', -- basic, standard, advanced, laboratory
  
  -- Fat Content Configuration
  track_fat_content BOOLEAN DEFAULT FALSE,
  fat_content_required BOOLEAN DEFAULT FALSE,
  fat_content_min_threshold NUMERIC(5, 2) DEFAULT 3.5,
  fat_content_max_threshold NUMERIC(5, 2) DEFAULT 6.0,
  fat_content_target NUMERIC(5, 2) DEFAULT 4.0,
  
  -- Protein Content Configuration
  track_protein_content BOOLEAN DEFAULT FALSE,
  protein_content_required BOOLEAN DEFAULT FALSE,
  protein_content_min_threshold NUMERIC(5, 2) DEFAULT 3.0,
  protein_content_max_threshold NUMERIC(5, 2) DEFAULT 4.0,
  protein_content_target NUMERIC(5, 2) DEFAULT 3.3,
  
  -- Somatic Cell Count Configuration
  track_somatic_cell_count BOOLEAN DEFAULT FALSE,
  scc_required BOOLEAN DEFAULT FALSE,
  scc_alert_threshold INTEGER DEFAULT 400000,
  scc_critical_threshold INTEGER DEFAULT 750000,
  scc_target INTEGER DEFAULT 200000,
  
  -- Lactose Content Configuration
  track_lactose_content BOOLEAN DEFAULT FALSE,
  lactose_required BOOLEAN DEFAULT FALSE,
  lactose_min_threshold NUMERIC(5, 2) DEFAULT 4.5,
  lactose_max_threshold NUMERIC(5, 2) DEFAULT 5.5,
  
  -- Temperature Configuration
  track_temperature BOOLEAN DEFAULT FALSE,
  temperature_required BOOLEAN DEFAULT FALSE,
  temperature_unit VARCHAR(20) DEFAULT 'celsius', -- celsius, fahrenheit
  temperature_min NUMERIC(5, 2) DEFAULT 4.0,
  temperature_max NUMERIC(5, 2) DEFAULT 8.0,
  temperature_alert_enabled BOOLEAN DEFAULT FALSE,
  
  -- pH Level Configuration
  track_ph_level BOOLEAN DEFAULT FALSE,
  ph_required BOOLEAN DEFAULT FALSE,
  ph_min NUMERIC(5, 2) DEFAULT 6.4,
  ph_max NUMERIC(5, 2) DEFAULT 6.8,
  
  -- Total Bacterial Count Configuration
  track_total_bacterial_count BOOLEAN DEFAULT FALSE,
  tbc_required BOOLEAN DEFAULT FALSE,
  tbc_alert_threshold INTEGER DEFAULT 30000,
  
  -- 4. Animal Eligibility Settings
  auto_filter_eligible_animals BOOLEAN DEFAULT FALSE,
  eligible_production_statuses TEXT[] DEFAULT ARRAY['lactating'],
  eligible_genders TEXT[] DEFAULT ARRAY['female'],
  min_animal_age_months INTEGER DEFAULT 15,
  max_days_in_milk INTEGER DEFAULT 305,
  exclude_sick_animals BOOLEAN DEFAULT TRUE,
  exclude_treatment_withdrawal BOOLEAN DEFAULT TRUE,
  
  -- 5. Data Validation & Quality Control
  enable_data_validation BOOLEAN DEFAULT FALSE,
  volume_min_per_session NUMERIC(10, 2) DEFAULT 2.0,
  volume_max_per_session NUMERIC(10, 2) DEFAULT 50.0,
  volume_alert_threshold NUMERIC(5, 2) DEFAULT 30.0,
  require_volume_entry BOOLEAN DEFAULT TRUE,
  
  allow_retroactive_entries BOOLEAN DEFAULT TRUE,
  max_retroactive_days INTEGER DEFAULT 7,
  require_notes_for_anomalies BOOLEAN DEFAULT FALSE,
  
  flag_unusual_volumes BOOLEAN DEFAULT FALSE,
  unusual_volume_deviation_percent NUMERIC(5, 2) DEFAULT 30.0,
  flag_unusual_quality BOOLEAN DEFAULT FALSE,
  
  -- 6. Aggregation & Reporting
  enable_daily_aggregation BOOLEAN DEFAULT FALSE,
  enable_weekly_reports BOOLEAN DEFAULT FALSE,
  enable_monthly_reports BOOLEAN DEFAULT FALSE,
  aggregation_method VARCHAR(50) DEFAULT 'automatic', -- automatic, manual, scheduled
  report_generation_day VARCHAR(20) DEFAULT 'monday',
  include_quality_metrics_in_reports BOOLEAN DEFAULT FALSE,
  
  -- 7. Performance Benchmarking
  enable_performance_tracking BOOLEAN DEFAULT FALSE,
  benchmark_against VARCHAR(50) DEFAULT 'self', -- self, herd_average, breed_standard, industry
  track_peak_lactation BOOLEAN DEFAULT FALSE,
  track_lactation_curve BOOLEAN DEFAULT FALSE,
  alert_production_decline BOOLEAN DEFAULT FALSE,
  decline_threshold_percent NUMERIC(5, 2) DEFAULT 15.0,
  
  -- 8. Chart & Visualization Settings
  default_chart_period INTEGER DEFAULT 30,
  chart_display_mode VARCHAR(50) DEFAULT 'combined', -- volume_only, quality_only, combined, separate
  show_volume_chart BOOLEAN DEFAULT TRUE,
  show_fat_protein_chart BOOLEAN DEFAULT FALSE,
  show_trend_lines BOOLEAN DEFAULT TRUE,
  show_averages BOOLEAN DEFAULT TRUE,
  show_targets BOOLEAN DEFAULT TRUE,
  enable_chart_export BOOLEAN DEFAULT FALSE,
  
  -- 9. Bulk Entry Settings
  enable_bulk_entry BOOLEAN DEFAULT FALSE,
  bulk_entry_template VARCHAR(500) DEFAULT '',
  allow_csv_import BOOLEAN DEFAULT FALSE,
  require_bulk_review BOOLEAN DEFAULT TRUE,
  auto_calculate_aggregates BOOLEAN DEFAULT FALSE,
  
  -- 10. Integration Settings
  sync_with_health_records BOOLEAN DEFAULT FALSE,
  sync_with_breeding_records BOOLEAN DEFAULT FALSE,
  sync_with_feeding_records BOOLEAN DEFAULT FALSE,
  update_animal_production_status BOOLEAN DEFAULT FALSE,
  
  -- 11. Notifications & Alerts
  production_alerts JSONB DEFAULT '{"lowVolume":false,"qualityIssues":false,"missedSession":false,"milestoneReached":false}'::jsonb,
  alert_delivery_methods TEXT[] DEFAULT ARRAY['app'],
  alert_recipients TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- 12. Cost Tracking
  track_production_costs BOOLEAN DEFAULT FALSE,
  default_cost_per_liter NUMERIC(10, 2),
  include_labor_costs BOOLEAN DEFAULT FALSE,
  include_feed_costs BOOLEAN DEFAULT FALSE,
  include_utilities BOOLEAN DEFAULT FALSE,
  
  -- 13. Production Sessions & Costs (NEW for Production Tab)
  milking_sessions JSONB DEFAULT '[]'::jsonb,
  labor_cost_per_unit NUMERIC(10, 2) DEFAULT 0,
  feed_cost_per_unit NUMERIC(10, 2) DEFAULT 0,
  utilities_cost_per_unit NUMERIC(10, 2) DEFAULT 0,
  
  -- Constraints
  CONSTRAINT fk_farm FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_farm_production_settings_farm_id ON public.farm_production_settings(farm_id);
CREATE INDEX idx_farm_production_settings_updated_at ON public.farm_production_settings(updated_at DESC);

-- Add RLS policies
ALTER TABLE public.farm_production_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their farm's production settings
CREATE POLICY "Users can view own farm production settings"
  ON public.farm_production_settings FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only farm managers and owners can update production settings
CREATE POLICY "Only farm managers and owners can update production settings"
  ON public.farm_production_settings FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

-- Policy: Only farm managers and owners can insert production settings
CREATE POLICY "Only farm managers and owners can insert production settings"
  ON public.farm_production_settings FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role_type IN ('farm_owner', 'farm_manager')
    )
  );

-- Add table comments
COMMENT ON TABLE public.farm_production_settings IS 'Comprehensive farm production settings and configurations for dairy production tracking, quality metrics, animal eligibility, data validation, reporting, alerts, and costs';
COMMENT ON COLUMN public.farm_production_settings.farm_id IS 'Reference to the farm this settings belong to';
COMMENT ON COLUMN public.farm_production_settings.milking_sessions IS 'Array of milking sessions configuration. Each session contains: id (string), name (string), time (HH:mm format)';
COMMENT ON COLUMN public.farm_production_settings.production_alerts IS 'JSON object containing alert configurations for lowVolume, qualityIssues, missedSession, and milestoneReached';
COMMENT ON COLUMN public.farm_production_settings.labor_cost_per_unit IS 'Labor cost per production unit in Kenyan Shillings (KES)';
COMMENT ON COLUMN public.farm_production_settings.feed_cost_per_unit IS 'Feed cost per production unit in Kenyan Shillings (KES)';
COMMENT ON COLUMN public.farm_production_settings.utilities_cost_per_unit IS 'Utilities cost per production unit in Kenyan Shillings (KES)';
