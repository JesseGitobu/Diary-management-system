// app/dashboard/settings/health-breeding/page.tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getBreedingSettings } from '@/lib/database/breeding-settings'
import { getHealthSettings } from '@/lib/database/health-settings' // ✅ ADD THIS
import { getFarmBasicInfoServer } from '@/lib/database/settings'
import HealthBreedingSettings from '@/components/settings/health-breeding/HealthBreedingSettings'

interface PageProps {
  searchParams: Promise<{
    farmId?: string
  }>
}

export default async function HealthBreedingPage({ searchParams }: PageProps) {
  const { farmId } = await searchParams

  if (!farmId) {
    redirect('/dashboard')
  }

  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect('/auth/login')
    }

    const userRole = await getUserRole(user.id)
    if (!userRole || userRole.farm_id !== farmId) {
      redirect('/dashboard')
    }

    const allowedRoles = ['farm_owner', 'farm_manager', 'veterinarian']
    if (!allowedRoles.includes(userRole.role_type)) {
      redirect(`/dashboard?farmId=${farmId}`)
    }

    const farmData = await getFarmBasicInfoServer(farmId)
    if (!farmData) {
      redirect('/dashboard')
    }

    // ✅ Fetch BOTH settings in parallel
    const [breedingSettings, healthSettings] = await Promise.all([
      getBreedingSettings(farmId),
      getHealthSettings(farmId) // ✅ ADD THIS
    ])

    // ✅ Optional: Fetch veterinarians for the dropdown
    // const veterinarians = await getVeterinarians(farmId)

    return (
      <HealthBreedingSettings
        farmId={farmId}
        userRole={userRole.role_type}
        initialSettings={breedingSettings} // Breeding settings
        healthSettings={healthSettings} // ✅ ADD THIS - Health settings
        farmName={farmData.name}
        // veterinarians={veterinarians} // ✅ Optional
      />
    )
  } catch (error) {
    console.error('Error loading health & breeding settings:', error)
    redirect('/dashboard')
  }
}