// lib/database/channels.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
// import { getSupabaseClient } from '@/lib/supabase/client' // Unused in this function

// Define the shape of the transformed channel object
export interface DistributionChannel {
  id: string
  name: string
  type: string
  contact: string | null
  email: string | null
  contactPerson: string | null
  pricePerLiter: number | null
  isActive: boolean
  location: string | null
  paymentTerms: string | null
  notes: string | null
}

export async function getDistributionChannels(farmId: string): Promise<DistributionChannel[]> {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Cast the query builder to 'any' to bypass the 'never' type error on the table
    const { data: channels, error } = await (supabase
      .from('distribution_channels') as any)
      .select('*')
      .eq('farm_id', farmId)
      .order('name', { ascending: true })

    if (error) throw error

    // Cast channels to any[] to safely map over it
    return (channels as any[])?.map(channel => ({
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