'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { 
  Filter, 
  X, 
  Search,
  AlertTriangle,
  Calendar,
  Package
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/DropdownMenu'

interface InventoryFiltersProps {
  onFiltersChange: (filters: InventoryFilters) => void
  totalItems: number
  filteredItems: number
}

interface InventoryFilters {
  search: string
  category: string[]
  stockStatus: string[]
  expiryStatus: string[]
  supplier: string[]
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export function InventoryFilters({ onFiltersChange, totalItems, filteredItems }: InventoryFiltersProps) {
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    category: [],
    stockStatus: [],
    expiryStatus: [],
    supplier: [],
    sortBy: 'name',
    sortOrder: 'asc',
  })
  
  const [isOpen, setIsOpen] = useState(false)
  
  const categories = [
    { value: 'feed', label: 'Feed' },
    { value: 'medical', label: 'Medical' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'supplies', label: 'Supplies' },
    { value: 'chemicals', label: 'Chemicals' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other', label: 'Other' },
  ]
  
  const stockStatuses = [
    { value: 'in_stock', label: 'In Stock', icon: Package },
    { value: 'low_stock', label: 'Low Stock', icon: AlertTriangle },
    { value: 'out_of_stock', label: 'Out of Stock', icon: X },
  ]
  
  const expiryStatuses = [
    { value: 'expiring_soon', label: 'Expiring Soon (30 days)', icon: Calendar },
    { value: 'expired', label: 'Expired', icon: AlertTriangle },
    { value: 'no_expiry', label: 'No Expiry Date', icon: Package },
  ]
  
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'category', label: 'Category' },
    { value: 'current_stock', label: 'Current Stock' },
    { value: 'unit_cost', label: 'Unit Cost' },
    { value: 'expiry_date', label: 'Expiry Date' },
    { value: 'created_at', label: 'Date Added' },
  ]
  
  const updateFilters = (newFilters: Partial<InventoryFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    onFiltersChange(updatedFilters)
  }
  
  const toggleArrayFilter = (filterKey: keyof InventoryFilters, value: string) => {
    const currentArray = filters[filterKey] as string[]
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value]
    
    updateFilters({ [filterKey]: newArray })
  }
  
  const clearAllFilters = () => {
    const defaultFilters: InventoryFilters = {
      search: '',
      category: [],
      stockStatus: [],
      expiryStatus: [],
      supplier: [],
      sortBy: 'name',
      sortOrder: 'asc',
    }
    setFilters(defaultFilters)
    onFiltersChange(defaultFilters)
  }
  
  const activeFiltersCount = 
    filters.category.length + 
    filters.stockStatus.length + 
    filters.expiryStatus.length + 
    filters.supplier.length +
    (filters.search ? 1 : 0)
  
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search inventory items..."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="pl-10"
        />
      </div>
      
      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger >
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="start">
              {/* Categories */}
              <DropdownMenuLabel>Categories</DropdownMenuLabel>
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category.value}
                  onClick={() => toggleArrayFilter('category', category.value)}
                  className="flex items-center justify-between"
                >
                  <span>{category.label}</span>
                  {filters.category.includes(category.value) && (
                    <div className="w-2 h-2 bg-farm-green rounded-full" />
                  )}
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator />
              
              {/* Stock Status */}
              <DropdownMenuLabel>Stock Status</DropdownMenuLabel>
              {stockStatuses.map((status) => (
                <DropdownMenuItem
                  key={status.value}
                  onClick={() => toggleArrayFilter('stockStatus', status.value)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <status.icon className="w-4 h-4 mr-2" />
                    <span>{status.label}</span>
                  </div>
                  {filters.stockStatus.includes(status.value) && (
                    <div className="w-2 h-2 bg-farm-green rounded-full" />
                  )}
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator />
              
              {/* Expiry Status */}
              <DropdownMenuLabel>Expiry Status</DropdownMenuLabel>
              {expiryStatuses.map((status) => (
                <DropdownMenuItem
                  key={status.value}
                  onClick={() => toggleArrayFilter('expiryStatus', status.value)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <status.icon className="w-4 h-4 mr-2" />
                    <span>{status.label}</span>
                  </div>
                  {filters.expiryStatus.includes(status.value) && (
                    <div className="w-2 h-2 bg-farm-green rounded-full" />
                  )}
                </DropdownMenuItem>
              ))}
              
              {activeFiltersCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearAllFilters} className="text-red-600">
                    <X className="w-4 h-4 mr-2" />
                    Clear All Filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Sort Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort: {sortOptions.find(option => option.value === filters.sortBy)?.label}
                {filters.sortOrder === 'desc' ? ' ↓' : ' ↑'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => {
                    const newOrder = filters.sortBy === option.value && filters.sortOrder === 'asc' 
                      ? 'desc' 
                      : 'asc'
                    updateFilters({ sortBy: option.value, sortOrder: newOrder })
                  }}
                  className="flex items-center justify-between"
                >
                  <span>{option.label}</span>
                  {filters.sortBy === option.value && (
                    <span>{filters.sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Results Count */}
        <div className="text-sm text-gray-600">
          Showing {filteredItems} of {totalItems} items
        </div>
      </div>
      
      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{filters.search}"
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => updateFilters({ search: '' })}
              />
            </Badge>
          )}
          
          {filters.category.map(category => (
            <Badge key={category} variant="secondary" className="flex items-center gap-1">
              {categories.find(c => c.value === category)?.label}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => toggleArrayFilter('category', category)}
              />
            </Badge>
          ))}
          
          {filters.stockStatus.map(status => (
            <Badge key={status} variant="secondary" className="flex items-center gap-1">
              {stockStatuses.find(s => s.value === status)?.label}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => toggleArrayFilter('stockStatus', status)}
              />
            </Badge>
          ))}
          
          {filters.expiryStatus.map(status => (
            <Badge key={status} variant="secondary" className="flex items-center gap-1">
              {expiryStatuses.find(s => s.value === status)?.label}
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => toggleArrayFilter('expiryStatus', status)}
              />
            </Badge>
          ))}
          
          {activeFiltersCount > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      )}
    </div>
  )
}