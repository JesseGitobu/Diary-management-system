// src/app/api/animals/calculate-production-status/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { 
  calculateAgeDays, 
  getProductionStatusFromCategories 
} from '@/lib/utils/productionStatusUtils'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { birth_date, gender, farm_id } = body

    if (!birth_date || !gender || !farm_id) {
      return NextResponse.json(
        { error: 'Missing required fields: birth_date, gender, farm_id' },
        { status: 400 }
      )
    }

    // Calculate age
    const ageDays = calculateAgeDays(birth_date)

    // Fetch animal categories for this farm
    const supabase = await createServerSupabaseClient()
    const { data: categories, error: categoriesError } = await supabase
      .from('animal_categories')
      .select('*')
      .eq('farm_id', farm_id)
      .order('sort_order', { ascending: true })

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
    }

    // Determine production status
    const productionStatus = getProductionStatusFromCategories(
      ageDays,
      gender,
      (categories || []).map(cat => ({
        ...cat,
        min_age_days: cat.min_age_days ?? undefined,
        max_age_days: cat.max_age_days ?? undefined,
        gender: cat.gender ?? undefined,
        production_status: (cat.production_status as "calf" | "heifer" | "bull" | "served" | "lactating" | "dry" | null | undefined),
        characteristics: cat.characteristics ? {
          lactating: (cat.characteristics as any).lactating,
          pregnant: (cat.characteristics as any).pregnant,
          breeding_male: (cat.characteristics as any).breeding_male,
          growth_phase: (cat.characteristics as any).growth_phase
        } : {}
      }))
    )

    // Find matching category
    const matchingCategory = categories?.find(cat => {
      const minAge = cat.min_age_days ?? 0
      const maxAge = cat.max_age_days ?? Infinity
      const genderMatch = !cat.gender || cat.gender === gender
      return ageDays >= minAge && ageDays <= maxAge && genderMatch
    })

    return NextResponse.json({
      production_status: productionStatus,
      age_days: ageDays,
      age_months: Math.floor(ageDays / 30),
      matching_category: matchingCategory ? {
        id: matchingCategory.id,
        name: matchingCategory.name
      } : null
    })

  } catch (error) {
    console.error('Error calculating production status:', error)
    return NextResponse.json(
      { error: 'Failed to calculate production status' },
      { status: 500 }
    )
  }
}

// GET endpoint to recalculate for existing animal
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const animalId = searchParams.get('animalId')
    const farmId = searchParams.get('farmId')

    if (!animalId || !farmId) {
      return NextResponse.json(
        { error: 'Missing animalId or farmId' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Fetch animal
    const { data: animal, error: animalError } = await supabase
      .from('animals')
      .select('id, birth_date, gender, production_status')
      .eq('id', animalId)
      .eq('farm_id', farmId)
      .single()

    if (animalError || !animal) {
      return NextResponse.json(
        { error: 'Animal not found' },
        { status: 404 }
      )
    }

    // Calculate using POST logic
    if (!animal.birth_date) {
      return NextResponse.json(
        { error: 'Birth date is required' },
        { status: 400 }
      )
    }
    const ageDays = calculateAgeDays(animal.birth_date)

    const { data: categories } = await supabase
      .from('animal_categories')
      .select('*')
      .eq('farm_id', farmId)
      .order('sort_order', { ascending: true })

    if (!animal.gender) {
      return NextResponse.json(
        { error: 'Gender is required' },
        { status: 400 }
      )
    }

    const calculatedStatus = getProductionStatusFromCategories(
      ageDays,
      animal.gender as 'male' | 'female',
      (categories || []).map(cat => ({
        ...cat,
        min_age_days: cat.min_age_days ?? undefined,
        max_age_days: cat.max_age_days ?? undefined,
        gender: cat.gender ?? undefined,
        production_status: (cat.production_status as "calf" | "heifer" | "bull" | "served" | "lactating" | "dry" | null | undefined),
        characteristics: cat.characteristics ? {
          lactating: (cat.characteristics as any).lactating,
          pregnant: (cat.characteristics as any).pregnant,
          breeding_male: (cat.characteristics as any).breeding_male,
          growth_phase: (cat.characteristics as any).growth_phase
        } : {}
      }))
    )

    return NextResponse.json({
      current_production_status: animal.production_status,
      calculated_production_status: calculatedStatus,
      should_update: animal.production_status !== calculatedStatus,
      age_days: ageDays,
      age_months: Math.floor(ageDays / 30)
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate production status' },
      { status: 500 }
    )
  }
}