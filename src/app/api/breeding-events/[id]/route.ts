// src/app/api/breeding-events/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

const pregnancyStatusMap: Record<string, string> = {
  pregnant: 'confirmed',
  not_pregnant: 'false',
  uncertain: 'suspected',
}

const examinationMethodMap: Record<string, string> = {
  'Ultrasound': 'ultrasound',
  'Blood test': 'blood_test',
  'Rectal palpation': 'rectal_palpation',
  'Visual observation': 'visual',
  'Milk test': 'visual',
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })

    const supabase = await createServerSupabaseClient()

    const { data: existing, error: fetchError } = await (supabase as any)
      .from('breeding_events')
      .select('id, event_type, service_record_id, pregnancy_record_id, farm_id')
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const body = await request.json()
    const { eventData } = body

    const baseUpdate: Record<string, any> = {
      event_date: eventData.event_date,
      notes: eventData.notes || null,
    }

    if (existing.event_type === 'heat_detection') {
      baseUpdate.heat_action_taken = eventData.heat_action_taken || null

      const { error: updateError } = await (supabase as any)
        .from('breeding_events')
        .update(baseUpdate)
        .eq('id', id)

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

      // Replace heat signs
      await (supabase as any).from('heat_detection_signs').delete().eq('event_id', id)
      const signs: string[] = eventData.heat_signs || []
      if (signs.length > 0) {
        await (supabase as any)
          .from('heat_detection_signs')
          .insert(signs.map((sign: string) => ({ event_id: id, sign })))
      }

    } else if (existing.event_type === 'insemination') {
      const { error: updateError } = await (supabase as any)
        .from('breeding_events')
        .update(baseUpdate)
        .eq('id', id)

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

      if (existing.service_record_id) {
        await (supabase as any)
          .from('service_records')
          .update({
            service_type: eventData.insemination_method === 'artificial_insemination'
              ? 'artificial_insemination' : 'natural',
            service_date: eventData.event_date.split('T')[0],
            bull_tag_or_semen_code: eventData.semen_bull_code || null,
            technician_name: eventData.technician_name || null,
            notes: eventData.notes || null,
          })
          .eq('id', existing.service_record_id)
      }

    } else if (existing.event_type === 'pregnancy_check') {
      const { error: updateError } = await (supabase as any)
        .from('breeding_events')
        .update(baseUpdate)
        .eq('id', id)

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

      if (existing.pregnancy_record_id) {
        await (supabase as any)
          .from('pregnancy_records')
          .update({
            pregnancy_status: pregnancyStatusMap[eventData.pregnancy_result] || 'suspected',
            confirmed_date: eventData.event_date.split('T')[0],
            confirmation_method: eventData.examination_method
              ? (examinationMethodMap[eventData.examination_method] || 'visual')
              : 'visual',
            expected_calving_date: eventData.estimated_due_date || null,
            pregnancy_notes: eventData.notes || null,
            veterinarian: eventData.veterinarian_name || null,
          })
          .eq('id', existing.pregnancy_record_id)
      }

    } else if (existing.event_type === 'calving') {
      baseUpdate.calving_outcome = eventData.calving_outcome || null
      baseUpdate.calf_gender = eventData.calf_gender || null
      baseUpdate.calf_weight = eventData.calf_weight || null
      baseUpdate.calf_tag_number = eventData.calf_tag_number || null
      baseUpdate.calf_health_status = eventData.calf_health_status || null

      const { error: updateError } = await (supabase as any)
        .from('breeding_events')
        .update(baseUpdate)
        .eq('id', id)

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    const { data: updated } = await (supabase as any)
      .from('breeding_events')
      .select('*')
      .eq('id', id)
      .single()

    return NextResponse.json({ success: true, event: updated })

  } catch (error: any) {
    console.error('Error updating breeding event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRole = await getUserRole(user.id) as any
    if (!userRole?.farm_id) return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })

    const supabase = await createServerSupabaseClient()

    const { data: existing, error: fetchError } = await (supabase as any)
      .from('breeding_events')
      .select('id, event_type, service_record_id, pregnancy_record_id')
      .eq('id', id)
      .eq('farm_id', userRole.farm_id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const { error: deleteError } = await (supabase as any)
      .from('breeding_events')
      .delete()
      .eq('id', id)

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 })

    // Clean up linked child records (no cascade from breeding_events side)
    if (existing.service_record_id) {
      await (supabase as any)
        .from('service_records')
        .delete()
        .eq('id', existing.service_record_id)
    }
    if (existing.pregnancy_record_id) {
      await (supabase as any)
        .from('pregnancy_records')
        .delete()
        .eq('id', existing.pregnancy_record_id)
    }

    return NextResponse.json({ success: true, message: 'Breeding event deleted' })

  } catch (error: any) {
    console.error('Error deleting breeding event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
