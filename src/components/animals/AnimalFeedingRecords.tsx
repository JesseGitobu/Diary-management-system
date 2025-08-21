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
  feeding_date: string
  feeding_time: string
  feed_type: string
  feed_name: string
  quantity_kg: number
  cost_per_kg?: number
  total_cost?: number
  feeding_method: 'manual' | 'automatic' | 'grazing'
  feed_quality: 'excellent' | 'good' | 'fair' | 'poor'
  notes?: string
  fed_by: string
  weather_conditions?: string
  appetite_rating: number // 1-5 scale
  created_at: string
  updated_at: string
}

interface FeedType {
  id: string
  name: string
  category: 'concentrate' | 'forage' | 'supplement' | 'mineral'
  protein_content?: number
  energy_content?: number
  cost_per_kg: number
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
  canAddRecords: boolean
}

export function AnimalFeedingRecords({ animalId, canAddRecords }: AnimalFeedingRecordsProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [feedingRecords, setFeedingRecords] = useState<FeedingRecord[]>([])
  const [feedTypes, setFeedTypes] = useState<FeedType[]>([])
  const [feedingSchedules, setFeedingSchedules] = useState<FeedingSchedule[]>([])
  const [nutritionalTargets, setNutritionalTargets] = useState<NutritionalTarget | null>(null)
  const [showAddRecordModal, setShowAddRecordModal] = useState(false)
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false)
  const [showNutritionModal, setShowNutritionModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<FeedingRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('week')
  const { isMobile } = useDeviceInfo()

  // Form states
  const [recordForm, setRecordForm] = useState({
    feeding_date: format(new Date(), 'yyyy-MM-dd'),
    feeding_time: format(new Date(), 'HH:mm'),
    feed_type: '',
    feed_name: '',
    quantity_kg: '',
    cost_per_kg: '',
    feeding_method: 'manual' as 'manual' | 'automatic' | 'grazing',
    feed_quality: 'good' as 'excellent' | 'good' | 'fair' | 'poor',
    appetite_rating: 4,
    notes: '',
    fed_by: '',
    weather_conditions: ''
  })

  const [scheduleForm, setScheduleForm] = useState<{
    feed_type_id: string;
    feed_name: string;
    scheduled_time: string;
    quantity_kg: string;
    frequency: 'daily' | 'twice_daily' | 'weekly' | 'as_needed';
    start_date: string;
    end_date: string;
  }>({
    feed_type_id: '',
    feed_name: '',
    scheduled_time: '07:00',
    quantity_kg: '',
    frequency: 'daily',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: ''
  })

  const [nutritionForm, setNutritionForm] = useState({
    daily_dry_matter_kg: '',
    daily_protein_kg: '',
    daily_energy_mj: '',
    target_weight_gain_kg_per_day: '',
    milk_production_target_liters: ''
  })

  // Load data
  useEffect(() => {
    loadFeedingData()
  }, [animalId])

  const loadFeedingData = async () => {
    try {
      setLoading(true)
      
      // Simulate API calls - replace with actual API endpoints
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock feed types
      const mockFeedTypes: FeedType[] = [
        {
          id: '1',
          name: 'Dairy Concentrate',
          category: 'concentrate',
          protein_content: 18,
          energy_content: 13.5,
          cost_per_kg: 0.45,
          supplier: 'AgriFeeds Ltd',
          nutritional_info: 'High protein concentrate for lactating cows'
        },
        {
          id: '2',
          name: 'Alfalfa Hay',
          category: 'forage',
          protein_content: 15,
          energy_content: 9.2,
          cost_per_kg: 0.25,
          supplier: 'Local Farm Co-op'
        },
        {
          id: '3',
          name: 'Mineral Supplement',
          category: 'mineral',
          cost_per_kg: 2.50,
          supplier: 'NutriMin Solutions'
        },
        {
          id: '4',
          name: 'Silage Corn',
          category: 'forage',
          protein_content: 8,
          energy_content: 11.0,
          cost_per_kg: 0.15
        }
      ]

      // Mock feeding records
      const mockRecords: FeedingRecord[] = [
        {
          id: '1',
          animal_id: animalId,
          feeding_date: format(new Date(), 'yyyy-MM-dd'),
          feeding_time: '07:00',
          feed_type: 'concentrate',
          feed_name: 'Dairy Concentrate',
          quantity_kg: 4.5,
          cost_per_kg: 0.45,
          total_cost: 2.03,
          feeding_method: 'manual',
          feed_quality: 'excellent',
          appetite_rating: 5,
          fed_by: 'John Farmer',
          weather_conditions: 'Clear',
          notes: 'Animal showed good appetite',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          animal_id: animalId,
          feeding_date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
          feeding_time: '17:30',
          feed_type: 'forage',
          feed_name: 'Alfalfa Hay',
          quantity_kg: 8.0,
          cost_per_kg: 0.25,
          total_cost: 2.00,
          feeding_method: 'manual',
          feed_quality: 'good',
          appetite_rating: 4,
          fed_by: 'Mary Worker',
          created_at: subDays(new Date(), 1).toISOString(),
          updated_at: subDays(new Date(), 1).toISOString()
        }
      ]

      // Mock feeding schedules
      const mockSchedules: FeedingSchedule[] = [
        {
          id: '1',
          animal_id: animalId,
          feed_type_id: '1',
          feed_name: 'Dairy Concentrate',
          scheduled_time: '07:00',
          quantity_kg: 4.5,
          frequency: 'daily',
          start_date: format(new Date(), 'yyyy-MM-dd'),
          is_active: true,
          created_by: 'Farm Manager'
        },
        {
          id: '2',
          animal_id: animalId,
          feed_type_id: '2',
          feed_name: 'Alfalfa Hay',
          scheduled_time: '17:00',
          quantity_kg: 8.0,
          frequency: 'daily',
          start_date: format(new Date(), 'yyyy-MM-dd'),
          is_active: true,
          created_by: 'Farm Manager'
        }
      ]

      // Mock nutritional targets
      const mockTargets: NutritionalTarget = {
        daily_dry_matter_kg: 22.0,
        daily_protein_kg: 3.2,
        daily_energy_mj: 280.0,
        target_weight_gain_kg_per_day: 0.8,
        milk_production_target_liters: 25.0
      }

      setFeedTypes(mockFeedTypes)
      setFeedingRecords(mockRecords)
      setFeedingSchedules(mockSchedules)
      setNutritionalTargets(mockTargets)
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
      parseISO(record.feeding_date) >= startDate
    )
  }

  const calculateDailyTotals = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const todayRecords = feedingRecords.filter(record => record.feeding_date === today)
    
    return {
      totalQuantity: todayRecords.reduce((sum, record) => sum + record.quantity_kg, 0),
      totalCost: todayRecords.reduce((sum, record) => sum + (record.total_cost || 0), 0),
      feedingCount: todayRecords.length,
      averageAppetite: todayRecords.length > 0 
        ? todayRecords.reduce((sum, record) => sum + record.appetite_rating, 0) / todayRecords.length 
        : 0
    }
  }

  const calculateWeeklyTotals = () => {
    const weekStart = startOfWeek(new Date())
    const weekEnd = endOfWeek(new Date())
    const weekRecords = feedingRecords.filter(record => {
      const recordDate = parseISO(record.feeding_date)
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
    try {
      const totalCost = recordForm.cost_per_kg 
        ? Number(recordForm.quantity_kg) * Number(recordForm.cost_per_kg)
        : undefined

      const newRecord: FeedingRecord = {
        id: Date.now().toString(),
        animal_id: animalId,
        feeding_date: recordForm.feeding_date,
        feeding_time: recordForm.feeding_time,
        feed_type: recordForm.feed_type,
        feed_name: recordForm.feed_name,
        quantity_kg: Number(recordForm.quantity_kg),
        cost_per_kg: recordForm.cost_per_kg ? Number(recordForm.cost_per_kg) : undefined,
        total_cost: totalCost,
        feeding_method: recordForm.feeding_method,
        feed_quality: recordForm.feed_quality,
        appetite_rating: recordForm.appetite_rating,
        notes: recordForm.notes || undefined,
        fed_by: recordForm.fed_by,
        weather_conditions: recordForm.weather_conditions || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      setFeedingRecords(prev => [newRecord, ...prev])
      setShowAddRecordModal(false)
      resetRecordForm()
    } catch (err) {
      setError('Failed to add feeding record')
      console.error('Error adding feeding record:', err)
    }
  }

  const handleAddSchedule = async () => {
    try {
      const newSchedule: FeedingSchedule = {
        id: Date.now().toString(),
        animal_id: animalId,
        feed_type_id: scheduleForm.feed_type_id,
        feed_name: scheduleForm.feed_name,
        scheduled_time: scheduleForm.scheduled_time,
        quantity_kg: Number(scheduleForm.quantity_kg),
        frequency: scheduleForm.frequency,
        start_date: scheduleForm.start_date,
        end_date: scheduleForm.end_date || undefined,
        is_active: true,
        created_by: 'Current User'
      }

      setFeedingSchedules(prev => [newSchedule, ...prev])
      setShowAddScheduleModal(false)
      resetScheduleForm()
    } catch (err) {
      setError('Failed to add feeding schedule')
      console.error('Error adding feeding schedule:', err)
    }
  }

  const resetRecordForm = () => {
    setRecordForm({
      feeding_date: format(new Date(), 'yyyy-MM-dd'),
      feeding_time: format(new Date(), 'HH:mm'),
      feed_type: '',
      feed_name: '',
      quantity_kg: '',
      cost_per_kg: '',
      feeding_method: 'manual',
      feed_quality: 'good',
      appetite_rating: 4,
      notes: '',
      fed_by: '',
      weather_conditions: ''
    })
  }

  const resetScheduleForm = () => {
    setScheduleForm({
      feed_type_id: '',
      feed_name: '',
      scheduled_time: '07:00',
      quantity_kg: '',
      frequency: 'daily',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: ''
    })
  }

  const getAppetiteColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600'
    if (rating >= 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getQualityBadge = (quality: string) => {
    const colors = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      fair: 'bg-yellow-100 text-yellow-800',
      poor: 'bg-red-100 text-red-800'
    }
    return <Badge className={colors[quality as keyof typeof colors]}>{quality}</Badge>
  }

  const dailyTotals = calculateDailyTotals()
  const weeklyTotals = calculateWeeklyTotals()
  const nutritionProgress = getNutritionProgress()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                  Avg Appetite
                </p>
                <p className={cn("font-semibold", isMobile ? "text-sm" : "text-lg", getAppetiteColor(dailyTotals.averageAppetite))}>
                  {dailyTotals.averageAppetite.toFixed(1)}/5
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
            {isMobile ? "Feed" : "Feeding"}
          </TabsTrigger>
          <TabsTrigger value="schedule" className={cn(isMobile && "text-xs")}>
            {isMobile ? "Schedule" : "Schedule"}
          </TabsTrigger>
          <TabsTrigger value="nutrition" className={cn(isMobile && "text-xs")}>
            {isMobile ? "Nutrition" : "Nutrition"}
          </TabsTrigger>
          <TabsTrigger value="analysis" className={cn(isMobile && "text-xs")}>
            {isMobile ? "Analysis" : "Analysis"}
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
                          {format(parseISO(record.feeding_date), 'MMM dd')} at {record.feeding_time}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getQualityBadge(record.feed_quality)}
                        {canAddRecords && (
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
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
                        <p className="text-xs font-medium text-gray-700">Method</p>
                        <p className="text-sm capitalize">{record.feeding_method}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700">Appetite</p>
                        <p className={cn("text-sm font-semibold", getAppetiteColor(record.appetite_rating))}>
                          {record.appetite_rating}/5
                        </p>
                      </div>
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

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span>Fed by: {record.fed_by}</span>
                      {record.weather_conditions && (
                        <span>Weather: {record.weather_conditions}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Feeding Schedule</h4>
            {canAddRecords && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAddScheduleModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Schedule
              </Button>
            )}
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
                      {canAddRecords && (
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className={cn("grid gap-3", isMobile ? "grid-cols-2" : "grid-cols-3")}>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Quantity</p>
                      <p className="text-sm">{schedule.quantity_kg}kg</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Start Date</p>
                      <p className="text-sm">{format(parseISO(schedule.start_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Created By</p>
                      <p className="text-sm">{schedule.created_by}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {feedingSchedules.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">No feeding schedules set</p>
                  {canAddRecords && (
                    <Button onClick={() => setShowAddScheduleModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Schedule
                    </Button>
                  )}
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
                      <p className="text-sm font-semibold">${feed.cost_per_kg}/kg</p>
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
                  const typeRecords = feedingRecords.filter(r => r.feed_type === type)
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

          {/* Appetite Trends */}
          <Card>
            <CardHeader>
              <CardTitle className={cn(isMobile ? "text-base" : "text-lg")}>
                Appetite Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 mb-2">Appetite trend charts coming soon</p>
                <p className="text-sm text-gray-400">
                  Track appetite patterns and feeding behavior over time
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
              <Label htmlFor="feed_type">Feed Type *</Label>
              <Select
                value={recordForm.feed_type}
                onValueChange={(value) => setRecordForm(prev => ({ ...prev, feed_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select feed type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concentrate">Concentrate</SelectItem>
                  <SelectItem value="forage">Forage</SelectItem>
                  <SelectItem value="supplement">Supplement</SelectItem>
                  <SelectItem value="mineral">Mineral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="feed_name">Feed Name *</Label>
              <Select
                value={recordForm.feed_name}
                onValueChange={(value) => {
                  const selectedFeed = feedTypes.find(f => f.name === value)
                  setRecordForm(prev => ({ 
                    ...prev, 
                    feed_name: value,
                    cost_per_kg: selectedFeed?.cost_per_kg.toString() || ''
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select feed" />
                </SelectTrigger>
                <SelectContent>
                  {feedTypes.map((feed) => (
                    <SelectItem key={feed.id} value={feed.name}>
                      {feed.name} (${feed.cost_per_kg}/kg)
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="feeding_method">Feeding Method</Label>
                <Select
                  value={recordForm.feeding_method}
                  onValueChange={(value: 'manual' | 'automatic' | 'grazing') => 
                    setRecordForm(prev => ({ ...prev, feeding_method: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="automatic">Automatic</SelectItem>
                    <SelectItem value="grazing">Grazing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="feed_quality">Feed Quality</Label>
                <Select
                  value={recordForm.feed_quality}
                  onValueChange={(value: 'excellent' | 'good' | 'fair' | 'poor') => 
                    setRecordForm(prev => ({ ...prev, feed_quality: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="appetite_rating">Appetite Rating (1-5)</Label>
              <Select
                value={recordForm.appetite_rating.toString()}
                onValueChange={(value) => 
                  setRecordForm(prev => ({ ...prev, appetite_rating: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Very Poor</SelectItem>
                  <SelectItem value="2">2 - Poor</SelectItem>
                  <SelectItem value="3">3 - Average</SelectItem>
                  <SelectItem value="4">4 - Good</SelectItem>
                  <SelectItem value="5">5 - Excellent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fed_by">Fed By *</Label>
              <Input
                id="fed_by"
                value={recordForm.fed_by}
                onChange={(e) => setRecordForm(prev => ({ ...prev, fed_by: e.target.value }))}
                placeholder="Person who fed the animal"
              />
            </div>

            <div>
              <Label htmlFor="weather_conditions">Weather Conditions</Label>
              <Input
                id="weather_conditions"
                value={recordForm.weather_conditions}
                onChange={(e) => setRecordForm(prev => ({ ...prev, weather_conditions: e.target.value }))}
                placeholder="e.g., Clear, Rainy, Hot"
              />
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
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddRecord}
              disabled={!recordForm.feeding_date || !recordForm.feed_name || !recordForm.quantity_kg || !recordForm.fed_by}
            >
              Record Feeding
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Schedule Modal */}
      <Modal isOpen={showAddScheduleModal} onClose={() => setShowAddScheduleModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Create Feeding Schedule</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="schedule_feed_name">Feed *</Label>
              <Select
                value={scheduleForm.feed_name}
                onValueChange={(value) => {
                  const selectedFeed = feedTypes.find(f => f.name === value)
                  setScheduleForm(prev => ({ 
                    ...prev, 
                    feed_name: value,
                    feed_type_id: selectedFeed?.id || ''
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select feed" />
                </SelectTrigger>
                <SelectContent>
                  {feedTypes.map((feed) => (
                    <SelectItem key={feed.id} value={feed.name}>
                      {feed.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduled_time">Time *</Label>
                <Input
                  id="scheduled_time"
                  type="time"
                  value={scheduleForm.scheduled_time}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, scheduled_time: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="schedule_quantity">Quantity (kg) *</Label>
                <Input
                  id="schedule_quantity"
                  type="number"
                  value={scheduleForm.quantity_kg}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, quantity_kg: e.target.value }))}
                  placeholder="0.0"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="frequency">Frequency *</Label>
              <Select
                value={scheduleForm.frequency}
                onValueChange={(value: 'daily' | 'twice_daily' | 'weekly' | 'as_needed') => 
                  setScheduleForm(prev => ({ ...prev, frequency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="twice_daily">Twice Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="as_needed">As Needed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={scheduleForm.start_date}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, start_date: e.target.value }))}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date (Optional)</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={scheduleForm.end_date}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, end_date: e.target.value }))}
                  min={scheduleForm.start_date}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowAddScheduleModal(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddSchedule}
              disabled={!scheduleForm.feed_name || !scheduleForm.quantity_kg}
            >
              Create Schedule
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
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                // Handle saving nutrition targets
                setShowNutritionModal(false)
              }}
              disabled={!nutritionForm.daily_dry_matter_kg || !nutritionForm.daily_protein_kg || !nutritionForm.daily_energy_mj}
            >
              Save Targets
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}