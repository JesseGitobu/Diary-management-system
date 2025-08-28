'use client'

import { useState } from 'react'
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
  AlertTriangle, 
  CheckCircle, 
  MoreVertical, 
  MinusCircle,
  PlusCircle,
  RefreshCw
} from 'lucide-react'

interface FeedInventoryTabProps {
  inventory: Array<{
    id: string;
    feed_type_id: string;
    quantity_kg: number;
    cost_per_kg: number;
    purchase_date: string;
    expiry_date?: string;
    supplier?: string;
    batch_number?: string;
    notes?: string;
    feed_types?: {
      id: string;
      name: string;
      preferred_measurement_unit?: string;
      low_stock_threshold?: number;
    };
  }>
  feedTypes: any[]
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

interface DepletionData {
  consumed_quantity_kg: number;
  consumed_quantity_preferred?: number;
  consumption_date: string;
  notes?: string;
  animals_fed?: string;
}

export function FeedInventoryTab({
  inventory,
  feedTypes,
  weightConversions,
  isMobile,
  canManageFeed,
  onAddInventory,
  onInventoryUpdated
}: FeedInventoryTabProps) {
  const [depleting, setDepleting] = useState<any | null>(null)
  const [restocking, setRestocking] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [depletionData, setDepletionData] = useState<DepletionData>({
    consumed_quantity_kg: 0,
    consumed_quantity_preferred: 0,
    consumption_date: new Date().toISOString().split('T')[0],
    notes: '',
    animals_fed: ''
  })

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
    const threshold = item.feed_types?.low_stock_threshold
    return threshold && item.quantity_kg <= threshold
  }

  // Check if item is expired
  const isExpired = (item: any) => {
    if (!item.expiry_date) return false
    return new Date(item.expiry_date) < new Date()
  }

  // Check if item is expiring soon (within 7 days)
  const isExpiringSoon = (item: any) => {
    if (!item.expiry_date) return false
    const expiryDate = new Date(item.expiry_date)
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    return expiryDate <= sevenDaysFromNow && expiryDate >= new Date()
  }

  // Start depletion process
  const handleStartDepletion = (item: any) => {
    setDepleting(item)
    const preferredUnit = item.feed_types?.preferred_measurement_unit
    setDepletionData({
      consumed_quantity_kg: item.quantity_kg,
      consumed_quantity_preferred: preferredUnit ? 
        convertFromKg(item.quantity_kg, preferredUnit) : undefined,
      consumption_date: new Date().toISOString().split('T')[0],
      notes: '',
      animals_fed: ''
    })
  }

  // Handle preferred unit quantity change in depletion
  const handlePreferredQuantityChange = (value: string) => {
    const numValue = Number(value) || 0
    const preferredUnit = depleting?.feed_types?.preferred_measurement_unit
    
    setDepletionData(prev => ({
      ...prev,
      consumed_quantity_preferred: numValue,
      consumed_quantity_kg: preferredUnit ? convertToKg(numValue, preferredUnit) : numValue
    }))
  }

  // Handle kg quantity change in depletion
  const handleKgQuantityChange = (value: string) => {
    const numValue = Number(value) || 0
    const preferredUnit = depleting?.feed_types?.preferred_measurement_unit
    
    setDepletionData(prev => ({
      ...prev,
      consumed_quantity_kg: numValue,
      consumed_quantity_preferred: preferredUnit ? 
        convertFromKg(numValue, preferredUnit) : undefined
    }))
  }

  // Confirm depletion
  const confirmDepletion = async () => {
    if (!depleting) return

    setLoading(true)
    try {
      const newQuantity = Math.max(0, depleting.quantity_kg - depletionData.consumed_quantity_kg)
      
      const response = await fetch(`/api/feed/inventory/${depleting.id}/consume`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...depletionData,
          new_quantity_kg: newQuantity,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update inventory')
      }

      // Update inventory locally
      const updatedInventory = inventory.map(item => 
        item.id === depleting.id 
          ? { ...item, quantity_kg: newQuantity }
          : item
      ).filter(item => item.quantity_kg > 0) // Remove depleted items

      onInventoryUpdated(updatedInventory)
      setDepleting(null)
      setDepletionData({
        consumed_quantity_kg: 0,
        consumed_quantity_preferred: 0,
        consumption_date: new Date().toISOString().split('T')[0],
        notes: '',
        animals_fed: ''
      })

    } catch (error) {
      console.error('Error updating inventory:', error)
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
            <DropdownMenuItem onClick={() => handleStartDepletion(item)}>
              <MinusCircle className="mr-2 h-4 w-4" />
              Mark as Consumed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRestocking(item)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Restock
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return (
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleStartDepletion(item)}
        >
          <MinusCircle className="h-4 w-4 mr-1" />
          Consume
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRestocking(item)}
        >
          <PlusCircle className="h-4 w-4 mr-1" />
          Restock
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
      {item.quantity_kg === 0 && (
        <Badge variant="outline" className="text-xs">
          Depleted
        </Badge>
      )}
    </div>
  )

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>Feed Inventory</CardTitle>
          <CardDescription className={isMobile ? 'text-sm' : ''}>
            Manage your feed purchases and stock levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inventory.length > 0 ? (
            <div className="space-y-3">
              {inventory.map((item: any) => {
                const preferredUnit = item.feed_types?.preferred_measurement_unit
                const unitDisplay = preferredUnit ? getUnitDisplay(preferredUnit) : null
                const preferredQuantity = preferredUnit ? 
                  convertFromKg(item.quantity_kg, preferredUnit) : null

                return (
                  <div key={item.id} className={`p-4 border rounded-lg ${
                    isExpired(item) ? 'border-red-200 bg-red-50' : 
                    isExpiringSoon(item) ? 'border-orange-200 bg-orange-50' :
                    isLowStock(item) ? 'border-yellow-200 bg-yellow-50' :
                    'border-gray-200'
                  } ${isMobile ? 'space-y-3' : 'flex items-center justify-between'}`}>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium ${isMobile ? 'text-sm' : 'text-base'} truncate`}>
                            {item.feed_types?.name}
                          </h4>
                          <StatusBadges item={item} />
                        </div>
                      </div>

                      {/* Quantity Display */}
                      <div className="space-y-1 mb-2">
                        <div className="flex items-center space-x-4">
                          {preferredQuantity !== null && unitDisplay && (
                            <div className="text-sm">
                              <span className="font-medium text-blue-700">
                                {preferredQuantity} {unitDisplay.symbol}
                              </span>
                              <span className="text-gray-500 text-xs ml-1">
                                ({unitDisplay.name})
                              </span>
                            </div>
                          )}
                          <div className="text-sm">
                            <span className="font-medium">
                              {item.quantity_kg} kg
                            </span>
                          </div>
                        </div>
                        
                        {preferredUnit && (
                          <div className="text-xs text-gray-500">
                            Conversion: 1 {unitDisplay?.symbol} = {
                              getWeightConversion(preferredUnit)?.conversion_to_kg
                            } kg
                          </div>
                        )}
                      </div>

                      {/* Additional Info */}
                      <div className="space-y-1">
                        <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          KSh{item.cost_per_kg}/kg
                          {item.supplier && ` • ${item.supplier}`}
                          {item.batch_number && ` • Batch: ${item.batch_number}`}
                        </p>
                        <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                          Purchased: {new Date(item.purchase_date).toLocaleDateString()}
                          {item.expiry_date && ` • Expires: ${new Date(item.expiry_date).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>

                    <div className={`${isMobile ? 'flex justify-between items-center' : 'flex items-center space-x-4'}`}>
                      <div className="text-right">
                        <p className={`font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>
                          KSh{(item.quantity_kg * item.cost_per_kg).toFixed(2)}
                        </p>
                        <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          Total Value
                        </p>
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

      {/* Depletion Modal */}
      <Modal
        isOpen={!!depleting}
        onClose={() => setDepleting(null)}
        className="max-w-lg"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Mark Feed as Consumed
          </h3>
          
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800">
                {depleting?.feed_types?.name}
              </h4>
              <p className="text-sm text-blue-700">
                Current Stock: {depleting?.quantity_kg} kg
                {depleting?.feed_types?.preferred_measurement_unit && (
                  <span className="ml-2">
                    ({convertFromKg(
                      depleting.quantity_kg, 
                      depleting.feed_types.preferred_measurement_unit
                    )} {getUnitDisplay(depleting.feed_types.preferred_measurement_unit).symbol})
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {depleting?.feed_types?.preferred_measurement_unit && (
                <div>
                  <Label>Consumed Quantity ({getUnitDisplay(depleting.feed_types.preferred_measurement_unit).symbol})</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max={convertFromKg(depleting.quantity_kg, depleting.feed_types.preferred_measurement_unit)}
                    value={depletionData.consumed_quantity_preferred || 0}
                    onChange={(e) => handlePreferredQuantityChange(e.target.value)}
                  />
                </div>
              )}

              <div>
                <Label>Consumed Quantity (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max={depleting?.quantity_kg || 0}
                  value={depletionData.consumed_quantity_kg}
                  onChange={(e) => handleKgQuantityChange(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Consumption Date</Label>
              <Input
                type="date"
                value={depletionData.consumption_date}
                onChange={(e) => setDepletionData(prev => ({
                  ...prev,
                  consumption_date: e.target.value
                }))}
              />
            </div>

            <div>
              <Label>Animals Fed (Optional)</Label>
              <Input
                placeholder="e.g., Dairy cows, Growing heifers"
                value={depletionData.animals_fed}
                onChange={(e) => setDepletionData(prev => ({
                  ...prev,
                  animals_fed: e.target.value
                }))}
              />
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                placeholder="Any additional notes about consumption..."
                value={depletionData.notes}
                onChange={(e) => setDepletionData(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
              />
            </div>

            {depletionData.consumed_quantity_kg > 0 && (
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-green-800">
                  <div className="font-medium">After consumption:</div>
                  <div>
                    Remaining: {Math.max(0, (depleting?.quantity_kg || 0) - depletionData.consumed_quantity_kg)} kg
                  </div>
                  {depletionData.consumed_quantity_kg >= (depleting?.quantity_kg || 0) && (
                    <div className="text-orange-600 font-medium">
                      ⚠️ This will mark the inventory as fully depleted
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
            <Button
              variant="outline"
              onClick={() => setDepleting(null)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDepletion}
              disabled={loading || depletionData.consumed_quantity_kg <= 0}
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Confirm Consumption'}
            </Button>
          </div>
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
    </>
  )
}