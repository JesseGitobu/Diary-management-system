// src/lib/middleware/admin-guard.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function checkAdminAccess() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { isAdmin: false, error: 'Not authenticated' }
    }

    // Check if user has super_admin role
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role_type, status')
      .eq('user_id', user.id)
      .eq('role_type', 'super_admin')
      .single()

    if (roleError || !userRole) {
      return { isAdmin: false, error: 'Not an admin' }
    }

    const typedUserRole = userRole as any

    if (typedUserRole.status !== 'active') {
      return { isAdmin: false, error: 'Admin account disabled' }
    }

    return { isAdmin: true, user, error: null }
  } catch (error) {
    console.error('[ADMIN_GUARD] Error:', error)
    return { isAdmin: false, error: 'Error checking admin status' }
  }
}
