// app/dashboard/settings/animal-tagging/page.tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getTaggingSettings } from '@/lib/database/tagging-settings'
import { getFarmAnimals } from '@/lib/database/animals'
// Import the function to get animal categories
import { getAnimalCategories } from '@/lib/database/feedManagementSettings' 
import AnimalTaggingSettings from '@/components/settings/animals/AnimalTaggingSettings'

// FIXED: searchParams must be a Promise in Next.js 15
interface PageProps {
  searchParams: Promise<{
    farmId?: string
  }>
}

export default async function AnimalTaggingPage({ searchParams }: PageProps) {
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
    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      redirect('/dashboard')
    }

    // Check permissions - only farm_owner and farm_manager can access settings
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      redirect(`/dashboard?farmId=${farmId}`)
    }

    // Fetch all required data in parallel for efficiency
    const [
      animals, 
      initialSettings, 
      initialAnimalCategories
    ] = await Promise.all([
      getFarmAnimals(farmId, { includeInactive: false }),
      getTaggingSettings(farmId),
      getAnimalCategories(farmId) // Fetch the animal categories here
    ]);
    
    const currentHerdSize = animals.length

    // Get farm name from user role (you might want to get this from farm table)
    const farmName = "Your Farm" // Replace with actual farm name retrieval

    return (
      <AnimalTaggingSettings
        farmId={farmId}
        userRole={userRole.role_type}
        currentHerdSize={currentHerdSize}
        initialSettings={initialSettings}
        farmName={farmName}
        // Pass the fetched animal categories as a prop
        initialAnimalCategories={initialAnimalCategories}
      />
    )
  } catch (error) {
    console.error('Error loading animal tagging settings:', error)
    redirect('/dashboard')
  }
}