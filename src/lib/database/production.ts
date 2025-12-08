// src/lib/database/production.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/types'

type ProductionRecord = Database['public']['Tables']['production_records']['Row']
type ProductionRecordInsert = Database['public']['Tables']['production_records']['Insert']
type ProductionRecordUpdate = Database['public']['Tables']['production_records']['Update']

export async function createProductionRecord(
  farmId: string, 
  data: Omit<ProductionRecordInsert, 'farm_id'>
) {
  const supabase = await createServerSupabaseClient()
  
  const { data: record, error } = await (supabase
    .from('production_records') as any)
    .insert({
      ...data,
      farm_id: farmId,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating production record:', error)
    return { success: false, error: error.message }
  }
  
  // Update daily summary
  await updateDailyProductionSummary(farmId, data.record_date)
  
  return { success: true, data: record }
}

export async function getProductionRecords(
  farmId: string, 
  animalId?: string, 
  startDate?: string, 
  endDate?: string
) {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('production_records')
    .select(`
      *,
      animals (
        id,
        tag_number,
        name
      )
    `)
    .eq('farm_id', farmId)
    .order('record_date', { ascending: false })
    .order('created_at', { ascending: false })
  
  if (animalId) {
    query = query.eq('animal_id', animalId)
  }
  
  if (startDate) {
    query = query.gte('record_date', startDate)
  }
  
  if (endDate) {
    query = query.lte('record_date', endDate)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching production records:', error)
    return []
  }
  
  // FIXED: Cast to any[]
  return (data as any[]) || []
}

export async function updateProductionRecord(
  recordId: string, 
  data: ProductionRecordUpdate
) {
  const supabase = await createServerSupabaseClient()
  
  const { data: record, error } = await (supabase
    .from('production_records') as any)
    .update(data)
    .eq('id', recordId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating production record:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data: record }
}

export async function deleteProductionRecord(recordId: string) {
  const supabase = await createServerSupabaseClient()

  // Get the record first to update daily summary
  const { data: record } = await (supabase
    .from('production_records') as any)
    .select('farm_id, record_date')
    .eq('id', recordId)
    .single()
  
  const { error } = await supabase
    .from('production_records')
    .delete()
    .eq('id', recordId)
  
  if (error) {
    console.error('Error deleting production record:', error)
    return { success: false, error: error.message }
  }
  
  // Update daily summary
  if (record) {
    await updateDailyProductionSummary(record.farm_id, record.record_date)
  }
  
  return { success: true }
}

export async function updateDailyProductionSummary(farmId: string, date: string) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Calculate daily totals
    const { data: dailyRecordsData } = await supabase
      .from('production_records')
      .select('milk_volume, fat_content, protein_content, animal_id')
      .eq('farm_id', farmId)
      .eq('record_date', date)
    
    // FIXED: Cast to any[] to bypass 'never' type error
    const dailyRecords = (dailyRecordsData as any[]) || []

    if (dailyRecords.length === 0) {
      // Delete summary if no records
      await supabase
        .from('daily_production_summary')
        .delete()
        .eq('farm_id', farmId)
        .eq('record_date', date)
      return
    }
    
    const totalVolume = dailyRecords.reduce((sum, record) => sum + (record.milk_volume || 0), 0)
    const avgFat = dailyRecords.reduce((sum, record) => sum + (record.fat_content || 0), 0) / dailyRecords.length
    const avgProtein = dailyRecords.reduce((sum, record) => sum + (record.protein_content || 0), 0) / dailyRecords.length
    const uniqueAnimals = new Set(dailyRecords.map(r => r.animal_id)).size
    
    const summaryData = {
      farm_id: farmId,
      record_date: date,
      total_milk_volume: totalVolume,
      average_fat_content: avgFat,
      average_protein_content: avgProtein,
      animals_milked: uniqueAnimals,
      sessions_recorded: dailyRecords.length,
    }
    
    // Upsert daily summary
    await (supabase
      .from('daily_production_summary') as any)
      .upsert(summaryData, { onConflict: 'farm_id,record_date' })
    
  } catch (error) {
    console.error('Error updating daily production summary:', error)
  }
}

export async function getProductionStats(farmId: string, days: number = 30) {
  const supabase = await createServerSupabaseClient()

  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  try {
    // Get daily summaries
    const { data: summariesData } = await supabase
      .from('daily_production_summary')
      .select('*')
      .eq('farm_id', farmId)
      .gte('record_date', startDate)
      .lte('record_date', endDate)
      .order('record_date', { ascending: false })
    
    // FIXED: Cast to any[]
    const summaries = (summariesData as any[]) || []

    // Get total records count
    const { count: totalRecords } = await supabase
      .from('production_records')
      .select('*', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .gte('record_date', startDate)
    
    // Calculate averages
    const totalVolume = summaries.reduce((sum, s) => sum + (s.total_milk_volume || 0), 0) || 0
    const avgDailyVolume = summaries.length ? totalVolume / summaries.length : 0
    const avgFatContent = summaries.length 
      ? summaries.reduce((sum, s) => sum + (s.average_fat_content || 0), 0) / summaries.length 
      : 0
    const avgProteinContent = summaries.length 
      ? summaries.reduce((sum, s) => sum + (s.average_protein_content || 0), 0) / summaries.length 
      : 0
    
    return {
      totalRecords: totalRecords || 0,
      totalVolume,
      avgDailyVolume,
      avgFatContent,
      avgProteinContent,
      dailySummaries: summaries,
      periodDays: days,
    }
  } catch (error) {
    console.error('Error getting production stats:', error)
    return {
      totalRecords: 0,
      totalVolume: 0,
      avgDailyVolume: 0,
      avgFatContent: 0,
      avgProteinContent: 0,
      dailySummaries: [],
      periodDays: days,
    }
  }
}

export async function getAnimalProductionHistory(animalId: string, days: number = 90) {
  const supabase = await createServerSupabaseClient()

  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('production_records')
    .select('*')
    .eq('animal_id', animalId)
    .gte('record_date', startDate)
    .lte('record_date', endDate)
    .order('record_date', { ascending: true })
  
  if (error) {
    console.error('Error getting animal production history:', error)
    return []
  }
  
  // FIXED: Cast to any[]
  return (data as any[]) || []
}