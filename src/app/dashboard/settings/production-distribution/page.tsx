// app/dashboard/settings/production-distribution/page.tsx

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getProductionSettings } from '@/lib/database/production-settings'
import { getDistributionSettings } from '@/lib/database/distribution-settings'
import { getFarmBasicInfoServer } from '@/lib/database/settings'
import ProductionDistributionSettings from '@/components/settings/production-distribution/ProductionDistributionSettings'

interface PageProps {
  searchParams: Promise<{
    farmId?: string
  }>
}

export default async function ProductionDistributionPage({ searchParams }: PageProps) {
  const { farmId } = await searchParams

  if (!farmId) {
    redirect('/dashboard')
  }

  try {
    const user = await getCurrentUser()
    if (!user) {
      redirect('/auth/login')
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      redirect('/dashboard')
    }

    // Check permissions - farm_owner and farm_manager can access
    const allowedRoles = ['farm_owner', 'farm_manager']
    if (!allowedRoles.includes(userRole.role_type)) {
      redirect(`/dashboard?farmId=${farmId}`)
    }

    const farmData = await getFarmBasicInfoServer(farmId)
    if (!farmData) {
      redirect('/dashboard')
    }

    // Fetch BOTH settings in parallel
    const [productionSettings, distributionSettings] = await Promise.all([
      getProductionSettings(farmId),
      getDistributionSettings(farmId)
    ])

    return (
      <ProductionDistributionSettings
        farmId={farmId}
        userRole={userRole.role_type}
        productionSettings={productionSettings}
        distributionSettings={distributionSettings}
        farmName={farmData.name}
      />
    )
  } catch (error) {
    console.error('Error loading production & distribution settings:', error)
    redirect('/dashboard')
  }
}