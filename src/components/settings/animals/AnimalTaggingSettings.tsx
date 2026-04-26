'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
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
  ArrowLeft,
  Baby,
  Truck
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
}: {
  farmId: any
  userRole: any
  currentHerdSize?: number
  initialSettings: any
  farmName: string
}) {
  type TaggingMethodKey = keyof typeof taggingMethods;
  const [selectedMethod, setSelectedMethod] = useState<TaggingMethodKey>('basic')
  const { isMobile } = useDeviceInfo()
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
      { name: 'Breed Group', values: ['Holstein-Friesian', 'Jersey', 'Ayrshire', 'Guernsey', 'Cross'] },
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
    },

    // Source-Specific Tag Formats
    useSourceSpecificFormats: true,
    sourceSpecificFormats: {
      newborn: {
        enabled: true,
        prefix: 'CALF',
        format: '{PREFIX}-{YEAR}-{COHORT:2}-{NUMBER:3}',
        startNumber: 1,
        description: 'Format for calves born on the farm'
      },
      purchased: {
        enabled: true,
        prefix: 'PUR',
        format: '{PREFIX}-{BREED:2}-{GENDER}-{NUMBER:3}',
        startNumber: 1,
        description: 'Format for purchased animals'
      }
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
      .replace(/\{MOTHER_TAG\}/g, `${prefix || 'COW'}001`)

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

  // Transform sourceSpecificFormats from API array to component object structure
  const transformSourceFormats = (data: any) => {
    // If already an object with newborn/purchased, return as-is
    if (data && typeof data === 'object' && !Array.isArray(data) && data.newborn) {
      return data
    }

    // If array, transform to object keyed by sourceKey
    if (Array.isArray(data)) {
      // If array is empty, return defaults instead of empty object
      if (data.length === 0) {
        return {
          newborn: {
            enabled: true,
            prefix: 'CALF',
            format: '{PREFIX}-{YEAR}-{COHORT:2}-{NUMBER:3}',
            startNumber: 1,
            description: 'Format for calves born on the farm'
          },
          purchased: {
            enabled: true,
            prefix: 'PUR',
            format: '{PREFIX}-{BREED:2}-{GENDER}-{NUMBER:3}',
            startNumber: 1,
            description: 'Format for purchased animals'
          }
        }
      }
      
      const result: any = {}
      data.forEach((format: any) => {
        result[format.sourceKey] = {
          enabled: format.enabled ?? true,
          prefix: format.prefix,
          format: format.formatPattern,
          startNumber: format.startNumber ?? 1,
          description: format.description
        }
      })
      return result
    }

    // Default structure
    return {
      newborn: {
        enabled: true,
        prefix: 'CALF',
        format: '{PREFIX}-{YEAR}-{COHORT:2}-{NUMBER:3}',
        startNumber: 1,
        description: 'Format for calves born on the farm'
      },
      purchased: {
        enabled: true,
        prefix: 'PUR',
        format: '{PREFIX}-{BREED:2}-{GENDER}-{NUMBER:3}',
        startNumber: 1,
        description: 'Format for purchased animals'
      }
    }
  }

  const [newAttribute, setNewAttribute] = useState({ name: '', values: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [confirmUnsavedDialog, setConfirmUnsavedDialog] = useState<{ show: boolean; callback?: () => void }>({ show: false })
  const [confirmResetDialog, setConfirmResetDialog] = useState<{ show: boolean; step?: 'first' | 'second' }>({ show: false, step: 'first' })

  // Fetch tagging settings from API when component mounts or farmId changes
  useEffect(() => {
    const fetchTaggingSettings = async () => {
      if (!farmId) return

      try {
        const response = await fetch(`/api/settings/animal-tagging?farmId=${farmId}`)
        
        if (!response.ok) {
          return
        }

        const data = await response.json()

        if (data.settings) {
          const transformedFormats = transformSourceFormats(data.settings.sourceSpecificFormats)
          setSettings({
            tagPrefix: data.settings.tagPrefix || 'COW',
            tagNumbering: data.settings.numberingSystem || 'sequential',
            enablePhotoTags: data.settings.enablePhotoTags ?? true,
            enableColorCoding: data.settings.enableColorCoding ?? true,
            customFormat: data.settings.customFormat || '{PREFIX}-{YEAR}-{NUMBER:3}',
            customStartNumber: data.settings.customStartNumber || 1,
            includeYearInTag: data.settings.includeYearInTag || false,
            barcodeType: data.settings.barcodeType || 'code128',
            barcodeLength: data.settings.barcodeLength || 8,
            includeCheckDigit: data.settings.includeCheckDigit || false,
            paddingZeros: data.settings.paddingZeros ?? true,
            customAttributes: data.settings.customAttributes || [
              { name: 'Breed Group', values: ['Holstein-Friesian', 'Jersey', 'Ayrshire', 'Guernsey', 'Cross'] },
              { name: 'Production Stage', values: ['Calf', 'Heifer', 'Lactating', 'Dry'] }
            ],
            colorCoding: data.settings.colorCoding && data.settings.colorCoding.length > 0
              ? data.settings.colorCoding
              : colorOptions,
            enableHierarchicalTags: data.settings.enableHierarchicalTags ?? false,
            enableBatchTagging: data.settings.enableBatchTagging ?? true,
            enableQRCodes: data.settings.enableQRCodes ?? false,
            enableSmartAlerts: data.settings.enableSmartAlerts ?? true,
            qrCodeSize: data.settings.qrCodeSize || 'medium',
            enableRFID: data.settings.enableRFID ?? false,
            enableNFC: data.settings.enableNFC ?? false,
            enableGPS: data.settings.enableGPS ?? false,
            enableBiometric: data.settings.enableBiometric ?? false,
            rfidFrequency: data.settings.rfidFrequency || '134.2khz',
            gpsUpdateInterval: data.settings.gpsUpdateInterval || 30,
            smartAlerts: data.settings.smartAlerts || {
              healthReminders: true,
              breedingReminders: true,
              vaccinationReminders: true,
              productionAlerts: true
            },
            useSourceSpecificFormats: data.settings.useSourceSpecificFormats ?? true,
            sourceSpecificFormats: transformedFormats
          })

          // Set the method based on fetched settings
          if (data.settings.method) {
            setSelectedMethod(data.settings.method)
          }

          setHasUnsavedChanges(false)
        }
      } catch (error) {
      }
    }

    fetchTaggingSettings()
  }, [farmId])

  useEffect(() => {
    if (initialSettings) {
      const transformedFormats = transformSourceFormats(initialSettings.sourceSpecificFormats)
      
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
          { name: 'Breed Group', values: ['Holstein-Friesian', 'Jersey', 'Ayrshire', 'Guernsey', 'Cross'] },
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
        },
        useSourceSpecificFormats: initialSettings.useSourceSpecificFormats ?? true,
        sourceSpecificFormats: transformedFormats
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

  const showUnsavedChangesDialog = (callback: () => void) => {
    setConfirmUnsavedDialog({ show: true, callback })
  }

  const handleUnsavedConfirm = () => {
    setConfirmUnsavedDialog({ show: false })
    confirmUnsavedDialog.callback?.()
  }

  const handleUnsavedCancel = () => {
    setConfirmUnsavedDialog({ show: false })
  }


  const handleSaveSettings = async () => {
    const enabledFeatures = [
      settings.enablePhotoTags && 'Photo Tags',
      settings.enableColorCoding && 'Color Coding',
      settings.enableQRCodes && 'QR Codes',
      settings.enableBatchTagging && 'Batch Tagging',
      settings.enableHierarchicalTags && 'Hierarchical Tags',
      settings.enableSmartAlerts && 'Smart Alerts',
      settings.enableRFID && 'RFID',
      settings.enableNFC && 'NFC',
      settings.enableGPS && 'GPS',
      settings.enableBiometric && 'Biometric ID'
    ].filter(Boolean)

    // Show confirmation toast with action
    toast.custom((t) => (
      <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200 max-w-md">
        <div className="space-y-3">
          <p className="font-semibold text-gray-900">Save Tagging Settings?</p>
          <div className="text-sm text-gray-700 space-y-2 bg-gray-50 p-3 rounded">
            <div><span className="font-medium">Method:</span> {taggingMethods[selectedMethod].title}</div>
            <div><span className="font-medium">Tag Format:</span> {settings.tagNumbering}</div>
            <div><span className="font-medium">Prefix:</span> {settings.tagPrefix}</div>
            <div><span className="font-medium">Features:</span> {enabledFeatures.length > 0 ? enabledFeatures.join(', ') : 'Basic features only'}</div>
          </div>
          <p className="text-xs text-gray-500">Changes apply to new animals only</p>
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-2 text-sm rounded bg-gray-100 text-gray-800 hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id)
                await performSave()
              }}
              className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-center',
    })

    const performSave = async () => {
      setIsLoading(true)
      try {

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
              smartAlerts: settings.smartAlerts,

              // Source-specific formats - convert object to array
              useSourceSpecificFormats: settings.useSourceSpecificFormats,
              sourceSpecificFormats: (() => {
                
                const converted = Object.entries(settings.sourceSpecificFormats || {}).map(
                  ([sourceKey, format]: [string, any]) => ({
                    sourceKey,
                    enabled: format.enabled ?? true,
                    prefix: format.prefix,
                    formatPattern: format.format,
                    startNumber: format.startNumber ?? 1,
                    description: format.description
                  })
                )
                
                return converted
              })()
            }
          })
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to save settings')
        }

        // Success feedback with detailed toast
        toast.custom((t) => (
          <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-md">
            <div className="space-y-2">
              <p className="font-semibold text-green-900">✅ Settings Saved Successfully!</p>
              <div className="text-sm text-green-800 space-y-1">
                <div><span className="font-medium">Method:</span> {taggingMethods[selectedMethod].title}</div>
                <div><span className="font-medium">Tag Format:</span> {settings.tagNumbering}</div>
                <div><span className="font-medium">Prefix:</span> {settings.tagPrefix}</div>
                <div><span className="font-medium">Features Enabled:</span> {enabledFeatures.length > 0 ? enabledFeatures.join(', ') : 'Basic features only'}</div>
              </div>
              <p className="text-xs text-green-700 mt-2">Changes apply to new animals only. Existing animals retain their current tags.</p>
            </div>
          </div>
        ), {
          duration: 5000,
          position: 'top-right',
        })

        setHasUnsavedChanges(false)

      } catch (error) {

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Enhanced error feedback
        toast.custom((t) => (
          <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-md">
            <div className="space-y-2">
              <p className="font-semibold text-red-900">❌ Failed to Save Settings</p>
              <p className="text-sm text-red-800">{errorMessage}</p>
              <p className="text-xs text-red-700 mt-2">Please check your connection and try again.</p>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="mt-3 w-full px-3 py-2 text-sm rounded bg-red-100 text-red-700 hover:bg-red-200 transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        ), {
          duration: 8000,
          position: 'top-right',
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const generateQRCodes = async () => {
    if (!settings.enableQRCodes) {
      toast.custom((t) => (
        <div className="bg-white rounded-lg shadow-lg p-4 border border-amber-200 max-w-md">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">QR Codes Not Enabled</h3>
                <p className="text-sm text-gray-600 mt-1">Please enable QR codes in the settings and save before generating codes.</p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 4000, position: 'top-right' })
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

      toast.custom((t) => (
        <div className="bg-white rounded-lg shadow-lg p-4 border border-green-200 max-w-md">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">QR Codes Generated</h3>
                <p className="text-sm text-gray-600 mt-1">Your animal QR code PDF has been downloaded successfully.</p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 4000, position: 'top-right' })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate QR codes'
      toast.custom((t) => (
        <div className="bg-white rounded-lg shadow-lg p-4 border border-red-200 max-w-md">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="h-5 w-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm">!</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Generation Failed</h3>
                <p className="text-sm text-gray-600 mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 5000, position: 'top-right' })
    }
  }

  const initiateResetToDefaults = () => {
    setConfirmResetDialog({ show: true, step: 'first' })
  }

  const handleResetFirstConfirm = () => {
    setConfirmResetDialog({ show: true, step: 'second' })
  }

  const handleResetSecondConfirm = () => {
    setConfirmResetDialog({ show: false })
    performResetToDefaults()
  }

  const handleResetCancel = () => {
    setConfirmResetDialog({ show: false })
  }

  const resetToDefaults = () => {
    initiateResetToDefaults()
  }

  const performResetToDefaults = () => {

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
          { name: 'Breed Group', values: ['Holstein-Friesian', 'Jersey', 'Ayrshire', 'Guernsey', 'Cross'] },
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
        },
        useSourceSpecificFormats: true,
        sourceSpecificFormats: {
          newborn: {
            enabled: true,
            prefix: 'CALF',
            format: '{PREFIX}-{YEAR}-{COHORT:2}-{NUMBER:3}',
            startNumber: 1,
            description: 'Format for calves born on the farm'
          },
          purchased: {
            enabled: true,
            prefix: 'PUR',
            format: '{PREFIX}-{BREED:2}-{GENDER}-{NUMBER:3}',
            startNumber: 1,
            description: 'Format for purchased animals'
          }
        }
      }

      setSettings(defaultSettings)
      setHasUnsavedChanges(true)

      // Success feedback

    } catch (error) {
      toast.custom((t) => (
        <div className="bg-white rounded-lg shadow-lg p-4 border border-red-200 max-w-md">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="h-5 w-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm">!</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Reset Failed</h3>
                <p className="text-sm text-gray-600 mt-1">Failed to reset settings. Please refresh the page and try again.</p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 5000, position: 'top-right' })
    }
  }

  const handleBack = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.preventDefault()

    if (hasUnsavedChanges) {
      showUnsavedChangesDialog(() => {
        window.history.back()
      })
    } else {
      window.history.back()
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
      <div className={`mb-6 ${isMobile ? 'space-y-3' : 'space-y-4'}`}>
        <div className="flex items-center space-x-2 mb-3">
          <Button
            variant="ghost"
            size={isMobile ? "sm" : "default"}
            onClick={handleBack}
            className="flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className={isMobile ? "text-sm" : ""}>Back</span>
          </Button>
        </div>

        <div className={`flex flex-col ${isMobile ? 'space-y-2' : 'items-center space-x-3'}`}>
          <div className={`w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
            <Tag className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-lg' : 'text-3xl'} leading-tight`}>
              Animal Tagging Configuration
            </h1>
            <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-base'} mt-1`}>
              Configure tagging methods for {currentHerdSize} animals
            </p>
          </div>
          <Badge variant="outline" className={`px-2 py-1 flex-shrink-0 ${isMobile ? 'text-xs' : ''}`}>
            <span className={isMobile ? "hidden sm:inline" : ""}>Method: </span>{taggingMethods[selectedMethod].title}
          </Badge>
        </div>
      </div>


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
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
            {Object.entries(taggingMethods).map(([key, method]) => (
              <button
                key={key}
                className={`border-2 rounded-lg p-3 text-left cursor-pointer transition-all ${selectedMethod === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                onClick={() => handleMethodChange(key as TaggingMethodKey)}
              >
                <div className={`flex ${isMobile ? 'flex-col items-start space-y-2' : 'items-center space-x-3'} mb-3`}>
                  <div className={`w-10 h-10 ${method.color} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                    {method.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-semibold text-gray-900 ${isMobile ? 'text-sm' : ''}`}>{method.title}</h3>
                    <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>{method.description}</p>
                  </div>
                </div>
                <div className={`space-y-1 ${isMobile ? 'ml-0' : ''}`}>
                  {method.features.map((feature, index) => (
                    <div key={index} className={`flex items-center text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0"></div>
                      <span className="truncate">{feature}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Basic Settings - Only show for basic method */}
      {selectedMethod === 'basic' && (
      <Card>
        <CardHeader>
          <CardTitle>Basic Identification Settings</CardTitle>
          <CardDescription>Configure fundamental animal identification parameters</CardDescription>
        </CardHeader>
        <CardContent className={`space-y-4 ${isMobile ? 'space-y-3' : 'space-y-6'}`}>
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 gap-4'}`}>
            <div>
              <Label htmlFor="tagPrefix" className={isMobile ? 'text-sm' : ''}>Tag Prefix</Label>
              <Input
                id="tagPrefix"
                value={settings.tagPrefix}
                onChange={(e) => setSettings(prev => ({ ...prev, tagPrefix: e.target.value }))}
                placeholder="COW"
                className={isMobile ? 'text-sm' : ''}
              />
              <p className={`text-gray-500 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>Prefix for auto-generated tags</p>
            </div>

            <div>
              <Label htmlFor="tagNumbering" className={isMobile ? 'text-sm' : ''}>Numbering System</Label>
              <Select
                value={settings.tagNumbering}
                onValueChange={(value) => setSettings(prev => ({ ...prev, tagNumbering: value }))}
              >
                <SelectTrigger className={isMobile ? 'text-sm' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">Sequential (COW-001...)</SelectItem>
                  <SelectItem value="custom">Custom Format</SelectItem>
                  <SelectItem value="barcode">Barcode Compatible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Source-Specific Tag Formats - Full Width */}
          {settings.tagNumbering === 'custom' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label className="text-base font-semibold">Source-Specific Tag Formats</Label>
                  <p className="text-xs text-gray-500">(Different formats for newborn vs. purchased animals)</p>
                </div>
                <Switch
                  checked={settings.useSourceSpecificFormats}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, useSourceSpecificFormats: checked }))}
                />
              </div>

              {settings.useSourceSpecificFormats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Newborn Calves Format */}
                  <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg space-y-3">
                    <div className="flex items-center space-x-2 mb-3">
                      <Baby className="h-5 w-5 text-green-600" />
                      <Label className="font-semibold text-green-900">Animals Born On Farm (Calves)</Label>
                    </div>

                    <div>
                      <Label className="text-sm">Prefix</Label>
                      <Input
                        value={settings.sourceSpecificFormats?.newborn?.prefix || 'CALF'}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          sourceSpecificFormats: {
                            ...prev.sourceSpecificFormats || {},
                            newborn: { ...(prev.sourceSpecificFormats?.newborn || {}), prefix: e.target.value }
                          }
                        }))}
                        placeholder="CALF"
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Format Pattern</Label>
                      <Input
                        value={settings.sourceSpecificFormats?.newborn?.format || ''}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          sourceSpecificFormats: {
                            ...prev.sourceSpecificFormats || {},
                            newborn: { ...(prev.sourceSpecificFormats?.newborn || {}), format: e.target.value }
                          }
                        }))}
                        placeholder="{PREFIX}-{YEAR}-{COHORT:2}-{NUMBER:3}"
                        className="text-sm"
                      />
                      <p className="text-xs text-gray-600 mt-1">Example: CALF-2026-03-001</p>
                      <p className="text-xs text-gray-500 mt-2">Available: {'{PREFIX}'}, {'{YEAR}'}, {'{MONTH}'}, {'{NUMBER:3}'}, {'{MOTHER_TAG}'}</p>
                    </div>

                    <div>
                      <Label className="text-sm">Starting Number</Label>
                      <Input
                        type="number"
                        value={settings.sourceSpecificFormats?.newborn?.startNumber || 1}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          sourceSpecificFormats: {
                            ...prev.sourceSpecificFormats || {},
                            newborn: { ...(prev.sourceSpecificFormats?.newborn || {}), startNumber: parseInt(e.target.value) }
                          }
                        }))}
                        min="1"
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Description</Label>
                      <Input
                        value={settings.sourceSpecificFormats?.newborn?.description || ''}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          sourceSpecificFormats: {
                            ...prev.sourceSpecificFormats || {},
                            newborn: { ...(prev.sourceSpecificFormats?.newborn || {}), description: e.target.value }
                          }
                        }))}
                        placeholder="e.g., Format for calves born on the farm"
                        className="text-sm"
                      />
                    </div>

                    {/* Quick Format Builder for Newborn */}
                    <div className="p-3 bg-white rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Quick Format Builder</Label>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSettings(prev => ({
                              ...prev,
                              sourceSpecificFormats: {
                                ...prev.sourceSpecificFormats || {},
                                newborn: { ...(prev.sourceSpecificFormats?.newborn || {}), format: '' }
                              }
                            }))}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Clear
                          </Button>
                        </div>
                      </div>

                      <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSettings(prev => {
                            const currentFormat = prev.sourceSpecificFormats?.newborn?.format || '';
                            return {
                              ...prev,
                              sourceSpecificFormats: {
                                ...prev.sourceSpecificFormats || {},
                                newborn: {
                                  ...(prev.sourceSpecificFormats?.newborn || {}),
                                  format: currentFormat ? currentFormat + '-{PREFIX}' : '{PREFIX}'
                                }
                              }
                            }
                          })}
                          className={isMobile ? 'text-xs' : 'text-sm'}
                        >
                          + Prefix
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSettings(prev => {
                            const currentFormat = prev.sourceSpecificFormats?.newborn?.format || '';
                            return {
                              ...prev,
                              sourceSpecificFormats: {
                                ...prev.sourceSpecificFormats || {},
                                newborn: {
                                  ...(prev.sourceSpecificFormats?.newborn || {}),
                                  format: currentFormat ? currentFormat + '-{YEAR}' : '{YEAR}'
                                }
                              }
                            }
                          })}
                          className={isMobile ? 'text-xs' : 'text-sm'}
                        >
                          + Year
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSettings(prev => {
                            const currentFormat = prev.sourceSpecificFormats?.newborn?.format || '';
                            return {
                              ...prev,
                              sourceSpecificFormats: {
                                ...prev.sourceSpecificFormats || {},
                                newborn: {
                                  ...(prev.sourceSpecificFormats?.newborn || {}),
                                  format: currentFormat ? currentFormat + '-{MONTH:2}' : '{MONTH:2}'
                                }
                              }
                            }
                          })}
                          className={isMobile ? 'text-xs' : 'text-sm'}
                        >
                          + Month
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSettings(prev => {
                            const currentFormat = prev.sourceSpecificFormats?.newborn?.format || '';
                            return {
                              ...prev,
                              sourceSpecificFormats: {
                                ...prev.sourceSpecificFormats || {},
                                newborn: {
                                  ...(prev.sourceSpecificFormats?.newborn || {}),
                                  format: currentFormat ? currentFormat + '-{NUMBER:3}' : '{NUMBER:3}'
                                }
                              }
                            }
                          })}
                          className={isMobile ? 'text-xs' : 'text-sm'}
                        >
                          + Number
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSettings(prev => {
                            const currentFormat = prev.sourceSpecificFormats?.newborn?.format || '';
                            return {
                              ...prev,
                              sourceSpecificFormats: {
                                ...prev.sourceSpecificFormats || {},
                                newborn: {
                                  ...(prev.sourceSpecificFormats?.newborn || {}),
                                  format: currentFormat ? currentFormat + '-{MOTHER_TAG}' : '{MOTHER_TAG}'
                                }
                              }
                            }
                          })}
                          className={isMobile ? 'text-xs' : 'text-sm'}
                        >
                          + Mother's Tag
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded border">
                      <p className="text-xs text-gray-600 mb-2">Preview:</p>
                      <p className="font-mono text-sm text-green-700 bg-green-50 p-2 rounded">
                        {generateTagPreview(
                          settings.sourceSpecificFormats?.newborn?.prefix || 'CALF',
                          settings.sourceSpecificFormats?.newborn?.format,
                          settings.sourceSpecificFormats?.newborn?.startNumber || 1,
                          settings.customAttributes
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Purchased Animals Format */}
                  <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg space-y-3">
                    <div className="flex items-center space-x-2 mb-3">
                      <Truck className="h-5 w-5 text-purple-600" />
                      <Label className="font-semibold text-purple-900">Purchased Animals</Label>
                    </div>

                    <div>
                      <Label className="text-sm">Prefix</Label>
                      <Input
                        value={settings.sourceSpecificFormats?.purchased?.prefix || 'PUR'}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          sourceSpecificFormats: {
                            ...prev.sourceSpecificFormats || {},
                            purchased: { ...(prev.sourceSpecificFormats?.purchased || {}), prefix: e.target.value }
                          }
                        }))}
                        placeholder="PUR"
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Format Pattern</Label>
                      <Input
                        value={settings.sourceSpecificFormats?.purchased?.format || ''}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          sourceSpecificFormats: {
                            ...prev.sourceSpecificFormats || {},
                            purchased: { ...(prev.sourceSpecificFormats?.purchased || {}), format: e.target.value }
                          }
                        }))}
                        placeholder="{PREFIX}-{BREED:2}-{GENDER}-{NUMBER:3}"
                        className="text-sm"
                      />
                      <p className="text-xs text-gray-600 mt-1">Example: PUR-HO-F-001</p>
                    </div>

                    <div>
                      <Label className="text-sm">Starting Number</Label>
                      <Input
                        type="number"
                        value={settings.sourceSpecificFormats?.purchased?.startNumber || 1}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          sourceSpecificFormats: {
                            ...prev.sourceSpecificFormats || {},
                            purchased: { ...(prev.sourceSpecificFormats?.purchased || {}), startNumber: parseInt(e.target.value) }
                          }
                        }))}
                        min="1"
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Description</Label>
                      <Input
                        value={settings.sourceSpecificFormats?.purchased?.description || ''}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          sourceSpecificFormats: {
                            ...prev.sourceSpecificFormats || {},
                            purchased: { ...(prev.sourceSpecificFormats?.purchased || {}), description: e.target.value }
                          }
                        }))}
                        placeholder="e.g., Format for purchased animals"
                        className="text-sm"
                      />
                    </div>

                    {/* Quick Format Builder for Purchased */}
                    <div className="p-3 bg-white rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Quick Format Builder</Label>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSettings(prev => ({
                              ...prev,
                              sourceSpecificFormats: {
                                ...prev.sourceSpecificFormats || {},
                                purchased: { ...(prev.sourceSpecificFormats?.purchased || {}), format: '' }
                              }
                            }))}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Clear
                          </Button>
                        </div>
                      </div>

                      <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSettings(prev => {
                            const currentFormat = prev.sourceSpecificFormats?.purchased?.format || '';
                            return {
                              ...prev,
                              sourceSpecificFormats: {
                                ...prev.sourceSpecificFormats || {},
                                purchased: {
                                  ...(prev.sourceSpecificFormats?.purchased || {}),
                                  format: currentFormat ? currentFormat + '-{PREFIX}' : '{PREFIX}'
                                }
                              }
                            }
                          })}
                          className={isMobile ? 'text-xs' : 'text-sm'}
                        >
                          + Prefix
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSettings(prev => {
                            const currentFormat = prev.sourceSpecificFormats?.purchased?.format || '';
                            return {
                              ...prev,
                              sourceSpecificFormats: {
                                ...prev.sourceSpecificFormats || {},
                                purchased: {
                                  ...(prev.sourceSpecificFormats?.purchased || {}),
                                  format: currentFormat ? currentFormat + '-{YEAR}' : '{YEAR}'
                                }
                              }
                            }
                          })}
                          className={isMobile ? 'text-xs' : 'text-sm'}
                        >
                          + Year
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSettings(prev => {
                            const currentFormat = prev.sourceSpecificFormats?.purchased?.format || '';
                            return {
                              ...prev,
                              sourceSpecificFormats: {
                                ...prev.sourceSpecificFormats || {},
                                purchased: {
                                  ...(prev.sourceSpecificFormats?.purchased || {}),
                                  format: currentFormat ? currentFormat + '-{MONTH:2}' : '{MONTH:2}'
                                }
                              }
                            }
                          })}
                          className={isMobile ? 'text-xs' : 'text-sm'}
                        >
                          + Month
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSettings(prev => {
                            const currentFormat = prev.sourceSpecificFormats?.purchased?.format || '';
                            return {
                              ...prev,
                              sourceSpecificFormats: {
                                ...prev.sourceSpecificFormats || {},
                                purchased: {
                                  ...(prev.sourceSpecificFormats?.purchased || {}),
                                  format: currentFormat ? currentFormat + '-{NUMBER:3}' : '{NUMBER:3}'
                                }
                              }
                            }
                          })}
                          className={isMobile ? 'text-xs' : 'text-sm'}
                        >
                          + Number
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded border">
                      <p className="text-xs text-gray-600 mb-2">Preview:</p>
                      <p className="font-mono text-sm text-purple-700 bg-purple-50 p-2 rounded">
                        {generateTagPreview(
                          settings.sourceSpecificFormats?.purchased?.prefix || 'PUR',
                          settings.sourceSpecificFormats?.purchased?.format,
                          settings.sourceSpecificFormats?.purchased?.startNumber || 1,
                          settings.customAttributes
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Format Configuration - Full Width */}
          {settings.tagNumbering === 'custom' && !settings.useSourceSpecificFormats && (
            <div className={`p-4 bg-gray-50 rounded-lg space-y-3 ${isMobile ? 'text-sm' : ''}`}>
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

                <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => appendToFormat('{PREFIX}')}
                    className={isMobile ? 'text-xs' : ''}
                  >
                    + Prefix
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => appendToFormat('{YEAR}')}
                    className={isMobile ? 'text-xs' : ''}
                  >
                    + Year
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => appendToFormat('{MONTH:2}')}
                    className={isMobile ? 'text-xs' : ''}
                  >
                    + Month
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => appendToFormat('{NUMBER:3}')}
                    className={isMobile ? 'text-xs' : ''}
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
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
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
      )}

      {/* Coming Soon - Structured Tagging */}
      {selectedMethod === 'structured' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Semi-Structured Tagging</CardTitle>
            <CardDescription className="text-blue-700">Balanced approach with some automation</CardDescription>
          </CardHeader>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center">
                <QrCode className="h-8 w-8 text-blue-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-blue-900">Coming Soon</h3>
                <p className="text-blue-700 max-w-md">
                  Advanced structured tagging features with hierarchical organization, batch operations, and QR code integration will be available shortly.
                </p>
              </div>
              <div className="mt-6 p-4 bg-blue-100 rounded-lg max-w-md">
                <p className="text-sm text-blue-800 font-medium mb-2">Expected Features:</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>✓ Hierarchical tag organization</li>
                  <li>✓ Batch tagging operations</li>
                  <li>✓ QR code generation</li>
                  <li>✓ Smart alert configuration</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coming Soon - Automated/Tech-Integrated */}
      {selectedMethod === 'automated' && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-purple-900">Automated/Tech-Integrated Tagging</CardTitle>
            <CardDescription className="text-purple-700">Advanced automation for large operations</CardDescription>
          </CardHeader>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center">
                <Wifi className="h-8 w-8 text-purple-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-purple-900">Coming Soon</h3>
                <p className="text-purple-700 max-w-md">
                  Enterprise-grade automated tagging with RFID, NFC, GPS, and biometric identification will be available shortly.
                </p>
              </div>
              <div className="mt-6 p-4 bg-purple-100 rounded-lg max-w-md">
                <p className="text-sm text-purple-800 font-medium mb-2">Expected Features:</p>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>✓ RFID integration</li>
                  <li>✓ NFC support</li>
                  <li>✓ GPS tracking</li>
                  <li>✓ Biometric identification</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Action Buttons */}
      <div className={`pt-6 border-t mb-8 ${isMobile ? 'space-y-3' : 'space-y-4'}`}>
        <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'items-center justify-between'}`}>
          <div className={`flex items-center space-x-2 ${isMobile ? 'text-xs flex-wrap gap-2' : ''}`}>
            <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Changes apply to new animals only
            </span>
            {hasUnsavedChanges && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex-shrink-0">
                <AlertTriangle className="h-3 w-3" />
                <span>Unsaved</span>
              </div>
            )}
          </div>
          <div className={`flex ${isMobile ? 'w-full flex-col-reverse space-y-reverse space-y-2' : 'space-x-3'}`}>
            <Button
              variant="outline"
              onClick={resetToDefaults}
              size={isMobile ? "sm" : "default"}
              className={`${isMobile ? 'w-full' : ''} hover:bg-red-50 hover:border-red-200 hover:text-red-700`}
            >
              <RotateCcw className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? '' : 'mr-2'}`} />
              <span className={isMobile ? "hidden" : ""}>Reset</span>
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={isLoading}
              size={isMobile ? "sm" : "default"}
              className={`${isMobile ? 'w-full' : ''} ${hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
            >
              <Save className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${isMobile ? '' : 'mr-2'}`} />
              <span>{isLoading ? (isMobile ? 'Saving...' : 'Saving...') : isMobile ? 'Save' : 'Save Settings'}</span>
              {hasUnsavedChanges && (
                <span className="ml-1 w-2 h-2 bg-white rounded-full animate-pulse"></span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Confirmation Dialog */}
      {confirmUnsavedDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Unsaved Changes</h2>
                  <p className="text-sm text-gray-600 mt-1">You have unsaved changes to your animal tagging settings. If you leave now, your changes will be lost.</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-900">Are you sure you want to leave without saving?</p>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={handleUnsavedCancel}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Keep Editing
              </button>
              <button
                onClick={handleUnsavedConfirm}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Leave Without Saving
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset to Defaults Confirmation Dialog - First Step */}
      {confirmResetDialog.show && confirmResetDialog.step === 'first' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Reset to Defaults?</h2>
                  <p className="text-sm text-gray-600 mt-1\">This will permanently reset ALL your animal tagging configuration.</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-red-900">The following will be reset:</p>
                <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                  <li>Tag prefix to "COW"</li>
                  <li>Numbering system to "Sequential"</li>
                  <li>Custom attributes to defaults</li>
                  <li>Advanced features disabled</li>
                  <li>Color coding to standard colors</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={handleResetCancel}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetFirstConfirm}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset to Defaults Confirmation Dialog - Second Step */}
      {confirmResetDialog.show && confirmResetDialog.step === 'second' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Final Confirmation</h2>
                  <p className="text-sm text-gray-600 mt-1">You are about to lose all your custom tagging settings. This action cannot be undone.</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-900">Click "Reset Everything" only if you are absolutely certain.</p>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={handleResetCancel}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetSecondConfirm}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}