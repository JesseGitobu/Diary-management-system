// app/api/animals/import/route.ts (Fixed JWT handling)
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

interface ImportAnimal {
  tag_number: string
  name?: string
  breed?: string
  gender: 'male' | 'female'
  date_of_birth?: string
  animal_source: 'newborn_calf' | 'purchased_animal'
  mother_tag?: string
  father_tag?: string
  birth_weight_kg?: number
  seller_name?: string
  seller_contact?: string
  purchase_date?: string
  purchase_price?: number
  production_status?: 'calf' | 'heifer' | 'served' | 'lactating' | 'dry'
  health_status?: 'healthy' | 'sick' | 'injured' | 'quarantine'
  notes?: string
}

interface ImportRequest {
  farmId: string
  animals: ImportAnimal[]
}

export async function POST(request: NextRequest) {
  try {
    // Get cookies and create Supabase client
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => Promise.resolve(cookieStore),
    })
    
    // Try to get user from session first
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('User authentication failed:', userError)
      
      // Try alternative method with Authorization header
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        
        // Validate token format (JWT should have 3 parts separated by dots)
        const tokenParts = token.split('.')
        if (tokenParts.length !== 3) {
          return NextResponse.json(
            { error: 'Invalid token format' }, 
            { status: 401 }
          )
        }
        
        try {
          // Try to get user with the token
          const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
          
          if (tokenError || !tokenUser) {
            console.error('Token validation failed:', tokenError)
            return NextResponse.json(
              { error: 'Invalid authentication token' }, 
              { status: 401 }
            )
          }
          
          // Use the validated user
          const validatedUser = tokenUser
          return await processImport(supabase, request, validatedUser)
          
        } catch (tokenParseError) {
          console.error('Token parsing error:', tokenParseError)
          return NextResponse.json(
            { error: 'Token validation failed' }, 
            { status: 401 }
          )
        }
      }
      
      return NextResponse.json(
        { error: 'Authentication required. Please log in again.' }, 
        { status: 401 }
      )
    }
    
    // Process with authenticated user
    return await processImport(supabase, request, user)
    
  } catch (error) {
    console.error('Import API error:', error)
    return NextResponse.json(
      { error: 'Internal server error during import' },
      { status: 500 }
    )
  }
}

async function processImport(supabase: any, request: NextRequest, user: any) {
  try {
    const body: ImportRequest = await request.json()
    const { farmId, animals } = body

    if (!farmId || !animals || !Array.isArray(animals)) {
      return NextResponse.json(
        { error: 'Invalid request body. farmId and animals array required.' },
        { status: 400 }
      )
    }

    // Verify user has access to this farm
    const { data: farmAccess, error: farmError } = await supabase
      .from('farm_members')
      .select('role')
      .eq('farm_id', farmId)
      .eq('user_id', user.id)
      .single()

    if (farmError || !farmAccess) {
      console.error('Farm access error:', farmError)
      return NextResponse.json(
        { error: 'Farm not found or access denied' }, 
        { status: 403 }
      )
    }

    // Check if user can add animals
    const canAddAnimals = ['farm_owner', 'farm_manager', 'worker'].includes(farmAccess.role)
    if (!canAddAnimals) {
      return NextResponse.json(
        { error: 'Insufficient permissions to add animals' }, 
        { status: 403 }
      )
    }

    // Process animals in batches
    const batchSize = 50
    const results = {
      imported: 0,
      skipped: 0,
      animals: [] as any[],
      errors: [] as string[]
    }

    for (let i = 0; i < animals.length; i += batchSize) {
      const batch = animals.slice(i, i + batchSize)
      const processedBatch = await processBatch(supabase, farmId, batch, user.id)
      
      results.imported += processedBatch.imported
      results.skipped += processedBatch.skipped
      results.animals.push(...processedBatch.animals)
      results.errors.push(...processedBatch.errors)
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Process import error:', error)
    return NextResponse.json(
      { error: 'Failed to process import request' },
      { status: 500 }
    )
  }
}

async function processBatch(
  supabase: any,
  farmId: string,
  animals: ImportAnimal[],
  userId: string
) {
  const results = {
    imported: 0,
    skipped: 0,
    animals: [] as any[],
    errors: [] as string[]
  }

  try {
    // Get existing tag numbers to check for duplicates
    const { data: existingAnimals } = await supabase
      .from('animals')
      .select('tag_number')
      .eq('farm_id', farmId)

    const existingTags = new Set(existingAnimals?.map((a: any) => a.tag_number) || [])

    // Get existing parent animals for validation
    const parentTags = animals
      .filter(a => a.mother_tag || a.father_tag)
      .flatMap(a => [a.mother_tag, a.father_tag].filter(Boolean))
    
    let parentTagMap = new Map()
    if (parentTags.length > 0) {
      const { data: parentAnimals } = await supabase
        .from('animals')
        .select('tag_number, id')
        .eq('farm_id', farmId)
        .in('tag_number', parentTags)

      parentTagMap = new Map(parentAnimals?.map((p: any) => [p.tag_number, p.id]) || [])
    }

    // Process each animal
    for (const animal of animals) {
      try {
        // Skip if tag number already exists
        if (existingTags.has(animal.tag_number)) {
          results.skipped++
          results.errors.push(`Tag ${animal.tag_number} already exists`)
          continue
        }

        // Validate and sanitize data
        const sanitizedAnimal = sanitizeAnimalData(animal, parentTagMap)
        
        if (!sanitizedAnimal) {
          results.skipped++
          results.errors.push(`Invalid data for tag ${animal.tag_number}`)
          continue
        }

        // Insert the animal
        const { data: newAnimal, error: insertError } = await supabase
          .from('animals')
          .insert({
            ...sanitizedAnimal,
            farm_id: farmId,
            created_by: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (insertError) {
          results.skipped++
          results.errors.push(`Failed to insert tag ${animal.tag_number}: ${insertError.message}`)
          continue
        }

        results.imported++
        results.animals.push(newAnimal)
        
        // Add to existing tags to prevent duplicates in the same batch
        existingTags.add(animal.tag_number)

      } catch (error) {
        results.skipped++
        results.errors.push(`Error processing tag ${animal.tag_number}: ${error}`)
      }
    }
  } catch (batchError) {
    console.error('Batch processing error:', batchError)
    results.errors.push(`Batch processing failed: ${batchError}`)
  }

  return results
}

function sanitizeAnimalData(animal: ImportAnimal, parentTagMap: Map<string, string>) {
  try {
    // Required fields validation
    if (!animal.tag_number || !animal.gender) {
      return null
    }

    const sanitized: any = {
      tag_number: String(animal.tag_number).trim(),
      gender: animal.gender,
      animal_source: animal.animal_source || 'purchased_animal'
    }

    // Optional basic fields
    if (animal.name) sanitized.name = String(animal.name).trim()
    if (animal.breed) sanitized.breed = String(animal.breed).trim()
    if (animal.notes) sanitized.notes = String(animal.notes).trim()

    // Date fields
    if (animal.date_of_birth) {
      const birthDate = new Date(animal.date_of_birth)
      if (!isNaN(birthDate.getTime())) {
        sanitized.date_of_birth = birthDate.toISOString().split('T')[0]
      }
    }

    if (animal.purchase_date) {
      const purchaseDate = new Date(animal.purchase_date)
      if (!isNaN(purchaseDate.getTime())) {
        sanitized.purchase_date = purchaseDate.toISOString().split('T')[0]
      }
    }

    // Status fields with validation
    const validProductionStatuses = ['calf', 'heifer', 'served', 'lactating', 'dry']
    if (animal.production_status && validProductionStatuses.includes(animal.production_status)) {
      sanitized.production_status = animal.production_status
    } else {
      sanitized.production_status = 'calf' // default
    }

    const validHealthStatuses = ['healthy', 'sick', 'injured', 'quarantine']
    if (animal.health_status && validHealthStatuses.includes(animal.health_status)) {
      sanitized.health_status = animal.health_status
    } else {
      sanitized.health_status = 'healthy' // default
    }

    // Parent information (for newborn calves)
    if (animal.mother_tag && parentTagMap.has(animal.mother_tag)) {
      sanitized.mother_id = parentTagMap.get(animal.mother_tag)
    }
    
    if (animal.father_tag && parentTagMap.has(animal.father_tag)) {
      sanitized.father_id = parentTagMap.get(animal.father_tag)
    }

    // Numeric fields
    if (animal.birth_weight_kg) {
      const weight = Number(animal.birth_weight_kg)
      if (!isNaN(weight) && weight > 0) {
        sanitized.birth_weight_kg = weight
      }
    }

    if (animal.purchase_price) {
      const price = Number(animal.purchase_price)
      if (!isNaN(price) && price > 0) {
        sanitized.purchase_price = price
      }
    }

    // Purchase-specific fields
    if (animal.seller_name) sanitized.seller_name = String(animal.seller_name).trim()
    if (animal.seller_contact) sanitized.seller_contact = String(animal.seller_contact).trim()

    return sanitized
  } catch (error) {
    console.error('Error sanitizing animal data:', error)
    return null
  }
}