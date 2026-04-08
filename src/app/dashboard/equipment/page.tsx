import { Metadata } from 'next'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getEquipment, getEquipmentStats } from '@/lib/database/equipment'
import { redirect } from 'next/navigation'
import { EquipmentManagement } from '@/components/equipment/EquipmentManagement'
import { getUserPermissions } from '@/lib/database/user-permissions'

export const metadata: Metadata = {
  title: 'Equipment Management | DairyTrack Pro',
  description: 'Track farm equipment, maintenance schedules, service history, and equipment performance metrics for optimal dairy farm operations.',
}

export default async function EquipmentPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id) as any
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  const [equipment, equipmentStats, permissions] = await Promise.all([
    getEquipment(userRole.farm_id),
    getEquipmentStats(userRole.farm_id),
    getUserPermissions(userRole.id, userRole.farm_id, userRole.role_type),
  ])
  
  return (
    <div className="dashboard-container">
      <EquipmentManagement
        farmId={userRole.farm_id}
        equipment={equipment}
        equipmentStats={equipmentStats}
        canManage={permissions.canManageEquipment}
      />
    </div>
  )
}