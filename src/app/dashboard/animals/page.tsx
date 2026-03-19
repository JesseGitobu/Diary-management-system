// src/app/dashboard/animals/page.tsx (Server Component)
import { Metadata } from 'next'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFarmAnimals, getEnhancedAnimalStats } from '@/lib/database/animals'
import { redirect } from 'next/navigation'
import { AnimalsClientPage } from '@/components/animals/AnimalsClientPage'

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

  console.log('Fetching animals for farm:', userRole.farm_id)
  
  // Get animals and enhanced statistics in parallel
  const [animals, stats, enrichedDataResponse] = await Promise.all([
    getFarmAnimals(userRole.farm_id),
    getEnhancedAnimalStats(userRole.farm_id),
    // Fetch enriched data (breeding records, weight requirements, health status) in ONE call
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/animals/batch-enriched-data?farmId=${userRole.farm_id}`)
      .then(res => res.json())
      .catch(err => {
        console.error('Failed to fetch enriched data:', err)
        return { success: false, animals: [] }
      })
  ])

  // Build enriched data map for fast lookup by animal ID
  const enrichedDataMap = new Map()
  let weightRequirementsData = []
  
  if (enrichedDataResponse.success && enrichedDataResponse.animals) {
    for (const enrichedAnimal of enrichedDataResponse.animals) {
      enrichedDataMap.set(enrichedAnimal.id, enrichedAnimal.enrichedData)
    }
  }
  
  // ✅ Extract weight requirements from batch response
  if (enrichedDataResponse.success && enrichedDataResponse.weightRequirements) {
    weightRequirementsData = enrichedDataResponse.weightRequirements
  }
  
  return (
    <AnimalsClientPage
      initialAnimals={animals}
      initialStats={stats}
      farmId={userRole.farm_id}
      userRole={userRole.role_type}
      enrichedDataMap={Object.fromEntries(enrichedDataMap)}
      weightRequirementsData={weightRequirementsData}
    />
  )
}