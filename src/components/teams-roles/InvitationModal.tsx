// src/components/teams-roles/InvitationModal.tsx
'use client'

import { Modal, ModalHeader, ModalContent, ModalTitle, ModalDescription } from '@/components/ui/Modal'
import { InvitationForm } from './InvitationForm'

interface Worker {
  id: string
  name: string
  worker_number: string
  employment_status: string
  position: string
  shift?: string | null
  department_id?: string | null
}

interface Department {
  id: string
  name: string
}

interface InvitationModalProps {
  isOpen: boolean
  onClose: () => void
  farmId: string
  workersList?: Worker[]
  departmentsList?: Department[]
  onSuccess?: (invitation: any) => void
  editingInvitation?: any
}

export function InvitationModal({
  isOpen,
  onClose,
  farmId,
  workersList = [],
  departmentsList = [],
  onSuccess,
  editingInvitation,
}: InvitationModalProps) {
  const isEditing = !!editingInvitation
  const handleSuccess = (invitation: any) => {
    if (onSuccess) {
      onSuccess(invitation)
    }
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>{isEditing ? 'Edit Invitation' : 'Send Team Invitation'}</ModalTitle>
        <ModalDescription>
          {isEditing
            ? 'Update invitation details for your team member.'
            : 'Invite team members to join your farm and assign them specific roles. You can select from existing workers to auto-fill their name and department.'}
        </ModalDescription>
      </ModalHeader>
      <ModalContent>
        <InvitationForm
          farmId={farmId}
          initialInvitation={editingInvitation}
          workersList={workersList}
          departmentsList={departmentsList}
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </ModalContent>
    </Modal>
  )
}
