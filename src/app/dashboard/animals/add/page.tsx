import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { redirect } from 'next/navigation'
import { AddAnimalForm } from '@/components/animals/AddAnimalForm'

export default async function AddAnimalPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  return (
    <div className="dashboard-container">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add New Animal</h1>
          <p className="text-gray-600 mt-2">
            Add a new animal to your herd
          </p>
        </div>
        
        <AddAnimalForm farmId={userRole.farm_id} />
      </div>
    </div>
  )
}