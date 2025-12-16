// src/app/admin/audit/page.tsx
import { getCurrentAdmin } from '@/lib/supabase/server'
import { getAuditLogs } from '@/lib/database/admin'
import { redirect } from 'next/navigation'
import { AuditLogs } from '@/components/admin/AuditLogs'

export default async function AdminAuditPage() {
  const user = await getCurrentAdmin()
  
  if (!user) {
    redirect('/admin/auth')
  }
  
  const logs = await getAuditLogs()
  
  return (
    <div className="dashboard-container">
      <AuditLogs logs={logs} />
    </div>
  )
}