'use client'

import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'

export function AddAnimalButton() {
  const handleClick = () => {
    // Check if window exists (to be safe during SSR)
    if (typeof window !== 'undefined') {
      // Dispatch the custom event that GlobalModalWrapper listens for
      // This will open the AddAnimalModal
      window.dispatchEvent(
        new CustomEvent('mobileNavModalAction', {
          detail: { action: 'showAddAnimalModal' }
        })
      )
    }
  }

  return (
    <Button 
      size="lg" 
      onClick={handleClick}
      className="bg-dairy-primary hover:bg-dairy-secondary h-14 px-8 text-lg rounded-lg shadow-md transition-all hover:shadow-lg text-white"
    >
      <Plus className="w-6 h-6 mr-2" />
      Add Your First Animal
    </Button>
  )
}