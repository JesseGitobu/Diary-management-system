'use client'

import { forwardRef, useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { Eye, EyeOff } from 'lucide-react'

interface TouchOptimizedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helpText?: string
  icon?: React.ReactNode
}

export const TouchOptimizedInput = forwardRef<HTMLInputElement, TouchOptimizedInputProps>(
  ({ className, type, label, error, helpText, icon, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    
    const inputType = type === 'password' && showPassword ? 'text' : type

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            type={inputType}
            className={cn(
              // Base styles
              'w-full rounded-lg border border-gray-300 bg-white text-gray-900',
              // Touch-optimized sizing
              'h-12 px-4 text-base',
              // Focus states
              'focus:ring-2 focus:ring-farm-green focus:border-farm-green',
              // Icon padding
              icon ? 'pl-12' : 'pl-4',
              // Password toggle padding
              type === 'password' ? 'pr-12' : 'pr-4',
              // Error states
              error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
              // Focus animation
              isFocused && 'ring-2 ring-farm-green border-farm-green',
              className
            )}
            ref={ref}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          {type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
        {helpText && !error && (
          <p className="mt-2 text-sm text-gray-500">{helpText}</p>
        )}
      </div>
    )
  }
)

TouchOptimizedInput.displayName = "TouchOptimizedInput"