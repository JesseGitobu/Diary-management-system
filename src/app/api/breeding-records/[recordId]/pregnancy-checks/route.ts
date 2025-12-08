// src/app/api/breeding-records/[recordId]/pregnancy-checks/route.ts
// Updated pregnancy check endpoint

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { updatePregnancyStatusUnified } from '@/lib/database/breeding-sync'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ recordId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recordId } = await params
    const body = await request.json()

    console.log('🔍 Recording pregnancy check for:', recordId)

    // Get breeding record details
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabaseClient()

    const { data: breedingResult } = await supabase
      .from('breeding_records')
      .select('animal_id, farm_id')
      .eq('id', recordId)
      .single()

    // Cast to any to fix "Property 'animal_id' does not exist on type 'never'"
    const breeding = breedingResult as any

    if (!breeding) {
      return NextResponse.json(
        { error: 'Breeding record not found' },
        { status: 404 }
      )
    }

    // Map result to pregnancy status
    const pregnancyStatus = body.result === 'positive' ? 'confirmed' :
                           body.result === 'negative' ? 'false' :
                           'aborted'

    // Calculate due date if positive
    let estimatedDueDate
    if (body.result === 'positive') {
      const checkDate = new Date(body.check_date)
      checkDate.setDate(checkDate.getDate() + 280) // Default gestation
      estimatedDueDate = checkDate.toISOString().split('T')[0]
    }

    // Update using unified service
    const result = await updatePregnancyStatusUnified(
      recordId,
      breeding.animal_id,
      breeding.farm_id,
      {
        pregnancy_status: pregnancyStatus,
        check_date: body.check_date,
        check_method: body.check_method,
        checked_by: body.checked_by,
        notes: body.notes,
        estimated_due_date: estimatedDueDate
      },
      user.id,
      true
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      checkResult: body.result,
      message: 'Pregnancy check recorded successfully'
    })

  } catch (error: any) {
    console.error('❌ Error recording pregnancy check:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}