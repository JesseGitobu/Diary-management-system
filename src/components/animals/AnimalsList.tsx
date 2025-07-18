// src/components/animals/AnimalsList.tsx
'use client'

import { useState, useMemo } from 'react'
import { Animal } from '@/types/database'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { AnimalCard } from '@/components/animals/AnimalCard'
import { GiCow } from 'react-icons/gi'

interface AnimalsListProps {
  animals: Animal[]
  farmId: string
  userRole: string
  onAnimalUpdated?: (updatedAnimal: Animal) => void
}

export function AnimalsList({ 
  animals, 
  farmId, 
  userRole, 
  onAnimalUpdated 
}: AnimalsListProps) {
  const [filters, setFilters] = useState({
    search: '',
    animalSource: 'all',
    productionStatus: 'all',
    healthStatus: 'all',
    gender: 'all',
  })
  
  const [animalsList, setAnimalsList] = useState(animals)
  
  // Update animals list when props change
  useMemo(() => {
    setAnimalsList(animals)
  }, [animals])
  
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
  
  return (
    <div className="space-y-6">
      {/* Enhanced Filter Bar */}
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
              onClick={() => setFilters({
                search: '',
                animalSource: 'all',
                productionStatus: 'all',
                healthStatus: 'all',
                gender: 'all',
              })}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Animals Grid */}
      {filteredAnimals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <GiCow className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {animalsList.length === 0 ? 'No animals yet' : 'No animals match your filters'}
              </h3>
              <p className="text-gray-600 mb-6">
                {animalsList.length === 0 
                  ? 'Get started by adding your first animal to the herd.'
                  : 'Try adjusting your filters or search terms.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAnimals.map((animal) => (
            <AnimalCard 
              key={animal.id} 
              animal={animal} 
              farmId={farmId}
              userRole={userRole}
              onAnimalUpdated={handleAnimalUpdated}
            />
          ))}
        </div>
      )}
    </div>
  )
}