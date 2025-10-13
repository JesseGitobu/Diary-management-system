'use client'

import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog'
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Calendar,
  MoreVertical,
  Eye,
  UserCheck,
  Zap
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

interface AnimalCategory {
  id: string
  name: string
  description: string
  min_age_days?: number
  max_age_days?: number
  gender?: string
  characteristics: any
  is_default: boolean
  sort_order: number
  matching_animals_count?: number
}

interface MatchingAnimal {
  id: string
  tag_number: string
  name: string | null
  gender: string | null
  birth_date: string | null
  production_status: string | null
  status: string
  days_in_milk: number | null
  current_daily_production: number | null
  age_days: number | null
}

interface AnimalCategoriesManagerProps {
  farmId: string
  categories: AnimalCategory[]
  onCategoriesUpdate: (categories: AnimalCategory[]) => void
  canEdit: boolean
  isMobile: boolean
}

interface CategoryFormData {
  name: string
  description: string
  min_age_days: string
  max_age_days: string
  gender: string
  lactating: boolean
  pregnant: boolean
  breeding_male: boolean
  growth_phase: boolean
}

const CHARACTERISTIC_OPTIONS = [
  { key: 'lactating', label: 'Lactating', description: 'Currently producing milk' },
  { key: 'pregnant', label: 'Pregnant', description: 'Expecting offspring' },
  { key: 'breeding_male', label: 'Breeding Male', description: 'Male used for breeding' },
  { key: 'growth_phase', label: 'Growth Phase', description: 'Still growing/developing' }
]

const GENDER_OPTIONS = [
  { value: '', label: 'Any Gender' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' }
]

export function AnimalCategoriesManager({
  farmId,
  categories,
  onCategoriesUpdate,
  canEdit,
  isMobile
}: AnimalCategoriesManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AnimalCategory | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<AnimalCategory | null>(null)
  const [viewingAnimals, setViewingAnimals] = useState<AnimalCategory | null>(null)
  const [matchingAnimals, setMatchingAnimals] = useState<MatchingAnimal[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingAnimals, setLoadingAnimals] = useState(false)
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    min_age_days: '',
    max_age_days: '',
    gender: 'female', // Default to female
    lactating: false,
    pregnant: false,
    breeding_male: false,
    growth_phase: false
  })

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      min_age_days: '',
      max_age_days: '',
      gender: 'female', // Default to female
      lactating: false,
      pregnant: false,
      breeding_male: false,
      growth_phase: false
    })
  }, [])

  const handleAdd = useCallback(() => {
    resetForm()
    setShowAddModal(true)
  }, [resetForm])

  const handleEdit = useCallback((category: AnimalCategory) => {
    setFormData({
      name: category.name,
      description: category.description || '',
      min_age_days: category.min_age_days?.toString() || '',
      max_age_days: category.max_age_days?.toString() || '',
      gender: category.gender || 'female',
      lactating: category.characteristics?.lactating || false,
      pregnant: category.characteristics?.pregnant || false,
      breeding_male: category.characteristics?.breeding_male || false,
      growth_phase: category.characteristics?.growth_phase || false
    })
    setEditingCategory(category)
    setShowAddModal(true)
  }, [])

  const handleModalClose = useCallback(() => {
    setShowAddModal(false)
    setEditingCategory(null)
    resetForm()
  }, [resetForm])

  const handleViewAnimals = async (category: AnimalCategory) => {
    setViewingAnimals(category)
    setLoadingAnimals(true)
    
    try {
      const response = await fetch(
        `/api/farms/${farmId}/feed-management/animal-categories/${category.id}/matching-animals`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch matching animals')
      }
      
      const result = await response.json()
      setMatchingAnimals(result.data.animals || [])
    } catch (error) {
      console.error('Error fetching matching animals:', error)
      setMatchingAnimals([])
    } finally {
      setLoadingAnimals(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setLoading(true)
    try {
      const characteristics = {
        lactating: formData.lactating,
        pregnant: formData.pregnant,
        breeding_male: formData.breeding_male,
        growth_phase: formData.growth_phase
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        min_age_days: formData.min_age_days ? parseInt(formData.min_age_days) : null,
        max_age_days: formData.max_age_days ? parseInt(formData.max_age_days) : null,
        gender: formData.gender || null,
        characteristics,
        is_default: false
      }

      const url = editingCategory 
        ? `/api/farms/${farmId}/feed-management/animal-categories/${editingCategory.id}`
        : `/api/farms/${farmId}/feed-management/animal-categories`
      
      const method = editingCategory ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save category')
      }

      const result = await response.json()
      
      if (editingCategory) {
        onCategoriesUpdate(categories.map(cat => 
          cat.id === editingCategory.id ? result.data : cat
        ))
      } else {
        onCategoriesUpdate([...categories, result.data])
      }

      handleModalClose()
    } catch (error) {
      console.error('Error saving category:', error)
      // You might want to show a toast notification here
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingCategory) return

    setLoading(true)
    try {
      const response = await fetch(`/api/farms/${farmId}/feed-management/animal-categories/${deletingCategory.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete category')
      }

      onCategoriesUpdate(categories.filter(cat => cat.id !== deletingCategory.id))
      setDeletingCategory(null)
    } catch (error) {
      console.error('Error deleting category:', error)
    } finally {
      setLoading(false)
    }
  }

  // Memoized event handlers to prevent input focus issues
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, name: e.target.value }))
  }, [])

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, description: e.target.value }))
  }, [])

  const handleMinAgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, min_age_days: e.target.value }))
  }, [])

  const handleMaxAgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, max_age_days: e.target.value }))
  }, [])

  const handleGenderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGender = e.target.value
    setFormData(prev => ({ 
      ...prev, 
      gender: newGender,
      // Auto-adjust characteristics based on gender
      breeding_male: newGender === 'male' && prev.breeding_male,
      lactating: newGender === 'female' && prev.lactating,
      pregnant: newGender === 'female' && prev.pregnant
    }))
  }, [])

  const handleCharacteristicChange = useCallback((key: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [key]: checked }))
  }, [])

  const formatAge = (minAge?: number, maxAge?: number) => {
    if (!minAge && !maxAge) return 'Any age'
    if (minAge && !maxAge) return `${Math.floor(minAge / 30)}+ months`
    if (!minAge && maxAge) return `Up to ${Math.floor(maxAge / 30)} months`
    if (minAge && maxAge) return `${Math.floor(minAge / 30)}-${Math.floor(maxAge / 30)} months`
    return 'Any age'
  }

  const formatAnimalAge = (ageDays: number | null) => {
    if (!ageDays) return 'Unknown'
    if (ageDays < 30) return `${ageDays} days`
    if (ageDays < 365) return `${Math.floor(ageDays / 30)} months`
    const years = Math.floor(ageDays / 365)
    const months = Math.floor((ageDays % 365) / 30)
    return `${years}y ${months}m`
  }

  const getCharacteristicBadges = (characteristics: any, gender?: string) => {
    if (!characteristics) return []
    
    return CHARACTERISTIC_OPTIONS
      .filter(option => characteristics[option.key])
      .map(option => option.label)
      .concat(gender ? [gender === 'male' ? 'Male' : 'Female'] : [])
  }

  const sortedCategories = useMemo(() => 
    [...categories].sort((a, b) => a.sort_order - b.sort_order),
    [categories]
  )

  const ActionButtons = ({ category }: { category: AnimalCategory }) => {
    if (isMobile) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewAnimals(category)}>
              <Eye className="mr-2 h-4 w-4" />
              View Animals ({category.matching_animals_count || 0})
            </DropdownMenuItem>
            {canEdit && (
              <>
                <DropdownMenuItem onClick={() => handleEdit(category)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                {!category.is_default && (
                  <DropdownMenuItem 
                    onClick={() => setDeletingCategory(category)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return (
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewAnimals(category)}
        >
          <Eye className="h-4 w-4 mr-1" />
          {category.matching_animals_count || 0} Animals
        </Button>
        {canEdit && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(category)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            {!category.is_default && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingCategory(category)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Animal Categories</h3>
          <p className="text-sm text-gray-600">
            Define animal groups for targeted feeding and management
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        )}
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        {sortedCategories.map((category) => (
          <div
            key={category.id}
            className={`flex items-center justify-between p-4 border rounded-lg ${
              isMobile ? 'flex-col space-y-3' : 'flex-row'
            }`}
          >
            <div className={`flex-1 ${isMobile ? 'self-start w-full' : ''}`}>
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="font-medium">{category.name}</h4>
                {category.is_default && (
                  <Badge variant="secondary" className="text-xs">Default</Badge>
                )}
                {category.matching_animals_count !== undefined && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                    <UserCheck className="w-3 h-3 mr-1" />
                    {category.matching_animals_count} animals
                  </Badge>
                )}
              </div>
              
              {category.description && (
                <p className="text-sm text-gray-600 mb-2">{category.description}</p>
              )}
              
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatAge(category.min_age_days, category.max_age_days)}</span>
                </div>
                
                {getCharacteristicBadges(category.characteristics, category.gender).map((badge, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {badge}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className={isMobile ? 'self-end' : ''}>
              <ActionButtons category={category} />
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="mx-auto h-8 w-8 text-gray-400 mb-3" />
            <h3 className="font-medium text-gray-900 mb-1">No animal categories yet</h3>
            <p className="text-sm">Create your first animal category to get started.</p>
            {canEdit && (
              <Button className="mt-4" onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={showAddModal} 
        onClose={handleModalClose}
        className="max-w-lg"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingCategory ? 'Edit Animal Category' : 'Add New Animal Category'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="animal-name">Category Name *</Label>
              <Input
                id="animal-name"
                key={`name-${editingCategory?.id || 'new'}`}
                value={formData.name}
                onChange={handleNameChange}
                placeholder="e.g., Young Heifers, Dry Cows"
                required
                autoComplete="off"
              />
            </div>

            <div>
              <Label htmlFor="animal-description">Description</Label>
              <textarea
                id="animal-description"
                key={`description-${editingCategory?.id || 'new'}`}
                value={formData.description}
                onChange={handleDescriptionChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                placeholder="Describe this animal category..."
              />
            </div>

            {/* Gender Selection */}
            <div>
              <Label htmlFor="animal-gender">Gender</Label>
              <select
                id="animal-gender"
                value={formData.gender}
                onChange={handleGenderChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
              >
                {GENDER_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Select the gender for this category</p>
            </div>

            {/* Age Range */}
            <div>
              <Label>Age Range (days)</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <Input
                    type="number"
                    key={`min-age-${editingCategory?.id || 'new'}`}
                    value={formData.min_age_days}
                    onChange={handleMinAgeChange}
                    placeholder="Min age"
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum age in days</p>
                </div>
                <div>
                  <Input
                    type="number"
                    key={`max-age-${editingCategory?.id || 'new'}`}
                    value={formData.max_age_days}
                    onChange={handleMaxAgeChange}
                    placeholder="Max age"
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum age in days</p>
                </div>
              </div>
            </div>

            {/* Characteristics */}
            <div>
              <Label>Characteristics</Label>
              <div className="space-y-2 mt-2">
                {CHARACTERISTIC_OPTIONS.map((option) => {
                  // Disable gender-specific options based on selected gender
                  const isDisabled = (
                    (option.key === 'lactating' || option.key === 'pregnant') && formData.gender === 'male'
                  ) || (
                    option.key === 'breeding_male' && formData.gender === 'female'
                  )
                  
                  return (
                    <label 
                      key={option.key} 
                      className={`flex items-start space-x-3 p-2 rounded ${
                        isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData[option.key as keyof CategoryFormData] as boolean}
                        onChange={(e) => handleCharacteristicChange(option.key, e.target.checked)}
                        disabled={isDisabled}
                        className="mt-1 h-4 w-4 text-farm-green border-gray-300 rounded focus:ring-farm-green"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{option.label}</span>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleModalClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <LoadingSpinner size="sm" /> : (editingCategory ? 'Update' : 'Create')}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Matching Animals Modal */}
      <Modal 
        isOpen={!!viewingAnimals} 
        onClose={() => setViewingAnimals(null)}
        className="max-w-4xl"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Animals matching "{viewingAnimals?.name}"
          </h3>

          {loadingAnimals ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : matchingAnimals.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {matchingAnimals.map((animal) => (
                <div key={animal.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="font-medium">#{animal.tag_number}</span>
                      {animal.name && (
                        <span className="text-gray-600">({animal.name})</span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {animal.gender || 'Unknown'}
                      </Badge>
                      {animal.production_status && (
                        <Badge variant="secondary" className="text-xs">
                          {animal.production_status}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center space-x-4">
                      <span>Age: {formatAnimalAge(animal.age_days)}</span>
                      {animal.days_in_milk && (
                        <span>DIM: {animal.days_in_milk}</span>
                      )}
                      {animal.current_daily_production && (
                        <span>Production: {animal.current_daily_production}L/day</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="mx-auto h-8 w-8 text-gray-400 mb-3" />
              <p>No animals match this category criteria</p>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={() => setViewingAnimals(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Animal Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}