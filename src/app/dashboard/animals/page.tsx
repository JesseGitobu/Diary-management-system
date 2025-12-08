// src/app/dashboard/animals/page.tsx (Server Component)
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFarmAnimals, getEnhancedAnimalStats } from '@/lib/database/animals'
import { redirect } from 'next/navigation'
import { AnimalsClientPage } from '@/components/animals/AnimalsClientPage'

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
  
  // Get animals and enhanced statistics
  const [animals, stats] = await Promise.all([
    getFarmAnimals(userRole.farm_id),
    getEnhancedAnimalStats(userRole.farm_id)
  ])
  
  return (
    <AnimalsClientPage
      initialAnimals={animals}
      initialStats={stats}
      farmId={userRole.farm_id}
      userRole={userRole.role_type}
    />
  )
}