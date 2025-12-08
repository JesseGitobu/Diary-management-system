import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getEquipment, getEquipmentStats } from '@/lib/database/equipment'
import { redirect } from 'next/navigation'
import { EquipmentManagement } from '@/components/equipment/EquipmentManagement'

export default async function EquipmentPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id) as any
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  const [equipment, equipmentStats] = await Promise.all([
    getEquipment(userRole.farm_id),
    getEquipmentStats(userRole.farm_id)
  ])
  
  return (
    <div className="dashboard-container">
      <EquipmentManagement
        farmId={userRole.farm_id}
        equipment={equipment}
        equipmentStats={equipmentStats}
        canManage={['farm_owner', 'farm_manager'].includes(userRole.role_type)}
      />
    </div>
  )
}