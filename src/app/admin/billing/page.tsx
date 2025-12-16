//src/app/admin/billing/page.tsx
import { getCurrentAdmin } from '@/lib/supabase/server'
import { getBillingOverview } from '@/lib/database/admin'
import { redirect } from 'next/navigation'
import { BillingManagement } from '@/components/admin/BillingManagement'

export default async function AdminBillingPage() {
  const user = await getCurrentAdmin()
  
  if (!user) {
    redirect('/admin/auth')
  }
  
  const billingOverview = await getBillingOverview()
  
  return (
    <div className="dashboard-container">
      <BillingManagement 
        billingOverview={billingOverview}
      />
    </div>
  )
}