import { getCurrentUser } from '@/lib/supabase/server'
import { getOnboardingData } from '@/lib/database/onboarding'
import { getUserRole } from '@/lib/database/auth' // <-- Add the correct import path
import { redirect } from 'next/navigation'
import { OnboardingWelcome } from '@/components/onboarding/OnboardingWelcome'

// UPDATE the main function:
export default async function OnboardingPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole) {
    // This shouldn't happen anymore, but handle gracefully
    redirect('/auth?error=no_role')
  }
  
  // 🎯 NEW: Check if onboarding is already complete
  if (userRole.status === 'active' && userRole.farm_id) {
    redirect('/dashboard')
  }
  
  // 🎯 NEW: Ensure user is eligible for onboarding
  if (userRole.role_type !== 'farm_owner' || userRole.status !== 'pending_setup') {
    redirect('/dashboard')
  }
  
  const onboardingData = await getOnboardingData(user.id)
  
  return (
    <div className="max-w-2xl mx-auto">
      <OnboardingWelcome 
        userName={user.user_metadata?.full_name || user.email}
        onboardingData={onboardingData}
      />
    </div>
  )
}