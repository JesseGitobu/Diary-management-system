import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getAnimalsForBreeding } from '@/lib/database/breeding'
import { redirect } from 'next/navigation'
import { RecordBreedingForm } from '@/components/breeding/RecordBreedingForm'

export default async function RecordBreedingPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id) as any
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  // Only farm owners and managers can record breeding
  if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
    redirect('/dashboard/breeding')
  }
  
  const animalsForBreeding = await getAnimalsForBreeding(userRole.farm_id)
  
  return (
    <div className="dashboard-container">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Record Breeding</h1>
          <p className="text-gray-600 mt-2">
            Record a new breeding event for your animals
          </p>
        </div>
        
        <RecordBreedingForm 
          farmId={userRole.farm_id}
          animals={animalsForBreeding}
        />
      </div>
    </div>
  )
}