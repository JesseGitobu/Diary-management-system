// src/app/dashboard/production/page.tsx
import { Metadata } from 'next'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getProductionStats, getProductionRecords } from '@/lib/database/production'
import { getFarmAnimals } from '@/lib/database/animals'
import { getDistributionStats, getDistributionRecords } from '@/lib/database/distribution'
import { getDistributionChannels } from '@/lib/database/channels'
import { getAvailableVolume } from '@/lib/database/inventory'
import { getProductionSettings } from '@/lib/database/production-settings'
import { getDistributionSettings } from '@/lib/database/distribution-settings'
import { redirect } from 'next/navigation'
import { ProductionDistributionDashboard } from '@/components/production/ProductionDistributionDashboard'
import { getUserPermissions } from '@/lib/database/user-permissions'

export const metadata: Metadata = {
  title: 'Production & Distribution | DairyTrack Pro',
  description: 'Track milk production records, monitor quality metrics, manage distribution channels, and optimize sales revenue for your dairy farm.',
}

export default async function ProductionPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id) as any
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  // Get both production and distribution data in parallel for better performance
  const [
    // Production data
    productionStats,
    productionRecords,
    animals,
    productionSettings,
    // Distribution data
    distributionStats,
    distributionRecords,
    channels,
    availableVolume,
    distributionSettings,
    permissions,
  ] = await Promise.all([
    // Production queries
    getProductionStats(userRole.farm_id, 30),
    getProductionRecords(userRole.farm_id, undefined, undefined, undefined),
    getFarmAnimals(userRole.farm_id), // This returns complete animal data
    getProductionSettings(userRole.farm_id),
    // Distribution queries
    getDistributionStats(userRole.farm_id, 30),
    getDistributionRecords(userRole.farm_id, undefined, undefined, undefined),
    getDistributionChannels(userRole.farm_id),
    getAvailableVolume(userRole.farm_id),
    getDistributionSettings(userRole.farm_id),
    getUserPermissions(userRole.id, userRole.farm_id, userRole.role_type),
  ])
  
  // Note: Don't filter animals here - let the component filter based on eligibleProductionStatuses settings
  // This ensures when settings change, the animal list updates accordingly
  
  return (
    <div className="dashboard-container">
      <ProductionDistributionDashboard
        farmId={userRole.farm_id}
        // Production props - pass COMPLETE animal data - filtering happens in component
        productionStats={{
          ...productionStats,
          // Cast summary to any to fix "Property 'record_date' does not exist on type 'never'"
          dailySummaries: productionStats.dailySummaries.map((summary: any) => ({
            date: summary.record_date,
            volume: summary.total_milk_volume || 0,
            fat: summary.average_fat_content || 0,
            protein: summary.average_protein_content || 0,
            animalsMilked: summary.animals_milked || 0
          }))
        }}
        productionRecords={productionRecords}
        productionSettings={productionSettings}
        animals={animals.map(animal => ({
          id: animal.id,
          tag_number: animal.tag_number,
          name: animal.name,
          gender: animal.gender,
          production_status: animal.production_status
        }))}
        // Distribution props
        distributionStats={distributionStats}
        distributionRecords={distributionRecords.map(record => ({
          ...record,
          channelType: record.channelType as "cooperative" | "processor" | "direct" | "retail",
          status: record.status as "pending" | "delivered" | "paid"
        }))}
        channels={channels.map(channel => ({
          id: channel.id,
          name: channel.name,
          type: channel.type as "cooperative" | "processor" | "direct" | "retail",
          contact: channel.contact || "", // FIXED: Handle null value
          pricePerLiter: channel.pricePerLiter || 0, // FIXED: Handle null value
          isActive: channel.isActive ?? true
        }))}
        availableVolume={availableVolume}
        distributionSettings={distributionSettings}
        userRole={userRole.role_type}
        permissions={permissions}
      />
      
      {/* Info message for no eligible animals is now handled in the dashboard component. */}
    </div>
  )
}