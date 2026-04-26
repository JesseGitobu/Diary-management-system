// src/components/animals/AddAnimalModal.tsx
import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { NewbornCalfForm } from './NewbornCalfForm'
import { PurchasedAnimalForm } from './PurchasedAnimalForm'
import { ImportAnimalsModal } from './ImportAnimalsModal'
import CompleteHealthRecordModal from '@/components/health/CompleteHealthRecordModal'
import { WeightUpdateModal } from '@/components/animals/WeightUpdateModal'
import { Baby, ShoppingCart, Upload, ArrowLeft, AlertTriangle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { TagGenerationSection } from './TagGenerationSection'
import { Animal } from '@/types/database'

interface AddAnimalModalProps {
  farmId: string
  isOpen: boolean
  onClose: () => void
  onAnimalAdded: (animal: Animal) => void
  onHealthRecordCreated?: (record: any) => void
  onRefreshWeightsList?: () => void  // ✅ NEW: Callback to refresh weight updates list
  editingAnimal?: Animal | null  // ✅ NEW: Optional animal for edit mode
}

export default function AddAnimalModal({
  farmId,
  isOpen,
  onClose,
  onAnimalAdded,
  onHealthRecordCreated,
  onRefreshWeightsList,  // ✅ NEW: Destructure callback
  editingAnimal  // ✅ NEW: Optional animal for edit mode
}: AddAnimalModalProps) {
  const { isMobile } = useDeviceInfo()
  const [animalSource, setAnimalSource] = useState<'newborn_calf' | 'purchased_animal' | null>(null)
  const [showSourceSelection, setShowSourceSelection] = useState(true)
  
  // ✅ NEW: Determine if we're in edit mode
  const isEditMode = !!editingAnimal
  const [showImportModal, setShowImportModal] = useState(false)

  // Health record completion states
  const [showHealthRecordModal, setShowHealthRecordModal] = useState(false)
  const [pendingHealthRecord, setPendingHealthRecord] = useState<any>(null)

  const [showWeightUpdateModal, setShowWeightUpdateModal] = useState(false)
  const [pendingWeightUpdate, setPendingWeightUpdate] = useState<any>(null)

  const [createdAnimal, setCreatedAnimal] = useState<any>(null)

  // ✅ NEW: Initialize modal state based on mode (add vs edit)
  React.useEffect(() => {
    if (isOpen && isEditMode && editingAnimal) {
      // Edit mode: Skip source selection and go directly to the appropriate form
      const source = editingAnimal.animal_source as 'newborn_calf' | 'purchased_animal'
      setAnimalSource(source)
      setShowSourceSelection(false)
    } else if (isOpen && !isEditMode) {
      // Add mode: Show source selection
      setAnimalSource(null)
      setShowSourceSelection(true)
    }
  }, [isOpen, isEditMode, editingAnimal])

  const handleSourceSelection = (source: 'newborn_calf' | 'purchased_animal') => {
    setAnimalSource(source)
    setShowSourceSelection(false)
  }

  const handleBackToSelection = () => {
    setAnimalSource(null)
    setShowSourceSelection(true)
  }

  const handleSuccess = (result: any) => {
  console.log('🎉 [Modal] Animal operation successful:', result)
  
  setCreatedAnimal(result.animal)
  onAnimalAdded(result.animal)

  // ✅ UPDATED: Different flow for edit vs add mode
  if (isEditMode) {
    // Edit mode: Just close and show success
    toast.success('Animal updated successfully!')
    handleModalClose()
    return
  }

  // Add mode: Check for weight and health record requirements
  // ✅ Check weight FIRST (higher priority)
  if (result.requiresWeightUpdate) {
    setPendingWeightUpdate({
      animal: result.animal,
      reason: result.weightUpdateReason
    })
    setShowWeightUpdateModal(true)
    
    toast('⚠️ Weight recording required', {
      duration: 4000,
      icon: '⚖️'
    })
    return // Don't close modal yet
  }

  // ✅ Then check health record
  if (result.healthRecordCreated && result.healthRecord) {
    setPendingHealthRecord(result.healthRecord)
    setShowHealthRecordModal(true)
    
    toast.success(result.message, {
      duration: 4000,
      icon: '⚠️'
    })
    
    if (onHealthRecordCreated) {
      onHealthRecordCreated(result.healthRecord)
    }
  } else {
    toast.success(result.message)
    handleModalClose()
  }
}

  const handleWeightUpdated = (weightRecord: any) => {
  toast.success('Weight recorded successfully!')
  setShowWeightUpdateModal(false)
  
  // If there's also a health record, show that modal
  if (pendingHealthRecord) {
    setShowHealthRecordModal(true)
  } else {
    handleModalClose()
  }
}


  const handleCancel = () => {
    if (isEditMode) {
      // Edit mode: Just close the modal
      handleModalClose()
    } else if (!showSourceSelection && animalSource) {
      // Add mode: If we're in a form, go back to source selection
      handleBackToSelection()
    } else {
      // Add mode: If we're on source selection, close modal
      handleModalClose()
    }
  }

  const handleModalClose = () => {
    setAnimalSource(null)
    setShowSourceSelection(true)
    setPendingHealthRecord(null)
    setCreatedAnimal(null)
    setShowHealthRecordModal(false)
    setShowImportModal(false)
    onClose()
  }

  const handleAnimalsImported = (animals: Animal[]) => {
    toast.success(`Successfully imported ${animals.length} animal(s)!`)
    animals.forEach(animal => onAnimalAdded(animal))
    setShowImportModal(false)
    handleModalClose()
  }

  const handleHealthRecordUpdated = (updatedRecord: any) => {
    toast.success('Health record completed successfully!')
    if (onHealthRecordCreated) {
      onHealthRecordCreated(updatedRecord)
    }
    setShowHealthRecordModal(false)
    handleModalClose()
  }

  const handleSkipHealthRecord = () => {
    toast('You can complete the health record details later from the Health Management section', {
      icon: 'ℹ️',
      duration: 4000,
    })
    setShowHealthRecordModal(false)
    handleModalClose()
  }

  return (
    <>
      <Modal
        isOpen={isOpen && !showHealthRecordModal}
        onClose={handleModalClose}
        className="sm:max-w-5xl"
      >
        <div className={isMobile ? 'p-4' : 'p-6'}>
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

              {/* Bulk Import Button */}
              <div className="max-w-4xl mx-auto flex justify-center mt-4">
                <Button
                  onClick={() => setShowImportModal(true)}
                  className="bg-dairy-primary hover:bg-dairy-primary/90 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Bulk Import Animals</span>
                </Button>
              </div>

              {/* Health Status Notice */}
              <div className="max-w-4xl mx-auto">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">
                      Automatic Health Tracking
                    </h3>
                    <p className="text-sm text-blue-700 mt-1">
                      If you register an animal with concerning health status (sick, requires attention, or quarantined),
                      a health record will be automatically created for proper tracking and follow-up.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={handleModalClose}
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
                {!isEditMode && (
                  <Button
                    variant="ghost"
                    onClick={handleBackToSelection}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </Button>
                )}

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
                      {isEditMode ? 'Edit Animal' : (animalSource === 'newborn_calf' ? 'New Born Calf' : 'Purchased Animal')}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {isEditMode 
                        ? 'Update animal information'
                        : (animalSource === 'newborn_calf'
                          ? 'Register a calf born on your farm'
                          : 'Register an animal acquired from another source'
                        )
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
                  editingAnimal={editingAnimal}
                  isEditMode={isEditMode}
                />
              ) : (
                <PurchasedAnimalForm
                  farmId={farmId}
                  onSuccess={handleSuccess}
                  onCancel={handleCancel}
                  editingAnimal={editingAnimal}
                  isEditMode={isEditMode}
                />
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Health Record Completion Modal */}
      {showHealthRecordModal && pendingHealthRecord && createdAnimal && (
        <CompleteHealthRecordModal
          isOpen={showHealthRecordModal}
          onClose={handleSkipHealthRecord}
          healthRecord={pendingHealthRecord}
          animal={createdAnimal}
          onHealthRecordUpdated={handleHealthRecordUpdated}
        />
      )}

      {showWeightUpdateModal && pendingWeightUpdate && createdAnimal && (
  <WeightUpdateModal
    isOpen={showWeightUpdateModal}
    onClose={() => {
      setShowWeightUpdateModal(false)
      // Still close main modal even if user skips
      if (!pendingHealthRecord) {
        handleModalClose()
      }
    }}
    animal={createdAnimal}
    reason={pendingWeightUpdate.reason}
    onWeightUpdated={handleWeightUpdated}
    onRefreshData={onRefreshWeightsList}  // ✅ NEW: Pass refresh callback
  />
)}

      {/* Import Animals Modal */}
      <ImportAnimalsModal
        farmId={farmId}
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onAnimalsImported={handleAnimalsImported}
      />
    </>
  )
}