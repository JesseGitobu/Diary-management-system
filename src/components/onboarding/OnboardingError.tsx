'use client'

interface OnboardingErrorProps {
  message: string
  error?: string
}

export function OnboardingError({ message, error }: OnboardingErrorProps) {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-700 text-sm">
          ⚠️ {message}
        </p>
        {error && (
          <p className="text-red-600 text-xs mt-2">
            Error: {error}
          </p>
        )}
      </div>

      <div className="text-center mt-6">
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}