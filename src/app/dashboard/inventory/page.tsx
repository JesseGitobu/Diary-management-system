// src/app/inventory/page.tsx
import { Metadata } from 'next'
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
import { getUserPermissions } from '@/lib/database/user-permissions'

export const metadata: Metadata = {
  title: 'Inventory & Equipment | DairyTrack Pro',
  description: 'Manage farm equipment and supplies inventory. Track equipment status, maintenance schedules, supplier management, and low stock alerts.',
}

export default async function InventoryPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id) as any
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  // Fetch both inventory and supplier data
  const [inventoryItems, inventoryStats, inventoryAlerts, suppliers, supplierStats, permissions] = await Promise.all([
    getInventoryItems(userRole.farm_id),
    getInventoryStats(userRole.farm_id),
    getInventoryAlerts(userRole.farm_id),
    getSuppliers(userRole.farm_id),
    getSupplierStats(userRole.farm_id),
    getUserPermissions(userRole.id, userRole.farm_id, userRole.role_type),
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
        canManage={permissions.canManageInventory}
      />
    </div>
  )
}