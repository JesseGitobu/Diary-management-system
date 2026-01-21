// app/actions/import-animals.ts (Mapped to your database schema)
'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

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
  production_status?: 'calf' | 'heifer' | 'bull' | 'served' | 'lactating' | 'dry'
  health_status?: 'healthy' | 'sick' | 'injured' | 'quarantine'
  notes?: string
}

interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  animals: any[]
  errors: string[]
  message?: string
}

export async function importAnimalsActionWithAuth(
  farmId: string,
  animals: ImportAnimal[]
): Promise<ImportResult> {
  try {
    console.log('🚀 Starting authenticated import for farm:', farmId)

    // Authentication logic (same as before)
    let user = null
    let supabase = null

    try {
      const cookieStore = await cookies()
      supabase = createServerActionClient({ cookies: () => Promise.resolve(cookieStore) })
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authUser && !authError) {
        user = authUser
        console.log('✅ Authentication successful via server action client:', user.id)
      } else {
        console.log('⚠️ Server action auth failed:', authError?.message)
      }
    } catch (serverActionError) {
      console.log('⚠️ Server action client error:', serverActionError)
    }

    // Fallback authentication method
    if (!user) {
      console.log('🔄 Trying fallback authentication method...')
      
      try {
        const cookieStore = await cookies()
        const allCookies = cookieStore.getAll()
        
        const authCookies = allCookies.filter(cookie => 
          cookie.name.includes('auth-token') || 
          cookie.name.includes('supabase') ||
          cookie.name.includes('sb-')
        )
        
        let accessToken = null
        for (const cookie of authCookies) {
          try {
            if (cookie.value.startsWith('base64-')) {
              const decoded = Buffer.from(cookie.value.substring(7), 'base64').toString()
              const parsed = JSON.parse(decoded)
              if (parsed.access_token) {
                accessToken = parsed.access_token
                break
              }
            } else if (cookie.value.includes('access_token')) {
              const parsed = JSON.parse(cookie.value)
              if (parsed.access_token) {
                accessToken = parsed.access_token
                break
              }
            }
          } catch (parseError) {
            console.log(`⚠️ Could not parse cookie ${cookie.name}:`, parseError)
          }
        }
        
        if (accessToken && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          const serviceSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
              auth: { autoRefreshToken: false, persistSession: false }
            }
          )
          
          const { data: { user: tokenUser }, error: tokenError } = await serviceSupabase.auth.getUser(accessToken)
          
          if (tokenUser && !tokenError) {
            user = tokenUser
            supabase = serviceSupabase
            console.log('✅ Token verification successful:', user.id)
          }
        }
      } catch (fallbackError) {
        console.log('❌ Fallback authentication error:', fallbackError)
      }
    }

    if (!user || !supabase) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        animals: [],
        errors: ['Authentication failed. Please log out and log back in.'],
        message: 'Authentication required'
      }
    }

    // Verify farm access
    const { data: farmAccess, error: farmError } = await supabase
      .from('user_roles')
      .select('role_type')
      .eq('farm_id', farmId)
      .eq('user_id', user.id)
      .single()

    if (farmError || !farmAccess) {
      console.error('❌ Farm access error:', farmError)
      return {
        success: false,
        imported: 0,
        skipped: 0,
        animals: [],
        errors: ['Farm not found or access denied'],
        message: 'Access denied'
      }
    }

    const canAddAnimals = ['farm_owner', 'farm_manager', 'worker'].includes(farmAccess.role_type)
    if (!canAddAnimals) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        animals: [],
        errors: ['Insufficient permissions to add animals'],
        message: 'Permission denied'
      }
    }

    console.log('✅ Permissions verified:', farmAccess.role_type)

    // Process animals
    const batchSize = 10
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

    revalidatePath(`/farms/${farmId}/animals`)

    console.log('🎉 Import completed:', {
      imported: results.imported,
      skipped: results.skipped
    })

    return {
      success: true,
      imported: results.imported,
      skipped: results.skipped,
      animals: results.animals,
      errors: results.errors,
      message: `Successfully imported ${results.imported} animals`
    }

  } catch (error) {
    console.error('💥 Server action error:', error)
    return {
      success: false,
      imported: 0,
      skipped: 0,
      animals: [],
      errors: [`Server error: ${error}`],
      message: 'Import failed due to server error'
    }
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
    // Get existing tag numbers (your table has unique constraint on tag_number globally)
    const { data: existingAnimals } = await supabase
      .from('animals')
      .select('tag_number')
      .eq('farm_id', farmId)

    const existingTags = new Set(existingAnimals?.map((a: any) => a.tag_number) || [])

    // Get parent animals for validation
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
        console.log(`🐄 Processing animal: ${animal.tag_number}`)

        if (existingTags.has(animal.tag_number)) {
          results.skipped++
          results.errors.push(`Tag ${animal.tag_number} already exists`)
          continue
        }

        const sanitizedAnimal = sanitizeAnimalDataForYourSchema(animal, parentTagMap)
        
        if (!sanitizedAnimal) {
          results.skipped++
          results.errors.push(`Invalid data for tag ${animal.tag_number}`)
          continue
        }

        // Map to your database schema
        const insertData = {
          farm_id: farmId,
          tag_number: sanitizedAnimal.tag_number,
          name: sanitizedAnimal.name || null,
          breed: sanitizedAnimal.breed || null,
          gender: sanitizedAnimal.gender,
          birth_date: sanitizedAnimal.birth_date || null, // Your field is birth_date not date_of_birth
          weight: sanitizedAnimal.birth_weight || null, // Map birth_weight to weight
          animal_source: sanitizedAnimal.animal_source,
          mother_id: sanitizedAnimal.mother_id || null,
          father_id: sanitizedAnimal.father_id || null,
          purchase_date: sanitizedAnimal.purchase_date || null,
          purchase_price: sanitizedAnimal.purchase_price || null,
          production_status: sanitizedAnimal.production_status || 'calf',
          health_status: sanitizedAnimal.health_status || null, // No constraint on health_status values
          notes: sanitizedAnimal.notes || null,
          status: 'active', // Default status
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          
          // Additional fields from seller info
          seller_info: sanitizedAnimal.seller_info || null, // Map seller_name + seller_contact
          birth_weight: sanitizedAnimal.birth_weight || null // Your separate birth_weight field
        }

        console.log('💾 Inserting mapped data:', insertData)

        const { data: newAnimal, error: insertError } = await supabase
          .from('animals')
          .insert(insertData)
          .select()
          .single()

        if (insertError) {
          results.skipped++
          results.errors.push(`Failed to insert ${animal.tag_number}: ${insertError.message}`)
          console.error(`❌ Insert failed for ${animal.tag_number}:`, insertError)
          continue
        }

        results.imported++
        results.animals.push(newAnimal)
        existingTags.add(animal.tag_number)
        
        console.log(`✅ Successfully imported: ${animal.tag_number}`)

      } catch (error) {
        results.skipped++
        results.errors.push(`Error processing ${animal.tag_number}: ${error}`)
        console.error(`💥 Error processing ${animal.tag_number}:`, error)
      }
    }
  } catch (batchError) {
    results.errors.push(`Batch processing failed: ${batchError}`)
    console.error('💥 Batch error:', batchError)
  }

  return results
}

function sanitizeAnimalDataForYourSchema(animal: ImportAnimal, parentTagMap: Map<string, string>) {
  try {
    if (!animal.tag_number || !animal.gender) {
      console.log(`❌ Missing required fields:`, { 
        tag_number: animal.tag_number, 
        gender: animal.gender 
      })
      return null
    }

    const sanitized: any = {
      tag_number: String(animal.tag_number).trim(),
      gender: animal.gender, // Must be 'male' or 'female' (matches your constraint)
      animal_source: animal.animal_source || 'purchased_animal' // Must match your constraint
    }

    // Optional basic fields
    if (animal.name) sanitized.name = String(animal.name).trim()
    if (animal.breed) sanitized.breed = String(animal.breed).trim()
    if (animal.notes) sanitized.notes = String(animal.notes).trim()

    // Date fields - map to your schema
    if (animal.date_of_birth) {
      const birthDate = new Date(animal.date_of_birth)
      if (!isNaN(birthDate.getTime())) {
        sanitized.birth_date = birthDate.toISOString().split('T')[0] // Your field is birth_date
      }
    }

    if (animal.purchase_date) {
      const purchaseDate = new Date(animal.purchase_date)
      if (!isNaN(purchaseDate.getTime())) {
        sanitized.purchase_date = purchaseDate.toISOString().split('T')[0]
      }
    }

    // Production status - validate against your constraints
    const validProductionStatuses = ['calf', 'heifer', 'served', 'lactating', 'dry']
    if (animal.production_status && validProductionStatuses.includes(animal.production_status)) {
      sanitized.production_status = animal.production_status
    } else {
      sanitized.production_status = 'calf' // Default
    }

    // Health status - your table doesn't have constraints, so any value is OK
    if (animal.health_status) {
      sanitized.health_status = animal.health_status
    }

    // Parent information
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
        sanitized.birth_weight = weight // Map to your birth_weight field
      }
    }

    if (animal.purchase_price) {
      const price = Number(animal.purchase_price)
      if (!isNaN(price) && price > 0) {
        sanitized.purchase_price = price
      }
    }

    // Seller information - combine into seller_info field
    if (animal.seller_name || animal.seller_contact) {
      const sellerParts = []
      if (animal.seller_name) sellerParts.push(`Name: ${animal.seller_name}`)
      if (animal.seller_contact) sellerParts.push(`Contact: ${animal.seller_contact}`)
      sanitized.seller_info = sellerParts.join(', ')
    }

    console.log(`✅ Sanitized animal data for ${animal.tag_number}`)
    return sanitized
  } catch (error) {
    console.error('💥 Error sanitizing animal data:', error)
    return null
  }
}