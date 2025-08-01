'use client'

import { useEffect } from 'react'
import { X, LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ActionSheetItem {
  id: string
  label: string
  icon: LucideIcon
  color: string
  onClick: () => void
}

interface MobileActionSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  items: ActionSheetItem[]
}

export function MobileActionSheet({ isOpen, onClose, title, items }: MobileActionSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleItemClick = (item: ActionSheetItem) => {
    item.onClick()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Background overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Action sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto">
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Actions */}
        <div className="p-4 space-y-2 pb-safe">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center space-x-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0">
                  <Icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <span className="text-left font-medium text-gray-900">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}