-- Migration 045: Normalize feed inventory schema (Codd 3NF)
--
-- Problem: feed_inventory was conflating two concerns:
--   1. Current stock level per feed type (1 row per farm+feed_type)
--   2. Purchase transaction log (many rows per farm+feed_type)
--
-- Solution:
--   - feed_inventory  → pure stock ledger (one row per feed_type per farm)
--   - feed_purchases  → purchase transaction log (many rows per feed_type per farm)
--
-- feed_inventory keeps: quantity_in_stock, minimum_threshold, maximum_capacity,
--                       storage_location, updated_at
-- feed_purchases holds: quantity_kg, cost_per_kg, purchase_date, expiry_date,
--                       supplier, batch_number, notes

-- ── 1. Drop dependent materialized view before altering feed_inventory ───────
--
-- daily_feed_summary references feed_inventory.expiry_date which is being moved
-- to feed_purchases. We drop it here and recreate it below using feed_purchases.

DROP MATERIALIZED VIEW IF EXISTS public.daily_feed_summary;

-- ── 2. Clean up feed_inventory: remove purchase-specific columns ──────────────

ALTER TABLE public.feed_inventory
  DROP COLUMN IF EXISTS purchase_date,
  DROP COLUMN IF EXISTS expiry_date,
  DROP COLUMN IF EXISTS created_at;

-- Make minimum_threshold nullable (stock level is managed separately from purchases)
ALTER TABLE public.feed_inventory
  ALTER COLUMN minimum_threshold DROP NOT NULL,
  ALTER COLUMN minimum_threshold SET DEFAULT 0;

-- Ensure quantity_in_stock defaults to 0
ALTER TABLE public.feed_inventory
  ALTER COLUMN quantity_in_stock SET DEFAULT 0;

-- Add updated_at if missing
ALTER TABLE public.feed_inventory
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP;

-- ── 2. Create feed_purchases table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.feed_purchases (
  id                uuid        NOT NULL DEFAULT extensions.uuid_generate_v4(),
  farm_id           uuid        NOT NULL,
  feed_type_id      uuid        NOT NULL,
  quantity_kg       numeric(15,2) NOT NULL,
  cost_per_kg       numeric(12,2) NULL,
  purchase_date     date         NOT NULL DEFAULT CURRENT_DATE,
  expiry_date       date         NULL,
  supplier          text         NULL,
  batch_number      character varying(100) NULL,
  notes             text         NULL,
  created_at        timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT feed_purchases_pkey PRIMARY KEY (id),
  CONSTRAINT feed_purchases_farm_id_fkey
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  CONSTRAINT feed_purchases_feed_type_id_fkey
    FOREIGN KEY (feed_type_id) REFERENCES feed_types(id) ON DELETE CASCADE,
  CONSTRAINT feed_purchases_quantity_positive CHECK (quantity_kg > 0)
);

CREATE INDEX IF NOT EXISTS idx_feed_purchases_farm_id
  ON public.feed_purchases USING btree (farm_id);

CREATE INDEX IF NOT EXISTS idx_feed_purchases_feed_type_id
  ON public.feed_purchases USING btree (feed_type_id);

CREATE INDEX IF NOT EXISTS idx_feed_purchases_purchase_date
  ON public.feed_purchases USING btree (purchase_date);

COMMENT ON TABLE public.feed_purchases IS
  'Individual purchase/restock transactions for feed. Many rows per feed type per farm. '
  'Quantity is stored in kg. Stock level is maintained in feed_inventory.';

COMMENT ON TABLE public.feed_inventory IS
  'Current stock level per feed type per farm (one row per farm+feed_type). '
  'quantity_in_stock is updated by the application when purchases are recorded.';

-- ── 4. Recreate daily_feed_summary using feed_purchases for expiry data ───────
--
-- expiry_date moved from feed_inventory → feed_purchases (3NF: it is a property
-- of a specific batch, not of the current stock level).
-- expiring_soon_count now counts distinct feed types that have at least one
-- purchase batch expiring within the next 7 days.

CREATE MATERIALIZED VIEW public.daily_feed_summary AS
SELECT
  CURRENT_DATE                                        AS summary_date,
  fi.farm_id,
  f.name                                              AS farm_name,
  count(DISTINCT fi.feed_type_id)                     AS total_feed_types,
  count(
    DISTINCT CASE
      WHEN fi.quantity_in_stock <= fi.minimum_threshold
      THEN fi.feed_type_id
    END
  )                                                   AS low_stock_count,
  round(sum(fi.quantity_in_stock), 2)                 AS total_quantity_in_stock,
  round(
    avg(fi.quantity_in_stock / NULLIF(fi.maximum_capacity, 0) * 100),
    2
  )                                                   AS avg_capacity_percentage,
  array_agg(
    DISTINCT CASE
      WHEN fi.quantity_in_stock <= fi.minimum_threshold
      THEN jsonb_build_object(
        'feed_type_id', ft.id,
        'name',         ft.name,
        'quantity',     fi.quantity_in_stock,
        'threshold',    fi.minimum_threshold
      )
    END
  ) FILTER (WHERE fi.quantity_in_stock <= fi.minimum_threshold)
                                                      AS low_stock_alerts,
  round(
    COALESCE((
      SELECT sum(pr.milk_volume)
      FROM   production_records pr
      WHERE  pr.farm_id    = fi.farm_id
        AND  pr.record_date = CURRENT_DATE
    ), 0),
    2
  )                                                   AS today_milk_produced,
  max(fi.updated_at)                                  AS last_inventory_update,
  -- expiring_soon: feed types with any batch expiring within 7 days
  count(
    DISTINCT CASE
      WHEN EXISTS (
        SELECT 1
        FROM   feed_purchases fp
        WHERE  fp.feed_type_id = fi.feed_type_id
          AND  fp.farm_id      = fi.farm_id
          AND  fp.expiry_date IS NOT NULL
          AND  fp.expiry_date <= CURRENT_DATE + INTERVAL '7 days'
      )
      THEN fi.feed_type_id
    END
  )                                                   AS expiring_soon_count,
  CURRENT_TIMESTAMP                                   AS generated_at
FROM  feed_inventory fi
JOIN  feed_types ft ON ft.id = fi.feed_type_id
JOIN  farms      f  ON f.id  = fi.farm_id
GROUP BY fi.farm_id, f.name;

-- ── 3. Helper function: upsert stock and increment quantity atomically ────────

CREATE OR REPLACE FUNCTION public.upsert_feed_stock(
  p_farm_id      uuid,
  p_feed_type_id uuid,
  p_quantity_kg  numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO feed_inventory (farm_id, feed_type_id, quantity_in_stock, minimum_threshold, updated_at)
  VALUES (p_farm_id, p_feed_type_id, p_quantity_kg, 0, NOW())
  ON CONFLICT (farm_id, feed_type_id)
  DO UPDATE SET
    quantity_in_stock = feed_inventory.quantity_in_stock + EXCLUDED.quantity_in_stock,
    updated_at        = NOW();
END;
$$;
