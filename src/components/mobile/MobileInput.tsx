// Mobile Input Component
// src/components/mobile/MobileInput.tsx

'use client'

import * as React from "react"
import { cn } from "@/lib/utils/cn"
import { LucideIcon } from "lucide-react"

export interface MobileInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  helperText?: string
  clearable?: boolean
  onClear?: () => void
}

const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  ({ 
    className, 
    type, 
    error, 
    label, 
    icon: Icon, 
    iconPosition = 'left',
    helperText,
    clearable = false,
    onClear,
    value,
    ...props 
  }, ref) => {
    const showClear = clearable && value && onClear

    return (
      <div className="w-full space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-900">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {Icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Icon className="w-5 h-5" />
            </div>
          )}
          
          <input
            type={type}
            className={cn(
              "flex h-12 w-full rounded-lg border border-input bg-background px-4 py-3 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
              Icon && iconPosition === 'left' && "pl-10",
              Icon && iconPosition === 'right' && "pr-10",
              showClear && "pr-10",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            ref={ref}
            value={value}
            {...props}
          />
          
          {Icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Icon className="w-5 h-5" />
            </div>
          )}
          
          {showClear && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {helperText && !error && (
          <p className="text-sm text-gray-600">{helperText}</p>
        )}
        
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }
)
MobileInput.displayName = "MobileInput"

export { MobileInput }