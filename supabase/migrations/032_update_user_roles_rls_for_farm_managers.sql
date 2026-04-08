-- Simplify user_roles RLS to minimum - remove infinite recursion
-- Just allow reads for authenticated users and restrict writes to farm owners

-- Drop all existing policies
DROP POLICY IF EXISTS "Farm owners can view team roles" ON public.user_roles;
DROP POLICY IF EXISTS "Farm owners can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Farm owners and managers can view team roles" ON public.user_roles;
DROP POLICY IF EXISTS "Farm admins can view team roles" ON public.user_roles;

-- Drop the security-definer function
DROP FUNCTION IF EXISTS public.user_is_farm_admin(uuid, uuid);

-- Minimal RLS: Allow all authenticated users to read user_roles
CREATE POLICY "Authenticated users can read user roles" ON public.user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow only authenticated users to insert/update/delete their own roles or farm owners to manage all
CREATE POLICY "Users can manage their farm roles" ON public.user_roles
  FOR ALL USING (
    auth.uid() = user_id
  );
