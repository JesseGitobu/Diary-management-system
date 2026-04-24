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
import { getStorageLocations, getStorageStats } from '@/lib/database/storage'
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
  
  const [
    inventoryItems,
    inventoryStats,
    inventoryAlerts,
    suppliers,
    supplierStats,
    storageLocations,
    rawStorageStats,
    permissions,
  ] = await Promise.all([
    getInventoryItems(userRole.farm_id),
    getInventoryStats(userRole.farm_id),
    getInventoryAlerts(userRole.farm_id),
    getSuppliers(userRole.farm_id),
    getSupplierStats(userRole.farm_id),
    getStorageLocations(userRole.farm_id),
    getStorageStats(userRole.farm_id),
    getUserPermissions(userRole.id, userRole.farm_id, userRole.role_type),
  ])

  // Adapt stats shape to what the dashboard expects
  const storageStats = {
    totalStorageLocations: rawStorageStats.active,
    storageByType:         rawStorageStats.byType,
  }
  
  return (
    <div className="dashboard-container">
      <UnifiedInventoryDashboard
        farmId={userRole.farm_id}
        inventoryItems={inventoryItems}
        inventoryStats={inventoryStats}
        inventoryAlerts={inventoryAlerts}
        suppliers={suppliers}
        supplierStats={supplierStats}
        storage={storageLocations}
        storageStats={storageStats}
        canManage={permissions.canManageInventory}
      />
    </div>
  )
}