// app/dashboard/settings/animal-tagging/page.tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getTaggingSettings } from '@/lib/database/tagging-settings'
import { getFarmAnimals } from '@/lib/database/animals'
import AnimalTaggingSettings from '@/components/settings/animals/AnimalTaggingSettings'

interface PageProps {
  searchParams: {
    farmId?: string
  }
}

export default async function AnimalTaggingPage({ searchParams }: PageProps) {
  const { farmId } = searchParams

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

    // Check permissions - only farm_owner and farm_manager can access settings
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      redirect(`/dashboard?farmId=${farmId}`)
    }

    // Get current herd size
    const animals = await getFarmAnimals(farmId, { includeInactive: false })
    const currentHerdSize = animals.length

    // Get existing tagging settings
    const initialSettings = await getTaggingSettings(farmId)

    // Get farm name from user role (you might want to get this from farm table)
    const farmName = "Your Farm" // Replace with actual farm name retrieval

    return (
      <AnimalTaggingSettings
        farmId={farmId}
        userRole={userRole.role_type}
        currentHerdSize={currentHerdSize}
        initialSettings={initialSettings}
        farmName={farmName}
      />
    )
  } catch (error) {
    console.error('Error loading animal tagging settings:', error)
    redirect('/dashboard')
  }
}