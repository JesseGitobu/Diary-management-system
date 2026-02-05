// src/app/api/animals/[id]/drying-status/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getAnimalById } from '@/lib/database/animals'

/**
 * GET endpoint to check if animal is ready for dry-off
 * Based on days pregnant and breeding settings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const { id: animalId } = await params
    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId') || userRole.farm_id
    
    // Validate farm ownership
    if (farmId !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const supabase = await createServerSupabaseClient()
    
    // Get animal data
    const animal = await getAnimalById(animalId)
    
    if (!animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }
    
    // Get breeding settings
    const { data: settings } = await supabase
      .from('farm_breeding_settings')
      .select('days_pregnant_at_dryoff, default_gestation')
      .eq('farm_id', farmId)
      .single()
    
    const daysPregnantAtDryoff = (settings as any)?.days_pregnant_at_dryoff || 220
    const defaultGestation = (settings as any)?.default_gestation || 280
    
    // Check if animal is served (pregnant)
    if ((animal as any).production_status !== 'served' || !(animal as any).service_date) {
      return NextResponse.json({
        success: true,
        shouldDryOff: false,
        daysUntilDryOff: 0,
        daysPregnantAtDryoff,
        reason: 'Animal is not in served/pregnant status'
      })
    }
    
    // Calculate days pregnant
    const serviceDate = new Date((animal as any).service_date)
    const today = new Date()
    const daysPregnant = Math.floor(
      (today.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    // Calculate expected calving date if not already set
    let expectedCalvingDate = (animal as any).expected_calving_date
    if (!expectedCalvingDate) {
      const calvingDate = new Date(serviceDate)
      calvingDate.setDate(calvingDate.getDate() + defaultGestation)
      expectedCalvingDate = calvingDate.toISOString().split('T')[0]
    }
    
    const daysUntilCalving = Math.max(0, Math.floor(
      (new Date(expectedCalvingDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    ))
    
    // ✅ ENHANCED: Calculate when to show dry-off button (2 days before threshold)
    const daysUntilDryOffAlert = Math.max(0, (daysPregnantAtDryoff - 2) - daysPregnant)
    const showDryOffButton = daysPregnant >= (daysPregnantAtDryoff - 2)  // Show when 2 days before or past threshold
    const shouldDryOff = daysPregnant >= daysPregnantAtDryoff  // Already past threshold
    
    console.log('📊 [Drying Status API]:', {
      animalId,
      daysPregnant,
      daysPregnantAtDryoff,
      daysUntilDryOffAlert,
      showDryOffButton,
      shouldDryOff,
      daysUntilCalving,
      expectedCalvingDate
    })
    
    return NextResponse.json({
      success: true,
      showDryOffButton,              // ✅ NEW: Button should be visible
      shouldDryOff,                  // Already past threshold
      daysUntilDryOff: daysUntilDryOffAlert,
      daysPregnant,
      daysPregnantAtDryoff,
      daysUntilCalving,
      expectedCalvingDate,
      buttonStartsInDays: Math.max(0, (daysPregnantAtDryoff - 2) - daysPregnant),  // ✅ NEW: Days until button appears
      reason: showDryOffButton
        ? shouldDryOff
          ? `Animal has been pregnant for ${daysPregnant} days, READY for dry-off (threshold: ${daysPregnantAtDryoff} days)`
          : `Animal will be ready for dry-off in ${daysUntilDryOffAlert} days - button is now visible`
        : `Animal will be ready for dry-off in ${daysUntilDryOffAlert + 2} days`
    })
    
  } catch (error) {
    console.error('❌ [API] Drying status check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
