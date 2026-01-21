'use client'

import { useState, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Progress } from '@/components/ui/Progress'
import { importAnimalsActionWithAuth } from '@/app/actions/import-animals'
import { downloadUniversalTemplate } from '@/lib/enhanced-template-generator'
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
    healthStatuses: [
      'healthy', 'sick', 'injured', 'quarantine', 'vaccinated',
      'treatment', 'recovering', 'pregnant', 'lactating', 'good', 'fair', 'poor'
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
            
            let animalSource: 'newborn_calf' | 'purchased_animal' = 'purchased_animal'
            if (normalizedRow.mother_tag || normalizedRow.father_tag || normalizedRow.birth_weight_kg) {
              animalSource = 'newborn_calf'
            }
            
            return {
              ...normalizedRow,
              animal_source: animalSource,
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
      
      // Find the Animals worksheet (skip validation and instructions sheets)
      let animalSheet = workbook.getWorksheet('Animals')
      if (!animalSheet) {
        // Fallback to first sheet if Animals sheet not found
        animalSheet = workbook.worksheets[0]
      }

      if (!animalSheet) {
        throw new Error('No worksheet found in the Excel file.')
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
            let animalSource: 'newborn_calf' | 'purchased_animal' = 'purchased_animal'
            if (normalizedRow.mother_tag || normalizedRow.father_tag || normalizedRow.birth_weight_kg) {
              animalSource = 'newborn_calf'
            }

            animals.push({
              ...normalizedRow,
              animal_source: animalSource,
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
      
      // Gender is required
      if (!animal.gender || !['male', 'female'].includes(animal.gender)) {
        errors.push({
          row,
          field: 'gender',
          value: animal.gender || '',
          message: 'Gender is required and must be "male" or "female"'
        })
      }

      // Animal source is required
      if (!animal.animal_source || !['newborn_calf', 'purchased_animal'].includes(animal.animal_source)) {
        errors.push({
          row,
          field: 'animal_source',
          value: animal.animal_source || '',
          message: 'Animal source is required: "newborn_calf" or "purchased_animal"'
        })
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
      
      if (animal.production_status && !['calf', 'heifer', 'bull', 'served', 'lactating', 'dry'].includes(animal.production_status)) {
        warnings.push({
          row,
          field: 'production_status',
          value: animal.production_status,
          message: 'Invalid production status. Will be set to default'
        })
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
      
      if (animal.birth_weight_kg && (isNaN(Number(animal.birth_weight_kg)) || Number(animal.birth_weight_kg) <= 0)) {
        warnings.push({
          row,
          field: 'birth_weight_kg',
          value: String(animal.birth_weight_kg),
          message: 'Birth weight should be a positive number'
        })
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
      alert(`Error parsing file: ${error}`)
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
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // Generate tag numbers (format: FARM-SOURCE-INDEX)
      // e.g., FARM001-NEW-1, FARM001-PUR-1
      const validatedAnimals = parsedData.map((animal, index) => {
        const source = animal.animal_source === 'newborn_calf' ? 'NB' : 'PUR'
        const tagNumber = `${source}-${Date.now()}-${index + 1}` // Unique tag
        
        return {
          tag_number: tagNumber,
          ...animal,
          health_status: (animal.health_status?.toLowerCase() as "healthy" | "sick" | "injured" | "quarantine" | undefined) || undefined,
          // Ensure dates are strings for the server action
          date_of_birth: animal.date_of_birth ? new Date(animal.date_of_birth).toISOString().split('T')[0] : undefined,
          purchase_date: animal.purchase_date ? new Date(animal.purchase_date).toISOString().split('T')[0] : undefined
        }
      })

      const result = await importAnimalsActionWithAuth(farmId, validatedAnimals as any)
      
      clearInterval(progressInterval)
      setImportProgress(100)

      if (result.success) {
        setImportedCount(result.imported)
        setSkippedCount(result.skipped)
        setImportErrors(result.errors)
        
        if (result.animals && result.animals.length > 0) {
          onAnimalsImported(result.animals)
        }
        
        setStep('complete')
      } else {
        throw new Error(result.message || 'Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      alert(`Import failed: ${error}`)
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
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    {validationResult.errors.length} error(s) found:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {validationResult.errors.slice(0, 3).map((error, index) => (
                      <li key={index}>
                        Row {error.row}, {error.field}: {error.message}
                      </li>
                    ))}
                    {validationResult.errors.length > 3 && (
                      <li>... and {validationResult.errors.length - 3} more errors</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {validationResult.warnings.length > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 text-sm">
                  <div className="font-semibold mb-2">
                    {validationResult.warnings.length} warning(s):
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {validationResult.warnings.slice(0, 2).map((warning, index) => (
                      <li key={index}>
                        Row {warning.row}, {warning.field}: {warning.message}
                      </li>
                    ))}
                    {validationResult.warnings.length > 2 && (
                      <li>... and {validationResult.warnings.length - 2} more warnings</li>
                    )}
                  </ul>
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
                          <span className={`${
                            ['male', 'female'].includes(animal.gender)
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
            <p className="text-gray-600 text-sm mb-8">Processing your data...</p>
            
            <div className="max-w-xs mx-auto">
              <Progress value={importProgress} className="mb-4" />
              <p className="text-sm font-medium text-gray-600">
                {importProgress}% complete
              </p>
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