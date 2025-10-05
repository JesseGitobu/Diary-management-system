// src/components/health/RecordTypeSelectionModal.tsx

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { X, AlertTriangle } from 'lucide-react'

interface RecordTypeSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  animalInfo: {
    animalId: string
    animalName: string
    animalTagNumber: string
  }
  onRecordTypeSelected: (recordType: string, animalId: string) => void
}

export function RecordTypeSelectionModal({
  isOpen,
  onClose,
  animalInfo,
  onRecordTypeSelected
}: RecordTypeSelectionModalProps) {
  const [selectedType, setSelectedType] = useState<string>('')

  const recordTypes = [
    { value: 'vaccination', label: 'Vaccination', icon: '💉', color: 'bg-green-100 text-green-800 hover:bg-green-200' },
    { value: 'treatment', label: 'Treatment', icon: '💊', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
    { value: 'illness', label: 'Illness', icon: '🤒', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
    { value: 'reproductive', label: 'Reproductive Health', icon: '🤱', color: 'bg-pink-100 text-pink-800 hover:bg-pink-200' },
    { value: 'deworming', label: 'Deworming & Parasite Control', icon: '🪱', color: 'bg-orange-100 text-orange-800 hover:bg-orange-200' }
  ]

  const handleContinue = () => {
    if (selectedType) {
      onRecordTypeSelected(selectedType, animalInfo.animalId)
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            <span>Create Health Record</span>
          </h3>
         
        </div>

        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-900">
            <strong>{animalInfo.animalName}</strong> (#{animalInfo.animalTagNumber}) requires medical attention. 
            Please select the type of health record to create:
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {recordTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setSelectedType(type.value)}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                selectedType === type.value
                  ? 'border-farm-green bg-farm-green/10'
                  : 'border-gray-200 hover:border-gray-300'
              } ${type.color}`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{type.icon}</span>
                <span className="font-medium text-lg">{type.label}</span>
                {selectedType === type.value && (
                  <Badge className="ml-auto bg-farm-green text-white">Selected</Badge>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!selectedType}
            className="bg-farm-green hover:bg-farm-green/90"
          >
            Continue to Create Record
          </Button>
        </div>
      </div>
    </Modal>
  )
}