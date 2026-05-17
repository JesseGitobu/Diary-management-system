//src/app/api/inventory/units/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser }            from '@/lib/supabase/server'
import { getUnitsOfMeasure }         from '@/lib/database/inventory'
 
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }
 
    const units = await getUnitsOfMeasure()
    return NextResponse.json({ success: true, data: units })
  } catch (err) {
    console.error('❌ GET /api/inventory/units:', err)
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}