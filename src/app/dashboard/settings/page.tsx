// dashboard/settings/page.tsx
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFarmBasicInfoServer } from '@/lib/database/settings'
import { SettingsMainPage } from '@/components/settings/SettingsMainPage'

export const metadata: Metadata = {
  title: 'Settings | Farm Management',
  description: 'Configure your farm settings and preferences',
}


export default async function SettingsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)   as any
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }

  // Get farm basic info
  const farmData = await getFarmBasicInfoServer(userRole.farm_id)
  if (!farmData) {
    redirect('/dashboard')
  } 

  return (
    <SettingsMainPage
      farmId={userRole.farm_id}
      userRole={userRole.role_type}
      farmData={farmData}
    />
  )
}

