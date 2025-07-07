import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { redirect } from 'next/navigation'
import { PregnancyCheckForm } from '@/components/breeding/PregnancyCheckForm'

export default async function PregnancyCheckPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  // Only farm owners and managers can update pregnancy status
  if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
    redirect('/dashboard/breeding')
  }
  
  return (
    <div className="dashboard-container">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pregnancy Check</h1>
          <p className="text-gray-600 mt-2">
            Update pregnancy status for bred animals
          </p>
        </div>
        
        <PregnancyCheckForm farmId={userRole.farm_id} />
      </div>
    </div>
  )
}