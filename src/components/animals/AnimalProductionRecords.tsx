'use client'

import { useState, useEffect } from 'react'
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
  Baby
} from 'lucide-react'
import { Animal } from '@/types/database'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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
}

export function AnimalProductionRecords({ 
  animalId, 
  animal,
  canAddRecords 
}: AnimalProductionRecordsProps) {
  const [records, setRecords] = useState<ProductionRecord[]>([])
  const [stats, setStats] = useState<AnimalProductionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(30)
  
  // Determine if production records are applicable
  const isLactating = animal.production_status === 'lactating'
  const isServed = animal.production_status === 'served'
  const isDry = animal.production_status === 'dry'
  const isHeifer = animal.production_status === 'heifer'
  const isCalf = animal.production_status === 'calf'
  const isBull = animal.gender === 'male'
  
  const isProducingMilk = isLactating || isServed
  
  const showProductionRecords = isProducingMilk
  const canAddProductionRecords = canAddRecords && isProducingMilk

  useEffect(() => {
    if (showProductionRecords) {
      loadProductionData()
    }
  }, [animalId, selectedPeriod, showProductionRecords])
  
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
      
      {/* Production Status Badge */}
      <div className="flex items-center space-x-2">
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
      
      {/* Active Production Section */}
      {showProductionRecords && !loading && (
        <>
          {/* Production Statistics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Volume</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {stats.totalVolume.toFixed(1)}L
                      </p>
                      <p className="text-xs text-gray-500">Last {selectedPeriod} days</p>
                    </div>
                    <Droplets className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Daily</p>
                      <p className="text-2xl font-bold text-green-600">
                        {stats.avgDailyVolume.toFixed(1)}L
                      </p>
                      <div className={`flex items-center space-x-1 mt-1 px-2 py-0.5 rounded ${getTrendColor(stats.currentTrend)}`}>
                        {getTrendIcon(stats.currentTrend)}
                        <span className="text-xs font-medium capitalize">
                          {stats.currentTrend}
                        </span>
                      </div>
                    </div>
                    <BarChart3 className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Fat</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {stats.avgFatContent.toFixed(2)}%
                      </p>
                      <p className="text-xs text-gray-500">Quality metric</p>
                    </div>
                    <Target className="w-8 h-8 text-orange-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Protein</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {stats.avgProteinContent.toFixed(2)}%
                      </p>
                      <p className="text-xs text-gray-500">Quality metric</p>
                    </div>
                    <Activity className="w-8 h-8 text-purple-400" />
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
              
              {/* Show past production history for dry/served cows */}
              {(isDry || isServed) && getInactiveMessage().showHistory && (
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
              
              {/* Helpful info for heifers */}
              {isHeifer && getInactiveMessage().tip && (
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
            />
          </div>
        </Modal>
      )}
    </div>
  )
}