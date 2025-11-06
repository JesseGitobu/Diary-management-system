// src/components/onboarding/OnboardingWelcome.tsx
'use client'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { GiCow } from "react-icons/gi"
import { Users, BarChart3, Settings } from 'lucide-react'
import { useState } from 'react'

interface OnboardingWelcomeProps {
  userName: string
  onboardingData: any
}

export function OnboardingWelcome({ userName, onboardingData }: OnboardingWelcomeProps) {
  const router = useRouter()
  const [isSkipping, setIsSkipping] = useState(false)
  
  const handleStart = () => {
    router.push('/onboarding/steps/farm-basics')
  }
  
  const handleSkip = async () => {
    setIsSkipping(true)
    
    try {
      const response = await fetch('/api/onboarding/skip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log('✅ Onboarding skipped successfully')
        // Force a hard navigation to ensure fresh data
        window.location.href = '/dashboard'
      } else {
        console.error('❌ Failed to skip onboarding:', data.error)
        alert('Failed to skip onboarding. Please try again.')
      }
    } catch (error) {
      console.error('❌ Error skipping onboarding:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsSkipping(false)
    }
  }
  
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to DairyTrack Pro, {userName}!
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Let's get your dairy farm set up so you can start tracking your animals, 
          managing your team, and growing your operation.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Quick Setup (5 minutes)</CardTitle>
          <CardDescription>
            We'll help you set up the basics to get started quickly. 
            You can always add more details later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center space-x-3">
              <GiCow className="w-5 h-5 text-dairy-secondary" />
              <span className="text-sm">Farm information</span>
            </div>
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-dairy-secondary" />
              <span className="text-sm">Herd details</span>
            </div>
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-5 h-5 text-dairy-secondary" />
              <span className="text-sm">Tracking preferences</span>
            </div>
            <div className="flex items-center space-x-3">
              <Settings className="w-5 h-5 text-dairy-secondary" />
              <span className="text-sm">Basic settings</span>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <Button onClick={handleStart} className="flex-1">
              Start Setup
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSkip}
              disabled={isSkipping}
            >
              {isSkipping ? 'Skipping...' : 'Skip for Now'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Don't worry - you can change these settings anytime from your dashboard.
        </p>
      </div>
    </div>
  )
}