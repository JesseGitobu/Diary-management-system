'use client'

import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'
import { WifiOff, Wifi } from 'lucide-react'

export function OnlineStatusIndicator() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-2 text-sm text-center z-50">
      <div className="flex items-center justify-center space-x-2">
        <WifiOff className="h-4 w-4" />
        <span>You're offline. Data will sync when connection is restored.</span>
      </div>
    </div>
  )
}