// src/app/api/animals/mothers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getAvailableMothers } from '@/lib/database/animals'

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
    
    // Get farmId from query params
    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')
    
    // Verify user owns the farm
    if (farmId !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const mothers = await getAvailableMothers(userRole.farm_id)
    
    return NextResponse.json({ 
      success: true, 
      mothers,
      count: mothers.length 
    })
    
  } catch (error) {
    console.error('Mothers API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}