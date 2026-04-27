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
    'treatment', 'recovering', 'deceased', 'released'
  ],
  productionStatuses: ['calf', 'heifer', 'bull', 'served', 'lactating', 'steaming dry cows', 'open (culling) dry cows']  // Note: These will be normalized to steaming_dry_cows and open_culling_dry_cows during import
}

// Service method options
const serviceMethodOptions = ['Artificial Insemination', 'Natural Breeding', 'Embryo Transfer']

// Calving outcome options with descriptions
const calvingOutcomeOptions = [
  'easy - No issues, quick delivery',
  'normal - Standard delivery',
  'difficult - Hard but unassisted',
  'assisted - Required human help',
  'cesarean - Surgical delivery',
  'aborted - Pregnancy terminated'
]

// Helper function to convert column index (1-based) to Excel column letter (A, B, Z, AA, AB, etc.)
function getExcelColumnLetter(colIndex: number): string {
  let letter = ''
  while (colIndex > 0) {
    colIndex--
    letter = String.fromCharCode(65 + (colIndex % 26)) + letter
    colIndex = Math.floor(colIndex / 26)
  }
  return letter
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

  // Define headers - tag_number is NOW the first column with auto-generation option
  const headers = [
    'tag_number',
    'name',
    'gender',
    'breed',
    'date_of_birth',
    'birth_time',
    'birth_difficulty_level',
    'animal_source',
    'previous_farm_tag_number',
    'health_status',
    'production_status',
    'mother_dam_tag',
    'mother_dam_name',
    'father_sire_semen_tag',
    'father_sire_name_semen_source',
    'birth_weight_kg',
    'current_weight_kg',
    'weighing_date',
    'farm_seller_name',
    'farm_seller_contact',
    'purchase_date',
    'purchase_price',
    'notes',
    // Production cycles 1-7
    'service_date_1', 'service_method_1', 'bull_tag_semen_code_1', 'bull_name_semen_source_1', 'ai_technician_1', 'outcome_1', 'steaming_date_1', 'expected_calving_date_1', 'actual_calving_date_1', 'calving_time_1', 'calving_outcome_1', 'colostrum_produced_1', 'days_in_milk_1',
    'service_date_2', 'service_method_2', 'bull_tag_semen_code_2', 'bull_name_semen_source_2', 'ai_technician_2', 'outcome_2', 'steaming_date_2', 'expected_calving_date_2', 'actual_calving_date_2', 'calving_time_2', 'calving_outcome_2', 'colostrum_produced_2', 'days_in_milk_2',
    'service_date_3', 'service_method_3', 'bull_tag_semen_code_3', 'bull_name_semen_source_3', 'ai_technician_3', 'outcome_3', 'steaming_date_3', 'expected_calving_date_3', 'actual_calving_date_3', 'calving_time_3', 'calving_outcome_3', 'colostrum_produced_3', 'days_in_milk_3',
    'service_date_4', 'service_method_4', 'bull_tag_semen_code_4', 'bull_name_semen_source_4', 'ai_technician_4', 'outcome_4', 'steaming_date_4', 'expected_calving_date_4', 'actual_calving_date_4', 'calving_time_4', 'calving_outcome_4', 'colostrum_produced_4', 'days_in_milk_4',
    'service_date_5', 'service_method_5', 'bull_tag_semen_code_5', 'bull_name_semen_source_5', 'ai_technician_5', 'outcome_5', 'steaming_date_5', 'expected_calving_date_5', 'actual_calving_date_5', 'calving_time_5', 'calving_outcome_5', 'colostrum_produced_5', 'days_in_milk_5',
    'service_date_6', 'service_method_6', 'bull_tag_semen_code_6', 'bull_name_semen_source_6', 'ai_technician_6', 'outcome_6', 'steaming_date_6', 'expected_calving_date_6', 'actual_calving_date_6', 'calving_time_6', 'calving_outcome_6', 'colostrum_produced_6', 'days_in_milk_6',
    'service_date_7', 'service_method_7', 'bull_tag_semen_code_7', 'bull_name_semen_source_7', 'ai_technician_7', 'outcome_7', 'steaming_date_7', 'expected_calving_date_7', 'actual_calving_date_7', 'calving_time_7', 'calving_outcome_7', 'colostrum_produced_7', 'days_in_milk_7'
  ]

  // Set Columns and Headers with formatting
  animalSheet.columns = headers.map(header => ({
    header: header.replace(/_/g, ' ').toUpperCase(),
    key: header,
    width: header === 'tag_number' ? 18 : header === 'notes' ? 40 : header === 'farm_seller_contact' ? 20 : header === 'previous_farm_tag_number' ? 22 : header === 'mother_dam_name' || header === 'father_sire_name_semen_source' ? 18 : header === 'birth_time' ? 12 : header === 'weighing_date' ? 14 : header === 'birth_difficulty_level' ? 18 : header.includes('service_method') ? 18 : header.includes('calving_time') ? 12 : header.includes('calving_outcome') ? 16 : header.includes('outcome') ? 14 : 16
  }))

  // Style header row
  const headerRow = animalSheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
  headerRow.alignment = { horizontal: 'center' as any, vertical: 'center' as any, wrapText: true }

  // Example data (for Examples sheet, not Animals sheet)
  const exampleRows = [
    {
      tag_number: 'auto',
      name: 'Bella', gender: 'female', breed: 'Holstein-Friesian', date_of_birth: '2024-01-15',
      birth_time: '08:30', birth_difficulty_level: 'normal',
      animal_source: 'newborn_calf', previous_farm_tag_number: '', health_status: 'healthy', production_status: 'calf',
      mother_dam_tag: 'COW001', mother_dam_name: 'Daisy', father_sire_semen_tag: 'BULL001', father_sire_name_semen_source: 'Thor', birth_weight_kg: 35,
      current_weight_kg: 85, weighing_date: '2024-03-10',
      farm_seller_name: '', farm_seller_contact: '', purchase_date: '', purchase_price: '',
      notes: 'Born on farm'
    },
    {
      tag_number: 'FARM-PUR-0001',
      name: 'Max', gender: 'male', breed: 'Jersey', date_of_birth: '2023-06-10',
      birth_time: '', birth_difficulty_level: '',
      animal_source: 'purchased_animal', previous_farm_tag_number: 'OLD-FARM-2023-089', health_status: 'healthy', production_status: 'bull',
      mother_dam_tag: '', mother_dam_name: '', father_sire_semen_tag: '', father_sire_name_semen_source: '', birth_weight_kg: '',
      current_weight_kg: '', weighing_date: '',
      farm_seller_name: 'John Smith', farm_seller_contact: '+254712345678',
      purchase_date: '2024-01-10', purchase_price: 50000, notes: 'Purchased from Smith Farm'
    },
    {
      tag_number: 'COW-2023-001',
      name: 'Rosie', gender: 'female', breed: 'Holstein-Friesian', date_of_birth: '2022-03-20',
      birth_time: '06:15', birth_difficulty_level: 'assisted',
      animal_source: 'newborn_calf', previous_farm_tag_number: '', health_status: 'healthy', production_status: 'lactating',
      mother_dam_tag: '', mother_dam_name: '', father_sire_semen_tag: '', father_sire_name_semen_source: '', birth_weight_kg: '',
      current_weight_kg: 450, weighing_date: '2024-03-10',
      farm_seller_name: '', farm_seller_contact: '',
      purchase_date: '', purchase_price: '', notes: 'Production example - first successful cycle',
      // Cycle 1 - Successful
      service_date_1: '2024-01-10', service_method_1: 'Artificial Insemination', bull_tag_semen_code_1: 'SEMEN-001', bull_name_semen_source_1: 'Tommy', ai_technician_1: 'John Kipchoge', outcome_1: 'success',
      steaming_date_1: '2024-09-15', expected_calving_date_1: '2024-10-13', actual_calving_date_1: '2024-10-15', calving_time_1: '14:30', calving_outcome_1: 'normal - Standard delivery', colostrum_produced_1: 15.5, days_in_milk_1: 180
    }
  ]

  // Do NOT add examples to Animals sheet - it should be clean for user data entry

  // 2. Create Examples Sheet (Reference guide with sample data)
  const examplesSheet = workbook.addWorksheet('Examples')
  examplesSheet.columns = headers.map(header => ({
    header: header.replace(/_/g, ' ').toUpperCase(),
    key: header,
    width: header === 'tag_number' ? 18 : header === 'notes' ? 40 : header === 'farm_seller_contact' ? 20 : header === 'previous_farm_tag_number' ? 22 : header === 'mother_dam_name' || header === 'father_sire_name_semen_source' ? 18 : header === 'birth_time' ? 12 : header === 'weighing_date' ? 14 : header === 'birth_difficulty_level' ? 18 : header.includes('service_method') ? 18 : header.includes('calving_time') ? 12 : header.includes('calving_outcome') ? 16 : header.includes('outcome') ? 14 : 16
  }))

  const examplesHeaderRow = examplesSheet.getRow(1)
  examplesHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  examplesHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } }
  examplesHeaderRow.alignment = { horizontal: 'center' as any, vertical: 'center' as any, wrapText: true }

  // Add example rows to Examples sheet with light background
  exampleRows.forEach((row, idx) => {
    const exampleRow = examplesSheet.addRow(row)
    exampleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
    if (idx === 0) {
      exampleRow.getCell(1).font = { italic: true, color: { argb: 'FF6B7280' } }
    }
  })

  // Add blank row and note rows explaining examples
  examplesSheet.addRow([])
  const noteRow1 = examplesSheet.addRow(['✏️ HOW TO USE THESE EXAMPLES:'])
  noteRow1.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF1F2937' } }
  noteRow1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF08A' } }

  const noteRow2 = examplesSheet.addRow(['Use the "Animals" sheet to enter your own animal data. Flip between sheets to reference these examples while entering your data.'])
  noteRow2.getCell(1).font = { italic: true, color: { argb: 'FF6B7280' } }
  noteRow2.getCell(1).alignment = { wrapText: true }

  const noteRow3 = examplesSheet.addRow(['🐄 Rows 1-3 show a newborn calf (with auto tag), a purchased animal, and a production cycle example.'])
  noteRow3.getCell(1).font = { italic: true, color: { argb: 'FF6B7280' } }

  // 3. Create Hidden Lists Sheet for Validation
  const listSheet = workbook.addWorksheet('Lists')
  listSheet.state = 'hidden'

  // Write each list to its own section (A, B, C, D) starting at row 1
  // This ensures clean, deterministic data with no stale values
  
  // Column A: Breeds
  validationOptions.breeds.forEach((breed, idx) => {
    listSheet.getCell(`A${idx + 1}`).value = breed
  })
  
  // Column B: Genders  
  validationOptions.genders.forEach((gender, idx) => {
    listSheet.getCell(`B${idx + 1}`).value = gender
  })
  
  // Column C: Health Statuses
  validationOptions.healthStatuses.forEach((status, idx) => {
    listSheet.getCell(`C${idx + 1}`).value = status
  })
  
  // Column D: Production Statuses
  validationOptions.productionStatuses.forEach((status, idx) => {
    listSheet.getCell(`D${idx + 1}`).value = status
  })

  // 4. Apply Data Validation to Animals Sheet
  const tagNumberColIndex = headers.indexOf('tag_number') + 1
  const genderColIndex = headers.indexOf('gender') + 1
  const breedColIndex = headers.indexOf('breed') + 1
  const birthTimeColIndex = headers.indexOf('birth_time') + 1
  const birthDifficultyColIndex = headers.indexOf('birth_difficulty_level') + 1
  const healthColIndex = headers.indexOf('health_status') + 1
  const productionColIndex = headers.indexOf('production_status') + 1
  const sourceColIndex = headers.indexOf('animal_source') + 1
  const previousFarmTagColIndex = headers.indexOf('previous_farm_tag_number') + 1
  const motherDamTagColIndex = headers.indexOf('mother_dam_tag') + 1
  const motherDamNameColIndex = headers.indexOf('mother_dam_name') + 1
  const fatherSireSemenTagColIndex = headers.indexOf('father_sire_semen_tag') + 1
  const fatherSireNameSemenSourceColIndex = headers.indexOf('father_sire_name_semen_source') + 1
  const birthWeightKgColIndex = headers.indexOf('birth_weight_kg') + 1
  const currentWeightKgColIndex = headers.indexOf('current_weight_kg') + 1
  const weighingDateColIndex = headers.indexOf('weighing_date') + 1

  const rowsToValidate = 1000

  for (let i = 2; i <= rowsToValidate; i++) {
    const row = animalSheet.getRow(i)

    // Tag Number Validation (Optional but flexible)
    // Allows either 'auto' for system generation or manual input
    if (tagNumberColIndex > 0) {
      row.getCell(tagNumberColIndex).dataValidation = {
        type: 'custom',
        allowBlank: true,
        formulae: [`TRUE`],
        showInputMessage: true,
        promptTitle: 'Tag Number',
        prompt: 'Leave blank OR enter "auto" for system generation. Enter any custom tag (e.g., FARM-PUR-0001, CALF-2024-001)',
        showErrorMessage: false
      }
    }

    // Gender Validation (Required) - Reference Lists sheet column B
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

    // Breed Validation - Reference Lists sheet column A
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

    // Date of Birth Validation
    const dateOfBirthColIndex = headers.indexOf('date_of_birth') + 1
    if (dateOfBirthColIndex > 0) {
      row.getCell(dateOfBirthColIndex).dataValidation = {
        type: 'custom',
        allowBlank: true,
        formulae: [`TRUE`],
        showInputMessage: true,
        promptTitle: 'Date of Birth',
        prompt: 'Format: YYYY-MM-DD (example: 2024-01-15)',
        showErrorMessage: false
      }
    }

    // Health Status Validation - Reference Lists sheet column C
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

    // Production Status Validation - Reference Lists sheet column D
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

    // Birth Time Validation (Only for newborn_calf)
    const sourceCol = getExcelColumnLetter(sourceColIndex)
    if (birthTimeColIndex > 0) {
      row.getCell(birthTimeColIndex).dataValidation = {
        type: 'custom',
        formulae: [`IF($${sourceCol}${i}="newborn_calf",TRUE,FALSE)`],
        allowBlank: true,
        showInputMessage: true,
        promptTitle: 'Birth Time',
        prompt: 'Only fill if animal_source is "newborn_calf". Format: HH:MM (e.g., 08:30)',
        showErrorMessage: true,
        errorTitle: 'Field Only for Newborn Calves',
        error: 'This field is only available if animal_source is "newborn_calf"'
      }
    }

    // Birth Difficulty Level Validation (Only for newborn_calf)
    if (birthDifficultyColIndex > 0) {
      row.getCell(birthDifficultyColIndex).dataValidation = {
        type: 'custom',
        formulae: [`IF($${sourceCol}${i}="newborn_calf",TRUE,FALSE)`],
        allowBlank: true,
        showInputMessage: true,
        promptTitle: 'Birth Difficulty Level',
        prompt: 'Only fill if animal_source is "newborn_calf". Choose: normal, assisted, or difficult',
        showErrorMessage: true,
        errorTitle: 'Field Only for Newborn Calves',
        error: 'This field is only available if animal_source is "newborn_calf"'
      }
    }

    // Lineage Fields Validation (Required for newborn_calf, Optional for purchased_animal)
    // These fields are active for both animal sources
    
    // Mother/Dam Tag - Required if newborn_calf, Optional if purchased_animal
    if (motherDamTagColIndex > 0) {
      row.getCell(motherDamTagColIndex).dataValidation = {
        type: 'custom',
        formulae: [`IF($${sourceCol}${i}="newborn_calf",IF(ISBLANK($M${i}),FALSE,TRUE),TRUE)`],
        allowBlank: true,
        showInputMessage: true,
        promptTitle: 'Mother/Dam Tag',
        prompt: 'REQUIRED for newborn calves. Optional for purchased animals.',
        showErrorMessage: true,
        errorTitle: 'Mother/Dam Tag Required for Newborn Calves',
        error: 'This field is required if animal_source is "newborn_calf"'
      }
    }

    // Mother/Dam Name - Required if newborn_calf, Optional if purchased_animal
    if (motherDamNameColIndex > 0) {
      row.getCell(motherDamNameColIndex).dataValidation = {
        type: 'custom',
        formulae: [`IF($${sourceCol}${i}="newborn_calf",IF(ISBLANK($N${i}),FALSE,TRUE),TRUE)`],
        allowBlank: true,
        showInputMessage: true,
        promptTitle: 'Mother/Dam Name',
        prompt: 'REQUIRED for newborn calves. Optional for purchased animals.',
        showErrorMessage: true,
        errorTitle: 'Mother/Dam Name Required for Newborn Calves',
        error: 'This field is required if animal_source is "newborn_calf"'
      }
    }

    // Father/Sire/Semen Tag - Required if newborn_calf, Optional if purchased_animal
    if (fatherSireSemenTagColIndex > 0) {
      row.getCell(fatherSireSemenTagColIndex).dataValidation = {
        type: 'custom',
        formulae: [`IF($${sourceCol}${i}="newborn_calf",IF(ISBLANK($O${i}),FALSE,TRUE),TRUE)`],
        allowBlank: true,
        showInputMessage: true,
        promptTitle: 'Father/Sire/Semen Tag',
        prompt: 'REQUIRED for newborn calves. Optional for purchased animals.',
        showErrorMessage: true,
        errorTitle: 'Father/Sire/Semen Tag Required for Newborn Calves',
        error: 'This field is required if animal_source is "newborn_calf"'
      }
    }

    // Father/Sire Name/Semen Source - Required if newborn_calf, Optional if purchased_animal
    if (fatherSireNameSemenSourceColIndex > 0) {
      row.getCell(fatherSireNameSemenSourceColIndex).dataValidation = {
        type: 'custom',
        formulae: [`IF($${sourceCol}${i}="newborn_calf",IF(ISBLANK($P${i}),FALSE,TRUE),TRUE)`],
        allowBlank: true,
        showInputMessage: true,
        promptTitle: 'Father/Sire Name/Semen Source',
        prompt: 'REQUIRED for newborn calves. Optional for purchased animals.',
        showErrorMessage: true,
        errorTitle: 'Father/Sire Name/Semen Source Required for Newborn Calves',
        error: 'This field is required if animal_source is "newborn_calf"'
      }
    }

    // Birth Weight KG - Required if newborn_calf, Optional if purchased_animal
    if (birthWeightKgColIndex > 0) {
      row.getCell(birthWeightKgColIndex).dataValidation = {
        type: 'custom',
        formulae: [`IF($${sourceCol}${i}="newborn_calf",IF(ISBLANK($Q${i}),FALSE,TRUE),TRUE)`],
        allowBlank: true,
        showInputMessage: true,
        promptTitle: 'Birth Weight (kg)',
        prompt: 'REQUIRED for newborn calves. Optional for purchased animals.',
        showErrorMessage: true,
        errorTitle: 'Birth Weight Required for Newborn Calves',
        error: 'This field is required if animal_source is "newborn_calf"'
      }
    }

    // Current Weight KG - Optional but if filled, weighing_date is required
    const currentWeightKgCol = getExcelColumnLetter(currentWeightKgColIndex)
    const weighingDateCol = getExcelColumnLetter(weighingDateColIndex)
    if (currentWeightKgColIndex > 0) {
      row.getCell(currentWeightKgColIndex).dataValidation = {
        type: 'custom',
        allowBlank: true,
        formulae: [`OR(ISBLANK($${currentWeightKgCol}${i}),ISNUMBER($${currentWeightKgCol}${i}))`],
        showInputMessage: true,
        promptTitle: 'Current Weight (kg)',
        prompt: 'Optional. Enter numeric weight in kg. If filled, weighing_date must also be filled.',
        showErrorMessage: true,
        errorTitle: 'Current Weight Must Be Number',
        error: 'Current weight must be a numeric value (kg)'
      }
      row.getCell(currentWeightKgColIndex).numFmt = '0.00'
    }

    // Weighing Date - Required if current_weight_kg is filled
    if (weighingDateColIndex > 0) {
      row.getCell(weighingDateColIndex).dataValidation = {
        type: 'custom',
        allowBlank: true,
        formulae: [`IF(ISBLANK($${currentWeightKgCol}${i}),TRUE,NOT(ISBLANK($${weighingDateCol}${i})))`],
        showInputMessage: true,
        promptTitle: 'Weighing Date',
        prompt: 'REQUIRED if Current Weight is filled. Format: YYYY-MM-DD. Used to track weight history accuracy.',
        showErrorMessage: true,
        errorTitle: 'Weighing Date Required',
        error: 'Weighing Date is required when Current Weight is filled'
      }
    }

    // Purchase Date - Only for purchased_animal
    const purchaseDateColIndex = headers.indexOf('purchase_date') + 1
    if (purchaseDateColIndex > 0) {
      row.getCell(purchaseDateColIndex).dataValidation = {
        type: 'custom',
        formulae: [`IF($${sourceCol}${i}="purchased_animal",TRUE,FALSE)`],
        allowBlank: true,
        showInputMessage: true,
        promptTitle: 'Purchase Date',
        prompt: 'Only fill if animal_source is "purchased_animal". Format: YYYY-MM-DD (example: 2024-01-10)',
        showErrorMessage: true,
        errorTitle: 'Field Only for Purchased Animals',
        error: 'This field is only available if animal_source is "purchased_animal"'
      }
    }

    // Production Cycle Validation (Cycles 1-7)
    for (let cycleNum = 1; cycleNum <= 7; cycleNum++) {
      const outcomeColIndex = headers.indexOf(`outcome_${cycleNum}`) + 1
      const serviceDateColIndex = headers.indexOf(`service_date_${cycleNum}`) + 1
      const serviceMethodColIndex = headers.indexOf(`service_method_${cycleNum}`) + 1
      const steamingDateColIndex = headers.indexOf(`steaming_date_${cycleNum}`) + 1
      const expectedCalvingDateColIndex = headers.indexOf(`expected_calving_date_${cycleNum}`) + 1
      const actualCalvingDateColIndex = headers.indexOf(`actual_calving_date_${cycleNum}`) + 1
      const calvingTimeColIndex = headers.indexOf(`calving_time_${cycleNum}`) + 1
      const calvingOutcomeColIndex = headers.indexOf(`calving_outcome_${cycleNum}`) + 1
      const colostrumProducedColIndex = headers.indexOf(`colostrum_produced_${cycleNum}`) + 1
      const daysInMilkColIndex = headers.indexOf(`days_in_milk_${cycleNum}`) + 1

      // Service Date Validation
      if (serviceDateColIndex > 0) {
        row.getCell(serviceDateColIndex).dataValidation = {
          type: 'custom',
          allowBlank: true,
          formulae: [`TRUE`],
          showInputMessage: true,
          promptTitle: `Service Date (Cycle ${cycleNum})`,
          prompt: 'Format: YYYY-MM-DD (example: 2024-01-10)',
          showErrorMessage: false
        }
      }

      // Service Method Validation (Required when service_date is filled)
      const serviceDateCol = getExcelColumnLetter(serviceDateColIndex)
      if (serviceMethodColIndex > 0) {
        row.getCell(serviceMethodColIndex).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"Artificial Insemination,Natural Breeding,Embryo Transfer"`],
          showErrorMessage: true,
          errorTitle: 'Invalid Service Method',
          error: 'Choose: Artificial Insemination, Natural Breeding, or Embryo Transfer'
        }
      }

      // Outcome Validation (Required for cycle tracking)
      if (outcomeColIndex > 0) {
        row.getCell(outcomeColIndex).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"failed,success"`],
          showErrorMessage: true,
          errorTitle: 'Invalid Outcome',
          error: 'Choose: failed or success'
        }
      }

      // Conditional validations - only fill if outcome = 'success'
      const outcomeCol = getExcelColumnLetter(outcomeColIndex)
      
      // Steaming Date - only if success
      if (steamingDateColIndex > 0) {
        row.getCell(steamingDateColIndex).dataValidation = {
          type: 'custom',
          formulae: [`IF($${outcomeCol}${i}="success",TRUE,FALSE)`],
          allowBlank: true,
          showInputMessage: true,
          promptTitle: `Steaming Date (Cycle ${cycleNum})`,
          prompt: 'Only fill if outcome is "success". Format: YYYY-MM-DD (example: 2024-09-15)',
          showErrorMessage: true,
          errorTitle: 'Field Only for Successful Outcomes',
          error: 'This field is only available if outcome is "success"'
        }
      }
      
      // Expected Calving Date - only if success
      if (expectedCalvingDateColIndex > 0) {
        row.getCell(expectedCalvingDateColIndex).dataValidation = {
          type: 'custom',
          formulae: [`IF($${outcomeCol}${i}="success",TRUE,FALSE)`],
          allowBlank: true,
          showInputMessage: true,
          promptTitle: `Expected Calving Date (Cycle ${cycleNum})`,
          prompt: 'Only fill if outcome is "success". Format: YYYY-MM-DD (example: 2024-10-13)',
          showErrorMessage: true,
          errorTitle: 'Field Only for Successful Outcomes',
          error: 'This field is only available if outcome is "success"'
        }
      }

      // Actual Calving Date - only if success
      if (actualCalvingDateColIndex > 0) {
        row.getCell(actualCalvingDateColIndex).dataValidation = {
          type: 'custom',
          formulae: [`IF($${outcomeCol}${i}="success",TRUE,FALSE)`],
          allowBlank: true,
          showInputMessage: true,
          promptTitle: `Actual Calving Date (Cycle ${cycleNum})`,
          prompt: 'Only fill if outcome is "success". Format: YYYY-MM-DD (example: 2024-10-15)',
          showErrorMessage: true,
          errorTitle: 'Field Only for Successful Outcomes',
          error: 'This field is only available if outcome is "success"'
        }
      }

      // Calving Time - only if success
      if (calvingTimeColIndex > 0) {
        row.getCell(calvingTimeColIndex).dataValidation = {
          type: 'custom',
          formulae: [`IF($${outcomeCol}${i}="success",TRUE,FALSE)`],
          allowBlank: true,
          showInputMessage: true,
          promptTitle: `Calving Time (Cycle ${cycleNum})`,
          prompt: 'Only fill if outcome is "success". Format: HH:MM (example: 14:30)',
          showErrorMessage: true,
          errorTitle: 'Field Only for Successful Outcomes',
          error: 'This field is only available if outcome is "success"'
        }
      }

      // Calving Outcome - only if success
      if (calvingOutcomeColIndex > 0) {
        row.getCell(calvingOutcomeColIndex).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"easy - No issues quick delivery,normal - Standard delivery,difficult - Hard but unassisted,assisted - Required human help,cesarean - Surgical delivery,aborted - Pregnancy terminated"`],
          showErrorMessage: true,
          errorTitle: 'Invalid Calving Outcome',
          error: 'Select from dropdown: easy, normal, difficult, assisted, cesarean, or aborted'
        }
      }

      // Colostrum Produced - only if success (now numeric volume in liters)
      if (colostrumProducedColIndex > 0) {
        row.getCell(colostrumProducedColIndex).dataValidation = {
          type: 'custom',
          formulae: [`IF($${outcomeCol}${i}="success",OR(ISBLANK($${getExcelColumnLetter(colostrumProducedColIndex)}${i}),ISNUMBER($${getExcelColumnLetter(colostrumProducedColIndex)}${i})),FALSE)`],
          allowBlank: true,
          showInputMessage: true,
          promptTitle: `Colostrum Produced (Cycle ${cycleNum})`,
          prompt: 'Only fill if outcome is "success". Enter volume in liters (number, e.g., 12.5 or 15)',
          showErrorMessage: true,
          errorTitle: 'Field Only for Successful Outcomes',
          error: 'This field is only available if outcome is "success" and must be a number (liters)'
        }
        // Explicitly set cell format to Decimal to prevent Excel from interpreting as date
        row.getCell(colostrumProducedColIndex).numFmt = '0.00'
      }

      // Days in Milk - only if success (numeric field, not date)
      if (daysInMilkColIndex > 0) {
        row.getCell(daysInMilkColIndex).dataValidation = {
          type: 'custom',
          formulae: [`IF($${outcomeCol}${i}="success",OR(ISBLANK($${getExcelColumnLetter(daysInMilkColIndex)}${i}),ISNUMBER($${getExcelColumnLetter(daysInMilkColIndex)}${i})),FALSE)`],
          allowBlank: true,
          showInputMessage: true,
          promptTitle: 'Days in Milk',
          prompt: 'Only fill if outcome is "success". Enter number of days (e.g., 180 or 305)',
          showErrorMessage: true,
          errorTitle: 'Field Only for Successful Outcomes',
          error: 'This field is only available if outcome is "success" and must be a number (not a date)'
        }
        // Explicitly set cell format to Number to prevent Excel from interpreting as date
        row.getCell(daysInMilkColIndex).numFmt = '0'
      }
    }
  }

  // 5. Create Instructions Sheet
  const instructionsSheet = workbook.addWorksheet('Instructions')
  
  const instructions = [
    '📋 UNIVERSAL ANIMAL IMPORT TEMPLATE - INSTRUCTIONS',
    '',
    '🚨 IMPORTANT - BEFORE IMPORTING YOUR DATA:',
    '================================================',
    '✅ Use the ANIMALS sheet to enter your own data',
    '✅ The EXAMPLES sheet shows sample data for reference only',
    '✅ The ANIMALS sheet name is REQUIRED - do not rename or delete it',
    '❌ DO NOT import sample data - it will create test records in your database',
    '❌ DO NOT rename or delete the "Animals" worksheet - import will fail',
    '❌ DO NOT delete the "Examples" or "Lists" worksheets - keep them as backups',
    '❌ If sample data is accidentally imported, new animals with tags like "auto", "FARM-PUR-0001", and "COW-2023-001" must be deleted manually',
    '',
    '📝 HOW TO ENTER DATA:',
    '1. Open the ANIMALS sheet (currently empty - ready for your data)',
    '2. Flip to EXAMPLES sheet to see how to fill each column',
    '3. Enter your animals in the ANIMALS sheet starting at Row 2',
    '4. Keep the sheet named "Animals" (do not rename or delete)',
    '5. When ready to import, select ONLY the rows with your data (not the examples!)',
    '6. Click Import to add your animals to the database',
    '',
    '✨ KEY FEATURES:',
    '• One template for BOTH newborn calves and purchased animals',
    '• Flexible tag number handling: auto-generate OR enter manually',
    '• Data validation dropdowns for consistency',
    '• Works with both animal types in a single sheet',
    '',
    '🏷️ TAG NUMBER OPTIONS (First Column):',
    '• Type \"auto\" - System will automatically generate unique tag numbers',
    '• Type a custom tag - Enter your own tag number manually (e.g., FARM-PUR-0001)',
    '• Leave blank - System will auto-generate a tag number',
    '⚠️ Custom tag numbers must be UNIQUE (no duplicates allowed)',
    '',
    '🔥 HOW TO USE DROPDOWNS:',
    '1. Click on any cell with a dropdown field',
    '2. Look for the small arrow (▼) on the right side',
    '3. Click the arrow to open the dropdown list',
    '4. Select from the available options',
    '⚠️ Do NOT type manually for dropdown fields - use dropdown selections only!',
    '',
    '📋 COLUMN GUIDE (In Order):',
    '• TAG_NUMBER: \"auto\" for system generation OR custom tag (optional, first column)',
    '• NAME: Animal nickname (optional)',
    '• GENDER: 🔽 Dropdown - male or female (REQUIRED)',
    '• BREED: 🔽 Dropdown - select from breed list (optional)',
    '• DATE_OF_BIRTH: Format YYYY-MM-DD (example: 2024-01-15)',
    '• BIRTH_TIME: Time of birth in HH:MM format (optional, NEWBORN CALVES ONLY)',
    '• BIRTH_DIFFICULTY_LEVEL: Birth difficulty: normal, assisted, or difficult (optional, NEWBORN CALVES ONLY)',
    '• ANIMAL_SOURCE: 🔽 Dropdown - newborn_calf OR purchased_animal (REQUIRED)',
    '• PREVIOUS_FARM_TAG_NUMBER: Tag number from previous farm (optional, PURCHASED ANIMALS ONLY*)',
    '• HEALTH_STATUS: 🔽 Dropdown - current health condition (optional)',
    '• PRODUCTION_STATUS: 🔽 Dropdown - calf, heifer, bull, served, lactating, steaming dry cows, or open (culling) dry cows (optional)',
    '• MOTHER_DAM_TAG: Tag number of the mother/dam (REQUIRED for newborn calves, optional for purchased animals)',
    '• MOTHER_DAM_NAME: Name of the mother/dam (REQUIRED for newborn calves, optional for purchased animals)',
    '• FATHER_SIRE_SEMEN_TAG: Tag number, sire ID, or semen source code (REQUIRED for newborn calves, optional for purchased animals)',
    '• FATHER_SIRE_NAME_SEMEN_SOURCE: Name of father/sire or semen source name (REQUIRED for newborn calves, optional for purchased animals)',
    '• BIRTH_WEIGHT_KG: Birth weight in kilograms (REQUIRED for newborn calves, optional for purchased animals)',
    '• FARM_SELLER_NAME: Name of the seller/farm (optional, PURCHASED ANIMALS ONLY)',
    '• FARM_SELLER_CONTACT: Phone number or email address (optional, PURCHASED ANIMALS ONLY)',
    '• PURCHASE_DATE: Date of purchase (YYYY-MM-DD format, PURCHASED ANIMALS ONLY)',
    '• PURCHASE_PRICE: Amount paid (numbers only, PURCHASED ANIMALS ONLY)',
    '• NOTES: Comments or additional information (optional, last column)',
    '',
    '� NEWBORN CALF FIELDS (for animal_source = "newborn_calf"):',
    '• BIRTH_TIME: Time of birth (HH:MM format, e.g., 08:30)',
    '• BIRTH_DIFFICULTY_LEVEL: Birth difficulty - normal, assisted, or difficult',
    '• MOTHER_DAM_TAG: Tag number of the mother/dam (lineage tracking)',
    '• MOTHER_DAM_NAME: Name of the mother/dam',
    '• FATHER_SIRE_SEMEN_TAG: Tag number of father/sire, OR semen source code (for AI-bred calves)',
    '• FATHER_SIRE_NAME_SEMEN_SOURCE: Name of father/sire, OR semen source/company name (for AI calves)',
    '• BIRTH_WEIGHT_KG: Birth weight in kilograms (numbers only)',
    '',
    '🛒 PURCHASED ANIMAL FIELDS (for animal_source = "purchased_animal"):',
    '• PREVIOUS_FARM_TAG_NUMBER: Tag number from the previous farm (the animal\'s original tag)',
    '• FARM_SELLER_NAME: Name of the seller/farm',
    '• FARM_SELLER_CONTACT: Phone number or email address',
    '• PURCHASE_DATE: Date of purchase (YYYY-MM-DD format)',
    '• PURCHASE_PRICE: Amount paid (numbers only, no currency)',
    '',
    '�📝 TAG NUMBER EXAMPLES:',
    '• \"auto\" - System generates: FARM-NEW-20240115-001',
    '• \"FARM-PUR-0001\" - Custom tag for purchased animal',
    '• \"CALF-2024-JAN-01\" - Your farm\'s tagging standard',
    '• (blank) - Will auto-generate like \"auto\" option',
    '',
    '🐄 NEWBORN CALF EXAMPLE:',
    '• TAG_NUMBER: \"auto\" (system will generate)',
    '• NAME: \"Bella\"',
    '• GENDER: female',
    '• BREED: Holstein',
    '• DATE_OF_BIRTH: 2024-01-15',
    '• BIRTH_TIME: 08:30',
    '• BIRTH_DIFFICULTY_LEVEL: normal',
    '• ANIMAL_SOURCE: newborn_calf',
    '• PREVIOUS_FARM_TAG_NUMBER: (leave blank)',
    '• HEALTH_STATUS: healthy',
    '• PRODUCTION_STATUS: calf',
    '• MOTHER_DAM_TAG: COW001',
    '• MOTHER_DAM_NAME: Daisy',
    '• FATHER_SIRE_SEMEN_TAG: BULL001',
    '• FATHER_SIRE_NAME_SEMEN_SOURCE: Thor',
    '• BIRTH_WEIGHT_KG: 35',
    '• NOTES: Born on farm',
    '',
    '🐮 PURCHASED ANIMAL EXAMPLE:',
    '• TAG_NUMBER: \"FARM-PUR-0001\" (your custom tag)',
    '• NAME: \"Max\"',
    '• GENDER: male',
    '• BREED: Jersey',
    '• DATE_OF_BIRTH: 2023-06-10',
    '• BIRTH_TIME: (leave blank - for purchased animals)',
    '• BIRTH_DIFFICULTY_LEVEL: (leave blank - for purchased animals)',
    '• ANIMAL_SOURCE: purchased_animal',
    '• PREVIOUS_FARM_TAG_NUMBER: \"OLD-FARM-2023-089\" (tag from previous farm)',
    '• HEALTH_STATUS: healthy',
    '• PRODUCTION_STATUS: bull',
    '• MOTHER_DAM_TAG: (leave blank for purchased)',
    '• MOTHER_DAM_NAME: (leave blank for purchased)',
    '• FATHER_SIRE_SEMEN_TAG: (leave blank for purchased)',
    '• FATHER_SIRE_NAME_SEMEN_SOURCE: (leave blank for purchased)',
    '• BIRTH_WEIGHT_KG: (leave blank for purchased)',
    '• FARM_SELLER_NAME: John Smith',
    '• FARM_SELLER_CONTACT: +254712345678',
    '• PURCHASE_DATE: 2024-01-10',
    '• PURCHASE_PRICE: 50000',
    '• NOTES: Purchased from Smith Farm',
    '',
    '🐄 PRODUCTION CYCLE EXAMPLE (Lactating Female):',
    '• TAG_NUMBER: \"COW-2023-001\"',
    '• NAME: \"Rosie\"',
    '• GENDER: female',
    '• BREED: Holstein-Friesian',
    '• ANIMAL_SOURCE: newborn_calf',
    '• PRODUCTION_STATUS: lactating',
    '• CYCLE 1 (SUCCESSFUL):',
    '  - SERVICE_DATE_1: 2024-01-10',
    '  - BULL_TAG/CODE_1: BULL001',
    '  - BULL_NAME/SOURCE_1: Tommy',    '  - AI_TECHNICIAN_1: John Kipchoge',    '  - OUTCOME_1: success',
    '  - EXPECTED_CALVING_DATE_1: 2024-10-13',
    '  - ACTUAL_CALVING_DATE_1: 2024-10-15',
    '  - CALVING_TIME_1: 14:30',
    '  - CALVING_OUTCOME_1: normal',
    '  - COLOSTRUM_PRODUCED_1: 15.5 (liters)',
    '  - DAYS_IN_MILK_1: 180',
    '• CYCLES 2-7: (leave blank until animal is serviced again)',
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
    '   → Values will be normalized to snake_case during import (spaces and parentheses replaced with underscores)',
    '',
    '🔧 TROUBLESHOOTING:',
    '❌ \"Tag X already exists\" → Use different custom tag or type \"auto\"',
    '❌ Can\'t enter \"Previous Farm Tag Number\"? → Set animal_source to \"purchased_animal\" first',
    '❌ Previous farm tag field locked/protected? → It\'s conditional validation - only works for purchased animals',
    '❌ Birth time and difficulty locked? → Set animal_source to \"newborn_calf\" first',
    '❌ Parentage fields showing for purchased animal? → Leave mother/father tag fields blank - they\'re for newborns only',
    '❌ Can\'t enter calving data in production cycle? → Set outcome to \"success\" first',
    '❌ Calving fields locked even though outcome=success? → Excel validation active - try clicking outcome cell and re-entering \"success\"',
    '❌ \"Days in Milk\" showing as dates (e.g., 1/1/1970)? → Enter it as a NUMBER, not a date (e.g., 180 or 305)',
    '❌ No dropdowns visible: Ensure you\'re using Microsoft Excel',
    '❌ Can\'t select options: Click the dropdown arrow, don\'t type manually',
    '❌ Getting validation errors: Only use options from the dropdown lists',
    '❌ Lost dropdowns: Don\'t copy/paste cells - add new data in empty rows',
    '',
    '🐮 PRODUCTION CYCLES (Tracks up to 7 breeding/lactation cycles):',
    'Each cycle tracks a complete breeding event and its outcome:',
    '',
    '📊 PRODUCTION CYCLE COLUMNS (Repeated for Cycles 1-7):',
    '• SERVICE_DATE_(N): Date of insemination/service (YYYY-MM-DD format)',
    '• BULL_TAG_SEMEN_CODE_(N): Tag of bull used OR semen source code',
    '• BULL_NAME_SEMEN_SOURCE_(N): Name of bull/sire OR semen company name',    '• AI_TECHNICIAN_(N): Name of the AI technician who performed insemination (optional)',    '• OUTCOME_(N): 🔽 Dropdown - \"failed\" or \"success\" (REQUIRED for tracking)',
    '  → If \"failed\": Other cycle fields will be locked (cannot enter calving data)',
    '  → If \"success\": Calving fields become available for input',
    '• STEAMING_DATE_(N): Date cow enters steaming/dry period (YYYY-MM-DD, ONLY if outcome=success)',
    '• EXPECTED_CALVING_DATE_(N): When calf is expected (YYYY-MM-DD, ONLY if outcome=success)',
    '• ACTUAL_CALVING_DATE_(N): When calf was born (YYYY-MM-DD, ONLY if outcome=success)',
    '• CALVING_TIME_(N): Time of birth (HH:MM format, ONLY if outcome=success)',
    '• CALVING_OUTCOME_(N): How birth occurred (normal/assisted/caesarean, ONLY if outcome=success)',
    '• COLOSTRUM_PRODUCED_(N): Volume of colostrum in liters (number, e.g., 12.5) - ONLY if outcome=success. Used to track steaming effectiveness',
    '• DAYS_IN_MILK_(N): Days since calving (number only, e.g., 180 or 305) - ONLY if outcome=success. NOT a date!',
    '',
    '⚠️ PRODUCTION CYCLE EXAMPLES:',
    'Successful Cycle:',
    '  Service_Date: 2024-01-10',
    '  Bull_Tag/Code: BULL001',
    '  Bull_Name/Source: Tommy',
    '  AI_Technician: John Kipchoge',
    '  Outcome: success',
    '  Steaming_Date: 2024-09-15',
    '  Expected_Calving: 2024-10-13',
    '  Actual_Calving: 2024-10-15',
    '  Calving_Time: 14:30',
    '  Calving_Outcome: normal',
    '  Colostrum_Produced: 15.5 (liters)',
    '  Days_in_Milk: 180',
    '',
    'Failed Cycle:',
    '  Service_Date: 2024-06-20',
    '  Bull_Tag/Code: BULL002',
    '  Bull_Name/Source: Duke',
    '  AI_Technician: James Mwangi',
    '  Outcome: failed',
    '  [All other fields locked - cannot enter data]',
    '',
    '💡 PRODUCTION CYCLE TIPS:',
    '• Set outcome FIRST - other fields depend on this choice',
    '• If outcome = \"failed\", skip other columns for that cycle',
    '• If outcome = \"success\", enter complete calving information',
    '• Use 7 cycles to track lifetime of animal (multiple pregnancies)',
    '• Leave cycles blank if not yet used',
    '',
    'ℹ️ CONDITIONAL FIELD INFO:',
    '• \"BIRTH_TIME\" and \"BIRTH_DIFFICULTY_LEVEL\" are SMART fields that activate based on animal_source',
    '• If animal_source = \"newborn_calf\" → Fields are active and available for input',
    '• If animal_source = \"purchased_animal\" → Fields are locked/inactive (leave blank)',
    '• \"PREVIOUS_FARM_TAG_NUMBER\" is a SMART field that activates based on animal_source',
    '• If animal_source = \"newborn_calf\" → Field is locked/inactive (leave blank)',
    '• If animal_source = \"purchased_animal\" → Field is active and available for input',
    '• \"PRODUCTION CYCLE CALVING FIELDS\" are SMART fields that activate based on outcome',
    '• If outcome = \"failed\" → Calving fields are locked/inactive (cannot enter data)',
    '• If outcome = \"success\" → Calving fields are active (required for tracking)',
    '• This prevents data entry errors and ensures consistency',
    '',
    '💾 IMPORTANT:',
    '• Always save as .xlsx format to preserve dropdowns',
    '• Do NOT save as .csv - dropdowns will be lost',
    '• Tag numbers must be UNIQUE within your farm',
    '• Fill required fields: gender and animal_source at minimum',
    '• Custom tags recommend alphanumeric format (no special characters)',
    '• Set animal_source FIRST, then fill in conditional fields like previous_farm_tag_number',
  ]

  instructions.forEach(line => {
    instructionsSheet.addRow([line])
  })
  
  instructionsSheet.getColumn(1).width = 120
  for (let i = 1; i <= instructions.length; i++) {
    instructionsSheet.getRow(i).alignment = { wrapText: true, vertical: 'top' }
  }

  // Write buffer
  return await workbook.xlsx.writeBuffer()
}

export async function downloadUniversalTemplate(
  customOptions?: Partial<ValidationOptions>
) {
  try {
    console.log('Creating universal animal import template...')
    console.log('🟢 Health Status Options Being Used:', defaultValidationOptions.healthStatuses)
    
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