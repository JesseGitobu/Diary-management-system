// src/components/onboarding/OnboardingHeader.tsx
'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function OnboardingHeader() {
  const { user } = useAuth()
  const router = useRouter()
  const [isSkipping, setIsSkipping] = useState(false)
  
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
        router.push('/dashboard')
        router.refresh() // Force a refresh to reload user status
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
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center">
            <h1 className="text-3xl logo">DairyTrack Pro</h1>
            <span className="ml-4 text-sm text-gray-500">Setup</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome, {user?.user_metadata?.full_name || user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={isSkipping}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4 mr-1" />
              {isSkipping ? 'Skipping...' : 'Skip Setup'}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}