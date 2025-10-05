'use client'

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnOverlayClick?: boolean
  showCloseButton?: boolean
}

interface ModalHeaderProps {
  children: React.ReactNode
  className?: string
}

interface ModalContentProps {
  children: React.ReactNode
  className?: string
}

interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

export function Modal({ 
  isOpen, 
  onClose, 
  children, 
  className,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true
}: ModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null)
  
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }
  
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
      // Focus management
      modalRef.current?.focus()
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
        onClick={handleOverlayClick}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className={cn(
          "relative bg-white rounded-lg shadow-xl w-full mx-4 max-h-[90vh] overflow-hidden",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          sizeClasses[size],
          className
        )}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="w-5 h-5" />
            <span className="sr-only">Close</span>
          </button>
        )}
        
        <div className="max-h-[90vh] overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

export function ModalHeader({ children, className }: ModalHeaderProps) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)}>
      {children}
    </div>
  )
}

export function ModalContent({ children, className }: ModalContentProps) {
  return (
    <div className={cn("p-6 pt-0", className)}>
      {children}
    </div>
  )
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={cn("flex items-center justify-end space-x-2 p-6 pt-4", className)}>
      {children}
    </div>
  )
}

export function ModalTitle({ children, className }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
      {children}
    </h3>
  )
}

export function ModalDescription({ children, className }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-gray-600", className)}>
      {children}
    </p>
  )
}