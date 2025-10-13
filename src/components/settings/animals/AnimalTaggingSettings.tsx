'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { AnimalCategoriesManager } from '@/components/settings/animals/AnimalCategoriesManager'
import { Textarea } from '@/components/ui/Textarea'
import { Switch } from '@/components/ui/Switch'
import { Badge } from '@/components/ui/Badge'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import {
  Tag,
  QrCode,
  Wifi,
  Camera,
  Palette,
  Hash,
  Users,
  Zap,
  Settings,
  Plus,
  X,
  Download,
  EyeOff,
  Smartphone,
  Radio,
  MapPin,
  Eye,
  AlertTriangle,
  Save,
  RotateCcw,
  Info,
  ArrowLeft
} from 'lucide-react'

// Mock data structure for different tagging methods
const taggingMethods = {
  basic: {
    title: "Basic Manual Tagging",
    description: "Simple, affordable tagging for small herds (1-50 cows)",
    features: ["Text/Number Tags", "Custom Attributes", "Color Coding", "Photo Upload"],
    icon: <Tag className="h-5 w-5" />,
    color: "bg-green-500"
  },
  structured: {
    title: "Semi-Structured Tagging",
    description: "Balanced approach with some automation (50-500 cows)",
    features: ["Hierarchical Tags", "Batch Operations", "QR/Barcode", "Smart Alerts"],
    icon: <QrCode className="h-5 w-5" />,
    color: "bg-blue-500"
  },
  automated: {
    title: "Automated/Tech-Integrated",
    description: "Advanced automation for large operations (500+ cows)",
    features: ["RFID Integration", "NFC Support", "GPS Tracking", "Biometric ID"],
    icon: <Wifi className="h-5 w-5" />,
    color: "bg-purple-500"
  }
}



interface ColorOption {
  name: string;
  color: string;
  value: string;
  description: string;
  active?: boolean;
}

const colorOptions: ColorOption[] = [
  { name: 'Healthy', color: 'bg-green-500', value: 'healthy', description: 'Animal in good health', active: true },
  { name: 'Sick', color: 'bg-red-500', value: 'sick', description: 'Requires immediate medical attention', active: true },
  { name: 'Under Observation', color: 'bg-yellow-500', value: 'observation', description: 'Monitoring for health changes', active: true },
  { name: 'Pregnant', color: 'bg-blue-500', value: 'pregnant', description: 'Confirmed pregnancy', active: true },
  { name: 'High Yield', color: 'bg-purple-500', value: 'high_yield', description: 'Above average milk production', active: true },
  { name: 'Due for Service', color: 'bg-orange-500', value: 'service_due', description: 'Ready for breeding', active: true },
  { name: 'Quarantined', color: 'bg-gray-800', value: 'quarantined', description: 'Isolated for health/safety reasons', active: true }
]

export default function AnimalTaggingSettings({
  farmId,
  userRole,
  currentHerdSize,
  initialSettings,
  farmName,
  initialAnimalCategories,
}: {
  farmId: any
  userRole: any
  currentHerdSize?: number
  initialSettings: any
  farmName: string
  initialAnimalCategories: any[]
}) {
  type TaggingMethodKey = keyof typeof taggingMethods;
  const [selectedMethod, setSelectedMethod] = useState<TaggingMethodKey>('basic')
  const { isMobile } = useDeviceInfo()
  const [animalCategories, setAnimalCategories] = useState(initialAnimalCategories || [])
  const canEdit = ['farm_owner', 'farm_manager'].includes(userRole)

  const [settings, setSettings] = useState({
    // Basic Settings
    tagPrefix: 'COW',
    tagNumbering: 'sequential', // sequential, custom, barcode
    enablePhotoTags: true,
    enableColorCoding: true,

    // Custom Format Settings (ADD THESE)
    customFormat: '{PREFIX}-{YEAR}-{NUMBER:3}',
    customStartNumber: 1,
    includeYearInTag: false,

    // Barcode Settings (ADD THESE)
    barcodeType: 'code128',
    barcodeLength: 8,
    includeCheckDigit: false,
    paddingZeros: true,

    // Custom Attributes
    customAttributes: [
      { name: 'Breed Group', values: ['Holstein', 'Jersey', 'Friesian', 'Cross'] },
      { name: 'Production Stage', values: ['Calf', 'Heifer', 'Lactating', 'Dry'] }
    ],

    // Color Coding
    colorCoding: colorOptions,

    // Structured Settings
    enableHierarchicalTags: false,
    enableBatchTagging: true,
    enableQRCodes: false,
    enableSmartAlerts: true,
    qrCodeSize: 'medium',

    // Automated Settings
    enableRFID: false,
    enableNFC: false,
    enableGPS: false,
    enableBiometric: false,
    rfidFrequency: '134.2khz',
    gpsUpdateInterval: 30,

    // Alert Settings
    smartAlerts: {
      healthReminders: true,
      breedingReminders: true,
      vaccinationReminders: true,
      productionAlerts: true
    }
  })
  const [newColor, setNewColor] = useState({
    name: '',
    description: '',
    color: 'bg-gray-500'
  })

  const resetCustomFormat = () => {
  const defaultFormat = settings.includeYearInTag
    ? '{PREFIX}-{YEAR}-{NUMBER:3}'
    : '{PREFIX}-{NUMBER:3}'

  setSettings(prev => ({
    ...prev,
    customFormat: defaultFormat
  }))
}

const clearCustomFormat = () => {
  setSettings(prev => ({
    ...prev,
    customFormat: ''
  }))
}

// Update the existing appendToFormat function to handle empty formats better:
const appendToFormat = (placeholder: string) => {
  setSettings(prev => {
    const currentFormat = prev.customFormat || ''

    // If format is empty, just add the placeholder
    if (!currentFormat) {
      return {
        ...prev,
        customFormat: placeholder
      }
    }

    // Add separator and placeholder
    const separator = '-'
    return {
      ...prev,
      customFormat: currentFormat + separator + placeholder
    }
  })
}

  const generateTagPreview = (
    prefix: string,
    customFormat?: string,
    startNumber?: number,
    customAttributes?: Array<{ name: string, values: string[] }>
  ) => {
    if (!customFormat) return `${prefix || 'COW'}-001`

    const currentYear = new Date().getFullYear().toString()
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0')

    let preview = customFormat
      .replace(/\{PREFIX\}/g, prefix || 'COW')
      .replace(/\{YEAR\}/g, currentYear)
      .replace(/\{YEAR:2\}/g, currentYear.slice(-2))
      .replace(/\{MONTH\}/g, currentMonth)
      .replace(/\{MONTH:1\}/g, (new Date().getMonth() + 1).toString())
      .replace(/\{NUMBER:(\d+)\}/g, (match, digits) => (startNumber || 1).toString().padStart(parseInt(digits), '0'))
      .replace(/\{NUMBER\}/g, (startNumber || 1).toString())

    // Handle custom attributes
    if (customAttributes) {
      customAttributes.forEach(attr => {
        const attributePlaceholder = attr.name.toUpperCase().replace(/\s+/g, '_')
        const regex = new RegExp(`\\{${attributePlaceholder}:(\\d+)\\}`, 'g')
        preview = preview.replace(regex, (match, digits) => {
          const value = attr.values[0] || 'X'
          return value.substring(0, parseInt(digits)).toUpperCase().padEnd(parseInt(digits), 'X')
        })
      })
    }

    return preview
  }

  const generateBarcodePreview = (
    prefix?: string,
    type?: string,
    length?: number,
    padding?: boolean,
    includeCheckDigit?: boolean,
    number: number = 1
  ) => {
    const baseNumber = number
    let display = ''
    let isValid = true

    try {
      switch (type) {
        case 'code128':
          const paddedNum = padding
            ? baseNumber.toString().padStart(Math.max(0, (length || 8) - (prefix || 'COW').length), '0')
            : baseNumber.toString()
          display = `${prefix || 'COW'}${paddedNum}`
          isValid = display.length <= 48
          break

        case 'code39':
          const code39Num = padding
            ? baseNumber.toString().padStart(Math.max(0, (length || 8) - (prefix || 'COW').length), '0')
            : baseNumber.toString()
          display = `${(prefix || 'COW').replace(/[^A-Z0-9\-\.\ \$\/\+\%]/g, '')}${code39Num}`
          isValid = display.length <= 43 && /^[A-Z0-9\-\.\ \$\/\+\%]*$/.test(display)
          break

        case 'ean13':
          const prefixDigits = (prefix || 'COW').replace(/\D/g, '').slice(0, 3).padStart(3, '0')
          const numberDigits = baseNumber.toString().padStart(9, '0').slice(0, 9)
          const ean13Base = `${prefixDigits}${numberDigits}`
          const checkDigit = includeCheckDigit ? calculateEAN13CheckDigit(ean13Base) : '0'
          display = ean13Base + checkDigit
          isValid = display.length === 13 && /^\d{13}$/.test(display)
          break

        case 'upc':
          const upcPrefix = (prefix || 'COW').replace(/\D/g, '').slice(0, 1).padStart(1, '0')
          const upcNumber = baseNumber.toString().padStart(10, '0').slice(0, 10)
          const upcBase = `${upcPrefix}${upcNumber}`
          const upcCheck = includeCheckDigit ? calculateUPCCheckDigit(upcBase) : '0'
          display = upcBase + upcCheck
          isValid = display.length === 12 && /^\d{12}$/.test(display)
          break

        default:
          display = `${prefix || 'COW'}${baseNumber}`
          break
      }
    } catch (error) {
      display = 'Error generating preview'
      isValid = false
    }

    return { display, isValid }
  }

  const calculateEAN13CheckDigit = (barcode: string): string => {
    let sum = 0
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(barcode[i])
      sum += i % 2 === 0 ? digit : digit * 3
    }
    return ((10 - (sum % 10)) % 10).toString()
  }

  const calculateUPCCheckDigit = (barcode: string): string => {
    let sum = 0
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(barcode[i])
      sum += i % 2 === 0 ? digit * 3 : digit
    }
    return ((10 - (sum % 10)) % 10).toString()
  }

  // Validation function
  const getValidationWarnings = (settings: any): string[] => {
    const warnings: string[] = []

    if (settings.barcodeType === 'ean13' || settings.barcodeType === 'upc') {
      const numericPrefix = (settings.tagPrefix || 'COW').replace(/\D/g, '')
      if (numericPrefix.length === 0) {
        warnings.push(`${settings.barcodeType.toUpperCase()} requires numeric prefix`)
      }
    }

    if (settings.barcodeType === 'code39') {
      const invalidChars = (settings.tagPrefix || 'COW').match(/[^A-Z0-9\-\.\ \$\/\+\%]/g)
      if (invalidChars) {
        warnings.push('Code 39 prefix contains unsupported characters')
      }
    }

    if (settings.barcodeLength && settings.barcodeLength > 15 && settings.barcodeType !== 'code128') {
      warnings.push('Length may be too long for reliable scanning')
    }

    return warnings
  }

  const addCustomColor = () => {
    if (newColor.name && newColor.color) {
      const colorValue = newColor.name.toLowerCase().replace(/\s+/g, '_')
      const customColor = {
        name: newColor.name,
        color: newColor.color,
        value: colorValue,
        description: newColor.description || `Custom color for ${newColor.name}`,
        active: true,
        isCustom: true
      }

      setSettings(prev => ({
        ...prev,
        colorCoding: [...prev.colorCoding, customColor]
      }))

      setNewColor({ name: '', description: '', color: 'bg-gray-500' })
    }
  }

  const removeColor = (index: number) => {
    setSettings(prev => ({
      ...prev,
      colorCoding: prev.colorCoding.filter((_, i) => i !== index)
    }))
  }

  const toggleColorActive = (index: number) => {
    setSettings(prev => ({
      ...prev,
      colorCoding: prev.colorCoding.map((color, i) =>
        i === index ? { ...color, active: color.active !== false ? false : true } : color
      )
    }))
  }

  const [newAttribute, setNewAttribute] = useState({ name: '', values: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    if (initialSettings) {
      setSettings({
        tagPrefix: initialSettings.tagPrefix || 'COW',
        tagNumbering: initialSettings.numberingSystem || 'sequential',
        enablePhotoTags: initialSettings.enablePhotoTags ?? true,
        enableColorCoding: initialSettings.enableColorCoding ?? true,

        // ADD THESE LINES
        customFormat: initialSettings.customFormat || '{PREFIX}-{YEAR}-{NUMBER:3}',
        customStartNumber: initialSettings.customStartNumber || 1,
        includeYearInTag: initialSettings.includeYearInTag || false,
        barcodeType: initialSettings.barcodeType || 'code128',
        barcodeLength: initialSettings.barcodeLength || 8,
        includeCheckDigit: initialSettings.includeCheckDigit || false,
        paddingZeros: initialSettings.paddingZeros ?? true,

        customAttributes: initialSettings.customAttributes || [
          { name: 'Breed Group', values: ['Holstein', 'Jersey', 'Friesian', 'Cross'] },
          { name: 'Production Stage', values: ['Calf', 'Heifer', 'Lactating', 'Dry'] }
        ],
        colorCoding: initialSettings.colorCoding && initialSettings.colorCoding.length > 0
          ? initialSettings.colorCoding
          : colorOptions,
        enableHierarchicalTags: initialSettings.enableHierarchicalTags ?? false,
        enableBatchTagging: initialSettings.enableBatchTagging ?? true,
        enableQRCodes: initialSettings.enableQRCodes ?? false,
        enableSmartAlerts: initialSettings.enableSmartAlerts ?? true,
        qrCodeSize: initialSettings.qrCodeSize || 'medium',
        enableRFID: initialSettings.enableRFID ?? false,
        enableNFC: initialSettings.enableNFC ?? false,
        enableGPS: initialSettings.enableGPS ?? false,
        enableBiometric: initialSettings.enableBiometric ?? false,
        rfidFrequency: initialSettings.rfidFrequency || '134.2khz',
        gpsUpdateInterval: initialSettings.gpsUpdateInterval || 30,
        smartAlerts: initialSettings.smartAlerts || {
          healthReminders: true,
          breedingReminders: true,
          vaccinationReminders: true,
          productionAlerts: true
        }
      })

      // Set the method based on initial settings
      if (initialSettings.method) {
        setSelectedMethod(initialSettings.method)
      }
    }
  }, [initialSettings])

  useEffect(() => {
  // This will trigger when settings change
  setHasUnsavedChanges(true)
}, [settings, selectedMethod])

  // Auto-suggest method based on herd size
  useEffect(() => {
    if (!currentHerdSize) return
    if (currentHerdSize <= 50) {
      setSelectedMethod('basic')
    } else if (currentHerdSize <= 500) {
      setSelectedMethod('structured')
    } else {
      setSelectedMethod('automated')
    }
  }, [currentHerdSize])

  interface MethodSettings {
    enableRFID: boolean
    enableNFC: boolean
    enableGPS: boolean
    enableBiometric: boolean
  }

  const handleMethodChange = (method: TaggingMethodKey): void => {
    setSelectedMethod(method)
    // Reset some settings based on method
    if (method === 'basic') {
      setSettings(prev => ({
        ...prev,
        enableRFID: false,
        enableNFC: false,
        enableGPS: false,
        enableBiometric: false
      }))
    }
  }

  const addCustomAttribute = () => {
    if (newAttribute.name && newAttribute.values) {
      const values = newAttribute.values.split(',').map(v => v.trim()).filter(v => v)
      setSettings(prev => ({
        ...prev,
        customAttributes: [...prev.customAttributes, { name: newAttribute.name, values }]
      }))
      setNewAttribute({ name: '', values: '' })
    }
  }

  interface CustomAttribute {
    name: string;
    values: string[];
  }

  const removeCustomAttribute = (index: number): void => {
    setSettings(prev => ({
      ...prev,
      customAttributes: prev.customAttributes.filter((_, i) => i !== index)
    }))
  }

  const checkUnsavedChanges = () => {
  if (hasUnsavedChanges) {
    return window.confirm(
      `⚠️ Unsaved Changes Detected\n\n` +
      `You have unsaved changes to your animal tagging settings.\n\n` +
      `If you leave now, your changes will be lost.\n\n` +
      `Are you sure you want to leave without saving?`
    )
  }
  return true
}


  const handleSaveSettings = async () => {
  // User confirmation dialog
  const userConfirmed = window.confirm(
    `Are you sure you want to save these animal tagging settings?\n\n` +
    `This will:\n` +
    `• Update the tagging method to: ${taggingMethods[selectedMethod].title}\n` +
    `• Apply new settings to future animal registrations\n` +
    `• Change tag generation format\n\n` +
    `Click OK to proceed or Cancel to review your settings.`
  )

  if (!userConfirmed) {
    return // User cancelled
  }

  setIsLoading(true)
  try {
    console.log('🔄 Saving tagging settings...', {
      farmId,
      method: selectedMethod,
      settings: settings
    })

    const response = await fetch('/api/settings/animal-tagging', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        farmId: farmId,
        settings: {
          method: selectedMethod,
          tagPrefix: settings.tagPrefix,
          numberingSystem: settings.tagNumbering,

          // Custom format settings
          customFormat: settings.customFormat,
          customStartNumber: settings.customStartNumber,
          includeYearInTag: settings.includeYearInTag,

          // Barcode settings
          barcodeType: settings.barcodeType,
          barcodeLength: settings.barcodeLength,
          includeCheckDigit: settings.includeCheckDigit,
          paddingZeros: settings.paddingZeros,

          // Basic features
          enablePhotoTags: settings.enablePhotoTags,
          enableColorCoding: settings.enableColorCoding,
          enableQRCodes: settings.enableQRCodes,
          enableHierarchicalTags: settings.enableHierarchicalTags,
          enableBatchTagging: settings.enableBatchTagging,
          enableSmartAlerts: settings.enableSmartAlerts,

          // Advanced features
          enableRFID: settings.enableRFID,
          enableNFC: settings.enableNFC,
          enableGPS: settings.enableGPS,
          enableBiometric: settings.enableBiometric,
          qrCodeSize: settings.qrCodeSize,
          rfidFrequency: settings.rfidFrequency,
          gpsUpdateInterval: settings.gpsUpdateInterval,

          // Custom attributes and colors
          customAttributes: settings.customAttributes.map((attr, index) => ({
            name: attr.name,
            values: attr.values,
            required: false,
            sortOrder: index
          })),
          colorCoding: settings.colorCoding,
          smartAlerts: settings.smartAlerts
        }
      })
    })

    const result = await response.json()
    console.log('💾 Save response:', result)

    if (!response.ok) {
      throw new Error(result.error || 'Failed to save settings')
    }

    // Success feedback
    toast.success('✅ Tagging settings saved successfully!', {
      duration: 4000,
      position: 'top-right',
    })

    // Optional: Show detailed success message
    const successMessage = `Settings saved successfully!\n\n` +
      `Method: ${taggingMethods[selectedMethod].title}\n` +
      `Tag Format: ${settings.tagNumbering}\n` +
      `Prefix: ${settings.tagPrefix}\n` +
      `Features enabled: ${[
        settings.enablePhotoTags && 'Photo Tags',
        settings.enableColorCoding && 'Color Coding',
        settings.enableQRCodes && 'QR Codes',
        settings.enableBatchTagging && 'Batch Tagging',
        settings.enableRFID && 'RFID',
        settings.enableNFC && 'NFC',
        settings.enableGPS && 'GPS'
      ].filter(Boolean).join(', ') || 'Basic features only'}`

    console.log('✅ Settings saved:', successMessage)

    // You can uncomment this if you want a detailed success dialog
    // alert(successMessage)

  } catch (error) {
    console.error('❌ Error saving settings:', error)

    // Error feedback
    toast.error(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      duration: 6000,
      position: 'top-right',
    })

    // Also show alert for critical errors
    alert(`Failed to save settings:\n\n${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your connection and try again.`)
  } finally {
    setIsLoading(false)
  }
}

  const generateQRCodes = async () => {
    if (!settings.enableQRCodes) {
      alert('QR codes are not enabled. Please enable QR codes and save settings first.')
      return
    }

    try {
      const response = await fetch('/api/animals/qr-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmId: farmId,
          size: settings.qrCodeSize,
          // animalIds: [] // Optional: specify animal IDs, or leave empty for all animals
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate QR codes')
      }

      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `animal-qr-codes-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      alert('QR codes generated and downloaded successfully!')

    } catch (error) {
      console.error('Error generating QR codes:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate QR codes')
    }
  }

  const resetToDefaults = () => {
  // Detailed confirmation dialog
  const userConfirmed = window.confirm(
    `⚠️ Reset to Default Settings?\n\n` +
    `This will permanently reset ALL your animal tagging configuration to default values:\n\n` +
    `• Tag prefix will be set to "COW"\n` +
    `• Numbering system will be "Sequential"\n` +
    `• All custom attributes will be reset to defaults\n` +
    `• Advanced features will be disabled\n` +
    `• Color coding will be reset to standard colors\n\n` +
    `❌ This action cannot be undone.\n\n` +
    `Are you absolutely sure you want to continue?`
  )

  if (!userConfirmed) {
    return // User cancelled
  }

  // Second confirmation for critical action
  const doubleConfirmed = window.confirm(
    `🚨 Final Confirmation\n\n` +
    `You are about to lose all your custom tagging settings.\n\n` +
    `Click OK only if you are absolutely certain you want to reset everything to defaults.`
  )

  if (!doubleConfirmed) {
    return // User cancelled on second confirmation
  }

  try {
    // Reset settings
    const defaultSettings = {
      tagPrefix: 'COW',
      tagNumbering: 'sequential',

      // Custom format defaults
      customFormat: '{PREFIX}-{NUMBER:3}',
      customStartNumber: 1,
      includeYearInTag: false,

      // Barcode defaults
      barcodeType: 'code128',
      barcodeLength: 8,
      includeCheckDigit: false,
      paddingZeros: true,

      enablePhotoTags: true,
      enableColorCoding: true,
      customAttributes: [
        { name: 'Breed Group', values: ['Holstein', 'Jersey', 'Friesian', 'Cross'] },
        { name: 'Production Stage', values: ['Calf', 'Heifer', 'Lactating', 'Dry'] }
      ],
      colorCoding: colorOptions,
      enableHierarchicalTags: selectedMethod !== 'basic',
      enableBatchTagging: selectedMethod !== 'basic',
      enableQRCodes: selectedMethod === 'structured' || selectedMethod === 'automated',
      enableSmartAlerts: true,
      qrCodeSize: 'medium',
      enableRFID: selectedMethod === 'automated',
      enableNFC: selectedMethod === 'automated',
      enableGPS: false,
      enableBiometric: false,
      rfidFrequency: '134.2khz',
      gpsUpdateInterval: 30,
      smartAlerts: {
        healthReminders: true,
        breedingReminders: true,
        vaccinationReminders: true,
        productionAlerts: true
      }
    }

    setSettings(defaultSettings)

    // Success feedback
    toast.success('🔄 Settings reset to defaults successfully!', {
      duration: 3000,
      position: 'top-right',
    })

    console.log('🔄 Settings reset to defaults')

    // Optional success alert
    alert(`✅ Settings Reset Complete\n\nAll animal tagging settings have been restored to their default values.\n\nRemember to click "Save Settings" to make these changes permanent.`)

  } catch (error) {
    console.error('❌ Error resetting settings:', error)
    toast.error('Failed to reset settings. Please try again.', {
      duration: 4000,
      position: 'top-right',
    })
    alert('Failed to reset settings. Please refresh the page and try again.')
  }
}

  const handleBack = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
  event.preventDefault()

  if (checkUnsavedChanges()) {
    window.history.back()
    // Or if using Next.js router:
    // router.push('/dashboard/settings')
  }
}

const resetUnsavedChanges = () => {
  setHasUnsavedChanges(false)
}

  return (
    <div className={`
      ${isMobile ? 'px-4 py-4' : 'dashboard-container'}
      pb-20 lg:pb-6
    `}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Settings</span>
          </Button>
        </div>

        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Tag className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              Animal Classification and Tagging Configuration
            </h1>
            <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
              Configure tagging methods and identification systems for your herd of {currentHerdSize} animals
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            Current Method: {taggingMethods[selectedMethod].title}
          </Badge>
        </div>
      </div>

      {/* Animal Categories */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Animal Categories</span>
          </CardTitle>
          <CardDescription>
            Define animal groups based on age, breeding status, and other characteristics.
            This helps create targeted feeding programs and better animal management.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnimalCategoriesManager
            farmId={farmId}
            categories={animalCategories}
            onCategoriesUpdate={setAnimalCategories}
            canEdit={canEdit}
            isMobile={isMobile}
          />
        </CardContent>
      </Card>


      {/* Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Choose Tagging Method</span>
          </CardTitle>
          <CardDescription>
            Select the tagging approach that best fits your farm size and technical requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(taggingMethods).map(([key, method]) => (
              <div
                key={key}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${selectedMethod === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
                onClick={() => handleMethodChange(key as TaggingMethodKey)}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`w-10 h-10 ${method.color} rounded-lg flex items-center justify-center text-white`}>
                    {method.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{method.title}</h3>
                    <p className="text-sm text-gray-600">{method.description}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {method.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></div>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Identification Settings</CardTitle>
          <CardDescription>Configure fundamental animal identification parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tagPrefix">Tag Prefix</Label>
              <Input
                id="tagPrefix"
                value={settings.tagPrefix}
                onChange={(e) => setSettings(prev => ({ ...prev, tagPrefix: e.target.value }))}
                placeholder="COW"
              />
              <p className="text-sm text-gray-500 mt-1">Prefix for auto-generated tag numbers</p>
            </div>

            <div>
              <Label htmlFor="tagNumbering">Numbering System</Label>
              <Select
                value={settings.tagNumbering}
                onValueChange={(value) => setSettings(prev => ({ ...prev, tagNumbering: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">Sequential (COW-001, COW-002...)</SelectItem>
                  <SelectItem value="custom">Custom Format</SelectItem>
                  <SelectItem value="barcode">Barcode Compatible</SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Format Configuration */}
              {settings.tagNumbering === 'custom' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Custom Format Pattern</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resetCustomFormat()}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset Format
                      </Button>
                    </div>
                    <Input
                      placeholder="e.g., {PREFIX}-{YEAR}-{BREED_GROUP:2}-{NUMBER:3}"
                      value={settings.customFormat || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, customFormat: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Available placeholders: {'{PREFIX}'}, {'{YEAR}'}, {'{MONTH}'}
                      {settings.customAttributes.length > 0 && (
                        <span>
                          , {settings.customAttributes.map(attr =>
                            `{${attr.name.toUpperCase().replace(/\s+/g, '_')}:X}`
                          ).join(', ')}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Quick Format Builder */}
                  <div className="p-3 bg-white rounded border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Quick Format Builder</Label>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearCustomFormat()}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetCustomFormat()}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reset
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => appendToFormat('{PREFIX}')}
                      >
                        + Prefix
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => appendToFormat('{YEAR}')}
                      >
                        + Year
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => appendToFormat('{MONTH:2}')}
                      >
                        + Month
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => appendToFormat('{NUMBER:3}')}
                      >
                        + Number
                      </Button>

                      {/* Dynamic buttons for custom attributes */}
                      {settings.customAttributes.slice(0, 4).map((attr, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => appendToFormat(`{${attr.name.toUpperCase().replace(/\s+/g, '_')}:2}`)}
                          className="text-xs"
                        >
                          + {attr.name}
                        </Button>
                      ))}
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      Current format: <code className="bg-gray-100 px-1 rounded">
                        {settings.customFormat || '{PREFIX}-{NUMBER:3}'}
                      </code>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm">Starting Number</Label>
                      <Input
                        type="number"
                        min="1"
                        value={settings.customStartNumber || 1}
                        onChange={(e) => setSettings(prev => ({ ...prev, customStartNumber: parseInt(e.target.value) }))}
                      />
                    </div>

                    {/* Include Year switch remains the same */}
                    <div className="flex flex-col justify-end">
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                        <Label className="text-sm font-medium">Include Year</Label>
                        <Switch
                          checked={settings.includeYearInTag || false}
                          onCheckedChange={(checked) => {
                            setSettings(prev => {
                              let newFormat = prev.customFormat || '{PREFIX}-{NUMBER:3}'

                              if (checked) {
                                if (!newFormat.includes('{YEAR}')) {
                                  newFormat = newFormat.replace('{PREFIX}', '{PREFIX}-{YEAR}')
                                }
                              } else {
                                newFormat = newFormat
                                  .replace('-{YEAR}', '')
                                  .replace('_{YEAR}', '')
                                  .replace('{YEAR}-', '')
                                  .replace('{YEAR}_', '')
                                  .replace('{YEAR}', '')
                              }

                              return {
                                ...prev,
                                includeYearInTag: checked,
                                customFormat: newFormat
                              }
                            })
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Auto adds/removes year
                      </p>
                    </div>

                    {/* Format templates */}
                    <div>
                      <Label className="text-sm">Quick Templates</Label>
                      <Select
                        value=""
                        onValueChange={(value) => {
                          if (value) {
                            setSettings(prev => ({ ...prev, customFormat: value }))
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="{PREFIX}-{NUMBER:3}">Simple: COW-001</SelectItem>
                          <SelectItem value="{PREFIX}-{YEAR}-{NUMBER:3}">With Year: COW-2024-001</SelectItem>
                          <SelectItem value="{PREFIX}-{MONTH:2}-{NUMBER:2}">Monthly: COW-01-01</SelectItem>
                          {settings.customAttributes.length > 0 && (
                            <>
                              <SelectItem value={`{PREFIX}-{${settings.customAttributes[0].name.toUpperCase().replace(/\s+/g, '_')}:2}-{NUMBER:3}`}>
                                With {settings.customAttributes[0].name}
                              </SelectItem>
                              {settings.customAttributes.length > 1 && (
                                <SelectItem value={`{PREFIX}-{${settings.customAttributes[0].name.toUpperCase().replace(/\s+/g, '_')}:1}{${settings.customAttributes[1].name.toUpperCase().replace(/\s+/g, '_')}:1}-{NUMBER:3}`}>
                                  Multi-Attribute
                                </SelectItem>
                              )}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Enhanced Preview */}
                  <div className="p-3 bg-white rounded border">
                    <Label className="text-xs text-gray-600 mb-2 block">Preview Examples:</Label>
                    <div className="space-y-1">
                      {[1, 2, 3].map(num => (
                        <div key={num} className="font-mono text-sm text-gray-800">
                          {generateTagPreview(
                            settings.tagPrefix,
                            settings.customFormat,
                            (settings.customStartNumber || 1) + num - 1,
                            settings.customAttributes
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Format validation and tips */}
                  <div className="text-xs text-gray-600">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="font-medium mb-1">Available Placeholders:</div>
                        <div className="space-y-1 ml-2">
                          <div>• <code>{'{PREFIX}'}</code> → Your tag prefix</div>
                          <div>• <code>{'{YEAR}'}</code> → 2024 | <code>{'{YEAR:2}'}</code> → 24</div>
                          <div>• <code>{'{MONTH}'}</code> → 01-12 | <code>{'{MONTH:1}'}</code> → 1-12</div>
                          <div>• <code>{'{NUMBER:X}'}</code> → Padded numbers</div>
                          {settings.customAttributes.map(attr => (
                            <div key={attr.name}>
                              • <code>{`{${attr.name.toUpperCase().replace(/\s+/g, '_')}:X}`}</code> → {attr.values[0].substring(0, 2).toUpperCase()}...
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium mb-1">Tips:</div>
                        <div className="space-y-1 ml-2">
                          <div>• Use :X to specify character length</div>
                          <div>• First attribute value is used in previews</div>
                          <div>• Keep total tag length under 20 characters</div>
                          <div>• Use Reset button if format gets messy</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Barcode Compatible Configuration */}
              {settings.tagNumbering === 'barcode' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Barcode Type</Label>
                      <Select
                        value={settings.barcodeType || 'code128'}
                        onValueChange={(value) => {
                          setSettings(prev => {
                            // Auto-adjust settings based on barcode type
                            let newSettings = { ...prev, barcodeType: value }

                            switch (value) {
                              case 'ean13':
                                newSettings.barcodeLength = 13
                                newSettings.includeCheckDigit = true
                                newSettings.paddingZeros = true
                                break
                              case 'upc':
                                newSettings.barcodeLength = 12
                                newSettings.includeCheckDigit = true
                                newSettings.paddingZeros = true
                                break
                              case 'code39':
                                // Code 39 has character limitations
                                newSettings.barcodeLength = Math.min(newSettings.barcodeLength || 8, 15)
                                break
                              case 'code128':
                              default:
                                // Most flexible, keep current settings
                                break
                            }

                            return newSettings
                          })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="code128">Code 128 (Alphanumeric)</SelectItem>
                          <SelectItem value="code39">Code 39 (Basic)</SelectItem>
                          <SelectItem value="ean13">EAN-13 (Numeric only)</SelectItem>
                          <SelectItem value="upc">UPC-A (Numeric only)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm">Number Length</Label>
                      <Select
                        value={settings.barcodeLength?.toString() || '8'}
                        onValueChange={(value) => setSettings(prev => ({ ...prev, barcodeLength: parseInt(value) }))}
                        disabled={settings.barcodeType === 'ean13' || settings.barcodeType === 'upc'}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {settings.barcodeType === 'ean13' ? (
                            <SelectItem value="13">13 digits (Fixed)</SelectItem>
                          ) : settings.barcodeType === 'upc' ? (
                            <SelectItem value="12">12 digits (Fixed)</SelectItem>
                          ) : (
                            <>
                              <SelectItem value="6">6 digits</SelectItem>
                              <SelectItem value="8">8 digits</SelectItem>
                              <SelectItem value="10">10 digits</SelectItem>
                              <SelectItem value="12">12 digits</SelectItem>
                              {settings.barcodeType === 'code128' && <SelectItem value="15">15 digits</SelectItem>}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      {(settings.barcodeType === 'ean13' || settings.barcodeType === 'upc') && (
                        <p className="text-xs text-gray-500 mt-1">Fixed length for {settings.barcodeType.toUpperCase()}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Include Check Digit Switch */}
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                      <div className="flex flex-col">
                        <Label className="text-sm font-medium">Include Check Digit</Label>
                        <p className="text-xs text-gray-500">
                          {settings.barcodeType === 'ean13' || settings.barcodeType === 'upc'
                            ? 'Required for this barcode type'
                            : 'Adds error detection capability'
                          }
                        </p>
                      </div>
                      <Switch
                        checked={settings.includeCheckDigit || settings.barcodeType === 'ean13' || settings.barcodeType === 'upc'}
                        onCheckedChange={(checked) => {
                          // Force check digit for EAN13 and UPC
                          if (settings.barcodeType === 'ean13' || settings.barcodeType === 'upc') return
                          setSettings(prev => ({ ...prev, includeCheckDigit: checked }))
                        }}
                        disabled={settings.barcodeType === 'ean13' || settings.barcodeType === 'upc'}
                      />
                    </div>

                    {/* Leading Zeros Switch */}
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                      <div className="flex flex-col">
                        <Label className="text-sm font-medium">Leading Zeros</Label>
                        <p className="text-xs text-gray-500">
                          {settings.barcodeType === 'ean13' || settings.barcodeType === 'upc'
                            ? 'Required for proper scanning'
                            : 'Pads numbers with zeros (001 vs 1)'
                          }
                        </p>
                      </div>
                      <Switch
                        checked={settings.paddingZeros ?? true}
                        onCheckedChange={(checked) => {
                          // Force padding for EAN13 and UPC
                          if (settings.barcodeType === 'ean13' || settings.barcodeType === 'upc') return
                          setSettings(prev => ({ ...prev, paddingZeros: checked }))
                        }}
                        disabled={settings.barcodeType === 'ean13' || settings.barcodeType === 'upc'}
                      />
                    </div>
                  </div>

                  {/* Enhanced Barcode Preview with validation */}
                  <div className="p-3 bg-white rounded border">
                    <Label className="text-xs text-gray-600 mb-2 block">Barcode Preview Examples:</Label>
                    <div className="space-y-2">
                      {[1, 2, 3].map(num => {
                        const preview = generateBarcodePreview(
                          settings.tagPrefix,
                          settings.barcodeType,
                          settings.barcodeLength,
                          settings.paddingZeros,
                          settings.includeCheckDigit,
                          num
                        )
                        return (
                          <div key={num} className="flex items-center justify-between">
                            <span className="font-mono text-sm text-gray-800">{preview.display}</span>
                            {preview.isValid ? (
                              <span className="text-xs text-green-600">✓ Valid</span>
                            ) : (
                              <span className="text-xs text-red-600">⚠ Check format</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Dynamic Barcode Guidance */}
                  <div className="text-xs text-gray-600 space-y-2">
                    <div className="font-medium">Barcode Guidelines for {settings.barcodeType?.toUpperCase()}:</div>
                    <div className="ml-2 space-y-1">
                      {settings.barcodeType === 'code128' && (
                        <>
                          <div>• Most versatile: supports letters, numbers, and symbols</div>
                          <div>• Variable length: 1-48 characters recommended</div>
                          <div>• Best for: complex identification with alphanumeric data</div>
                        </>
                      )}
                      {settings.barcodeType === 'code39' && (
                        <>
                          <div>• Basic format: supports A-Z, 0-9, and limited symbols</div>
                          <div>• Variable length: up to 43 characters</div>
                          <div>• Best for: simple numeric or basic alphanumeric codes</div>
                        </>
                      )}
                      {settings.barcodeType === 'ean13' && (
                        <>
                          <div>• International retail standard: exactly 13 digits</div>
                          <div>• First 3 digits: country/manufacturer code</div>
                          <div>• Last digit: automatically calculated check digit</div>
                          <div>• Best for: retail products and inventory</div>
                        </>
                      )}
                      {settings.barcodeType === 'upc' && (
                        <>
                          <div>• North American retail standard: exactly 12 digits</div>
                          <div>• First digit: number system (usually 0-9)</div>
                          <div>• Last digit: automatically calculated check digit</div>
                          <div>• Best for: US/Canada retail operations</div>
                        </>
                      )}
                      <div>• Test scan sample tags before bulk printing</div>
                      <div>• Ensure your scanner supports {settings.barcodeType?.toUpperCase()}</div>
                    </div>
                  </div>

                  {/* Validation warnings */}
                  {getValidationWarnings(settings).length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-yellow-800">Configuration Warnings:</div>
                          <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                            {getValidationWarnings(settings).map((warning, index) => (
                              <li key={index}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Camera className="h-4 w-4" />
              <Label>Photo Identification</Label>
            </div>
            <Switch
              checked={settings.enablePhotoTags}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enablePhotoTags: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <div>
                <Label>Color Coding System</Label>
                <p className="text-xs text-gray-500">Visual status indicators for quick animal identification</p>
              </div>
            </div>
            <Switch
              checked={settings.enableColorCoding}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableColorCoding: checked }))}
            />
          </div>

          {/* Static Color Categories Display */}
          <div className="ml-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-medium">Standard Color Categories</Label>
              <div className="text-xs text-gray-500">
                {settings.enableColorCoding ? 'Active' : 'Disabled'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {colorOptions.map((color, index) => (
                <div key={index} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${settings.enableColorCoding
                  ? 'bg-white border-gray-200'
                  : 'bg-gray-100 border-gray-100'
                  }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 ${color.color} rounded-full ${settings.enableColorCoding ? '' : 'opacity-50'
                      }`}></div>
                    <div>
                      <div className={`text-sm font-medium ${settings.enableColorCoding ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                        {color.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {color.description}
                      </div>
                    </div>
                  </div>

                  {/* Status indicator for each color */}
                  <div className={`text-xs px-2 py-1 rounded-full ${settings.enableColorCoding
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-500'
                    }`}>
                    {settings.enableColorCoding ? 'Available' : 'Disabled'}
                  </div>
                </div>
              ))}
            </div>

            {/* Information footer */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-700">
                  <div className="font-medium mb-1">Color Coding Benefits:</div>
                  <ul className="space-y-0.5 ml-2">
                    <li>• Quick visual identification of animal status</li>
                    <li>• Easier herd management and decision making</li>
                    <li>• Immediate alerts for animals needing attention</li>
                    <li>• Streamlined workflow for farm workers</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Attributes */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Attributes</CardTitle>
          <CardDescription>
            Define custom categories that can be used in tag formats and animal registration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Information Banner */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <div className="font-medium mb-1">Custom Attributes Usage:</div>
                <ul className="space-y-1 ml-2">
                  <li>• Used in animal registration forms for data collection</li>
                  <li>• Can be included in custom tag formats (e.g., {`{BREED:2}`} for breed codes)</li>
                  <li>• Help organize and filter your herd effectively</li>
                  <li>• First value in each attribute becomes the default option</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Existing Attributes */}
          <div className="space-y-4">
            {settings.customAttributes.map((attr, index) => (
              <div key={index} className="p-4 border rounded-lg bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{attr.name}</h4>
                    <p className="text-xs text-gray-500">
                      Tag placeholder: {`{${attr.name.toUpperCase().replace(/\s+/g, '_')}:X}`} (X = number of characters)
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Copy tag placeholder to clipboard
                        const placeholder = `{${attr.name.toUpperCase().replace(/\s+/g, '_')}:2}`
                        navigator.clipboard.writeText(placeholder)
                        alert(`Copied: ${placeholder}`)
                      }}
                      className="text-xs"
                    >
                      Copy Tag
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomAttribute(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {attr.values.map((value, vIndex) => (
                      <div key={vIndex} className="flex items-center space-x-1">
                        <Badge variant={vIndex === 0 ? "default" : "secondary"}>
                          {value}
                        </Badge>
                        {vIndex === 0 && (
                          <span className="text-xs text-blue-600">(Default)</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Show example tag usage */}
                  <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                    <span className="font-medium">Example: </span>
                    Using {`{${attr.name.toUpperCase().replace(/\s+/g, '_')}:2}`} with "{attr.values[0]}" would generate:
                    <code className="ml-1 px-1 bg-gray-200 rounded">
                      {attr.values[0].substring(0, 2).toUpperCase()}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Attribute Form */}
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Attribute Name</Label>
                <Input
                  placeholder="e.g., Breed Group, Location, Source Farm"
                  value={newAttribute.name}
                  onChange={(e) => setNewAttribute(prev => ({ ...prev, name: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Will create tag placeholder: {`{${newAttribute.name.toUpperCase().replace(/\s+/g, '_')}:X}`}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Attribute Values</Label>
                <Input
                  placeholder="Holstein, Jersey, Friesian, Cross (first value = default)"
                  value={newAttribute.values}
                  onChange={(e) => setNewAttribute(prev => ({ ...prev, values: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Comma-separated values. First value will be the default selection.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={addCustomAttribute}
                  disabled={!newAttribute.name || !newAttribute.values}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Attribute
                </Button>

                {newAttribute.name && newAttribute.values && (
                  <div className="text-xs text-gray-500">
                    Preview: {newAttribute.values.split(',').map(v => v.trim()).filter(v => v).slice(0, 3).join(', ')}
                    {newAttribute.values.split(',').length > 3 && '...'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recommended Attributes */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <div className="w-4 h-4 bg-green-600 rounded-full mt-0.5 flex-shrink-0"></div>
              <div>
                <div className="text-sm font-medium text-green-800 mb-2">
                  Recommended Attributes for Dairy Farms:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-green-700">
                  <div>
                    <strong>Breed Group:</strong> Holstein, Jersey, Friesian, Cross
                  </div>
                  <div>
                    <strong>Production Stage:</strong> Calf, Heifer, Lactating, Dry
                  </div>
                  <div>
                    <strong>Location:</strong> Barn A, Barn B, Pasture 1, Pasture 2
                  </div>
                  <div>
                    <strong>Source Farm:</strong> Born Here, Smith Farm, Auction, Other
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  These attributes work well with custom tag formats and provide good herd organization.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Structured Tagging Features */}
      {(selectedMethod === 'structured' || selectedMethod === 'automated') && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Tagging Features</CardTitle>
            <CardDescription>Semi-automated and structured tagging options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <Label>Hierarchical Organization</Label>
                </div>
                <Switch
                  checked={settings.enableHierarchicalTags}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableHierarchicalTags: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Hash className="h-4 w-4" />
                  <Label>Batch Tagging Operations</Label>
                </div>
                <Switch
                  checked={settings.enableBatchTagging}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableBatchTagging: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <QrCode className="h-4 w-4" />
                  <Label>QR Code Generation</Label>
                </div>
                <Switch
                  checked={settings.enableQRCodes}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableQRCodes: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <Label>Smart Alerts</Label>
                </div>
                <Switch
                  checked={settings.enableSmartAlerts}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableSmartAlerts: checked }))}
                />
              </div>
            </div>

            {settings.enableQRCodes && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">QR Code Configuration</Label>
                  <Button variant="outline" size="sm" onClick={generateQRCodes}>
                    <Download className="h-4 w-4 mr-2" />
                    Generate QR Codes
                  </Button>
                </div>
                <Select
                  value={settings.qrCodeSize}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, qrCodeSize: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (2x2 cm)</SelectItem>
                    <SelectItem value="medium">Medium (3x3 cm)</SelectItem>
                    <SelectItem value="large">Large (4x4 cm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Automated/Tech Features */}
      {selectedMethod === 'automated' && (
        <Card>
          <CardHeader>
            <CardTitle>Automated Technology Integration</CardTitle>
            <CardDescription>High-tech identification and tracking systems</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Radio className="h-4 w-4" />
                  <Label>RFID Integration</Label>
                </div>
                <Switch
                  checked={settings.enableRFID}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableRFID: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4" />
                  <Label>NFC Support</Label>
                </div>
                <Switch
                  checked={settings.enableNFC}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableNFC: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <Label>GPS Tracking</Label>
                </div>
                <Switch
                  checked={settings.enableGPS}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableGPS: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4" />
                  <Label>Biometric Identification</Label>
                </div>
                <Switch
                  checked={settings.enableBiometric}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableBiometric: checked }))}
                />
              </div>
            </div>

            {settings.enableRFID && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium mb-2 block">RFID Configuration</Label>
                <Select
                  value={settings.rfidFrequency}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, rfidFrequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="134.2khz">134.2 kHz (ISO Standard)</SelectItem>
                    <SelectItem value="125khz">125 kHz (Basic)</SelectItem>
                    <SelectItem value="13.56mhz">13.56 MHz (High Frequency)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {settings.enableGPS && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium mb-2 block">GPS Update Interval (minutes)</Label>
                <Input
                  type="number"
                  value={settings.gpsUpdateInterval}
                  onChange={(e) => setSettings(prev => ({ ...prev, gpsUpdateInterval: parseInt(e.target.value) }))}
                  min="5"
                  max="120"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Smart Alerts Configuration */}
      {settings.enableSmartAlerts && (
        <Card>
          <CardHeader>
            <CardTitle>Smart Alert Configuration</CardTitle>
            <CardDescription>Configure automatic notifications based on animal tags</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(settings.smartAlerts).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                  <Switch
                    checked={value}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      smartAlerts: { ...prev.smartAlerts, [key]: checked }
                    }))}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
  <div className="flex items-center space-x-2">
    <Info className="h-4 w-4 text-blue-500" />
    <span className="text-sm text-gray-600">
      Changes will apply to new animals. Existing animals can be updated individually.
    </span>
    {hasUnsavedChanges && (
      <div className="flex items-center space-x-1 ml-4 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
        <AlertTriangle className="h-3 w-3" />
        <span>Unsaved changes</span>
      </div>
    )}
  </div>
  <div className="flex space-x-3">
    <Button
      variant="outline"
      onClick={resetToDefaults}
      className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
    >
      <RotateCcw className="h-4 w-4 mr-2" />
      Reset to Defaults
    </Button>
    <Button
      onClick={handleSaveSettings}
      disabled={isLoading}
      className={hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-700' : ''}
    >
      <Save className="h-4 w-4 mr-2" />
      {isLoading ? 'Saving...' : 'Save Settings'}
      {hasUnsavedChanges && (
        <span className="ml-1 w-2 h-2 bg-white rounded-full animate-pulse"></span>
      )}
    </Button>
  </div>
</div>
    </div>
  )
}