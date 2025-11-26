'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  CheckCircle,
  MapPin,

  Factory,
  Clock,
  Target,
  Users,
  BarChart3,
  AlertTriangle,
  Calendar,
  TrendingUp,
  DollarSign
} from 'lucide-react'
import { IoCheckmark, IoPencil } from 'react-icons/io5'
import { GiCow } from 'react-icons/gi'

interface OnboardingSummaryProps {
  userId: string
  data: any
  onEditStep?: (step: number) => void
}

const steps = ['Farm Basics', 'Herd Info', 'Tracking', 'Goals', 'Review']

export function OnboardingSummary({ userId, data, onEditStep }: OnboardingSummaryProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleEditStep = (stepNumber: number) => {
    const stepRoutes = [
      '/onboarding/steps/farm-basics',    // Step 1
      '/onboarding/steps/herd-info',      // Step 2  
      '/onboarding/steps/tracking',       // Step 3
      '/onboarding/steps/goals',          // Step 4
      '/onboarding/steps/summary'         // Step 5
    ]

    if (onEditStep) {
      onEditStep(stepNumber)
    } else {
      router.push(stepRoutes[stepNumber - 1])
    }
  }

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

  // Helper function to get goal icon
  const getGoalIcon = (goalType: string) => {
    switch (goalType) {
      case 'increase_production': return TrendingUp
      case 'improve_efficiency': return Target
      case 'expand_herd': return Users
      case 'increase_profitability': return DollarSign
      default: return Target
    }
  }

  // Helper function to get goal title
  const getGoalTitle = (goalType: string) => {
    switch (goalType) {
      case 'increase_production': return 'Increase Milk Production'
      case 'improve_efficiency': return 'Improve Farm Efficiency'
      case 'expand_herd': return 'Expand Herd Size'
      case 'increase_profitability': return 'Increase Profitability'
      default: return 'Not specified'
    }
  }

  // Helper function to format timeline
  const formatTimeline = (timeline: string) => {
    switch (timeline) {
      case '3_months': return '3 months'
      case '6_months': return '6 months'
      case '1_year': return '1 year'
      case '2_years': return '2 years'
      default: return timeline
    }
  }

  // Helper function to get feature icon
  const getFeatureIcon = (featureId: string) => {
    switch (featureId) {
      case 'milk_tracking': return <BarChart3 className="w-5 h-5 text-farm-green" />
      case 'health_records': return <AlertTriangle className="w-5 h-5 text-farm-green" />
      case 'breeding_records': return <Calendar className="w-5 h-5 text-farm-green" />
      case 'feed_tracking': return <Clock className="w-5 h-5 text-farm-green" />
      case 'finance_tracking': return <DollarSign className="w-5 h-5 text-farm-green" />
      case 'task_team_management': return <Users className="w-5 h-5 text-farm-green" />
      case 'inventory_equipment': return <Factory className="w-5 h-5 text-farm-green" />
      case 'performance_analysis_reporting_tools': return <TrendingUp className="w-5 h-5 text-farm-green" />
      default: return <BarChart3 className="w-5 h-5 text-farm-green" />
    }
  }

  // Helper function to format feature names
  const formatFeatureName = (featureId: string) => {
    const names = {
      milk_tracking: 'Milk Production Tracking',
      health_records: 'Health Records',
      breeding_records: 'Breeding Management',
      feed_tracking: 'Feed Management',
      finance_tracking: 'Finance Tracking',
      task_team_management: 'Task & Team Management',
      inventory_equipment: 'Inventory & Equipment Management',
      performance_analysis_reporting_tools: 'Performance Analysis & Reporting'
    }
    return names[featureId as keyof typeof names] || featureId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Helper function to get feature descriptions
  const getFeatureDescription = (featureId: string) => {
    const descriptions = {
      milk_tracking: 'Track daily milk production per animal',
      health_records: 'Keep track of vaccinations and treatments',
      breeding_records: 'Track breeding cycles and pregnancies',
      feed_tracking: 'Monitor feed consumption and costs',
      finance_tracking: 'Track expenses, income, and profitability',
      task_team_management: 'Manage tasks and team members',
      inventory_equipment: 'Manage inventory and equipment',
      performance_analysis_reporting_tools: 'Analyze performance and generate reports'
    }
    return descriptions[featureId as keyof typeof descriptions] || 'Feature tracking'
  }

  // Helper function to format frequency display
  const formatFrequency = (frequency: string) => {
    const frequencyMap = {
      'twice_daily': 'Twice Daily',
      'daily': 'Daily',
      'weekly': 'Weekly',
      'monthly': 'Monthly',
      'as_needed': 'As Needed',
      'weekly_checkup': 'Weekly Checkups',
      'monthly_review': 'Monthly Review',
      'daily_monitoring': 'Daily Monitoring',
      'weekly_updates': 'Weekly Updates',
      'seasonal': 'Seasonal'
    }
    return frequencyMap[frequency as keyof typeof frequencyMap] || frequency.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="space-y-8">
      <OnboardingProgress currentStep={5} totalSteps={5} steps={steps} />

      <Card className="h-[60vh] flex flex-col">
        <CardHeader>
          <CardTitle className="text-center flex flex-col items-center space-y-4">
            <div className='bg-[#e6f7e9] text-[#389e0d] w-20 h-20 flex items-center justify-center text-[2.5em] rounded-[50%]'>
              <span role="img" aria-label="checkmark"><IoCheckmark /></span>
            </div>
            <span>Setup Complete!</span>
          </CardTitle>
          <CardDescription className="text-center">
            Here's a summary of your farm setup. You can always modify these settings later.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-6">

            {/* Step 1: Farm Basics */}
            <div className="bg-white border overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,0.05)] rounded-lg border-solid border-[#e9ecef]">
              <div className='bg-[#f8f9fa] flex items-center justify-between gap-2.5 px-5 py-[15px] border-b-[#e9ecef] border-b border-solid'>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-farm-green" />
                  <h3 className="font-medium text-gray-900">Step 1: Farm Information</h3>
                </div>
                <button
                  className='bg-[#6c757d] text-[white] rounded text-[0.85em] cursor-pointer flex items-center gap-[5px] transition-[background-color] duration-200 ease-in px-3 py-1.5 border-[none] hover:bg-[#495057]'
                  onClick={() => handleEditStep(1)}
                  type="button"
                >
                  <IoPencil /> Edit
                </button>
              </div>
              <div className="p-5">
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
                    <GiCow className="w-5 h-5 text-farm-green" />
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
            </div>

            {/* Step 2: Herd Management Features */}
            {data?.tracking_features && (
              <div className="bg-white border overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,0.05)] rounded-lg border-solid border-[#e9ecef]">
                <div className='bg-[#f8f9fa] flex items-center justify-between gap-2.5 px-5 py-[15px] border-b-[#e9ecef] border-b border-solid'>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-farm-green" />
                    <h3 className="font-medium text-gray-900">Step 2: Herd Management Features</h3>
                  </div>
                  <button
                    className='bg-[#6c757d] text-[white] rounded text-[0.85em] cursor-pointer flex items-center gap-[5px] transition-[background-color] duration-200 ease-in px-3 py-1.5 border-[none] hover:bg-[#495057]'
                    onClick={() => handleEditStep(2)}
                    type="button"
                  >
                    <IoPencil /> Edit
                  </button>
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(data.tracking_features) && data.tracking_features.map((feature: string) => (
                      <Badge key={feature} variant="secondary" className="bg-farm-green/10 text-farm-green">
                        {feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Tracking Setup */}
            {(data?.tracking_preferences || data?.preferred_schedule || data?.feature_frequencies) && (
              <div className="bg-white border overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,0.05)] rounded-lg border-solid border-[#e9ecef]">
                <div className='bg-[#f8f9fa] flex items-center justify-between gap-2.5 px-5 py-[15px] border-b-[#e9ecef] border-b border-solid'>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-farm-green" />
                    <h3 className="font-medium text-gray-900">Step 3: Tracking Setup</h3>
                  </div>
                  <button
                    className='bg-[#6c757d] text-[white] rounded text-[0.85em] cursor-pointer flex items-center gap-[5px] transition-[background-color] duration-200 ease-in px-3 py-1.5 border-[none] hover:bg-[#495057]'
                    onClick={() => handleEditStep(3)}
                    type="button"
                  >
                    <IoPencil /> Edit
                  </button>
                </div>
                <div className="p-5">
                  <div className="space-y-4">
                    {/* Schedule and Reminder Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data?.preferred_schedule && (
                        <div className="flex items-center space-x-3">
                          <Clock className="w-5 h-5 text-farm-green" />
                          <div>
                            <p className="text-sm text-gray-600">Preferred Schedule</p>
                            <p className="font-medium capitalize">{data.preferred_schedule.replace('_', ' ')}</p>
                          </div>
                        </div>
                      )}
                      {data?.reminder_time && data?.enable_reminders && (
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="w-5 h-5 text-farm-green" />
                          <div>
                            <p className="text-sm text-gray-600">Reminder Time</p>
                            <p className="font-medium">{data.reminder_time}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Feature Frequencies - NEW SECTION */}
                    {data?.feature_frequencies && Object.keys(data.feature_frequencies).length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Tracking Frequencies</h4>
                        <div className="space-y-3">
                          {Object.entries(data.feature_frequencies).map(([featureId, frequency]) => (
                            <div key={featureId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                {getFeatureIcon(featureId)}
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {formatFeatureName(featureId)}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {getFeatureDescription(featureId)}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className="border-farm-green text-farm-green">
                                {formatFrequency(frequency as string)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fallback: Show tracking preferences if no frequencies */}
                    {(!data?.feature_frequencies || Object.keys(data.feature_frequencies).length === 0) &&
                      data?.tracking_preferences && Array.isArray(data.tracking_preferences) && (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Selected Tracking Options:</p>
                          <div className="flex flex-wrap gap-2">
                            {data.tracking_preferences.map((pref: string) => (
                              <Badge key={pref} variant="outline" className="border-farm-green text-farm-green">
                                {pref.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Goals & Objectives */}
            {data?.primary_goal && (
              <div className="bg-white border overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,0.05)] rounded-lg border-solid border-[#e9ecef]">
                <div className='bg-[#f8f9fa] flex items-center justify-between gap-2.5 px-5 py-[15px] border-b-[#e9ecef] border-b border-solid'>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-farm-green" />
                    <h3 className="font-medium text-gray-900">Step 4: Goals & Objectives</h3>
                  </div>
                  <button
                    className='bg-[#6c757d] text-[white] rounded text-[0.85em] cursor-pointer flex items-center gap-[5px] transition-[background-color] duration-200 ease-in px-3 py-1.5 border-[none] hover:bg-[#495057]'
                    onClick={() => handleEditStep(4)}
                    type="button"
                  >
                    <IoPencil /> Edit
                  </button>
                </div>
                <div className="p-5">
                  <div className="space-y-4">
                    {/* Primary Goal */}
                    <div className="flex items-center space-x-3">
                      {(() => {
                        const GoalIcon = getGoalIcon(data.primary_goal)
                        return <GoalIcon className="w-5 h-5 text-farm-green" />
                      })()}
                      <div>
                        <p className="text-sm text-gray-600">Primary Goal</p>
                        <p className="font-medium">{getGoalTitle(data.primary_goal)}</p>
                      </div>
                    </div>

                    {/* Targets */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {data?.milk_production_target && (
                        <div className="flex items-center space-x-3">
                          <BarChart3 className="w-4 h-4 text-farm-green" />
                          <div>
                            <p className="text-xs text-gray-600">Milk Target</p>
                            <p className="text-sm font-medium">{data.milk_production_target}L/day</p>
                          </div>
                        </div>
                      )}
                      {data?.herd_growth_target && (
                        <div className="flex items-center space-x-3">
                          <GiCow className="w-4 h-4 text-farm-green" />
                          <div>
                            <p className="text-xs text-gray-600">Herd Target</p>
                            <p className="text-sm font-medium">{data.herd_growth_target} animals</p>
                          </div>
                        </div>
                      )}
                      {data?.revenue_target && (
                        <div className="flex items-center space-x-3">
                          <DollarSign className="w-4 h-4 text-farm-green" />
                          <div>
                            <p className="text-xs text-gray-600">Revenue Target</p>
                            <p className="text-sm font-medium">${data.revenue_target.toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Timeline */}
                    {data?.goal_timeline && (
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-farm-green" />
                        <div>
                          <p className="text-sm text-gray-600">Timeline</p>
                          <p className="font-medium">{formatTimeline(data.goal_timeline)}</p>
                        </div>
                      </div>
                    )}

                    {/* Success Metrics */}
                    {data?.success_metrics && Array.isArray(data.success_metrics) && data.success_metrics.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Success Metrics:</p>
                        <div className="flex flex-wrap gap-2">
                          {data.success_metrics.slice(0, 3).map((metric: string) => (
                            <Badge key={metric} variant="secondary" className="bg-blue-50 text-blue-700">
                              {metric}
                            </Badge>
                          ))}
                          {data.success_metrics.length > 3 && (
                            <Badge variant="secondary" className="bg-gray-50 text-gray-600">
                              +{data.success_metrics.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span>What's Next?</span>
              </h3>
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
                onClick={() => router.push('/onboarding/steps/goals')}
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