import { getCurrentUser } from '@/lib/supabase/server'
import { getOnboardingData } from '@/lib/database/onboarding'
import { redirect } from 'next/navigation'
import { OnboardingSummary } from '@/components/onboarding/OnboardingSummary'

export default async function SummaryPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const onboardingData = await getOnboardingData(user.id)
  
  return (
    <div className="max-w-2xl mx-auto">
      <OnboardingSummary 
        userId={user.id}
        data={onboardingData}
      />
    </div>
  )
}