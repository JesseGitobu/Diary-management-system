'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Hash, 
  RefreshCw, 
  Settings, 
  Eye, 
  AlertCircle,
  CheckCircle,
  Copy,
  Sparkles
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface CustomAttribute {
  name: string
  value: string
}

interface TagGenerationSectionProps {
  farmId: string
  formData: any
  onTagChange: (tagNumber: string, autoGenerate: boolean) => void
  customAttributes?: CustomAttribute[]
  animalSource?: 'newborn_calf' | 'purchased_animal'  // ✅ NEW: Animal source for source-specific formats
  autoGenerateTagNumbers?: boolean  // ✅ NEW: Auto-generate setting from tagging settings
  isEditMode?: boolean  // ✅ NEW: Whether we're editing an existing animal
  existingTag?: string  // ✅ NEW: The existing tag number from the animals table
}

interface TagPreviewData {
  previewTag: string
  settings: {
    method: string
    numberingSystem: string
    tagPrefix: string
    customFormat: string
  }
}

export function TagGenerationSection({
  farmId,
  formData,
  onTagChange,
  customAttributes = [],
  animalSource,  // ✅ NEW: Receive animal source
  autoGenerateTagNumbers = true,  // ✅ NEW: Receive auto-generate setting
  isEditMode = false,  // ✅ NEW: Receive edit mode flag
  existingTag  // ✅ NEW: Receive existing tag number
}: TagGenerationSectionProps) {
  const [autoGenerate, setAutoGenerate] = useState(autoGenerateTagNumbers)
  const [manualTag, setManualTag] = useState('')
  const [previewTag, setPreviewTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagSettings, setTagSettings] = useState<any>(null)
  const [lastFormData, setLastFormData] = useState<any>(null)

  // ✅ NEW: Initialize with existing tag when in edit mode
  useEffect(() => {
    if (isEditMode && existingTag) {
      // When editing, show the existing tag as manual entry
      setAutoGenerate(false)
      setManualTag(existingTag)
      setPreviewTag(existingTag)
      // Notify parent component with existing tag
      onTagChange(existingTag, false)
    } else if (!autoGenerateTagNumbers) {
      // If auto-generate is disabled in settings, force manual mode
      setAutoGenerate(false)
    } else {
      // If auto-generate is enabled and not editing, default to auto mode
      setAutoGenerate(true)
    }
  }, [autoGenerateTagNumbers, isEditMode, existingTag])

  // Generate initial preview on mount (skip if editing - use existing tag instead)
  useEffect(() => {
    if (farmId && !isEditMode) {
      generatePreview()
    }
  }, [farmId, isEditMode])

  // Re-generate preview when form data changes (with debouncing)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (autoGenerate && formData && JSON.stringify(formData) !== JSON.stringify(lastFormData)) {
        generatePreview()
        setLastFormData(formData)
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  }, [formData, autoGenerate])

  const generatePreview = async () => {
    if (!farmId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/animals/preview-tag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmId,
          animalData: {
            ...formData,
            animal_source: animalSource  // ✅ NEW: Include animal source
          },
          customAttributes: customAttributes || []
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate tag preview')
      }

      const data: TagPreviewData = await response.json()
      setPreviewTag(data.previewTag)
      setTagSettings(data.settings)

      // Notify parent component with the generated tag
      if (autoGenerate) {
        onTagChange(data.previewTag, true)
      }

    } catch (err) {
      console.error('Error generating tag preview:', err)
      setError('Failed to generate tag preview')
      
      // Fallback preview
      const fallbackTag = `COW-${String(Date.now()).slice(-3)}`
      setPreviewTag(fallbackTag)
      if (autoGenerate) {
        onTagChange(fallbackTag, true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAutoGenerateToggle = (enabled: boolean) => {
    setAutoGenerate(enabled)
    
    if (enabled) {
      // Switch to auto mode - use the current preview
      onTagChange(previewTag, true)
      setManualTag('')
    } else {
      // Switch to manual mode - clear auto tag
      onTagChange('', false)
    }
  }

  const handleManualTagChange = (value: string) => {
    setManualTag(value)
    onTagChange(value, false)
  }

  const copyTagToClipboard = async () => {
    const tagToCopy = autoGenerate ? previewTag : manualTag
    try {
      await navigator.clipboard.writeText(tagToCopy)
      toast.success('Tag number copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy tag number')
    }
  }

  const formatMethodDisplay = (method: string) => {
    switch (method) {
      case 'basic': return 'Basic Sequential'
      case 'structured': return 'Structured Format'
      case 'automated': return 'Automated System'
      default: return method
    }
  }

  const formatNumberingSystemDisplay = (system: string) => {
    switch (system) {
      case 'sequential': return 'Sequential Numbers'
      case 'custom': return 'Custom Format'
      case 'barcode': return 'Barcode System'
      default: return system
    }
  }

  return (
    <Card className="border-l-4 border-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Hash className="w-5 h-5 text-blue-600" />
            <span>Animal Tag {isEditMode ? '(Edit Existing)' : 'Generation'}</span>
            {isEditMode && (
              <Badge variant="outline" className="ml-2 text-xs bg-amber-50 text-amber-700 border-amber-200">
                Editing
              </Badge>
            )}
          </CardTitle>
          
          {tagSettings && (
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {formatMethodDisplay(tagSettings.method)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {formatNumberingSystemDisplay(tagSettings.numberingSystem)}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Edit Mode - Show existing tag info */}
        {isEditMode && existingTag && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Hash className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">
                  Current Tag Number
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  This animal was previously assigned the tag: <span className="font-mono font-bold">{existingTag}</span>
                </p>
                <p className="text-xs text-amber-700 mt-2">
                  You can modify this tag below if necessary, or keep the existing value.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Generation Method Toggle - Only show if auto-generate is enabled in settings and NOT editing */}
        {autoGenerateTagNumbers && !isEditMode ? (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Auto-generate tag number
                </p>
                <p className="text-xs text-gray-600">
                  Automatically generate based on farm settings
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => handleAutoGenerateToggle(!autoGenerate)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${autoGenerate ? 'bg-blue-600' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${autoGenerate ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        ) : (
          /* \u2705 NEW: Show manual entry message when auto-generate is disabled */
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Hash className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Manual Tag Entry
                </p>
                <p className="text-xs text-blue-700">
                  Your farm is configured for manual tag entry. Please enter a tag number below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Auto-generated Tag Preview */}
        {autoGenerate && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Generated Tag Preview</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={generatePreview}
                  disabled={loading}
                  className="h-8 px-2"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                {previewTag && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyTagToClipboard}
                    className="h-8 px-2"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                )}
              </div>
            </div>

            <div className="relative">
              <div className={`
                flex items-center space-x-3 p-3 border-2 rounded-lg transition-colors
                ${loading ? 'border-gray-200 bg-gray-50' : 'border-blue-200 bg-blue-50'}
              `}>
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-gray-600">Generating tag...</span>
                  </>
                ) : error ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600">{error}</span>
                  </>
                ) : previewTag ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <div className="flex-1">
                      <div className="text-lg font-mono font-bold text-blue-900">
                        {previewTag}
                      </div>
                      <div className="text-xs text-blue-600">
                        This will be your animal's unique identifier
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">No preview available</span>
                  </>
                )}
              </div>
            </div>

            {/* Tag Generation Context */}
            {customAttributes && customAttributes.length > 0 && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <strong>Context:</strong> {customAttributes.map(attr => `${attr.name}: ${attr.value}`).join(', ')}
              </div>
            )}

            {/* Settings Info */}
            {tagSettings && (
              <div className="text-xs text-gray-500 space-y-1">
                <div>Format: {tagSettings.customFormat || `${tagSettings.tagPrefix}-###`}</div>
                <div>System: {formatNumberingSystemDisplay(tagSettings.numberingSystem)}</div>
              </div>
            )}
          </div>
        )}

        {/* Manual Tag Input */}
        {!autoGenerate && (
          <div className="space-y-3">
            <Label htmlFor="manual_tag" className="text-sm font-medium">
              {isEditMode ? 'Edit Tag Number' : 'Enter Tag Number Manually'}
            </Label>
            <div className="relative">
              <Input
                id="manual_tag"
                value={manualTag}
                onChange={(e) => handleManualTagChange(e.target.value)}
                placeholder={isEditMode ? "Modify or keep the existing tag..." : "e.g., COW-001, CUSTOM-123"}
                className="pr-10"
              />
              {manualTag && (
                <button
                  type="button"
                  onClick={copyTagToClipboard}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                >
                  <Copy className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {isEditMode 
                ? 'Update the tag number if needed. Any changes will be saved when you submit the form.'
                : 'Enter a unique tag number for this animal. Make sure it follows your farm\'s tagging conventions.'
              }
            </p>
          </div>
        )}

        {/* Validation Messages */}
        {!autoGenerate && manualTag && (
          <div className="flex items-center space-x-2 text-xs">
            {manualTag.length >= 3 ? (
              <>
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-green-600">
                  {isEditMode ? 'Tag updated' : 'Tag format looks good'}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-yellow-500" />
                <span className="text-yellow-600">Tag should be at least 3 characters</span>
              </>
            )}
          </div>
        )}

        {/* Settings Link */}
        <div className="pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              // You can implement navigation to tagging settings here
              toast('Tag settings can be configured in Farm Settings', { icon: 'ℹ️' })
            }}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <Settings className="w-3 h-3" />
            <span>Configure tag generation settings</span>
          </button>
        </div>
      </CardContent>
    </Card>
  )
}