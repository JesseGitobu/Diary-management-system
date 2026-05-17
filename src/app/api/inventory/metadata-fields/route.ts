//src/app/api/inventory/metadata-fields/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser }            from '@/lib/supabase/server'
import { getMetadataFields }         from '@/lib/database/inventory'
 
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }
 
    const { searchParams } = new URL(request.url)
    const categoryId    = searchParams.get('category_id')
    const subcategoryId = searchParams.get('subcategory_id') ?? undefined
 
    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'category_id is required' },
        { status: 400 }
      )
    }
 
    const fields = await getMetadataFields(categoryId, subcategoryId)
    return NextResponse.json({ success: true, data: fields })
  } catch (err) {
    console.error('❌ GET /api/inventory/metadata-fields:', err)
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 })
  }
}
 