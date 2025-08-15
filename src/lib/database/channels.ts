// lib/database/channels.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSupabaseClient } from '@/lib/supabase/client'

export async function getDistributionChannels(farmId: string) {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: channels, error } = await supabase
      .from('distribution_channels')
      .select('*')
      .eq('farm_id', farmId)
      .order('name', { ascending: true })

    if (error) throw error

    return channels?.map(channel => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      contact: channel.contact,
      email: channel.email,
      contactPerson: channel.contact_person,
      pricePerLiter: channel.price_per_liter,
      isActive: channel.is_active,
      location: channel.location,
      paymentTerms: channel.payment_terms,
      notes: channel.notes
    })) || []
  } catch (error) {
    console.error('Error fetching distribution channels:', error)
    throw error
  }
}