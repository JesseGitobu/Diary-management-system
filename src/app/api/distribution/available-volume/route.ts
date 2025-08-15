// app/api/distribution/available-volume/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getUserRole, createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id)
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm access' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const checkDate = searchParams.get('reord_date') || new Date().toISOString().split('T')[0]

    const supabase = await createServerSupabaseClient()
    
    try {
      // Try to use the database function first
      const { data, error } = await supabase
        .rpc('get_available_volume', { 
          target_farm_id: userRole.farm_id,
          check_date: checkDate
        })

      if (error) throw error
      
      return NextResponse.json({ availableVolume: data || 0 })
    } catch (rpcError) {
      // Fallback calculation
      console.log('Using fallback calculation for available volume')
      
      // Get production for the date
      const { data: production, error: productionError } = await supabase
        .from('production_records')
        .select('milk_volume')
        .eq('farm_id', userRole.farm_id)
        .eq('record_date', checkDate)

      if (productionError) throw productionError

      const totalProduced = production?.reduce((sum, record) => sum + record.milk_volume, 0) || 0

      // Get distributed volume for the date
      const { data: distributed, error: distributionError } = await supabase
        .from('distribution_records')
        .select('volume')
        .eq('farm_id', userRole.farm_id)
        .eq('delivery_date', checkDate)

      if (distributionError) throw distributionError

      const totalDistributed = distributed?.reduce((sum, record) => sum + record.volume, 0) || 0

      const availableVolume = Math.max(0, totalProduced - totalDistributed)

      return NextResponse.json({ availableVolume })
    }
  } catch (error) {
    console.error('Error calculating available volume:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
