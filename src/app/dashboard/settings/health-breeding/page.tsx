// app/dashboard/settings/health-breeding/page.tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getBreedingSettings } from '@/lib/database/breeding-settings'
import { getFarmBasicInfoServer } from '@/lib/database/settings'
import HealthBreedingSettings from '@/components/settings/health-breeding/HealthBreedingSettings'

// FIXED: searchParams must be a Promise in Next.js 15
interface PageProps {
  searchParams: Promise<{
    farmId?: string
  }>
}

export default async function HealthBreedingPage({ searchParams }: PageProps) {
  // Await searchParams to get the actual values
  const { farmId } = await searchParams

  if (!farmId) {
    redirect('/dashboard')
  }

  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      redirect('/auth/login')
    }

    // Get user role and verify access
    const userRole = await getUserRole(user.id)
    if (!userRole || userRole.farm_id !== farmId) {
      redirect('/dashboard')
    }

    // Check permissions - farm_owner, farm_manager, and veterinarian can access
    const allowedRoles = ['farm_owner', 'farm_manager', 'veterinarian']
    if (!allowedRoles.includes(userRole.role_type)) {
      redirect(`/dashboard?farmId=${farmId}`)
    }

    // Get farm basic info
    const farmData = await getFarmBasicInfoServer(farmId)
    if (!farmData) {
      redirect('/dashboard')
    }

    // Get existing breeding settings
    const initialSettings = await getBreedingSettings(farmId)

    return (
      <HealthBreedingSettings
        farmId={farmId}
        userRole={userRole.role_type}
        initialSettings={initialSettings}
        farmName={farmData.name}
      />
    )
  } catch (error) {
    console.error('Error loading health & breeding settings:', error)
    redirect('/dashboard')
  }
}