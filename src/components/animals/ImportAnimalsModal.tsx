'use client'

import { useState, useRef } from 'react'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Progress } from '@/components/ui/Progress'
import { importAnimalsActionWithAuth } from '@/app/actions/import-animals'
import { downloadUniversalTemplate } from '@/lib/enhanced-template-generator'
import { toast } from 'react-hot-toast'
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  Zap,
  ArrowRight
} from 'lucide-react'
import Papa from 'papaparse'
import ExcelJS from 'exceljs'
import { Animal } from '@/types/database'

interface ImportAnimalsModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onAnimalsImported: (animals: Animal[]) => void
}

interface ImportError {
  row: number
  field: string
  value: string
  message: string
}

interface ValidationResult {
  valid: boolean
  errors: ImportError[]
  warnings: ImportError[]
}

interface ParsedAnimal {
  tag_number?: string
  name?: string
  breed?: string
  gender: 'male' | 'female'
  date_of_birth?: string
  birth_time?: string
  birth_difficulty_level?: string
  animal_source: 'newborn_calf' | 'purchased_animal'
  previous_farm_tag_number?: string
  mother_dam_tag?: string
  mother_dam_name?: string
  father_sire_semen_tag?: string
  father_sire_name_semen_source?: string
  birth_weight_kg?: number
  farm_seller_name?: string
  farm_seller_contact?: string
  purchase_date?: string
  purchase_price?: number
  production_status?: 'calf' | 'heifer' | 'bull' | 'served' | 'lactating' | 'steaming_dry_cows' | 'open_culling_dry_cows'
  health_status?: string
  notes?: string
  row_index?: number
}

export function ImportAnimalsModal({
  farmId,
  isOpen,
  onClose,
  onAnimalsImported
}: ImportAnimalsModalProps) {
  const { isMobile } = useDeviceInfo()
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedAnimal[]>([])
  const [validationResult, setValidationResult] = useState<ValidationResult>({ valid: true, errors: [], warnings: [] })
  const [importProgress, setImportProgress] = useState(0)
  const [importedCount, setImportedCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Custom validation options
  const customValidationOptions = {
    breeds: [
      'Holstein-Friesian', 'Jersey', 'Guernsey', 'Ayrshire', 'Brown Swiss',
      'Friesian', 'Simmental', 'Angus', 'Hereford', 'Charolais',
      'Limousin', 'Brahman', 'Zebu', 'Sahiwal', 'Gir', 'Red Sindhi',
      'Crossbred', 'Other'
    ],
    // ✅ CRITICAL: These health_status values sync to the animals table 'status' field
    // - 'healthy' → status='active' (normal operational animal)
    // - 'sick' → status='active' (requires attention but still operational)
    // - 'requires_attention' → status='active' (flagged for monitoring)
    // - 'quarantine' or 'quarantined' → status='quarantined' (isolated, under observation)
    // - 'deceased' → status='deceased' + animal_release_records created (with death_cause)
    // - 'released' → status='sold' + animal_release_records created (as sale)
    healthStatuses: [
      'healthy', 'sick', 'injured', 'requires_attention',
      'quarantine', 'quarantined',  // Both forms supported, 'quarantine' auto-converts to 'quarantined'
      'vaccinated', 'treatment', 'recovering',
      'deceased',   // Creates release record with release_reason='deceased'
      'released'    // Creates release record with release_reason='sold'
    ]
  }

  // File parsing functions
  const parseCSV = (file: File): Promise<ParsedAnimal[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        comments: '#',
        complete: (result) => {
          if (result.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${result.errors[0].message}`))
            return
          }

          const animals = result.data.map((row: any, index: number) => {
            const normalizedRow: any = {}
            Object.keys(row).forEach(key => {
              const normalizedKey = key.replace('*', '').toLowerCase().replace(/\s+/g, '_')
              normalizedRow[normalizedKey] = row[key]
            })

            // Use explicit animal_source from template - NEVER infer it
            const animalSource = normalizedRow.animal_source || 'purchased_animal'

            return {
              ...normalizedRow,
              animal_source: animalSource as 'newborn_calf' | 'purchased_animal',
              row_index: index + 2
            }
          })

          resolve(animals)
        },
        error: (error) => reject(error)
      })
    })
  }

  // UPDATED: Excel parsing using exceljs
  const parseExcel = async (file: File): Promise<ParsedAnimal[]> => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(arrayBuffer)

      // REQUIRED: Must have "Animals" worksheet - no fallback to other sheets
      const animalSheet = workbook.getWorksheet('Animals')

      if (!animalSheet) {
        throw new Error(
          'Invalid template: Could not find "Animals" worksheet. ' +
          'Make sure you\'re using the correct template file and the "Animals" sheet has not been renamed or deleted. ' +
          'Download a fresh template and use the "Animals" sheet to enter your data.'
        )
      }

      const animals: ParsedAnimal[] = []
      const headers: { [colNumber: number]: string } = {}

      animalSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          // Process Headers
          row.eachCell((cell, colNumber) => {
            const cellValue = cell.value ? String(cell.value) : ''
            // Normalize header: remove *, lowercase, replace spaces with _
            const normalizedKey = cellValue.replace('*', '').toLowerCase().replace(/\s+/g, '_')
            headers[colNumber] = normalizedKey
          })
        } else {
          // Process Data Rows
          const normalizedRow: any = {}
          let hasData = false

          row.eachCell((cell, colNumber) => {
            const key = headers[colNumber]
            if (key) {
              let value = cell.value

              // Handle Rich Text or Hyperlinks which return objects
              if (typeof value === 'object' && value !== null) {
                if ('text' in value) {
                  value = (value as any).text
                } else if ('result' in value) {
                  value = (value as any).result // Formula result
                } else if ('hyperlink' in value) {
                  value = (value as any).text
                }
              }

              // ExcelJS returns actual Date objects for dates, or strings/numbers
              normalizedRow[key] = value
              hasData = true
            }
          })

          if (hasData) {
            // Use explicit animal_source from template - NEVER infer it
            // If not provided in template, default to purchased_animal
            const animalSource = normalizedRow.animal_source || 'purchased_animal'

            animals.push({
              ...normalizedRow,
              animal_source: animalSource as 'newborn_calf' | 'purchased_animal',
              row_index: rowNumber
            })
          }
        }
      })

      return animals
    } catch (error) {
      console.error('Excel parsing error:', error)
      throw error
    }
  }

  // Validation function
  const validateData = (animals: ParsedAnimal[]): ValidationResult => {
    const errors: ImportError[] = []
    const warnings: ImportError[] = []

    animals.forEach((animal, index) => {
      const row = animal.row_index || index + 2

      // 🔴 CRITICAL: Gender is REQUIRED and must be valid
      if (!animal.gender || !['male', 'female'].includes(animal.gender)) {
        errors.push({
          row,
          field: 'gender',
          value: animal.gender || '',
          message: '🔴 REQUIRED: Gender is required and must be "male" or "female"'
        })
      }

      // 🔴 CRITICAL: Animal source is REQUIRED and must be valid
      if (!animal.animal_source || !['newborn_calf', 'purchased_animal'].includes(animal.animal_source)) {
        errors.push({
          row,
          field: 'animal_source',
          value: animal.animal_source || '',
          message: '🔴 REQUIRED: Animal source is required: "newborn_calf" or "purchased_animal"'
        })
      }

      // 🟡 CONDITIONAL: Validate based on animal_source
      if (animal.animal_source === 'purchased_animal') {
        // Purchased animals REQUIRE: farm_seller_name and purchase_date
        if (!animal.farm_seller_name || !String(animal.farm_seller_name).trim()) {
          errors.push({
            row,
            field: 'farm_seller_name',
            value: animal.farm_seller_name || '',
            message: '🔴 REQUIRED for purchased_animal: Farm Seller Name cannot be empty'
          })
        }
        if (!animal.purchase_date) {
          errors.push({
            row,
            field: 'purchase_date',
            value: '',
            message: '🔴 REQUIRED for purchased_animal: Purchase Date cannot be empty'
          })
        }
      } else if (animal.animal_source === 'newborn_calf') {
        // Newborn calves REQUIRE: date_of_birth, birth_weight_kg, and mother tag
        if (!animal.date_of_birth) {
          errors.push({
            row,
            field: 'date_of_birth',
            value: '',
            message: '🔴 REQUIRED for newborn_calf: Date of Birth cannot be empty'
          })
        }
        if (!animal.birth_weight_kg || isNaN(Number(animal.birth_weight_kg)) || Number(animal.birth_weight_kg) <= 0) {
          errors.push({
            row,
            field: 'birth_weight_kg',
            value: String(animal.birth_weight_kg || ''),
            message: '🔴 REQUIRED for newborn_calf: Birth Weight must be a positive number'
          })
        }
        if (!animal.mother_dam_tag || !String(animal.mother_dam_tag).trim()) {
          errors.push({
            row,
            field: 'mother_dam_tag',
            value: animal.mother_dam_tag || '',
            message: '🔴 REQUIRED for newborn_calf: Mother/Dam Tag cannot be empty'
          })
        }
      }

      // Validate breed if provided
      if (animal.breed && !customValidationOptions.breeds.includes(animal.breed)) {
        warnings.push({
          row,
          field: 'breed',
          value: animal.breed,
          message: `Breed "${animal.breed}" is not in the standard list`
        })
      }

      // Normalize production_status before validation to catch issues early
      if (animal.production_status) {
        const normalizedStatus = (animal.production_status as string)
          .toLowerCase()
          .replace(/[\s()]+/g, '_')     // Replace spaces AND parentheses with underscore
          .replace(/_+/g, '_')           // Collapse multiple underscores
          .replace(/^_|_$/g, '')         // Trim leading/trailing underscores

        const validStatuses = [
          'calf', 'heifer', 'bull', 'served', 'lactating',
          'steaming_dry_cows', 'open_culling_dry_cows'
        ]

        if (!validStatuses.includes(normalizedStatus)) {
          warnings.push({
            row,
            field: 'production_status',
            value: animal.production_status,
            message: 'Invalid production status. Valid values: calf, heifer, bull, served, lactating, "steaming dry cows", "open (culling) dry cows". Will be set to default'
          })
        }
      }

      // Validate dates
      if (animal.date_of_birth) {
        const dateVal = new Date(animal.date_of_birth)
        if (isNaN(dateVal.getTime())) {
          warnings.push({
            row,
            field: 'date_of_birth',
            value: String(animal.date_of_birth),
            message: 'Invalid date format. Use YYYY-MM-DD'
          })
        }
      }

      if (animal.purchase_date) {
        const dateVal = new Date(animal.purchase_date)
        if (isNaN(dateVal.getTime())) {
          warnings.push({
            row,
            field: 'purchase_date',
            value: String(animal.purchase_date),
            message: 'Invalid date format. Use YYYY-MM-DD'
          })
        }
      }

      if (animal.purchase_price && (isNaN(Number(animal.purchase_price)) || Number(animal.purchase_price) <= 0)) {
        warnings.push({
          row,
          field: 'purchase_price',
          value: String(animal.purchase_price),
          message: 'Purchase price should be a positive number'
        })
      }
    })

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  // File handling
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)

    try {
      let animals: ParsedAnimal[]

      if (file.name.endsWith('.csv')) {
        animals = await parseCSV(file)
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        animals = await parseExcel(file)
      } else {
        throw new Error('Unsupported file format. Please use CSV or Excel files.')
      }

      setParsedData(animals)
      const validation = validateData(animals)
      setValidationResult(validation)
      setStep('preview')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      toast.error(`Failed to parse file: ${errorMsg}`)
      setSelectedFile(null)
    }
  }

  // Import process
  const handleImport = async () => {
    if (!validationResult.valid || isImporting) return

    setStep('importing')
    setImportProgress(0)
    setImportedCount(0)
    setSkippedCount(0)
    setImportErrors([])
    setIsImporting(true)

    try {
      const totalAnimals = parsedData.length

      // Pass animals as-is - tag_number will be validated/auto-generated by sanitizer
      // If user provided a tag_number, it will be used; if empty or "auto", sanitizer will generate one
      const validatedAnimals = parsedData.map((animal) => {
        return {
          ...animal,
          tag_number: animal.tag_number || 'auto',  // Empty or missing → sanitizer will auto-generate
          health_status: (animal.health_status?.toLowerCase() as "healthy" | "sick" | "injured" | "quarantine" | undefined) || undefined,
          // Ensure dates are strings for the server action
          date_of_birth: animal.date_of_birth ? new Date(animal.date_of_birth).toISOString().split('T')[0] : undefined,
          purchase_date: animal.purchase_date ? new Date(animal.purchase_date).toISOString().split('T')[0] : undefined,
          // Normalize production status to snake_case - MUST match validation logic
          production_status: animal.production_status
            ? (animal.production_status as string)
              .toLowerCase()
              .replace(/[\s()]+/g, '_')     // Replace spaces AND parentheses with underscore
              .replace(/_+/g, '_')           // Collapse multiple underscores
              .replace(/^_|_$/g, '')         // Trim leading/trailing underscores
            : undefined
        }
      })

      console.log('📤 Sending import request with', validatedAnimals.length, 'animals')
      
      // Update progress to indicate we're sending data
      setImportProgress(10)
      
      // Start simulated progress animation while server is processing
      // This gives visual feedback that something is happening
      let simulatedProgress = 10
      const progressInterval = setInterval(() => {
        // Gradually increase progress: slower at first, then faster
        // But keep it below 85% so it doesn't exceed actual progress
        simulatedProgress += Math.random() * 8 + 2
        if (simulatedProgress > 85) simulatedProgress = 85
        setImportProgress(Math.floor(simulatedProgress))
      }, 300)
      
      // Add timeout protection for long-running imports
      const IMPORT_TIMEOUT = 5 * 60 * 1000  // 5 minutes
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Import operation timed out. Please try again with fewer animals.')), IMPORT_TIMEOUT)
      )
      
      let result
      try {
        result = await Promise.race([
          importAnimalsActionWithAuth(farmId, validatedAnimals as any),
          timeoutPromise
        ]) as any
      } catch (timeoutError) {
        clearInterval(progressInterval)
        const errorMsg = timeoutError instanceof Error ? timeoutError.message : 'Unknown timeout error'
        console.error('⏱️ Timeout error:', errorMsg)
        throw new Error(errorMsg)
      }
      
      // Clear the simulated progress interval
      clearInterval(progressInterval)

      console.log('📥 Server response:', result)
      
      // Validate response structure with detailed error info
      if (!result || typeof result !== 'object') {
        console.error('❌ Invalid response type:', typeof result, 'value:', result)
        throw new Error('Server returned an invalid response. Please try again or contact support.')
      }
      
      if (!('success' in result && 'imported' in result && 'skipped' in result)) {
        console.error('❌ Invalid response structure:', result)
        throw new Error('Server returned an incomplete response. Please try again or contact support.')
      }

      if (result.success) {
        // Update counts immediately
        setImportedCount(result.imported)
        setSkippedCount(result.skipped)
        setImportErrors(result.errors)
        
        // Calculate progress based on actual results
        const actualProcessed = result.imported + result.skipped
        const actualProgress = Math.round((actualProcessed / totalAnimals) * 100)
        
        // Jump to actual progress now that server has responded
        setImportProgress(Math.min(actualProgress, 95))
        
        // Small delay for visual feedback, then complete
        setTimeout(() => {
          setImportProgress(100)
          
          if (result.animals && result.animals.length > 0) {
            onAnimalsImported(result.animals)
          }
          
          // Show success toast
          if (result.skipped > 0) {
            toast.success(`Imported ${result.imported} animals (${result.skipped} skipped)`, { duration: 4000 })
          } else {
            toast.success(`Successfully imported ${result.imported} animals!`, { duration: 4000 })
          }
          
          setStep('complete')
        }, 300)
      } else {
        console.error('❌ Import failed:', result.message, result.errors)
        const userMessage = result.message || 'Import failed for unknown reason'
        throw new Error(userMessage)
      }
    } catch (error) {
      console.error('❌ Import error:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Extract user-friendly error message
      let displayMessage = 'Import failed'
      if (errorMessage.includes('Authentication')) {
        displayMessage = 'Your session expired. Please log in again and try the import.'
      } else if (errorMessage.includes('Permission') || errorMessage.includes('access')) {
        displayMessage = 'You do not have permission to import animals to this farm.'
      } else if (errorMessage.includes('timeout')) {
        displayMessage = 'Import took too long. Try importing fewer animals or contact support.'
      } else if (errorMessage.includes('unexpected response')) {
        displayMessage = 'Server error: Could not process your request. Please try again.'
      } else if (errorMessage.length > 0) {
        displayMessage = errorMessage
      }
      
      // Show error toast with detailed logging
      toast.error(displayMessage, { duration: 5000 })
      console.error('Full error details:', { originalError: error, displayMessage })
      setStep('preview')
    } finally {
      setIsImporting(false)
    }
  }

  const resetModal = () => {
    setStep('upload')
    setSelectedFile(null)
    setParsedData([])
    setValidationResult({ valid: true, errors: [], warnings: [] })
    setImportProgress(0)
    setImportedCount(0)
    setSkippedCount(0)
    setImportErrors([])
    setIsImporting(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    if (!isImporting) {
      resetModal()
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl">
      <div className="p-4 md:p-6">
        {step === 'upload' && (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Import Animals
              </h2>
              <p className="text-gray-600 text-sm md:text-base">
                Bulk import animals using our Excel template
              </p>
            </div>

            {/* Quick Start Guide */}
            <div className="bg-gradient-to-br from-dairy-primary/10 to-dairy-primary/5 border border-dairy-primary/20 rounded-lg p-4 md:p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-dairy-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Get Started in 3 Steps</h3>
                  <ol className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-dairy-primary min-w-6">1.</span>
                      <span>Download the universal Excel template below</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-dairy-primary min-w-6">2.</span>
                      <span>Fill in your animal data using the dropdown menus</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-dairy-primary min-w-6">3.</span>
                      <span>Upload your file to import all animals at once</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Template Download Section */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Download Template</Label>
              <button
                onClick={() => downloadUniversalTemplate(customValidationOptions)}
                className="w-full bg-gradient-to-r from-dairy-primary to-dairy-primary/90 hover:from-dairy-primary hover:to-dairy-primary text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all hover:shadow-lg active:scale-95"
              >
                <Download className="w-5 h-5" />
                <span>Download Excel Template</span>
                <FileSpreadsheet className="w-5 h-5" />
              </button>
              <p className="text-xs text-gray-600 text-center">
                One template for newborn calves and purchased animals • Includes data validation dropdowns
              </p>
            </div>

            {/* File Upload */}
            <div className="space-y-3">
              <Label htmlFor="file-upload" className="text-base font-semibold">Upload Your File</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 md:p-8 text-center hover:border-dairy-primary hover:bg-dairy-primary/5 transition-all">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="file-upload"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Choose your file to upload
                </p>
                <p className="text-xs text-gray-600 mb-4">
                  CSV or Excel files (Max 10MB)
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 bg-dairy-primary hover:bg-dairy-primary/90"
                >
                  <Upload className="w-4 h-4" />
                  <span>Select File</span>
                </Button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Review Data</h2>
                <p className="text-gray-600 text-sm">
                  {parsedData.length} animals ready to import
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
                className="flex items-center gap-2 md:w-auto w-full justify-center"
              >
                <X className="w-4 h-4" />
                <span>Change File</span>
              </Button>
            </div>

            {/* Validation Results */}
            {!validationResult.valid && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 text-sm">
                  <div className="font-semibold mb-2">
                    🔴 {validationResult.errors.length} error(s) - must be fixed before importing:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs max-h-48 overflow-y-auto">
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>
                        <span className="font-medium">Row {error.row}</span> - {error.field}: {error.message}
                      </li>
                    ))}
                  </ul>
                  <div className="text-xs mt-2 text-red-700 font-semibold">
                    Please fix these issues in your file and re-upload.
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validationResult.warnings.length > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 text-sm">
                  <div className="font-semibold mb-2">
                    🟡 {validationResult.warnings.length} warning(s) (non-blocking):
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs max-h-40 overflow-y-auto">
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index}>
                        <span className="font-medium">Row {warning.row}</span> - {warning.field}: {warning.message}
                      </li>
                    ))}
                  </ul>
                  <div className="text-xs mt-2 text-yellow-700">
                    You can continue with import - data will be converted or defaults applied.
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Data Preview - Responsive Table */}
            <div className="bg-gray-50 rounded-lg p-3 md:p-4 overflow-x-auto">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm md:text-base">
                <Eye className="w-4 h-4" />
                <span>Preview (first 5 rows)</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Name</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Gender</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Breed</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((animal, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-white">
                        <td className="py-2 px-2">{animal.name || '-'}</td>
                        <td className="py-2 px-2">
                          <span className={`${['male', 'female'].includes(animal.gender)
                              ? 'text-green-600 font-medium'
                              : 'text-red-600'
                            }`}>
                            {animal.gender}
                          </span>
                        </td>
                        <td className="py-2 px-2">{animal.breed || '-'}</td>
                        <td className="py-2 px-2">
                          <span className="text-xs bg-dairy-primary/10 text-dairy-primary px-2 py-1 rounded">
                            {animal.animal_source === 'newborn_calf' ? '👶 Newborn' : '🛒 Purchased'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 5 && (
                  <p className="text-gray-500 text-center py-3 text-xs">
                    ... and {parsedData.length - 5} more rows
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
                className="flex-1 md:flex-0"
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={!validationResult.valid || isImporting}
                className="flex-1 flex items-center justify-center gap-2 bg-dairy-primary hover:bg-dairy-primary/90"
              >
                <Upload className="w-4 h-4" />
                <span>Import {parsedData.length} Animals</span>
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-dairy-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-dairy-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Importing Animals</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 text-sm mb-1">
                  {importProgress < 100 
                    ? `Processing ${parsedData.length} animals...`
                    : 'Finalizing import...'}
                </p>
                <p className="text-xs text-gray-500">
                  {importProgress < 100 
                    ? 'This may take a moment depending on the number of animals'
                    : 'Please wait while data is being organized'}
                </p>
              </div>

              <div className="max-w-xs mx-auto">
                <Progress value={importProgress} className="mb-3" />
                <p className="text-sm font-semibold text-dairy-primary">
                  {importProgress}% complete
                </p>
              </div>

              {/* Show counts once available */}
              {importedCount > 0 || skippedCount > 0 ? (
                <div className="flex gap-4 justify-center text-xs">
                  <div className="bg-green-50 border border-green-200 rounded px-3 py-2">
                    <p className="text-green-700 font-medium">✓ {importedCount} imported</p>
                  </div>
                  {skippedCount > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                      <p className="text-yellow-700 font-medium">⊘ {skippedCount} skipped</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Successful!</h2>
            <p className="text-gray-600 text-sm mb-6">
              {importedCount} animal{importedCount !== 1 ? 's' : ''} imported successfully
              {skippedCount > 0 && ` (${skippedCount} skipped)`}
            </p>

            {/* Show import errors if any */}
            {importErrors.length > 0 && (
              <div className="mb-6 text-left">
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 text-sm">
                    <div className="font-semibold mb-2">Issues during import:</div>
                    <div className="max-h-32 overflow-y-auto">
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        {importErrors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {importErrors.length > 5 && (
                          <li>... and {importErrors.length - 5} more issues</li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <Button
              onClick={handleClose}
              disabled={isImporting}
              className="bg-dairy-primary hover:bg-dairy-primary/90"
            >
              Done
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}