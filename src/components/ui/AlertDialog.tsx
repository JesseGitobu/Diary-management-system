'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface AlertDialogContextType {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const AlertDialogContext = createContext<AlertDialogContextType | null>(null)

const useAlertDialog = () => {
  const context = useContext(AlertDialogContext)
  if (!context) {
    throw new Error('AlertDialog components must be used within AlertDialog')
  }
  return context
}

interface AlertDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AlertDialog({ children, open = false, onOpenChange }: AlertDialogProps) {
  const [isOpen, setIsOpen] = useState(open)

  useEffect(() => {
    setIsOpen(open)
  }, [open])

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <AlertDialogContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      {children}
    </AlertDialogContext.Provider>
  )
}

interface AlertDialogTriggerProps {
  children: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>
  asChild?: boolean
}

export function AlertDialogTrigger({ children, asChild }: AlertDialogTriggerProps) {
  const { onOpenChange } = useAlertDialog()

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e: React.MouseEvent) => {
        children.props.onClick?.(e)
        onOpenChange(true)
      }
    })
  }

  return (
    <button onClick={() => onOpenChange(true)}>
      {children}
    </button>
  )
}

interface AlertDialogContentProps {
  children: React.ReactNode
  className?: string
}

export function AlertDialogContent({ children, className = '' }: AlertDialogContentProps) {
  const { open, onOpenChange } = useAlertDialog()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onOpenChange(false)
        }
      }
      
      document.addEventListener('keydown', handleEscape)
      
      return () => {
        document.body.style.overflow = 'unset'
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [open, onOpenChange])

  if (!open) return null

  const content = (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Dialog Content */}
      <div className={`
        relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-auto
        ${className}
      `}>
        {children}
      </div>
    </div>
  )

  // Use portal to render outside the normal DOM tree
  return createPortal(content, document.body)
}

interface AlertDialogHeaderProps {
  children: React.ReactNode
  className?: string
}

export function AlertDialogHeader({ children, className = '' }: AlertDialogHeaderProps) {
  return (
    <div className={`p-6 pb-4 ${className}`}>
      {children}
    </div>
  )
}

interface AlertDialogTitleProps {
  children: React.ReactNode
  className?: string
}

export function AlertDialogTitle({ children, className = '' }: AlertDialogTitleProps) {
  return (
    <h2 className={`text-lg font-semibold text-gray-900 mb-2 ${className}`}>
      {children}
    </h2>
  )
}

interface AlertDialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function AlertDialogDescription({ children, className = '' }: AlertDialogDescriptionProps) {
  return (
    <p className={`text-sm text-gray-600 leading-relaxed ${className}`}>
      {children}
    </p>
  )
}

interface AlertDialogFooterProps {
  children: React.ReactNode
  className?: string
}

export function AlertDialogFooter({ children, className = '' }: AlertDialogFooterProps) {
  return (
    <div className={`px-6 pb-6 pt-4 flex justify-end space-x-3 ${className}`}>
      {children}
    </div>
  )
}

interface AlertDialogCancelProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}

export function AlertDialogCancel({ 
  children, 
  onClick, 
  disabled = false, 
  className = '' 
}: AlertDialogCancelProps) {
  const { onOpenChange } = useAlertDialog()

  const handleClick = () => {
    onClick?.()
    onOpenChange(false)
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </Button>
  )
}

interface AlertDialogActionProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}

export function AlertDialogAction({ 
  children, 
  onClick, 
  disabled = false, 
  className = '' 
}: AlertDialogActionProps) {
  const handleClick = () => {
    onClick?.()
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </Button>
  )
}

// Example usage component (you can remove this)
export function AlertDialogExample() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Open Alert Dialog
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                console.log('Confirmed!')
                setIsOpen(false)
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}