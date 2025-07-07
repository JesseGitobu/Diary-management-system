import { cn } from '@/lib/utils/cn'

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
  steps: string[]
}

export function OnboardingProgress({ currentStep, totalSteps, steps }: OnboardingProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Farm Setup Progress
        </h2>
        <span className="text-sm text-gray-500">
          {currentStep} of {totalSteps} steps
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div 
          className="bg-farm-green h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
      
      {/* Step Indicators */}
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          
          return (
            <div key={step} className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-2",
                  isCompleted && "bg-farm-green text-white",
                  isCurrent && "bg-farm-green text-white ring-2 ring-farm-green ring-offset-2",
                  !isCompleted && !isCurrent && "bg-gray-200 text-gray-600"
                )}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              <span className="text-xs text-gray-600 text-center max-w-20">
                {step}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}