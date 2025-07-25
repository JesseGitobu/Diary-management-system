// Custom hook for modal management
// src/lib/hooks/useHealthModals.ts

import { useState } from 'react'

export function useHealthModals() {
  const [modals, setModals] = useState({
    addRecord: false,
    addProtocol: false,
    createOutbreak: false,
    vaccination: false,
    scheduleVisit: false,
  })

  const openModal = (modalName: keyof typeof modals) => {
    setModals(prev => ({ ...prev, [modalName]: true }))
  }

  const closeModal = (modalName: keyof typeof modals) => {
    setModals(prev => ({ ...prev, [modalName]: false }))
  }

  const closeAllModals = () => {
    setModals({
      addRecord: false,
      addProtocol: false,
      createOutbreak: false,
      vaccination: false,
      scheduleVisit: false,
    })
  }

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
  }
}