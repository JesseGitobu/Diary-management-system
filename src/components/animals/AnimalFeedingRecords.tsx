'use client'

import { useState, useEffect } from 'react'
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
}

interface FeedType {
  id: string
  name: string
  category: 'concentrate' | 'forage' | 'supplement' | 'mineral'
  feed_category_id?: string
  protein_content?: number
  energy_content?: number
  typical_cost_per_kg: number
  supplier?: string
  nutritional_info?: string
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

interface AnimalFeedingRecordsProps {
  animalId: string
  farmId: string
  canAddRecords: boolean
}

export function AnimalFeedingRecords({ animalId, farmId, canAddRecords }: AnimalFeedingRecordsProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [feedingRecords, setFeedingRecords] = useState<FeedingRecord[]>([])
  const [feedTypes, setFeedTypes] = useState<FeedType[]>([])
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
    
    // Load feed types
    try {
      const feedTypesResponse = await fetch(`/api/feed/types/`)
      if (feedTypesResponse.ok) {
        const feedTypesData = await feedTypesResponse.json()
        setFeedTypes(Array.isArray(feedTypesData) ? feedTypesData : feedTypesData?.feed_types || [])
      } else {
        console.warn('Failed to load feed types:', feedTypesResponse.status)
        setFeedTypes([])
      }
    } catch (err) {
      console.error('Error loading feed types:', err)
      setFeedTypes([])
    }
    
    // Load feeding records for this animal - FIXED URL
    try {
      const feedingResponse = await fetch(
        `/api/farms/${farmId}/animals/${animalId}/feeding-records?limit=50`
      )
      if (feedingResponse.ok) {
        const feedingData = await feedingResponse.json()
        setFeedingRecords(Array.isArray(feedingData) ? feedingData : feedingData?.records || [])
      } else {
        console.warn('Failed to load feeding records:', feedingResponse.status)
        setFeedingRecords([])
      }
    } catch (err) {
      console.error('Error loading feeding records:', err)
      setFeedingRecords([])
    }
    
    // Load feeding schedules for this animal - FIXED URL
    try {
      const schedulesResponse = await fetch(
        `/api/farms/${farmId}/animals/${animalId}/feeding-schedules`
      )
      if (schedulesResponse.ok) {
        const schedulesData = await schedulesResponse.json()
        setFeedingSchedules(Array.isArray(schedulesData) ? schedulesData : schedulesData?.schedules || [])
      } else {
        console.warn('Failed to load feeding schedules:', schedulesResponse.status)
        setFeedingSchedules([])
      }
    } catch (err) {
      console.error('Error loading feeding schedules:', err)
      setFeedingSchedules([])
    }
    
    // Load nutritional targets for this animal - FIXED URL
    try {
      const targetsResponse = await fetch(
        `/api/farms/${farmId}/animals/${animalId}/nutrition-targets`
      )
      if (targetsResponse.ok) {
        const targetsData = await targetsResponse.json()
        setNutritionalTargets(targetsData?.targets || null)
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
      totalQuantity: todayRecords.reduce((sum, record) => sum + record.quantity_kg, 0),
      totalCost: todayRecords.reduce((sum, record) => sum + (record.total_cost || 0), 0),
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

      // Create proper timestamp from feeding time
      const feedingDateTime = new Date(`${recordForm.feeding_date}T${recordForm.feeding_time}`)
      
      const feedType = feedTypes.find(ft => ft.id === recordForm.feed_type_id)
      const costPerKg = recordForm.cost_per_kg ? Number(recordForm.cost_per_kg) : feedType?.typical_cost_per_kg || 0
      const totalCost = Number(recordForm.quantity_kg) * costPerKg

      const newRecordData = {
        farmId,
        feedingTime: feedingDateTime.toISOString(),
        mode: recordForm.feeding_mode,
        batchId: null,
        entries: [{
          feedTypeId: recordForm.feed_type_id,
          quantityKg: Number(recordForm.quantity_kg),
          animalIds: [animalId],
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

  const resetRecordForm = () => {
    setRecordForm({
      feeding_date: format(new Date(), 'yyyy-MM-dd'),
      feeding_time: format(new Date(), 'HH:mm'),
      feed_type_id: '',
      quantity_kg: '',
      cost_per_kg: '',
      notes: '',
      feeding_mode: 'individual'
    })
  }

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
              getFilteredRecords().map((record) => (
                <Card key={record.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{record.feed_name}</h4>
                        <p className="text-sm text-gray-600">
                          {format(parseISO(record.feeding_time), 'MMM dd, yyyy')} at {format(parseISO(record.feeding_time), 'HH:mm')}
                        </p>
                        {record.feeding_mode === 'batch' && record.batch_name && (
                          <p className="text-xs text-blue-600 mt-1">
                            Batch: {record.batch_name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-blue-100 text-blue-800">
                          {record.feeding_mode}
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
                        <p className="text-xs font-medium text-gray-700">Quantity</p>
                        <p className="text-sm font-semibold">{record.quantity_kg}kg</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700">Mode</p>
                        <p className="text-sm capitalize">{record.feeding_mode}</p>
                      </div>
                      {record.animal_count && record.feeding_mode === 'batch' && (
                        <div>
                          <p className="text-xs font-medium text-gray-700">Animals</p>
                          <p className="text-sm font-semibold">{record.animal_count}</p>
                        </div>
                      )}
                      {record.total_cost && (
                        <div>
                          <p className="text-xs font-medium text-gray-700">Cost</p>
                          <p className="text-sm font-semibold">${record.total_cost.toFixed(2)}</p>
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

                    {feed.nutritional_info && (
                      <p className="text-xs text-gray-600 mt-2">{feed.nutritional_info}</p>
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

      {/* Add Feeding Record Modal */}
      <Modal isOpen={showAddRecordModal} onClose={() => setShowAddRecordModal(false)}>
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
                  onChange={(e) => setRecordForm(prev => ({ ...prev, feeding_date: e.target.value }))}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div>
                <Label htmlFor="feeding_time">Time *</Label>
                <Input
                  id="feeding_time"
                  type="time"
                  value={recordForm.feeding_time}
                  onChange={(e) => setRecordForm(prev => ({ ...prev, feeding_time: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="feed_type_id">Feed Type *</Label>
              <Select
                value={recordForm.feed_type_id}
                onValueChange={(value) => {
                  const selectedFeed = feedTypes.find(f => f.id === value)
                  setRecordForm(prev => ({ 
                    ...prev, 
                    feed_type_id: value,
                    cost_per_kg: selectedFeed?.typical_cost_per_kg.toString() || ''
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select feed type" />
                </SelectTrigger>
                <SelectContent>
                  {feedTypes.map((feed) => (
                    <SelectItem key={feed.id} value={feed.id}>
                      {feed.name} (${feed.typical_cost_per_kg}/kg)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity_kg">Quantity (kg) *</Label>
                <Input
                  id="quantity_kg"
                  type="number"
                  value={recordForm.quantity_kg}
                  onChange={(e) => setRecordForm(prev => ({ ...prev, quantity_kg: e.target.value }))}
                  placeholder="0.0"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <Label htmlFor="cost_per_kg">Cost per kg ($)</Label>
                <Input
                  id="cost_per_kg"
                  type="number"
                  value={recordForm.cost_per_kg}
                  onChange={(e) => setRecordForm(prev => ({ ...prev, cost_per_kg: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={recordForm.notes}
                onChange={(e) => setRecordForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional observations or notes"
                rows={3}
              />
            </div>

            {recordForm.quantity_kg && recordForm.cost_per_kg && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Total cost: ${(Number(recordForm.quantity_kg) * Number(recordForm.cost_per_kg)).toFixed(2)}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowAddRecordModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
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

      {/* Nutrition Targets Modal */}
      <Modal isOpen={showNutritionModal} onClose={() => setShowNutritionModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Set Nutritional Targets</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="daily_dry_matter">Daily Dry Matter (kg) *</Label>
              <Input
                id="daily_dry_matter"
                type="number"
                value={nutritionForm.daily_dry_matter_kg}
                onChange={(e) => setNutritionForm(prev => ({ ...prev, daily_dry_matter_kg: e.target.value }))}
                placeholder="22.0"
                min="0"
                step="0.1"
              />
            </div>

            <div>
              <Label htmlFor="daily_protein">Daily Protein (kg) *</Label>
              <Input
                id="daily_protein"
                type="number"
                value={nutritionForm.daily_protein_kg}
                onChange={(e) => setNutritionForm(prev => ({ ...prev, daily_protein_kg: e.target.value }))}
                placeholder="3.2"
                min="0"
                step="0.1"
              />
            </div>

            <div>
              <Label htmlFor="daily_energy">Daily Energy (MJ) *</Label>
              <Input
                id="daily_energy"
                type="number"
                value={nutritionForm.daily_energy_mj}
                onChange={(e) => setNutritionForm(prev => ({ ...prev, daily_energy_mj: e.target.value }))}
                placeholder="280.0"
                min="0"
                step="1"
              />
            </div>

            <div>
              <Label htmlFor="target_weight_gain">Target Weight Gain (kg/day)</Label>
              <Input
                id="target_weight_gain"
                type="number"
                value={nutritionForm.target_weight_gain_kg_per_day}
                onChange={(e) => setNutritionForm(prev => ({ ...prev, target_weight_gain_kg_per_day: e.target.value }))}
                placeholder="0.8"
                min="0"
                step="0.1"
              />
            </div>

            <div>
              <Label htmlFor="milk_target">Milk Production Target (L/day)</Label>
              <Input
                id="milk_target"
                type="number"
                value={nutritionForm.milk_production_target_liters}
                onChange={(e) => setNutritionForm(prev => ({ ...prev, milk_production_target_liters: e.target.value }))}
                placeholder="25.0"
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowNutritionModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                // Handle saving nutrition targets
                setShowNutritionModal(false)
              }}
              disabled={!nutritionForm.daily_dry_matter_kg || !nutritionForm.daily_protein_kg || !nutritionForm.daily_energy_mj || submitting}
            >
              Save Targets
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}