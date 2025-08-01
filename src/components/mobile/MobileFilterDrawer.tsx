// src/components/mobile/MobileFilterDrawer.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { X, Filter, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface FilterState {
  search: string
  animalSource: string
  productionStatus: string
  healthStatus: string
  gender: string
}

interface MobileFilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  onClearFilters: () => void
  activeFiltersCount: number
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onClearFilters,
  activeFiltersCount
}: MobileFilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState(filters)

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
    onClose()
  }

  const handleClearAll = () => {
    const clearedFilters = {
      search: '',
      animalSource: 'all',
      productionStatus: 'all',
      healthStatus: 'all',
      gender: 'all',
    }
    setLocalFilters(clearedFilters)
    onClearFilters()
    onClose()
  }

  const filterOptions = {
    animalSource: [
      { value: 'all', label: 'All Sources' },
      { value: 'newborn_calf', label: 'Born Here' },
      { value: 'purchased_animal', label: 'Purchased' }
    ],
    productionStatus: [
      { value: 'all', label: 'All Statuses' },
      { value: 'calf', label: 'Calf' },
      { value: 'heifer', label: 'Heifer' },
      { value: 'served', label: 'Served' },
      { value: 'lactating', label: 'Lactating' },
      { value: 'dry', label: 'Dry' }
    ],
    healthStatus: [
      { value: 'all', label: 'All Health' },
      { value: 'healthy', label: 'Healthy' },
      { value: 'sick', label: 'Sick' },
      { value: 'requires_attention', label: 'Needs Attention' },
      { value: 'quarantined', label: 'Quarantined' }
    ],
    gender: [
      { value: 'all', label: 'All Genders' },
      { value: 'female', label: 'Female' },
      { value: 'male', label: 'Male' }
    ]
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-lg transform transition-transform duration-300 z-50 max-h-[80vh] overflow-hidden",
        isOpen ? "translate-y-0" : "translate-y-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-farm-green" />
            <h2 className="text-lg font-semibold">Filter Animals</h2>
            {activeFiltersCount > 0 && (
              <span className="bg-farm-green text-white text-xs px-2 py-1 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4 max-h-[60vh]">
          {/* Animal Source */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Animal Source</h3>
            <div className="space-y-2">
              {filterOptions.animalSource.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="animalSource"
                    value={option.value}
                    checked={localFilters.animalSource === option.value}
                    onChange={(e) => setLocalFilters(prev => ({ 
                      ...prev, 
                      animalSource: e.target.value 
                    }))}
                    className="text-farm-green focus:ring-farm-green"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Production Status */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Production Status</h3>
            <div className="space-y-2">
              {filterOptions.productionStatus.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="productionStatus"
                    value={option.value}
                    checked={localFilters.productionStatus === option.value}
                    onChange={(e) => setLocalFilters(prev => ({ 
                      ...prev, 
                      productionStatus: e.target.value 
                    }))}
                    className="text-farm-green focus:ring-farm-green"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Health Status */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Health Status</h3>
            <div className="space-y-2">
              {filterOptions.healthStatus.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="healthStatus"
                    value={option.value}
                    checked={localFilters.healthStatus === option.value}
                    onChange={(e) => setLocalFilters(prev => ({ 
                      ...prev, 
                      healthStatus: e.target.value 
                    }))}
                    className="text-farm-green focus:ring-farm-green"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Gender</h3>
            <div className="space-y-2">
              {filterOptions.gender.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="gender"
                    value={option.value}
                    checked={localFilters.gender === option.value}
                    onChange={(e) => setLocalFilters(prev => ({ 
                      ...prev, 
                      gender: e.target.value 
                    }))}
                    className="text-farm-green focus:ring-farm-green"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleClearAll}
              className="flex-1"
              disabled={activeFiltersCount === 0}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear All
            </Button>
            <Button
              onClick={handleApplyFilters}
              className="flex-1"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}