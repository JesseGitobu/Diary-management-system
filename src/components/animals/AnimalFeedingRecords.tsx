'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Progress } from '@/components/ui/Progress'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import {
  Plus,
  Calendar,
  Utensils,
  Wheat,
  Scale,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  Target,
  BarChart3,
  Settings,
  Edit,
  Trash2,
  Eye,
  FileText,
  Leaf,
  Droplet,
  Zap
} from 'lucide-react'
import { format, parseISO, startOfWeek, endOfWeek, subDays, addDays } from 'date-fns'

interface FeedingRecord {
  id: string
  animal_id: string
  feeding_time: string
  feed_type_id: string
  feed_name: string
  quantity_kg: number
  cost_per_kg?: number
  total_cost?: number
  feeding_mode: 'individual' | 'batch'
  animal_count?: number
  notes?: string
  recorded_by?: string
  batch_name?: string
  consumption_batch_id?: string
  created_at: string
  updated_at: string
  appetite_score?: number  // 1-5 scale
  approximate_waste_kg?: number
  observational_notes?: string
}

interface FeedInventoryItem {
  id: string
  farm_id: string
  feed_type_id: string
  quantity_kg: number
  cost_per_kg: number
  purchase_date: string
  expiry_date: string
  supplier: string
  batch_number: string
  notes: string
  created_at: string
  updated_at: string
  // Include feed type information via join
  feed_types: {
    id: string
    name: string
    category: string
    feed_category_id: string
    protein_content: number
    energy_content: number
    typical_cost_per_kg: number
    supplier: string
    nutritional_info: any
  }
}

interface FeedingSchedule {
  id: string
  animal_id: string
  feed_type_id: string
  feed_name: string
  scheduled_time: string
  quantity_kg: number
  frequency: 'daily' | 'twice_daily' | 'weekly' | 'as_needed'
  start_date: string
  end_date?: string
  is_active: boolean
  created_by: string
}

interface NutritionalTarget {
  daily_dry_matter_kg: number
  daily_protein_kg: number
  daily_energy_mj: number
  target_weight_gain_kg_per_day?: number
  milk_production_target_liters?: number
}

interface FeedTypeCategory {
  id: string
  farm_id: string
  name: string
  description: string
  color: string
  is_default: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

interface AnimalFeedingRecordsProps {
  animalId: string
  farmId: string
  canAddRecords: boolean
  feedTypeCategories?: FeedTypeCategory[] // Add this prop
}

export function AnimalFeedingRecords({ animalId, farmId, canAddRecords, feedTypeCategories = [] }: AnimalFeedingRecordsProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [feedingRecords, setFeedingRecords] = useState<FeedingRecord[]>([])
  const [feedInventory, setFeedInventory] = useState<FeedInventoryItem[]>([])
  const [feedTypes, setFeedTypes] = useState<any[]>([])
  const [feedingSchedules, setFeedingSchedules] = useState<FeedingSchedule[]>([])
  const [nutritionalTargets, setNutritionalTargets] = useState<NutritionalTarget | null>(null)
  const [showAddRecordModal, setShowAddRecordModal] = useState(false)
  const [showNutritionModal, setShowNutritionModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<FeedingRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('week')
  const [submitting, setSubmitting] = useState(false)
  const { isMobile } = useDeviceInfo()
  const [editForm, setEditForm] = useState({
    appetite_score: '',
    approximate_waste_kg: '',
    observational_notes: ''
  })

  const [localFeedTypeCategories, setLocalFeedTypeCategories] = useState<FeedTypeCategory[]>(feedTypeCategories)

  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FeedingRecord | null>(null)

  // Form states
  const [recordForm, setRecordForm] = useState({
    feeding_date: format(new Date(), 'yyyy-MM-dd'),
    feeding_time: format(new Date(), 'HH:mm'),
    feed_type_id: '',
    quantity_kg: '',
    cost_per_kg: '',
    notes: '',
    feeding_mode: 'individual' as 'individual' | 'batch'
  })

  const [nutritionForm, setNutritionForm] = useState({
    daily_dry_matter_kg: '',
    daily_protein_kg: '',
    daily_energy_mj: '',
    target_weight_gain_kg_per_day: '',
    milk_production_target_liters: ''
  })

  // Load data on component mount
  useEffect(() => {
    if (animalId && farmId) {
      loadFeedingData()
    }
  }, [animalId, farmId])

  const loadFeedingData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('Loading feeding data for:', { animalId, farmId })

      // Load feed type categories if not provided as prop
      if (feedTypeCategories.length === 0) {
        try {
          const categoriesResponse = await fetch(`/api/farms/${farmId}/feed-management/feed-categories`)
          if (categoriesResponse.ok) {
            const categoriesData = await categoriesResponse.json()
            setLocalFeedTypeCategories(categoriesData.data || [])
          } else {
            console.warn('Failed to load feed type categories:', categoriesResponse.status)
            setLocalFeedTypeCategories([])
          }
        } catch (err) {
          console.error('Error loading feed type categories:', err)
          setLocalFeedTypeCategories([])
        }
      }

      // Load feed types
      try {
        const inventoryResponse = await fetch(`/api/feed/inventory`)
        if (inventoryResponse.ok) {
          const inventoryData = await inventoryResponse.json()
          setFeedInventory(inventoryData.data || [])
        } else {
          console.warn('Failed to load feed inventory:', inventoryResponse.status)
          setFeedInventory([])
        }
      } catch (err) {
        console.error('Error loading feed inventory:', err)
        setFeedInventory([])
      }

      // Still load feed types for nutrition tab display
      try {
        const feedTypesResponse = await fetch(`/api/feed/types/`)
        if (feedTypesResponse.ok) {
          const feedTypesData = await feedTypesResponse.json()
          setFeedTypes(feedTypesData.data || [])
        } else {
          console.warn('Failed to load feed types:', feedTypesResponse.status)
          setFeedTypes([])
        }
      } catch (err) {
        console.error('Error loading feed types:', err)
        setFeedTypes([])
      }

      // UPDATED: Load animal-specific feeding records
      try {
        const feedingResponse = await fetch(
          `/api/farms/${farmId}/animals/${animalId}/consumption-records?limit=50`
        )
        console.log('Response status:', feedingResponse.status)
        if (feedingResponse.ok) {
          const feedingData = await feedingResponse.json()
          console.log('Fetched feeding records:', feedingData)

          // For the first approach (simpler)
          const transformedRecords = (feedingData.records || []).map((record: any) => ({
            id: record.feed_consumption.id,
            consumption_id: record.consumption_id,
            animal_id: record.animal_id,
            feeding_time: record.feed_consumption.feeding_time,
            feed_type_id: record.feed_consumption.feed_types?.id,
            feed_name: record.feed_consumption.feed_types?.name || 'Unknown Feed',
            feed_category: record.feed_consumption.feed_types?.feed_type_categories?.name || 'Uncategorized',
            quantity_kg: record.feed_consumption.quantity_kg,
            feeding_mode: record.feed_consumption.feeding_mode,
            animal_count: record.feed_consumption.animal_count,
            notes: record.feed_consumption.notes,
            recorded_by: record.feed_consumption.recorded_by,
            batch_name: record.feed_consumption.consumption_batches?.batch_name,
            consumption_batch_id: record.feed_consumption.consumption_batch_id,
            created_at: record.created_at,
            updated_at: record.feed_consumption.updated_at,
            cost_per_kg: record.feed_consumption.cost_per_kg, // This comes from inventory
            total_cost: record.feed_consumption.total_cost,    // This is calculated using inventory cost
            appetite_score: record.feed_consumption.appetite_score,
            approximate_waste_kg: record.feed_consumption.approximate_waste_kg,
            observational_notes: record.feed_consumption.observational_notes
          }))

          setFeedingRecords(transformedRecords)
        } else {
          console.warn('Failed to load feeding records:', feedingResponse.status)
          setFeedingRecords([])
        }
      } catch (err) {
        console.error('Error loading feeding records:', err)
        setFeedingRecords([])
      }

      // Load feeding schedules for this animal (unchanged)
      try {
        const schedulesResponse = await fetch(
          `/api/farms/${farmId}/animals/${animalId}/feeding-schedules`
        )
        if (schedulesResponse.ok) {
          const schedulesData = await schedulesResponse.json()
          setFeedingSchedules(schedulesData.schedules || [])
        } else {
          console.warn('Failed to load feeding schedules:', schedulesResponse.status)
          setFeedingSchedules([])
        }
      } catch (err) {
        console.error('Error loading feeding schedules:', err)
        setFeedingSchedules([])
      }

      // Load nutritional targets for this animal (unchanged)
      try {
        const targetsResponse = await fetch(
          `/api/farms/${farmId}/animals/${animalId}/nutrition-targets`
        )
        if (targetsResponse.ok) {
          const targetsData = await targetsResponse.json()
          setNutritionalTargets(targetsData.targets || null)
        } else {
          console.warn('Failed to load nutritional targets:', targetsResponse.status)
          setNutritionalTargets(null)
        }
      } catch (err) {
        console.error('Error loading nutritional targets:', err)
        setNutritionalTargets(null)
      }

    } catch (err) {
      setError('Failed to load feeding data')
      console.error('Error loading feeding data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create processed feed options from inventory
  const availableFeedOptions = useMemo(() => {
    // Group inventory by feed type
    const groupedInventory = feedInventory.reduce((acc, item) => {
      const feedTypeId = item.feed_type_id
      if (!acc[feedTypeId]) {
        acc[feedTypeId] = {
          feedType: item.feed_types,
          inventoryItems: [],
          totalStock: 0,
          averageCost: 0,
          oldestExpiry: null
        }
      }

      acc[feedTypeId].inventoryItems.push(item)
      acc[feedTypeId].totalStock += item.quantity_kg

      // Calculate weighted average cost
      interface InventoryItem {
        quantity_kg: number;
        cost_per_kg: number;
      }

      const totalValue: number = acc[feedTypeId].inventoryItems.reduce((sum: number, inv: InventoryItem) =>
        sum + (inv.quantity_kg * inv.cost_per_kg), 0);
      acc[feedTypeId].averageCost = totalValue / acc[feedTypeId].totalStock

      // Track oldest expiry date
      if (item.expiry_date) {
        const expiryDate = new Date(item.expiry_date)
        if (!acc[feedTypeId].oldestExpiry || expiryDate < acc[feedTypeId].oldestExpiry) {
          acc[feedTypeId].oldestExpiry = expiryDate
        }
      }

      return acc
    }, {} as Record<string, any>)

    // Convert to array and filter out items with no stock
    return Object.values(groupedInventory)
      .filter((group: any) => group.totalStock > 0)
      .map((group: any) => ({
        id: group.feedType.id,
        name: group.feedType.name,
        category: group.feedType.category,
        feed_category_id: group.feedType.feed_category_id,
        totalStock: group.totalStock,
        averageCost: group.averageCost,
        inventoryItems: group.inventoryItems,
        oldestExpiry: group.oldestExpiry,
        protein_content: group.feedType.protein_content,
        energy_content: group.feedType.energy_content,
        nutritional_info: group.feedType.nutritional_info
      }))
  }, [feedInventory])

  const getFilteredRecords = () => {
    const now = new Date()
    let startDate: Date

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = startOfWeek(now)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default:
        startDate = startOfWeek(now)
    }

    return feedingRecords.filter(record =>
      parseISO(record.feeding_time) >= startDate
    )
  }

  const calculateDailyTotals = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const todayRecords = feedingRecords.filter(record =>
      format(parseISO(record.feeding_time), 'yyyy-MM-dd') === today
    )

    return {
      // For individual animals, calculate their actual portion from each feeding
      totalQuantity: todayRecords.reduce((sum, record) => {
        // If it's a batch feeding, divide total by animal count to get this animal's portion
        const animalPortion = record.feeding_mode === 'batch'
          ? record.quantity_kg / (record.animal_count || 1) // Add fallback for undefined
          : record.quantity_kg
        return sum + animalPortion
      }, 0),

      // Calculate cost per animal for batch feedings
      totalCost: todayRecords.reduce((sum, record) => {
        const animalCost = record.feeding_mode === 'batch'
          ? (record.total_cost || 0) / (record.animal_count || 1) // Add fallback for undefined
          : (record.total_cost || 0)
        return sum + animalCost
      }, 0),

      feedingCount: todayRecords.length,
      averageAppetite: 4.0 // Placeholder - would need appetite rating in records
    }
  }

  const calculateWeeklyTotals = () => {
    const weekStart = startOfWeek(new Date())
    const weekEnd = endOfWeek(new Date())
    const weekRecords = feedingRecords.filter(record => {
      const recordDate = parseISO(record.feeding_time)
      return recordDate >= weekStart && recordDate <= weekEnd
    })

    return {
      totalQuantity: weekRecords.reduce((sum, record) => sum + record.quantity_kg, 0),
      totalCost: weekRecords.reduce((sum, record) => sum + (record.total_cost || 0), 0),
      feedingCount: weekRecords.length
    }
  }

  const getNutritionProgress = () => {
    if (!nutritionalTargets) return null

    const dailyTotals = calculateDailyTotals()

    return {
      dryMatterProgress: Math.min((dailyTotals.totalQuantity / nutritionalTargets.daily_dry_matter_kg) * 100, 100),
      proteinProgress: 75, // Would calculate from feed composition
      energyProgress: 80   // Would calculate from feed composition
    }
  }

  const handleAddRecord = async () => {
    if (!recordForm.feed_type_id || !recordForm.quantity_kg) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Find the selected feed option from available inventory
      const selectedFeedOption = availableFeedOptions.find(option => option.id === recordForm.feed_type_id)

      if (!selectedFeedOption) {
        throw new Error('Selected feed type not found in inventory')
      }

      // Check if enough stock is available
      const requestedQuantity = Number(recordForm.quantity_kg)
      if (requestedQuantity > selectedFeedOption.totalStock) {
        throw new Error(`Insufficient stock. Only ${selectedFeedOption.totalStock}kg available`)
      }

      // Create proper timestamp from feeding time
      const feedingDateTime = new Date(`${recordForm.feeding_date}T${recordForm.feeding_time}`)

      // Use provided cost or average inventory cost
      const costPerKg = recordForm.cost_per_kg ?
        Number(recordForm.cost_per_kg) :
        selectedFeedOption.averageCost

      const newRecordData = {
        farmId,
        feedingTime: feedingDateTime.toISOString(),
        mode: recordForm.feeding_mode,
        batchId: null,
        entries: [{
          feedTypeId: recordForm.feed_type_id,
          quantityKg: requestedQuantity,
          animalIds: [animalId],
          costPerKg: costPerKg,
          notes: recordForm.notes || undefined
        }]
      }

      const response = await fetch('/api/feed/consumption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecordData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to record feeding')
      }

      // Reload feeding data
      await loadFeedingData()
      setShowAddRecordModal(false)
      resetRecordForm()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add feeding record')
      console.error('Error adding feeding record:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // Helper function to check if inventory is expiring soon
  const isExpiringSoon = (expiryDate: Date | null) => {
    if (!expiryDate) return false
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0
  }

  const isExpired = (expiryDate: Date | null) => {
    if (!expiryDate) return false
    return expiryDate < new Date()
  }

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this feeding record?')) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/feed/consumption/${recordId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete record')
      }

      // Reload feeding data
      await loadFeedingData()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete feeding record')
      console.error('Error deleting feeding record:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddSchedule = async () => {
    // Farm schedules are managed at farm level, not per animal
    // This functionality would redirect to farm schedule management
    console.log('Individual animal schedules not supported with current schema')
  }

  // OPTIMIZED: Use useCallback for all form handlers to prevent unnecessary re-renders
  const handleRecordFormChange = useCallback((field: string, value: string) => {
    setRecordForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleNutritionFormChange = useCallback((field: string, value: string) => {
    setNutritionForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleEditFormChange = useCallback((field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // OPTIMIZED: Memoize form reset function
  const resetRecordForm = useCallback(() => {
    setRecordForm({
      feeding_date: format(new Date(), 'yyyy-MM-dd'),
      feeding_time: format(new Date(), 'HH:mm'),
      feed_type_id: '',
      quantity_kg: '',
      cost_per_kg: '',
      notes: '',
      feeding_mode: 'individual'
    });
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setShowAddRecordModal(false);
  }, []);

  const handleCloseNutritionModal = useCallback(() => {
    setShowNutritionModal(false);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingRecord(null);
  }, []);

  const getQualityBadge = (quality: string) => {
    const colors = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      fair: 'bg-yellow-100 text-yellow-800',
      poor: 'bg-red-100 text-red-800'
    }
    return <Badge className={colors[quality as keyof typeof colors] || colors.good}>{quality}</Badge>
  }

  const dailyTotals = calculateDailyTotals()
  const weeklyTotals = calculateWeeklyTotals()
  const nutritionProgress = getNutritionProgress()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
        <span className="ml-2">Loading feeding data...</span>
      </div>
    )
  }

  const handleEditObservations = (record: FeedingRecord) => {
    setEditingRecord(record)
    setEditForm({
      appetite_score: record.appetite_score?.toString() || '',
      approximate_waste_kg: record.approximate_waste_kg?.toString() || '',
      observational_notes: record.observational_notes || ''
    })
    setShowEditModal(true)
  }

  const handleUpdateObservations = async () => {
    if (!editingRecord) return

    try {
      setSubmitting(true)
      setError(null)

      const updateData = {
        appetite_score: editForm.appetite_score ? Number(editForm.appetite_score) : null,
        approximate_waste_kg: editForm.approximate_waste_kg ? Number(editForm.approximate_waste_kg) : null,
        observational_notes: editForm.observational_notes || null
      }

      // Updated URL to match your route structure
      const response = await fetch(
        `/api/farms/${farmId}/animals/${animalId}/consumption-records/${editingRecord.id}/observations`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update observations')
      }

      await loadFeedingData()
      setShowEditModal(false)
      setEditingRecord(null)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update observations')
      console.error('Error updating observations:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={cn("font-semibold text-gray-900", isMobile ? "text-lg" : "text-xl")}>
            Feeding Records
          </h3>
          <p className={cn("text-gray-600", isMobile ? "text-sm" : "text-base")}>
            Track nutrition, feeding schedules, and costs
          </p>
        </div>
        {canAddRecords && (
          <Button
            onClick={() => setShowAddRecordModal(true)}
            className={cn(isMobile ? "text-sm px-3 py-2" : "")}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isMobile ? "Add" : "Record Feeding"}
          </Button>
        )}
      </div>

      {/* Quick Stats Cards */}
      <div className={cn("grid gap-4", isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-4")}>
        <Card>
          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 rounded-lg p-2">
                <Scale className="w-5 h-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                  Today's Feed
                </p>
                <p className={cn("font-semibold", isMobile ? "text-sm" : "text-lg")}>
                  {dailyTotals.totalQuantity.toFixed(1)}kg
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 rounded-lg p-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                  Today's Cost
                </p>
                <p className={cn("font-semibold", isMobile ? "text-sm" : "text-lg")}>
                  ${dailyTotals.totalCost.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 rounded-lg p-2">
                <Utensils className="w-5 h-5 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                  Feedings
                </p>
                <p className={cn("font-semibold", isMobile ? "text-sm" : "text-lg")}>
                  {dailyTotals.feedingCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
            <div className="flex items-center space-x-3">
              <div className="bg-yellow-100 rounded-lg p-2">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                  Weekly Total
                </p>
                <p className={cn("font-semibold", isMobile ? "text-sm" : "text-lg")}>
                  {weeklyTotals.totalQuantity.toFixed(1)}kg
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nutrition Progress */}
      {nutritionProgress && nutritionalTargets && (
        <Card>
          <CardHeader className={cn(isMobile && "px-4 py-3")}>
            <div className="flex items-center justify-between">
              <CardTitle className={cn(isMobile ? "text-base" : "text-lg")}>
                Today's Nutrition Progress
              </CardTitle>
              {canAddRecords && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNutritionModal(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {isMobile ? "Set" : "Set Targets"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className={cn(isMobile && "px-4 pb-4 pt-0")}>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Dry Matter</span>
                  <span className="text-sm text-gray-600">
                    {dailyTotals.totalQuantity.toFixed(1)}/{nutritionalTargets.daily_dry_matter_kg}kg
                  </span>
                </div>
                <Progress value={nutritionProgress.dryMatterProgress} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Protein</span>
                  <span className="text-sm text-gray-600">
                    75% of {nutritionalTargets.daily_protein_kg}kg target
                  </span>
                </div>
                <Progress value={nutritionProgress.proteinProgress} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Energy</span>
                  <span className="text-sm text-gray-600">
                    80% of {nutritionalTargets.daily_energy_mj}MJ target
                  </span>
                </div>
                <Progress value={nutritionProgress.energyProgress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={cn("grid w-full grid-cols-4", isMobile && "h-10")}>
          <TabsTrigger value="overview" className={cn(isMobile && "text-xs")}>
            {isMobile ? "Records" : "Feeding Records"}
          </TabsTrigger>
          <TabsTrigger value="schedule" className={cn(isMobile && "text-xs")}>
            Schedule
          </TabsTrigger>
          <TabsTrigger value="nutrition" className={cn(isMobile && "text-xs")}>
            Nutrition
          </TabsTrigger>
          <TabsTrigger value="analysis" className={cn(isMobile && "text-xs")}>
            Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Date Range Filter */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="dateRange" className="text-sm font-medium">
              View:
            </Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Feeding Records List */}
          <div className="space-y-3">
            {getFilteredRecords().length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Utensils className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">No feeding records found</p>
                  {canAddRecords && (
                    <Button onClick={() => setShowAddRecordModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Feeding
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              // In your AnimalFeedingRecords component, enhance the record display

              getFilteredRecords().map((record) => (
                <Card key={record.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{record.feed_name}</h4>
                        <p className="text-sm text-gray-600">
                          {format(parseISO(record.feeding_time), 'MMM dd, yyyy')} at {format(parseISO(record.feeding_time), 'HH:mm')}
                        </p>
                        {/* Enhanced batch information */}
                        {record.feeding_mode === 'batch' && (
                          <div className="flex items-center space-x-2 mt-1">
                            <p className="text-xs text-blue-600">
                              Batch feeding: {record.batch_name || 'Unknown batch'}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {record.animal_count} animals total
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={record.feeding_mode === 'batch' ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}>
                          {record.feeding_mode === 'batch' ? 'Batch Fed' : 'Individual'}
                        </Badge>
                        {canAddRecords && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRecord(record.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className={cn("grid gap-3", isMobile ? "grid-cols-2" : "grid-cols-3 md:grid-cols-4")}>
                      <div>
                        <p className="text-xs font-medium text-gray-700">
                          {record.feeding_mode === 'batch' ? 'Quantity ' : 'Quantity'}
                        </p>
                        <p className="text-sm font-semibold text-green-600">
                          {record.feeding_mode === 'batch'
                            ? `${(record.quantity_kg / (record.animal_count || 1)).toFixed(1)}kg`
                            : `${record.quantity_kg}kg`
                          }
                        </p>
                      </div>

                      {/* {record.feeding_mode === 'batch' && (
                        <div>
                          <p className="text-xs font-medium text-gray-700">Total Batch</p>
                          <p className="text-sm text-gray-600">{record.quantity_kg}kg</p>
                        </div>
                      )} */}

                      <div>
                        <p className="text-xs font-medium text-gray-700">Mode</p>
                        <p className="text-sm capitalize">{record.feeding_mode}</p>
                      </div>

                      {/* {record.feeding_mode === 'batch' && (
                        <div>
                          <p className="text-xs font-medium text-gray-700">Animals in Batch</p>
                          <p className="text-sm font-semibold">{record.animal_count}</p>
                        </div>
                      )} */}

                      {record.total_cost && (
                        <div>
                          <p className="text-xs font-medium text-gray-700">
                            {record.feeding_mode === 'batch' ? 'Cost' : 'Cost'}
                          </p>
                          <p className="text-sm font-semibold">
                            ${record.feeding_mode === 'batch'
                              ? (record.total_cost / (record.animal_count || 1)).toFixed(2)
                              : record.total_cost.toFixed(2)
                            }
                          </p>
                        </div>
                      )}
                      {/* New appetite display */}
                      {record.appetite_score && (
                        <div>
                          <p className="text-xs font-medium text-gray-700">Appetite</p>
                          <div className="flex items-center space-x-1">
                            <p className="text-sm font-semibold">{record.appetite_score}/5</p>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={cn(
                                    "text-xs",
                                    star <= (record.appetite_score || 0) ? "text-yellow-400" : "text-gray-300"
                                  )}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* New waste display */}
                      {record.approximate_waste_kg && (
                        <div>
                          <p className="text-xs font-medium text-gray-700">Waste</p>
                          <p className="text-sm font-semibold text-red-600">
                            {record.approximate_waste_kg}kg
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Add edit button */}
                    <div className="mt-3 flex justify-between items-center">
                      <div>
                        {record.observational_notes && (
                          <div className="p-2 bg-blue-50 rounded text-sm">
                            <strong>Observations:</strong> {record.observational_notes}
                          </div>
                        )}
                      </div>

                      {canAddRecords && (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditObservations(record)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            {record.appetite_score || record.approximate_waste_kg ? 'Edit' : 'Add'} Observations
                          </Button>
                        </div>
                      )}
                    </div>

                    {record.notes && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                        <strong>Notes:</strong> {record.notes}
                      </div>
                    )}

                    {record.recorded_by && (
                      <div className="mt-3 text-xs text-gray-500">
                        Recorded by: {record.recorded_by}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Active Feeding Schedules</h4>
            <div className="text-sm text-gray-500">
              Farm-wide schedules affecting this animal
            </div>
          </div>

          <div className="space-y-3">
            {feedingSchedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="font-medium">{schedule.feed_name}</h5>
                      <p className="text-sm text-gray-600">
                        {schedule.scheduled_time} • {schedule.frequency}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={schedule.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {schedule.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  <div className={cn("grid gap-3", isMobile ? "grid-cols-2" : "grid-cols-3")}>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Planned Quantity</p>
                      <p className="text-sm">{schedule.quantity_kg}kg</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Schedule Type</p>
                      <p className="text-sm capitalize">{schedule.frequency}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Status</p>
                      <p className="text-sm">Farm Schedule</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {feedingSchedules.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">No active schedules found</p>
                  <p className="text-sm text-gray-400">
                    This animal is not included in any current feeding schedules.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="nutrition" className="space-y-4">
          {/* Feed Types Available */}
          <Card>
            <CardHeader>
              <CardTitle className={cn(isMobile ? "text-base" : "text-lg")}>
                Available Feed Types
              </CardTitle>
              <CardDescription>
                Nutritional information and costs for feed types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {feedTypes.map((feed) => (
                  <div key={feed.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h5 className="font-medium">{feed.name}</h5>
                        <Badge variant="outline" className="text-xs">
                          {feed.category}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold">${feed.typical_cost_per_kg}/kg</p>
                    </div>

                    <div className={cn("grid gap-2", isMobile ? "grid-cols-2" : "grid-cols-3")}>
                      {feed.protein_content && (
                        <div>
                          <p className="text-xs text-gray-600">Protein</p>
                          <p className="text-sm font-medium">{feed.protein_content}%</p>
                        </div>
                      )}
                      {feed.energy_content && (
                        <div>
                          <p className="text-xs text-gray-600">Energy</p>
                          <p className="text-sm font-medium">{feed.energy_content} MJ/kg</p>
                        </div>
                      )}
                      {feed.supplier && (
                        <div>
                          <p className="text-xs text-gray-600">Supplier</p>
                          <p className="text-sm">{feed.supplier}</p>
                        </div>
                      )}
                    </div>

                    {/* Fixed nutritional_info display */}
                    {feed.nutritional_info && (
                      <div className="mt-2">
                        {typeof feed.nutritional_info === 'string' ? (
                          <p className="text-xs text-gray-600">{feed.nutritional_info}</p>
                        ) : (
                          <div className="text-xs text-gray-600">
                            <p className="font-medium mb-1">Nutritional Details:</p>
                            <div className="grid grid-cols-2 gap-1">
                              {feed.nutritional_info.fat_content && (
                                <span>Fat: {feed.nutritional_info.fat_content}%</span>
                              )}
                              {feed.nutritional_info.fiber_content && (
                                <span>Fiber: {feed.nutritional_info.fiber_content}%</span>
                              )}
                              {feed.nutritional_info.energy_content && (
                                <span>Energy: {feed.nutritional_info.energy_content} MJ/kg</span>
                              )}
                              {feed.nutritional_info.protein_content && (
                                <span>Protein: {feed.nutritional_info.protein_content}%</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Nutritional Targets */}
          {nutritionalTargets && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className={cn(isMobile ? "text-base" : "text-lg")}>
                    Nutritional Targets
                  </CardTitle>
                  {canAddRecords && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNutritionModal(true)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3")}>
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 rounded-lg p-2">
                      <Wheat className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Daily Dry Matter</p>
                      <p className="font-semibold">{nutritionalTargets.daily_dry_matter_kg}kg</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 rounded-lg p-2">
                      <Leaf className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Daily Protein</p>
                      <p className="font-semibold">{nutritionalTargets.daily_protein_kg}kg</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="bg-yellow-100 rounded-lg p-2">
                      <Zap className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Daily Energy</p>
                      <p className="font-semibold">{nutritionalTargets.daily_energy_mj}MJ</p>
                    </div>
                  </div>

                  {nutritionalTargets.target_weight_gain_kg_per_day && (
                    <div className="flex items-center space-x-3">
                      <div className="bg-purple-100 rounded-lg p-2">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Target Weight Gain</p>
                        <p className="font-semibold">{nutritionalTargets.target_weight_gain_kg_per_day}kg/day</p>
                      </div>
                    </div>
                  )}

                  {nutritionalTargets.milk_production_target_liters && (
                    <div className="flex items-center space-x-3">
                      <div className="bg-indigo-100 rounded-lg p-2">
                        <Droplet className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Milk Target</p>
                        <p className="font-semibold">{nutritionalTargets.milk_production_target_liters}L/day</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          {/* Weekly Summary */}
          <Card>
            <CardHeader>
              <CardTitle className={cn(isMobile ? "text-base" : "text-lg")}>
                Weekly Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-3")}>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{weeklyTotals.totalQuantity.toFixed(1)}</p>
                  <p className="text-sm text-green-800">Total Feed (kg)</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">${weeklyTotals.totalCost.toFixed(2)}</p>
                  <p className="text-sm text-blue-800">Total Cost</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{weeklyTotals.feedingCount}</p>
                  <p className="text-sm text-purple-800">Total Feedings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feed Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className={cn(isMobile ? "text-base" : "text-lg")}>
                Feed Type Distribution (This Week)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['concentrate', 'forage', 'supplement', 'mineral'].map((type) => {
                  const typeRecords = feedingRecords.filter(r => {
                    const feedType = feedTypes.find(ft => ft.id === r.feed_type_id)
                    return feedType?.category === type
                  })
                  const totalQuantity = typeRecords.reduce((sum, r) => sum + r.quantity_kg, 0)
                  const percentage = weeklyTotals.totalQuantity > 0
                    ? (totalQuantity / weeklyTotals.totalQuantity) * 100
                    : 0

                  return (
                    <div key={type} className="flex items-center justify-between">
                      <span className="capitalize font-medium">{type}</span>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Feeding Trends */}
          <Card>
            <CardHeader>
              <CardTitle className={cn(isMobile ? "text-base" : "text-lg")}>
                Feeding Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 mb-2">Feeding trend charts coming soon</p>
                <p className="text-sm text-gray-400">
                  Track feeding patterns and consumption over time
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Updated Add Record Modal with inventory-based feed selection */}
      {showAddRecordModal && (
        <Modal isOpen={showAddRecordModal} onClose={handleCloseAddModal}>
          <div className="p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Record Feeding</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="feeding_date">Date *</Label>
                  <Input
                    id="feeding_date"
                    type="date"
                    value={recordForm.feeding_date}
                    onChange={(e) => handleRecordFormChange('feeding_date', e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="feeding_time">Time *</Label>
                  <Input
                    id="feeding_time"
                    type="time"
                    value={recordForm.feeding_time}
                    onChange={(e) => handleRecordFormChange('feeding_time', e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="feed_type_id">Feed Type *</Label>
                <Select
                  value={recordForm.feed_type_id}
                  onValueChange={(value) => {
                    const selectedFeed = availableFeedOptions.find(f => f.id === value);
                    setRecordForm(prev => ({
                      ...prev,
                      feed_type_id: value,
                      cost_per_kg: selectedFeed?.averageCost.toFixed(2) || ''
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select feed type from inventory" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFeedOptions.map((feed, index) => (
                      <SelectItem
                        key={feed.id || `feed-${index}`}
                        value={feed.id || `feed-${index}`}
                      >
                        <div className="flex items-center space-x-2 w-full">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{feed.name}</span>
                              {feed.feed_category_id && localFeedTypeCategories.find(cat => cat.id === feed.feed_category_id) && (
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    backgroundColor: localFeedTypeCategories.find(cat => cat.id === feed.feed_category_id)?.color || '#gray'
                                  }}
                                />
                              )}
                              <Badge variant="outline" className="text-xs">
                                {feed.totalStock.toFixed(1)}kg available
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span>Avg: ${feed.averageCost.toFixed(2)}/kg</span>
                              {feed.oldestExpiry && (
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-xs font-medium",
                                  isExpired(feed.oldestExpiry) ? "bg-red-100 text-red-700" :
                                    isExpiringSoon(feed.oldestExpiry) ? "bg-yellow-100 text-yellow-700" :
                                      "bg-green-100 text-green-700"
                                )}>
                                  {isExpired(feed.oldestExpiry) ? "Expired" :
                                    isExpiringSoon(feed.oldestExpiry) ? "Expiring Soon" :
                                      "Fresh"
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                    {availableFeedOptions.length === 0 && (
                      <SelectItem key="no-inventory" value="no-inventory" disabled>
                        No feed inventory available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {/* Show inventory details for selected feed */}
                {recordForm.feed_type_id && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    {(() => {
                      const selectedFeed = availableFeedOptions.find(f => f.id === recordForm.feed_type_id)
                      if (!selectedFeed) return null

                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-900">
                              Available Stock: {selectedFeed.totalStock.toFixed(1)}kg
                            </span>
                            <span className="text-sm text-blue-700">
                              Avg Cost: ${selectedFeed.averageCost.toFixed(2)}/kg
                            </span>
                          </div>

                          {selectedFeed.inventoryItems.length > 1 && (
                            <div className="text-xs text-blue-600">
                              {selectedFeed.inventoryItems.length} inventory batches available
                            </div>
                          )}

                          {selectedFeed.oldestExpiry && (
                            <div className="text-xs text-blue-600">
                              Oldest expiry: {format(selectedFeed.oldestExpiry, 'MMM dd, yyyy')}
                              {isExpiringSoon(selectedFeed.oldestExpiry) && (
                                <span className="ml-1 text-yellow-600 font-medium">⚠️ Expiring soon</span>
                              )}
                              {isExpired(selectedFeed.oldestExpiry) && (
                                <span className="ml-1 text-red-600 font-medium">❌ Expired</span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity_kg">Quantity (kg) *</Label>
                  <Input
                    id="quantity_kg"
                    type="number"
                    value={recordForm.quantity_kg}
                    onChange={(e) => handleRecordFormChange('quantity_kg', e.target.value)}
                    placeholder="0.0"
                    min="0"
                    step="0.1"
                    autoComplete="off"
                  />
                  {/* Show stock validation */}
                  {recordForm.quantity_kg && recordForm.feed_type_id && (
                    <div className="mt-1">
                      {(() => {
                        const selectedFeed = availableFeedOptions.find(f => f.id === recordForm.feed_type_id)
                        const requestedQty = Number(recordForm.quantity_kg)

                        if (!selectedFeed) return null

                        if (requestedQty > selectedFeed.totalStock) {
                          return (
                            <p className="text-xs text-red-600">
                              ❌ Insufficient stock (only {selectedFeed.totalStock.toFixed(1)}kg available)
                            </p>
                          )
                        } else if (requestedQty > selectedFeed.totalStock * 0.8) {
                          return (
                            <p className="text-xs text-yellow-600">
                              ⚠️ Using {((requestedQty / selectedFeed.totalStock) * 100).toFixed(0)}% of available stock
                            </p>
                          )
                        } else {
                          return (
                            <p className="text-xs text-green-600">
                              ✅ {(selectedFeed.totalStock - requestedQty).toFixed(1)}kg will remain
                            </p>
                          )
                        }
                      })()}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="cost_per_kg">Cost per kg ($)</Label>
                  <Input
                    id="cost_per_kg"
                    type="number"
                    value={recordForm.cost_per_kg}
                    onChange={(e) => handleRecordFormChange('cost_per_kg', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to use average inventory cost
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={recordForm.notes}
                  onChange={(e) => handleRecordFormChange('notes', e.target.value)}
                  placeholder="Additional observations or notes"
                  rows={3}
                />
              </div>

              {recordForm.quantity_kg && recordForm.feed_type_id && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {(() => {
                      const selectedFeed = availableFeedOptions.find(f => f.id === recordForm.feed_type_id)
                      const costPerKg = recordForm.cost_per_kg ?
                        Number(recordForm.cost_per_kg) :
                        selectedFeed?.averageCost || 0
                      const totalCost = Number(recordForm.quantity_kg) * costPerKg

                      return `Total cost: $${totalCost.toFixed(2)}`
                    })()}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseAddModal}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddRecord}
                disabled={!recordForm.feed_type_id || !recordForm.quantity_kg || submitting}
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Recording...</span>
                  </>
                ) : (
                  'Record Feeding'
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* FIXED: Nutrition Targets Modal */}
      {showNutritionModal && (
        <Modal isOpen={showNutritionModal} onClose={handleCloseNutritionModal}>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Set Nutritional Targets</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="daily_dry_matter">Daily Dry Matter (kg) *</Label>
                <Input
                  id="daily_dry_matter"
                  type="number"
                  value={nutritionForm.daily_dry_matter_kg}
                  onChange={(e) => handleNutritionFormChange('daily_dry_matter_kg', e.target.value)}
                  placeholder="22.0"
                  min="0"
                  step="0.1"
                  autoComplete="off"
                />
              </div>

              <div>
                <Label htmlFor="daily_protein">Daily Protein (kg) *</Label>
                <Input
                  id="daily_protein"
                  type="number"
                  value={nutritionForm.daily_protein_kg}
                  onChange={(e) => handleNutritionFormChange('daily_protein_kg', e.target.value)}
                  placeholder="3.2"
                  min="0"
                  step="0.1"
                  autoComplete="off"
                />
              </div>

              <div>
                <Label htmlFor="daily_energy">Daily Energy (MJ) *</Label>
                <Input
                  id="daily_energy"
                  type="number"
                  value={nutritionForm.daily_energy_mj}
                  onChange={(e) => handleNutritionFormChange('daily_energy_mj', e.target.value)}
                  placeholder="280.0"
                  min="0"
                  step="1"
                  autoComplete="off"
                />
              </div>

              <div>
                <Label htmlFor="target_weight_gain">Target Weight Gain (kg/day)</Label>
                <Input
                  id="target_weight_gain"
                  type="number"
                  value={nutritionForm.target_weight_gain_kg_per_day}
                  onChange={(e) => handleNutritionFormChange('target_weight_gain_kg_per_day', e.target.value)}
                  placeholder="0.8"
                  min="0"
                  step="0.1"
                  autoComplete="off"
                />
              </div>

              <div>
                <Label htmlFor="milk_target">Milk Production Target (L/day)</Label>
                <Input
                  id="milk_target"
                  type="number"
                  value={nutritionForm.milk_production_target_liters}
                  onChange={(e) => handleNutritionFormChange('milk_production_target_liters', e.target.value)}
                  placeholder="25.0"
                  min="0"
                  step="0.1"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseNutritionModal}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  // Handle saving nutrition targets
                  setShowNutritionModal(false);
                }}
                disabled={!nutritionForm.daily_dry_matter_kg || !nutritionForm.daily_protein_kg || !nutritionForm.daily_energy_mj || submitting}
              >
                Save Targets
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* FIXED: Edit Observations Modal */}
      {showEditModal && (
        <Modal isOpen={showEditModal} onClose={handleCloseEditModal}>
          <div className="p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Update Feeding Observations</h2>

            {editingRecord && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900">{editingRecord.feed_name}</h3>
                <p className="text-sm text-gray-600">
                  {format(parseISO(editingRecord.feeding_time), 'MMM dd, yyyy')} at {format(parseISO(editingRecord.feeding_time), 'HH:mm')}
                </p>
                <p className="text-sm text-gray-600">
                  Quantity: {editingRecord.quantity_kg}kg
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="appetite_score">Appetite Score (1-5 scale)</Label>
                <Select
                  value={editForm.appetite_score}
                  onValueChange={(value) => handleEditFormChange('appetite_score', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rate the animal's appetite" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Very Poor (barely ate)</SelectItem>
                    <SelectItem value="2">2 - Poor (ate reluctantly)</SelectItem>
                    <SelectItem value="3">3 - Fair (ate normally)</SelectItem>
                    <SelectItem value="4">4 - Good (ate eagerly)</SelectItem>
                    <SelectItem value="5">5 - Excellent (ate very eagerly)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Rate how enthusiastically the animal consumed the feed
                </p>
              </div>

              <div>
                <Label htmlFor="approximate_waste_kg">Approximate Waste (kg)</Label>
                <Input
                  id="approximate_waste_kg"
                  type="number"
                  value={editForm.approximate_waste_kg}
                  onChange={(e) => handleEditFormChange('approximate_waste_kg', e.target.value)}
                  placeholder="0.0"
                  min="0"
                  step="0.1"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Estimate how much feed was wasted or left uneaten
                </p>
              </div>

              <div>
                <Label htmlFor="observational_notes">Observational Notes</Label>
                <Textarea
                  id="observational_notes"
                  value={editForm.observational_notes}
                  onChange={(e) => handleEditFormChange('observational_notes', e.target.value)}
                  placeholder="Additional observations about feeding behavior, health signs, etc."
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Note any behavioral observations, health signs, or feeding patterns
                </p>
              </div>

              {editForm.approximate_waste_kg && editingRecord && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Actual consumption: {(editingRecord.quantity_kg - Number(editForm.approximate_waste_kg)).toFixed(1)}kg
                    ({((1 - Number(editForm.approximate_waste_kg) / editingRecord.quantity_kg) * 100).toFixed(1)}% consumed)
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseEditModal}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpdateObservations}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Updating...</span>
                  </>
                ) : (
                  'Update Observations'
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}