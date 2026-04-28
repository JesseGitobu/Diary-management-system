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
import { AddFeedInventoryModal } from './AddFeedInventoryModal'
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
  Plus,
  PlusCircle,
  Edit,
  MinusCircle,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  ChevronDown,
} from 'lucide-react'

const PAGE_SIZE = 10

const restockSchema = z.object({
  quantity_to_add_kg: z.number().min(0.01, 'Quantity must be greater than 0'),
  quantity_to_add_preferred: z.number().min(0).optional(),
  cost_per_kg: z.number().min(0, 'Cost must be positive').optional(),
  total_cost: z.number().min(0, 'Total cost must be positive').optional(),
  purchase_date: z.string().min(1, 'Purchase date is required'),
  expiry_date: z.string().optional(),
  supplier: z.string().optional(),
  batch_number: z.string().optional(),
  notes: z.string().optional(),
})

type RestockFormData = z.infer<typeof restockSchema>

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
  minimum_threshold: z.number().min(0, 'Minimum threshold must be 0 or greater').optional(),
  maximum_capacity: z.number().min(0, 'Maximum capacity must be 0 or greater').optional(),
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
    source?: string;
    quantity_kg: number; // Current stock level
    minimum_threshold?: number;
    maximum_capacity?: number;
    last_restocked_date?: string;
    storage_location?: string;
    storage_location_id?: string;
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
  storageLocations?: Array<{
    id: string;
    name: string;
    type?: string | null;
    capacity?: number | null;
    currentOccupancy?: number | null;
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
  storageLocations,
  isMobile,
  canManageFeed,
  onAddInventory,
  onInventoryUpdated
}: FeedInventoryTabProps) {
  const [restocking, setRestocking] = useState<any | null>(null)
  const [editing, setEditing] = useState<any | null>(null)
  const [editingViaModal, setEditingViaModal] = useState<any | null>(null)
  const [depleting, setDepleting] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const form = useForm<EditInventoryFormData>({
    resolver: zodResolver(editInventorySchema),
  })

  const restockForm = useForm<RestockFormData>({
    resolver: zodResolver(restockSchema),
    defaultValues: {
      purchase_date: new Date().toISOString().split('T')[0],
    },
  })
  const [restockError, setRestockError] = useState<string | null>(null)
  const [restockLoading, setRestockLoading] = useState(false)
  const [restockIsCalculating, setRestockIsCalculating] = useState(false)

  // ── Search / filter / pagination ──────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'expired' | 'expiring' | 'depleted'>('all')
  const [invPage, setInvPage] = useState(1)

  const handleInvSearch = (v: string) => { setSearch(v); setInvPage(1) }
  const handleInvFilter = (v: typeof statusFilter) => { setStatusFilter(v); setInvPage(1) }

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
      const currentStock = item.quantity_kg || 0

      // Reconstruct original stock from current + consumed (same logic as FeedOverviewTab)
      const originalStock = currentStock + totalConsumed

      // Calculate consumption metrics
      const consumedQuantity = totalConsumed
      const remainingQuantity = currentStock
      const consumptionPercentage = originalStock > 0 ? (totalConsumed / originalStock) * 100 : 0
      const remainingPercentage = originalStock > 0 ? (currentStock / originalStock) * 100 : 0

      // Check if this inventory needs to be updated based on consumption
      const needsQuantityUpdate = false // We'll handle this differently now

      return {
        ...item,
        consumedQuantity,
        remainingQuantity: currentStock,
        consumptionPercentage,
        remainingPercentage,
        originalStock,
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
        source: item.source || (item.latest_purchase as any)?.source || 'purchased',
      }
    })
  }, [inventory, consumptionRecords])

  // ── Filtered + paginated inventory ────────────────────────────────────────
  const filteredInventory = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enhancedInventory.filter((item: any) => {
      const nameMatch = !q || (item.feed_types?.name ?? '').toLowerCase().includes(q)
      const statusMatch =
        statusFilter === 'all' ? true :
          statusFilter === 'low' ? isLowStock(item) :
            statusFilter === 'expired' ? isExpired(item) :
              statusFilter === 'expiring' ? isExpiringSoon(item) :
                statusFilter === 'depleted' ? item.remainingQuantity === 0 :
                  true
      return nameMatch && statusMatch
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enhancedInventory, search, statusFilter])

  const invTotalPages = Math.max(1, Math.ceil(filteredInventory.length / PAGE_SIZE))
  const safeInvPage = Math.min(invPage, invTotalPages)
  const pagedInventory = filteredInventory.slice(
    (safeInvPage - 1) * PAGE_SIZE,
    safeInvPage * PAGE_SIZE
  )

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
    const stock = item.quantity_kg || 0
    return threshold && stock <= threshold
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
    // Normalize the source string to lowercase to match Zod enum ['purchased', 'produced']
    const rawSource = (item.source || 'purchased').toLowerCase();

    // Ensure we only pass valid enum values
    const validSource = (rawSource === 'produced' || rawSource === 'purchased')
      ? rawSource
      : 'purchased';

    const initialData = {
      feed_type_id: item.feed_type_id,
      quantity_kg: item.remainingQuantity || item.quantity_kg || 0,
      cost_per_kg: item.cost_per_kg || item.latest_purchase?.cost_per_kg,
      // Add the normalized source here
      source: validSource,
      source_type: item.latest_purchase?.source_type || null,
      yield_source: item.latest_purchase?.yield_source || null,
      // ... rest of initial data
      purchase_date: item.latest_purchase?.purchase_date || new Date().toISOString().split('T')[0],
      expiry_date: item.latest_purchase?.expiry_date || null,
      supplier: item.latest_purchase?.supplier || null,
      batch_number: item.latest_purchase?.batch_number || null,
      notes: item.latest_purchase?.notes || null,
      storage_location_id: item.storage_location_id || null,
    }
    setEditingViaModal(initialData)
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

      const response = await fetch(`/api/feed/inventory/${editing.feed_type_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          feed_type_id: editing.feed_type_id,
          cost_per_kg: finalCostPerKg,
          expiry_date: data.expiry_date || null,
          minimum_threshold: data.minimum_threshold || null,
          maximum_capacity: data.maximum_capacity || null,
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

      // Update local inventory state using feed_type_id as the identifier
      const updatedInventory = inventory.map(item =>
        item.feed_type_id === editing.feed_type_id ? {
          ...item,
          quantity_kg: data.quantity_kg,
          minimum_threshold: data.minimum_threshold ?? item.minimum_threshold,
          maximum_capacity: data.maximum_capacity ?? item.maximum_capacity,
          updated_at: new Date().toISOString(),
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
      const response = await fetch(`/api/feed/inventory/${depleting.feed_type_id}/deplete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity_kg: 0, // Set to zero
          feed_type_id: depleting.feed_type_id,
          depleted_at: new Date().toISOString(),
          notes: `${depleting.notes || ''}\nMarked as depleted on ${new Date().toLocaleDateString()}`
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to mark as depleted')
      }

      // Remove from local inventory (depleted items)
      const updatedInventory = inventory.filter(item => item.feed_type_id !== depleting.feed_type_id)
      onInventoryUpdated(updatedInventory)
      setDepleting(null)

    } catch (error) {
      setError('Failed to mark inventory as depleted')
    } finally {
      setLoading(false)
    }
  }

  // Restock form handlers
  const handleRestockPreferredQtyChange = (value: string) => {
    const numValue = value === '' ? 0 : Number(value)
    const preferredUnit = restocking?.feed_types?.preferred_measurement_unit
    restockForm.setValue('quantity_to_add_preferred', numValue)
    if (preferredUnit) {
      const kgValue = convertToKg(numValue, preferredUnit)
      restockForm.setValue('quantity_to_add_kg', kgValue)
      const costPerKg = restockForm.getValues('cost_per_kg')
      if (costPerKg && !restockIsCalculating) {
        setRestockIsCalculating(true)
        restockForm.setValue('total_cost', kgValue * costPerKg)
        setRestockIsCalculating(false)
      }
    }
  }

  const handleRestockKgQtyChange = (value: string) => {
    const numValue = value === '' ? 0 : Number(value)
    const preferredUnit = restocking?.feed_types?.preferred_measurement_unit
    restockForm.setValue('quantity_to_add_kg', numValue)
    if (preferredUnit) {
      restockForm.setValue('quantity_to_add_preferred', convertFromKg(numValue, preferredUnit))
    }
    const costPerKg = restockForm.getValues('cost_per_kg')
    if (costPerKg && !restockIsCalculating) {
      setRestockIsCalculating(true)
      restockForm.setValue('total_cost', numValue * costPerKg)
      setRestockIsCalculating(false)
    }
  }

  const handleRestockCostPerKgChange = (value: string) => {
    if (restockIsCalculating) return
    const numValue = value === '' ? undefined : Number(value)
    restockForm.setValue('cost_per_kg', numValue)
    const qty = restockForm.getValues('quantity_to_add_kg')
    if (numValue && qty) {
      setRestockIsCalculating(true)
      restockForm.setValue('total_cost', qty * numValue)
      setRestockIsCalculating(false)
    }
  }

  const handleRestockTotalCostChange = (value: string) => {
    if (restockIsCalculating) return
    const numValue = value === '' ? undefined : Number(value)
    restockForm.setValue('total_cost', numValue)
    const qty = restockForm.getValues('quantity_to_add_kg')
    if (numValue && qty && qty > 0) {
      setRestockIsCalculating(true)
      restockForm.setValue('cost_per_kg', numValue / qty)
      setRestockIsCalculating(false)
    }
  }

  const handleRestockSubmit = async (data: RestockFormData) => {
    if (!restocking) return
    setRestockLoading(true)
    setRestockError(null)
    try {
      let finalCostPerKg = data.cost_per_kg
      if (!finalCostPerKg && data.total_cost && data.quantity_to_add_kg > 0) {
        finalCostPerKg = data.total_cost / data.quantity_to_add_kg
      }
      const response = await fetch('/api/feed/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feed_type_id: restocking.feed_type_id,
          quantity_kg: data.quantity_to_add_kg,
          cost_per_kg: finalCostPerKg,
          purchase_date: data.purchase_date,
          expiry_date: data.expiry_date || null,
          supplier: data.supplier || null,
          batch_number: data.batch_number || null,
          notes: data.notes || null,
          source: 'purchased',
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to restock inventory')
      }
      await response.json()
      // Optimistically update local state: add quantity to restocking item
      const updatedInventory = inventory.map(item =>
        item.feed_type_id === restocking.feed_type_id
          ? { ...item, quantity_kg: item.quantity_kg + data.quantity_to_add_kg }
          : item
      )
      onInventoryUpdated(updatedInventory)
      setRestocking(null)
      restockForm.reset({ purchase_date: new Date().toISOString().split('T')[0] })
    } catch (err) {
      setRestockError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setRestockLoading(false)
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
          {/* {remainingPreferred !== null && unitDisplay && (
            <div className="text-sm">
              <span className="font-bold text-blue-700 text-lg">
                {remainingPreferred.toFixed(1)} {unitDisplay.symbol}
              </span>
              <span className="text-gray-500 text-xs ml-1">
                remaining
              </span>
            </div>
          )} */}
          <div className="text-sm">
              <span className="font-semibold text-gray-700 text-base">
                {item.initial_quantity_kg.toFixed(1)} kg
              </span>
              <span className="text-gray-500 text-xs ml-1">
                initially stocked
              </span>
            </div>
          <div className="text-sm">
            <span className="font-bold text-lg">
              {(item.remainingQuantity ?? item.quantity_kg ?? 0).toFixed(1)} kg
            </span>
            <span className="text-gray-500 text-xs ml-1">
              in stock
            </span>
          </div>
        </div>
        

        {/* Initial stock display */}
        {/* {item.initial_quantity_kg && item.initial_quantity_kg > 0 && (
          <div className="flex items-center space-x-4 pt-2 border-t border-gray-200">
            {initialPreferred !== null && unitDisplay && (
              <div className="text-sm">
                <span className="font-semibold text-gray-700 text-base">
                  {initialPreferred.toFixed(1)} {unitDisplay.symbol}
                </span>
                <span className="text-gray-500 text-xs ml-1">
                  initially stocked
                </span>
              </div>
            )}
            <div className="text-sm">
              <span className="font-semibold text-gray-700 text-base">
                {item.initial_quantity_kg.toFixed(1)} kg
              </span>
              <span className="text-gray-500 text-xs ml-1">
                initially stocked
              </span>
            </div>
          </div>
        )} */}

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
          {(() => {
            // Use maximum_capacity if available, otherwise fall back to initial_quantity_kg
            const capacityRef = item.maximum_capacity || item.initial_quantity_kg
            const hasCapacity = !!capacityRef && capacityRef > 0
            const percentage = hasCapacity ? (item.remainingQuantity / capacityRef) * 100 : 0
            const width = Math.min(percentage, 100)
            
            // Determine color based on percentage and low stock threshold
            const lowStockThreshold = item.minimum_threshold || item.feed_types?.low_stock_threshold || 0
            const thresholdPercentage = lowStockThreshold > 0 ? (lowStockThreshold / capacityRef) * 100 : 0
            
            let barColor = 'bg-green-500' // Default: full
            if (percentage <= thresholdPercentage) {
              barColor = 'bg-red-500' // Critical: at or below threshold
            } else if (percentage <= 50) {
              barColor = 'bg-amber-500' // Warning: between threshold and halfway
            }
            
            return hasCapacity ? (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${barColor}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            ) : null
          })()}

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

  // ── Formulation ingredient breakdown (collapsible) ───────────────────────
  const FormulationIngredients = ({ item }: { item: any }) => {
    const [open, setOpen] = useState(false)
    const ingredients: any[] = item.latest_purchase?.formulation_ingredients ?? []
    
    if (ingredients.length === 0) {
      return null
    }

    const totalIngredientCost = ingredients.reduce((s: number, ing: any) => s + (ing.ingredient_cost ?? 0), 0)
    const batchQty = item.latest_purchase?.quantity_kg ?? (item.quantity_kg || 0)

    return (
      <div className="mt-2 border border-green-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 bg-green-50 hover:bg-green-100 transition-colors text-left"
        >
          <span className="text-xs font-semibold text-green-800 flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''} used
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-green-600 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="bg-white">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-1.5 text-left">Ingredient</th>
                  <th className="px-3 py-1.5 text-right">Qty (kg)</th>
                  <th className="px-3 py-1.5 text-right">%</th>
                  <th className="px-3 py-1.5 text-right">Value (KSh)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ingredients.map((ing: any, idx: number) => {
                  const pct = batchQty > 0 ? ((ing.quantity_kg / batchQty) * 100).toFixed(1) : '—'
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800">{ing.feed_name}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{ing.quantity_kg.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{pct}%</td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {ing.ingredient_cost > 0 ? `KSh ${ing.ingredient_cost.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t border-gray-200 bg-green-50 font-semibold text-xs">
                <tr>
                  <td className="px-3 py-2 text-gray-700">Total</td>
                  <td className="px-3 py-2 text-right text-gray-700">{batchQty?.toFixed(2)} kg</td>
                  <td className="px-3 py-2 text-right text-gray-500">100%</td>
                  <td className="px-3 py-2 text-right text-green-700">
                    {totalIngredientCost > 0 ? `KSh ${totalIngredientCost.toFixed(2)}` : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>Feed Inventory</CardTitle>
              <CardDescription className={isMobile ? 'text-sm' : ''}>
                Track your feed purchases and current stock levels with consumption integration
              </CardDescription>
            </div>
            <Button
              onClick={onAddInventory}
              size="sm"
              className="bg-farm-green hover:bg-farm-green/90 text-white shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              {isMobile ? 'Add' : 'Add Feed Inventory'}
            </Button>
          </div>

          {/* Search + filter bar */}
          <div className={`flex gap-2 mt-3 ${isMobile ? 'flex-col' : 'flex-row items-center'}`}>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <Input
                value={search}
                onChange={e => handleInvSearch(e.target.value)}
                placeholder="Search by feed name…"
                className="pl-8 h-9 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => handleInvFilter(e.target.value as typeof statusFilter)}
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-farm-green"
            >
              <option value="all">All statuses</option>
              <option value="low">Low stock</option>
              <option value="expired">Expired</option>
              <option value="expiring">Expiring soon</option>
              <option value="depleted">Depleted</option>
            </select>
            <span className="text-xs text-gray-500 whitespace-nowrap self-center">
              {filteredInventory.length} result{filteredInventory.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>

        <CardContent>
          {enhancedInventory.length === 0 ? (
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
                  size={isMobile ? 'sm' : 'default'}
                >
                  Add Inventory
                </Button>
              )}
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No inventory items match your search or filter.
            </div>
          ) : (
            <div className="space-y-3">
              {pagedInventory.map((item: any) => {
                return (
                  <div key={item.id} className={`p-4 border rounded-lg ${isExpired(item) ? 'border-red-200 bg-red-50' :
                    isExpiringSoon(item) ? 'border-orange-200 bg-orange-50' :
                      isLowStock(item) ? 'border-yellow-200 bg-yellow-50' :
                        item.needsQuantityUpdate ? 'border-blue-200 bg-blue-50' :
                          'border-gray-200'
                    } ${isMobile ? 'space-y-3' : 'flex items-start justify-between'}`}>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`font-medium ${isMobile ? 'text-sm' : 'text-base'} truncate`}>
                              {item.feed_types?.name}
                            </h4>
                            {(() => {
                              return null;
                            })()}
                            {/* Formulated Feed Badge */}
                            {(item.source === 'formulate' || item.source === 'formulated') && (
                              <Badge className="text-xs bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1">
                                <FlaskConical className="h-3 w-3" />
                                Formulated
                              </Badge>
                            )}
                            {/* Purchased Feed Badge */}
                            {item.source === 'purchased' && (
                              <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                                Purchased
                              </Badge>
                            )}
                            {/* Harvested Feed Badge */}
                            {item.source === 'produced' && (
                              <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                                Harvested
                              </Badge>
                            )}
                          </div>
                          <StatusBadges item={item} />
                        </div>
                      </div>

                      

                      {/* Quantity Display */}
                      <div className="mb-3">
                        <QuantityDisplay item={item} />
                      </div>

                      {/* Formulated batch summary */}
                      {(item.source === 'formulate' || item.source === 'formulated') && (
                        <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center justify-between text-xs text-purple-800">
                            <span className="font-medium">Batch Quantity</span>
                            <span className="font-bold">{(item.latest_purchase?.quantity_kg ?? item.quantity_kg ?? 0).toFixed(2)} kg</span>
                          </div>
                          {item.cost_per_kg && (
                            <div className="flex items-center justify-between text-xs text-purple-700 mt-0.5">
                              <span>Batch Value</span>
                              <span className="font-semibold">
                                KSh {((item.latest_purchase?.quantity_kg ?? item.quantity_kg ?? 0) * item.cost_per_kg).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {item.latest_purchase?.purchase_date && (
                            <div className="text-xs text-purple-600 mt-0.5">
                              Produced: {new Date(item.latest_purchase.purchase_date).toLocaleDateString()}
                              {item.latest_purchase?.batch_number && ` • Batch: ${item.latest_purchase.batch_number}`}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Formulation ingredient breakdown */}
                      <FormulationIngredients item={item} />

                      {/* Purchase Info — only for non-formulated items */}
                      {/* 1. Storage Location - Always Visible */}
                      <div className="mt-3 space-y-1">
                        {item.storage_location && (
                          <p className="text-xs font-medium text-blue-700 flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            Storage: {item.storage_location}
                          </p>
                        )}

                        {/* 2. Purchase or Production Info */}
                        {item.source !== 'formulate' && item.source !== 'formulated' && (
                          <div className="space-y-1">
                            {item.cost_per_kg && (
                              <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                KSh{item.cost_per_kg.toFixed(2)}/kg
                                {/* Show Supplier if purchased, or Yield Source if produced */}
                                {item.latest_purchase?.supplier && ` • ${item.latest_purchase.supplier}`}
                                {item.latest_purchase?.yield_source && ` • Source: ${item.latest_purchase.yield_source}`}
                                {item.latest_purchase?.batch_number && ` • Batch: ${item.latest_purchase.batch_number}`}
                              </p>
                            )}

                            {item.latest_purchase?.purchase_date && (
                              <p className="text-gray-500 text-xs">
                                {item.source === 'produced' ? 'Produced: ' : 'Purchased: '}
                                {new Date(item.latest_purchase.purchase_date).toLocaleDateString()}
                                {item.latest_purchase?.expiry_date && ` • Expires: ${new Date(item.latest_purchase.expiry_date).toLocaleDateString()}`}
                              </p>
                            )}

                            {item.latest_purchase?.notes && (
                              <p className="text-gray-500 italic text-xs">
                                Note: {item.latest_purchase.notes}
                              </p>
                            )}
                          </div>
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
                          KSh {(item.remainingQuantity * (item.cost_per_kg || 0)).toFixed(2)}
                        </p>
                        <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          Current Value
                        </p>
                        {item.cost_per_kg && (
                          <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                            KSh {item.cost_per_kg.toFixed(2)}/kg
                          </p>
                        )}
                      </div>

                      <ActionButtons item={item} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination controls */}
          {invTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => setInvPage(p => Math.max(1, p - 1))}
                disabled={safeInvPage === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: invTotalPages }, (_, i) => i + 1).map(pg => {
                  if (invTotalPages > 7 && pg !== 1 && pg !== invTotalPages && Math.abs(pg - safeInvPage) > 2) {
                    if (pg === 2 || pg === invTotalPages - 1) {
                      return <span key={pg} className="px-1 text-gray-400 text-xs">…</span>
                    }
                    return null
                  }
                  return (
                    <button
                      key={pg}
                      onClick={() => setInvPage(pg)}
                      className={`w-7 h-7 rounded text-xs font-medium ${pg === safeInvPage
                        ? 'bg-farm-green text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                        }`}
                    >
                      {pg}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setInvPage(p => Math.min(invTotalPages, p + 1))}
                disabled={safeInvPage === invTotalPages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Inventory Modal - Using AddFeedInventoryModal */}
      <AddFeedInventoryModal
        isOpen={!!editingViaModal}
        onClose={() => setEditingViaModal(null)}
        initialData={editingViaModal}
        farmId={inventory[0]?.farm_id || ''}
        feedTypes={feedTypes}
        feedTypeCategories={[]}
        weightConversions={weightConversions.map(wc => ({
          id: wc.id,
          farm_id: inventory[0]?.farm_id || '',
          from_unit: wc.unit_symbol || wc.unit_name,
          to_unit: 'kg',
          conversion_factor: Number((wc as any).conversion_factor || wc.conversion_to_kg) || 1,
          unit_name: wc.unit_name,
        }))}
        inventoryStock={inventory.map(item => ({
          feed_type_id: item.feed_type_id,
          quantity_in_stock: item.quantity_kg || 0,
        }))}
        suppliers={[]}
        storageLocations={storageLocations || []}

        onSuccess={(updatedData) => {
          // Update the inventory with the new data
          const feedTypeId = editingViaModal?.feed_type_id
          if (feedTypeId) {
            const updatedInventory = inventory.map(item =>
              item.feed_type_id === feedTypeId
                ? {
                  ...item,
                  quantity_kg: updatedData?.quantity_kg || editingViaModal.quantity_kg,
                  minimum_threshold: updatedData?.minimum_threshold ?? item.minimum_threshold,
                  maximum_capacity: updatedData?.maximum_capacity ?? item.maximum_capacity,
                  updated_at: new Date().toISOString(),
                }
                : item
            )
            onInventoryUpdated(updatedInventory)
          }
          setEditingViaModal(null)
        }}
      />

      {/* Restock Modal */}
      <Modal
        isOpen={!!restocking}
        onClose={() => {
          setRestocking(null)
          restockForm.reset({ purchase_date: new Date().toISOString().split('T')[0] })
          setRestockError(null)
        }}
        className="max-w-2xl"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Restock: {restocking?.feed_types?.name}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Current stock: <span className="font-medium text-gray-700">{(restocking?.quantity_kg ?? 0).toFixed(1)} kg</span>
          </p>

          {restockError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {restockError}
            </div>
          )}

          <form onSubmit={restockForm.handleSubmit(handleRestockSubmit)} className="space-y-6">
            {/* Quantity to Add */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Quantity to Add</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {restocking?.feed_types?.preferred_measurement_unit && (
                  <div>
                    <Label>
                      Quantity ({getUnitDisplay(restocking.feed_types.preferred_measurement_unit).symbol})
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={restockForm.watch('quantity_to_add_preferred') ?? ''}
                      onChange={(e) => handleRestockPreferredQtyChange(e.target.value)}
                      placeholder="Enter quantity"
                    />
                  </div>
                )}
                <div>
                  <Label>Quantity (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={restockForm.watch('quantity_to_add_kg') ?? ''}
                    onChange={(e) => handleRestockKgQtyChange(e.target.value)}
                    placeholder="Quantity in kg"
                  />
                  {restockForm.formState.errors.quantity_to_add_kg && (
                    <p className="text-xs text-red-600 mt-1">
                      {restockForm.formState.errors.quantity_to_add_kg.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Cost */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Cost per kg (KSh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={restockForm.watch('cost_per_kg') ?? ''}
                  onChange={(e) => handleRestockCostPerKgChange(e.target.value)}
                  placeholder="Cost per kg"
                />
              </div>
              <div>
                <Label>Total Cost (KSh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={restockForm.watch('total_cost') ?? ''}
                  onChange={(e) => handleRestockTotalCostChange(e.target.value)}
                  placeholder="Total cost"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Purchase Date *</Label>
                <Input
                  type="date"
                  {...restockForm.register('purchase_date')}
                />
                {restockForm.formState.errors.purchase_date && (
                  <p className="text-xs text-red-600 mt-1">
                    {restockForm.formState.errors.purchase_date.message}
                  </p>
                )}
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  {...restockForm.register('expiry_date')}
                />
              </div>
            </div>

            {/* Supplier & Batch */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Supplier</Label>
                <Input
                  {...restockForm.register('supplier')}
                  placeholder="Supplier name"
                />
              </div>
              <div>
                <Label>Batch Number</Label>
                <Input
                  {...restockForm.register('batch_number')}
                  placeholder="Batch/lot number"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <textarea
                {...restockForm.register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRestocking(null)
                  restockForm.reset({ purchase_date: new Date().toISOString().split('T')[0] })
                  setRestockError(null)
                }}
                disabled={restockLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={restockLoading}>
                {restockLoading ? <LoadingSpinner size="sm" /> : 'Add Stock'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Deplete Confirmation */}
      <AlertDialog open={!!depleting} onOpenChange={() => setDepleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Depleted</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark "{depleting?.feed_types?.name}" as completely depleted?
              <br /><br />
              Current stock level: {(depleting?.remainingQuantity ?? depleting?.quantity_kg ?? 0)} kg
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