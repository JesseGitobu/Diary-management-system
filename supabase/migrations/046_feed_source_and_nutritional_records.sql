-- Migration 046: Add feed source tracking and nutritional records table
--
-- Changes:
--   1. feed_purchases: add source column (purchased | produced)
--      - 'purchased'  = bought from a supplier
--      - 'produced'   = grown / harvested on the farm
--      Supplier, cost, and batch fields are only meaningful for 'purchased' rows.
--
--   2. feed_nutritional_records: new 3NF table
--      Nutritional measurements captured per stock entry for feed types whose
--      category has collect_nutritional_data = true.
--      Keeping this separate from feed_purchases/feed_inventory satisfies 3NF:
--      nutritional values are a fact about a specific batch of feed, not about
--      the feed type definition or the current stock level.

-- ── 1. Add source to feed_purchases ──────────────────────────────────────────

ALTER TABLE public.feed_purchases
  ADD COLUMN IF NOT EXISTS source character varying(20) NOT NULL DEFAULT 'purchased'
    CONSTRAINT feed_purchases_source_check CHECK (source IN ('purchased', 'produced'));

COMMENT ON COLUMN public.feed_purchases.source IS
  'purchased = bought from a supplier; produced = grown/harvested on the farm';

-- Supplier, batch_number, cost_per_kg are only relevant when source = purchased.
-- Enforced at the application layer (modal hides them for produced).

-- ── 2. Create feed_nutritional_records table ──────────────────────────────────
--
-- 3NF justification:
--   - feed_types.nutritional_value stores the *typical/reference* nutrition profile
--   - feed_nutritional_records stores the *actual measured* values for a specific
--     purchase or harvest batch (a different functional dependency)
--   - These two facts belong in separate tables

CREATE TABLE IF NOT EXISTS public.feed_nutritional_records (
  id               uuid          NOT NULL DEFAULT extensions.uuid_generate_v4(),
  farm_id          uuid          NOT NULL,
  feed_purchase_id uuid          NOT NULL,   -- links to the specific batch
  feed_type_id     uuid          NOT NULL,   -- denormalised for query convenience
  protein_pct      numeric(6,2)  NULL,       -- protein %
  fat_pct          numeric(6,2)  NULL,       -- fat %
  fiber_pct        numeric(6,2)  NULL,       -- crude fibre %
  moisture_pct     numeric(6,2)  NULL,       -- moisture %
  ash_pct          numeric(6,2)  NULL,       -- ash / mineral content %
  energy_mj_kg     numeric(8,2)  NULL,       -- metabolisable energy MJ/kg
  dry_matter_pct   numeric(6,2)  NULL,       -- dry matter %
  ndf_pct          numeric(6,2)  NULL,       -- neutral detergent fibre %
  adf_pct          numeric(6,2)  NULL,       -- acid detergent fibre %
  notes            text          NULL,
  recorded_at      timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT feed_nutritional_records_pkey PRIMARY KEY (id),
  CONSTRAINT feed_nutritional_records_farm_fkey
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  CONSTRAINT feed_nutritional_records_purchase_fkey
    FOREIGN KEY (feed_purchase_id) REFERENCES feed_purchases(id) ON DELETE CASCADE,
  CONSTRAINT feed_nutritional_records_feed_type_fkey
    FOREIGN KEY (feed_type_id) REFERENCES feed_types(id) ON DELETE CASCADE,

  -- Each purchase batch has at most one nutritional record
  CONSTRAINT feed_nutritional_records_purchase_unique UNIQUE (feed_purchase_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_nutritional_feed_type
  ON public.feed_nutritional_records USING btree (feed_type_id);

CREATE INDEX IF NOT EXISTS idx_feed_nutritional_farm_id
  ON public.feed_nutritional_records USING btree (farm_id);

COMMENT ON TABLE public.feed_nutritional_records IS
  'Actual measured nutritional values for a specific purchase or harvest batch of feed. '
  'Separate from feed_types.nutritional_value (which stores the reference/typical profile). '
  'Only collected for feed types whose category has collect_nutritional_data = true.';
