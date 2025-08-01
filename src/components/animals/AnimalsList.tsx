// src/components/animals/AnimalsList.tsx
'use client'

import { useState, useMemo } from 'react'
import { Animal } from '@/types/database'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { AnimalCard } from '@/components/animals/AnimalCard'
import { MobileFilterDrawer } from '@/components/mobile/MobileFilterDrawer'
import { SearchModal } from '@/components/mobile/SearchModal'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { 
  Filter, 
  Search, 
  Download, 
  X, 
  ChevronDown,
  SlidersHorizontal
} from 'lucide-react'
import { GiCow } from 'react-icons/gi'

interface AnimalsListProps {
  animals: Animal[]
  farmId: string
  userRole: string
  onAnimalUpdated?: (updatedAnimal: Animal) => void
  onExportAnimals?: () => Promise<void>
  loading?: boolean
}

export function AnimalsList({ 
  animals, 
  farmId, 
  userRole, 
  onAnimalUpdated,
  onExportAnimals,
  loading = false
}: AnimalsListProps) {
  const { isMobile } = useDeviceInfo()
  
  const [filters, setFilters] = useState({
    search: '',
    animalSource: 'all',
    productionStatus: 'all',
    healthStatus: 'all',
    gender: 'all',
  })
  
  const [animalsList, setAnimalsList] = useState(animals)
  const [showFilters, setShowFilters] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)
  
  const canExportData = ['farm_owner', 'farm_manager'].includes(userRole)
  
  // Update animals list when props change
  useMemo(() => {
    setAnimalsList(animals)
  }, [animals])
  
  // Count active filters
  useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.animalSource !== 'all') count++
    if (filters.productionStatus !== 'all') count++
    if (filters.healthStatus !== 'all') count++
    if (filters.gender !== 'all') count++
    setActiveFiltersCount(count)
  }, [filters])
  
  const filteredAnimals = useMemo(() => {
    return animalsList.filter(animal => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (!animal.name?.toLowerCase().includes(searchLower) && 
            !animal.tag_number.toLowerCase().includes(searchLower) &&
            !animal.breed?.toLowerCase().includes(searchLower)) {
          return false
        }
      }
      
      // Animal source filter
      if (filters.animalSource !== 'all' && animal.animal_source !== filters.animalSource) {
        return false
      }
      
      // Production status filter
      if (filters.productionStatus !== 'all' && animal.production_status !== filters.productionStatus) {
        return false
      }
      
      // Health status filter
      if (filters.healthStatus !== 'all' && animal.health_status !== filters.healthStatus) {
        return false
      }
      
      // Gender filter
      if (filters.gender !== 'all' && animal.gender !== filters.gender) {
        return false
      }
      
      return true
    })
  }, [animalsList, filters])
  
  const handleAnimalUpdated = (updatedAnimal: Animal) => {
    // Update the local animals list
    setAnimalsList(prev => 
      prev.map(animal => 
        animal.id === updatedAnimal.id ? updatedAnimal : animal
      )
    )
    
    // Call parent callback if provided
    onAnimalUpdated?.(updatedAnimal)
  }
  
  const handleClearFilters = () => {
    setFilters({
      search: '',
      animalSource: 'all',
      productionStatus: 'all',
      healthStatus: 'all',
      gender: 'all',
    })
  }
  
  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }))
    setShowSearch(false)
  }
  
  const getFilterLabel = (filterKey: string, value: string) => {
    const labels: Record<string, Record<string, string>> = {
      animalSource: {
        newborn_calf: 'Born Here',
        purchased_animal: 'Purchased'
      },
      productionStatus: {
        calf: 'Calf',
        heifer: 'Heifer', 
        served: 'Served',
        lactating: 'Lactating',
        dry: 'Dry'
      },
      healthStatus: {
        healthy: 'Healthy',
        sick: 'Sick',
        requires_attention: 'Needs Attention',
        quarantined: 'Quarantined'
      },
      gender: {
        female: 'Female',
        male: 'Male'
      }
    }
    
    return labels[filterKey]?.[value] || value
  }

  return (
    <div className="space-y-4">
      {/* Mobile Quick Actions Bar */}
      {isMobile && (
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(true)}
            className="whitespace-nowrap relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-farm-green text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(true)}
            className="whitespace-nowrap"
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          
          {canExportData && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportAnimals}
              disabled={loading || animals.length === 0}
              className="whitespace-nowrap"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      )}
      
      {/* Active Filters Display (Mobile) */}
      {isMobile && activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <div className="flex items-center bg-farm-green/10 text-farm-green px-3 py-1 rounded-full text-sm">
              <Search className="h-3 w-3 mr-1" />
              "{filters.search}"
              <button
                onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                className="ml-2 hover:text-farm-green/70"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          
          {Object.entries(filters).map(([key, value]) => {
            if (key === 'search' || value === 'all') return null
            return (
              <div key={key} className="flex items-center bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                {getFilterLabel(key, value)}
                <button
                  onClick={() => setFilters(prev => ({ ...prev, [key]: 'all' }))}
                  className="ml-2 hover:text-blue-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
          
          <button
            onClick={handleClearFilters}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Desktop Filter Bar */}
      {!isMobile && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Search */}
              <div>
                <Input
                  placeholder="Search animals..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full"
                />
              </div>
              
              {/* Animal Source Filter */}
              <div>
                <Select
                  value={filters.animalSource}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, animalSource: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="newborn_calf">Born Here</SelectItem>
                    <SelectItem value="purchased_animal">Purchased</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Production Status Filter */}
              <div>
                <Select
                  value={filters.productionStatus}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, productionStatus: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Production" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="calf">Calf</SelectItem>
                    <SelectItem value="heifer">Heifer</SelectItem>
                    <SelectItem value="served">Served</SelectItem>
                    <SelectItem value="lactating">Lactating</SelectItem>
                    <SelectItem value="dry">Dry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Health Status Filter */}
              <div>
                <Select
                  value={filters.healthStatus}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, healthStatus: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Health" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Health</SelectItem>
                    <SelectItem value="healthy">Healthy</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="requires_attention">Needs Attention</SelectItem>
                    <SelectItem value="quarantined">Quarantined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Gender Filter */}
              <div>
                <Select
                  value={filters.gender}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Filter Summary */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Showing {filteredAnimals.length} of {animalsList.length} animals
              </span>
              
              {/* Clear Filters */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Results Summary (Mobile) */}
      {isMobile && (
        <div className="flex items-center justify-between text-sm text-gray-600 px-1">
          <span>
            {filteredAnimals.length} of {animalsList.length} animals
          </span>
          {activeFiltersCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="text-farm-green hover:text-farm-green/70"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
      
      {/* Animals Grid */}
      {filteredAnimals.length === 0 ? (
        <Card>
          <CardContent className={`flex flex-col items-center justify-center ${
            isMobile ? 'py-8' : 'py-12'
          }`}>
            <div className="text-center">
              <GiCow className={`mx-auto text-gray-400 mb-4 ${
                isMobile ? 'h-8 w-8' : 'h-12 w-12'
              }`} />
              <h3 className={`font-medium text-gray-900 mb-2 ${
                isMobile ? 'text-base' : 'text-lg'
              }`}>
                {animalsList.length === 0 ? 'No animals yet' : 'No animals match your filters'}
              </h3>
              <p className={`text-gray-600 mb-6 ${
                isMobile ? 'text-sm' : ''
              }`}>
                {animalsList.length === 0 
                  ? 'Get started by adding your first animal to the herd.'
                  : 'Try adjusting your filters or search terms.'
                }
              </p>
              
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  onClick={handleClearFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={`grid gap-4 ${
          isMobile 
            ? 'grid-cols-1' 
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
        }`}>
          {filteredAnimals.map((animal) => (
            <AnimalCard 
              key={animal.id} 
              animal={animal} 
              farmId={farmId}
              userRole={userRole}
              onAnimalUpdated={handleAnimalUpdated}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}
      
      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={handleClearFilters}
        activeFiltersCount={activeFiltersCount}
      />
      
      {/* Mobile Search Modal */}
      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSearch={handleSearch}
        initialValue={filters.search}
        placeholder="Search by name, tag, or breed..."
      />
    </div>
  )
}