// src/app/api/suppliers/route.ts
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
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 403 })
    }
    
    const supabase = await createServerSupabaseClient()
    
    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('farm_id', userRole.farm_id)
      .eq('status', 'active')
      .order('name')
    
    if (error) {
      console.error('Error fetching suppliers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch suppliers' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ suppliers })
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 403 })
    }
    
    // Check if user has permission to manage suppliers
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const supabase = await createServerSupabaseClient()
    
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert({
        farm_id: userRole.farm_id,
        name: body.name,
        contact_person: body.contact_person || null,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        supplier_type: body.supplier_type || null,
        payment_terms: body.payment_terms || null,
        notes: body.notes || null,
        status: 'active'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating supplier:', error)
      return NextResponse.json(
        { error: 'Failed to create supplier' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ supplier }, { status: 201 })
  } catch (error) {
    console.error('Error creating supplier:', error)
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    )
  }
}