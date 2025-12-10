// src/components/onboarding/TrackingSetupForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { CheckCircle, Circle, Clock, Calendar, BarChart3, AlertTriangle, DollarSign, Users, Package, TrendingUp } from 'lucide-react'

interface TrackingSetupFormProps {
  userId: string
  initialData?: any
}

const steps = ['Farm Basics', 'Herd Info', 'Tracking Setup', 'Goals', 'Review']

// Mapping of feature IDs to their tracking configurations
const trackingConfigurations = {
  milk_tracking: {
    icon: BarChart3,
    title: 'Milk Production Tracking',
    description: 'Track daily milk production per animal or total farm production',
    defaultFrequency: 'daily',
    frequencyOptions: [
      { value: 'twice_daily', label: 'Twice Daily', description: 'Morning and evening milking' },
      { value: 'daily', label: 'Daily', description: 'Once per day total' },
      { value: 'weekly', label: 'Weekly', description: 'Weekly summaries' }
    ]
  },
  health_records: {
    icon: AlertTriangle,
    title: 'Health Records',
    description: 'Record health events, treatments, and veterinary visits',
    defaultFrequency: 'as_needed',
    frequencyOptions: [
      { value: 'as_needed', label: 'As Needed', description: 'When health events occur' },
      { value: 'weekly_checkup', label: 'Weekly Checkups', description: 'Regular health monitoring' },
      { value: 'monthly_review', label: 'Monthly Review', description: 'Monthly health summaries' }
    ]
  },
  breeding_records: {
    icon: Calendar,
    title: 'Breeding Management',
    description: 'Track breeding dates, pregnancies, and calving',
    defaultFrequency: 'seasonal',
    frequencyOptions: [
      { value: 'daily_monitoring', label: 'Daily Monitoring', description: 'Daily breeding cycle tracking' },
      { value: 'weekly_updates', label: 'Weekly Updates', description: 'Weekly breeding status' },
      { value: 'seasonal', label: 'Seasonal', description: 'Seasonal breeding programs' }
    ]
  },
  feed_tracking: {
    icon: Clock,
    title: 'Feed Management',
    description: 'Monitor feed quantities, costs, and nutrition',
    defaultFrequency: 'daily',
    frequencyOptions: [
      { value: 'daily', label: 'Daily', description: 'Daily feed consumption' },
      { value: 'weekly', label: 'Weekly', description: 'Weekly feed summaries' },
      { value: 'monthly', label: 'Monthly', description: 'Monthly feed analysis' }
    ]
  },
  finance_tracking: {
    icon: DollarSign,
    title: 'Finance Tracking',
    description: 'Track expenses, income, and profitability',
    defaultFrequency: 'weekly',
    frequencyOptions: [
      { value: 'daily', label: 'Daily', description: 'Daily expense and income tracking' },
      { value: 'weekly', label: 'Weekly', description: 'Weekly financial summaries' },
      { value: 'monthly', label: 'Monthly', description: 'Monthly financial reports' }
    ]
  },
  task_team_management: {
    icon: Users,
    title: 'Task & Team Management',
    description: 'Manage tasks and team members for your farm',
    defaultFrequency: 'daily',
    frequencyOptions: [
      { value: 'daily', label: 'Daily', description: 'Daily task assignments' },
      { value: 'weekly', label: 'Weekly', description: 'Weekly planning sessions' },
      { value: 'as_needed', label: 'As Needed', description: 'Flexible task management' }
    ]
  },
  inventory_equipment: {
    icon: Package,
    title: 'Inventory & Equipment Management',
    description: 'Manage inventory and equipment for your farm',
    defaultFrequency: 'weekly',
    frequencyOptions: [
      { value: 'daily', label: 'Daily', description: 'Daily inventory checks' },
      { value: 'weekly', label: 'Weekly', description: 'Weekly inventory updates' },
      { value: 'monthly', label: 'Monthly', description: 'Monthly equipment maintenance' }
    ]
  },
  performance_analysis_reporting_tools: {
    icon: TrendingUp,
    title: 'Performance Analysis & Reporting',
    description: 'Analyze herd performance metrics and generate reports',
    defaultFrequency: 'weekly',
    frequencyOptions: [
      { value: 'daily', label: 'Daily', description: 'Daily performance tracking' },
      { value: 'weekly', label: 'Weekly', description: 'Weekly performance reports' },
      { value: 'monthly', label: 'Monthly', description: 'Monthly analysis reports' }
    ]
  }
}

const scheduleOptions = [
  { id: 'morning', label: 'Morning (6-9 AM)', description: 'Best for milk recording and daily checks' },
  { id: 'evening', label: 'Evening (5-8 PM)', description: 'Good for daily summaries and planning' },
  { id: 'flexible', label: 'Flexible', description: 'Record when convenient throughout the day' }
]

export function TrackingSetupForm({ userId, initialData }: TrackingSetupFormProps) {
  const [loading, setLoading] = useState(false)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [featureFrequencies, setFeatureFrequencies] = useState<Record<string, string>>({})
  const [preferredSchedule, setPreferredSchedule] = useState('flexible')
  const [reminderTime, setReminderTime] = useState('08:00')
  const [enableReminders, setEnableReminders] = useState(true)
  const router = useRouter()
  
  // Load the selected features from Step 2
  useEffect(() => {
    if (initialData?.tracking_features) {
      setSelectedFeatures(initialData.tracking_features)
      
      // Set default frequencies for selected features
      const defaultFrequencies: Record<string, string> = {}
      initialData.tracking_features.forEach((featureId: string) => {
        if (trackingConfigurations[featureId as keyof typeof trackingConfigurations]) {
          defaultFrequencies[featureId] = trackingConfigurations[featureId as keyof typeof trackingConfigurations].defaultFrequency
        }
      })
      setFeatureFrequencies(defaultFrequencies)
    }
  }, [initialData])
  
  const updateFeatureFrequency = (featureId: string, frequency: string) => {
    setFeatureFrequencies(prev => ({
      ...prev,
      [featureId]: frequency
    }))
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
          step: 'tracking-setup',
          data: {
            tracking_preferences: selectedFeatures,
            feature_frequencies: featureFrequencies,
            preferred_schedule: preferredSchedule,
            reminder_time: reminderTime,
            enable_reminders: enableReminders,
          },
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save tracking setup')
      }
      
      router.push('/onboarding/steps/goals')
    } catch (err) {
      console.error('Error saving tracking setup:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // If no features selected in Step 2, show message to go back
  if (selectedFeatures.length === 0) {
    return (
      <div className="space-y-8">
        <OnboardingProgress currentStep={3} totalSteps={5} steps={steps} />
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No features selected
              </h3>
              <p className="text-gray-600 mb-6">
                Please go back to Step 2 and select the features you'd like to use.
              </p>
              <Button onClick={() => router.push('/onboarding/steps/herd-info')}>
                Go Back to Feature Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="space-y-8">
      <OnboardingProgress currentStep={3} totalSteps={5} steps={steps} />
      
      <Card className="h-[60vh] flex flex-col">
        <CardHeader>
          <CardTitle>Tracking Setup</CardTitle>
          <CardDescription>
            Configure how frequently you want to track data for your selected features. 
            You can always adjust these settings later.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-8">
          {/* Feature-specific frequency settings */}
          <div>
            <h3 className="font-medium text-gray-900 mb-4">
              Set tracking frequency for your selected features
            </h3>
            <div className="space-y-6">
              {selectedFeatures.map((featureId) => {
                const config = trackingConfigurations[featureId as keyof typeof trackingConfigurations]
                if (!config) return null
                
                const Icon = config.icon
                const currentFrequency = featureFrequencies[featureId] || config.defaultFrequency
                
                return (
                  <div key={featureId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3 mb-4">
                      <Icon className="w-5 h-5 text-farm-green mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{config.title}</h4>
                        <p className="text-sm text-gray-600">{config.description}</p>
                      </div>
                    </div>
                    
                    <div className="ml-8">
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Tracking Frequency
                      </Label>
                      <div className="space-y-2">
                        {config.frequencyOptions.map((option) => (
                          <div
                            key={option.value}
                            className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={() => updateFeatureFrequency(featureId, option.value)}
                          >
                            <div className="flex-shrink-0">
                              {currentFrequency === option.value ? (
                                <CheckCircle className="w-4 h-4 text-farm-green" />
                              ) : (
                                <Circle className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h5 className="text-sm font-medium text-gray-900">{option.label}</h5>
                              <p className="text-xs text-gray-600">{option.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Schedule Preferences */}
          <div>
            <h3 className="font-medium text-gray-900 mb-4">When do you prefer to record data?</h3>
            <div className="space-y-3">
              {scheduleOptions.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => setPreferredSchedule(schedule.id)}
                >
                  <div className="flex-shrink-0">
                    {preferredSchedule === schedule.id ? (
                      <CheckCircle className="w-5 h-5 text-farm-green" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{schedule.label}</h4>
                    <p className="text-sm text-gray-600">{schedule.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Reminder Settings */}
          <div>
            <h3 className="font-medium text-gray-900 mb-4">Reminder Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div
                  className="cursor-pointer"
                  onClick={() => setEnableReminders(!enableReminders)}
                >
                  {enableReminders ? (
                    <CheckCircle className="w-5 h-5 text-farm-green" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <Label className="font-medium text-gray-900">Enable daily reminders</Label>
                  <p className="text-sm text-gray-600">Get notified when it's time to record data</p>
                </div>
              </div>
              
              {enableReminders && (
                <div className="ml-8">
                  <Label htmlFor="reminder_time">Reminder time</Label>
                  <Input
                    id="reminder_time"
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-auto"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
        
        {/* Navigation buttons - Fixed at bottom */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/onboarding/steps/herd-info')}
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
      </Card>
    </div>
  )
}