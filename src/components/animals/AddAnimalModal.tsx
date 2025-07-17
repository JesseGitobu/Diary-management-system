'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { NewbornCalfForm } from './NewbornCalfForm'
import { PurchasedAnimalForm } from './PurchasedAnimalForm'
import { Baby, ShoppingCart, ArrowLeft } from 'lucide-react'

import { Animal } from '@/types/database'

interface AddAnimalModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onAnimalAdded: (animal: Animal) => void
}

export function AddAnimalModal({ 
  farmId, 
  isOpen, 
  onClose, 
  onAnimalAdded 
}: AddAnimalModalProps) {
  const [animalSource, setAnimalSource] = useState<'newborn_calf' | 'purchased_animal' | null>(null)
  const [showSourceSelection, setShowSourceSelection] = useState(true)
  
  const handleSourceSelection = (source: 'newborn_calf' | 'purchased_animal') => {
    setAnimalSource(source)
    setShowSourceSelection(false)
  }
  
  const handleBackToSelection = () => {
    setAnimalSource(null)
    setShowSourceSelection(true)
  }
  
  const handleSuccess = (animal: Animal) => {
    onAnimalAdded(animal)
    // Reset modal state
    setAnimalSource(null)
    setShowSourceSelection(true)
  }
  
  const handleCancel = () => {
    if (!showSourceSelection && animalSource) {
      // If we're in a form, go back to source selection
      handleBackToSelection()
    } else {
      // If we're on source selection, close modal
      setAnimalSource(null)
      setShowSourceSelection(true)
      onClose()
    }
  }
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      className="max-w-5xl max-h-[90vh] overflow-y-auto"
    >
      <div className="p-6">
        {showSourceSelection ? (
          // Source Selection Screen
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Add New Animal</h2>
              <p className="text-gray-600">
                Select how this animal was acquired to provide the most relevant information
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* New Born Calf Option */}
              <button
                onClick={() => handleSourceSelection('newborn_calf')}
                className="group p-6 border-2 border-gray-200 rounded-xl hover:border-farm-green hover:bg-farm-green/5 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-farm-green focus:ring-offset-2"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-farm-green/20 transition-colors">
                    <Baby className="w-6 h-6 text-blue-600 group-hover:text-farm-green" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-farm-green">
                      New Born Calf
                    </h3>
                    <p className="text-sm text-gray-600">Born on this farm</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Information collected:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Basic details (tag, name, breed, birth date)</li>
                    <li>Parentage information (mother/father)</li>
                    <li>Birth weight and health status</li>
                    <li>Special notes about the birth</li>
                  </ul>
                </div>
                
                <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                  <strong>Best for:</strong> Calves born on your farm where you know the parentage 
                  and birth details
                </div>
              </button>
              
              {/* Purchased Animal Option */}
              <button
                onClick={() => handleSourceSelection('purchased_animal')}
                className="group p-6 border-2 border-gray-200 rounded-xl hover:border-farm-green hover:bg-farm-green/5 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-farm-green focus:ring-offset-2"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-farm-green/20 transition-colors">
                    <ShoppingCart className="w-6 h-6 text-green-600 group-hover:text-farm-green" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-farm-green">
                      Purchased Animal
                    </h3>
                    <p className="text-sm text-gray-600">Acquired from another source</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Information collected:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Basic details and purchase information</li>
                    <li>Health and production status</li>
                    <li>Seller information and purchase price</li>
                    <li>Status-specific details (breeding, production)</li>
                  </ul>
                </div>
                
                <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                  <strong>Best for:</strong> Animals bought from other farms, auctions, 
                  or other sources
                </div>
              </button>
            </div>
            
            <div className="text-center">
              <Button
                variant="outline"
                onClick={onClose}
                className="min-w-[120px]"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          // Form Screen
          <div className="space-y-4">
            {/* Header with Back Button */}
            <div className="flex items-center space-x-4 mb-6">
              <Button
                variant="ghost"
                onClick={handleBackToSelection}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
              
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-farm-green/20 rounded-lg flex items-center justify-center">
                  {animalSource === 'newborn_calf' ? (
                    <Baby className="w-4 h-4 text-farm-green" />
                  ) : (
                    <ShoppingCart className="w-4 h-4 text-farm-green" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {animalSource === 'newborn_calf' ? 'New Born Calf' : 'Purchased Animal'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {animalSource === 'newborn_calf' 
                      ? 'Register a calf born on your farm'
                      : 'Register an animal acquired from another source'
                    }
                  </p>
                </div>
              </div>
            </div>
            
            {/* Dynamic Form */}
            {animalSource === 'newborn_calf' ? (
              <NewbornCalfForm 
                farmId={farmId}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            ) : (
              <PurchasedAnimalForm 
                farmId={farmId}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}