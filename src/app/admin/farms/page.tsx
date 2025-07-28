import { getCurrentUser } from '@/lib/supabase/server'
import { getAllFarms } from '@/lib/database/admin'
import { redirect } from 'next/navigation'
import { FarmManagement } from '@/components/admin/FarmManagement'

export default async function AdminFarmsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/admin/auth')
  }
  
  const { farms, count } = await getAllFarms(50, 0)
  
  return (
    <div className="dashboard-container">
      <FarmManagement 
        initialFarms={farms}
        totalCount={count}
      />
    </div>
  )
}