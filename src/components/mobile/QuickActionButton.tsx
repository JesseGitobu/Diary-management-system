// src/components/mobile/QuickActionButton.tsx
'use client'

import { cn } from '@/lib/utils/cn'



interface QuickActionButtonProps {
  onClick: () => void
  icon: React.ReactNode
  label: string
  variant?: 'primary' | 'secondary'
  className?: string
}

export function QuickActionButton({ 
  onClick, 
  icon, 
  label, 
  variant = 'primary',
  className 
}: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center space-y-1 min-w-[100px] h-16 rounded-xl transition-all duration-200 active:scale-95",
        variant === 'primary' 
          ? "bg-dairy-primary text-white shadow-lg hover:bg-green-600" 
          : "bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50",
        className
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}