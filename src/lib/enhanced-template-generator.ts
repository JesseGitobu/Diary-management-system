// lib/enhanced-template-generator.ts
// Completely rewritten with a different approach for Excel dropdowns

import ExcelJS from 'exceljs'

export interface ValidationOptions {
  breeds?: string[]
  genders?: string[]
  healthStatuses?: string[]
  productionStatuses?: string[]
}

const defaultValidationOptions: Required<ValidationOptions> = {
  breeds: [
    'Holstein', 'Jersey', 'Guernsey', 'Ayrshire', 'Brown Swiss',
    'Friesian', 'Simmental', 'Angus', 'Hereford', 'Charolais',
    'Limousin', 'Brahman', 'Zebu', 'Sahiwal', 'Gir', 'Red Sindhi',
    'Crossbred', 'Other'
  ],
  genders: ['male', 'female'],
  healthStatuses: [
    'healthy', 'sick', 'injured', 'quarantine', 'vaccinated',
    'treatment', 'recovering', 'pregnant', 'lactating', 'good', 'fair', 'poor'
  ],
  productionStatuses: ['calf', 'heifer', 'served', 'lactating', 'dry']
}

// Helper to get column letter from index (0 -> A, 1 -> B, etc.)
const getColLetter = (colIndex: number): string => {
  return String.fromCharCode(65 + colIndex)
}

// Main approach: Create Excel with embedded validation lists using ExcelJS
export async function createWorkingExcelTemplate(
  type: 'newborn' | 'purchased',
  customOptions: Partial<ValidationOptions> = {}
): Promise<ArrayBuffer> {
  
  const validationOptions = {
    breeds: customOptions.breeds || defaultValidationOptions.breeds,
    genders: customOptions.genders || defaultValidationOptions.genders,
    healthStatuses: customOptions.healthStatuses || defaultValidationOptions.healthStatuses,
    productionStatuses: customOptions.productionStatuses || defaultValidationOptions.productionStatuses,
  }

  // Create workbook
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Farm App'
  workbook.created = new Date()

  // 1. Create Animals Sheet
  const animalSheet = workbook.addWorksheet('Animals')

  // Define headers
  const baseHeaders = [
    'tag_number',
    'name', 
    'breed',
    'gender',
    'date_of_birth',
    'production_status',
    'health_status',
    'notes'
  ]

  const specificHeaders = type === 'newborn' 
    ? ['mother_tag', 'father_tag', 'birth_weight_kg']
    : ['seller_name', 'seller_contact', 'purchase_date', 'purchase_price']

  const headers = [...baseHeaders, ...specificHeaders]

  // Set Columns and Headers
  animalSheet.columns = headers.map(header => {
    let width = 15
    if (['name', 'seller_name', 'seller_contact'].includes(header)) width = 20
    if (header === 'notes') width = 30
    return { header: header, key: header, width: width }
  })

  // Create sample data
  const sampleData = type === 'newborn'
    ? {
        tag_number: 'CALF001', name: 'Bella', breed: 'Holstein', gender: 'female', 
        date_of_birth: '2024-01-15', production_status: 'calf', health_status: 'healthy', 
        notes: 'Born healthy', mother_tag: 'COW123', father_tag: 'BULL456', birth_weight_kg: 35
      }
    : {
        tag_number: 'COW002', name: 'Max', breed: 'Jersey', gender: 'female',
        date_of_birth: '2023-06-10', production_status: 'heifer', health_status: 'healthy',
        notes: 'Purchased from Smith Farm', seller_name: 'John Smith', seller_contact: '+254712345678',
        purchase_date: '2024-01-10', purchase_price: 50000
      }

  animalSheet.addRow(sampleData)

  // 2. Create Hidden Lists Sheet for Validation
  const listSheet = workbook.addWorksheet('Lists')
  listSheet.state = 'hidden'

  // Prepare data for columns: A=Breeds, B=Genders, C=Health, D=Production
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
  // We apply to rows 2 through 1000
  const breedColIndex = headers.indexOf('breed') + 1 // ExcelJS is 1-based
  const genderColIndex = headers.indexOf('gender') + 1
  const healthColIndex = headers.indexOf('health_status') + 1
  const productionColIndex = headers.indexOf('production_status') + 1

  const rowsToValidate = 1000

  for (let i = 2; i <= rowsToValidate; i++) {
    const row = animalSheet.getRow(i)

    // Breed Validation
    if (breedColIndex > 0) {
      row.getCell(breedColIndex).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Lists!$A$1:$A$${validationOptions.breeds.length}`],
        showErrorMessage: true,
        errorTitle: 'Invalid Selection',
        error: 'Please choose a breed from the dropdown list'
      }
    }

    // Gender Validation
    if (genderColIndex > 0) {
      row.getCell(genderColIndex).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [`Lists!$B$1:$B$${validationOptions.genders.length}`],
        showErrorMessage: true,
        errorTitle: 'Gender Required',
        error: 'Gender must be selected from the list'
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
  }

  // 4. Create Instructions Sheet
  const instructionsSheet = workbook.addWorksheet('Instructions')
  
  const instructions = [
    'EXCEL TEMPLATE WITH DROPDOWN VALIDATION - INSTRUCTIONS',
    '',
    '🔥 HOW TO USE THE DROPDOWNS:',
    '1. Click on any cell in columns: breed, gender, health_status, or production_status',
    '2. Look for a small dropdown arrow (▼) on the right side of the cell',
    '3. Click the dropdown arrow to see the list of valid options',
    '4. Select your choice from the dropdown list',
    '5. ⚠️ IMPORTANT: Do NOT type manually - always use the dropdown!',
    '',
    '📋 COLUMN GUIDE:',
    '• tag_number: Unique ID for the animal (REQUIRED - must be unique)',
    '• name: Animal name (optional)',
    '• breed: 🔽 Use dropdown to select breed (optional)',
    '• gender: 🔽 Use dropdown - male or female (REQUIRED)',
    '• date_of_birth: Date format: YYYY-MM-DD (example: 2024-01-15)',
    '• production_status: 🔽 Use dropdown for production stage (optional)',
    '• health_status: 🔽 Use dropdown for health condition (optional)',
    '• notes: Free text for additional information (optional)',
    '',
    ...(type === 'newborn' ? [
      '👶 NEWBORN CALF FIELDS:',
      '• mother_tag: Tag number of the mother cow',
      '• father_tag: Tag number of the father bull',
      '• birth_weight_kg: Birth weight in kilograms (numbers only)'
    ] : [
      '🛒 PURCHASED ANIMAL FIELDS:',
      '• seller_name: Name of the person/farm you bought from',
      '• seller_contact: Phone number or contact info',
      '• purchase_date: Date of purchase (YYYY-MM-DD format)',
      '• purchase_price: Amount paid (numbers only, no currency symbols)'
    ]),
    '',
    '✅ AVAILABLE DROPDOWN OPTIONS:',
    `🐄 Breeds (${validationOptions.breeds.length} options):`,
    validationOptions.breeds.join(', '),
    '',
    `⚥ Genders (${validationOptions.genders.length} options):`,
    validationOptions.genders.join(', '),
    '',
    `🏥 Health Status (${validationOptions.healthStatuses.length} options):`,
    validationOptions.healthStatuses.join(', '),
    '',
    `🥛 Production Status (${validationOptions.productionStatuses.length} options):`,
    validationOptions.productionStatuses.join(', '),
    '',
    '🔧 TROUBLESHOOTING:',
    '❌ No dropdown appears: Make sure you\'re using Microsoft Excel (not Google Sheets)',
    '❌ Can\'t select options: Click the dropdown arrow (▼), don\'t type',
    '❌ Getting error messages: Only use options from the dropdown lists',
    '❌ Lost your dropdowns: Don\'t copy/paste cells - type in each cell individually',
    '',
    '📁 DATA VALIDATION LISTS:',
    'The dropdown options are stored in the "Lists" worksheet (Hidden).',
    '',
    '💾 IMPORTANT SAVE INSTRUCTIONS:',
    '• Always save as .xlsx format (Excel format)',
    '• Do NOT save as .csv - this will remove all dropdowns'
  ]

  instructions.forEach(line => {
    instructionsSheet.addRow([line])
  })
  
  instructionsSheet.getColumn(1).width = 100

  // Write buffer
  return await workbook.xlsx.writeBuffer()
}

// Fallback: Create a simpler template using ExcelJS
export async function createSimpleValidationTemplate(
  type: 'newborn' | 'purchased', 
  customOptions: Partial<ValidationOptions> = {}
): Promise<ArrayBuffer> {
  
  const validationOptions = {
    breeds: customOptions.breeds || defaultValidationOptions.breeds,
    genders: customOptions.genders || defaultValidationOptions.genders,
    healthStatuses: customOptions.healthStatuses || defaultValidationOptions.healthStatuses,
    productionStatuses: customOptions.productionStatuses || defaultValidationOptions.productionStatuses,
  }

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Animals_Template')

  const headers = type === 'newborn' 
    ? ['tag_number', 'name', 'breed', 'gender', 'date_of_birth', 'production_status', 'health_status', 'notes', 'mother_tag', 'father_tag', 'birth_weight_kg']
    : ['tag_number', 'name', 'breed', 'gender', 'date_of_birth', 'production_status', 'health_status', 'notes', 'seller_name', 'seller_contact', 'purchase_date', 'purchase_price']

  sheet.addRow(headers)

  const sampleData = type === 'newborn'
    ? ['CALF001', 'Bella', 'Holstein', 'female', '2024-01-15', 'calf', 'healthy', 'Born healthy', 'COW123', 'BULL456', 35]
    : ['COW002', 'Max', 'Jersey', 'female', '2023-06-10', 'heifer', 'healthy', 'Purchased from Smith Farm', 'John Smith', '+254712345678', '2024-01-10', 50000]

  sheet.addRow(sampleData)

  // Add spacing
  for (let i = 0; i < 22; i++) sheet.addRow([])

  // Add reference lists at the bottom
  sheet.addRow(['BREED_OPTIONS', 'GENDER_OPTIONS', 'HEALTH_OPTIONS', 'PRODUCTION_OPTIONS'])
  
  const maxRows = Math.max(
    validationOptions.breeds.length,
    validationOptions.genders.length,
    validationOptions.healthStatuses.length,
    validationOptions.productionStatuses.length
  )

  for (let i = 0; i < maxRows; i++) {
    sheet.addRow([
      validationOptions.breeds[i] || '',
      validationOptions.genders[i] || '',  
      validationOptions.healthStatuses[i] || '',
      validationOptions.productionStatuses[i] || ''
    ])
  }

  // Set widths
  sheet.columns.forEach(col => {
    col.width = 18
  })

  return await workbook.xlsx.writeBuffer()
}

export async function downloadWorkingTemplate(
  type: 'newborn' | 'purchased',
  format: 'csv' | 'xlsx' = 'xlsx',
  customOptions?: Partial<ValidationOptions>
) {
  try {
    if (format === 'xlsx') {
      console.log('Creating Excel template with validation...')
      
      let buffer: ArrayBuffer
      try {
        buffer = await createWorkingExcelTemplate(type, customOptions)
      } catch (mainError) {
        console.warn('Main template creation failed, trying simple approach:', mainError)
        buffer = await createSimpleValidationTemplate(type, customOptions)
      }
      
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const timestamp = new Date().toISOString().slice(0, 10)
      
      a.href = url
      a.download = `${type}_animals_template_${timestamp}.xlsx`
      a.style.display = 'none'
      
      document.body.appendChild(a)
      a.click()
      
      setTimeout(() => {
        URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }, 1000)
      
      console.log('✅ Excel template downloaded successfully')
      
    } else {
      // CSV fallback
      downloadCSVTemplate(type, customOptions)
    }
  } catch (error) {
    console.error('❌ Template creation failed:', error)
    
    // Fallback to CSV if Excel fails
    console.log('🔄 Falling back to CSV template...')
    downloadCSVTemplate(type, customOptions)
  }
}

function downloadCSVTemplate(
  type: 'newborn' | 'purchased',
  customOptions?: Partial<ValidationOptions>
) {
  const validationOptions = {
    breeds: customOptions?.breeds || defaultValidationOptions.breeds,
    genders: customOptions?.genders || defaultValidationOptions.genders,
    healthStatuses: customOptions?.healthStatuses || defaultValidationOptions.healthStatuses,
    productionStatuses: customOptions?.productionStatuses || defaultValidationOptions.productionStatuses,
  }

  const headers = type === 'newborn' 
    ? ['tag_number', 'name', 'breed', 'gender', 'date_of_birth', 'production_status', 'health_status', 'notes', 'mother_tag', 'father_tag', 'birth_weight_kg']
    : ['tag_number', 'name', 'breed', 'gender', 'date_of_birth', 'production_status', 'health_status', 'notes', 'seller_name', 'seller_contact', 'purchase_date', 'purchase_price']
  
  const sampleData = type === 'newborn'
    ? ['CALF001', 'Bella', 'Holstein', 'female', '2024-01-15', 'calf', 'healthy', 'Born healthy', 'COW123', 'BULL456', '35']
    : ['COW002', 'Max', 'Jersey', 'female', '2023-06-10', 'heifer', 'healthy', 'Purchased from Smith Farm', 'John Smith', '+254712345678', '2024-01-10', '50000']

  const csvContent = [
    headers.join(','),
    sampleData.join(','),
    '',
    '# VALIDATION REFERENCE (Download Excel version for actual dropdowns):',
    `# Valid breeds: ${validationOptions.breeds.join(', ')}`,
    `# Valid genders: ${validationOptions.genders.join(', ')}`,
    `# Valid health statuses: ${validationOptions.healthStatuses.join(', ')}`,
    `# Valid production statuses: ${validationOptions.productionStatuses.join(', ')}`
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  
  a.href = url
  a.download = `${type}_animals_template.csv`
  a.style.display = 'none'
  
  document.body.appendChild(a)
  a.click()
  
  setTimeout(() => {
    URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }, 100)
}