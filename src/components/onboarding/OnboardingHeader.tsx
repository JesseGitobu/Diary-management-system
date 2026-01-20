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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-3 sm:py-4">
          {/* Center Content */}
          <div className="flex flex-col items-center justify-center flex-1 gap-2 sm:gap-3">
            {/* Logo Section */}
            <div className="flex items-center gap-2 sm:gap-3 justify-center">
              <h1 className="text-xl sm:text-2xl md:text-3xl logo">
                DairyTrack Pro
              </h1>
              <span className="hidden sm:inline text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                Setup
              </span>
            </div>
            
            {/* Welcome Section */}
            <span className="text-xs sm:text-sm text-gray-600">
              Welcome, {(user?.user_metadata?.full_name || user?.email)?.split('@')[0]}
            </span>
          </div>
          
          {/* Skip Button on Right */}
          <Button
            onClick={handleSkip}
            disabled={isSkipping}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium flex-shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="hidden sm:inline">
              {isSkipping ? 'Skipping...' : 'Skip Setup'}
            </span>
            <span className="sm:hidden">
              {isSkipping ? '...' : 'Skip'}
            </span>
          </Button>
        </div>
      </div>
    </header>
  )
}