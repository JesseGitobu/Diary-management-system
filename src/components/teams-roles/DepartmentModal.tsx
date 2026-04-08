// src/components/teams-roles/DepartmentModal.tsx
'use client'

import { useCallback } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent, ModalFooter } from '@/components/ui/Modal'
import { DepartmentForm } from './DepartmentForm'
import { Button } from '@/components/ui/Button'

interface DepartmentModalProps {
  isOpen: boolean
  onClose: () => void
  farmId: string
  onSuccess?: (department: any) => void
  editingDepartment?: any
}

export function DepartmentModal({
  isOpen,
  onClose,
  farmId,
  onSuccess,
  editingDepartment,
}: DepartmentModalProps) {
  const isEditing = !!editingDepartment
  const handleSuccess = useCallback((department: any) => {
    onSuccess?.(department)
    onClose()
  }, [onClose, onSuccess])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" closeOnOverlayClick={false}>
      <ModalHeader>
        <ModalTitle>{isEditing ? 'Edit Department' : 'Create New Department'}</ModalTitle>
        <ModalDescription>
          {isEditing
            ? 'Update department details and settings.'
            : 'Add a new department to organize your farm team and assign workers to specific groups.'}
        </ModalDescription>
      </ModalHeader>

      <ModalContent>
        <DepartmentForm
          farmId={farmId}
          initialDepartment={editingDepartment}
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </ModalContent>
    </Modal>
  )
}
