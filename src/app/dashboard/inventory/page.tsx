import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getInventoryItems, getInventoryStats, getInventoryAlerts } from '@/lib/database/inventory'
import { redirect } from 'next/navigation'
import { InventoryDashboard } from '@/components/inventory/InventoryDashboard'

export default async function InventoryPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  const [inventoryItems, inventoryStats, inventoryAlerts] = await Promise.all([
    getInventoryItems(userRole.farm_id),
    getInventoryStats(userRole.farm_id),
    getInventoryAlerts(userRole.farm_id)
  ])
  
  return (
    <div className="dashboard-container">
      <InventoryDashboard
        farmId={userRole.farm_id}
        inventoryItems={inventoryItems}
        inventoryStats={inventoryStats}
        inventoryAlerts={inventoryAlerts}
        canManage={['farm_owner', 'farm_manager'].includes(userRole.role_type)}
      />
    </div>
  )
}