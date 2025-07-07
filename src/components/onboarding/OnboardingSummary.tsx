'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { Button } from '@/components/ui/Button'
import { CheckCircle, MapPin, Dog, Factory } from 'lucide-react'

interface OnboardingSummaryProps {
  userId: string
  data: any
}

const steps = ['Farm Basics', 'Herd Info', 'Tracking', 'Goals', 'Review']

export function OnboardingSummary({ userId, data }: OnboardingSummaryProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  const handleComplete = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to complete onboarding')
      }
      
      router.push('/dashboard?onboarding=complete')
    } catch (err) {
      console.error('Error completing onboarding:', err)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-8">
      <OnboardingProgress currentStep={5} totalSteps={5} steps={steps} />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="w-6 h-6 text-farm-green" />
            <span>Setup Complete!</span>
          </CardTitle>
          <CardDescription>
            Here's a summary of your farm setup. You can always modify these settings later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Farm Details */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="font-medium text-gray-900 mb-4">Farm Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Factory className="w-5 h-5 text-farm-green" />
                  <div>
                    <p className="text-sm text-gray-600">Farm Name</p>
                    <p className="font-medium">{data?.farm_name || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-farm-green" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium">{data?.location || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Dog className="w-5 h-5 text-farm-green" />
                  <div>
                    <p className="text-sm text-gray-600">Herd Size</p>
                    <p className="font-medium">{data?.herd_size || 0} animals</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Factory className="w-5 h-5 text-farm-green" />
                  <div>
                    <p className="text-sm text-gray-600">Farm Type</p>
                    <p className="font-medium capitalize">{data?.farms?.farm_type || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Next Steps */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">What's Next?</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-farm-green text-white rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Add Your Animals</p>
                    <p className="text-sm text-gray-600">Start by adding your animals to the system</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-farm-green text-white rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Invite Your Team</p>
                    <p className="text-sm text-gray-600">Add team members to collaborate on farm management</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-farm-green text-white rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Start Tracking</p>
                    <p className="text-sm text-gray-600">Begin recording milk production and health data</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/onboarding/steps/herd-info')}
              >
                Back
              </Button>
              
              <Button
                onClick={handleComplete}
                disabled={loading}
                size="lg"
              >
                {loading ? 'Completing...' : 'Complete Setup'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}