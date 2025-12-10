// src/components/onboarding/HerdInfoForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Circle } from 'lucide-react'

interface HerdInfoFormProps {
  userId: string
  initialData?: any
}

const steps = ['Farm Basics', 'Herd Info', 'Tracking', 'Goals', 'Review']

const herdFeatures = [
  { id: 'milk_tracking', label: 'Milk Production Tracking', description: 'Track daily milk production per animal' },
  { id: 'health_records', label: 'Health Records', description: 'Keep track of vaccinations, treatments, and vet visits' },
  { id: 'breeding_records', label: 'Breeding Management', description: 'Track breeding cycles, pregnancies, and births' },
  { id: 'feed_tracking', label: 'Feed Management', description: 'Monitor feed consumption and costs' },
  { id: 'finance_tracking', label: 'Finance Tracking', description: 'Track expenses, income, and profitability' },
  { id: 'task_team_management', label: 'Task & Team Management', description: 'Manage tasks and team members for your farm' },
  { id: 'inventory_equipment', label: 'Inventory & Equipment Management', description: 'Manage inventory and equipment for your farm' },
  { id: 'performance_analysis_reporting_tools', label: 'Performance Analysis & Reporting Tools', description: 'Analyze herd performance metrics and generate reports' },

]

export function HerdInfoForm({ userId, initialData }: HerdInfoFormProps) {
  const [loading, setLoading] = useState(false)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    'milk_tracking',
    'health_records'
  ])
  const router = useRouter()

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    )
  }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          step: 'herd-info',
          data: {
            tracking_features: selectedFeatures,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save herd info')
      }

      router.push('/onboarding/steps/tracking')
    } catch (err) {
      console.error('Error saving herd info:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <OnboardingProgress currentStep={2} totalSteps={5} steps={steps} />

      <Card className='h-[60vh] flex flex-col'>
        <CardHeader>
          <CardTitle>Herd Management Features</CardTitle>
          <CardDescription>
            Choose which features you'd like to use for managing your herd.
            You can always enable more features later.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-4 ">
            {herdFeatures.map((feature) => (
              <div
                key={feature.id}
                className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => toggleFeature(feature.id)}
              >
                <div className="flex-shrink-0 mt-1">
                  {selectedFeatures.includes(feature.id) ? (
                    <CheckCircle className="w-5 h-5 text-farm-green" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{feature.label}</h4>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div >
            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/onboarding/steps/farm-basics')}
              >
                Back
              </Button>
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                >
                  Save & Exit
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}