// src/app/dashboard/settings/farm-profile/page.tsx
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFarmProfileDataServer } from '@/lib/database/settings'
import { FarmProfileSettings } from '@/components/settings/FarmProfileSettings'

export const metadata: Metadata = {
  title: 'Farm Profile Settings | Farm Management',
  description: 'Manage your farm profile and basic information',
}

export default async function FarmProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ farmId?: string }>
}) {
  // ✅ FIX: Await searchParams in Next.js 15
  const params = await searchParams
  
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole) {
    redirect('/auth')
  }

  // 🎯 CRITICAL FIX: Properly handle null/undefined values
  // Convert string 'null' or 'undefined' to actual null
  const sanitizeFarmId = (id: string | null | undefined): string | null => {
    if (!id || id === 'null' || id === 'undefined' || id === '') {
      return null
    }
    return id
  }

  const userFarmId = sanitizeFarmId(userRole.farm_id)
  const paramFarmId = sanitizeFarmId(params.farmId)
  
  // 🎯 ENHANCED: Determine the effective farm ID
  const effectiveFarmId = userFarmId || paramFarmId
  const isNewFarm = !effectiveFarmId

  console.log('🔍 Farm profile page:', { 
    userId: user.id,
    userRole: userRole.role_type,
    userFarmId,
    paramFarmId,
    effectiveFarmId,
    isNewFarm 
  })

  // Get farm profile data if farm exists
  let farmProfileData = null
  
  if (effectiveFarmId) {
    try {
      farmProfileData = await getFarmProfileDataServer(effectiveFarmId)
      
      if (!farmProfileData) {
        console.log('⚠️ No farm profile data found for farm:', effectiveFarmId)
        // Don't redirect, let the form load with defaults
      }
    } catch (error) {
      console.error('❌ Error fetching farm profile data:', error)
      // Continue with null data, form will show defaults
    }
  } else {
    console.log('ℹ️ No farm ID available, showing new farm form')
  }

  // 🎯 IMPROVED: Map farm_type correctly between database and UI
  const mapFarmType = (dbType: string | null | undefined): 'Dairy Cattle' | 'Dairy Goat' | 'Mixed Dairy' => {
    if (!dbType) return 'Dairy Cattle'
    
    const typeMap: Record<string, 'Dairy Cattle' | 'Dairy Goat' | 'Mixed Dairy'> = {
      'dairy': 'Dairy Cattle',
      'dairy_cattle': 'Dairy Cattle',
      'Dairy': 'Dairy Cattle',
      'Dairy Cattle': 'Dairy Cattle',
      'dairy_goat': 'Dairy Goat',
      'Dairy Goat': 'Dairy Goat',
      'mixed_dairy': 'Mixed Dairy',
      'Mixed Dairy': 'Mixed Dairy',
      'cooperative': 'Mixed Dairy',
      'commercial': 'Dairy Cattle'
    }
    return typeMap[dbType] || 'Dairy Cattle'
  }

  // 🎯 COMPREHENSIVE: Prepare data with proper defaults and type mapping
  const defaultData = {
    name: farmProfileData?.name || 'My Farm',
    owner_name: farmProfileData?.owner_name || user.user_metadata?.full_name || 'Farm Owner',
    owner_phone: farmProfileData?.owner_phone || '+254700000000',
    owner_email: farmProfileData?.owner_email || user.email || 'owner@farm.com',
    farm_size_acres: farmProfileData?.farm_size_acres ?? 0,
    total_cows: farmProfileData?.total_cows ?? 0,
    farm_type: mapFarmType(farmProfileData?.farm_type),
    county: farmProfileData?.county || 'Nairobi',
    sub_county: farmProfileData?.sub_county || '',
    village: farmProfileData?.village || '',
    preferred_currency: (farmProfileData?.preferred_currency || 'KSH') as 'KSH' | 'USD',
    preferred_volume_unit: (farmProfileData?.preferred_volume_unit || 'liters') as 'liters' | 'gallons',
    description: farmProfileData?.description || ''
  }

  // 🎯 VALIDATION: Ensure all enums are valid
  // Validate farm_type
  if (!['Dairy Cattle', 'Dairy Goat', 'Mixed Dairy'].includes(defaultData.farm_type)) {
    console.warn('⚠️ Invalid farm_type, defaulting to Dairy Cattle:', defaultData.farm_type)
    defaultData.farm_type = 'Dairy Cattle'
  }

  // Validate preferred_currency
  if (!['KSH', 'USD'].includes(defaultData.preferred_currency)) {
    console.warn('⚠️ Invalid preferred_currency, defaulting to KSH:', defaultData.preferred_currency)
    defaultData.preferred_currency = 'KSH'
  }

  // Validate preferred_volume_unit
  if (!['liters', 'gallons'].includes(defaultData.preferred_volume_unit)) {
    console.warn('⚠️ Invalid preferred_volume_unit, defaulting to liters:', defaultData.preferred_volume_unit)
    defaultData.preferred_volume_unit = 'liters'
  }

  // Ensure numeric values are valid
  if (isNaN(defaultData.farm_size_acres) || defaultData.farm_size_acres < 0) {
    defaultData.farm_size_acres = 0
  }

  if (isNaN(defaultData.total_cows) || defaultData.total_cows < 0) {
    defaultData.total_cows = 0
  }

  console.log('✅ Final data prepared:', {
    hasData: !!farmProfileData,
    isNewFarm,
    farmType: defaultData.farm_type,
    currency: defaultData.preferred_currency,
    volumeUnit: defaultData.preferred_volume_unit
  })

  return (
    <FarmProfileSettings
      farmId={effectiveFarmId}
      userRole={userRole.role_type}
      initialData={defaultData}
      isNewFarm={isNewFarm}
    />
  )
}