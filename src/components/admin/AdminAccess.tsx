// src/components/admin/AdminAccess.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

export function AdminAccess({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const supabase = getSupabaseClient();

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.log('Not authenticated, redirecting to login');
        router.push('/auth');
        return;
      }

      // Check if user is admin
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role_type, status')
        .eq('user_id', user.id)
        .eq('role_type', 'super_admin')
        .maybeSingle() as { data: { role_type: string; status: string } | null; error: any };

      if (roleError) {
        console.error('Error checking admin role:', roleError);
        router.push('/dashboard');
        return;
      }

      if (!userRole) {
        console.log('User is not an admin, redirecting to dashboard');
        router.push('/dashboard');
        return;
      }

      if (userRole.status !== 'active') {
        console.log('Admin account is not active');
        router.push('/dashboard');
        return;
      }

      // User is admin, allow access
      setIsAdmin(true);
      setLoading(false);
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.push('/dashboard');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '18px'
      }}>
        Checking admin access...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '18px',
        color: 'red'
      }}>
        Access denied. Admin access required.
      </div>
    );
  }

  return <>{children}</>;
}
