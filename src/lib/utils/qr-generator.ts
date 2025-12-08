// lib/utils/qr-generator.ts
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { generateQRData } from './tag-generator'

export interface QRCodeGenerationOptions {
  size: 'small' | 'medium' | 'large'
  format: 'png' | 'svg' | 'pdf'
  includeText: boolean
  margin: number
}

export interface AnimalQRResult {
  success: boolean
  pdfBuffer?: Buffer
  qrCodes?: Array<{
    animalId: string
    tagNumber: string
    qrDataUrl: string
  }>
  error?: string
}

const QR_SIZES = {
  small: { width: 150, height: 150, textSize: 8 },
  medium: { width: 200, height: 200, textSize: 10 },
  large: { width: 250, height: 250, textSize: 12 }
}

export async function generateAnimalQRCodes(
  animals: Array<{ id: string; tag_number: string; name?: string }>,
  size: 'small' | 'medium' | 'large' = 'medium',
  farmId: string
): Promise<AnimalQRResult> {
  try {
    const qrCodes: Array<{
      animalId: string
      tagNumber: string
      qrDataUrl: string
    }> = []

    // Generate individual QR codes
    for (const animal of animals) {
      const qrData = generateQRData(animal.id, animal.tag_number, farmId)
      
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        scale: QR_SIZES[size].width / 100,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      qrCodes.push({
        animalId: animal.id,
        tagNumber: animal.tag_number,
        qrDataUrl
      })
    }

    // Create PDF with all QR codes
    const pdfBuffer = await createQRCodesPDF(qrCodes, animals, size)

    return {
      success: true,
      pdfBuffer,
      qrCodes
    }

  } catch (error) {
    console.error('Error generating QR codes:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate QR codes'
    }
  }
}

export async function createQRCodesPDF(
  qrCodes: Array<{
    animalId: string
    tagNumber: string
    qrDataUrl: string
  }>,
  animals: Array<{ id: string; tag_number: string; name?: string }>,
  size: 'small' | 'medium' | 'large'
): Promise<Buffer> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = 210 // A4 width in mm
  const pageHeight = 297 // A4 height in mm
  const margin = 10
  
  const qrSize = size === 'small' ? 40 : size === 'medium' ? 50 : 60
  const cellHeight = qrSize + 20 // QR code + text space
  const cellWidth = qrSize + 20
  
  const cols = Math.floor((pageWidth - 2 * margin) / cellWidth)
  const rows = Math.floor((pageHeight - 2 * margin) / cellHeight)
  const itemsPerPage = cols * rows

  let currentPage = 0
  let itemIndex = 0

  // Add title
  pdf.setFontSize(16)
  pdf.text('Animal QR Codes', pageWidth / 2, margin, { align: 'center' })

  for (let i = 0; i < qrCodes.length; i++) {
    if (i > 0 && i % itemsPerPage === 0) {
      pdf.addPage()
      currentPage++
      pdf.setFontSize(16)
      pdf.text('Animal QR Codes', pageWidth / 2, margin, { align: 'center' })
    }

    const pageIndex = i % itemsPerPage
    const row = Math.floor(pageIndex / cols)
    const col = pageIndex % cols

    const x = margin + col * cellWidth
    const y = margin + 20 + row * cellHeight // +20 for title space

    // Add QR code
    const qrCode = qrCodes[i]
    const animal = animals.find(a => a.id === qrCode.animalId)

    try {
      // Convert data URL to image and add to PDF
      const imgData = qrCode.qrDataUrl
      pdf.addImage(imgData, 'PNG', x, y, qrSize, qrSize)

      // Add animal information below QR code
      pdf.setFontSize(QR_SIZES[size].textSize)
      pdf.text(qrCode.tagNumber, x + qrSize / 2, y + qrSize + 5, { align: 'center' })
      
      if (animal?.name) {
        pdf.text(animal.name, x + qrSize / 2, y + qrSize + 10, { align: 'center' })
      }
    } catch (error) {
      console.error(`Error adding QR code for animal ${qrCode.tagNumber}:`, error)
    }
  }

  // Add footer with generation date
  const totalPages = Math.ceil(qrCodes.length / itemsPerPage)
  for (let page = 1; page <= totalPages; page++) {
    pdf.setPage(page)
    pdf.setFontSize(8)
    pdf.text(
      `Generated: ${new Date().toLocaleDateString()} - Page ${page} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    )
  }

  return Buffer.from(pdf.output('arraybuffer'))
}

export async function generateSingleQRCode(
  animalId: string,
  tagNumber: string,
  farmId: string,
  options: Partial<QRCodeGenerationOptions> = {}
): Promise<string> {
  const qrData = generateQRData(animalId, tagNumber, farmId)
  
  const size = options.size || 'medium'
  
  return QRCode.toDataURL(qrData, {
    width: QR_SIZES[size].width,
    margin: options.margin || 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })
}

export async function saveQRCodeToDatabase(
  animalId: string,
  qrData: string,
  size: string
): Promise<{ success: boolean; error?: string }> {
  // This would typically save QR code info to the database
  // Implementation depends on your database structure
  try {
    // Example implementation - you'll need to adapt this to your actual database
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabaseClient()

    const { error } = await (supabase
      .from('animal_qr_codes') as any)
      .upsert({
        animal_id: animalId,
        qr_data: qrData,
        size: size,
        generated_at: new Date().toISOString()
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }

  } catch (error) {
    console.error('Error saving QR code to database:', error)
    return { success: false, error: 'Failed to save QR code' }
  }
}

export function validateQRCodeData(qrString: string): {
  isValid: boolean
  data?: {
    animalId: string
    tagNumber: string
    farmId: string
    timestamp: string
  }
  error?: string
} {
  try {
    const data = JSON.parse(qrString)
    
    if (!data.animalId || !data.tagNumber || !data.farmId) {
      return {
        isValid: false,
        error: 'Missing required fields in QR code'
      }
    }

    // Check if timestamp is recent (within last year for example)
    const qrDate = new Date(data.timestamp)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    if (qrDate < oneYearAgo) {
      return {
        isValid: false,
        error: 'QR code is too old'
      }
    }

    return {
      isValid: true,
      data
    }

  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid QR code format'
    }
  }
}

export async function bulkGenerateQRCodes(
  farmId: string,
  animalIds: string[],
  options: Partial<QRCodeGenerationOptions> = {}
): Promise<{
  success: boolean
  generated: number
  failed: number
  results: Array<{
    animalId: string
    success: boolean
    qrDataUrl?: string
    error?: string
  }>
}> {
  const results = []
  let generated = 0
  let failed = 0

  for (const animalId of animalIds) {
    try {
      // You'd need to fetch animal data here
      const qrDataUrl = await generateSingleQRCode(animalId, `TEMP-${animalId.slice(0, 8)}`, farmId, options)
      
      results.push({
        animalId,
        success: true,
        qrDataUrl
      })
      generated++
    } catch (error) {
      results.push({
        animalId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      failed++
    }
  }

  return {
    success: generated > 0,
    generated,
    failed,
    results
  }
}

