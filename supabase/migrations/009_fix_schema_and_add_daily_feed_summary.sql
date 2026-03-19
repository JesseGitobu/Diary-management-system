-- Migration 009: Fix schema issues and add daily_feed_summary materialized view
-- Purpose: 
--   1. Add missing FK constraint: production_records.animal_id → animals.id
--   2. Create daily_feed_summary materialized view for dashboard
--   3. Ensure schema consistency across tables

-- ============================================
-- 1. ADD MISSING FK CONSTRAINT
-- ============================================
-- Add FK constraint if not exists (production_records → animals)
ALTER TABLE public.production_records
ADD CONSTRAINT production_records_animal_id_fkey 
  FOREIGN KEY (animal_id) 
  REFERENCES animals (id) 
  ON DELETE CASCADE;

-- ============================================
-- 2. CREATE daily_feed_summary MATERIALIZED VIEW
-- ============================================
-- This view provides a daily snapshot of feed inventory status and consumption
CREATE MATERIALIZED VIEW IF NOT EXISTS public.daily_feed_summary AS
SELECT
  CURRENT_DATE::date as summary_date,
  fi.farm_id,
  f.name as farm_name,
  COUNT(DISTINCT fi.feed_type_id) as total_feed_types,
  COUNT(DISTINCT CASE WHEN fi.quantity_in_stock <= fi.minimum_threshold THEN fi.feed_type_id END) as low_stock_count,
  ROUND(SUM(fi.quantity_in_stock)::numeric, 2) as total_quantity_in_stock,
  ROUND(AVG(fi.quantity_in_stock / NULLIF(fi.maximum_capacity, 0) * 100)::numeric, 2) as avg_capacity_percentage,
  ARRAY_AGG(
    DISTINCT CASE 
      WHEN fi.quantity_in_stock <= fi.minimum_threshold 
      THEN jsonb_build_object('feed_type_id', ft.id, 'name', ft.name, 'quantity', fi.quantity_in_stock, 'threshold', fi.minimum_threshold)
      ELSE NULL
    END
  ) FILTER (WHERE fi.quantity_in_stock <= fi.minimum_threshold) as low_stock_alerts,
  ROUND(
    COALESCE(
      (SELECT SUM(pr.milk_volume) 
       FROM production_records pr 
       WHERE pr.farm_id = fi.farm_id 
       AND pr.record_date = CURRENT_DATE),
      0
    )::numeric,
    2
  ) as today_milk_produced,
  MAX(fi.updated_at) as last_inventory_update,
  COUNT(CASE WHEN fi.expiry_date IS NOT NULL AND fi.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as expiring_soon_count,
  CURRENT_TIMESTAMP as generated_at
FROM public.feed_inventory fi
JOIN public.feed_types ft ON fi.feed_type_id = ft.id
JOIN public.farms f ON fi.farm_id = f.id
GROUP BY fi.farm_id, f.name
WITH DATA;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_daily_feed_summary_farm_id 
  ON public.daily_feed_summary (farm_id);

CREATE INDEX IF NOT EXISTS idx_daily_feed_summary_date 
  ON public.daily_feed_summary (summary_date DESC);

-- ============================================
-- 3. GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON public.daily_feed_summary TO authenticated;

-- ============================================
-- 4. CREATE REFRESH FUNCTION FOR MATERIALIZED VIEW
-- ============================================
CREATE OR REPLACE FUNCTION public.refresh_daily_feed_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_feed_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. OPTIONAL: Create trigger to auto-refresh on feed_inventory changes
-- ============================================
-- (Uncomment if you want automatic refresh, but be careful with performance)
-- CREATE OR REPLACE FUNCTION public.trigger_refresh_daily_feed_summary()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_feed_summary;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- CREATE TRIGGER trig_refresh_daily_feed_summary_on_inventory
-- AFTER INSERT OR UPDATE OR DELETE ON public.feed_inventory
-- FOR EACH STATEMENT
-- EXECUTE FUNCTION public.trigger_refresh_daily_feed_summary();

-- ============================================
-- 6. SCHEMA DOCUMENTATION COMMENTS
-- ============================================
-- Note on column naming clarifications:
-- - distribution_channels.channel_type: holds the type of channel (cooperative, processor, direct, retail)
-- - feed_inventory.quantity_in_stock: the quantity currently in stock (numeric with 2 decimals)
-- - feed_types: does not have low_stock_threshold; use feed_inventory.minimum_threshold instead
-- - production_records.animal_id: now has proper FK constraint to animals table

COMMENT ON MATERIALIZED VIEW public.daily_feed_summary IS 
'Daily aggregate summary of feed inventory status and production metrics per farm. Includes low stock alerts, expiring feed, and daily milk production totals.';

COMMENT ON FUNCTION public.refresh_daily_feed_summary() IS 
'Refresh the daily_feed_summary materialized view with current data. Can be called manually or scheduled via pg_cron.';
