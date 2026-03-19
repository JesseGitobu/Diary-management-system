-- Migration 008: Add weight status, health attention, and audit logging
-- Purpose: Enable weight tracking, health monitoring, and audit trail features
-- Created: 2024-03-14

-- ========== PART 1: ANIMAL_HEALTH_STATUS_LOG TABLE ==========

CREATE TABLE IF NOT EXISTS public.animal_health_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core audit fields
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  
  -- Status transition
  old_health_status VARCHAR(50),
  new_health_status VARCHAR(50) NOT NULL,
  
  -- Who changed it and when
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Optional context
  reason TEXT,
  notes TEXT,
  
  -- Denormalized for reporting (avoid joins)
  animal_tag_number VARCHAR(100),
  animal_name VARCHAR(255),
  
  CONSTRAINT animal_health_status_log_status_valid CHECK (
    new_health_status IN (
      'healthy', 'sick', 'injured', 'quarantine', 'vaccinated',
      'treatment', 'recovering', 'pregnant', 'lactating', 'good', 'fair', 'poor', 'deceased', 'released'
    )
  )
);

-- INDEXES (Critical for performance)
-- Query 1: Recent changes for an animal
CREATE INDEX IF NOT EXISTS idx_health_log_animal_date ON public.animal_health_status_log(
  animal_id, 
  changed_at DESC NULLS LAST
);

-- Query 2: All changes in farm (analytics, dashboard)
CREATE INDEX IF NOT EXISTS idx_health_log_farm_date ON public.animal_health_status_log(
  farm_id, 
  changed_at DESC NULLS LAST
);

-- Query 3: Specific status transitions (e.g., "all animals that became sick")
CREATE INDEX IF NOT EXISTS idx_health_log_farm_newstatus ON public.animal_health_status_log(
  farm_id, 
  new_health_status
) WHERE new_health_status IN ('sick', 'injured', 'quarantine');

-- Query 4: Find when animal transitioned FROM a status (recovery tracking)
CREATE INDEX IF NOT EXISTS idx_health_log_farm_oldstatus ON public.animal_health_status_log(
  farm_id, 
  old_health_status
) WHERE old_health_status IN ('sick', 'injured', 'quarantine');

-- Query 5: Who made changes (audit trail for users)
CREATE INDEX IF NOT EXISTS idx_health_log_changed_by ON public.animal_health_status_log(
  changed_by, 
  changed_at DESC NULLS LAST
) WHERE changed_by IS NOT NULL;

-- ========== PART 2: TRIGGER FOR HEALTH STATUS LOGGING ==========

CREATE OR REPLACE FUNCTION public.log_animal_health_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if health_status actually changed
  IF OLD.health_status IS DISTINCT FROM NEW.health_status THEN
    INSERT INTO public.animal_health_status_log (
      farm_id,
      animal_id,
      old_health_status,
      new_health_status,
      changed_by,
      reason,
      animal_tag_number,
      animal_name
    ) VALUES (
      NEW.farm_id,
      NEW.id,
      OLD.health_status,
      NEW.health_status,
      auth.uid()::UUID,
      'Status changed via UI',
      NEW.tag_number,
      NEW.name
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS animal_health_status_log_trigger ON public.animals;

CREATE TRIGGER animal_health_status_log_trigger
AFTER UPDATE ON public.animals
FOR EACH ROW
EXECUTE FUNCTION public.log_animal_health_status_change();

-- ========== PART 3: ANIMAL_WEIGHT_STATUS MATERIALIZED VIEW ==========

DROP MATERIALIZED VIEW IF EXISTS public.animal_weight_status CASCADE;

CREATE MATERIALIZED VIEW public.animal_weight_status AS
SELECT 
  a.id,
  a.farm_id,
  a.tag_number,
  awr.weight_kg as weight,
  awr.weight_date::date as last_weight_date,
  (NOW()::date - COALESCE(awr.weight_date::date, DATE_TRUNC('day', a.created_at)::date)) as days_since_weight,
  CASE 
    WHEN awr.weight_kg IS NULL THEN true
    WHEN (NOW()::date - COALESCE(awr.weight_date::date, DATE_TRUNC('day', a.created_at)::date)) > 30 
      AND a.production_status IN ('lactating', 'steaming_dry_cows', 'open_culling_dry_cows') 
    THEN true
    ELSE false
  END as requires_weight_update,
  (COALESCE(awr.weight_date::date, DATE_TRUNC('day', a.created_at)::date) + 31)::date as next_due_date
FROM public.animals a
LEFT JOIN LATERAL (
  SELECT weight_kg, weight_date
  FROM public.animal_weight_records
  WHERE animal_id = a.id
  ORDER BY weight_date DESC
  LIMIT 1
) awr ON true;

CREATE UNIQUE INDEX idx_animal_weight_status_id ON public.animal_weight_status (id);
CREATE INDEX idx_animal_weight_status_farm_requires ON public.animal_weight_status (farm_id, requires_weight_update);
CREATE INDEX idx_animal_weight_status_due_date ON public.animal_weight_status (next_due_date) 
  WHERE requires_weight_update = true;

-- ========== PART 4: ANIMAL_HEALTH_STATUS_ATTENTION VIEW ==========

DROP VIEW IF EXISTS public.animal_health_status_attention CASCADE;

CREATE VIEW public.animal_health_status_attention AS
SELECT 
  a.id,
  a.farm_id,
  a.tag_number,
  a.name,
  a.health_status,
  a.production_status,
  hr.record_date::date as last_health_check,
  CASE 
    WHEN a.health_status = 'sick' THEN 'URGENT - Animal is sick'::text
    WHEN a.health_status = 'injured' THEN 'HIGH - Animal is injured'::text
    WHEN a.health_status = 'quarantine' THEN 'MEDIUM - Animal in quarantine'::text
    WHEN a.health_status = 'treatment' THEN 'MEDIUM - Under treatment'::text
    ELSE NULL::text
  END as attention_required,
  CASE 
    WHEN a.health_status = 'sick' THEN 1
    WHEN a.health_status = 'injured' THEN 2
    WHEN a.health_status = 'quarantine' THEN 3
    WHEN a.health_status = 'treatment' THEN 4
    ELSE 999
  END as priority_rank
FROM public.animals a
LEFT JOIN LATERAL (
  SELECT record_date
  FROM public.health_records
  WHERE animal_id = a.id
  ORDER BY record_date DESC
  LIMIT 1
) hr ON true
WHERE a.health_status IN ('sick', 'injured', 'quarantine', 'treatment')
  AND a.status != 'deceased';

-- ========== PART 5: SUPPORTING INDEXES ==========

CREATE INDEX IF NOT EXISTS idx_animals_health_status ON public.animals(health_status) 
  WHERE status != 'deceased';
CREATE INDEX IF NOT EXISTS idx_animals_farm_health ON public.animals(farm_id, health_status);
CREATE INDEX IF NOT EXISTS idx_health_records_animal_date ON public.health_records(animal_id, record_date DESC);

-- ========== PART 6: REFRESH FUNCTION (For Materialized View) ==========

CREATE OR REPLACE FUNCTION public.refresh_animal_weight_status()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.animal_weight_status;
END;
$$ LANGUAGE plpgsql;

-- ========== PART 7: COMMENTS FOR DOCUMENTATION ==========

COMMENT ON TABLE public.animal_health_status_log IS 'Immutable audit trail of all health status changes for compliance and analytics';
COMMENT ON MATERIALIZED VIEW public.animal_weight_status IS 'Derived view of animals requiring weight updates, refreshed hourly';
COMMENT ON VIEW public.animal_health_status_attention IS 'Real-time view of animals requiring health attention, queries current status';
