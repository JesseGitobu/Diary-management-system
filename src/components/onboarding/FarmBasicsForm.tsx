'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const farmBasicsSchema = z.object({
  farm_name: z.string().min(2, 'Farm name must be at least 2 characters'),
  location: z.string().min(2, 'Location must be at least 2 characters'),
  farm_type: z.enum(['Dairy Cattle', 'Dairy Goat', 'Mixed Dairy']),
  herd_size: z.number().min(1, 'Herd size must be at least 1').max(10000, 'Herd size seems too large'),
})

type FarmBasicsFormData = z.infer<typeof farmBasicsSchema>

interface FarmBasicsFormProps {
  userId: string
  initialData?: any
}

const steps = ['Farm Basics', 'Herd Info', 'Tracking', 'Goals', 'Review']

export function FarmBasicsForm({ userId, initialData }: FarmBasicsFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  
  const form = useForm<FarmBasicsFormData>({
    resolver: zodResolver(farmBasicsSchema),
    defaultValues: {
      farm_name: initialData?.farm_name || '',
      location: initialData?.location || '',
      farm_type: initialData?.farms?.farm_type || 'dairy',
      herd_size: initialData?.herd_size || 1,
    },
  })
  
  // UPDATE the handleSubmit function:
const handleSubmit = async (data: FarmBasicsFormData) => {
  setLoading(true)
  setError(null)
  
  try {
    // 🎯 NEW: Call new API to create farm and update role
    const response = await fetch('/api/onboarding/setup-farm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        step: 'farm-basics',
        data,
      }),
    })
    
    if (!response.ok) {
      throw new Error('Failed to save farm basics')
    }
    
    // Continue to next step
    router.push('/onboarding/steps/herd-info')
  } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unknown error occurred')
      }
    } finally {
      setLoading(false)
    }
}
  
  const handleSaveAndExit = async () => {
    const data = form.getValues()
    await handleSubmit(data)
    router.push('/dashboard')
  }
  
  return (
    <div className="space-y-8">
      <OnboardingProgress currentStep={1} totalSteps={5} steps={steps} />
      
      <Card className="h-[60vh] flex flex-col">
        <CardHeader>
          <CardTitle>Farm Basics</CardTitle>
          <CardDescription>
            Tell us about your farm so we can customize your experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="farm_name">Farm Name</Label>
              <Input
                id="farm_name"
                {...form.register('farm_name')}
                error={form.formState.errors.farm_name?.message}
                placeholder="e.g., Sunny Acres Farm"
              />
            </div>
            
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                {...form.register('location')}
                error={form.formState.errors.location?.message}
                placeholder="e.g., California, USA"
              />
            </div>
            
            <div>
              <Label htmlFor="farm_type">Farm Type</Label>
              <select
                id="farm_type"
                {...form.register('farm_type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-dairy-primary focus:border-transparent"
              >
                <option value="Dairy Cattle">Dairy Cattle</option>
                <option value="Dairy Goat">Dairy Goat</option>
                <option value="Mixed Dairy">Mixed Dairy</option>
                
              </select>
              {form.formState.errors.farm_type && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.farm_type.message}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="herd_size">Current Herd Size</Label>
              <Input
                id="herd_size"
                type="number"
                {...form.register('herd_size', { valueAsNumber: true })}
                error={form.formState.errors.herd_size?.message}
                placeholder="e.g., 50"
              />
              <p className="text-sm text-gray-500 mt-1">
                Approximate number of animals you currently have
              </p>
            </div>
            
            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/onboarding')}
              >
                Back
              </Button>
              
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveAndExit}
                  disabled={loading}
                >
                  Save & Exit
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Continue'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}