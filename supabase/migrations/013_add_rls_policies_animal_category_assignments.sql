-- Migration 013: Add Row-Level Security (RLS) Policies for animal_category_assignments
-- Purpose: Enable authenticated users to manage animal category assignments for their farm
-- RLS policies control who can SELECT, INSERT, UPDATE, DELETE based on farm_id

-- ============================================
-- 1. ENABLE RLS ON animal_category_assignments TABLE
-- ============================================
ALTER TABLE public.animal_category_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. DROP EXISTING POLICIES (if any)
-- ============================================
DROP POLICY IF EXISTS "Users can view their farm's animal category assignments" ON public.animal_category_assignments;
DROP POLICY IF EXISTS "Users can create animal category assignments for their farm" ON public.animal_category_assignments;
DROP POLICY IF EXISTS "Users can update their farm's animal category assignments" ON public.animal_category_assignments;
DROP POLICY IF EXISTS "Users can delete their farm's animal category assignments" ON public.animal_category_assignments;

-- ============================================
-- 3. SELECT POLICY - View assignments for user's farm
-- ============================================
CREATE POLICY "Users can view their farm's animal category assignments"
  ON public.animal_category_assignments
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
-- 4. INSERT POLICY - Create new assignments
-- ============================================
CREATE POLICY "Users can create animal category assignments for their farm"
  ON public.animal_category_assignments
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
-- 5. UPDATE POLICY - Edit existing assignments (including soft deletes)
-- ============================================
CREATE POLICY "Users can update their farm's animal category assignments"
  ON public.animal_category_assignments
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
-- 6. DELETE POLICY - Remove assignments
-- ============================================
CREATE POLICY "Users can delete their farm's animal category assignments"
  ON public.animal_category_assignments
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
COMMENT ON TABLE public.animal_category_assignments IS 
'Track which animals are assigned to specific categories. Includes manual assignments and automatic sync assignments. Uses soft deletes via removed_at field. Protected by RLS policies tied to farm_id.';
