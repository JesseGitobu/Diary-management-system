import { getCurrentUser } from '@/lib/supabase/server'
import { getOnboardingData } from '@/lib/database/onboarding'
import { redirect } from 'next/navigation'
import { OnboardingWelcome } from '@/components/onboarding/OnboardingWelcome'

export default async function OnboardingPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const onboardingData = await getOnboardingData(user.id)
  
  if (onboardingData?.onboarding_completed) {
    redirect('/dashboard')
  }
  
  return (
    <div className="max-w-2xl mx-auto">
      <OnboardingWelcome 
        userName={user.user_metadata?.full_name || user.email}
        onboardingData={onboardingData}
      />
    </div>
  )
}