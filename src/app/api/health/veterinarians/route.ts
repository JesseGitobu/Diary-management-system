// src/app/api/health/veterinarians/route.ts

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
    
    // Get all veterinarians for the farm
    const { data: veterinarians, error } = await supabase
      .from('veterinarians')
      .select('*')
      .eq('farm_id', userRole.farm_id)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true })
    
    if (error) {
      console.error('Error fetching veterinarians:', error)
      return NextResponse.json({ error: 'Failed to fetch veterinarians' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      veterinarians: veterinarians || []
    })
    
  } catch (error) {
    console.error('Veterinarians GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Only farm owners and managers can add veterinarians
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const { 
      name,
      clinic_name,
      license_number,
      specialization,
      phone_primary,
      phone_emergency,
      email,
      address_street,
      address_city,
      address_state,
      address_postal,
      address_country,
      available_days,
      availability_start_time,
      availability_end_time,
      emergency_available,
      service_types,
      rates_consultation,
      rates_emergency,
      preferred_payment,
      notes,
      is_primary,
      is_active,
      farm_id
    } = body
    
    // Verify user owns the farm
    if (farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()

    // If this veterinarian is being set as primary, update existing primary
    if (is_primary) {
      await (supabase as any)
        .from('veterinarians')
        .update({ is_primary: false })
        .eq('farm_id', userRole.farm_id)
        .eq('is_primary', true)
    }
    
    // Create the veterinarian record with main fields
    const { data: veterinarian, error: insertError } = await (supabase as any)
      .from('veterinarians')
      .insert({
        farm_id: userRole.farm_id,
        name,
        practice_name: clinic_name,
        license_number,
        specialization,
        phone: phone_primary,
        email,
        // Comprehensive address
        address: `${address_street}, ${address_city}, ${address_state} ${address_postal}, ${address_country}`,
        // Extended fields
        practice_phone_primary: phone_primary,
        practice_phone_emergency: phone_emergency,
        address_street,
        address_city,
        address_state,
        address_postal,
        address_country,
        rates_consultation: rates_consultation || null,
        rates_emergency: rates_emergency || null,
        emergency_available: emergency_available || false,
        notes: notes || null,
        is_primary: is_primary || false,
        is_active: is_active !== false,
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Error creating veterinarian:', insertError)
      return NextResponse.json({ error: 'Failed to create veterinarian record' }, { status: 500 })
    }

    // Insert availability records for each selected day
    if (available_days && available_days.length > 0) {
      const availabilityRecords = available_days.map((day: string) => ({
        veterinarian_id: (veterinarian as any).id,
        day_of_week: day,
        start_time: availability_start_time || '08:00',
        end_time: availability_end_time || '17:00',
      }))

      const { error: availabilityError } = await (supabase as any)
        .from('veterinarian_availability')
        .insert(availabilityRecords)

      if (availabilityError) {
        console.error('Error creating availability records:', availabilityError)
        // Don't fail the entire request if availability fails
      }
    }

    // Insert service records for each selected service
    if (service_types && service_types.length > 0) {
      const serviceRecords = service_types.map((service: string) => ({
        veterinarian_id: (veterinarian as any).id,
        service_name: service,
      }))

      const { error: servicesError } = await (supabase as any)
        .from('veterinarian_services')
        .insert(serviceRecords)

      if (servicesError) {
        console.error('Error creating service records:', servicesError)
        // Don't fail the entire request if services fail
      }
    }

    // Insert payment method records for each selected payment method
    if (preferred_payment && preferred_payment.length > 0) {
      const paymentRecords = preferred_payment.map((method: string) => ({
        veterinarian_id: (veterinarian as any).id,
        payment_method: method,
      }))

      const { error: paymentsError } = await (supabase as any)
        .from('veterinarian_payment_methods')
        .insert(paymentRecords)

      if (paymentsError) {
        console.error('Error creating payment method records:', paymentsError)
        // Don't fail the entire request if payments fail
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      veterinarian,
      message: 'Veterinarian added successfully'
    })
    
  } catch (error) {
    console.error('Veterinarians POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Only farm owners and managers can update veterinarians
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const { id, ...updateData } = body

    const supabase = await createServerSupabaseClient()

    // Verify the veterinarian belongs to the user's farm
    const { data: existingVetResult, error: fetchError } = await supabase
      .from('veterinarians')
      .select('farm_id')
      .eq('id', id)
      .single()
    
    // Cast to any to check farm_id
    const existingVet = existingVetResult as any

    if (fetchError || !existingVet) {
      return NextResponse.json({ error: 'Veterinarian not found' }, { status: 404 })
    }
    
    if (existingVet.farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // If this veterinarian is being set as primary, update existing primary
    if (updateData.is_primary) {
      // Cast supabase to any
      await (supabase as any)
        .from('veterinarians')
        .update({ is_primary: false })
        .eq('farm_id', userRole.farm_id)
        .eq('is_primary', true)
        .neq('id', id)
    }
    
    // Update the veterinarian record
    // Cast supabase to any
    const { data: veterinarian, error: updateError } = await (supabase as any)
      .from('veterinarians')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating veterinarian:', updateError)
      return NextResponse.json({ error: 'Failed to update veterinarian record' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      veterinarian,
      message: 'Veterinarian updated successfully'
    })
    
  } catch (error) {
    console.error('Veterinarians PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Only farm owners and managers can delete veterinarians
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const veterinarianId = searchParams.get('id')
    
    if (!veterinarianId) {
      return NextResponse.json({ error: 'Veterinarian ID is required' }, { status: 400 })
    }
    
    const supabase = await createServerSupabaseClient()
    
    // Verify the veterinarian belongs to the user's farm
    const { data: existingVetResult, error: fetchError } = await supabase
      .from('veterinarians')
      .select('farm_id, is_primary')
      .eq('id', veterinarianId)
      .single()
    
    // Cast to any
    const existingVet = existingVetResult as any

    if (fetchError || !existingVet) {
      return NextResponse.json({ error: 'Veterinarian not found' }, { status: 404 })
    }
    
    if (existingVet.farm_id !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Soft delete - mark as inactive instead of hard delete
    // Cast supabase to any
    const { error: deleteError } = await (supabase as any)
      .from('veterinarians')
      .update({ 
        is_active: false,
        is_primary: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', veterinarianId)
    
    if (deleteError) {
      console.error('Error deleting veterinarian:', deleteError)
      return NextResponse.json({ error: 'Failed to delete veterinarian record' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Veterinarian removed successfully'
    })
    
  } catch (error) {
    console.error('Veterinarians DELETE API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}