// app/api/farms/[farmId]/feed-management/feed-types/suitable/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface FeedInventory {
  id: string;
  feed_type_id: string;
  quantity_kg: number;
  cost_per_kg: number;
  purchase_date: string;
  expiry_date: string;
  supplier: string;
  batch_number: string;
  notes: string;
}

interface FeedType {
  id: string;
  name: string;
  description: string | null;
  typical_cost_per_kg: number | null;
  nutritional_info: any;
  supplier: string | null;
  category_id: string | null;
  animal_categories: string[];
  preferred_measurement_unit: string | null;
  low_stock_threshold: number | null;
  feed_type_categories: { id: string; name: string; color: string; description: string | null; } | null;
  feed_inventory?: FeedInventory[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { farmId } = await params  // Add await here
    const { searchParams } = new URL(request.url)
    
    const animalCategoryId = searchParams.get('animal_category_id')
    const includeInventory = searchParams.get('include_inventory') === 'true'

    // Build the base query for feed types
    let feedTypesQuery = supabase
      .from('feed_types')
      .select(`
        id,
        name,
        description,
        typical_cost_per_kg,
        nutritional_info,
        supplier,
        category_id,
        animal_categories,
        preferred_measurement_unit,
        low_stock_threshold,
        feed_type_categories (
          id,
          name,
          color,
          description
        )
      `)
      .eq('farm_id', farmId)
      .order('name', { ascending: true })

    // If specific animal category is requested, filter feed types
    if (animalCategoryId) {
      // Use the PostgreSQL array contains operator to find feed types
      // that include this animal category in their animal_categories array
      feedTypesQuery = feedTypesQuery.contains('animal_categories', [animalCategoryId])
    }

    const { data: feedTypes, error: feedTypesError } = await feedTypesQuery as { 
      data: FeedType[] | null;
      error: any;
    }

    if (feedTypesError) {
      console.error('Error fetching feed types:', feedTypesError)
      return NextResponse.json(
        { error: 'Failed to fetch feed types' },
        { status: 500 }
      )
    }

    let feedTypesWithInventory = feedTypes || []

    // If inventory is requested, load inventory data for each feed type
    if (includeInventory && feedTypes && feedTypes.length > 0) {
      const feedTypeIds = feedTypes.map(ft => ft.id)
      
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('feed_inventory')
        .select(`
          id,
          feed_type_id,
          quantity_kg,
          cost_per_kg,
          purchase_date,
          expiry_date,
          supplier,
          batch_number,
          notes
        `)
        .eq('farm_id', farmId)
        .in('feed_type_id', feedTypeIds)
        .gt('quantity_kg', 0) // Only include inventory with remaining stock
        .order('expiry_date', { ascending: true, nullsFirst: false })

      if (inventoryError) {
        console.error('Error fetching inventory:', inventoryError)
        // Continue without inventory data rather than failing
      }

      // Group inventory by feed type
      const inventoryByFeedType = (inventoryData || []).reduce((acc, item: any) => {
        // Cast item to any to fix "Property 'feed_type_id' does not exist on type 'never'"
        if (!acc[item.feed_type_id]) {
          acc[item.feed_type_id] = []
        }
        acc[item.feed_type_id].push(item)
        return acc
      }, {} as Record<string, any[]>)

      // Attach inventory data to feed types
      feedTypesWithInventory = feedTypes.map(feedType => ({
        ...feedType,
        feed_inventory: inventoryByFeedType[feedType.id] || []
      }))

      // If animal category is specified, only return feed types that have inventory
      // or allow showing all if no category filter is applied
      if (animalCategoryId) {
        feedTypesWithInventory = feedTypesWithInventory.filter(
          feedType => (feedType.feed_inventory ?? []).length > 0
        )
      }
    }

    // Calculate summary statistics
    const totalFeedTypes = feedTypesWithInventory.length
    const feedTypesWithStock = feedTypesWithInventory.filter(
      ft => ft.feed_inventory && ft.feed_inventory.length > 0
    ).length
    
    const totalInventoryValue = feedTypesWithInventory.reduce((sum, feedType) => {
      const inventoryValue = (feedType.feed_inventory || []).reduce((invSum: number, inv: any) => {
        return invSum + ((inv.quantity_kg || 0) * (inv.cost_per_kg || 0))
      }, 0)
      return sum + inventoryValue
    }, 0)

    const totalStockKg = feedTypesWithInventory.reduce((sum, feedType) => {
      const stockKg = (feedType.feed_inventory || []).reduce((invSum: number, inv: any) => {
        return invSum + (inv.quantity_kg || 0)
      }, 0)
      return sum + stockKg
    }, 0)

    return NextResponse.json({
      success: true,
      data: feedTypesWithInventory,
      summary: {
        total_feed_types: totalFeedTypes,
        feed_types_with_stock: feedTypesWithStock,
        total_inventory_value: totalInventoryValue,
        total_stock_kg: totalStockKg,
        filtered_by_category: !!animalCategoryId
      }
    })

  } catch (error) {
    console.error('Error in suitable feed types API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}