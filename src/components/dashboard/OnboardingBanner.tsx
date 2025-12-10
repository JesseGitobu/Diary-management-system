// src/components/dashboard/OnboardingBanner.tsx
'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { AlertCircle, ArrowRight, Settings, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface OnboardingBannerProps {
    userName: string
    farmId?: string
    completionPercentage: number
}

export function OnboardingBanner({ userName, farmId, completionPercentage }: OnboardingBannerProps) {
    const router = useRouter()
    const [isDismissed, setIsDismissed] = useState(false)
    const [isNavigating, setIsNavigating] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)

    // Check dismissal status on client side only
    useEffect(() => {
        const checkDismissal = () => {
            const dismissalData = localStorage.getItem('onboarding-banner-dismissed')
            if (!dismissalData) return false

            try {
                const { timestamp } = JSON.parse(dismissalData)
                const dismissedAt = new Date(timestamp)
                const now = new Date()
                const hoursSinceDismissal = (now.getTime() - dismissedAt.getTime()) / (1000 * 60 * 60)

                // Show banner again after 24 hours
                return hoursSinceDismissal < 24
            } catch {
                return false
            }
        }

        setIsDismissed(checkDismissal())
        setIsLoaded(true)
    }, [])

    const handleCompleteSetup = async (e: React.MouseEvent) => {
        e.preventDefault()
        if (isNavigating) return

        setIsNavigating(true)
        
        // 🎯 LOGIC CHANGE: 
        // If farmId exists, skip Step 1 (Basics) and go to Step 2 (Herd Info).
        // If no farmId, start at Step 1.
        const targetUrl = farmId 
            ? '/onboarding/steps/herd-info' 
            : '/onboarding/steps/farm-basics'

        console.log('🔄 Navigating to onboarding step:', targetUrl)
        
        router.push(targetUrl)
        
        // Fallback safety
        setTimeout(() => {
            window.location.href = targetUrl
        }, 500)
    }

    const handleQuickSetup = async (e: React.MouseEvent) => {
        e.preventDefault()
        if (isNavigating) return

        setIsNavigating(true)
        console.log('🔄 Navigating to settings...')
        
        try {
            // Only create a placeholder farm if one doesn't exist yet
            if (!farmId) {
                const response = await fetch('/api/onboarding/skip', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                })
                
                const data = await response.json()
                
                if (data.success && !data.farmId) {
                    window.location.href = `/dashboard/settings/farm-profile`
                    return
                } else if (data.success && data.alreadyActive) {
                    // Fallback to generic settings page if confused
                    window.location.href = `/dashboard/settings`
                    return
                }
            }
            
            // Should not be reached due to button hiding, but safe fallback:
            const path = farmId 
                ? `/dashboard/settings/farm-profile?farmId=${farmId}`
                : `/dashboard/settings/farm-profile`
            
            router.push(path)
        } catch (error) {
            console.error('❌ Error navigating to settings:', error)
            alert('Unable to access settings. Please try again.')
            setIsNavigating(false)
        }
    }

    const handleDismiss = () => {
        setIsDismissed(true)
        const dismissalData = {
            dismissed: true,
            timestamp: new Date().toISOString()
        }
        localStorage.setItem('onboarding-banner-dismissed', JSON.stringify(dismissalData))
    }

    if (!isLoaded || isDismissed) return null

    return (
        <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                {farmId 
                                    ? `Great start, ${userName}! Your farm profile is ready.` 
                                    : `Welcome, ${userName}! Let's complete your farm setup`}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">
                                {farmId 
                                    ? "Now let's set up your herd details to unlock full tracking features."
                                    : "Complete your farm profile to unlock all features and get personalized insights."}
                            </p>

                            {/* Progress Bar */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-gray-700">Setup Progress</span>
                                    <span className="text-xs font-medium text-blue-600">{completionPercentage}%</span>
                                </div>
                                <Progress value={completionPercentage} className="h-2" />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    onClick={handleCompleteSetup}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    disabled={isNavigating}
                                >
                                    {isNavigating ? 'Loading...' : (farmId ? 'Continue to Herd Info' : 'Complete Setup')}
                                    {!isNavigating && <ArrowRight className="w-4 h-4 ml-2" />}
                                </Button>

                                {/* 🎯 HIDE SETTINGS BUTTON if farmId exists */}
                                {!farmId && (
                                    <Button
                                        onClick={handleQuickSetup}
                                        size="sm"
                                        variant="outline"
                                        className="border-blue-300 text-blue-700 hover:bg-blue-100"
                                        disabled={isNavigating}
                                    >
                                        {!isNavigating && <Settings className="w-4 h-4 mr-2" />}
                                        {isNavigating ? 'Loading...' : 'Go to Farm Settings'}
                                    </Button>
                                )}

                                <Button
                                    onClick={handleDismiss}
                                    size="sm"
                                    variant="ghost"
                                    className="text-gray-500 hover:text-gray-700"
                                    disabled={isNavigating}
                                >
                                    Remind me later
                                </Button>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isNavigating}
                        aria-label="Dismiss banner"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </CardContent>
        </Card>
    )
}