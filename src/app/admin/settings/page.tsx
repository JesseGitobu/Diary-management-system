// ==========================================
// src/app/admin/settings/page.tsx
// ==========================================
import { getCurrentAdmin } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSettings } from '@/components/admin/AdminSettings'

export default async function AdminSettingsPage() {
  const user = await getCurrentAdmin()
  
  if (!user) {
    redirect('/admin/auth')
  }
  
  return (
    <div className="dashboard-container">
      <AdminSettings />
    </div>
  )
}