// src/app/dashboard/animals/page.tsx (Server Component)
import { Metadata } from 'next'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFarmAnimals, getEnhancedAnimalStats } from '@/lib/database/animals'
import { getEnrichedAnimalsData } from '@/lib/database/animals-enriched'
import { redirect } from 'next/navigation'
import { AnimalsClientPage } from '@/components/animals/AnimalsClientPage'
import { getUserPermissions } from '@/lib/database/user-permissions'

export const metadata: Metadata = {
  title: 'Herd Management | DairyTrack Pro',
  description: 'Manage your dairy herd. View animal profiles, health status, breeding records, production history, and track individual cow performance.',
}

export default async function AnimalsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id) as any
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }

  console.log('🔍 [AnimalsPage] userRole object:', { id: userRole.id, farm_id: userRole.farm_id, role_type: userRole.role_type, status: userRole.status })
  
  // Get animals, stats, enriched data and permissions in parallel
  const [animals, stats, enrichedDataResponse, permissions] = await Promise.all([
    getFarmAnimals(userRole.farm_id),
    getEnhancedAnimalStats(userRole.farm_id),
    // Fetch enriched data directly using server function (no API call needed)
    getEnrichedAnimalsData(userRole.farm_id),
    getUserPermissions(userRole.id, userRole.farm_id, userRole.role_type),
  ])

  // Build enriched data map for fast lookup by animal ID
  const enrichedDataMap = new Map()
  let weightRequirementsData: Array<{
    animal_id: string
    tag_number: string
    name?: string
    current_weight?: number
    required_weight?: number
    updated_at?: string
    needs_update?: boolean
  }> = []
  
  if (enrichedDataResponse.success && enrichedDataResponse.animals) {
    for (const enrichedAnimal of enrichedDataResponse.animals) {
      enrichedDataMap.set(enrichedAnimal.id, enrichedAnimal.enrichedData)
      // Extract weight requirements and attach animal info
      if (enrichedAnimal.enrichedData?.weightRequirements && enrichedAnimal.enrichedData.weightRequirements.length > 0) {
        weightRequirementsData.push({
          animal_id: enrichedAnimal.id,
          tag_number: enrichedAnimal.tag_number,
          name: enrichedAnimal.name,
          needs_update: true,
        })
      }
    }
  }
  
  return (
    <AnimalsClientPage
      initialAnimals={animals}
      initialStats={stats}
      farmId={userRole.farm_id}
      userRole={userRole.role_type}
      permissions={permissions}
      enrichedDataMap={Object.fromEntries(enrichedDataMap)}
      weightRequirementsData={weightRequirementsData}
    />
  )
}