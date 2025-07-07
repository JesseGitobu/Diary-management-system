// src/components/health/VaccinationModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { Syringe, Calendar } from 'lucide-react'
import { addDays, format } from 'date-fns'

const vaccinationSchema = z.object({
  animal_id: z.string().min(1, 'Please select an animal'),
  vaccine_name: z.string().min(2, 'Vaccine name is required'),
  administration_date: z.string().min(1, 'Administration date is required'),
  dose_amount: z.number().min(0.1, 'Dose amount must be greater than 0'),
  dose_unit: z.string().min(1, 'Dose unit is required'),
  batch_number: z.string().optional(),
  next_due_date: z.string().optional(),
  cost: z.number().optional(),
  administered_by: z.string().optional(),
  notes: z.string().optional(),
})

type VaccinationFormData = z.infer<typeof vaccinationSchema>

interface VaccinationModalProps {
  farmId: string
  animals: any[]
  isOpen: boolean
  onClose: () => void
  onVaccinationCompleted: (vaccination: any) => void
}

export function VaccinationModal({ 
  farmId, 
  animals, 
  isOpen, 
  onClose, 
  onVaccinationCompleted 
}: VaccinationModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [protocols, setProtocols] = useState<any[]>([])
  const [selectedProtocol, setSelectedProtocol] = useState<any>(null)
  
  const form = useForm<VaccinationFormData>({
    resolver: zodResolver(vaccinationSchema),
    defaultValues: {
      administration_date: new Date().toISOString().split('T')[0],
      dose_unit: 'ml',
      dose_amount: 1,
    },
  })
  
  useEffect(() => {
    if (isOpen) {
      loadVaccinationProtocols()
    }
  }, [isOpen, farmId])
  
  const loadVaccinationProtocols = async () => {
    try {
      const response = await fetch(`/api/health/protocols?farmId=${farmId}`)
      if (response.ok) {
        const data = await response.json()
        setProtocols(data.protocols || [])
      }
    } catch (error) {
      console.error('Error loading vaccination protocols:', error)
    }
  }
  
  const handleProtocolSelect = (protocolId: string) => {
    const protocol = protocols.find(p => p.id === protocolId)
    if (protocol) {
      setSelectedProtocol(protocol)
      form.setValue('vaccine_name', protocol.vaccine_name)
      
      // Calculate next due date based on protocol frequency
      const administrationDate = form.getValues('administration_date')
      if (administrationDate && protocol.frequency_days) {
        const nextDue = addDays(new Date(administrationDate), protocol.frequency_days)
        form.setValue('next_due_date', format(nextDue, 'yyyy-MM-dd'))
      }
    } else {
      setSelectedProtocol(null)
    }
  }
  
  const handleSubmit = async (data: VaccinationFormData) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/health/vaccinations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          farm_id: farmId,
          protocol_id: selectedProtocol?.id || null,
          cost: data.cost || null,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to record vaccination')
      }
      
      onVaccinationCompleted(result.vaccination)
      form.reset({
        administration_date: new Date().toISOString().split('T')[0],
        dose_unit: 'ml',
        dose_amount: 1,
        vaccine_name: '',
        batch_number: '',
        administered_by: '',
        notes: '',
      })
      setSelectedProtocol(null)
      onClose()
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  const commonVaccines = [
    'Bovishield Gold FP 5',
    'Cattlemaster 4',
    'Vision 7',
    'Triangle 4',
    'Pyramid 5',
    'Express FP',
    'Bovine Rhinotracheitis',
    'BVDV Type 1 & 2',
    'Parainfluenza 3',
    'BRSV',
    'Clostridial vaccines',
  ]
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
          <Syringe className="mr-2 h-5 w-5 text-farm-green" />
          Record Vaccination
        </h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Protocol Selection */}
          {protocols.length > 0 && (
            <div>
              <Label>Select Vaccination Protocol (Optional)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {protocols.map((protocol) => (
                  <div
                    key={protocol.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedProtocol?.id === protocol.id
                        ? 'border-farm-green bg-farm-green/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleProtocolSelect(protocol.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{protocol.name}</h4>
                        <p className="text-xs text-gray-600">{protocol.vaccine_name}</p>
                      </div>
                      {selectedProtocol?.id === protocol.id && (
                        <Badge variant="default" >Selected</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Selecting a protocol will auto-fill vaccine details and calculate next due date
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="animal_id">Animal *</Label>
              <select
                id="animal_id"
                {...form.register('animal_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="">Select an animal...</option>
                {animals.map((animal) => (
                  <option key={animal.id} value={animal.id}>
                    {animal.name || `Animal ${animal.tag_number}`} (Tag: {animal.tag_number})
                  </option>
                ))}
              </select>
              {form.formState.errors.animal_id && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.animal_id.message}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="administration_date">Administration Date *</Label>
              <Input
                id="administration_date"
                type="date"
                {...form.register('administration_date')}
                error={form.formState.errors.administration_date?.message}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="vaccine_name">Vaccine Name *</Label>
            <Input
              id="vaccine_name"
              {...form.register('vaccine_name')}
              error={form.formState.errors.vaccine_name?.message}
              placeholder="Enter vaccine name or select from common vaccines"
              list="common-vaccines"
            />
            <datalist id="common-vaccines">
              {commonVaccines.map((vaccine) => (
                <option key={vaccine} value={vaccine} />
              ))}
            </datalist>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dose_amount">Dose Amount *</Label>
              <Input
                id="dose_amount"
                type="number"
                step="0.1"
                min="0.1"
                {...form.register('dose_amount', { valueAsNumber: true })}
                error={form.formState.errors.dose_amount?.message}
                placeholder="1.0"
              />
            </div>
            
            <div>
              <Label htmlFor="dose_unit">Dose Unit</Label>
              <select
                id="dose_unit"
                {...form.register('dose_unit')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="ml">ml (milliliters)</option>
                <option value="cc">cc (cubic centimeters)</option>
                <option value="doses">doses</option>
                <option value="units">units</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="batch_number">Batch Number</Label>
              <Input
                id="batch_number"
                {...form.register('batch_number')}
                placeholder="e.g., BV2024-001"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cost">Cost (Optional)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                {...form.register('cost', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
            
            <div>
              <Label htmlFor="administered_by">Administered By</Label>
              <Input
                id="administered_by"
                {...form.register('administered_by')}
                placeholder="e.g., Dr. Smith, John Doe"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="next_due_date">Next Due Date (Optional)</Label>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Input
                id="next_due_date"
                type="date"
                {...form.register('next_due_date')}
                placeholder="Calculate based on protocol or manual entry"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {selectedProtocol 
                ? `Auto-calculated based on protocol frequency (${selectedProtocol.frequency_days} days)`
                : 'Will be calculated automatically if protocol is selected'
              }
            </p>
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              placeholder="Any additional notes about the vaccination, animal reaction, etc..."
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <LoadingSpinner size="sm" /> : 'Record Vaccination'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}