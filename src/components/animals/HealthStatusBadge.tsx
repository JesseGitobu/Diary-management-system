// Enhanced health status badge component
// src/components/animals/HealthStatusBadge.tsx

import React from 'react'
import { Badge } from '@/components/ui/Badge'
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Heart,
  Zap,
  Clock
} from 'lucide-react'

interface HealthStatusBadgeProps {
  healthStatus?: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  showPulse?: boolean
  className?: string
}

export function HealthStatusBadge({ 
  healthStatus, 
  size = 'md', 
  showIcon = true, 
  showPulse = true,
  className 
}: HealthStatusBadgeProps) {
  if (!healthStatus) {
    return (
      <Badge 
        className={`bg-gray-100 text-gray-600 ${className}`}
        variant="outline"
      >
        {showIcon && <Activity className={getSizeClasses(size).icon} />}
        Unknown
      </Badge>
    )
  }

  const statusConfig = getStatusConfig(healthStatus)
  
  return (
    <Badge 
      className={`
        ${statusConfig.color} 
        ${showPulse && statusConfig.pulse ? 'animate-pulse' : ''} 
        ${getSizeClasses(size).badge}
        ${className}
      `}
      variant={statusConfig.variant}
    >
      {showIcon && (
        <statusConfig.icon className={`${getSizeClasses(size).icon} mr-1`} />
      )}
      {statusConfig.label}
    </Badge>
  )
}

function getStatusConfig(status: string) {
  switch (status.toLowerCase()) {
    case 'healthy':
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: Shield,
        label: 'Healthy',
        pulse: false,
        variant: 'default' as const
      }
    case 'sick':
      return {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: AlertTriangle,
        label: 'Sick',
        pulse: true,
        variant: 'destructive' as const
      }
    case 'requires_attention':
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Activity,
        label: 'Needs Attention',
        pulse: false,
        variant: 'outline' as const
      }
    case 'quarantined':
      return {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: Zap,
        label: 'Quarantined',
        pulse: true,
        variant: 'outline' as const
      }
    case 'recovering':
      return {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Heart,
        label: 'Recovering',
        pulse: false,
        variant: 'outline' as const
      }
    case 'under_treatment':
      return {
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: Clock,
        label: 'Under Treatment',
        pulse: false,
        variant: 'outline' as const
      }
    default:
      return {
        color: 'bg-gray-100 text-gray-600 border-gray-200',
        icon: Activity,
        label: status.replace('_', ' ').toUpperCase(),
        pulse: false,
        variant: 'outline' as const
      }
  }
}

function getSizeClasses(size: 'sm' | 'md' | 'lg') {
  switch (size) {
    case 'sm':
      return {
        badge: 'text-xs px-2 py-0.5',
        icon: 'w-3 h-3'
      }
    case 'lg':
      return {
        badge: 'text-sm px-3 py-1',
        icon: 'w-4 h-4'
      }
    default:
      return {
        badge: 'text-xs px-2 py-1',
        icon: 'w-3 h-3'
      }
  }
}