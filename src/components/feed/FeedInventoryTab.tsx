'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { 
  Package, 
  MoreVertical, 
  PlusCircle,
  Edit,
  MinusCircle,
  AlertTriangle
} from 'lucide-react'

const editInventorySchema = z.object({
  quantity_kg: z.number().min(0, 'Quantity must be 0 or greater'),
  quantity_in_preferred_unit: z.number().min(0, 'Quantity must be 0 or greater'),
  cost_per_kg: z.number().min(0, 'Cost must be positive').optional(),
  total_cost: z.number().min(0, 'Total cost must be positive').optional(),
  purchase_date: z.string().min(1, 'Purchase date is required'),
  expiry_date: z.string().optional(),
  supplier: z.string().optional(),
  batch_number: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => data.cost_per_kg !== undefined || data.total_cost !== undefined,
  {
    message: "Either cost per kg or total cost must be provided",
    path: ["cost_per_kg"],
  }
)

type EditInventoryFormData = z.infer<typeof editInventorySchema>

interface FeedInventoryTabProps {
  inventory: Array<{
    id: string;
    farm_id: string;
    feed_type_id: string;
    quantity_in_stock: number; // Current stock level
    minimum_threshold?: number;
    maximum_capacity?: number;
    last_restocked_date?: string;
    storage_location?: string;
    updated_at: string;
    feed_types?: {
      id: string;
      name: string;
      description?: string;
      typical_cost_per_kg?: number;
      preferred_measurement_unit?: string;
      low_stock_threshold?: number;
    };
    // Latest purchase information
    latest_purchase?: {
      id: string;
      purchase_date: string;
      expiry_date?: string;
      supplier?: string;
      batch_number?: string;
      notes?: string;
      cost_per_kg?: number;
      quantity_kg: number; // Original purchase quantity
      source: string;
    };
    // Nutritional data from latest purchase
    nutritional_data?: {
      protein_pct?: number;
      fat_pct?: number;
      fiber_pct?: number;
      moisture_pct?: number;
      ash_pct?: number;
      energy_mj_kg?: number;
      dry_matter_pct?: number;
      ndf_pct?: number;
      adf_pct?: number;
      notes?: string;
    };
  }>
  feedTypes: any[]
  consumptionRecords: any[] // Add consumption records to calculate actual consumption
  weightConversions: Array<{
    id: string;
    unit_name: string;
    unit_symbol: string;
    conversion_to_kg: number;
    description: string;
    is_default: boolean;
  }>
  isMobile: boolean
  canManageFeed: boolean
  onAddInventory: () => void
  onInventoryUpdated: (updatedInventory: any[]) => void
}

export function FeedInventoryTab({
  inventory,
  feedTypes,
  consumptionRecords = [],
  weightConversions,
  isMobile,
  canManageFeed,
  onAddInventory,
  onInventoryUpdated
}: FeedInventoryTabProps) {
  const [restocking, setRestocking] = useState<any | null>(null)
  const [editing, setEditing] = useState<any | null>(null)
  const [depleting, setDepleting] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const form = useForm<EditInventoryFormData>({
    resolver: zodResolver(editInventorySchema),
  })

  // Calculate enhanced inventory data with consumption information
  const enhancedInventory = useMemo(() => {
    return inventory.map(item => {
      // Find consumption records for this specific feed type
      const itemConsumption = consumptionRecords.filter(record => 
        record.feed_type_id === item.feed_type_id
      )

      // Calculate total consumed for this feed type
      const totalConsumed = itemConsumption.reduce((sum, record) => 
        sum + (record.quantity_kg || 0), 0
      )

      // Current stock level from inventory
      const currentStock = item.quantity_in_stock
      
      // Calculate consumption metrics
      const consumedQuantity = totalConsumed
      const remainingQuantity = currentStock
      const consumptionPercentage = consumedQuantity > 0 ? (consumedQuantity / (consumedQuantity + currentStock)) * 100 : 0
      const remainingPercentage = currentStock > 0 ? 100 : 0

      // Check if this inventory needs to be updated based on consumption
      const needsQuantityUpdate = false // We'll handle this differently now

      return {
        ...item,
        consumedQuantity,
        remainingQuantity: currentStock,
        consumptionPercentage,
        remainingPercentage,
        needsQuantityUpdate,
        consumptionCount: itemConsumption.length,
        // Add purchase information
        purchase_date: item.latest_purchase?.purchase_date,
        expiry_date: item.latest_purchase?.expiry_date,
        supplier: item.latest_purchase?.supplier,
        batch_number: item.latest_purchase?.batch_number,
        notes: item.latest_purchase?.notes,
        cost_per_kg: item.latest_purchase?.cost_per_kg,
        initial_quantity_kg: item.latest_purchase?.quantity_kg,
        source: item.latest_purchase?.source,
      }
    })
  }, [inventory, consumptionRecords])

  // Helper function to get weight conversion info
  const getWeightConversion = (unitId: string) => {
    return weightConversions.find(wc => wc.id === unitId)
  }

  // Convert kg to preferred unit
  const convertFromKg = (kgValue: number, unitId: string): number => {
    const conversion = getWeightConversion(unitId)
    if (!conversion || !conversion.conversion_to_kg) return kgValue
    return Number((kgValue / conversion.conversion_to_kg).toFixed(2))
  }

  // Convert preferred unit to kg
  const convertToKg = (preferredValue: number, unitId: string): number => {
    const conversion = getWeightConversion(unitId)
    if (!conversion || !conversion.conversion_to_kg) return preferredValue
    return Number((preferredValue * conversion.conversion_to_kg).toFixed(2))
  }

  // Get unit display info
  const getUnitDisplay = (unitId: string) => {
    const conversion = getWeightConversion(unitId)
    return {
      name: conversion?.unit_name || 'kg',
      symbol: conversion?.unit_symbol || 'kg'
    }
  }

  // Check if item is low stock
  const isLowStock = (item: any) => {
    const threshold = item.minimum_threshold || item.feed_types?.low_stock_threshold
    return threshold && item.quantity_in_stock <= threshold
  }

  // Check if item is expired
  const isExpired = (item: any) => {
    if (!item.latest_purchase?.expiry_date) return false
    return new Date(item.latest_purchase.expiry_date) < new Date()
  }

  // Check if item is expiring soon (within 7 days)
  const isExpiringSoon = (item: any) => {
    if (!item.latest_purchase?.expiry_date) return false
    const expiryDate = new Date(item.latest_purchase.expiry_date)
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    return expiryDate <= sevenDaysFromNow && expiryDate >= new Date()
  }

  // Handle edit inventory
  const handleEditInventory = (item: any) => {
    setEditing(item)
    setError(null)
    
    // Pre-populate form with existing data from latest purchase
    const preferredUnit = item.feed_types?.preferred_measurement_unit
    const preferredQuantity = preferredUnit ? convertFromKg(item.remainingQuantity, preferredUnit) : item.remainingQuantity

    form.reset({
      quantity_kg: item.remainingQuantity,
      quantity_in_preferred_unit: preferredQuantity,
      cost_per_kg: item.cost_per_kg,
      total_cost: item.remainingQuantity * (item.cost_per_kg || 0),
      purchase_date: item.latest_purchase?.purchase_date || '',
      expiry_date: item.latest_purchase?.expiry_date || '',
      supplier: item.latest_purchase?.supplier || '',
      batch_number: item.latest_purchase?.batch_number || '',
      notes: item.latest_purchase?.notes || '',
    })
  }

  // Handle preferred unit quantity changes in edit form
  const handlePreferredQuantityChange = (value: string) => {
    const numValue = value === '' ? 0 : Number(value)
    const preferredUnit = editing?.feed_types?.preferred_measurement_unit
    
    form.setValue('quantity_in_preferred_unit', numValue)
    
    if (preferredUnit) {
      const kgValue = convertToKg(numValue, preferredUnit)
      form.setValue('quantity_kg', kgValue)
      
      // Update cost calculations
      const costPerKg = form.getValues('cost_per_kg')
      if (costPerKg && !isCalculating) {
        setIsCalculating(true)
        form.setValue('total_cost', kgValue * costPerKg)
        setIsCalculating(false)
      }
    }
  }

  // Handle kg quantity changes in edit form
  const handleKgQuantityChange = (value: string) => {
    const numValue = value === '' ? 0 : Number(value)
    const preferredUnit = editing?.feed_types?.preferred_measurement_unit
    
    form.setValue('quantity_kg', numValue)
    
    if (preferredUnit) {
      const preferredValue = convertFromKg(numValue, preferredUnit)
      form.setValue('quantity_in_preferred_unit', preferredValue)
    }
    
    // Update cost calculations
    const costPerKg = form.getValues('cost_per_kg')
    if (costPerKg && !isCalculating) {
      setIsCalculating(true)
      form.setValue('total_cost', numValue * costPerKg)
      setIsCalculating(false)
    }
  }

  // Handle cost per kg changes in edit form
  const handleCostPerKgChange = (value: string) => {
    if (isCalculating) return
    
    const numValue = value === '' ? undefined : Number(value)
    form.setValue('cost_per_kg', numValue)
    
    const quantity = form.getValues('quantity_kg')
    if (numValue && quantity) {
      setIsCalculating(true)
      form.setValue('total_cost', quantity * numValue)
      setIsCalculating(false)
    }
  }

  // Handle total cost changes in edit form
  const handleTotalCostChange = (value: string) => {
    if (isCalculating) return
    
    const numValue = value === '' ? undefined : Number(value)
    form.setValue('total_cost', numValue)
    
    const quantity = form.getValues('quantity_kg')
    if (numValue && quantity && quantity > 0) {
      setIsCalculating(true)
      form.setValue('cost_per_kg', numValue / quantity)
      setIsCalculating(false)
    }
  }

  // Submit edit form
  const handleEditSubmit = async (data: EditInventoryFormData) => {
    if (!editing) return
    
    setLoading(true)
    setError(null)

    try {
      // Ensure we have cost_per_kg
      let finalCostPerKg = data.cost_per_kg
      if (!finalCostPerKg && data.total_cost && data.quantity_kg && data.quantity_kg > 0) {
        finalCostPerKg = data.total_cost / data.quantity_kg
      }

      const response = await fetch(`/api/feed/inventory/${editing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          cost_per_kg: finalCostPerKg,
          expiry_date: data.expiry_date || null,
          // Store initial quantity if updating for the first time
          initial_quantity_kg: editing.initialQuantity,
          // Remove calculated fields not in database
          total_cost: undefined,
          quantity_in_preferred_unit: undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update inventory')
      }

      const result = await response.json()
      
      // Update local inventory state
      const updatedInventory = inventory.map(item => 
        item.id === editing.id ? { 
          ...item, 
          ...result.data,
          initial_quantity_kg: editing.initialQuantity 
        } : item
      )
      
      onInventoryUpdated(updatedInventory)
      setEditing(null)
      form.reset()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Handle mark as depleted
  const handleMarkDepleted = async () => {
    if (!depleting) return

    setLoading(true)
    try {
      const response = await fetch(`/api/feed/inventory/${depleting.id}/deplete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity_kg: 0, // Set to zero
          depleted_at: new Date().toISOString(),
          notes: `${depleting.notes || ''}\nMarked as depleted on ${new Date().toLocaleDateString()}`
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to mark as depleted')
      }

      // Remove from local inventory (depleted items)
      const updatedInventory = inventory.filter(item => item.id !== depleting.id)
      onInventoryUpdated(updatedInventory)
      setDepleting(null)

    } catch (error) {
      console.error('Error marking as depleted:', error)
      setError('Failed to mark inventory as depleted')
    } finally {
      setLoading(false)
    }
  }

  // Action buttons component
  const ActionButtons = ({ item }: { item: any }) => {
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
            <DropdownMenuItem onClick={() => setRestocking(item)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Restock
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEditInventory(item)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDepleting(item)}>
              <MinusCircle className="mr-2 h-4 w-4" />
              Mark Depleted
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return (
      <div className="flex flex-col space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRestocking(item)}
        >
          <PlusCircle className="h-4 w-4 mr-1" />
          Restock
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEditInventory(item)}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDepleting(item)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <MinusCircle className="h-4 w-4 mr-1" />
          Depleted
        </Button>
      </div>
    )
  }

  // Status badges component
  const StatusBadges = ({ item }: { item: any }) => (
    <div className="flex flex-wrap gap-1 mt-1">
      {isExpired(item) && (
        <Badge variant="destructive" className="text-xs">
          Expired
        </Badge>
      )}
      {isExpiringSoon(item) && !isExpired(item) && (
        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
          Expires Soon
        </Badge>
      )}
      {isLowStock(item) && (
        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
          Low Stock
        </Badge>
      )}
      {item.remainingQuantity === 0 && (
        <Badge variant="outline" className="text-xs">
          Depleted
        </Badge>
      )}
      {item.needsQuantityUpdate && (
        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
          Sync Needed
        </Badge>
      )}
    </div>
  )

  // Quantity display component
  const QuantityDisplay = ({ item }: { item: any }) => {
    const preferredUnit = item.feed_types?.preferred_measurement_unit
    const unitDisplay = preferredUnit ? getUnitDisplay(preferredUnit) : null
    const remainingPreferred = preferredUnit ? convertFromKg(item.remainingQuantity, preferredUnit) : null
    const initialPreferred = preferredUnit && item.initial_quantity_kg ? convertFromKg(item.initial_quantity_kg, preferredUnit) : null

    return (
      <div className="space-y-2">
        {/* Main quantity display */}
        <div className="flex items-center space-x-4">
          {remainingPreferred !== null && unitDisplay && (
            <div className="text-sm">
              <span className="font-bold text-blue-700 text-lg">
                {remainingPreferred.toFixed(1)} {unitDisplay.symbol}
              </span>
              <span className="text-gray-500 text-xs ml-1">
                remaining
              </span>
            </div>
          )}
          <div className="text-sm">
            <span className="font-bold text-lg">
              {item.remainingQuantity.toFixed(1)} kg
            </span>
            <span className="text-gray-500 text-xs ml-1">
              in stock
            </span>
          </div>
        </div>

        {/* Stock level indicators */}
        <div className="space-y-1">
          {item.minimum_threshold && (
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Minimum threshold:</span>
              <span className="font-medium">
                {item.minimum_threshold} kg
                {initialPreferred && unitDisplay && (
                  <span className="ml-1">({convertFromKg(item.minimum_threshold, preferredUnit).toFixed(1)} {unitDisplay.symbol})</span>
                )}
              </span>
            </div>
          )}
          
          {item.maximum_capacity && (
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Maximum capacity:</span>
              <span className="font-medium">
                {item.maximum_capacity} kg
                {initialPreferred && unitDisplay && (
                  <span className="ml-1">({convertFromKg(item.maximum_capacity, preferredUnit).toFixed(1)} {unitDisplay.symbol})</span>
                )}
              </span>
            </div>
          )}

          {/* Capacity percentage bar */}
          {item.maximum_capacity && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  (item.remainingQuantity / item.maximum_capacity) >= 0.8 ? 'bg-red-500' :
                  (item.remainingQuantity / item.maximum_capacity) >= 0.5 ? 'bg-orange-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min((item.remainingQuantity / item.maximum_capacity) * 100, 100)}%` }}
              />
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {item.consumptionCount} feeding session{item.consumptionCount !== 1 ? 's' : ''} recorded
            </span>
            <span className="text-gray-500">
              Updated: {new Date(item.updated_at).toLocaleDateString()}
            </span>
          </div>

          {/* Last restocked info */}
          {item.last_restocked_date && (
            <div className="text-xs text-gray-500">
              Last restocked: {new Date(item.last_restocked_date).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Unit conversion info */}
        {preferredUnit && unitDisplay && (
          <div className="text-xs text-gray-500">
            Conversion: 1 {unitDisplay.symbol} = {
              getWeightConversion(preferredUnit)?.conversion_to_kg
            } kg
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>Feed Inventory</CardTitle>
          <CardDescription className={isMobile ? 'text-sm' : ''}>
            Track your feed purchases and current stock levels with consumption integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enhancedInventory.length > 0 ? (
            <div className="space-y-3">
              {enhancedInventory.map((item: any) => {
                return (
                  <div key={item.id} className={`p-4 border rounded-lg ${
                    isExpired(item) ? 'border-red-200 bg-red-50' : 
                    isExpiringSoon(item) ? 'border-orange-200 bg-orange-50' :
                    isLowStock(item) ? 'border-yellow-200 bg-yellow-50' :
                    item.needsQuantityUpdate ? 'border-blue-200 bg-blue-50' :
                    'border-gray-200'
                  } ${isMobile ? 'space-y-3' : 'flex items-start justify-between'}`}>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium ${isMobile ? 'text-sm' : 'text-base'} truncate`}>
                            {item.feed_types?.name}
                          </h4>
                          <StatusBadges item={item} />
                        </div>
                      </div>

                      {/* Quantity Display */}
                      <div className="mb-3">
                        <QuantityDisplay item={item} />
                      </div>

                      {/* Purchase Info */}
                      <div className="space-y-1">
                        {item.cost_per_kg && (
                          <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            KSh{item.cost_per_kg}/kg
                            {item.latest_purchase?.supplier && ` • ${item.latest_purchase.supplier}`}
                            {item.latest_purchase?.batch_number && ` • Batch: ${item.latest_purchase.batch_number}`}
                            {item.source && ` • ${item.source}`}
                          </p>
                        )}
                        {item.latest_purchase?.purchase_date && (
                          <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                            Last purchased: {new Date(item.latest_purchase.purchase_date).toLocaleDateString()}
                            {item.latest_purchase?.expiry_date && ` • Expires: ${new Date(item.latest_purchase.expiry_date).toLocaleDateString()}`}
                          </p>
                        )}
                        {item.storage_location && (
                          <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                            Storage: {item.storage_location}
                          </p>
                        )}
                        {item.latest_purchase?.notes && (
                          <p className={`text-gray-500 italic ${isMobile ? 'text-xs' : 'text-xs'}`}>
                            {item.latest_purchase.notes}
                          </p>
                        )}
                      </div>

                      {/* Nutritional Data */}
                      {item.nutritional_data && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                          <div className="font-medium text-green-800 mb-1">Nutritional Profile</div>
                          <div className="grid grid-cols-2 gap-1 text-green-700">
                            {item.nutritional_data.protein_pct && (
                              <span>Protein: {item.nutritional_data.protein_pct}%</span>
                            )}
                            {item.nutritional_data.energy_mj_kg && (
                              <span>Energy: {item.nutritional_data.energy_mj_kg} MJ/kg</span>
                            )}
                            {item.nutritional_data.fiber_pct && (
                              <span>Fiber: {item.nutritional_data.fiber_pct}%</span>
                            )}
                            {item.nutritional_data.fat_pct && (
                              <span>Fat: {item.nutritional_data.fat_pct}%</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={`${isMobile ? 'flex justify-between items-center mt-3' : 'flex items-start space-x-4 ml-4'}`}>
                      <div className="text-right">
                        <p className={`font-bold ${isMobile ? 'text-base' : 'text-lg'} text-green-700`}>
                          KSh{(item.remainingQuantity * (item.cost_per_kg || 0)).toFixed(2)}
                        </p>
                        <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          Current Value
                        </p>
                        {item.initial_quantity_kg && (
                          <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                            Original: KSh{(item.initial_quantity_kg * (item.cost_per_kg || 0)).toFixed(2)}
                          </p>
                        )}
                      </div>
                      
                      <ActionButtons item={item} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="mx-auto h-8 w-8 text-gray-400 mb-3" />
              <h3 className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : 'text-base'}`}>
                No inventory records
              </h3>
              <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'} mt-1`}>
                Start by adding your first feed purchase.
              </p>
              {canManageFeed && (
                <Button 
                  className="mt-4" 
                  onClick={onAddInventory}
                  disabled={feedTypes.length === 0}
                  size={isMobile ? "sm" : "default"}
                >
                  Add Inventory
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Inventory Modal */}
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        className="max-w-2xl"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Edit Inventory: {editing?.feed_types?.name}
          </h3>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-6">
            {/* Consumption Information */}
            {editing && (
              <div className="p-3 bg-gray-50 rounded-lg border">
                <h5 className="font-medium text-gray-800 mb-2">Stock & Consumption Summary</h5>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Current stock level: {editing.remainingQuantity.toFixed(1)} kg</div>
                  <div>Total consumed: {editing.consumedQuantity.toFixed(1)} kg</div>
                  <div>Consumption sessions: {editing.consumptionCount}</div>
                  {editing.minimum_threshold && (
                    <div>Minimum threshold: {editing.minimum_threshold} kg</div>
                  )}
                  {editing.maximum_capacity && (
                    <div>Maximum capacity: {editing.maximum_capacity} kg</div>
                  )}
                  {editing.last_restocked_date && (
                    <div>Last restocked: {new Date(editing.last_restocked_date).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            )}

            {/* Quantity Section */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">Current Remaining Quantity</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editing?.feed_types?.preferred_measurement_unit && (
                  <div>
                    <Label>
                      Quantity ({getUnitDisplay(editing.feed_types.preferred_measurement_unit).symbol})
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.watch('quantity_in_preferred_unit') || ''}
                      onChange={(e) => handlePreferredQuantityChange(e.target.value)}
                      placeholder="Enter remaining quantity"
                    />
                  </div>
                )}

                <div>
                  <Label>Remaining Quantity (KG)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.watch('quantity_kg') || ''}
                    onChange={(e) => handleKgQuantityChange(e.target.value)}
                    placeholder="Remaining quantity in kg"
                  />
                </div>
              </div>
            </div>

            {/* Cost Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Cost per KG (KSh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.watch('cost_per_kg') || ''}
                  onChange={(e) => handleCostPerKgChange(e.target.value)}
                  placeholder="Cost per kg"
                />
              </div>

              <div>
                <Label>Current Value (KSh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.watch('total_cost') || ''}
                  onChange={(e) => handleTotalCostChange(e.target.value)}
                  placeholder="Current total value"
                  className="bg-gray-50"
                  readOnly
                />
              </div>
            </div>

            {/* Date Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Purchase Date</Label>
                <Input
                  type="date"
                  {...form.register('purchase_date')}
                />
              </div>

              <div>
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  {...form.register('expiry_date')}
                />
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Supplier</Label>
                <Input
                  {...form.register('supplier')}
                  placeholder="Supplier name"
                />
              </div>

              <div>
                <Label>Batch Number</Label>
                <Input
                  {...form.register('batch_number')}
                  placeholder="Batch/lot number"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <textarea
                {...form.register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Update Inventory'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Restock Confirmation */}
      <AlertDialog open={!!restocking} onOpenChange={() => setRestocking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restock Feed</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to add more "{restocking?.feed_types?.name}" to your inventory?
              This will open the add inventory form with this feed type pre-selected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setRestocking(null)
                onAddInventory()
              }}
            >
              Add More Stock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deplete Confirmation */}
      <AlertDialog open={!!depleting} onOpenChange={() => setDepleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Depleted</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark "{depleting?.feed_types?.name}" as completely depleted?
              <br /><br />
              Current stock level: {depleting?.remainingQuantity || depleting?.quantity_in_stock} kg
              <br />
              Consumed so far: {depleting?.consumedQuantity?.toFixed(1) || 0} kg
              <br /><br />
              This action will set the stock level to zero and mark it as depleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkDepleted}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Mark as Depleted'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}