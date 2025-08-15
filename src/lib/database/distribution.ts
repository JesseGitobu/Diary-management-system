// lib/database/distribution.ts - Updated for your Supabase structure
import { createServerSupabaseClient } from '@/lib/supabase/server'


interface DistributionStats {
  totalDistributed: number
  totalRevenue: number
  totalChannels: number
  avgPricePerLiter: number
  periodDays: number
  dailySummaries: Array<{
    date: string
    volume: number
    revenue: number
    channels: number
  }>
  topChannels: Array<{
    id: string
    name: string
    type: 'cooperative' | 'processor' | 'direct' | 'retail'
    volume: number
    revenue: number
    lastDelivery: string
  }>
}

export async function getDistributionStats(farmId: string, days: number = 30): Promise<DistributionStats> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - days)

  try {
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
      .eq('farm_id', farmId)
      .gte('delivery_date', startDate.toISOString().split('T')[0])
      .lte('delivery_date', endDate.toISOString().split('T')[0])
      .order('delivery_date', { ascending: true })

    if (error) throw error

    // Calculate totals
    const totalDistributed = records?.reduce((sum, record) => sum + record.volume, 0) || 0
    const totalRevenue = records?.reduce((sum, record) => sum + record.total_amount, 0) || 0
    const avgPricePerLiter = totalDistributed > 0 ? totalRevenue / totalDistributed : 0

    // Get unique channels count
    const uniqueChannels = new Set(records?.map(r => r.channel_id))
    const totalChannels = uniqueChannels.size

    // Create daily summaries
    const dailyMap = new Map<string, { volume: number, revenue: number, channels: Set<string> }>()
    
    // Initialize all days in range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0]
      dailyMap.set(dateKey, { volume: 0, revenue: 0, channels: new Set() })
    }

    // Populate with actual data
    records?.forEach(record => {
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
    
    records?.forEach(record => {
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

    return {
      totalDistributed,
      totalRevenue,
      totalChannels,
      avgPricePerLiter,
      periodDays: days,
      dailySummaries,
      topChannels
    }
  } catch (error) {
    console.error('Error fetching distribution stats:', error)
    throw error
  }
}

export async function getDistributionRecords(
  farmId: string,
  limit?: number,
  offset?: number,
  filters?: {
    status?: string
    channelType?: string
    dateFrom?: string
    dateTo?: string
  }
) {
  try {
    const supabase = await createServerSupabaseClient()
    
    let query = supabase
      .from('distribution_records')
      .select(`
        *,
        distribution_channels (
          id,
          name,
          type,
          contact
        )
      `)
      .eq('farm_id', farmId)
      .order('delivery_date', { ascending: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    
    if (filters?.dateFrom) {
      query = query.gte('delivery_date', filters.dateFrom)
    }
    
    if (filters?.dateTo) {
      query = query.lte('delivery_date', filters.dateTo)
    }

    if (limit) {
      query = query.limit(limit)
    }
    
    if (offset) {
      query = query.range(offset, offset + (limit || 50) - 1)
    }

    const { data: records, error } = await query

    if (error) throw error

    // Transform data to match component interface
    return records?.map(record => ({
      id: record.id,
      date: record.delivery_date,
      channelName: record.distribution_channels?.name || 'Unknown Channel',
      channelType: record.distribution_channels?.type || 'direct',
      volume: record.volume,
      pricePerLiter: record.price_per_liter,
      totalAmount: record.total_amount,
      status: record.status,
      paymentMethod: record.payment_method,
      driverName: record.driver_name,
      deliveryTime: record.delivery_time,
      notes: record.notes,
      vehicleNumber: record.vehicle_number
    })) || []
  } catch (error) {
    console.error('Error fetching distribution records:', error)
    throw error
  }
}