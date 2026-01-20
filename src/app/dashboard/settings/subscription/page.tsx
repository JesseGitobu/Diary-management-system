import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getSubscriptionSettings, getPaymentHistory } from '@/lib/database/subscription-settings'
import { getFarmBasicInfoServer } from '@/lib/database/settings'
import SubscriptionSettings from '@/components/settings/SubscriptionSettings'

export const metadata: Metadata = {
  title: 'Subscription & Billing | Farm Management',
  description: 'Manage your subscription plan, billing information, and payment history',
}

interface PageProps {
  searchParams: Promise<{ farmId?: string }>
}

export default async function SubscriptionPage({ searchParams }: PageProps) {
  const { farmId } = await searchParams
  if (!farmId) redirect('/dashboard')

  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')

  const userRole = await getUserRole(user.id) as any
  if (!userRole || userRole.farm_id !== farmId) redirect('/dashboard')

  // Only farm owners can access subscription settings
  if (userRole.role_type !== 'farm_owner') {
    redirect(`/dashboard?farmId=${farmId}`)
  }

  const farmData = await getFarmBasicInfoServer(farmId)
  if (!farmData) redirect('/dashboard')

  const [subscription, paymentHistory] = await Promise.all([
    getSubscriptionSettings(farmId),
    getPaymentHistory(farmId, 10)
  ])

  return (
    <SubscriptionSettings
      farmId={farmId}
      subscription={subscription}
      paymentHistory={paymentHistory}
      farmName={farmData.name}
    />
  )
}