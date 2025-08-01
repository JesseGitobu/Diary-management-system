// src/components/mobile/SearchModal.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { X, Search } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSearch: (searchTerm: string) => void
  initialValue?: string
  placeholder?: string
}

export function SearchModal({
  isOpen,
  onClose,
  onSearch,
  initialValue = '',
  placeholder = 'Search...'
}: SearchModalProps) {
  const [searchTerm, setSearchTerm] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSearchTerm(initialValue)
  }, [initialValue])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Focus the input when modal opens
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleSearch = () => {
    onSearch(searchTerm.trim())
  }

  const handleClear = () => {
    setSearchTerm('')
    onSearch('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-lg z-50 animate-in slide-in-from-top duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2 flex-1">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              ref={inputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              className="border-none focus:ring-0 text-base"
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Quick Actions */}
        <div className="p-4 space-y-3">
          <div className="flex space-x-2">
            <Button
              onClick={handleSearch}
              disabled={!searchTerm.trim()}
              className="flex-1"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            {searchTerm && (
              <Button
                variant="outline"
                onClick={handleClear}
              >
                Clear
              </Button>
            )}
          </div>
          
          {/* Search Suggestions (Optional) */}
          <div className="text-xs text-gray-500">
            <p>Search by animal name, tag number, or breed</p>
          </div>
        </div>
      </div>
    </>
  )
}