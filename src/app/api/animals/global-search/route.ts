// app/api/animals/global-search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('q') || ''
    const farmId = searchParams.get('farm_id')

    if (!farmId) {
      return NextResponse.json(
        { error: 'farm_id is required' },
        { status: 400 }
      )
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to this farm
    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()

    // Search all animals by tag number, name, or breed
    let query = supabase
      .from('animals')
      .select(`
        id,
        tag_number,
        name,
        breed,
        gender,
        production_status,
        health_status,
        birth_date,
        animal_source,
        status
      `)
      .eq('farm_id', farmId)
      .eq('status', 'active')
      .order('tag_number', { ascending: true })

    // Apply search term - search across tag, name, and breed
    if (searchQuery.trim()) {
      const searchTerm = `%${searchQuery}%`
      query = query.or(
        `tag_number.ilike.${searchTerm},name.ilike.${searchTerm},breed.ilike.${searchTerm}`
      )
    }

    const { data: animals, error } = await query

    if (error) {
      console.error('Error searching animals:', error)
      return NextResponse.json(
        { error: 'Failed to search animals' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      results: animals || [],
      totalResults: (animals || []).length
    })
  } catch (err) {
    console.error('Global animal search error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
