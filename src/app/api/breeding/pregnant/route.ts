import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const supabase = await createServerSupabaseClient()
    
    // Get confirmed pregnant animals
    const { data: pregnantAnimals, error } = await supabase
      .from('pregnancy_records')
      .select(`
        *,
        animals (
          id,
          name,
          tag_number
        ),
        breeding_records (
          breeding_date,
          breeding_type,
          sire_name
        )
      `)
      .eq('farm_id', userRole.farm_id)
      .eq('pregnancy_status', 'confirmed')
      .order('expected_calving_date', { ascending: true })
    
    if (error) {
      console.error('Error fetching pregnant animals:', error)
      return NextResponse.json({ error: 'Failed to fetch pregnant animals' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      pregnantAnimals: pregnantAnimals || []
    })
    
  } catch (error) {
    console.error('Pregnant animals API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}