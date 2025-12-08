import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('Financial transactions API GET called')
    
    const user = await getCurrentUser()
    console.log('Current user:', user?.id)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    console.log('User role:', userRole)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const { searchParams } = new URL(request.url)
    const farmId = searchParams.get('farmId')
    console.log('Requested farmId:', farmId)
    console.log('User farmId:', userRole.farm_id)
    
    // Verify user owns the farm
    if (farmId !== userRole.farm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // For now, return empty array to test
    return NextResponse.json({ 
      success: true, 
      data: [],
      message: 'No transactions found'
    })
    
  } catch (error) {
    console.error('Financial transactions API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Your existing POST handler...
  return NextResponse.json({ success: true, message: 'POST method works' })
}