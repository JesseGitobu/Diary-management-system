import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getAnimalById } from '@/lib/database/animals'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AnimalProfile } from '@/components/animals/AnimalProfile'

// FIXED: params must be a Promise in Next.js 15
interface AnimalPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AnimalPage({ params }: AnimalPageProps) {
  // Await params to get the actual values
  const { id } = await params
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id) as any
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  const animal = await getAnimalById(id) as any
  
  if (!animal) {
    notFound()
  }
  
  // Verify animal belongs to user's farm
  if (animal.farm_id !== userRole.farm_id) {
    redirect('/dashboard/animals')
  }
  
  // Fetch active lactation cycle record for the animal
  const supabase = await createServerSupabaseClient()
  const { data: lactationCycleRecord, error: lactationError } = await supabase
    .from('lactation_cycle_records')
    .select('lactation_number, days_in_milk, status')
    .eq('animal_id', id)
    .eq('status', 'active')
    .maybeSingle() as any
  
  // Log for debugging
  if (lactationError) {
    console.error(`[AnimalPage] Error fetching lactation record for animal ${id}:`, lactationError)
  } else {
    console.log(`[AnimalPage] Lactation record for animal ${id}:`, lactationCycleRecord)
  }
  
  return (
    <div className="dashboard-container">
      <AnimalProfile 
        animal={animal}
        userRole={userRole.role_type}
        farmId={userRole.farm_id}
        lactationCycleRecord={lactationCycleRecord}
      />
    </div>
  )
}