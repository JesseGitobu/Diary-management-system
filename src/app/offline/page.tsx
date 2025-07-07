import { Wifi, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wifi className="h-8 w-8 text-gray-400" />
          </div>
          
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            You're Offline
          </h1>
          
          <p className="text-gray-600 mb-6">
            No internet connection detected. Some features may not be available, 
            but you can still view cached data and make entries that will sync when you're back online.
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="w-full"
            >
              Go Back
            </Button>
          </div>
          
          <div className="mt-6 text-sm text-gray-500">
            <p>Available offline features:</p>
            <ul className="mt-2 space-y-1">
              <li>• View cached animals</li>
              <li>• Quick data entry (syncs later)</li>
              <li>• View recent reports</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}