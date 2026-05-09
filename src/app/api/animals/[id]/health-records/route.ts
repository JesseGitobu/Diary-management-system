// src/app/api/animals/[id]/health-records/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

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
    const includeFollowUps = searchParams.get('includeFollowUps') === 'true'
    const limit = parseInt(searchParams.get('limit') || '15')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    const supabase = await createServerSupabaseClient()
    
    // Verify the animal belongs to the user's farm
    const { data: animal, error: animalError } = await supabase
      .from('animals')
      .select('id, farm_id')
      .eq('id', animalId)
      .eq('farm_id', userRole.farm_id)
      .single()
    
    if (animalError || !animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }
    
    // Fetch records with the same comprehensive select as the health dashboard
    const { data: records, error } = await supabase
      .from('animal_health_records')
      .select(`
        *,
        animals!animal_health_records_animal_id_fkey (
          id,
          tag_number,
          name,
          breed,
          gender,
          farm_id
        ),
        health_issues:linked_health_issue_id (
          id,
          issue_type,
          status,
          description
        ),
        outbreak:outbreak_id (
          id,
          outbreak_name,
          disease_type,
          severity_level,
          status
        ),
        original_record:root_checkup_id (
          id,
          record_type,
          description,
          record_date
        ),
        treatment_medications (
          id,
          medication_name,
          dosage,
          duration,
          route,
          route_other,
          sequence
        )
      `)
      .eq('animal_id', animalId)
      .eq('farm_id', userRole.farm_id)
      .eq('is_follow_up', false)
      .order('record_date', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('Error fetching animal health records:', error)
      return NextResponse.json({ error: 'Failed to fetch health records' }, { status: 500 })
    }

    // If includeFollowUps, fetch follow-up relations for each record
    let enrichedRecords = records || []
    
    if (includeFollowUps && enrichedRecords.length > 0) {
      const recordIds = enrichedRecords.map((r: any) => r.id)
      
      // Fetch all follow-up relationships for these records in one query
      const { data: followUpRelations } = await supabase
        .from('health_record_follow_ups')
        .select(`
          original_record_id,
          follow_up_record_id,
          status,
          treatment_effectiveness,
          is_resolved
        `)
        .in('original_record_id', recordIds)
        .order('created_at', { ascending: false })
      
      if (followUpRelations && followUpRelations.length > 0) {
        // Fetch the actual follow-up health records
        const followUpIds = followUpRelations.map((r: any) => r.follow_up_record_id)
        
        const { data: followUpRecords } = await supabase
          .from('animal_health_records')
          .select(`
            id,
            record_date,
            record_time,
            description,
            veterinarian,
            cost,
            notes,
            medication,
            next_due_date,
            treatment_medications (
              id,
              medication_name,
              dosage,
              duration,
              route,
              route_other,
              sequence
            )
          `)
          .in('id', followUpIds)
          .eq('farm_id', userRole.farm_id)
          .order('record_date', { ascending: false })
        
        // Group follow-ups by original_record_id and merge relation data
        const followUpsByParent = new Map<string, any[]>()
        
        for (const relation of followUpRelations as any[]) {
          const record = (followUpRecords || []).find(
            (r: any) => r.id === relation.follow_up_record_id
          )
          if (!record) continue
          
          const enriched = {
            id: record.id,
            record_date: record.record_date,
            record_time: record.record_time,
            description: record.description,
            veterinarian: record.veterinarian,
            cost: record.cost,
            notes: record.notes,
            medication: record.medication,
            next_followup_date: record.next_due_date,
            follow_up_status: relation.status || 'stable',
            treatment_effectiveness: relation.treatment_effectiveness,
            is_resolved: relation.is_resolved || false,
            treatment_medications: (record as any).treatment_medications || []
          }
          
          if (!followUpsByParent.has(relation.original_record_id)) {
            followUpsByParent.set(relation.original_record_id, [])
          }
          followUpsByParent.get(relation.original_record_id)!.push(enriched)
        }
        
        // Attach follow_ups array to each parent record
        enrichedRecords = enrichedRecords.map((record: any) => ({
          ...record,
          follow_ups: followUpsByParent.get(record.id) || []
        }))
      } else {
        // No follow-ups found, attach empty arrays
        enrichedRecords = enrichedRecords.map((record: any) => ({
          ...record,
          follow_ups: []
        }))
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      records: enrichedRecords,
      total: enrichedRecords.length
    })
    
  } catch (error) {
    console.error('Animal health records API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}