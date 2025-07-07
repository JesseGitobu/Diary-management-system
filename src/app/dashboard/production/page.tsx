import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getProductionStats, getProductionRecords } from '@/lib/database/production'
import { getFarmAnimals } from '@/lib/database/animals'
import { redirect } from 'next/navigation'
import { ProductionDashboard } from '@/components/production/ProductionDashboard'

export default async function ProductionPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  // Get production data
  const [productionStats, recentRecords, animals] = await Promise.all([
    getProductionStats(userRole.farm_id, 30),
    getProductionRecords(userRole.farm_id, undefined, undefined, undefined),
    getFarmAnimals(userRole.farm_id)
  ])
  
  return (
    <div className="dashboard-container">
      <ProductionDashboard
        farmId={userRole.farm_id}
        productionStats={productionStats}
        recentRecords={recentRecords.slice(0, 10)} // Show latest 10
        animals={animals}
        userRole={userRole.role_type}
      />
    </div>
  )
}