// lib/enhanced-template-generator.ts
// Completely rewritten with a different approach for Excel dropdowns

import * as XLSX from 'xlsx'

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

// Alternative approach: Create Excel with embedded validation lists
export function createWorkingExcelTemplate(
  type: 'newborn' | 'purchased',
  customOptions: Partial<ValidationOptions> = {}
): ArrayBuffer {
  
  const validationOptions = {
    breeds: customOptions.breeds || defaultValidationOptions.breeds,
    genders: customOptions.genders || defaultValidationOptions.genders,
    healthStatuses: customOptions.healthStatuses || defaultValidationOptions.healthStatuses,
    productionStatuses: customOptions.productionStatuses || defaultValidationOptions.productionStatuses,
  }

  // Create workbook
  const wb = XLSX.utils.book_new()

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

  // Create sample data
  const sampleData = type === 'newborn'
    ? ['CALF001', 'Bella', 'Holstein', 'female', '2024-01-15', 'calf', 'healthy', 'Born healthy', 'COW123', 'BULL456', 35]
    : ['COW002', 'Max', 'Jersey', 'female', '2023-06-10', 'heifer', 'healthy', 'Purchased from Smith Farm', 'John Smith', '+254712345678', '2024-01-10', 50000]

  // Create main worksheet data
  const wsData = [
    headers,
    sampleData,
    // Add 50 empty rows for data entry
    ...Array(50).fill(null).map(() => Array(headers.length).fill(''))
  ]

  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Set column widths
  const colWidths = headers.map(header => {
    switch(header) {
      case 'tag_number': return { width: 15 }
      case 'name': return { width: 20 }
      case 'breed': return { width: 18 }
      case 'gender': return { width: 12 }
      case 'date_of_birth': return { width: 15 }
      case 'production_status': return { width: 18 }
      case 'health_status': return { width: 16 }
      case 'notes': return { width: 30 }
      case 'purchase_date': return { width: 15 }
      case 'purchase_price': return { width: 15 }
      case 'seller_name': return { width: 20 }
      case 'seller_contact': return { width: 20 }
      case 'mother_tag': return { width: 15 }
      case 'father_tag': return { width: 15 }
      case 'birth_weight_kg': return { width: 15 }
      default: return { width: 15 }
    }
  })
  ws['!cols'] = colWidths

  // Create hidden validation data sheet with more space
  const validationData = []
  
  // Calculate max length needed
  const maxValidationLength = Math.max(
    validationOptions.breeds.length,
    validationOptions.genders.length, 
    validationOptions.healthStatuses.length,
    validationOptions.productionStatuses.length
  ) + 5 // Add buffer

  // Create validation lists in columns
  for (let i = 0; i < maxValidationLength; i++) {
    validationData.push([
      i < validationOptions.breeds.length ? validationOptions.breeds[i] : '',
      i < validationOptions.genders.length ? validationOptions.genders[i] : '',
      i < validationOptions.healthStatuses.length ? validationOptions.healthStatuses[i] : '',
      i < validationOptions.productionStatuses.length ? validationOptions.productionStatuses[i] : ''
    ])
  }

  const validationWs = XLSX.utils.aoa_to_sheet(validationData)
  validationWs['!cols'] = [
    { width: 20, hidden: false },
    { width: 15, hidden: false },
    { width: 20, hidden: false },
    { width: 20, hidden: false }
  ]

  // Add sheets to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Animals')
  XLSX.utils.book_append_sheet(wb, validationWs, 'Lists')

  // Now create the data validation using a different approach
  // We'll modify the worksheet after creation to add validation
  
  // Find column indices
  const breedCol = headers.indexOf('breed')
  const genderCol = headers.indexOf('gender') 
  const healthCol = headers.indexOf('health_status')
  const productionCol = headers.indexOf('production_status')

  // Create validation objects using the correct XLSX format
  const validationRules = []

  if (breedCol >= 0) {
    const colLetter = XLSX.utils.encode_col(breedCol)
    validationRules.push({
      ref: `${colLetter}2:${colLetter}1000`,
      type: 'list',
      operator: 'between',
      formula1: `Lists!$A$1:$A$${validationOptions.breeds.length}`,
      allowBlank: true,
      showInputMessage: true,
      promptTitle: 'Select Breed',
      prompt: 'Choose from the available breeds',
      showErrorMessage: true,
      errorTitle: 'Invalid Selection',
      error: 'Please choose a breed from the dropdown list'
    })
  }

  if (genderCol >= 0) {
    const colLetter = XLSX.utils.encode_col(genderCol)
    validationRules.push({
      ref: `${colLetter}2:${colLetter}1000`,
      type: 'list',
      operator: 'between', 
      formula1: `Lists!$B$1:$B$${validationOptions.genders.length}`,
      allowBlank: false,
      showInputMessage: true,
      promptTitle: 'Select Gender (Required)',
      prompt: 'Choose male or female',
      showErrorMessage: true,
      errorTitle: 'Gender Required',
      error: 'Gender must be selected from the list'
    })
  }

  if (healthCol >= 0) {
    const colLetter = XLSX.utils.encode_col(healthCol)
    validationRules.push({
      ref: `${colLetter}2:${colLetter}1000`,
      type: 'list',
      operator: 'between',
      formula1: `Lists!$C$1:$C$${validationOptions.healthStatuses.length}`,
      allowBlank: true,
      showInputMessage: true,
      promptTitle: 'Select Health Status',
      prompt: 'Choose the health status',
      showErrorMessage: true,
      errorTitle: 'Invalid Health Status',
      error: 'Please select from the health status list'
    })
  }

  if (productionCol >= 0) {
    const colLetter = XLSX.utils.encode_col(productionCol)
    validationRules.push({
      ref: `${colLetter}2:${colLetter}1000`,
      type: 'list',
      operator: 'between',
      formula1: `Lists!$D$1:$D$${validationOptions.productionStatuses.length}`,
      allowBlank: true,
      showInputMessage: true,
      promptTitle: 'Select Production Status',
      prompt: 'Choose the production status',
      showErrorMessage: true,
      errorTitle: 'Invalid Production Status', 
      error: 'Please select from the production status list'
    })
  }

  // Apply validation to the worksheet
  if (validationRules.length > 0) {
    ws['!dataValidation'] = validationRules
  }

  // Create comprehensive instructions
  const instructions = [
    ['EXCEL TEMPLATE WITH DROPDOWN VALIDATION - INSTRUCTIONS'],
    [''],
    ['🔥 HOW TO USE THE DROPDOWNS:'],
    ['1. Click on any cell in columns: breed, gender, health_status, or production_status'],
    ['2. Look for a small dropdown arrow (▼) on the right side of the cell'],
    ['3. Click the dropdown arrow to see the list of valid options'],
    ['4. Select your choice from the dropdown list'],
    ['5. ⚠️ IMPORTANT: Do NOT type manually - always use the dropdown!'],
    [''],
    ['📋 COLUMN GUIDE:'],
    ['• tag_number: Unique ID for the animal (REQUIRED - must be unique)'],
    ['• name: Animal name (optional)'],
    ['• breed: 🔽 Use dropdown to select breed (optional)'],
    ['• gender: 🔽 Use dropdown - male or female (REQUIRED)'],
    ['• date_of_birth: Date format: YYYY-MM-DD (example: 2024-01-15)'],
    ['• production_status: 🔽 Use dropdown for production stage (optional)'],
    ['• health_status: 🔽 Use dropdown for health condition (optional)'],
    ['• notes: Free text for additional information (optional)'],
    [''],
    ...(type === 'newborn' ? [
      ['👶 NEWBORN CALF FIELDS:'],
      ['• mother_tag: Tag number of the mother cow'],
      ['• father_tag: Tag number of the father bull'],
      ['• birth_weight_kg: Birth weight in kilograms (numbers only)']
    ] : [
      ['🛒 PURCHASED ANIMAL FIELDS:'],
      ['• seller_name: Name of the person/farm you bought from'],
      ['• seller_contact: Phone number or contact info'],
      ['• purchase_date: Date of purchase (YYYY-MM-DD format)'],
      ['• purchase_price: Amount paid (numbers only, no currency symbols)']
    ]),
    [''],
    ['✅ AVAILABLE DROPDOWN OPTIONS:'],
    [`🐄 Breeds (${validationOptions.breeds.length} options):`],
    [validationOptions.breeds.join(', ')],
    [''],
    [`⚥ Genders (${validationOptions.genders.length} options):`],
    [validationOptions.genders.join(', ')],
    [''],
    [`🏥 Health Status (${validationOptions.healthStatuses.length} options):`],
    [validationOptions.healthStatuses.join(', ')],
    [''],
    [`🥛 Production Status (${validationOptions.productionStatuses.length} options):`],
    [validationOptions.productionStatuses.join(', ')],
    [''],
    ['🔧 TROUBLESHOOTING:'],
    ['❌ No dropdown appears: Make sure you\'re using Microsoft Excel (not Google Sheets)'],
    ['❌ Can\'t select options: Click the dropdown arrow (▼), don\'t type'],
    ['❌ Getting error messages: Only use options from the dropdown lists'],
    ['❌ Lost your dropdowns: Don\'t copy/paste cells - type in each cell individually'],
    [''],
    ['📁 DATA VALIDATION LISTS:'],
    ['The dropdown options are stored in the "Lists" worksheet.'],
    ['You can view but should not modify this sheet.'],
    [''],
    ['💾 IMPORTANT SAVE INSTRUCTIONS:'],
    ['• Always save as .xlsx format (Excel format)'],
    ['• Do NOT save as .csv - this will remove all dropdowns'],
    ['• Test your dropdowns after saving and reopening'],
    [''],
    ['🧪 TESTING YOUR TEMPLATE:'],
    ['1. Go to the "Animals" worksheet'],
    ['2. Click on cell C2 (breed column)'],
    ['3. Look for a dropdown arrow'],
    ['4. Click the arrow and select "Holstein"'],
    ['5. If this works, your template is ready to use!'],
    [''],
    ['📞 NEED HELP?'],
    ['If dropdowns still don\'t work, you may need to:'],
    ['• Use a newer version of Microsoft Excel'],
    ['• Enable macros/data validation in Excel settings'],
    ['• Contact your system administrator for Excel permissions']
  ]

  const instructionsWs = XLSX.utils.aoa_to_sheet(instructions.map(row => Array.isArray(row) ? row : [row]))
  instructionsWs['!cols'] = [{ width: 100 }]
  XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions')

  // Write workbook with enhanced options for compatibility
  return XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'array',
    compression: false, // Disable compression to improve compatibility
    bookSST: false      // Disable shared string table for better compatibility
  })
}

// Alternative: Create a simpler template with inline validation
export function createSimpleValidationTemplate(
  type: 'newborn' | 'purchased', 
  customOptions: Partial<ValidationOptions> = {}
): ArrayBuffer {
  
  const validationOptions = {
    breeds: customOptions.breeds || defaultValidationOptions.breeds,
    genders: customOptions.genders || defaultValidationOptions.genders,
    healthStatuses: customOptions.healthStatuses || defaultValidationOptions.healthStatuses,
    productionStatuses: customOptions.productionStatuses || defaultValidationOptions.productionStatuses,
  }

  const wb = XLSX.utils.book_new()

  // Create a template with validation values right in the same sheet
  const headers = type === 'newborn' 
    ? ['tag_number', 'name', 'breed', 'gender', 'date_of_birth', 'production_status', 'health_status', 'notes', 'mother_tag', 'father_tag', 'birth_weight_kg']
    : ['tag_number', 'name', 'breed', 'gender', 'date_of_birth', 'production_status', 'health_status', 'notes', 'seller_name', 'seller_contact', 'purchase_date', 'purchase_price']

  const sampleData = type === 'newborn'
    ? ['CALF001', 'Bella', 'Holstein', 'female', '2024-01-15', 'calf', 'healthy', 'Born healthy', 'COW123', 'BULL456', 35]
    : ['COW002', 'Max', 'Jersey', 'female', '2023-06-10', 'heifer', 'healthy', 'Purchased from Smith Farm', 'John Smith', '+254712345678', '2024-01-10', 50000]

  // Create main data with validation areas
  const wsData = [
    // Main headers
    headers,
    sampleData,
    // Empty rows for data
    ...Array(20).fill(null).map(() => Array(headers.length).fill('')),
    // Separator
    Array(headers.length).fill(''),
    Array(headers.length).fill(''),
    // Validation lists headers
    ['BREED_OPTIONS', 'GENDER_OPTIONS', 'HEALTH_OPTIONS', 'PRODUCTION_OPTIONS'],
    // Validation data
    ...Array.from({ length: Math.max(
      validationOptions.breeds.length,
      validationOptions.genders.length,
      validationOptions.healthStatuses.length,
      validationOptions.productionStatuses.length
    )}, (_, i) => [
      validationOptions.breeds[i] || '',
      validationOptions.genders[i] || '',  
      validationOptions.healthStatuses[i] || '',
      validationOptions.productionStatuses[i] || ''
    ])
  ]

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = headers.map(() => ({ width: 18 }))

  // Add the sheet
  XLSX.utils.book_append_sheet(wb, ws, 'Animals_Template')

  return XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'array',
    compression: false
  })
}

export function downloadWorkingTemplate(
  type: 'newborn' | 'purchased',
  format: 'csv' | 'xlsx' = 'xlsx',
  customOptions?: Partial<ValidationOptions>
) {
  try {
    if (format === 'xlsx') {
      console.log('Creating Excel template with validation...')
      
      // Try the main approach first
      let buffer: ArrayBuffer
      try {
        buffer = createWorkingExcelTemplate(type, customOptions)
      } catch (mainError) {
        console.warn('Main template creation failed, trying simple approach:', mainError)
        buffer = createSimpleValidationTemplate(type, customOptions)
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