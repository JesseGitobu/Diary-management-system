// src/components/teams-roles/WorkerModal.tsx
'use client'

import { Modal, ModalHeader, ModalContent, ModalTitle, ModalDescription } from '@/components/ui/Modal'
import { WorkerForm } from './WorkerForm'

interface WorkerModalProps {
  isOpen: boolean
  onClose: () => void
  farmId: string
  onSuccess?: (worker: any) => void
  departments?: Array<{ id: string; name: string }>
  isDepartmentsLoading?: boolean
  editingWorker?: any
}

export function WorkerModal({
  isOpen,
  onClose,
  farmId,
  onSuccess,
  departments = [],
  isDepartmentsLoading = false,
  editingWorker,
}: WorkerModalProps) {
  const isEditing = !!editingWorker

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>{isEditing ? 'Edit Worker' : 'Add New Worker'}</ModalTitle>
        <ModalDescription>
          {isEditing
            ? 'Update the farm worker details'
            : 'Create a new farm worker entry and assign them to departments or shifts'}
        </ModalDescription>
      </ModalHeader>
      <ModalContent>
        <WorkerForm
          farmId={farmId}
          initialWorker={editingWorker}
          onSuccess={(worker) => {
            onSuccess?.(worker)
            onClose()
          }}
          onCancel={onClose}
          departments={departments}
          isDepartmentsLoading={isDepartmentsLoading}
        />
      </ModalContent>
    </Modal>
  )
}
