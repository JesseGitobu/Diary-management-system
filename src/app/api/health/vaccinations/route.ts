// src/app/api/health/vaccinations/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { createVaccination, getVaccinations } from '@/lib/database/health'
import { z } from 'zod'

// Validation schema for vaccination data
const vaccinationSchema = z.object({
  vaccine_name: z.string().min(2, 'Vaccine name is required'),
  vaccine_type: z.enum(['core', 'risk_based', 'elective']),
  manufacturer: z.string().optional(),
  batch_number: z.string().optional(),
  vaccination_date: z.string().min(1, 'Vaccination date is required'),
  next_due_date: z.string().optional(),
  route_of_administration: z.enum(['intramuscular', 'subcutaneous', 'intranasal', 'oral']),
  dosage: z.string().min(1, 'Dosage is required'),
  vaccination_site: z.string().optional(),
  selected_animals: z.array(z.string()).min(1, 'At least one animal must be selected'),
  veterinarian: z.string().optional(),
  cost_per_dose: z.number().min(0).optional(),
  total_cost: z.number().min(0).optional(),
  side_effects: z.string().optional(),
  notes: z.string().optional(),
  create_reminder: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(user.id)
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated' }, { status: 400 })
    }

    // Check permissions
    if (!['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await request.json()
    console.log('Received vaccination data:', data)
    
    // Validate required fields
    if (!data.vaccine_name?.trim()) {
      return NextResponse.json({ error: 'Vaccine name is required' }, { status: 400 })
    }
    
    if (!data.vaccination_date) {
      return NextResponse.json({ error: 'Vaccination date is required' }, { status: 400 })
    }
    
    if (!data.dosage?.trim()) {
      return NextResponse.json({ error: 'Dosage is required' }, { status: 400 })
    }
    
    if (!data.selected_animals || data.selected_animals.length === 0) {
      return NextResponse.json({ error: 'At least one animal must be selected' }, { status: 400 })
    }
    
    // Validate date format
    if (isNaN(Date.parse(data.vaccination_date))) {
      return NextResponse.json({ error: 'Invalid vaccination date format' }, { status: 400 })
    }
    
    if (data.next_due_date && data.next_due_date.trim() && isNaN(Date.parse(data.next_due_date))) {
      return NextResponse.json({ error: 'Invalid next due date format' }, { status: 400 })
    }

    const result = await createVaccination(userRole.farm_id, data)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      vaccination: result.data,
      message: 'Vaccination recorded successfully'
    })

  } catch (error) {
    console.error('Vaccination API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const animalId = searchParams.get('animal_id')
    const vaccineType = searchParams.get('vaccine_type')
    const startDate = searchParams.get('start_date') ?? undefined
    const endDate = searchParams.get('end_date') ?? undefined
    
    // Get vaccinations with optional filtering
    const result = await getVaccinations(userRole.farm_id, {
      limit,
      offset,
      animalId: animalId ?? undefined,
      vaccineType: vaccineType ?? undefined,
      startDate,
      endDate
    })
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({
      vaccinations: result.data,
      total: result.total,
      limit,
      offset
    })
    
  } catch (error) {
    console.error('Get vaccinations API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    }, { status: 500 })
  }
}

// Helper function to create health records for vaccinated animals
async function createVaccinationHealthRecords(
  farmId: string,
  vaccination: any,
  animalIds: string[]
): Promise<number> {
  try {
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabaseClient()
    
    // Create health records for each vaccinated animal
    const healthRecords = animalIds.map(animalId => ({
      animal_id: animalId,
      record_type: 'vaccination' as const,
      record_date: vaccination.vaccination_date,
      description: `Vaccination: ${vaccination.vaccine_name}`,
      treatment: `${vaccination.dosage} via ${vaccination.route_of_administration}${vaccination.vaccination_site ? ` at ${vaccination.vaccination_site}` : ''}`,
      veterinarian: vaccination.veterinarian || undefined,
      cost: vaccination.cost_per_dose || undefined,
      notes: [
        vaccination.notes,
        vaccination.batch_number ? `Batch: ${vaccination.batch_number}` : null,
        vaccination.manufacturer ? `Manufacturer: ${vaccination.manufacturer}` : null,
        vaccination.side_effects ? `Side effects: ${vaccination.side_effects}` : null
      ].filter(Boolean).join('\n') || undefined,
    }))
    
    const { data, error } = await supabase
      .from('animal_health_records')
      .insert(healthRecords)
      .select()
    
    if (error) {
      console.error('Error creating vaccination health records:', error)
      return 0
    }
    
    return data?.length || 0
  } catch (error) {
    console.error('Error in createVaccinationHealthRecords:', error)
    return 0
  }
}

// Helper function to create vaccination reminder
async function createVaccinationReminder(
  farmId: string,
  vaccination: any,
  nextDueDate: string
): Promise<boolean> {
  try {
    // This would integrate with your notification/reminder system
    // For now, we'll just log it and return true
    // In a real implementation, you might:
    // 1. Create a record in a "reminders" table
    // 2. Schedule a background job
    // 3. Integrate with email/SMS service
    
    console.log(`Vaccination reminder created:`, {
      farmId,
      vaccinationId: vaccination.id,
      vaccineName: vaccination.vaccine_name,
      nextDueDate,
      reminderDate: new Date(new Date(nextDueDate).getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days before
    })
    
    // TODO: Implement actual reminder creation
    // const reminderResult = await createReminder({
    //   farm_id: farmId,
    //   type: 'vaccination_due',
    //   title: `Vaccination Due: ${vaccination.vaccine_name}`,
    //   description: `Next vaccination for ${vaccination.vaccine_name} is due`,
    //   due_date: nextDueDate,
    //   reminder_date: new Date(new Date(nextDueDate).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    //   related_vaccination_id: vaccination.id
    // })
    
    return true
  } catch (error) {
    console.error('Error creating vaccination reminder:', error)
    return false
  }
}