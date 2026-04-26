'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

interface CollapsibleFormSectionProps {
  title: string
  icon?: React.ReactNode
  filledFieldCount?: number
  totalFieldCount?: number
  isRequired?: boolean
  defaultExpanded?: boolean
  children: React.ReactNode
  className?: string
}

export function CollapsibleFormSection({
  title,
  icon,
  filledFieldCount = 0,
  totalFieldCount = 0,
  isRequired = false,
  defaultExpanded = true,
  children,
  className = '',
}: CollapsibleFormSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Determine visual states
  const isFilled = filledFieldCount > 0
  const isComplete = totalFieldCount > 0 && filledFieldCount === totalFieldCount
  const hasWarning = isRequired && filledFieldCount === 0

  // Determine border color based on state
  const getBorderColor = () => {
    if (isComplete) return 'border-green-300'
    if (isFilled) return 'border-blue-300'
    if (hasWarning) return 'border-red-300'
    return 'border-gray-200'
  }

  // Determine header background
  const getHeaderBackground = () => {
    if (isComplete) return 'bg-green-50 hover:bg-green-100'
    if (isFilled) return 'bg-blue-50 hover:bg-blue-100'
    if (hasWarning) return 'bg-red-50 hover:bg-red-100'
    return 'bg-gray-50 hover:bg-gray-100'
  }

  // Determine badge color and icon
  const getBadgeStyles = () => {
    if (isComplete) return 'bg-green-100 text-green-800'
    if (isFilled) return 'bg-blue-100 text-blue-800'
    if (hasWarning) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-600'
  }

  const getStatusText = () => {
    if (isComplete) return '✓ Complete'
    if (totalFieldCount > 0) return `${filledFieldCount}/${totalFieldCount} fields`
    if (isFilled) return 'Filled'
    if (isRequired) return 'Required'
    return 'Optional'
  }

  return (
    <div className={`rounded-lg border-2 overflow-hidden transition-all ${getBorderColor()} ${className}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left font-medium transition-colors ${getHeaderBackground()}`}
      >
        <div className="flex items-center gap-3">
          {icon && <div className="text-gray-600">{icon}</div>}
          <span className="text-gray-900">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={`${getBadgeStyles()} px-2 py-1 text-xs font-semibold`}>
            {getStatusText()}
          </Badge>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-4 bg-white space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}
