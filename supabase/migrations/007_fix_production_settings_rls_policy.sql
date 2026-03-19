-- Fix RLS policy for production_settings table to allow authenticated users to manage their farm settings

-- First, check if RLS is enabled on production_settings
-- If RLS is too restrictive, we need to add policies

-- Drop existing policies (if any conflict)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.production_settings;
DROP POLICY IF EXISTS "Enable write access for farm members" ON public.production_settings;
DROP POLICY IF EXISTS "Allow authenticated users to read own farm settings" ON public.production_settings;
DROP POLICY IF EXISTS "Allow authenticated users to write own farm settings" ON public.production_settings;

-- Enable RLS if not already enabled
ALTER TABLE public.production_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for reading production_settings
CREATE POLICY "Allow users to read their farm's production settings"
ON public.production_settings
FOR SELECT
USING (
  farm_id IN (
    SELECT farm_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND farm_id IS NOT NULL
  )
);

-- Create policy for inserting production_settings
CREATE POLICY "Allow users to insert their farm's production settings"
ON public.production_settings
FOR INSERT
WITH CHECK (
  farm_id IN (
    SELECT farm_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND farm_id IS NOT NULL
  )
);

-- Create policy for updating production_settings
CREATE POLICY "Allow users to update their farm's production settings"
ON public.production_settings
FOR UPDATE
USING (
  farm_id IN (
    SELECT farm_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND farm_id IS NOT NULL
  )
)
WITH CHECK (
  farm_id IN (
    SELECT farm_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND farm_id IS NOT NULL
  )
);

-- Create policy for deleting production_settings
CREATE POLICY "Allow users to delete their farm's production settings"
ON public.production_settings
FOR DELETE
USING (
  farm_id IN (
    SELECT farm_id FROM public.user_roles 
    WHERE user_id = auth.uid() AND farm_id IS NOT NULL
  )
);
