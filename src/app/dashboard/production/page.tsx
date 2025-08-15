// dashboard/production/page.tsx - Combined Production & Distribution Dashboard
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getProductionStats, getProductionRecords } from '@/lib/database/production'
import { getFarmAnimals } from '@/lib/database/animals'
import { getDistributionStats, getDistributionRecords } from '@/lib/database/distribution'
import { getDistributionChannels } from '@/lib/database/channels'
import { getAvailableVolume } from '@/lib/database/inventory'
import { redirect } from 'next/navigation'
import { ProductionDistributionDashboard } from '@/components/production/ProductionDistributionDashboard'

export default async function ProductionPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  // Get both production and distribution data in parallel for better performance
  const [
    // Production data
    productionStats,
    productionRecords,
    animals,
    // Distribution data
    distributionStats,
    distributionRecords,
    channels,
    availableVolume
  ] = await Promise.all([
    // Production queries
    getProductionStats(userRole.farm_id, 30),
    getProductionRecords(userRole.farm_id, undefined, undefined, undefined),
    getFarmAnimals(userRole.farm_id),
    // Distribution queries
    getDistributionStats(userRole.farm_id, 30), // Last 30 days
    getDistributionRecords(userRole.farm_id, undefined, undefined, undefined),
    getDistributionChannels(userRole.farm_id),
    getAvailableVolume(userRole.farm_id) // Calculate available milk for distribution
  ])
  
  return (
    <div className="dashboard-container">
      <ProductionDistributionDashboard
        farmId={userRole.farm_id}
        // Production props
        productionStats={{
          ...productionStats,
          dailySummaries: productionStats.dailySummaries.map(summary => ({
            date: summary.record_date,
            volume: summary.total_milk_volume || 0,
            fat: summary.average_fat_content || 0,
            protein: summary.average_protein_content || 0
          }))
        }}
        productionRecords={productionRecords.slice(0, 10)} // Show latest 10
        animals={animals}
        // Distribution props
        distributionStats={distributionStats}
        distributionRecords={distributionRecords.slice(0, 10).map(record => ({
          ...record,
          channelType: record.channelType as "cooperative" | "processor" | "direct" | "retail",
          status: record.status as "pending" | "delivered" | "paid"
        }))} // Show latest 10 records with proper typing
        channels={channels.map(channel => ({
          id: channel.id,
          name: channel.name,
          type: channel.type as "cooperative" | "processor" | "direct" | "retail",
          contact: channel.contact,
          pricePerLiter: channel.pricePerLiter,
          isActive: channel.isActive ?? true
        }))}
        availableVolume={availableVolume}
        userRole={userRole.role_type}
      />
    </div>
  )
}