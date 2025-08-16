'use client'

import { useState, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Progress } from '@/components/ui/Progress'
import { importAnimalsActionWithAuth } from '@/app/actions/import-animals'
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  Info
} from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
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
  tag_number: string
  name?: string
  breed?: string
  gender: 'male' | 'female'
  date_of_birth?: string // Will map to birth_date in DB
  animal_source: 'newborn_calf' | 'purchased_animal'
  mother_tag?: string
  father_tag?: string
  birth_weight_kg?: number // Will map to birth_weight in DB
  seller_name?: string
  seller_contact?: string
  purchase_date?: string
  purchase_price?: number
  production_status?: 'calf' | 'heifer' | 'served' | 'lactating' | 'dry'
  health_status?: 'healthy' | 'sick' | 'injured' | 'quarantine'
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

  // Template generation functions - updated for your schema
  const generateCSVTemplate = (type: 'newborn' | 'purchased') => {
    const baseHeaders = [
      'tag_number*',
      'name',
      'breed',
      'gender*',
      'date_of_birth', // Will map to birth_date
      'production_status',
      'health_status',
      'notes'
    ]

    const newbornHeaders = [
      ...baseHeaders,
      'mother_tag',
      'father_tag',
      'birth_weight_kg' // Will map to birth_weight
    ]

    const purchasedHeaders = [
      ...baseHeaders,
      'seller_name',
      'seller_contact',
      'purchase_date',
      'purchase_price'
    ]

    const headers = type === 'newborn' ? newbornHeaders : purchasedHeaders
    
    // Updated sample data to match your constraints
    const sampleData = type === 'newborn' 
      ? ['CALF001', 'Bella', 'Holstein', 'female', '2024-01-15', 'calf', 'healthy', 'Born healthy', 'COW123', 'BULL456', '35']
      : ['COW002', 'Max', 'Jersey', 'female', '2023-06-10', 'heifer', 'healthy', 'Purchased from Smith Farm', 'John Smith', '+254712345678', '2024-01-10', '50000']

    const csv = [
      headers.join(','), 
      sampleData.join(','),
      // Add a comment row explaining the field mappings
      '# Note: date_of_birth maps to birth_date in database, birth_weight_kg maps to birth_weight'
    ].join('\n')
    return csv
  }

  const downloadTemplate = (type: 'newborn' | 'purchased', format: 'csv' | 'xlsx') => {
    const csv = generateCSVTemplate(type)
    
    if (format === 'csv') {
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_animals_template.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } else {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(
        csv.split('\n').filter(line => !line.startsWith('#')).map(row => row.split(','))
      )
      XLSX.utils.book_append_sheet(wb, ws, 'Animals')
      XLSX.writeFile(wb, `${type}_animals_template.xlsx`)
    }
  }

  // File parsing functions
  const parseCSV = (file: File): Promise<ParsedAnimal[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        comments: '#', // Skip comment lines
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

  const parseExcel = (file: File): Promise<ParsedAnimal[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet)
          
          const animals = jsonData.map((row: any, index: number) => {
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
        } catch (error) {
          reject(error)
        }
      }
      reader.readAsArrayBuffer(file)
    })
  }

  // Validation function - updated for your schema
  const validateData = (animals: ParsedAnimal[]): ValidationResult => {
    const errors: ImportError[] = []
    const warnings: ImportError[] = []
    
    animals.forEach((animal, index) => {
      const row = animal.row_index || index + 2
      
      if (!animal.tag_number) {
        errors.push({
          row,
          field: 'tag_number',
          value: '',
          message: 'Tag number is required'
        })
      }
      
      if (!animal.gender || !['male', 'female'].includes(animal.gender)) {
        errors.push({
          row,
          field: 'gender',
          value: animal.gender || '',
          message: 'Gender must be either "male" or "female"'
        })
      }
      
      // Validate production status against your DB constraints
      if (animal.production_status && !['calf', 'heifer', 'served', 'lactating', 'dry'].includes(animal.production_status)) {
        warnings.push({
          row,
          field: 'production_status',
          value: animal.production_status,
          message: 'Invalid production status. Will default to "calf"'
        })
      }
      
      // Your health_status field has no constraints, so any value is valid
      
      // Date validations
      if (animal.date_of_birth && isNaN(new Date(animal.date_of_birth).getTime())) {
        warnings.push({
          row,
          field: 'date_of_birth',
          value: animal.date_of_birth,
          message: 'Invalid date format. Please use YYYY-MM-DD format'
        })
      }
      
      if (animal.purchase_date && isNaN(new Date(animal.purchase_date).getTime())) {
        warnings.push({
          row,
          field: 'purchase_date',
          value: animal.purchase_date,
          message: 'Invalid date format. Please use YYYY-MM-DD format'
        })
      }
      
      // Numeric validations
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
      console.log('Starting import - mapped to your database schema')

      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const result = await importAnimalsActionWithAuth(farmId, parsedData)
      
      clearInterval(progressInterval)
      setImportProgress(100)

      console.log('Import result:', result)

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
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        {step === 'upload' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Animals</h2>
              <p className="text-gray-600">
                Upload a CSV or Excel file to import multiple animals at once
              </p>
              <div className="mt-2 p-2 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  🔗 Mapped to your database schema: birth_date, birth_weight, seller_info
                </p>
              </div>
            </div>

            {/* Template Downloads */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-blue-900 mb-2">Download Templates</h3>
                  <p className="text-sm text-blue-800 mb-3">
                    Download a template file to see the required format and fill in your animal data
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-blue-900">Newborn Calves</h4>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadTemplate('newborn', 'csv')}
                          className="flex items-center space-x-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>CSV</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadTemplate('newborn', 'xlsx')}
                          className="flex items-center space-x-1"
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                          <span>Excel</span>
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-blue-900">Purchased Animals</h4>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadTemplate('purchased', 'csv')}
                          className="flex items-center space-x-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>CSV</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadTemplate('purchased', 'xlsx')}
                          className="flex items-center space-x-1"
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                          <span>Excel</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                    <strong>Field Mappings:</strong> date_of_birth → birth_date, birth_weight_kg → birth_weight, seller info → seller_info
                  </div>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <Label htmlFor="file-upload">Upload File</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="file-upload"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Choose file to upload
                </p>
                <p className="text-gray-600 mb-4">
                  CSV or Excel files only. Maximum size 10MB.
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Browse Files</span>
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Preview Import</h2>
                <p className="text-gray-600">
                  Review your data before importing {parsedData.length} animals
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => setStep('upload')}
                className="flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Change File</span>
              </Button>
            </div>

            {/* Validation Results */}
            {!validationResult.valid && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="font-medium mb-2">
                    {validationResult.errors.length} error(s) found. Please fix these issues:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validationResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>
                        Row {error.row}, {error.field}: {error.message}
                      </li>
                    ))}
                    {validationResult.errors.length > 5 && (
                      <li>... and {validationResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {validationResult.warnings.length > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <div className="font-medium mb-2">
                    {validationResult.warnings.length} warning(s) found:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validationResult.warnings.slice(0, 3).map((warning, index) => (
                      <li key={index}>
                        Row {warning.row}, {warning.field}: {warning.message}
                      </li>
                    ))}
                    {validationResult.warnings.length > 3 && (
                      <li>... and {validationResult.warnings.length - 3} more warnings</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Data Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>Data Preview (first 5 rows)</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium">Tag Number</th>
                      <th className="text-left py-2 px-3 font-medium">Name</th>
                      <th className="text-left py-2 px-3 font-medium">Gender</th>
                      <th className="text-left py-2 px-3 font-medium">Source</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((animal, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2 px-3">{animal.tag_number}</td>
                        <td className="py-2 px-3">{animal.name || '-'}</td>
                        <td className="py-2 px-3">{animal.gender}</td>
                        <td className="py-2 px-3">
                          {animal.animal_source === 'newborn_calf' ? 'Newborn' : 'Purchased'}
                        </td>
                        <td className="py-2 px-3">{animal.production_status || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 5 && (
                  <p className="text-gray-500 text-center py-2">
                    ... and {parsedData.length - 5} more rows
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={!validationResult.valid || isImporting}
                className="flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Import {parsedData.length} Animals</span>
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Importing Animals</h2>
            <p className="text-gray-600 mb-6">Mapping data to your database schema and processing...</p>
            
            <div className="max-w-md mx-auto">
              <Progress value={importProgress} className="mb-4" />
              <p className="text-sm text-gray-600">
                {importProgress}% complete
              </p>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Complete!</h2>
            <p className="text-gray-600 mb-6">
              Successfully imported {importedCount} animals
              {skippedCount > 0 && ` (${skippedCount} skipped due to errors)`}
            </p>
            
            {/* Show import errors if any */}
            {importErrors.length > 0 && (
              <div className="mb-6 text-left max-w-2xl mx-auto">
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <div className="font-medium mb-2">Some issues occurred during import:</div>
                    <div className="max-h-32 overflow-y-auto">
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {importErrors.slice(0, 10).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {importErrors.length > 10 && (
                          <li>... and {importErrors.length - 10} more issues</li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            <Button onClick={handleClose} disabled={isImporting}>
              Done
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}