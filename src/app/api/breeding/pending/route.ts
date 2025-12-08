// src/app/api/breeding/pending/route.ts

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
    
    const supabase = await createServerSupabaseClient()
    
    // Get recent breedings that don't have confirmed pregnancy status
    const { data: breedings, error } = await supabase
      .from('breeding_records')
      .select(`
        *,
        animals (
          id,
          name,
          tag_number
        ),
        pregnancy_records (
          pregnancy_status
        )
      `)
      .eq('farm_id', userRole.farm_id)
      .gte('breeding_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 90 days
      .order('breeding_date', { ascending: false })
    
    if (error) {
      console.error('Error fetching pending breedings:', error)
      return NextResponse.json({ error: 'Failed to fetch breedings' }, { status: 500 })
    }
    
    // Filter breedings that don't have confirmed/completed pregnancy status
    // Cast 'breeding' to 'any' to fix "Property 'pregnancy_records' does not exist on type 'never'"
    const pendingBreedings = breedings?.filter((breeding: any) => {
      const hasConfirmedPregnancy = breeding.pregnancy_records?.some(
        (p: any) => ['confirmed', 'false', 'aborted', 'completed'].includes(p.pregnancy_status)
      )
      return !hasConfirmedPregnancy
    }) || []
    
    return NextResponse.json({ 
      success: true, 
      breedings: pendingBreedings
    })
    
  } catch (error) {
    console.error('Pending breedings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}