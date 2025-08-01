// 4. src/components/mobile/MobileSearchFilter.tsx
'use client'

import { ReactNode } from 'react'
import { Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface MobileSearchFilterProps {
  searchValue: string
  onSearchChange: (value: string) => void
  showFilters: boolean
  onToggleFilters: () => void
  filters?: ReactNode
  placeholder?: string
}

export function MobileSearchFilter({ 
  searchValue, 
  onSearchChange, 
  showFilters, 
  onToggleFilters, 
  filters,
  placeholder = "Search..."
}: MobileSearchFilterProps) {
  return (
    <div className="space-y-3">
      {/* Search bar with filter toggle */}
      <div className="flex space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="lg"
          onClick={onToggleFilters}
          className="h-12 w-12 p-0"
        >
          <Filter className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Collapsible filters */}
      {filters}
    </div>
  )
}