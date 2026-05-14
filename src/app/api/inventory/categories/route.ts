import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * GET /api/inventory/categories
 * Get all active inventory categories with their subcategories
 * 
 * Optional query params:
 * - include_subcategories: 'true' to include subcategories (default: true)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const includeSubcategories = searchParams.get('include_subcategories') !== 'false'

    // Fetch all active categories
    const { data: categories, error: catError } = await supabase
      .from('inventory_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (catError) throw new Error(`Failed to fetch categories: ${catError.message}`)

    if (!includeSubcategories) {
      return NextResponse.json({ success: true, data: categories || [] })
    }

    // Fetch all active subcategories
    const { data: subcategories, error: subError } = await supabase
      .from('inventory_subcategories')
      .select('*')
      .eq('is_active', true)
      .order('category_id, sort_order', { ascending: true })

    if (subError) throw new Error(`Failed to fetch subcategories: ${subError.message}`)

    // Group subcategories by category_id
    const subcatsByCategory = (subcategories || []).reduce((acc: any, subcat: any) => {
      if (!acc[subcat.category_id]) acc[subcat.category_id] = []
      acc[subcat.category_id].push(subcat)
      return acc
    }, {})

    // Attach subcategories to categories
    const enrichedCategories = (categories || []).map(cat => ({
      ...cat,
      subcategories: subcatsByCategory[cat.id] || [],
    }))

    return NextResponse.json({ success: true, data: enrichedCategories })
  } catch (error) {
    console.error('❌ [API] Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories', success: false },
      { status: 500 }
    )
  }
}
