// src/components/health/HealthNotification.tsx

'use client'

import { AlertTriangle, X, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface PendingAttentionAnimal {
  animalId: string
  animalName: string
  animalTagNumber: string
  followUpId: string
  recordDate: string
}

interface HealthNotificationProps {
  pendingAnimals: PendingAttentionAnimal[]
  onSelectAnimal: (animal: PendingAttentionAnimal) => void
  onDismiss: (animalId: string) => void
}

export function HealthNotification({
  pendingAnimals,
  onSelectAnimal,
  onDismiss
}: HealthNotificationProps) {
  if (pendingAnimals.length === 0) return null

  return (
    <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4 rounded-lg shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-orange-900 mb-1">
              Animals Requiring Attention
            </h3>
            <p className="text-sm text-orange-800 mb-3">
              {pendingAnimals.length} animal{pendingAnimals.length !== 1 ? 's need' : ' needs'} specific health records created.
            </p>
            
            <div className="space-y-2">
              {pendingAnimals.map((animal) => (
                <div
                  key={animal.animalId}
                  className="bg-white rounded-lg p-3 border border-orange-200 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {animal.animalName}
                    </p>
                    <p className="text-xs text-gray-600">
                      Tag #{animal.animalTagNumber} • Follow-up: {new Date(animal.recordDate).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-3">
                    <Button
                      size="sm"
                      onClick={() => onSelectAnimal(animal)}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Create Record
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                    <button
                      onClick={() => onDismiss(animal.animalId)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}