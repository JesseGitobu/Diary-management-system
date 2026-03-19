'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { RecordProductionModal } from './RecordProductionModal'
import { ProductionSettings } from '@/types/production-distribution-settings'
import { Plus } from 'lucide-react'

interface ProductionRecordingPageProps {
  farmId: string
  animals: Array<{ 
    id: string
    tag_number: string
    name?: string
    gender: string
    production_status: string 
  }>
  settings: ProductionSettings | null
  onRecordsUpdated?: () => void
}

/**
 * Production Recording Page Component
 * 
 * This is the main entry point for the new production recording system.
 * It manages the modal state and provides the button to open it.
 * 
 * Usage:
 * ```tsx
 * <ProductionRecordingPage 
 *   farmId={farmId}
 *   animals={animals}
 *   settings={productionSettings}
 *   onRecordsUpdated={() => refetchRecords()}
 * />
 * ```
 * 
 * Features:
 * - Modal-based interface with header showing date and session
 * - Two tabs: By Individual and By Group
 * - Individual tab: Two-step flow (animal search → form)
 * - Group tab: Progress tracking with batch recording
 * - Historical context panel showing yesterday's data
 * - Enhanced health & safety section with mastitis tracking
 * - Quality parameters based on production tracking mode
 */
export function ProductionRecordingPage({
  farmId,
  animals,
  settings,
  onRecordsUpdated
}: ProductionRecordingPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSuccess = () => {
    setIsModalOpen(false)
    if (onRecordsUpdated) {
      onRecordsUpdated()
    }
  }

  return (
    <div>
      <Button 
        onClick={() => setIsModalOpen(true)}
        className="gap-2"
      >
        <Plus className="w-4 h-4" />
        Record Production
      </Button>

      <RecordProductionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        farmId={farmId}
        animals={animals}
        settings={settings}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
