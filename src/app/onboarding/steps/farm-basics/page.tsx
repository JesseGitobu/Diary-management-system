import { getCurrentUser } from '@/lib/supabase/server'
import { getOnboardingData } from '@/lib/database/onboarding'
import { redirect } from 'next/navigation'
import { FarmBasicsForm } from '@/components/onboarding/FarmBasicsForm'

export default async function FarmBasicsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const onboardingData = await getOnboardingData(user.id)
  
  return (
    <div className="max-w-2xl mx-auto">
      <FarmBasicsForm 
        userId={user.id}
        initialData={onboardingData}
      />
    </div>
  )
}