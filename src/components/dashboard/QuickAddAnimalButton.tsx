// src/components/dashboard/QuickAddAnimalButton.tsx
'use client'

import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface Props {
  isActive: boolean
  isHighlighted?: boolean
}

export function QuickAddAnimalButton({ isActive, isHighlighted }: Props) {
  const handleClick = () => {
    if (!isActive) return
    
    // Dispatch event to GlobalModalWrapper
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mobileNavModalAction', {
          detail: { action: 'showAddAnimalModal' }
        })
      )
    }
  }

  return (
    <Button 
      variant="outline" 
      className={cn(
        "h-auto py-4 flex-col space-y-2 w-full",
        isHighlighted && "ring-2 ring-green-500 ring-offset-2 border-green-500 bg-green-50/50 hover:bg-green-50",
        !isActive && "opacity-50 cursor-not-allowed"
      )}
      onClick={handleClick}
      disabled={!isActive}
    >
      <Plus className={cn("w-5 h-5", isHighlighted ? "text-green-700" : "text-green-600")} />
      <span className={cn("text-xs font-medium", isHighlighted ? "text-green-900" : "")}>
        Add Animal
      </span>
    </Button>
  )
}