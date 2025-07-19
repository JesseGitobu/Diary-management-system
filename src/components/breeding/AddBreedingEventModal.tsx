'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Calendar, Heart, Syringe, Stethoscope, Baby } from 'lucide-react'
import { HeatDetectionForm } from './HeatDetectionForm'
import { InseminationForm } from './InseminationForm'
import { PregnancyCheckForm } from './PregnancyCheckForm'
import { CalvingEventForm } from './CalvingEventForm'
import type { BreedingEventType } from '@/lib/database/breeding'

interface AddBreedingEventModalProps {
  isOpen: boolean
  onClose: () => void
  farmId: string
  onEventCreated: () => void
}

const eventTypes = [
  {
    type: 'heat_detection' as BreedingEventType,
    title: 'Heat Detection',
    description: 'Record heat signs and breeding readiness',
    icon: Heart,
    color: 'bg-pink-100 text-pink-800'
  },
  {
    type: 'insemination' as BreedingEventType,
    title: 'Insemination',
    description: 'Record breeding service or AI',
    icon: Syringe,
    color: 'bg-blue-100 text-blue-800'
  },
  {
    type: 'pregnancy_check' as BreedingEventType,
    title: 'Pregnancy Check',
    description: 'Record pregnancy examination results',
    icon: Stethoscope,
    color: 'bg-green-100 text-green-800'
  },
  {
    type: 'calving' as BreedingEventType,
    title: 'Calving Event',
    description: 'Record birth and register new calf',
    icon: Baby,
    color: 'bg-yellow-100 text-yellow-800'
  }
]

export function AddBreedingEventModal({ 
  isOpen, 
  onClose, 
  farmId, 
  onEventCreated 
}: AddBreedingEventModalProps) {
  const [selectedEventType, setSelectedEventType] = useState<BreedingEventType | null>(null)
  const [step, setStep] = useState<'select' | 'form'>('select')
  
  const handleEventTypeSelect = (eventType: BreedingEventType) => {
    setSelectedEventType(eventType)
    setStep('form')
  }
  
  const handleBack = () => {
    setStep('select')
    setSelectedEventType(null)
  }
  
  const handleEventCreated = () => {
    onEventCreated()
    handleClose()
  }
  
  const handleClose = () => {
    setStep('select')
    setSelectedEventType(null)
    onClose()
  }
  
  const renderEventForm = () => {
    if (!selectedEventType) return null
    
    const commonProps = {
      farmId,
      onEventCreated: handleEventCreated,
      onCancel: handleBack
    }
    
    switch (selectedEventType) {
      case 'heat_detection':
        return <HeatDetectionForm {...commonProps} />
      case 'insemination':
        return <InseminationForm {...commonProps} />
      case 'pregnancy_check':
        return <PregnancyCheckForm {...commonProps} />
      case 'calving':
        return <CalvingEventForm {...commonProps} />
      default:
        return null
    }
  }
  
  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-2xl">
      <div className="p-6">
        {step === 'select' ? (
          <>
            <div className="flex items-center space-x-2 mb-6">
              <Calendar className="w-6 h-6 text-farm-green" />
              <h2 className="text-2xl font-bold text-gray-900">Add Breeding Event</h2>
            </div>
            
            <p className="text-gray-600 mb-6">
              Select the type of breeding event you want to record:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventTypes.map((eventType) => {
                const Icon = eventType.icon
                return (
                  <button
                    key={eventType.type}
                    onClick={() => handleEventTypeSelect(eventType.type)}
                    className="p-6 border border-gray-200 rounded-lg hover:border-farm-green hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${eventType.color}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-farm-green transition-colors">
                          {eventType.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {eventType.description}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            
            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Button variant="ghost" onClick={handleBack} size="sm">
                  ← Back
                </Button>
                <h2 className="text-xl font-bold text-gray-900">
                  {eventTypes.find(e => e.type === selectedEventType)?.title}
                </h2>
              </div>
              <Badge className={eventTypes.find(e => e.type === selectedEventType)?.color}>
                {selectedEventType?.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            
            {renderEventForm()}
          </>
        )}
      </div>
    </Modal>
  )
}