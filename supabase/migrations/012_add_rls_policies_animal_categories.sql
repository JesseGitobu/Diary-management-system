-- Migration 012: Add Row-Level Security (RLS) Policies for animal_categories
-- Purpose: Enable authenticated users to manage animal categories for their farm
-- RLS policies control who can SELECT, INSERT, UPDATE, DELETE based on farm_id

-- ============================================
-- 1. ENABLE RLS ON animal_categories TABLE
-- ============================================
ALTER TABLE public.animal_categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. DROP EXISTING POLICIES (if any)
-- ============================================
DROP POLICY IF EXISTS "Users can view their farm's animal categories" ON public.animal_categories;
DROP POLICY IF EXISTS "Users can create animal categories for their farm" ON public.animal_categories;
DROP POLICY IF EXISTS "Users can update their farm's animal categories" ON public.animal_categories;
DROP POLICY IF EXISTS "Users can delete their farm's animal categories" ON public.animal_categories;

-- ============================================
-- 3. SELECT POLICY - View categories for user's farm
-- ============================================
CREATE POLICY "Users can view their farm's animal categories"
  ON public.animal_categories
  FOR SELECT
  USING (
    farm_id = (
      SELECT farm_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- ============================================
-- 4. INSERT POLICY - Create new categories
-- ============================================
CREATE POLICY "Users can create animal categories for their farm"
  ON public.animal_categories
  FOR INSERT
  WITH CHECK (
    farm_id = (
      SELECT farm_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
    AND auth.uid() IS NOT NULL
  );

-- ============================================
-- 5. UPDATE POLICY - Edit existing categories
-- ============================================
CREATE POLICY "Users can update their farm's animal categories"
  ON public.animal_categories
  FOR UPDATE
  USING (
    farm_id = (
      SELECT farm_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    farm_id = (
      SELECT farm_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- ============================================
-- 6. DELETE POLICY - Remove categories
-- ============================================
CREATE POLICY "Users can delete their farm's animal categories"
  ON public.animal_categories
  FOR DELETE
  USING (
    farm_id = (
      SELECT farm_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- ============================================
-- 7. DOCUMENTATION
-- ============================================
COMMENT ON TABLE public.animal_categories IS 
'Animal category definitions for filtering and grouping animals with dynamic characteristics and milking schedules. Protected by RLS policies tied to farm_id.';
