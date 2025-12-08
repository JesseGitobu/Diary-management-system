// API route for health status changes
// src/app/api/health/status-changes/route.ts

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
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const hours = parseInt(searchParams.get('hours') || '24') // Default to last 24 hours
    
    const supabase = await createServerSupabaseClient()
    
    // Get recent health status changes
    const { data: statusChanges, error } = await supabase
      .from('animal_health_status_log')
      .select(`
        id,
        animal_id,
        old_status,
        new_status,
        changed_at,
        notes,
        animals!inner (
          id,
          name,
          tag_number,
          farm_id
        )
      `)
      .eq('animals.farm_id', userRole.farm_id)
      .gte('changed_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order('changed_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching health status changes:', error)
      return NextResponse.json({ error: 'Failed to fetch status changes' }, { status: 500 })
    }

    interface HealthStatusChange {
      id: string;
      animalId: string;
      animalName: string;
      animalTagNumber: string;
      oldStatus: string | null;
      newStatus: string | null;
      changedAt: string | null;
      notes: string | null;
    }

    // Transform data for frontend
    // Cast change to any to fix "Property 'id' does not exist on type 'never'"
    const changes: HealthStatusChange[] = (statusChanges || []).map((change: any) => ({
      id: change.id,
      animalId: change.animal_id,
      animalName: change.animals.name || `Animal ${change.animals.tag_number}`,
      animalTagNumber: change.animals.tag_number,
      oldStatus: change.old_status,
      newStatus: change.new_status,
      changedAt: change.changed_at,
      notes: change.notes
    }));

    return NextResponse.json({ 
      success: true, 
      changes,
      total: changes.length
    })
    
  } catch (error) {
    console.error('Health status changes API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}