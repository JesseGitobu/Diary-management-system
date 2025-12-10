'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { CheckCircle, Circle, TrendingUp, Target, Users, DollarSign } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// 1. Create a helper for optional number fields
// This accepts a string (from input) or number, handles empty strings, 
// and converts valid strings to numbers.
const optionalNumber = z.preprocess(
  (val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const parsed = Number(val);
    return isNaN(parsed) ? undefined : parsed;
  },
  z.number().optional()
);

const goalsSchema = z.object({
  primary_goal: z.string().min(1, 'Please select a primary goal'),
  // 2. Use the helper here
  milk_production_target: optionalNumber,
  herd_growth_target: optionalNumber,
  revenue_target: optionalNumber,
  timeline: z.enum(['3_months', '6_months', '1_year', '2_years']),
  specific_challenges: z.array(z.string()).optional(),
  success_metrics: z.array(z.string()).optional(),
})

type GoalsFormData = z.infer<typeof goalsSchema>

interface GoalsSetupFormProps {
  userId: string
  initialData?: any
}

const steps = ['Farm Basics', 'Herd Info', 'Tracking Setup', 'Goals', 'Review']

const primaryGoals = [
  {
    id: 'increase_production',
    icon: TrendingUp,
    title: 'Increase Milk Production',
    description: 'Optimize milk yield per animal and overall farm production'
  },
  {
    id: 'improve_efficiency',
    icon: Target,
    title: 'Improve Farm Efficiency',
    description: 'Reduce costs and streamline operations'
  },
  {
    id: 'expand_herd',
    icon: Users,
    title: 'Expand Herd Size',
    description: 'Grow the number of animals in your operation'
  },
  {
    id: 'increase_profitability',
    icon: DollarSign,
    title: 'Increase Profitability',
    description: 'Maximize revenue and reduce operating costs'
  }
]

const commonChallenges = [
  'Tracking individual animal performance',
  'Managing health records efficiently',
  'Optimizing feed costs',
  'Scheduling breeding programs',
  'Monitoring milk quality',
  'Managing labor costs',
  'Compliance with regulations',
  'Weather and seasonal impacts'
]

const successMetrics = [
  'Milk production per animal',
  'Overall herd health scores',
  'Feed conversion efficiency',
  'Reproduction rates',
  'Operating cost per liter',
  'Labor productivity',
  'Revenue per animal',
  'Profit margins'
]

export function GoalsSetupForm({ userId, initialData }: GoalsSetupFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedGoal, setSelectedGoal] = useState('')
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([])
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['Milk production per animal'])
  const router = useRouter()

  const form = useForm<GoalsFormData>({
    resolver: zodResolver(goalsSchema) as any,
    defaultValues: {
      primary_goal: '',
      // Default to undefined so inputs start empty
      milk_production_target: undefined,
      herd_growth_target: undefined,
      revenue_target: undefined,
      timeline: '1_year',
      specific_challenges: [],
      success_metrics: ['Milk production per animal'],
    },
  })

  // Sync selectedGoal with form state
  useEffect(() => {
    form.setValue('primary_goal', selectedGoal)
  }, [selectedGoal, form])

  // Sync selectedChallenges with form state
  useEffect(() => {
    form.setValue('specific_challenges', selectedChallenges)
  }, [selectedChallenges, form])

  // Sync selectedMetrics with form state
  useEffect(() => {
    form.setValue('success_metrics', selectedMetrics)
  }, [selectedMetrics, form])

  const toggleChallenge = (challenge: string) => {
    setSelectedChallenges(prev =>
      prev.includes(challenge)
        ? prev.filter(c => c !== challenge)
        : [...prev, challenge]
    )
  }

  const toggleMetric = (metric: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metric)
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    )
  }

  const handleGoalSelect = (goalId: string) => {
    setSelectedGoal(goalId)
    // Clear any previous validation errors
    if (form.formState.errors.primary_goal) {
      form.clearErrors('primary_goal')
    }
  }

  const handleSubmit = async (data: GoalsFormData) => {
    setLoading(true)
    setError(null)

    try {
      console.log('Submitting goals data:', data)

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          step: 'goals',
          data: {
            primary_goal: data.primary_goal,
            milk_production_target: data.milk_production_target,
            herd_growth_target: data.herd_growth_target,
            revenue_target: data.revenue_target,
            timeline: data.timeline,
            specific_challenges: data.specific_challenges,
            success_metrics: data.success_metrics,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save goals')
      }

      router.push('/onboarding/steps/summary')
    } catch (err) {
      console.error('Error saving goals:', err)
      if (err instanceof Error) {
        setError(err.message || 'Failed to save goals. Please try again.')
      } else {
        setError('Failed to save goals. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <OnboardingProgress currentStep={4} totalSteps={5} steps={steps} />

      <Card className="h-[60vh] flex flex-col">
        <CardHeader>
          <CardTitle>Farm Goals & Objectives</CardTitle>
          <CardDescription>
            Help us understand your goals so we can customize recommendations
            and track your progress effectively.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            {/* Primary Goal */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">What's your primary goal for the next year?</h3>
              {form.formState.errors.primary_goal && (
                <p className="text-sm text-red-600 mb-2">
                  {form.formState.errors.primary_goal.message}
                </p>
              )}
              <div className="space-y-3">
                {primaryGoals.map((goal) => {
                  const Icon = goal.icon
                  const isSelected = selectedGoal === goal.id

                  return (
                    <div
                      key={goal.id}
                      className={`flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-farm-green bg-farm-green/5' 
                          : 'border-gray-200'
                      }`}
                      onClick={() => handleGoalSelect(goal.id)}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {isSelected ? (
                          <CheckCircle className="w-5 h-5 text-farm-green" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <Icon className="w-5 h-5 text-farm-green mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{goal.title}</h4>
                        <p className="text-sm text-gray-600">{goal.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Specific Targets */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Set specific targets (optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="milk_production_target">Daily milk production target (liters)</Label>
                  <Input
                    id="milk_production_target"
                    type="number"
                    // 3. REMOVED { valueAsNumber: true }
                    // This allows empty strings to pass to Zod for processing
                    {...form.register('milk_production_target')} 
                    placeholder="e.g., 1000"
                    error={form.formState.errors.milk_production_target?.message}
                  />
                </div>

                <div>
                  <Label htmlFor="herd_growth_target">Herd size target (number of animals)</Label>
                  <Input
                    id="herd_growth_target"
                    type="number"
                    // 3. REMOVED { valueAsNumber: true }
                    {...form.register('herd_growth_target')}
                    placeholder="e.g., 100"
                    error={form.formState.errors.herd_growth_target?.message}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="revenue_target">Annual revenue target (optional)</Label>
                  <Input
                    id="revenue_target"
                    type="number"
                    // 3. REMOVED { valueAsNumber: true }
                    {...form.register('revenue_target')}
                    placeholder="e.g., 500000"
                    error={form.formState.errors.revenue_target?.message}
                  />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <Label htmlFor="timeline">Target timeline</Label>
              <select
                id="timeline"
                {...form.register('timeline')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                <option value="3_months">3 months</option>
                <option value="6_months">6 months</option>
                <option value="1_year">1 year</option>
                <option value="2_years">2 years</option>
              </select>
              {form.formState.errors.timeline && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.timeline.message}
                </p>
              )}
            </div>

            {/* Challenges */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">What challenges would you like help with?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {commonChallenges.map((challenge) => (
                  <div
                    key={challenge}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleChallenge(challenge)}
                  >
                    <div className="flex-shrink-0">
                      {selectedChallenges.includes(challenge) ? (
                        <CheckCircle className="w-4 h-4 text-farm-green" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <span className="text-sm text-gray-700">{challenge}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Success Metrics */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">How would you like to measure success?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {successMetrics.map((metric) => (
                  <div
                    key={metric}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleMetric(metric)}
                  >
                    <div className="flex-shrink-0">
                      {selectedMetrics.includes(metric) ? (
                        <CheckCircle className="w-4 h-4 text-farm-green" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <span className="text-sm text-gray-700">{metric}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/onboarding/steps/tracking')}
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
                  type="submit"
                  disabled={loading || !selectedGoal}
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Continue'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}