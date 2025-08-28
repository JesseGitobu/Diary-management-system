'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Wheat, Edit, Trash2, MoreVertical } from 'lucide-react'
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
import { EditFeedTypeModal } from '@/components/feed/EditFeedTypeModal'

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

  // Helper function to get preferred measurement unit name
  const getPreferredMeasurementUnit = (unitId: string | null) => {
    if (!unitId) return null
    const unit = weightConversions.find(conv => conv.id === unitId)
    return unit ? unit.unit_name : null
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
            {feedTypes.map((feedType: any) => (
              <div key={feedType.id} className={`flex items-center justify-between p-3 border rounded-lg ${isMobile ? 'flex-col items-start space-y-2' : 'flex-row'}`}>
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
                    {feedType.supplier && (
                      <span>Supplier: {feedType.supplier}</span>
                    )}
                    
                    {/* Display preferred measurement unit */}
                    {getPreferredMeasurementUnit(feedType.preferred_measurement_unit) && (
                      <span>Unit: {getPreferredMeasurementUnit(feedType.preferred_measurement_unit)}</span>
                    )}

                    {/* Display low stock threshold */}
                    {feedType.low_stock_threshold && (
                      <span>Alert at: {feedType.low_stock_threshold}kg</span>
                    )}
                    
                    {feedType.nutritional_info && (
                      <div className="flex gap-3">
                        {feedType.nutritional_info.protein_content && (
                          <span>Protein: {feedType.nutritional_info.protein_content}%</span>
                        )}
                        {feedType.nutritional_info.energy_content && (
                          <span>Energy: {feedType.nutritional_info.energy_content}MJ/kg</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {feedType.animal_categories && feedType.animal_categories.length > 0 && (
                    <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'} mt-1`}>
                      Suitable for: {formatAnimalCategories(feedType.animal_categories)}
                    </p>
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
            ))}
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
      <EditFeedTypeModal
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