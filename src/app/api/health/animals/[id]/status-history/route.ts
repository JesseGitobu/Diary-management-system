import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const { id: animalId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    
    const supabase = await createServerSupabaseClient()
    
    // Verify animal belongs to user's farm
    const { data: animal, error: animalError } = await supabase
      .from('animals')
      .select('id, name, tag_number')
      .eq('id', animalId)
      .eq('farm_id', userRole.farm_id)
      .single()

    if (animalError || !animal) {
      return NextResponse.json({ error: 'Animal not found or access denied' }, { status: 404 })
    }

    // Get health status history
    const { data: history, error } = await supabase
      .from('animal_health_status_log')
      .select('*')
      .eq('animal_id', animalId)
      .order('changed_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching health status history:', error)
      return NextResponse.json({ error: 'Failed to fetch status history' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      animal: {
        id: animal.id,
        name: animal.name,
        tagNumber: animal.tag_number
      },
      history: history || []
    })
    
  } catch (error) {
    console.error('Health status history API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}