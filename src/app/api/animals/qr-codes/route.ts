// app/api/animals/qr-codes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFarmAnimals } from '@/lib/database/animals'
import { generateAnimalQRCodes } from '@/lib/utils/qr-generator'
import { getTaggingSettings } from '@/lib/database/tagging-settings'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { farmId, animalIds, size = 'medium' } = body

    if (!farmId) {
      return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 })
    }

    const userRole = await getUserRole(user.id) as any
    if (!userRole || userRole.farm_id !== farmId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check permissions
    if (!['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get tagging settings to check if QR codes are enabled
    const taggingSettings = await getTaggingSettings(farmId)
    if (!taggingSettings.enableQRCodes) {
      return NextResponse.json({ error: 'QR codes are not enabled for this farm' }, { status: 400 })
    }

    // Get animals to generate QR codes for
    let animals
    if (animalIds && animalIds.length > 0) {
      // Generate QR codes for specific animals
      const allAnimals = await getFarmAnimals(farmId, { includeInactive: false })
      animals = allAnimals.filter(animal => animalIds.includes(animal.id))
    } else {
      // Generate QR codes for all active animals
      animals = await getFarmAnimals(farmId, { includeInactive: false })
    }

    if (animals.length === 0) {
      return NextResponse.json({ error: 'No animals found' }, { status: 404 })
    }

    // Generate QR codes
    const mappedAnimals = animals.map(animal => ({
      id: animal.id,
      tag_number: animal.tag_number,
      name: animal.name || undefined
    }))
    const qrCodeResult = await generateAnimalQRCodes(mappedAnimals, size, farmId)

    if (!qrCodeResult.success || !qrCodeResult.pdfBuffer) {
      return NextResponse.json({ error: qrCodeResult.error || 'PDF generation failed' }, { status: 500 })
    }

    // Return the PDF buffer as a downloadable file
    const headers = new Headers()
    headers.set('Content-Type', 'application/pdf')
    headers.set('Content-Disposition', `attachment; filename="animal-qr-codes-${new Date().toISOString().split('T')[0]}.pdf"`)
    headers.set('Content-Length', qrCodeResult.pdfBuffer.length.toString())

    return new NextResponse(new Uint8Array(qrCodeResult.pdfBuffer), {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Error generating QR codes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}