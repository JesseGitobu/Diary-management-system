// AnimalSelectionPanel.tsx
// Reusable animal selection component with tabbed interface and group support
'use client'

import React, { useMemo, useState } from 'react'
import { Search, Check } from 'lucide-react'

interface Animal {
  id: string
  tag_number: string
  name?: string
  breed?: string
  status: string
  production_status?: string
  health_status?: string
  animal_groups?: string[]
}

interface AnimalCategory {
  id: string
  name: string
  description?: string
  matching_animals_count?: number
}

interface AnimalSelectionPanelProps {
  animals: Animal[]
  selectedAnimalIds: string[]
  onAnimalSelect: (animalId: string, isSelected: boolean) => void
  categories?: AnimalCategory[]
  animalCategoryMap?: Record<string, string[]>
  maxHeight?: string
}

export function AnimalSelectionPanel({
  animals,
  selectedAnimalIds,
  onAnimalSelect,
  categories = [],
  animalCategoryMap = {},
  maxHeight = 'max-h-96'
}: AnimalSelectionPanelProps) {
  const [activeTab, setActiveTab] = useState<'animals' | 'categories'>('animals')
  const [searchTerm, setSearchTerm] = useState('')

  // Filter animals by search term
  const filteredAnimals = useMemo(() => {
    if (!searchTerm) return animals
    const search = searchTerm.toLowerCase()
    return animals.filter(animal =>
      animal.tag_number.toLowerCase().includes(search) ||
      animal.name?.toLowerCase().includes(search) ||
      animal.breed?.toLowerCase().includes(search)
    )
  }, [animals, searchTerm])

  // Get animals for a specific category
  const getAnimalsInCategory = (categoryId: string) => {
    const animalIds = animalCategoryMap[categoryId] || []
    return animals.filter(a => animalIds.includes(a.id))
  }

  // Check if all animals in a category are selected
  const isCategoryFullySelected = (categoryId: string) => {
    const categoryAnimals = getAnimalsInCategory(categoryId)
    return categoryAnimals.length > 0 && categoryAnimals.every(a => selectedAnimalIds.includes(a.id))
  }

  // Check if some animals in a category are selected
  const isCategoryPartiallySelected = (categoryId: string) => {
    const categoryAnimals = getAnimalsInCategory(categoryId)
    return categoryAnimals.some(a => selectedAnimalIds.includes(a.id)) && !isCategoryFullySelected(categoryId)
  }

  // Handle category selection
  const handleCategoryToggle = (categoryId: string) => {
    const isFullySelected = isCategoryFullySelected(categoryId)
    const categoryAnimals = getAnimalsInCategory(categoryId)
    categoryAnimals.forEach(animal => {
      onAnimalSelect(animal.id, isFullySelected ? false : true)
    })
  }

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search animals..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent text-sm"
        />
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b">
        <button
          onClick={() => setActiveTab('animals')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'animals'
              ? 'border-farm-green text-farm-green'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Animals ({filteredAnimals.length})
        </button>
        {categories.length > 0 && (
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'categories'
                ? 'border-farm-green text-farm-green'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Categories ({categories.length})
          </button>
        )}
      </div>

      {/* Animals Tab */}
      {activeTab === 'animals' && (
        <div className={`border border-gray-300 rounded-md overflow-y-auto ${maxHeight} bg-white`}>
          {filteredAnimals.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No animals found</div>
          ) : (
            <div className="divide-y">
              {filteredAnimals.map(animal => (
                <label key={animal.id} className="flex items-start p-3 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedAnimalIds.includes(animal.id)}
                    onChange={(e) => onAnimalSelect(animal.id, e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-farm-green focus:ring-farm-green cursor-pointer flex-shrink-0"
                  />
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {animal.tag_number}
                      {animal.name && <span className="text-gray-600"> - {animal.name}</span>}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      {animal.breed && <span>{animal.breed}</span>}
                      {animal.production_status && <span className="px-2 py-0.5 bg-blue-100 rounded text-blue-700 font-medium">{animal.production_status}</span>}
                      {animal.health_status && <span className="px-2 py-0.5 bg-green-100 rounded text-green-700 font-medium">{animal.health_status}</span>}
                    </div>
                    {animal.animal_groups && animal.animal_groups.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {animal.animal_groups.map(group => (
                          <span key={group} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {group}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedAnimalIds.includes(animal.id) && (
                    <Check className="w-5 h-5 text-farm-green flex-shrink-0 ml-2" />
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && categories.length > 0 && (
        <div className={`border border-gray-300 rounded-md overflow-y-auto ${maxHeight} bg-white`}>
          <div className="divide-y">
            {categories.map(category => {
              const categoryAnimals = getAnimalsInCategory(category.id)
              const isFullySelected = isCategoryFullySelected(category.id)
              const isPartiallySelected = isCategoryPartiallySelected(category.id)

              return (
                <div key={category.id}>
                  <label className="flex items-center p-3 hover:bg-purple-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={isFullySelected || isPartiallySelected}
                      onChange={() => handleCategoryToggle(category.id)}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer flex-shrink-0"
                    />
                    <div className="ml-3 flex-1">
                      <p className="font-medium text-gray-900 text-sm">{category.name}</p>
                      <p className="text-xs text-gray-500">
                        {categoryAnimals.length} animal{categoryAnimals.length !== 1 ? 's' : ''}
                        {category.description && ` - ${category.description}`}
                      </p>
                    </div>
                    {isFullySelected && <Check className="w-5 h-5 text-purple-600 flex-shrink-0" />}
                    {isPartiallySelected && <div className="w-2 h-2 rounded-full bg-purple-600 flex-shrink-0" />}
                  </label>
                  {categoryAnimals.length > 0 && (
                    <div className="bg-purple-50 divide-y">
                      {categoryAnimals.map(animal => (
                        <label key={animal.id} className="flex items-start p-3 hover:bg-purple-100 cursor-pointer transition-colors pl-12">
                          <input
                            type="checkbox"
                            checked={selectedAnimalIds.includes(animal.id)}
                            onChange={(e) => onAnimalSelect(animal.id, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer flex-shrink-0"
                          />
                          <div className="ml-3 flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm">
                              {animal.tag_number}
                              {animal.name && <span className="text-gray-600"> - {animal.name}</span>}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              {animal.breed && <span>{animal.breed}</span>}
                              {animal.production_status && <span className="px-2 py-0.5 bg-blue-100 rounded text-blue-700 font-medium">{animal.production_status}</span>}
                              {animal.health_status && <span className="px-2 py-0.5 bg-green-100 rounded text-green-700 font-medium">{animal.health_status}</span>}
                            </div>
                          </div>
                          {selectedAnimalIds.includes(animal.id) && (
                            <Check className="w-5 h-5 text-purple-600 flex-shrink-0 ml-2" />
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {selectedAnimalIds.length > 0 && (
        <div className="p-3 bg-farm-green/10 border border-farm-green/20 rounded text-sm">
          <span className="font-medium text-farm-green">
            {selectedAnimalIds.length} animal{selectedAnimalIds.length !== 1 ? 's' : ''} selected
          </span>
        </div>
      )}
    </div>
  )
}
