// src/components/health/AddProtocolModal.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { Plus, X, Calendar, Repeat, AlertCircle, Info } from 'lucide-react'
import { PROTOCOL_PRESETS, getProtocolPreset, getAllProtocolTypes } from '@/lib/health/protocol-presets'
import type { ProtocolFieldConfig } from '@/lib/health/protocol-presets'

// Base schema - will be extended with protocol-specific fields
const baseProtocolSchema = z.object({
  protocol_name: z.string().min(2, 'Protocol name must be at least 2 characters'),
  protocol_type: z.enum(['vaccination', 'treatment', 'checkup', 'breeding', 'nutrition', 'deworming_parasites', 'post_mortem'] as const),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  frequency_type: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one_time']),
  frequency_value: z.number().min(1).max(365),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().or(z.literal('')),
  target_animals: z.enum(['all', 'group', 'individual']),
  animal_groups: z.array(z.string()).optional(),
  individual_animals: z.array(z.string()).optional(),
  veterinarian: z.string().optional().or(z.literal('')),
  estimated_cost: z.number().min(0).optional(),
  notes: z.string().optional().or(z.literal('')),
  auto_create_records: z.boolean(),
}).catchall(z.any())

type ProtocolFormData = z.infer<typeof baseProtocolSchema>

interface AddProtocolModalProps {
  farmId: string
  animals: any[]
  isOpen: boolean
  onClose: () => void
  onProtocolCreated: (protocol: any) => void
}

export function AddProtocolModal({ 
  farmId, 
  animals, 
  isOpen, 
  onClose, 
  onProtocolCreated 
}: AddProtocolModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([])
  
  const form = useForm<ProtocolFormData>({
    resolver: zodResolver(baseProtocolSchema),
    defaultValues: {
      protocol_type: 'vaccination',
      frequency_type: 'monthly',
      frequency_value: 1,
      target_animals: 'all',
      auto_create_records: true,
      start_date: '',
      end_date: '',
      veterinarian: '',
      notes: '',
    },
  })
  
  const watchedTargetAnimals = form.watch('target_animals')
  const watchedProtocolType = form.watch('protocol_type')
  const preset = getProtocolPreset(watchedProtocolType)
  
  const handleSubmit = async (data: ProtocolFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/health/protocols', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          farm_id: farmId,
          individual_animals: watchedTargetAnimals === 'individual' ? selectedAnimals : [],
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create protocol')
      }
      
      console.log('Protocol created successfully:', result.protocol)
      onProtocolCreated(result.protocol)
      
      form.reset()
      setSelectedAnimals([])
      onClose()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      console.error('Error creating protocol:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const toggleAnimalSelection = (animalId: string) => {
    setSelectedAnimals(prev => 
      prev.includes(animalId) 
        ? prev.filter(id => id !== animalId)
        : [...prev, animalId]
    )
  }
  
  const renderFieldInput = (field: ProtocolFieldConfig) => {
    const error = form.formState.errors[field.key as keyof typeof form.formState.errors]
    
    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.key}>
            <Label htmlFor={field.key}>{field.label}{field.required && <span className="text-red-500">*</span>}</Label>
            <textarea
              id={field.key}
              {...form.register(field.key)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder={field.placeholder}
            />
            {error && <p className="text-sm text-red-600 mt-1">{String(error?.message)}</p>}
            {field.helperText && <p className="text-xs text-gray-500 mt-1">{field.helperText}</p>}
          </div>
        )
      
      case 'select':
        return (
          <div key={field.key}>
            <Label htmlFor={field.key}>{field.label}{field.required && <span className="text-red-500">*</span>}</Label>
            <select
              id={field.key}
              {...form.register(field.key)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
            >
              <option value="">Select {field.label.toLowerCase()}</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {error && <p className="text-sm text-red-600 mt-1">{String(error?.message)}</p>}
          </div>
        )
      
      case 'number':
        return (
          <div key={field.key}>
            <Label htmlFor={field.key}>{field.label}{field.required && <span className="text-red-500">*</span>}</Label>
            <Input
              id={field.key}
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              {...form.register(field.key, { valueAsNumber: true })}
              placeholder={field.placeholder}
              error={error?.message as string | undefined}
            />
            {field.helperText && <p className="text-xs text-gray-500 mt-1">{field.helperText}</p>}
          </div>
        )
      
      case 'date':
        return (
          <div key={field.key}>
            <Label htmlFor={field.key}>{field.label}{field.required && <span className="text-red-500">*</span>}</Label>
            <Input
              id={field.key}
              type="date"
              {...form.register(field.key)}
              error={error?.message as string | undefined}
            />
          </div>
        )
      
      case 'time':
        return (
          <div key={field.key}>
            <Label htmlFor={field.key}>{field.label}{field.required && <span className="text-red-500">*</span>}</Label>
            <Input
              id={field.key}
              type="time"
              {...form.register(field.key)}
              error={error?.message as string | undefined}
            />
          </div>
        )
      
      case 'checkbox':
        return (
          <div key={field.key} className="flex items-center">
            <input
              id={field.key}
              type="checkbox"
              {...form.register(field.key)}
              className="w-4 h-4 text-farm-green border-gray-300 rounded focus:ring-farm-green"
            />
            <label htmlFor={field.key} className="ml-2 text-sm text-gray-700">
              {field.label}
            </label>
          </div>
        )
      
      case 'multi-select':
        return (
          <div key={field.key}>
            <Label>{field.label}{field.required && <span className="text-red-500">*</span>}</Label>
            <div className="mt-2 space-y-2 border border-gray-200 rounded-md p-3 max-h-40 overflow-y-auto">
              {field.options?.map(option => (
                <label key={option.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={option.value}
                    {...form.register(field.key)}
                    className="text-farm-green focus:ring-farm-green"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )
      
      default:
        return (
          <div key={field.key}>
            <Label htmlFor={field.key}>{field.label}{field.required && <span className="text-red-500">*</span>}</Label>
            <Input
              id={field.key}
              {...form.register(field.key)}
              placeholder={field.placeholder}
              error={error?.message as string | undefined}
            />
            {field.helperText && <p className="text-xs text-gray-500 mt-1">{field.helperText}</p>}
          </div>
        )
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Repeat className="w-6 h-6 text-farm-green" />
            <span>Create Health Protocol</span>
          </h3>
          
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        
        {preset && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-start gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{preset.description}</p>
              {preset.auto_create_health_record && (
                <p className="text-xs mt-1">✓ Health records will be auto-created when events occur</p>
              )}
            </div>
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Protocol Type Selection */}
          <div>
            <Label htmlFor="protocol_type">Protocol Type <span className="text-red-500">*</span></Label>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {getAllProtocolTypes().map(type => {
                const typePreset = getProtocolPreset(type)
                const isSelected = watchedProtocolType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => form.setValue('protocol_type', type)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-farm-green bg-green-50'
                        : 'border-gray-200 hover:border-farm-green'
                    }`}
                  >
                    <div className="text-2xl mb-1">{typePreset?.icon}</div>
                    <div className="text-xs font-medium text-gray-900">{typePreset?.name}</div>
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Protocol Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="protocol_name">Protocol Name <span className="text-red-500">*</span></Label>
              <Input
                id="protocol_name"
                {...form.register('protocol_name')}
                error={form.formState.errors.protocol_name?.message}
                placeholder="e.g., Monthly Vaccination Schedule"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
            <textarea
              id="description"
              {...form.register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Describe the protocol, its purpose, and any special instructions..."
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>
          
          {/* Protocol-Specific Fields */}
          {preset && preset.fields.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">{preset.icon}</span>
                {preset.name} Specific Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {preset.fields.map(field => renderFieldInput(field))}
              </div>
            </div>
          )}
          
          {/* Schedule Configuration */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Schedule Configuration</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="frequency_type">Frequency Type <span className="text-red-500">*</span></Label>
                <select
                  id="frequency_type"
                  {...form.register('frequency_type')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                  <option value="one_time">One Time</option>
                </select>
              </div>
              
              {form.watch('frequency_type') !== 'one_time' && (
                <div>
                  <Label htmlFor="frequency_value">Frequency Value <span className="text-red-500">*</span></Label>
                  <Input
                    id="frequency_value"
                    type="number"
                    min="1"
                    max="365"
                    {...form.register('frequency_value', { valueAsNumber: true })}
                    error={form.formState.errors.frequency_value?.message}
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="start_date">Start Date <span className="text-red-500">*</span></Label>
                <Input
                  id="start_date"
                  type="date"
                  {...form.register('start_date')}
                  error={form.formState.errors.start_date?.message}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            
            <div className="mt-4">
              <Label htmlFor="end_date">End Date (Optional)</Label>
              <Input
                id="end_date"
                type="date"
                {...form.register('end_date')}
                min={form.watch('start_date')}
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave empty for ongoing protocol
              </p>
            </div>
          </div>
          
          {/* Target Animals Selection */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-4">Target Animals</h4>
            
            <div className="space-y-4">
              <div>
                <Label>Apply Protocol To:</Label>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="all"
                      {...form.register('target_animals')}
                      className="text-farm-green focus:ring-farm-green"
                    />
                    <span>All Animals ({animals.length} animals)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="individual"
                      {...form.register('target_animals')}
                      className="text-farm-green focus:ring-farm-green"
                    />
                    <span>Select Individual Animals</span>
                  </label>
                </div>
              </div>
              
              {watchedTargetAnimals === 'individual' && (
                <div>
                  <Label>Select Animals ({selectedAnimals.length} selected)</Label>
                  <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {animals.map(animal => (
                        <label
                          key={animal.id}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAnimals.includes(animal.id)}
                            onChange={() => toggleAnimalSelection(animal.id)}
                            className="text-farm-green focus:ring-farm-green"
                          />
                          <span className="text-sm">
                            {animal.name || `Animal ${animal.tag_number}`} (#{animal.tag_number})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preset?.require_veterinarian && (
              <div>
                <Label htmlFor="veterinarian">Veterinarian <span className="text-red-500">*</span></Label>
                <Input
                  id="veterinarian"
                  {...form.register('veterinarian')}
                  placeholder="Dr. Smith, Veterinary Clinic"
                  error={form.formState.errors.veterinarian?.message as string | undefined}
                />
              </div>
            )}
            
            {preset?.track_cost && (
              <div>
                <Label htmlFor="estimated_cost">Estimated Cost per Event</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('estimated_cost', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Additional notes or special instructions..."
            />
          </div>
          
          {/* Auto-create Records Option */}
          <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <input
              type="checkbox"
              id="auto_create_records"
              {...form.register('auto_create_records')}
              className="text-farm-green focus:ring-farm-green mt-1"
            />
            <div>
              <Label htmlFor="auto_create_records" className="cursor-pointer font-medium">
                Auto-create Health Records
              </Label>
              <p className="text-xs text-gray-600 mt-1">
                {preset?.auto_create_health_record 
                  ? `Health records (${preset.default_health_record_type}) will be automatically created when protocol events occur`
                  : 'No health records configured for this protocol type'}
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Creating Protocol...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Protocol
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
