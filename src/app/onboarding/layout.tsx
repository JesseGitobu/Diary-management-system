// src/app/onboarding/layout.tsx
import { getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <OnboardingHeader />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}