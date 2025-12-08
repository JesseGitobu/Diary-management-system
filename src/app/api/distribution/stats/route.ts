// app/api/distribution/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getUserRole, createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm access' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    const supabase = await createServerSupabaseClient()
    
    // Get distribution records for the period
    const { data: records, error } = await supabase
      .from('distribution_records')
      .select(`
        *,
        distribution_channels (
          id,
          name,
          type
        )
      `)
      .eq('farm_id', userRole.farm_id)
      .gte('delivery_date', startDate.toISOString().split('T')[0])
      .lte('delivery_date', endDate.toISOString().split('T')[0])
      .order('delivery_date', { ascending: true })

    if (error) throw error

    // Calculate statistics
    // Cast record to any to fix "Property 'volume' does not exist on type 'never'"
    const totalDistributed = records?.reduce((sum, record: any) => sum + record.volume, 0) || 0
    const totalRevenue = records?.reduce((sum, record: any) => sum + record.total_amount, 0) || 0
    const avgPricePerLiter = totalDistributed > 0 ? totalRevenue / totalDistributed : 0
    const uniqueChannels = new Set(records?.map((r: any) => r.channel_id))
    const totalChannels = uniqueChannels.size

    // Create daily summaries
    const dailyMap = new Map<string, { volume: number, revenue: number, channels: Set<string> }>()
    
    // Initialize all days in range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0]
      dailyMap.set(dateKey, { volume: 0, revenue: 0, channels: new Set() })
    }

    // Populate with actual data
    records?.forEach((record: any) => {
      const dateKey = record.delivery_date
      const existing = dailyMap.get(dateKey)
      if (existing) {
        existing.volume += record.volume
        existing.revenue += record.total_amount
        existing.channels.add(record.channel_id)
      }
    })

    const dailySummaries = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      volume: data.volume,
      revenue: data.revenue,
      channels: data.channels.size
    }))

    // Get top channels
    const channelStats = new Map<string, { volume: number, revenue: number, lastDelivery: string, channelData: any }>()
    
    records?.forEach((record: any) => {
      const channelId = record.channel_id
      const existing = channelStats.get(channelId)
      
      if (existing) {
        existing.volume += record.volume
        existing.revenue += record.total_amount
        if (record.delivery_date > existing.lastDelivery) {
          existing.lastDelivery = record.delivery_date
        }
      } else {
        channelStats.set(channelId, {
          volume: record.volume,
          revenue: record.total_amount,
          lastDelivery: record.delivery_date,
          channelData: record.distribution_channels
        })
      }
    })

    const topChannels = Array.from(channelStats.entries())
      .map(([id, stats]) => ({
        id,
        name: stats.channelData?.name || 'Unknown Channel',
        type: stats.channelData?.type || 'direct',
        volume: stats.volume,
        revenue: stats.revenue,
        lastDelivery: stats.lastDelivery
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    const distributionStats = {
      totalDistributed,
      totalRevenue,
      totalChannels,
      avgPricePerLiter,
      periodDays: days,
      dailySummaries,
      topChannels
    }

    return NextResponse.json(distributionStats)
  } catch (error) {
    console.error('Error fetching distribution stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}