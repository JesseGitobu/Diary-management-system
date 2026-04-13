// src/components/settings/feeds/FeedTypeCategoriesManager.tsx

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
  Tag,
  Palette,
  ChevronUp,
  ChevronDown,
  MoreVertical
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

interface FeedTypeCategory {
  id: string
  category_name: string
  description: string
  color: string
  collect_nutritional_data: boolean
  is_default: boolean
  is_active: boolean
  sort_order: number
  feed_count?: number
}

interface FeedTypeCategoriesManagerProps {
  farmId: string
  categories: FeedTypeCategory[]
  onCategoriesUpdate: (categories: FeedTypeCategory[]) => void
  canEdit: boolean
  isMobile: boolean
}

interface CategoryFormData {
  category_name: string
  description: string
  color: string
  collect_nutritional_data: boolean
  is_default: boolean
  is_active: boolean
}

const DEFAULT_COLORS = [
  '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280',
  '#3B82F6', '#F97316', '#84CC16', '#06B6D4', '#EC4899'
]

export function FeedTypeCategoriesManager({
  farmId,
  categories,
  onCategoriesUpdate,
  canEdit,
  isMobile
}: FeedTypeCategoriesManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<FeedTypeCategory | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<FeedTypeCategory | null>(null)
  const [loading, setLoading] = useState(false)
  const [showNutritionalDetails, setShowNutritionalDetails] = useState(false)
  const [formData, setFormData] = useState<CategoryFormData>({
    category_name: '',
    description: '',
    color: DEFAULT_COLORS[0],
    collect_nutritional_data: false,
    is_default: false,
    is_active: true
  })

  const resetForm = useCallback(() => {
    setFormData({
      category_name: '',
      description: '',
      color: DEFAULT_COLORS[0],
      collect_nutritional_data: false,
      is_default: false,
      is_active: true
    })
  }, [])

  const handleAdd = useCallback(() => {
    resetForm()
    setShowAddModal(true)
  }, [resetForm])

  const handleEdit = useCallback((category: FeedTypeCategory) => {
    setFormData({
      category_name: category.category_name,
      description: category.description || '',
      color: category.color || DEFAULT_COLORS[0],
      collect_nutritional_data: category.collect_nutritional_data || false,
      is_default: category.is_default || false,
      is_active: category.is_active !== false // default to true if null
    })
    setEditingCategory(category)
    setShowAddModal(true)
  }, [])

  const handleModalClose = useCallback(() => {
    setShowAddModal(false)
    setEditingCategory(null)
    resetForm()
  }, [resetForm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.category_name.trim()) return

    setLoading(true)
    try {
      const url = editingCategory
        ? `/api/farms/${farmId}/feed-management/feed-categories/${editingCategory.id}`
        : `/api/farms/${farmId}/feed-management/feed-categories`

      const method = editingCategory ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_name: formData.category_name,
          description: formData.description,
          color: formData.color,
          collect_nutritional_data: formData.collect_nutritional_data,
          is_default: formData.is_default,
          is_active: formData.is_active,
          farm_id: farmId
        })
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
      const response = await fetch(`/api/farms/${farmId}/feed-management/feed-categories/${deletingCategory.id}`, {
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

  const handleReorder = async (categoryId: string, direction: 'up' | 'down') => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return

    const newOrder = direction === 'up' ? category.sort_order - 1 : category.sort_order + 1

    try {
      const response = await fetch(`/api/farms/${farmId}/feed-management/feed-categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: newOrder })
      })

      if (response.ok) {
        const updated = await response.json()
        onCategoriesUpdate(categories.map(cat =>
          cat.id === categoryId ? updated.data : cat
        ).sort((a, b) => a.sort_order - b.sort_order))
      }
    } catch (error) {
      console.error('Error reordering category:', error)
    }
  }

  const sortedCategories = useMemo(() =>
    [...categories].sort((a, b) => a.sort_order - b.sort_order),
    [categories]
  )

  // Memoize form change handlers to prevent recreating on each render
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, category_name: e.target.value }))
  }, [])

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, description: e.target.value }))
  }, [])

  const handleCollectNutritionalDataChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, collect_nutritional_data: e.target.checked }))
    if (e.target.checked) {
      setShowNutritionalDetails(true)
    }
  }, [])

  const handleIsDefaultChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, is_default: e.target.checked }))
  }, [])

  const handleIsActiveChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, is_active: e.target.checked }))
  }, [])

  const toggleNutritionalDetails = useCallback(() => {
    setShowNutritionalDetails(prev => !prev)
  }, [])

  const handleColorChange = useCallback((color: string) => {
    setFormData(prev => ({ ...prev, color }))
  }, [])

  const ActionButtons = ({ category }: { category: FeedTypeCategory }) => {
    if (!canEdit) return null

    if (isMobile) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return (
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleReorder(category.id, 'up')}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleReorder(category.id, 'down')}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEdit(category)}
          className="hover:bg-blue-50"
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
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`flex items-center justify-between ${isMobile ? 'flex-col items-start' : ''}`}>
        <div>
          <h3 className="text-lg font-medium">Feed Type Categories</h3>
          <p className="text-sm text-gray-600">
            Organize feed types into categories for better management
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleAdd} className={`bg-blue-600 hover:bg-blue-700 text-white ${isMobile ? 'w-full mt-3 justify-center' : ''}`}>
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
            className={`flex items-center justify-between p-4 border rounded-lg ${isMobile ? 'flex-col space-y-3' : 'flex-row'
              }`}
          >
            <div className={`flex items-center space-x-3 ${isMobile ? 'self-start' : ''}`}>
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: category.color || DEFAULT_COLORS[0] }}
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium">{category.category_name}</h4>
                  {category.is_default && (
                    <Badge variant="secondary" className="text-xs">Default</Badge>
                  )}
                  {category.collect_nutritional_data && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      Nutritional Data
                    </Badge>
                  )}
                  {!category.is_active && (
                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                      Inactive
                    </Badge>
                  )}
                  {category.feed_count !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      {category.feed_count} feeds
                    </Badge>
                  )}
                </div>
                {category.description && (
                  <p className="text-sm text-gray-600">{category.description}</p>
                )}
              </div>
            </div>

            <div className={isMobile ? 'self-end' : ''}>
              <ActionButtons category={category} />
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Tag className="mx-auto h-8 w-8 text-gray-400 mb-3" />
            <h3 className="font-medium text-gray-900 mb-1">No categories yet</h3>
            <p className="text-sm">Create your first feed type category to get started.</p>
            {canEdit && (
              <Button className={`mt-4 ${isMobile ? 'w-full bg-blue-600 hover:bg-blue-700 text-white' : ''}`} onClick={handleAdd}>
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
        className="max-w-md"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingCategory ? 'Edit Category' : 'Add New Category'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="category-name">Category Name *</Label>
              <Input
                id="category-name"
                key={`category_name-${editingCategory?.id || 'new'}`}
                value={formData.category_name}
                onChange={handleNameChange}
                placeholder="e.g., Roughage, Concentrates"
                required
                autoComplete="off"
              />
            </div>

            <div>
              <Label htmlFor="category-description">Description</Label>
              <textarea
                id="category-description"
                key={`description-${editingCategory?.id || 'new'}`}
                value={formData.description}
                onChange={handleDescriptionChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                placeholder="Describe this feed category..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="collect-nutritional-data"
                checked={formData.collect_nutritional_data}
                onChange={handleCollectNutritionalDataChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <Label htmlFor="collect-nutritional-data" className="text-sm">
                Collect nutritional data for this category
              </Label>
            </div>

            {formData.collect_nutritional_data && (
              <div className="ml-6 border border-gray-200 rounded-md">
                <button
                  type="button"
                  onClick={toggleNutritionalDetails}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-t-md transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700">Nutritional data that can be collected</span>
                  {showNutritionalDetails ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </button>
                {showNutritionalDetails && (
                  <div className="p-3 bg-white rounded-b-md">
                    <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                      <li>Dry Matter (%)</li>
                      <li>Crude Protein (%)</li>
                      <li>Crude Fiber (%)</li>
                      <li>Crude Fat (%)</li>
                      <li>Ash (%)</li>
                      <li>Calcium (%)</li>
                      <li>Phosphorus (%)</li>
                      <li>Energy (ME, kcal/kg)</li>
                      <li>Vitamin A (IU/kg)</li>
                      <li>Vitamin D (IU/kg)</li>
                      <li>Vitamin E (IU/kg)</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is-default"
                checked={formData.is_default}
                onChange={handleIsDefaultChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <Label htmlFor="is-default" className="text-sm">
                Set as default category
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is-active"
                checked={formData.is_active}
                onChange={handleIsActiveChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <Label htmlFor="is-active" className="text-sm">
                Category is active
              </Label>
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorChange(color)}
                    className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-gray-400' : 'border-gray-200'
                      }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className={`flex ${isMobile ? 'flex-col space-y-2' : 'justify-end space-x-3'} pt-4`}>
              <Button
                type="button"
                variant="outline"
                onClick={handleModalClose}
                disabled={loading}
                className={isMobile ? 'w-full' : ''}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className={`bg-blue-600 hover:bg-blue-700 text-white ${isMobile ? 'w-full' : ''}`}>
                {loading ? <LoadingSpinner size="sm" /> : (editingCategory ? 'Update' : 'Create')}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent className={isMobile ? 'mx-4' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCategory?.category_name}"? This action cannot be undone.
              {deletingCategory?.feed_count && deletingCategory.feed_count > 0 && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Warning: This category has {deletingCategory.feed_count} feed types.
                  They will be uncategorized after deletion.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isMobile ? 'flex-col space-y-2' : ''}>
            <AlertDialogCancel disabled={loading} className={isMobile ? 'w-full' : ''}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className={`bg-red-600 hover:bg-red-700 ${isMobile ? 'w-full' : ''}`}
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}