// dashboard/settings/notifications/page.tsx
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getNotificationSettings } from '@/lib/database/settings'
import { NotificationsSettings } from '@/components/settings/NotificationsSettings'

export const metadata: Metadata = {
  title: 'Notifications Settings | Farm Management',
  description: 'Configure your notification preferences and alert settings',
}



export default async function NotificationsPage() {
  const user = await getCurrentUser()
  
    if (!user) {
      redirect('/auth')
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      redirect('/dashboard')
    }
  

  // Get notification settings
  const notificationSettings = await getNotificationSettings(userRole.farm_id, user.id)

  return (
    <NotificationsSettings
      farmId={userRole.farm_id}
      userRole={userRole.role_type}
      initialSettings={notificationSettings}
    />
  )
}