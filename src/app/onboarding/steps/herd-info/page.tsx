// src/app/onboarding/steps/farm-basics/page.tsx
import { getCurrentUser } from '@/lib/supabase/server'
import { getOnboardingData } from '@/lib/database/onboarding'
import { redirect } from 'next/navigation'
import { HerdInfoForm } from '@/components/onboarding/HerdInfoForm'

export default async function HerdInfoPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const onboardingData = await getOnboardingData(user.id)
  
  return (
    <div className="max-w-2xl mx-auto">
      <HerdInfoForm 
        userId={user.id}
        initialData={onboardingData}
      />
    </div>
  )
}