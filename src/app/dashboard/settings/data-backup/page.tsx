import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getDataBackupSettings, getBackupHistory } from '@/lib/database/data-backup-settings'
import { getFarmBasicInfoServer } from '@/lib/database/settings'
import DataBackupSettings from '@/components/settings/DataBackupSettings'

export const metadata: Metadata = {
  title: 'Data Backup & Recovery | Farm Management',
  description: 'Manage farm data backups, restore points, and data recovery options',
}

interface PageProps {
  searchParams: Promise<{ farmId?: string }>
}

export default async function DataBackupPage({ searchParams }: PageProps) {
  const { farmId } = await searchParams
  if (!farmId) redirect('/dashboard')

  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')

  const userRole = await getUserRole(user.id) as any
  if (!userRole || userRole.farm_id !== farmId) redirect('/dashboard')

  const allowedRoles = ['farm_owner', 'farm_manager']
  if (!allowedRoles.includes(userRole.role_type)) {
    redirect(`/dashboard?farmId=${farmId}`)
  }

  const farmData = await getFarmBasicInfoServer(farmId)
  if (!farmData) redirect('/dashboard')

  const [settings, history] = await Promise.all([
    getDataBackupSettings(farmId),
    getBackupHistory(farmId, 10)
  ])

  return (
    <DataBackupSettings
      farmId={farmId}
      userRole={userRole.role_type}
      initialSettings={settings}
      backupHistory={history}
      farmName={farmData.name}
    />
  )
}