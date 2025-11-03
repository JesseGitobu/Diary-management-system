// dashboard/production/page.tsx - Updated to pass complete animal data
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
    getFarmAnimals(userRole.farm_id), // This returns complete animal data
    // Distribution queries
    getDistributionStats(userRole.farm_id, 30),
    getDistributionRecords(userRole.farm_id, undefined, undefined, undefined),
    getDistributionChannels(userRole.farm_id),
    getAvailableVolume(userRole.farm_id)
  ])
  
  // Filter eligible animals for production (only lactating females)
  const productionEligibleAnimals = animals.filter(animal => 
    animal.gender === 'female' && 
    animal.production_status === 'lactating'
  )
  
  return (
    <div className="dashboard-container">
      <ProductionDistributionDashboard
        farmId={userRole.farm_id}
        // Production props - pass complete animal data with all fields
        productionStats={{
          ...productionStats,
          dailySummaries: productionStats.dailySummaries.map(summary => ({
            date: summary.record_date,
            volume: summary.total_milk_volume || 0,
            fat: summary.average_fat_content || 0,
            protein: summary.average_protein_content || 0
          }))
        }}
        productionRecords={productionRecords.slice(0, 10)}
        animals={productionEligibleAnimals.map(animal => ({
          id: animal.id,
          tag_number: animal.tag_number,
          name: animal.name,
          gender: animal.gender,
          production_status: animal.production_status
        }))}
        // Distribution props
        distributionStats={distributionStats}
        distributionRecords={distributionRecords.slice(0, 10).map(record => ({
          ...record,
          channelType: record.channelType as "cooperative" | "processor" | "direct" | "retail",
          status: record.status as "pending" | "delivered" | "paid"
        }))}
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
      
      {/* Show info message if no eligible animals */}
      {productionEligibleAnimals.length === 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>No lactating animals:</strong> You need animals with "Lactating" production status to record milk production. 
                Update your animals' production status in the Animals section.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}