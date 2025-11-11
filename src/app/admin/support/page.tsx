//src/app/admin/support/page.tsx
import { getCurrentUser } from '@/lib/supabase/server'
import { getAllTickets } from '@/lib/database/admin'
import { redirect } from 'next/navigation'
import { SupportManagement } from '@/components/admin/SupportManagement'

export default async function AdminSupportPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/admin/auth')
  }
  
  const tickets = await getAllTickets()
  
  return (
    <div className="dashboard-container">
      <SupportManagement 
        initialTickets={tickets}
      />
    </div>
  )
}