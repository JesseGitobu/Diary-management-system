// src/components/support/SupportButton.tsx
'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SupportModal } from './SupportModal'

interface SupportButtonProps {
  farmId?: string | null
}

export function SupportButton({ farmId }: SupportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!farmId) return null

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="w-full justify-start text-gray-600 hover:text-dairy-primary hover:bg-dairy-primary/10"
      >
        <HelpCircle className="w-4 h-4 mr-2" />
        Support & Help
      </Button>

      <SupportModal isOpen={isOpen} onClose={() => setIsOpen(false)} farmId={farmId} />
    </>
  )
}