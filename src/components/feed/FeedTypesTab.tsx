'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Wheat, Edit, Trash2, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
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
import { AddFeedTypeModal } from '@/components/feed/AddFeedTypeModal'

interface FeedTypesTabProps {
  feedTypes: any[]
  isMobile: boolean
  canManageFeed: boolean
  farmId: string
  onAddFeedType: () => void
  onFeedTypeUpdated: (updatedFeedType: any) => void
  onFeedTypeDeleted: (feedTypeId: string) => void
  feedTypeCategories: any[]
  animalCategories: any[]
  weightConversions: any[]
}

export function FeedTypesTab({
  feedTypes,
  isMobile,
  canManageFeed,
  farmId,
  onAddFeedType,
  onFeedTypeUpdated,
  onFeedTypeDeleted,
  feedTypeCategories,
  animalCategories,
  weightConversions,
}: FeedTypesTabProps) {
  const [editingFeedType, setEditingFeedType] = useState<any | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deletingFeedType, setDeletingFeedType] = useState<any | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  // Helper function to format animal categories using UUIDs
  const formatAnimalCategories = (categoryIds: string[] | null) => {
    if (!categoryIds || categoryIds.length === 0) return 'All categories'
    
    return categoryIds.map(id => {
      const category = animalCategories.find(cat => cat.id === id)
      return category ? category.name : id
    }).join(', ')
  }

  // Helper function to get feed category name
  const getFeedCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null
    const category = feedTypeCategories.find(cat => cat.id === categoryId)
    return category ? category.name : null
  }

  const getPreferredMeasurementUnit = (unitId: string | null) => {
    if (!unitId) return null
    const unit = weightConversions.find(conv => conv.id === unitId)
    return unit ? unit.unit_name : null
  }

  const parseSupplierFromNotes = (notes?: string | null) => {
    if (!notes) return null
    const match = notes.match(/^Supplier:\s*(.+)$/i)
    return match ? match[1] : notes
  }

  const getSupplierName = (feedType: any) => {
    return feedType.supplier || parseSupplierFromNotes(feedType.notes) || null
  }

  const getFeedNutrition = (feedType: any) => {
    return feedType.nutritional_info || feedType.nutritional_value || {}
  }

  const shouldShowNutrition = (nutrition: any) => {
    return nutrition && Object.keys(nutrition).some(key => nutrition[key] != null)
  }

  const handleEdit = (feedType: any) => {
    setEditingFeedType(feedType)
    setShowEditModal(true)
  }

  const handleEditSuccess = (updatedFeedType: any) => {
    onFeedTypeUpdated(updatedFeedType)
    setShowEditModal(false)
    setEditingFeedType(null)
  }

  const handleDelete = (feedType: any) => {
    setDeletingFeedType(feedType)
    setShowDeleteDialog(true)
  }

  const toggleCardExpansion = (feedTypeId: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(feedTypeId)) {
      newExpanded.delete(feedTypeId)
    } else {
      newExpanded.add(feedTypeId)
    }
    setExpandedCards(newExpanded)
  }

  const confirmDelete = async () => {
    if (!deletingFeedType) return

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/feed/types/${deletingFeedType.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete feed type')
      }

      onFeedTypeDeleted(deletingFeedType.id)
      setShowDeleteDialog(false)
      setDeletingFeedType(null)
    } catch (error) {
      console.error('Error deleting feed type:', error)
      // You might want to show an error toast here
    } finally {
      setDeleteLoading(false)
    }
  }

  const ActionButtons = ({ feedType }: { feedType: any }) => {
    if (!canManageFeed) return null

    if (isMobile) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(feedType)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleDelete(feedType)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return (
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEdit(feedType)}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDelete(feedType)}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>Feed Types</CardTitle>
        <CardDescription className={isMobile ? 'text-sm' : ''}>
          Manage different types of feed for your animals
        </CardDescription>
      </CardHeader>
      <CardContent>
        {feedTypes.length > 0 ? (
          <div className="space-y-3">
            {feedTypes.map((feedType: any) => {
              const isExpanded = expandedCards.has(feedType.id)
              const hasAnimalCategories = feedType.animal_categories && feedType.animal_categories.length > 0
              
              return (
                <div key={feedType.id} className={`border rounded-lg ${isMobile ? 'space-y-2' : ''}`}>
                  <div className={`flex items-center justify-between p-3 ${isMobile ? 'flex-col items-start space-y-2' : 'flex-row'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium ${isMobile ? 'text-sm' : 'text-base'} truncate`}>
                            {feedType.name}
                          </h4>
                          {/* Display feed category name */}
                          {getFeedCategoryName(feedType.category_id) && (
                            <div className="flex items-center space-x-1 mt-1">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ 
                                  backgroundColor: feedTypeCategories.find(cat => cat.id === feedType.category_id)?.color || '#gray' 
                                }}
                              />
                              <span className="text-xs text-gray-500">
                                {getFeedCategoryName(feedType.category_id)}
                              </span>
                            </div>
                          )}
                        </div>
                        {feedType.animal_categories && feedType.animal_categories.length > 0 && (
                          <div className="ml-2 flex flex-wrap gap-1">
                            {feedType.animal_categories.slice(0, 2).map((categoryId: string) => {
                              const category = animalCategories.find(cat => cat.id === categoryId)
                              return (
                                <Badge key={categoryId} variant="secondary" className="text-xs">
                                  {category ? category.name : categoryId}
                                </Badge>
                              )
                            })}
                            {feedType.animal_categories.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{feedType.animal_categories.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'} truncate mb-1`}>
                        {feedType.description || 'No description'}
                      </p>
                      
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        {getSupplierName(feedType) && (
                          <span>Supplier: {getSupplierName(feedType)}</span>
                        )}

                        {getPreferredMeasurementUnit(feedType.preferred_measurement_unit || feedType.unit_of_measure) && (
                          <span>Unit: {getPreferredMeasurementUnit(feedType.preferred_measurement_unit || feedType.unit_of_measure)}</span>
                        )}

                        {feedType.low_stock_threshold != null && (
                          <span>Alert at: {feedType.low_stock_threshold}{feedType.low_stock_threshold_unit ? ` ${feedType.low_stock_threshold_unit}` : ' kg'}</span>
                        )}

                        {shouldShowNutrition(getFeedNutrition(feedType)) && (
                          <div className="flex flex-wrap gap-3">
                            {getFeedNutrition(feedType).protein_content != null && (
                              <span>Protein: {getFeedNutrition(feedType).protein_content}%</span>
                            )}
                            {getFeedNutrition(feedType).energy_content != null && (
                              <span>Energy: {getFeedNutrition(feedType).energy_content}MJ/kg</span>
                            )}
                            {getFeedNutrition(feedType).fat_content != null && (
                              <span>Fat: {getFeedNutrition(feedType).fat_content}%</span>
                            )}
                            {getFeedNutrition(feedType).fiber_content != null && (
                              <span>Fiber: {getFeedNutrition(feedType).fiber_content}%</span>
                            )}
                          </div>
                        )}

                        {feedType.notes && !parseSupplierFromNotes(feedType.notes) && (
                          <span>Notes: {feedType.notes}</span>
                        )}
                      </div>
                      
                      {/* Collapsible Target Animals Section */}
                      {hasAnimalCategories && (
                        <div className="mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCardExpansion(feedType.id)}
                            className="h-auto p-0 text-xs text-gray-500 hover:text-gray-700"
                          >
                            <span className="mr-1">Target Animals</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                          
                          {isExpanded && (
                            <div className="mt-2 p-2 bg-gray-50 rounded-md">
                              <div className="flex flex-wrap gap-2">
                                {feedType.animal_categories.map((categoryId: string) => {
                                  const category = animalCategories.find(cat => cat.id === categoryId)
                                  return (
                                    <Badge key={categoryId} variant="outline" className="text-xs">
                                      {category ? category.name : categoryId}
                                    </Badge>
                                  )
                                })}
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                This feed type is suitable for {feedType.animal_categories.length} animal categor{feedType.animal_categories.length === 1 ? 'y' : 'ies'}.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className={`flex items-center ${isMobile ? 'w-full justify-between' : 'ml-4 space-x-4'}`}>
                      <div className="text-right">
                        {feedType.typical_cost_per_kg && (
                          <p className={`font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>
                            KSh{feedType.typical_cost_per_kg}/kg
                          </p>
                        )}
                        <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          Typical Cost
                        </p>
                      </div>
                      
                      <ActionButtons feedType={feedType} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Wheat className="mx-auto h-8 w-8 text-gray-400 mb-3" />
            <h3 className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : 'text-base'}`}>
              No feed types
            </h3>
            <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'} mt-1`}>
              Create your first feed type to get started.
            </p>
            {canManageFeed && (
              <Button 
                className="mt-4" 
                onClick={onAddFeedType}
                size={isMobile ? "sm" : "default"}
              >
                Add Feed Type
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Edit Modal */}
      <AddFeedTypeModal
        farmId={farmId}
        feedType={editingFeedType}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingFeedType(null)
        }}
        onSuccess={handleEditSuccess}
        feedTypeCategories={feedTypeCategories}
        animalCategories={animalCategories}
        weightConversions={weightConversions}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feed Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingFeedType?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowDeleteDialog(false)
                setDeletingFeedType(null)
              }}
              disabled={deleteLoading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}