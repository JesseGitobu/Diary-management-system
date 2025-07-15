import { getCurrentUser } from '@/lib/supabase/server'
import { getOnboardingData } from '@/lib/database/onboarding'
import { redirect } from 'next/navigation'
import { GoalsSetupForm } from '@/components/onboarding/GoalsSetupForm'

export default async function GoalsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const onboardingData = await getOnboardingData(user.id)
  
  return (
    <div className="max-w-2xl mx-auto">
      <GoalsSetupForm 
        userId={user.id}
        initialData={onboardingData}
      />
    </div>
  )
}