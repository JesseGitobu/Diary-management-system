// dashboard/settings/farm-profile/page.tsx
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFarmProfileDataServer } from '@/lib/database/settings'
import { FarmProfileSettings } from '@/components/settings/FarmProfileSettings'

export const metadata: Metadata = {
  title: 'Farm Profile Settings | Farm Management',
  description: 'Manage your farm profile and basic information',
}



export default async function FarmProfilePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }

  // Get farm profile data
  const farmProfileData = await getFarmProfileDataServer(userRole.farm_id,)

  if (!farmProfileData) {
    redirect('/dashboard')
  }

  // Validate farm_type
  if (!['Dairy', 'cooperative', 'commercial'].includes(farmProfileData.farm_type)) {
    farmProfileData.farm_type = 'Dairy' // Set default value if invalid
  }

  // Validate preferred_currency
  if (!['KSH', 'USD'].includes(farmProfileData.preferred_currency)) {
    farmProfileData.preferred_currency = 'KSH' // Set default value if invalid
  }

  // Validate preferred_volume_unit
  if (!['liters', 'gallons'].includes(farmProfileData.preferred_volume_unit)) {
    farmProfileData.preferred_volume_unit = 'liters' // Set default value if invalid
  }

  return (
    <FarmProfileSettings
      farmId={userRole.farm_id}
      userRole={userRole.role_type}
      initialData={{
        ...farmProfileData,
        farm_type: farmProfileData.farm_type as 'Dairy' | 'cooperative' | 'commercial',
        preferred_currency: farmProfileData.preferred_currency as 'KSH' | 'USD',
        preferred_volume_unit: farmProfileData.preferred_volume_unit as 'liters' | 'gallons'
      }}
    />
  )
}