// src/components/layout/GlobalModalWrapper.tsx
'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'

// --- EXISTING IMPORTS ---
import AddAnimalModal from '@/components/animals/AddAnimalModal'
import { AddHealthRecordModal } from '@/components/health/AddHealthRecordModal'
import { VaccinationModal } from '@/components/health/VaccinationModal'
import { ScheduleVisitModal } from '@/components/health/ScheduleVisitModal'
import { AddVeterinarianModal } from '@/components/health/AddVeterinarianModal'
import { FeedConsumptionModal } from '@/components/feed/FeedConsumptionModal'
import { AddFeedTypeModal } from '@/components/feed/AddFeedTypeModal'
import { AddFeedInventoryModal } from '@/components/feed/AddFeedInventoryModal'
import { HeatDetectionForm } from '@/components/breeding/HeatDetectionForm'
import { InseminationForm } from '@/components/breeding/InseminationForm'
import { PregnancyCheckForm } from '@/components/breeding/PregnancyCheckForm'
import { CalvingEventForm } from '@/components/breeding/CalvingEventForm'

// --- NEW IMPORTS (Production & Distribution) ---
import { ProductionEntryForm } from '@/components/production/ProductionEntryForm'
import { DistributionEntryForm } from '@/components/distribution/DistributionEntryForm'
import { ChannelManager } from '@/components/distribution/ChannelManager'

interface GlobalModalWrapperProps {
  farmId: string
  animals: any[]
  
  // Feed props
  feedTypes?: any[]
  inventory?: any[]
  feedTypeCategories?: any[]
  animalCategories?: any[]
  weightConversions?: any[]
  
  // Health props
  veterinarians?: any[]

  // NEW: Production & Distribution props
  channels?: any[]
  availableVolume?: number
  productionSettings?: any
  distributionSettings?: any
}

export function GlobalModalWrapper({ 
  farmId, 
  animals,
  feedTypes = [],
  inventory = [],
  feedTypeCategories = [],
  animalCategories = [],
  weightConversions = [],
  veterinarians = [],
  channels = [],
  availableVolume = 0,
  productionSettings = null,
  distributionSettings = null
}: GlobalModalWrapperProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null)

  useEffect(() => {
    const handleMobileNavAction = (event: Event) => {
      const customEvent = event as CustomEvent
      const { action } = customEvent.detail
      console.log("Global Event Received:", action)
      setActiveModal(action)
    }

    window.addEventListener('mobileNavModalAction', handleMobileNavAction)

    return () => {
      window.removeEventListener('mobileNavModalAction', handleMobileNavAction)
    }
  }, [])

  const closeModal = () => setActiveModal(null)

  const handleSuccess = () => {
    closeModal()
    // Ideally trigger a router refresh or data re-fetch here if needed
    // router.refresh()
  }

  return (
    <>
      {/* --- ANIMALS --- */}
      <AddAnimalModal
        farmId={farmId}
        isOpen={activeModal === 'showAddAnimalModal'}
        onClose={closeModal}
        onAnimalAdded={handleSuccess}
      />

      {/* --- HEALTH --- */}
      {activeModal === 'showHealthRecordModal' && (
        <AddHealthRecordModal
          farmId={farmId}
          animals={animals}
          isOpen={true}
          onClose={closeModal}
          onRecordAdded={handleSuccess}
        />
      )}
      {activeModal === 'showVaccinationModal' && (
        <VaccinationModal
            farmId={farmId}
            animals={animals}
            isOpen={true}
            onClose={closeModal}
            onVaccinationRecorded={handleSuccess}
        />
      )}
      {activeModal === 'showVetVisitModal' && (
        <ScheduleVisitModal
            farmId={farmId}
            animals={animals}
            veterinarians={veterinarians}
            isOpen={true}
            onClose={closeModal}
            onVisitScheduled={handleSuccess}
        />
      )}
      {activeModal === 'showVeterinarianModal' && (
        <AddVeterinarianModal
            farmId={farmId}
            isOpen={true}
            onClose={closeModal}
            onVeterinarianAdded={handleSuccess}
        />
      )}

      {/* --- FEED --- */}
      {activeModal === 'showRecordFeedingModal' && (
        <FeedConsumptionModal
          farmId={farmId}
          feedTypes={feedTypes}
          animals={animals}
          inventory={inventory}
          isOpen={true}
          onClose={closeModal}
          onSuccess={handleSuccess}
          isMobile={true}
          feedTypeCategories={feedTypeCategories}
          animalCategories={animalCategories}
        />
      )}
      {activeModal === 'showAddFeedTypeModal' && (
        <AddFeedTypeModal
          farmId={farmId}
          isOpen={true}
          onClose={closeModal}
          onSuccess={handleSuccess}
          feedTypeCategories={feedTypeCategories}
          animalCategories={animalCategories}
          weightConversions={weightConversions}
        />
      )}
      {activeModal === 'showAddInventoryModal' && (
        <AddFeedInventoryModal
          farmId={farmId}
          feedTypes={feedTypes}
          weightConversions={weightConversions}
          isOpen={true}
          onClose={closeModal}
          onSuccess={handleSuccess}
        />
      )}

      {/* --- PRODUCTION (NEW) --- */}
      {activeModal === 'showRecordProductionModal' && (
        <Modal 
          isOpen={true} 
          onClose={closeModal}
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          <div className="p-4 sm:p-6">
            <ProductionEntryForm
              farmId={farmId}
              animals={animals} // Note: This passes all animals; the form filters for eligible ones internally
              onSuccess={handleSuccess}
              isMobile={true} // Optimize layout for mobile modal
              settings={productionSettings}
            />
          </div>
        </Modal>
      )}

      {/* --- DISTRIBUTION (NEW) --- */}
      {activeModal === 'showRecordDistributionModal' && (
        <Modal 
          isOpen={true} 
          onClose={closeModal}
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          <div className="p-4 sm:p-6">
            <DistributionEntryForm
              farmId={farmId}
              channels={channels}
              availableVolume={availableVolume}
              onSuccess={handleSuccess}
              isMobile={true}
              settings={distributionSettings}
            />
          </div>
        </Modal>
      )}

      {/* --- CHANNELS (NEW) --- */}
      {activeModal === 'showManageChannelsModal' && (
        <Modal 
          isOpen={true} 
          onClose={closeModal}
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          <div className="p-4 sm:p-6">
            <ChannelManager
              farmId={farmId}
              channels={channels}
              onSuccess={handleSuccess}
              isMobile={true}
              settings={distributionSettings}
            />
          </div>
        </Modal>
      )}

      {/* --- BREEDING --- */}
      {(['showHeatDetectionModal', 'showInseminationModal', 'showPregnancyCheckModal', 'showCalvingEventModal'].includes(activeModal || '')) && (
        <Modal isOpen={true} onClose={closeModal} className="max-w-2xl">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">
              {activeModal === 'showHeatDetectionModal' && 'Record Heat Detection'}
              {activeModal === 'showInseminationModal' && 'Record Insemination'}
              {activeModal === 'showPregnancyCheckModal' && 'Record Pregnancy Check'}
              {activeModal === 'showCalvingEventModal' && 'Record Calving'}
            </h2>
            
            {activeModal === 'showHeatDetectionModal' && (
              <HeatDetectionForm farmId={farmId} onEventCreated={handleSuccess} onCancel={closeModal} />
            )}
            {activeModal === 'showInseminationModal' && (
               <InseminationForm farmId={farmId} onEventCreated={handleSuccess} onCancel={closeModal} />
            )}
            {activeModal === 'showPregnancyCheckModal' && (
               <PregnancyCheckForm farmId={farmId} onEventCreated={handleSuccess} onCancel={closeModal} />
            )}
             {activeModal === 'showCalvingEventModal' && (
               <CalvingEventForm farmId={farmId} onEventCreated={handleSuccess} onCancel={closeModal} />
            )}
          </div>
        </Modal>
      )}
    </>
  )
}