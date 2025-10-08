import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getAnimalById } from '@/lib/database/animals'
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
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  const animal = await getAnimalById(id)
  
  if (!animal) {
    notFound()
  }
  
  // Verify animal belongs to user's farm
  if (animal.farm_id !== userRole.farm_id) {
    redirect('/dashboard/animals')
  }
  
  return (
    <div className="dashboard-container">
      <AnimalProfile 
        animal={animal}
        userRole={userRole.role_type}
        farmId={userRole.farm_id}
      />
    </div>
  )
}