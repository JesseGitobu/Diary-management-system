// Image upload endpoint for health records
// src/app/api/health/records/upload-images/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'

export async function POST(request: NextRequest) {
  const operationId = `IMG-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`
  
  try {
    console.log('\n📸 ========== IMAGE UPLOAD REQUEST ==========')
    console.log(`📸 Operation ID: ${operationId}`)
    console.log(`📸 Timestamp: ${new Date().toISOString()}`)
    
    const user = await getCurrentUser()
    
    if (!user) {
      console.log(`❌ ${operationId}: No authenticated user`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log(`✅ ${operationId}: User authenticated: ${user.id}`)
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      console.log(`❌ ${operationId}: No farm associated with user`)
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    console.log(`✅ ${operationId}: Farm ID: ${userRole.farm_id}`)

    const formData = await request.formData()
    console.log(`📸 ${operationId}: FormData received with keys:`, Array.from(formData.keys()))
    
    const recordId = formData.get('record_id') as string
    console.log(`📸 ${operationId}: Record ID from request: ${recordId}`)
    
    if (!recordId) {
      console.log(`❌ ${operationId}: No record_id provided in FormData`)
      return NextResponse.json(
        { error: 'record_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    
    // Verify the record exists and belongs to the user's farm
    console.log(`🔍 ${operationId}: Verifying health record ownership...`)
    const { data: record, error: recordError } = await (supabase as any)
      .from('animal_health_records')
      .select('id, farm_id')
      .eq('id', recordId)
      .eq('farm_id', userRole.farm_id)
      .single()
    
    if (recordError) {
      console.log(`❌ ${operationId}: Health record lookup error:`, recordError)
    }
    if (!record) {
      console.log(`❌ ${operationId}: Health record not found or not in user's farm`)
      return NextResponse.json(
        { error: 'Health record not found or access denied' },
        { status: 404 }
      )
    }
    console.log(`✅ ${operationId}: Health record verified:`, { id: record.id, farm_id: record.farm_id })

    const uploadedImages = []
    const errors = []
    let imageCount = 0

    // Process each uploaded image
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image_') && value instanceof File) {
        imageCount++
        try {
          const file = value as File
          console.log(`\n📸 ${operationId}: Processing image ${imageCount}: ${file.name}`)
          console.log(`  • Size: ${file.size} bytes`)
          console.log(`  • Type: ${file.type}`)
          
          if (!file.type.startsWith('image/')) {
            const err = `${file.name}: Invalid file type. Only images are allowed.`
            console.warn(`⚠️ ${operationId}: ${err}`)
            errors.push(err)
            continue
          }

          // Validate file size (max 10MB)
          const maxSize = 10 * 1024 * 1024 // 10MB
          if (file.size > maxSize) {
            const err = `${file.name}: File size exceeds 10MB limit.`
            console.warn(`⚠️ ${operationId}: ${err}`)
            errors.push(err)
            continue
          }

          // Generate unique filename
          const timestamp = Date.now()
          const random = Math.random().toString(36).substring(7)
          const extension = file.name.split('.').pop()
          const filename = `health-records/${userRole.farm_id}/${recordId}/${timestamp}-${random}.${extension}`
          console.log(`📸 ${operationId}: Generated storage path: ${filename}`)

          // Upload to Supabase Storage
          console.log(`📸 ${operationId}: Uploading to storage...`)
          const { data: uploadData, error: uploadError } = await (supabase
            .storage
            .from('farm-documents') as any)
            .upload(filename, file, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            const err = `${file.name}: Storage upload failed - ${uploadError.message}`
            console.error(`❌ ${operationId}: ${err}`)
            errors.push(err)
            continue
          }
          console.log(`✅ ${operationId}: File uploaded to storage`)

          // Generate initial signed URL for verification (will expire - UI should re-fetch)
          console.log(`🔐 ${operationId}: Generating temporary signed URL for verification...`)
          const { data: signedUrlData, error: signedUrlError } = await (supabase
            .storage
            .from('farm-documents') as any)
            .createSignedUrl(filename, 3600)
          
          if (signedUrlError || !signedUrlData?.signedUrl) {
            const err = `${file.name}: Failed to generate signed URL - ${signedUrlError?.message}`
            console.error(`❌ ${operationId}: ${err}`)
            errors.push(err)
            // Cleanup storage file since we can't generate URL
            await (supabase.storage.from('farm-documents') as any).remove([filename])
            continue
          }
          
          const temporarySignedUrl = signedUrlData.signedUrl
          console.log(`🔐 ${operationId}: Temporary signed URL generated (expires in 1 hour)`)

          // Save image metadata to database
          console.log(`📸 ${operationId}: Saving image metadata to database...`)
          console.log(`  • health_record_id: ${recordId}`)
          console.log(`  • farm_id: ${userRole.farm_id}`)
          console.log(`  • storage_path: ${filename}`)
          console.log(`  • uploaded_by: ${user.id}`)
          
          const { data: imageRecord, error: dbError } = await (supabase as any)
            .from('health_record_images')
            .insert({
              health_record_id: recordId,
              farm_id: userRole.farm_id,
              image_url: temporarySignedUrl,
              image_title: file.name,
              image_size: file.size,
              mime_type: file.type,
              storage_path: filename,
              uploaded_by: user.id
            })
            .select()
            .single()

          if (dbError) {
            const err = `${file.name}: Failed to save image metadata - ${dbError.message}`
            console.error(`❌ ${operationId}: Database insert error:`, dbError)
            console.error(`❌ ${operationId}: ${err}`)
            errors.push(err)
            // Attempt cleanup by deleting the uploaded file
            console.log(`🧹 ${operationId}: Cleaning up storage file due to DB error`)
            await (supabase.storage.from('farm-documents') as any).remove([filename])
            continue
          }
          
          console.log(`✅ ${operationId}: Image metadata saved to database`)
          console.log(`✅ ${operationId}: Image record ID: ${imageRecord.id}`)

          uploadedImages.push({
            id: imageRecord.id,
            filename: file.name,
            url: temporarySignedUrl,
            size: file.size
          })
        } catch (err) {
          const errMsg = `${key}: ${err instanceof Error ? err.message : 'Unknown error'}`
          console.error(`❌ ${operationId}: Unexpected error processing image:`, err)
          errors.push(errMsg)
        }
      }
    }

    console.log(`\n📸 ${operationId}: ========== UPLOAD SUMMARY ==========`)
    console.log(`📸 ${operationId}: Total images processed: ${imageCount}`)
    console.log(`📸 ${operationId}: Successfully uploaded: ${uploadedImages.length}`)
    console.log(`📸 ${operationId}: Errors: ${errors.length}`)

    // Return response
    if (uploadedImages.length === 0 && errors.length > 0) {
      console.log(`❌ ${operationId}: No images uploaded, returning error`)
      return NextResponse.json(
        { 
          success: false,
          error: 'No images were uploaded successfully',
          errors,
          operationId
        },
        { status: 400 }
      )
    }

    console.log(`✅ ${operationId}: Returning success response`)
    return NextResponse.json({
      success: true,
      message: `${uploadedImages.length} image(s) uploaded successfully`,
      uploadedImages,
      errors: errors.length > 0 ? errors : undefined,
      operationId
    })

  } catch (error) {
    console.error(`\n❌ ${operationId}: ========== FATAL ERROR ==========`)
    console.error(`❌ ${operationId}: Error type:`, typeof error)
    console.error(`❌ ${operationId}: Error instanceof Error:`, error instanceof Error)
    if (error instanceof Error) {
      console.error(`❌ ${operationId}: Message:`, error.message)
      console.error(`❌ ${operationId}: Stack:`, error.stack)
    } else {
      console.error(`❌ ${operationId}: Error value:`, error)
    }
    return NextResponse.json(
      { error: 'Internal server error', operationId },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const operationId = `IMG-DEL-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`
  
  try {
    console.log(`\n🗑️  ========== IMAGE DELETE REQUEST ==========`)
    console.log(`🗑️  Operation ID: ${operationId}`)
    
    const user = await getCurrentUser()
    
    if (!user) {
      console.log(`❌ ${operationId}: No authenticated user`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log(`✅ ${operationId}: User authenticated: ${user.id}`)
    
    const userRole = await getUserRole(user.id) as any
    
    if (!userRole?.farm_id) {
      console.log(`❌ ${operationId}: No farm associated`)
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }

    const { imageId } = await request.json()
    console.log(`🗑️  ${operationId}: Image ID: ${imageId}`)
    
    if (!imageId) {
      console.log(`❌ ${operationId}: No imageId provided`)
      return NextResponse.json(
        { error: 'imageId is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    
    // Verify the image exists and belongs to the user's farm
    console.log(`🔍 ${operationId}: Verifying image ownership...`)
    const { data: image, error: imageError } = await (supabase as any)
      .from('health_record_images')
      .select('id, storage_path, farm_id, uploaded_by')
      .eq('id', imageId)
      .eq('farm_id', userRole.farm_id)
      .single()
    
    if (imageError) {
      console.log(`❌ ${operationId}: Image lookup error:`, imageError)
    }
    if (!image) {
      console.log(`❌ ${operationId}: Image not found or access denied`)
      return NextResponse.json(
        { error: 'Image not found or access denied' },
        { status: 404 }
      )
    }
    console.log(`✅ ${operationId}: Image verified:`, { id: image.id, uploadedBy: image.uploaded_by })

    // Verify ownership or admin status
    const isOwner = image.uploaded_by === user.id
    console.log(`✅ ${operationId}: Owner check: isOwner=${isOwner}`)
    
    if (!isOwner) {
      const { data: roleData } = await (supabase as any)
        .from('farm_user_roles')
        .select('role_type')
        .eq('user_id', user.id)
        .eq('farm_id', userRole.farm_id)
        .single()
      
      const isAdmin = roleData?.role_type === 'farm_owner' || roleData?.role_type === 'farm_manager' || roleData?.role_type === 'veterinarian'
      console.log(`✅ ${operationId}: Admin check: isAdmin=${isAdmin}, role=${roleData?.role_type}`)
      
      if (!isAdmin) {
        console.log(`❌ ${operationId}: User not authorized to delete`)
        return NextResponse.json(
          { error: 'Not authorized to delete this image' },
          { status: 403 }
        )
      }
    }

    // Delete from storage
    if (image.storage_path) {
      console.log(`🗑️  ${operationId}: Deleting from storage: ${image.storage_path}`)
      const { error: storageError } = await (supabase.storage
        .from('farm-documents') as any)
        .remove([image.storage_path])
      
      if (storageError) {
        console.error(`⚠️ ${operationId}: Storage deletion error:`, storageError)
      } else {
        console.log(`✅ ${operationId}: Storage file deleted`)
      }
    }

    // Delete from database
    console.log(`🗑️  ${operationId}: Deleting from database: health_record_images`)
    const { error: dbError } = await (supabase as any)
      .from('health_record_images')
      .delete()
      .eq('id', imageId)
    
    if (dbError) {
      console.error(`❌ ${operationId}: Database deletion error:`, dbError)
      return NextResponse.json(
        { error: 'Failed to delete image' },
        { status: 500 }
      )
    }
    console.log(`✅ ${operationId}: Image deleted successfully`)

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
      operationId
    })

  } catch (error) {
    console.error(`\n❌ ${operationId}: ========== FATAL ERROR ==========`)
    console.error(`❌ ${operationId}: Error:`, error)
    return NextResponse.json(
      { error: 'Internal server error', operationId },
      { status: 500 }
    )
  }
}
