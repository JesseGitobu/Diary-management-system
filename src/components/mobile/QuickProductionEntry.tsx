'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TouchOptimizedInput } from './TouchOptimizedInput'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Droplets, Clock, Thermometer, Beaker } from 'lucide-react'

const quickProductionSchema = z.object({
  animalId: z.string().min(1, 'Animal is required'),
  milkVolume: z.number().min(0.1, 'Volume must be greater than 0'),
  session: z.enum(['morning', 'afternoon', 'evening']),
  fatContent: z.number().min(0).max(10).optional(),
  proteinContent: z.number().min(0).max(10).optional(),
  temperature: z.number().min(0).max(50).optional(),
})

type QuickProductionFormData = z.infer<typeof quickProductionSchema>

interface QuickProductionEntryProps {
  farmId: string
  animals: Array<{ id: string; name?: string; tag_number: string }>
}

export function QuickProductionEntry({ farmId, animals }: QuickProductionEntryProps) {
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const form = useForm<QuickProductionFormData>({
    resolver: zodResolver(quickProductionSchema),
    defaultValues: {
      session: 'morning',
    },
  })

  const handleSubmit = async (data: QuickProductionFormData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          farmId,
          recordDate: new Date().toISOString().split('T')[0],
        }),
      })
      
      if (!response.ok) throw new Error('Failed to record production')
      
      form.reset()
      // Show success message
      alert('Production recorded successfully!')
    } catch (error) {
      alert('Error recording production. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mx-4">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Droplets className="h-5 w-5 text-blue-500" />
          <span>Quick Production Entry</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Animal Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Animal
            </label>
            <select
              {...form.register('animalId')}
              className="w-full h-12 px-4 text-base rounded-lg border border-gray-300 focus:ring-2 focus:ring-farm-green focus:border-farm-green"
            >
              <option value="">Select Animal</option>
              {animals.map((animal) => (
                <option key={animal.id} value={animal.id}>
                  {animal.name ? `${animal.name} (${animal.tag_number})` : animal.tag_number}
                </option>
              ))}
            </select>
          </div>

          {/* Session Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['morning', 'afternoon', 'evening'].map((session) => (
                <label
                  key={session}
                  className={`
                    flex items-center justify-center h-12 rounded-lg border-2 cursor-pointer
                    ${form.watch('session') === session 
                      ? 'border-farm-green bg-farm-green text-white' 
                      : 'border-gray-300 bg-white text-gray-700'
                    }
                  `}
                >
                  <input
                    type="radio"
                    value={session}
                    {...form.register('session')}
                    className="sr-only"
                  />
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="capitalize text-sm">{session}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Milk Volume */}
          <TouchOptimizedInput
            label="Milk Volume (Liters)"
            type="number"
            step="0.1"
            icon={<Droplets className="h-5 w-5" />}
            {...form.register('milkVolume', { valueAsNumber: true })}
            error={form.formState.errors.milkVolume?.message}
          />

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-farm-green hover:text-farm-green/80"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>

          {/* Advanced Fields */}
          {showAdvanced && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <TouchOptimizedInput
                  label="Fat Content (%)"
                  type="number"
                  step="0.1"
                  icon={<Beaker className="h-5 w-5" />}
                  {...form.register('fatContent', { valueAsNumber: true })}
                  error={form.formState.errors.fatContent?.message}
                />
                
                <TouchOptimizedInput
                  label="Protein Content (%)"
                  type="number"
                  step="0.1"
                  icon={<Beaker className="h-5 w-5" />}
                  {...form.register('proteinContent', { valueAsNumber: true })}
                  error={form.formState.errors.proteinContent?.message}
                />
              </div>
              
              <TouchOptimizedInput
                label="Temperature (°C)"
                type="number"
                step="0.1"
                icon={<Thermometer className="h-5 w-5" />}
                {...form.register('temperature', { valueAsNumber: true })}
                error={form.formState.errors.temperature?.message}
              />
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base"
          >
            {loading ? 'Recording...' : 'Record Production'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}