// src/app/inventory/page.tsx
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { 
  getInventoryItems, 
  getInventoryStats, 
  getInventoryAlerts,
  getSuppliers,
  getSupplierStats
} from '@/lib/database/inventory'
import { redirect } from 'next/navigation'
import { UnifiedInventoryDashboard } from '@/components/inventory/InventoryDashboard'

export default async function InventoryPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  // Fetch both inventory and supplier data
  const [
    inventoryItems, 
    inventoryStats, 
    inventoryAlerts,
    suppliers,
    supplierStats
  ] = await Promise.all([
    getInventoryItems(userRole.farm_id),
    getInventoryStats(userRole.farm_id),
    getInventoryAlerts(userRole.farm_id),
    getSuppliers(userRole.farm_id),
    getSupplierStats(userRole.farm_id)
  ])
  
  return (
    <div className="dashboard-container">
      <UnifiedInventoryDashboard
        farmId={userRole.farm_id}
        inventoryItems={inventoryItems}
        inventoryStats={inventoryStats}
        inventoryAlerts={inventoryAlerts}
        suppliers={suppliers}
        supplierStats={supplierStats}
        canManage={['farm_owner', 'farm_manager'].includes(userRole.role_type)}
      />
    </div>
  )
}