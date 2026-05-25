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
    const { data: recordsdata, error } = await supabase
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
      .gte('distribution_date', startDate.toISOString().split('T')[0])
      .lte('distribution_date', endDate.toISOString().split('T')[0])
      .order('distribution_date', { ascending: true })

    if (error) throw error
    const records = (recordsdata as any[]) || []

    // Calculate totals
    const totalDistributed = records?.reduce((sum, record) => sum + (record.quantity_distributed || 0), 0) || 0
    const totalRevenue = records?.reduce((sum, record) => sum + (record.total_amount || 0), 0) || 0
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
      const dateKey = record.distribution_date
      const existing = dailyMap.get(dateKey)
      if (existing) {
        existing.volume += (record.quantity_distributed || 0)
        existing.revenue += (record.total_amount || 0)
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
        existing.volume += (record.quantity_distributed || 0)
        existing.revenue += (record.total_amount || 0)
        if (record.distribution_date > existing.lastDelivery) {
          existing.lastDelivery = record.distribution_date
        }
      } else {
        channelStats.set(channelId, {
          volume: (record.quantity_distributed || 0),
          revenue: (record.total_amount || 0),
          lastDelivery: record.distribution_date,
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
          is_paid_for
        ),
        distribution_delivery_logs (
          id,
          driver_name,
          vehicle_number,
          delivery_date,
          delivery_time
        ),
        distribution_payment_records (
          id,
          payment_method,
          expected_payment_date,
          actual_payment_date,
          payment_status,
          amount_paid
        )
      `)
      .eq('farm_id', farmId)
      .order('distribution_date', { ascending: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.status) {
      query = (query as any).eq('distribution_status', filters.status)
    }
    
    if (filters?.dateFrom) {
      query = query.gte('distribution_date', filters.dateFrom)
    }
    
    if (filters?.dateTo) {
      query = query.lte('distribution_date', filters.dateTo)
    }

    if (limit) {
      query = query.limit(limit)
    }
    
    if (offset) {
      query = query.range(offset, offset + (limit || 50) - 1)
    }

    const { data: records, error } = await query

    if (error) throw error

    // Map Supabase shape to flat, normalized shape for component
    return (records ?? []).map((r: any) => {
      const deliveryLog = r.distribution_delivery_logs?.[0] ?? null
      const paymentRec  = r.distribution_payment_records?.[0] ?? null
      const channel     = r.distribution_channels ?? {}

      return {
        id:                    r.id,
        distribution_date:     r.distribution_date,
        distribution_status:   r.distribution_status,
        quantity_distributed:  r.quantity_distributed,
        unit_price:            r.unit_price,
        total_amount:          r.total_amount,
        notes:                 r.notes,
        channelName:           channel.name ?? 'Unknown channel',
        channelType:           channel.type ?? 'other',
        isPaidFor:             channel.is_paid_for !== false,
        distribution_channels: r.distribution_channels,
        delivery: deliveryLog ? {
          id:             deliveryLog.id,
          driver_name:    deliveryLog.driver_name,
          vehicle_number: deliveryLog.vehicle_number,
          delivery_date:  deliveryLog.delivery_date,
          delivery_time:  deliveryLog.delivery_time,
        } : null,
        payment: paymentRec ? {
          id:                    paymentRec.id,
          method:                paymentRec.payment_method,
          expected_date:         paymentRec.expected_payment_date,
          actual_date:           paymentRec.actual_payment_date,
          status:                paymentRec.payment_status,
          amount_paid:           paymentRec.amount_paid,
        } : null,
      }
    }) || []
  } catch (error) {
    console.error('Error fetching distribution records:', error)
    throw error
  }
}