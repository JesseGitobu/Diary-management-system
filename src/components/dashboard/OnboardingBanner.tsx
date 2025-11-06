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
        console.log('🔄 Navigating to onboarding...', { farmId })
        
        try {
            // If user doesn't have a farm_id, create one first via skip endpoint
            // This ensures the farm exists before going to onboarding
            if (!farmId) {
                console.log('⚠️ No farm_id, creating farm first...')
                
                const response = await fetch('/api/onboarding/skip', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                })
                
                const data = await response.json()
                console.log('📥 Skip API response:', data)
                
                if (data.success && !data.farmId) {
                    console.log('✅ Farm created/retrieved:', !data.farmId)
                    // Refresh the page to get updated data, then navigate
                    window.location.href = '/onboarding'
                    return
                } else if (data.success && data.alreadyActive) {
                    console.log('⚠️ User already active but no farmId in response')
                    // Try navigating anyway, middleware will handle it
                    window.location.href = '/onboarding'
                    return
                } else {
                    console.error('❌ Failed to create farm:', data.error)
                    alert('Failed to set up your farm. Please try again or contact support.')
                    setIsNavigating(false)
                    return
                }
            }
            
            // User has farmId, navigate directly
            console.log('✅ Farm exists, navigating to onboarding')
            router.push('/onboarding')
            
            // Fallback to hard navigation if router doesn't work after 500ms
            setTimeout(() => {
                window.location.href = '/onboarding'
            }, 500)
        } catch (error) {
            console.error('❌ Error navigating to onboarding:', error)
            alert('An error occurred. Please try again.')
            setIsNavigating(false)
        }
    }

    const handleQuickSetup = async (e: React.MouseEvent) => {
        e.preventDefault()
        if (isNavigating) return

        setIsNavigating(true)
        console.log('🔄 Navigating to settings...', { farmId })
        
        try {
            // If no farm_id, create farm first
            if (!farmId) {
                console.log('⚠️ No farm_id, creating farm first...')
                
                const response = await fetch('/api/onboarding/skip', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                })
                
                const data = await response.json()
                console.log('📥 Skip API response:', data)
                
                if (data.success && !data.farmId) {
                    console.log('✅ Farm created/retrieved:', !data.farmId)
                    // Navigate to settings with the farm_id
                    window.location.href = `/dashboard/settings/farm-profile?farmId=${data.farmId}`
                    return
                } else if (data.success && data.alreadyActive) {
                    console.log('⚠️ User already active but no farmId in response')
                    alert('Unable to find your farm. Please try refreshing the page.')
                    setIsNavigating(false)
                    return
                } else {
                    console.error('❌ Failed to create farm:', data.error)
                    alert('Failed to access settings. Please try again or contact support.')
                    setIsNavigating(false)
                    return
                }
            }
            
            // Construct path with farmId
            const path = `/dashboard/settings/farm-profile?farmId=${farmId}`
            
            console.log('📍 Navigating to:', path)
            
            // Use router.push for client-side navigation
            router.push(path)
            
            // Fallback to hard navigation if router doesn't work after 500ms
            setTimeout(() => {
                window.location.href = path
            }, 500)
        } catch (error) {
            console.error('❌ Error navigating to settings:', error)
            if (farmId) {
                window.location.href = `/dashboard/settings/farm-profile?farmId=${farmId}`
            } else {
                alert('Unable to access settings. Please try again.')
                setIsNavigating(false)
            }
        }
    }

    const handleDismiss = () => {
        setIsDismissed(true)
        // Store dismissal in localStorage with timestamp
        const dismissalData = {
            dismissed: true,
            timestamp: new Date().toISOString()
        }
        localStorage.setItem('onboarding-banner-dismissed', JSON.stringify(dismissalData))
    }

    // Don't render until client-side hydration is complete
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
                                Welcome, {userName}! Let's complete your farm setup
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">
                                Complete your farm profile to unlock all features and get personalized insights for your dairy operation.
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
                                    {isNavigating ? 'Loading...' : 'Complete Setup'}
                                    {!isNavigating && <ArrowRight className="w-4 h-4 ml-2" />}
                                </Button>

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