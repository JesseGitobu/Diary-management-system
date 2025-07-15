import { getCurrentUser } from '@/lib/supabase/server'
import { getOnboardingData } from '@/lib/database/onboarding'
import { redirect } from 'next/navigation'
import { TrackingSetupForm } from '@/components/onboarding/TrackingSetupForm'

export default async function TrackingSetupPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const onboardingData = await getOnboardingData(user.id)
  
  return (
    <div className="max-w-2xl mx-auto">
      <TrackingSetupForm 
        userId={user.id}
        initialData={onboardingData}
      />
    </div>
  )
}