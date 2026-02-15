'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils/cn'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { ProductionEntryForm } from '@/components/production/ProductionEntryForm'
import { 
  Milk, 
  Plus, 
  AlertCircle, 
  Calendar, 
  TrendingUp,
  Droplets,
  Target,
  Activity,
  BarChart3,
  Clock,
  ThermometerSun,
  Baby,
  CheckCircle2
} from 'lucide-react'
import { Animal } from '@/types/database'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ProductionSettings } from '@/types/production-distribution-settings'
import { toast } from 'react-hot-toast'

interface ProductionRecord {
  id: string
  record_date: string
  milking_session: 'morning' | 'afternoon' | 'evening'
  milk_volume: number
  fat_content?: number
  protein_content?: number
  somatic_cell_count?: number
  lactose_content?: number
  temperature?: number
  ph_level?: number
  notes?: string
  created_at: string
}

interface AnimalProductionStats {
  totalVolume: number
  avgDailyVolume: number
  avgFatContent: number
  avgProteinContent: number
  recordsCount: number
  lastRecordDate: string
  peakVolume: number
  currentTrend: 'increasing' | 'decreasing' | 'stable'
}

interface AnimalProductionRecordsProps {
  animalId: string
  animal: Animal
  canAddRecords: boolean
  onProductionStatusChanged?: (newStatus: string) => void
}

export function AnimalProductionRecords({ 
  animalId, 
  animal,
  canAddRecords,
  onProductionStatusChanged
}: AnimalProductionRecordsProps) {
  const [records, setRecords] = useState<ProductionRecord[]>([])
  const [stats, setStats] = useState<AnimalProductionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(30)
  const [productionSettings, setProductionSettings] = useState<ProductionSettings | null>(null)
  const [dryingOff, setDryingOff] = useState(false)
  const [daysInMilk, setDaysInMilk] = useState(0)
  const [lactationNumber, setLactationNumber] = useState<number | null>(null)
  const [shouldShowDryOffSuggestion, setShouldShowDryOffSuggestion] = useState(false)
  const [showDryOffButton, setShowDryOffButton] = useState(false)  // ✅ ENHANCED: Button visibility flag
  const [daysUntilDryOff, setDaysUntilDryOff] = useState(0)
  const [daysPregnant, setDaysPregnant] = useState(0)
  
  // Determine if production records are applicable
  const isLactating = animal.production_status === 'lactating'
  const isServed = animal.production_status === 'served'
  const isDry = animal.production_status === 'dry'
  const isHeifer = animal.production_status === 'heifer'
  const isCalf = animal.production_status === 'calf'
  const isBull = animal.gender === 'male'
  
  // ✅ ENHANCED: Check lactation number - animals with lactation_number = 0 cannot have production records
  // This excludes first-time pregnant heifers from production tracking until after first calving
  const hasNoLactationHistory = animal.lactation_number === 0 || animal.lactation_number === null
  const isProducingMilk = (isLactating || isServed) && !hasNoLactationHistory
  
  const showProductionRecords = isProducingMilk
  const canAddProductionRecords = canAddRecords && isProducingMilk

  useEffect(() => {
    // Fetch settings independently
    const fetchSettings = async () => {
      try {
        const response = await fetch(`/api/settings/production?farmId=${animal.farm_id}`)
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setProductionSettings(result.settings)
          }
        }
      } catch (error) {
        console.error('Error loading production settings:', error)
      }
    }
    fetchSettings()
  }, [animal.farm_id])

  useEffect(() => {
    if (showProductionRecords) {
      loadProductionData()
    }
  }, [animalId, selectedPeriod, showProductionRecords])
  
  // ✅ NEW: Load lactation metrics
  useEffect(() => {
    if (isLactating || isServed) {
      loadLactationMetrics()
    }
  }, [animalId, animal.production_status, animal.days_in_milk, animal.lactation_number])
  
  const loadLactationMetrics = async () => {
    try {
      // Update days_in_milk from animal data
      setDaysInMilk(animal.days_in_milk || 0)
      setLactationNumber(animal.lactation_number)
      
      // For served animals, check if they should be dried off
      if (isServed && animal.farm_id) {
        const response = await fetch(
          `/api/animals/${animalId}/drying-status?farmId=${animal.farm_id}`
        )
        
        if (response.ok) {
          const result = await response.json()
          setShouldShowDryOffSuggestion(result.shouldDryOff)
          setShowDryOffButton(result.showDryOffButton)  // ✅ ENHANCED: Set button visibility
          setDaysUntilDryOff(result.daysUntilDryOff)
          setDaysPregnant(result.daysPregnant)
        }
      }
    } catch (error) {
      console.error('Error loading lactation metrics:', error)
    }
  }
  
  const loadProductionData = async () => {
    setLoading(true)
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - selectedPeriod * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]
      
      const response = await fetch(
        `/api/production?animal_id=${animalId}&start_date=${startDate}&end_date=${endDate}`
      )
      
      if (response.ok) {
        const { data } = await response.json()
        setRecords(data || [])
        calculateStats(data || [])
      }
    } catch (error) {
      console.error('Error loading production data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const calculateStats = (productionRecords: ProductionRecord[]) => {
    if (productionRecords.length === 0) {
      setStats(null)
      return
    }
    
    const totalVolume = productionRecords.reduce((sum, r) => sum + r.milk_volume, 0)
    const avgDailyVolume = totalVolume / selectedPeriod
    
    const recordsWithFat = productionRecords.filter(r => r.fat_content)
    const avgFatContent = recordsWithFat.length 
      ? recordsWithFat.reduce((sum, r) => sum + (r.fat_content || 0), 0) / recordsWithFat.length
      : 0
    
    const recordsWithProtein = productionRecords.filter(r => r.protein_content)
    const avgProteinContent = recordsWithProtein.length
      ? recordsWithProtein.reduce((sum, r) => sum + (r.protein_content || 0), 0) / recordsWithProtein.length
      : 0
    
    const peakVolume = Math.max(...productionRecords.map(r => r.milk_volume))
    
    // Calculate trend
    const recentRecords = productionRecords.slice(0, 7)
    const olderRecords = productionRecords.slice(7, 14)
    const recentAvg = recentRecords.reduce((sum, r) => sum + r.milk_volume, 0) / recentRecords.length
    const olderAvg = olderRecords.length 
      ? olderRecords.reduce((sum, r) => sum + r.milk_volume, 0) / olderRecords.length
      : recentAvg
    
    let currentTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (recentAvg > olderAvg * 1.1) currentTrend = 'increasing'
    else if (recentAvg < olderAvg * 0.9) currentTrend = 'decreasing'
    
    setStats({
      totalVolume,
      avgDailyVolume,
      avgFatContent,
      avgProteinContent,
      recordsCount: productionRecords.length,
      lastRecordDate: productionRecords[0]?.record_date || '',
      peakVolume,
      currentTrend
    })
  }
  
  const handleRecordAdded = () => {
    setShowAddModal(false)
    loadProductionData()
  }
  
  const handleStartDryOff = async () => {
    const confirmed = window.confirm(
      `Start dry off period for ${animal.name || animal.tag_number}?\n\n` +
      `This will change the production status to "dry" and pause milk production tracking.\n\n` +
      `Click OK to proceed or Cancel to review.`
    )
    
    if (!confirmed) return
    
    setDryingOff(true)
    try {
      const response = await fetch(`/api/animals/${animalId}/production-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          production_status: 'dry',
          dry_off_date: new Date().toISOString().split('T')[0]
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update production status')
      }
      
      const result = await response.json()
      
      toast.success('Animal moved to dry period successfully!')
      
      // Notify parent component of status change
      onProductionStatusChanged?.('dry')
      
      // Refresh animal data in parent component - could also trigger a refresh
    } catch (error) {
      toast.error(`Failed to start dry off: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDryingOff(false)
    }
  }
  
  const getInactiveMessage = () => {
    if (isBull) {
      return {
        title: "Production Not Applicable",
        message: "Milk production tracking is not available for male animals.",
        icon: <AlertCircle className="w-12 h-12 text-gray-400" />
      }
    }
    
    if (isCalf) {
      return {
        title: "Production Not Started",
        message: "This calf is too young for production tracking. Production records will become available after first calving.",
        icon: <Calendar className="w-12 h-12 text-gray-400" />
      }
    }
    
    // ✅ ENHANCED: First-time pregnant heifers (served but lactation_number = 0)
    if (isServed && hasNoLactationHistory) {
      return {
        title: "Production Not Yet Available",
        message: "This heifer is pregnant for the first time. Production tracking will become available after the first calving.",
        icon: <Baby className="w-12 h-12 text-blue-400" />,
        tip: "💡 Tip: Once this heifer gives birth, production records will automatically activate and you can begin tracking milk production."
      }
    }
    
    if (isHeifer) {
      return {
        title: "Production Not Started",
        message: "This heifer has not yet calved. Production tracking will begin automatically after first calving.",
        icon: <Calendar className="w-12 h-12 text-gray-400" />,
        tip: "💡 Tip: Production tracking will automatically activate when this heifer calves for the first time."
      }
    }
    
    // if (isServed) {
    //   return {
    //     title: "Production Paused - Pregnant",
    //     message: "This animal is currently pregnant (served). Production tracking is paused and will resume after calving.",
    //     icon: <Clock className="w-12 h-12 text-blue-400" />,
    //     showHistory: true
    //   }
    // }
    
    if (isDry) {
      return {
        title: "Currently Not Producing",
        message: "This animal is in the dry period (not lactating). Production tracking is paused until next lactation begins.",
        icon: <Milk className="w-12 h-12 text-gray-400" />,
        showHistory: true
      }
    }
    
    return {
      title: "Production Status Unknown",
      message: "Unable to determine production status for this animal.",
      icon: <AlertCircle className="w-12 h-12 text-gray-400" />
    }
  }
  
  // Prepare chart data
  const chartData = records
    .slice(0, 30)
    .reverse()
    .map(record => ({
      date: new Date(record.record_date).toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short' 
      }),
      volume: record.milk_volume,
      fat: record.fat_content || 0,
      protein: record.protein_content || 0
    }))
  
  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return <TrendingUp className="w-4 h-4 text-green-600" />
    if (trend === 'decreasing') return <TrendingUp className="w-4 h-4 text-red-600 transform rotate-180" />
    return <Activity className="w-4 h-4 text-gray-600" />
  }
  
  const getTrendColor = (trend: string) => {
    if (trend === 'increasing') return 'text-green-600 bg-green-50'
    if (trend === 'decreasing') return 'text-red-600 bg-red-50'
    return 'text-gray-600 bg-gray-50'
  }

  return (
    <div className="space-y-6">
      {isServed && (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <Baby className="w-5 h-5 text-blue-600" />
          <div>
            <p className="font-medium text-blue-900">Currently Pregnant</p>
            <p className="text-sm text-blue-700">
              This animal is served (pregnant) but still producing milk. 
              Production will naturally decrease as pregnancy progresses.
            </p>
            {animal.expected_calving_date && (
              <p className="text-sm text-blue-600 mt-1">
                Expected calving: {new Date(animal.expected_calving_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    )}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Production Records</h3>
          <p className="text-sm text-gray-600">
            {showProductionRecords 
              ? "Track milk production and quality metrics"
              : "Production tracking information"
            }
          </p>
        </div>
        {canAddProductionRecords && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Record
          </Button>
        )}
      </div>
      
      {/* Production Status Badge and Dry Off Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <Badge 
            className={
              isLactating 
                ? "bg-green-100 text-green-800" 
                : isServed
                ? "bg-blue-100 text-blue-800"
                : isDry
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-800"
            }
          >
            {animal.production_status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
          </Badge>
          {isServed && (
            <span className="text-sm text-gray-600">
              (Pregnant - Production will resume after calving)
            </span>
          )}
        </div>
        
        {/* Start Dry Off Button - Only for SERVED animals (pregnant) when ready */}
        {isServed && showDryOffButton && canAddRecords && (
          <Button
            onClick={handleStartDryOff}
            disabled={dryingOff}
            className={cn(
              "transition-all",
              shouldShowDryOffSuggestion 
                ? "bg-red-600 hover:bg-red-700 animate-pulse"  // Urgent - past threshold
                : "bg-amber-600 hover:bg-amber-700"              // Warning - within 2 days
            )}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {dryingOff ? 'Starting Dry Off...' : 'Start Dry Off Period'}
          </Button>
        )}
      </div>
      
      {/* ✅ NEW: Lactation Metrics Display */}
      {isLactating && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {/* Days in Milk */}
          <Card className="h-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600">Days in Milk</p>
                  <p className="text-2xl md:text-3xl font-bold text-purple-600 mt-2">
                    {daysInMilk}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {daysInMilk > 0 ? `${daysInMilk} days since calving` : 'Tracking lactation period'}
                  </p>
                </div>
                <Clock className="w-6 h-6 md:w-8 md:h-8 text-purple-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          {/* Lactation Number */}
          {lactationNumber !== null && (
            <Card className="h-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600">Lactation Number</p>
                    <p className="text-2xl md:text-3xl font-bold text-indigo-600 mt-2">
                      {lactationNumber}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Current lactation cycle
                    </p>
                  </div>
                  <Milk className="w-6 h-6 md:w-8 md:h-8 text-indigo-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      {/* ✅ ENHANCED: Served (Pregnant) Animal Metrics */}
      {isServed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {/* Days Pregnant */}
          <Card className="border-blue-200 bg-blue-50 h-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900">Days Pregnant</p>
                  <p className="text-2xl md:text-3xl font-bold text-blue-700 mt-2">
                    {daysPregnant}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Expected calving: {animal.expected_calving_date 
                      ? new Date(animal.expected_calving_date).toLocaleDateString() 
                      : 'TBD'}
                  </p>
                </div>
                <Calendar className="w-6 h-6 md:w-8 md:h-8 text-blue-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          {/* Drying Off Status */}
          <Card className={cn(
            "border-2 transition-all h-full",
            shouldShowDryOffSuggestion 
              ? "border-red-300 bg-red-50" 
              : showDryOffButton 
              ? "border-amber-300 bg-amber-50"
              : "border-gray-200 bg-gray-50"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    shouldShowDryOffSuggestion 
                      ? "text-red-900" 
                      : showDryOffButton 
                      ? "text-amber-900"
                      : "text-gray-600"
                  )}>
                    {shouldShowDryOffSuggestion 
                      ? "🚨 Ready to Dry Off Now" 
                      : showDryOffButton 
                      ? "⚠️ Dry Off Ready Soon" 
                      : "Days Until Dry Off"}
                  </p>
                  <p className={cn(
                    "text-2xl md:text-3xl font-bold mt-2",
                    shouldShowDryOffSuggestion 
                      ? "text-red-700" 
                      : showDryOffButton 
                      ? "text-amber-700"
                      : "text-blue-600"
                  )}>
                    {daysUntilDryOff}
                  </p>
                  <p className={cn(
                    "text-xs mt-1",
                    shouldShowDryOffSuggestion 
                      ? "text-red-600" 
                      : showDryOffButton 
                      ? "text-amber-600"
                      : "text-gray-500"
                  )}>
                    {shouldShowDryOffSuggestion 
                      ? "Click button to initiate dry-off" 
                      : showDryOffButton 
                      ? `${daysUntilDryOff} days until recommended dry-off`
                      : "Check back soon"}
                  </p>
                </div>
                <AlertCircle className={cn(
                  "w-6 h-6 md:w-8 md:h-8 flex-shrink-0",
                  shouldShowDryOffSuggestion 
                    ? "text-red-500" 
                    : showDryOffButton 
                    ? "text-amber-500"
                    : "text-gray-400"
                )} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Active Production Section */}
      {showProductionRecords && !loading && (
        <>
          {/* Production Statistics */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <Card className="h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600">Total Volume</p>
                      <p className="text-2xl md:text-3xl font-bold text-blue-600 mt-2">
                        {stats.totalVolume.toFixed(1)}L
                      </p>
                      <p className="text-xs text-gray-500">Last {selectedPeriod} days</p>
                    </div>
                    <Droplets className="w-6 h-6 md:w-8 md:h-8 text-blue-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600">Avg Daily</p>
                      <p className="text-2xl md:text-3xl font-bold text-green-600 mt-2">
                        {stats.avgDailyVolume.toFixed(1)}L
                      </p>
                      <div className={`flex items-center space-x-1 mt-1 px-2 py-0.5 rounded fit-content ${getTrendColor(stats.currentTrend)}`}>
                        {getTrendIcon(stats.currentTrend)}
                        <span className="text-xs font-medium capitalize">
                          {stats.currentTrend}
                        </span>
                      </div>
                    </div>
                    <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-green-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600">Avg Fat</p>
                      <p className="text-2xl md:text-3xl font-bold text-orange-600 mt-2">
                        {stats.avgFatContent.toFixed(2)}%
                      </p>
                      <p className="text-xs text-gray-500">Quality metric</p>
                    </div>
                    <Target className="w-6 h-6 md:w-8 md:h-8 text-orange-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600">Avg Protein</p>
                      <p className="text-2xl md:text-3xl font-bold text-purple-600 mt-2">
                        {stats.avgProteinContent.toFixed(2)}%
                      </p>
                      <p className="text-xs text-gray-500">Quality metric</p>
                    </div>
                    <Activity className="w-6 h-6 md:w-8 md:h-8 text-purple-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Period Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Period:</span>
            {([7, 30, 90] as const).map((days) => (
              <Button
                key={days}
                variant={selectedPeriod === days ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod(days)}
              >
                {days} days
              </Button>
            ))}
          </div>
          
          {/* Production Trend Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Production Trends</span>
                </CardTitle>
                <CardDescription>
                  Daily milk volume and quality over the last {selectedPeriod} days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" label={{ value: 'Volume (L)', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: 'Quality (%)', angle: 90, position: 'insideRight' }} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="volume" stroke="#3b82f6" name="Volume (L)" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="fat" stroke="#f97316" name="Fat %" />
                    <Line yAxisId="right" type="monotone" dataKey="protein" stroke="#a855f7" name="Protein %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          
          {/* Recent Production Records */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Production Records</CardTitle>
              <CardDescription>
                Latest milk production entries for this animal
              </CardDescription>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="text-center py-8">
                  <Milk className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No production records yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start tracking milk production for this animal
                  </p>
                  {canAddProductionRecords && (
                    <Button 
                      className="mt-4"
                      onClick={() => setShowAddModal(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Record
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {records.slice(0, 10).map((record) => (
                    <div 
                      key={record.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="font-medium text-gray-900">
                            {new Date(record.record_date).toLocaleDateString('en-GB')}
                          </span>
                          <Badge className={
                            record.milking_session === 'morning' ? 'bg-blue-100 text-blue-800' :
                            record.milking_session === 'afternoon' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-purple-100 text-purple-800'
                          }>
                            {record.milking_session}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">Volume:</span>
                            <span className="ml-2 font-medium text-blue-600">
                              {record.milk_volume}L
                            </span>
                          </div>
                          {record.fat_content && (
                            <div>
                              <span className="text-gray-600">Fat:</span>
                              <span className="ml-2 font-medium text-orange-600">
                                {record.fat_content}%
                              </span>
                            </div>
                          )}
                          {record.protein_content && (
                            <div>
                              <span className="text-gray-600">Protein:</span>
                              <span className="ml-2 font-medium text-purple-600">
                                {record.protein_content}%
                              </span>
                            </div>
                          )}
                          {record.temperature && (
                            <div>
                              <span className="text-gray-600">Temp:</span>
                              <span className="ml-2 font-medium text-red-600">
                                {record.temperature}°C
                              </span>
                            </div>
                          )}
                        </div>
                        {record.notes && (
                          <p className="mt-2 text-sm text-gray-600 italic">
                            {record.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
      
      {/* Loading State */}
      {loading && showProductionRecords && (
        <Card>
          <CardContent className="py-12">
            <div className="flex justify-center">
              <LoadingSpinner size="lg" />
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Inactive Status Messages */}
      {!showProductionRecords && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              {getInactiveMessage().icon}
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {getInactiveMessage().title}
              </h3>
              <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
                {getInactiveMessage().message}
              </p>
              
              {/* Show past production history for dry/served cows (but not first-time heifers) */}
              {(isDry || (isServed && !hasNoLactationHistory)) && getInactiveMessage().showHistory && (
                <div className="mt-6">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSelectedPeriod(90)
                      loadProductionData()
                    }}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    View Past Production
                  </Button>
                </div>
              )}
              
              {/* Helpful info for heifers or first-time pregnant heifers */}
              {(isHeifer || (isServed && hasNoLactationHistory)) && getInactiveMessage().tip && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
                  <p className="text-sm text-blue-800">
                    {getInactiveMessage().tip}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Add Production Record Modal */}
      {showAddModal && (
        <Modal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)}
          className="max-w-4xl"
        >
          <div className="p-6">
            <ProductionEntryForm
              farmId={animal.farm_id}
              animals={[{
                id: animal.id,
                tag_number: animal.tag_number,
                name: animal.name ?? undefined,
                gender: animal.gender,
                production_status: animal.production_status ?? 'unknown'
              }]}
              initialData={{
                animal_id: animal.id
              }}
              onSuccess={handleRecordAdded}
              settings={productionSettings}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
