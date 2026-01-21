// lib/enhanced-template-generator.ts
// Universal animal import template (both newborn and purchased animals)

import ExcelJS from 'exceljs'

export interface ValidationOptions {
  breeds?: string[]
  genders?: string[]
  healthStatuses?: string[]
  productionStatuses?: string[]
}

const defaultValidationOptions: Required<ValidationOptions> = {
  breeds: [
    'Holstein-Friesian', 'Jersey', 'Guernsey', 'Ayrshire', 'Brown Swiss',
    'Friesian', 'Simmental', 'Angus', 'Hereford', 'Charolais',
    'Limousin', 'Brahman', 'Zebu', 'Sahiwal', 'Gir', 'Red Sindhi',
    'Crossbred', 'Other'
  ],
  genders: ['male', 'female'],
  healthStatuses: [
    'healthy', 'sick', 'injured', 'quarantine', 'vaccinated',
    'treatment', 'recovering', 'pregnant', 'lactating', 'good', 'fair', 'poor'
  ],
  productionStatuses: ['calf', 'heifer', 'bull', 'served', 'lactating', 'dry']
}

// Main export: Create universal Excel template for both newborn and purchased animals
export async function createUniversalExcelTemplate(
  customOptions: Partial<ValidationOptions> = {}
): Promise<ArrayBuffer> {
  
  const validationOptions = {
    breeds: customOptions.breeds || defaultValidationOptions.breeds,
    genders: customOptions.genders || defaultValidationOptions.genders,
    healthStatuses: customOptions.healthStatuses || defaultValidationOptions.healthStatuses,
    productionStatuses: customOptions.productionStatuses || defaultValidationOptions.productionStatuses,
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'DairyTrack Pro'
  workbook.created = new Date()

  // 1. Create Animals Sheet
  const animalSheet = workbook.addWorksheet('Animals')

  // Define headers - NO tag_number, covers both animal types
  const headers = [
    'name',
    'gender',
    'breed',
    'date_of_birth',
    'animal_source',
    'health_status',
    'production_status',
    'notes',
    'mother_tag',
    'father_tag',
    'birth_weight_kg',
    'seller_name',
    'seller_contact',
    'purchase_date',
    'purchase_price'
  ]

  // Set Columns and Headers with formatting
  animalSheet.columns = headers.map(header => ({
    header: header.replace(/_/g, ' ').toUpperCase(),
    key: header,
    width: header === 'notes' ? 30 : header === 'seller_contact' ? 20 : 15
  }))

  // Style header row
  const headerRow = animalSheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
  headerRow.alignment = { horizontal: 'center' as any, vertical: 'center' as any, wrapText: true }

  // Add example data rows
  const exampleRows = [
    {
      name: 'Bella', gender: 'female', breed: 'Holstein-Friesian', date_of_birth: '2024-01-15',
      animal_source: 'newborn_calf', health_status: 'healthy', production_status: 'calf',
      notes: 'Born on farm', mother_tag: 'COW001', father_tag: 'BULL001', birth_weight_kg: 35
    },
    {
      name: 'Max', gender: 'male', breed: 'Jersey', date_of_birth: '2023-06-10',
      animal_source: 'purchased_animal', health_status: 'healthy', production_status: 'bull',
      notes: 'Purchased from Smith Farm', seller_name: 'John Smith', seller_contact: '+254712345678',
      purchase_date: '2024-01-10', purchase_price: 50000
    }
  ]

  exampleRows.forEach(row => animalSheet.addRow(row))

  // 2. Create Hidden Lists Sheet for Validation
  const listSheet = workbook.addWorksheet('Lists')
  listSheet.state = 'hidden'

  const maxRows = Math.max(
    validationOptions.breeds.length,
    validationOptions.genders.length,
    validationOptions.healthStatuses.length,
    validationOptions.productionStatuses.length
  )

  for (let i = 0; i < maxRows; i++) {
    listSheet.addRow([
      validationOptions.breeds[i] || null,
      validationOptions.genders[i] || null,
      validationOptions.healthStatuses[i] || null,
      validationOptions.productionStatuses[i] || null,
    ])
  }

  // 3. Apply Data Validation to Animals Sheet
  const genderColIndex = headers.indexOf('gender') + 1
  const breedColIndex = headers.indexOf('breed') + 1
  const healthColIndex = headers.indexOf('health_status') + 1
  const productionColIndex = headers.indexOf('production_status') + 1
  const sourceColIndex = headers.indexOf('animal_source') + 1

  const rowsToValidate = 1000

  for (let i = 2; i <= rowsToValidate; i++) {
    const row = animalSheet.getRow(i)

    // Gender Validation (Required)
    if (genderColIndex > 0) {
      row.getCell(genderColIndex).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [`Lists!$B$1:$B$${validationOptions.genders.length}`],
        showErrorMessage: true,
        errorTitle: 'Gender Required',
        error: 'Please select: male or female'
      }
    }

    // Breed Validation
    if (breedColIndex > 0) {
      row.getCell(breedColIndex).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Lists!$A$1:$A$${validationOptions.breeds.length}`],
        showErrorMessage: true,
        errorTitle: 'Invalid Breed',
        error: 'Please choose a breed from the dropdown'
      }
    }

    // Health Status Validation
    if (healthColIndex > 0) {
      row.getCell(healthColIndex).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Lists!$C$1:$C$${validationOptions.healthStatuses.length}`],
        showErrorMessage: true,
        errorTitle: 'Invalid Health Status',
        error: 'Please select from the health status list'
      }
    }

    // Production Status Validation
    if (productionColIndex > 0) {
      row.getCell(productionColIndex).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Lists!$D$1:$D$${validationOptions.productionStatuses.length}`],
        showErrorMessage: true,
        errorTitle: 'Invalid Production Status',
        error: 'Please select from the production status list'
      }
    }

    // Animal Source Validation
    if (sourceColIndex > 0) {
      row.getCell(sourceColIndex).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [`"newborn_calf,purchased_animal"`],
        showErrorMessage: true,
        errorTitle: 'Animal Source Required',
        error: 'Choose: newborn_calf or purchased_animal'
      }
    }
  }

  // 4. Create Instructions Sheet
  const instructionsSheet = workbook.addWorksheet('Instructions')
  
  const instructions = [
    '📋 UNIVERSAL ANIMAL IMPORT TEMPLATE - INSTRUCTIONS',
    '',
    '✨ KEY FEATURES:',
    '• One template for BOTH newborn calves and purchased animals',
    '• Automatic tag number generation (do NOT enter manually)',
    '• Data validation dropdowns for consistency',
    '• Works with both animal types in a single sheet',
    '',
    '🔥 HOW TO USE DROPDOWNS:',
    '1. Click on any cell with a dropdown field',
    '2. Look for the small arrow (▼) on the right side',
    '3. Click the arrow to open the dropdown list',
    '4. Select from the available options',
    '⚠️ Do NOT type manually - use dropdown selections only!',
    '',
    '📋 COLUMN GUIDE:',
    '• NAME: Animal nickname (optional)',
    '• GENDER: 🔽 Dropdown - male or female (REQUIRED)',
    '• BREED: 🔽 Dropdown - select from breed list (optional)',
    '• DATE_OF_BIRTH: Format YYYY-MM-DD (example: 2024-01-15)',
    '• ANIMAL_SOURCE: 🔽 Dropdown - newborn_calf OR purchased_animal (REQUIRED)',
    '• HEALTH_STATUS: 🔽 Dropdown - current health condition (optional)',
    '• PRODUCTION_STATUS: 🔽 Dropdown - calf, heifer, bull, served, lactating, or dry (optional)',
    '• NOTES: Free text for any additional information (optional)',
    '',
    '👶 NEWBORN CALF FIELDS (fill these if animal_source = "newborn_calf"):',
    '• MOTHER_TAG: Tag number of the mother cow',
    '• FATHER_TAG: Tag number of the father bull',
    '• BIRTH_WEIGHT_KG: Birth weight in kilograms (numbers only)',
    '',
    '🛒 PURCHASED ANIMAL FIELDS (fill these if animal_source = "purchased_animal"):',
    '• SELLER_NAME: Name of the seller/farm',
    '• SELLER_CONTACT: Phone number or email address',
    '• PURCHASE_DATE: Date of purchase (YYYY-MM-DD format)',
    '• PURCHASE_PRICE: Amount paid (numbers only, no currency)',
    '',
    '✅ AVAILABLE DROPDOWN OPTIONS:',
    `🐄 BREEDS (${validationOptions.breeds.length} options):`,
    validationOptions.breeds.join(', '),
    '',
    `⚥ GENDERS:`,
    validationOptions.genders.join(', '),
    '',
    `🏥 HEALTH STATUS (${validationOptions.healthStatuses.length} options):`,
    validationOptions.healthStatuses.join(', '),
    '',
    `🥛 PRODUCTION STATUS (${validationOptions.productionStatuses.length} options):`,
    validationOptions.productionStatuses.join(', '),
    '',
    '🔧 TROUBLESHOOTING:',
    '❌ No dropdowns visible: Ensure you\'re using Microsoft Excel (not Google Sheets)',
    '❌ Can\'t select options: Click the dropdown arrow, don\'t type manually',
    '❌ Getting validation errors: Only use options from the dropdown lists',
    '❌ Lost dropdowns: Don\'t copy/paste cells - add new data in empty rows',
    '',
    '💾 IMPORTANT:',
    '• Always save as .xlsx format to preserve dropdowns',
    '• Do NOT save as .csv - dropdowns will be lost',
    '• Tag numbers are auto-generated upon import',
    '• Fill required fields: name, gender, animal_source at minimum'
  ]

  instructions.forEach(line => {
    instructionsSheet.addRow([line])
  })
  
  instructionsSheet.getColumn(1).width = 120
  instructionsSheet.getRows(1, instructions.length)?.forEach(row => {
    row.alignment = { wrapText: true, vertical: 'top' }
  })

  // Write buffer
  return await workbook.xlsx.writeBuffer()
}

export async function downloadUniversalTemplate(
  customOptions?: Partial<ValidationOptions>
) {
  try {
    console.log('Creating universal animal import template...')
    
    const buffer = await createUniversalExcelTemplate(customOptions)
    
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const timestamp = new Date().toISOString().slice(0, 10)
    
    a.href = url
    a.download = `animals_import_template_${timestamp}.xlsx`
    a.style.display = 'none'
    
    document.body.appendChild(a)
    a.click()
    
    setTimeout(() => {
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }, 1000)
    
    console.log('✅ Universal template downloaded successfully')
    
  } catch (error) {
    console.error('❌ Template creation failed:', error)
    throw new Error('Failed to create import template')
  }
}

// Legacy functions - kept for backwards compatibility but not recommended
export async function createWorkingExcelTemplate(
  type: 'newborn' | 'purchased',
  customOptions: Partial<ValidationOptions> = {}
): Promise<ArrayBuffer> {
  // Forward to universal template
  return createUniversalExcelTemplate(customOptions)
}

export async function createSimpleValidationTemplate(
  type: 'newborn' | 'purchased', 
  customOptions: Partial<ValidationOptions> = {}
): Promise<ArrayBuffer> {
  // Forward to universal template
  return createUniversalExcelTemplate(customOptions)
}

export async function downloadWorkingTemplate(
  type: 'newborn' | 'purchased' | 'universal',
  format: 'csv' | 'xlsx' = 'xlsx',
  customOptions?: Partial<ValidationOptions>
) {
  // Always use universal template
  return downloadUniversalTemplate(customOptions)
}