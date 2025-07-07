'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function OnboardingHeader() {
  const { user } = useAuth()
  const router = useRouter()
  
  const handleSkip = () => {
    router.push('/dashboard')
  }
  
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-farm-green">FarmTrack Pro</h1>
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
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4 mr-1" />
              Skip Setup
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}