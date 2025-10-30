// src/components/animals/AnimalsClientPage.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { AnimalsList } from '@/components/animals/AnimalsList'
import AddAnimalModal from '@/components/animals/AddAnimalModal'
import { ImportAnimalsModal } from '@/components/animals/ImportAnimalsModal'
import { MobileStatsCarousel } from '@/components/mobile/MobileStatsCarousel'
import { QuickActionButton } from '@/components/mobile/QuickActionButton'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { HealthNotificationBanner } from '@/components/health/HealthNotificationBanner'
import CompleteHealthRecordModal from '@/components/health/CompleteHealthRecordModal'
import {
  Plus,
  Users,
  BarChart3,
  Download,
  Upload,
  TrendingUp,
  Scale
} from 'lucide-react'
import { GiCow } from 'react-icons/gi'
import { Animal } from '@/types/database'
import { HealthStatusNotification } from '../health/HealthStatusChangeNotification'
import { EditAnimalModal } from './EditAnimalModal'

interface AnimalsClientPageProps {
  initialAnimals: Animal[]
  initialStats: {
    total: number
    female: number
    male: number
    bySource?: {
      newborn_calves: number
      purchased: number
    }
    byProduction?: {
      calves: number
      heifers: number
      served: number
      lactating: number
      dry: number
    }
    byHealth?: {
      healthy: number
      needsAttention: number
    }
  }
  farmId: string
  userRole: string
}

export function AnimalsClientPage({
  initialAnimals,
  initialStats,
  farmId,
  userRole
}: AnimalsClientPageProps) {
  const [animals, setAnimals] = useState(initialAnimals)
  const [stats, setStats] = useState(initialStats)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const { isMobile } = useDeviceInfo()

  const canAddAnimals = ['farm_owner', 'farm_manager', 'worker'].includes(userRole)
  const canManageAnimals = ['farm_owner', 'farm_manager', 'worker'].includes(userRole)
  const canExportData = ['farm_owner', 'farm_manager'].includes(userRole)
  const canImportData = ['farm_owner', 'farm_manager'].includes(userRole)

  const [showHealthRecordModal, setShowHealthRecordModal] = useState(false)
  const [selectedHealthRecord, setSelectedHealthRecord] = useState<any>(null)
  const [healthRecordsNeedingCompletion, setHealthRecordsNeedingCompletion] = useState<any[]>([])
  const [loadingIncompleteRecords, setLoadingIncompleteRecords] = useState(true)

  const [animalsNeedingWeight, setAnimalsNeedingWeight] = useState<any[]>([])
  const [loadingWeightRequirements, setLoadingWeightRequirements] = useState(true)


  useEffect(() => {
    const loadMissingRecords = async () => {
      try {
        const response = await fetch(`/api/health/records/incomplete?farmId=${farmId}`);
        if (response.ok) {
          const data = await response.json();
          // The API returns { records: [...] }, so we set the state with data.records
          setHealthRecordsNeedingCompletion(data.records || []);
        }
      } catch (error) {
        console.error('Error loading animals requiring health records:', error);
      } finally {
        setLoadingIncompleteRecords(false);
      }
    };

    loadMissingRecords();
  }, [farmId]);

  useEffect(() => {
  loadWeightRequirements()
}, [farmId])

const loadWeightRequirements = async () => {
  setLoadingWeightRequirements(true)
  try {
    const response = await fetch(`/api/animals/weight-requirements?farmId=${farmId}`)
    if (response.ok) {
      const data = await response.json()
      setAnimalsNeedingWeight(data.requirements || [])
    }
  } catch (error) {
    console.error('Error loading weight requirements:', error)
  } finally {
    setLoadingWeightRequirements(false)
  }
}

// Add handler for weight update
const [selectedAnimalForWeight, setSelectedAnimalForWeight] = useState<any>(null)
const [showWeightUpdateModal, setShowWeightUpdateModal] = useState(false)


const handleWeightUpdateClick = (requirement: any) => {
  const animal = animals.find(a => a.id === requirement.animal_id)
  if (animal) {
    setSelectedAnimalForWeight({
      ...animal,
      weightUpdateReason: requirement.reason,
      weightDueDate: requirement.due_date
    })
    setShowWeightUpdateModal(true)
  }
}

const handleWeightUpdated = (updatedAnimal: Animal) => {
  console.log('✅ [AnimalsPage] Weight updated for animal:', updatedAnimal.id)
  // Update animals list
  setAnimals(prev => 
    prev.map(a => a.id === updatedAnimal.id ? updatedAnimal : a)
  )
  
  // Remove from weight requirements
  setAnimalsNeedingWeight(prev => 
    prev.filter(req => req.animal_id !== updatedAnimal.id)
  )
  
  setShowWeightUpdateModal(false)
  setSelectedAnimalForWeight(null)
  
  // Reload to ensure sync
  loadWeightRequirements()

  console.log('✅ [AnimalsPage] Weight requirements reloaded')
}


  const handleAnimalAdded = (newAnimal: Animal) => {

    
  // Update local state with new animal
  setAnimals(prev => [newAnimal, ...prev])
  updateStatsForNewAnimal(newAnimal)
  setShowAddModal(false)
  

  loadWeightRequirements()
}

  const handleHealthRecordCreated = (healthRecord: any, updatedAnimal?: any) => {
    // Add to the list of records needing completion
    setHealthRecordsNeedingCompletion(prev => [healthRecord, ...prev])

    // If the animal's health status was updated, update the animals list
    if (updatedAnimal) {
      setAnimals(prev =>
        prev.map(animal =>
          animal.id === updatedAnimal.id ? { ...animal, ...updatedAnimal } : animal
        )
      )

      // Update stats to reflect new health status
      type UpdateAnimalsFunction = (prevAnimals: Animal[]) => Animal[]

      recalculateHealthStats(
        (prev: Animal[]) => prev.map(animal =>
          animal.id === updatedAnimal.id ? { ...animal, ...updatedAnimal } : animal
        )
      )
    }

    // Refresh the notification banner
    // This will be handled by the HealthNotificationBanner component
  }

  const handleHealthRecordClick = (recordId: string) => {
    // Find the record and open completion modal
    const record = healthRecordsNeedingCompletion.find(r => r.id === recordId)
    if (record) {
      setSelectedHealthRecord(record)
      setShowHealthRecordModal(true)
    } else {
      console.error('Health record not found:', recordId)
    }
  }

  const handleHealthRecordCompleted = async (completedRecord: any, followUpData?: any) => {
    // Remove from incomplete list
    setHealthRecordsNeedingCompletion(prev =>
      prev.filter(r => r.id !== completedRecord.id)
    )

    // CRITICAL: If follow-up was resolved, update animal health status
    if (followUpData?.animalHealthStatusUpdated || followUpData?.is_resolved) {
      // Fetch updated animal data
      try {
        const animalId = completedRecord.animal_id || followUpData.animal_id
        const response = await fetch(`/api/animals/${animalId}`)

        if (response.ok) {
          const { animal: updatedAnimal } = await response.json()

          // Update animals list with new health status
          setAnimals(prev =>
            prev.map(animal =>
              animal.id === animalId ? { ...animal, ...updatedAnimal } : animal
            )
          )

          // Update health stats
          recalculateHealthStats()
        }
      } catch (error) {
        console.error('Error fetching updated animal data:', error)
      }
    }

    setShowHealthRecordModal(false)
    setSelectedHealthRecord(null)
  }

  const handleHealthStatusChange = (animalId: string, newStatus: Animal['health_status']) => {
    // Update the animals list with the new health status
    setAnimals(prev =>
      prev.map(animal =>
        animal.id === animalId
          ? { ...animal, health_status: newStatus, updated_at: new Date().toISOString() }
          : animal
      ) as Animal[]
    )

    // Recalculate health stats
    recalculateHealthStats()
  }

  // Helper function to recalculate health stats (for AnimalsClientPage)
  const recalculateHealthStats = (updateAnimals?: (prev: Animal[]) => Animal[]) => {
    const updatedAnimals = updateAnimals ? updateAnimals(animals) : animals
    setStats(prev => ({
      ...prev,
      byHealth: {
        healthy: updatedAnimals.filter(a => a.health_status === 'healthy').length,
        needsAttention: updatedAnimals.filter(a =>
          a.health_status && a.health_status !== 'healthy'
        ).length,
      }
    }))
  }
  const handleAnimalsImported = (importedAnimals: Animal[]) => {
    // Update local state with imported animals
    setAnimals(prev => [...importedAnimals, ...prev])

    // Recalculate stats with new animals
    const allAnimals = [...importedAnimals, ...animals]
    recalculateStats(allAnimals)
    setShowImportModal(false)
  }

  const updateStatsForNewAnimal = (newAnimal: Animal) => {
    setStats(prev => ({
      ...prev,
      total: prev.total + 1,
      female: newAnimal.gender === 'female' ? prev.female + 1 : prev.female,
      male: newAnimal.gender === 'male' ? prev.male + 1 : prev.male,
      bySource: prev.bySource ? {
        newborn_calves: newAnimal.animal_source === 'newborn_calf'
          ? prev.bySource.newborn_calves + 1
          : prev.bySource.newborn_calves,
        purchased: newAnimal.animal_source === 'purchased_animal'
          ? prev.bySource.purchased + 1
          : prev.bySource.purchased,
      } : {
        newborn_calves: newAnimal.animal_source === 'newborn_calf' ? 1 : 0,
        purchased: newAnimal.animal_source === 'purchased_animal' ? 1 : 0,
      },
      byProduction: prev.byProduction ? {
        ...prev.byProduction,
        calves: newAnimal.production_status === 'calf'
          ? prev.byProduction.calves + 1
          : prev.byProduction.calves,
        heifers: newAnimal.production_status === 'heifer'
          ? prev.byProduction.heifers + 1
          : prev.byProduction.heifers,
        served: newAnimal.production_status === 'served'
          ? prev.byProduction.served + 1
          : prev.byProduction.served,
        lactating: newAnimal.production_status === 'lactating'
          ? prev.byProduction.lactating + 1
          : prev.byProduction.lactating,
        dry: newAnimal.production_status === 'dry'
          ? prev.byProduction.dry + 1
          : prev.byProduction.dry,
      } : undefined,
      byHealth: prev.byHealth ? {
        healthy: newAnimal.health_status === 'healthy'
          ? prev.byHealth.healthy + 1
          : prev.byHealth.healthy,
        needsAttention: newAnimal.health_status !== 'healthy'
          ? prev.byHealth.needsAttention + 1
          : prev.byHealth.needsAttention,
      } : {
        healthy: newAnimal.health_status === 'healthy' ? 1 : 0,
        needsAttention: newAnimal.health_status !== 'healthy' ? 1 : 0,
      },
    }))
  }

  const recalculateStats = (allAnimals: Animal[]) => {
    setStats({
      total: allAnimals.length,
      female: allAnimals.filter(a => a.gender === 'female').length,
      male: allAnimals.filter(a => a.gender === 'male').length,
      bySource: {
        newborn_calves: allAnimals.filter(a => a.animal_source === 'newborn_calf').length,
        purchased: allAnimals.filter(a => a.animal_source === 'purchased_animal').length,
      },
      byProduction: {
        calves: allAnimals.filter(a => a.production_status === 'calf').length,
        heifers: allAnimals.filter(a => a.production_status === 'heifer').length,
        served: allAnimals.filter(a => a.production_status === 'served').length,
        lactating: allAnimals.filter(a => a.production_status === 'lactating').length,
        dry: allAnimals.filter(a => a.production_status === 'dry').length,
      },
      byHealth: {
        healthy: allAnimals.filter(a => a.health_status === 'healthy').length,
        needsAttention: allAnimals.filter(a => a.health_status !== 'healthy').length,
      },
    })
  }

  const handleExportAnimals = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/animals/export?farmId=${farmId}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `animals-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnimalUpdated = (updatedAnimal: Animal) => {

    console.log('✅ [AnimalsPage] Animal updated:', updatedAnimal.id)
    // Update local state with updated animal
    setAnimals(prev =>
      prev.map(animal =>
        animal.id === updatedAnimal.id ? updatedAnimal : animal
      )
    )

    // Recalculate stats with updated animals (including health stats)
    const updatedAnimals = animals.map(animal =>
      animal.id === updatedAnimal.id ? updatedAnimal : animal
    )

    // Update all stats including health
    setStats(prev => {
      const newStats = {
        ...prev,
        byHealth: {
          healthy: updatedAnimals.filter(a => a.health_status === 'healthy').length,
          needsAttention: updatedAnimals.filter(a =>
            a.health_status && a.health_status !== 'healthy'
          ).length,
        }
      }
      return newStats
    })

    loadWeightRequirements()
  
  console.log('✅ [AnimalsPage] Weight requirements reloaded after animal update')

  }

  // Prepare stats for mobile carousel
  const statsCards = [
    {
      title: "Total Animals",
      value: stats.total,
      subtitle: stats.bySource
        ? `${stats.bySource.newborn_calves} born, ${stats.bySource.purchased} purchased`
        : 'Active animals in your herd',
      icon: <GiCow className="h-5 w-5" />,
      color: "bg-blue-500"
    },
    {
      title: "Lactating Cows",
      value: stats.byProduction?.lactating || 0,
      subtitle: "Currently producing milk",
      icon: <Users className="h-5 w-5" />,
      color: "bg-green-500"
    },
    {
      title: "Young Stock",
      value: (stats.byProduction?.calves || 0) + (stats.byProduction?.heifers || 0),
      subtitle: `${stats.byProduction?.calves || 0} calves, ${stats.byProduction?.heifers || 0} heifers`,
      icon: <BarChart3 className="h-5 w-5" />,
      color: "bg-yellow-500"
    },
    {
      title: "Health Status",
      value: stats.byHealth?.healthy || stats.total,
      subtitle: stats.byHealth?.needsAttention && stats.byHealth.needsAttention > 0
        ? `${stats.byHealth.needsAttention} need attention`
        : "All healthy",
      icon: <div className={`h-5 w-5 rounded-full ${stats.byHealth?.needsAttention && stats.byHealth.needsAttention > 0
          ? 'bg-yellow-500'
          : 'bg-green-500'
        }`} />,
      color: stats.byHealth?.needsAttention && stats.byHealth.needsAttention > 0
        ? "bg-yellow-500"
        : "bg-green-500"
    }
  ]

  return (
    <div className={`
      ${isMobile ? 'px-4 py-4' : 'dashboard-container'} 
      pb-20 lg:pb-6
    `}>
      {/* Health Notifications - Show at the top */}
      <HealthNotificationBanner
        farmId={farmId}
        onRecordClick={handleHealthRecordClick}
        missingRecords={healthRecordsNeedingCompletion} // Pass the state down
        loading={loadingIncompleteRecords}

      />

      {/* Weight Update Notifications */}
    {!loadingWeightRequirements && animalsNeedingWeight.length > 0 && (
      <div className="mb-4 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg">
        <div className="flex items-start space-x-3">
          <Scale className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-medium text-orange-900 mb-1">
              Weight Updates Required
            </h3>
            <p className="text-sm text-orange-700 mb-3">
              {animalsNeedingWeight.length} animal{animalsNeedingWeight.length !== 1 ? 's' : ''} need weight recording
            </p>
            <div className="space-y-2">
              {animalsNeedingWeight.slice(0, 3).map((req: any) => {
                const animal = animals.find(a => a.id === req.animal_id)
                return (
                  <div 
                    key={req.id}
                    className="flex items-center justify-between p-2 bg-white rounded border border-orange-200"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="text-xs">
                        #{animal?.tag_number}
                      </Badge>
                      <span className="text-sm font-medium text-gray-900">
                        {animal?.name || `Animal ${animal?.tag_number}`}
                      </span>
                      <span className="text-xs text-gray-500">
                        {getWeightReasonLabel(req.reason)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleWeightUpdateClick(req)}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    >
                      <Scale className="w-3 h-3 mr-1" />
                      Record Weight
                    </Button>
                  </div>
                )
              })}
            </div>
            {animalsNeedingWeight.length > 3 && (
              <p className="text-xs text-orange-600 mt-2">
                +{animalsNeedingWeight.length - 3} more animals need weight updates
              </p>
            )}
          </div>
        </div>
      </div>
    )}

      {/* Add Health Status Change Notifications */}
      <div className="mb-4">
        <HealthStatusNotification
          farmId={farmId}
          onNotificationAction={(animalId, action) => {
            if (action === 'view') {
              // Navigate to animal details or handle view action
              window.location.href = `/dashboard/animals/${animalId}`
            }
          }}
        />
      </div>
      {/* Mobile Header */}
      {isMobile ? (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Animals</h1>
              <p className="text-sm text-gray-600 mt-1">
                {stats.total} animals in your herd
              </p>
            </div>

            {/* Mobile Action Buttons */}
            {canAddAnimals && (
              <div className="flex space-x-2">
                {canImportData && (
                  <QuickActionButton
                    onClick={() => setShowImportModal(true)}
                    icon={<Upload className="h-5 w-5" />}
                    label="Import"
                    variant="secondary"
                  />
                )}
                <QuickActionButton
                  onClick={() => setShowAddModal(true)}
                  icon={<Plus className="h-6 w-6" />}
                  label="Add Animal"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Desktop Header */
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Animals</h1>
            <p className="text-gray-600 mt-2">
              Manage your herd and track individual animal information
            </p>
          </div>

          <div className="flex space-x-3">
            {canExportData && (
              <Button
                variant="outline"
                onClick={handleExportAnimals}
                disabled={loading || animals.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}

            {canImportData && (
              <Button
                variant="outline"
                onClick={() => setShowImportModal(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            )}

            {canManageAnimals && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Animal
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Stats Carousel vs Desktop Grid */}
      {isMobile ? (
        <MobileStatsCarousel cards={statsCards} className="mb-6" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Animals</CardTitle>
              <GiCow className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.bySource
                  ? `${stats.bySource.newborn_calves} born here, ${stats.bySource.purchased} purchased`
                  : 'Active animals in your herd'
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lactating Cows</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.byProduction?.lactating || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently producing milk
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Young Stock</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.byProduction?.calves || 0) + (stats.byProduction?.heifers || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.byProduction?.calves || 0} calves, {stats.byProduction?.heifers || 0} heifers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Health Status</CardTitle>
              <div className={`h-4 w-4 rounded-full ${stats.byHealth?.needsAttention && stats.byHealth.needsAttention > 0
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
                }`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.byHealth?.healthy || stats.total}
              </div>
              <p className="text-xs text-muted-foreground">
                Healthy animals
                {stats.byHealth?.needsAttention && stats.byHealth.needsAttention > 0 &&
                  `, ${stats.byHealth.needsAttention} need attention`
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Herd Composition - Responsive Layout */}
      {stats.byProduction && (
        <Card className={`mb-6 ${isMobile ? 'mx-0' : 'mb-8'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={isMobile ? "text-base" : "text-lg"}>
                  Herd Composition
                </CardTitle>
                <CardDescription className={isMobile ? "text-sm" : undefined}>
                  Breakdown by production status
                </CardDescription>
              </div>
              {!isMobile && (
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`
              grid gap-4
              ${isMobile
                ? 'grid-cols-3'
                : 'grid-cols-2 md:grid-cols-5'
              }
            `}>
              <div className="text-center">
                <div className={`font-bold text-yellow-600 ${isMobile ? 'text-xl' : 'text-2xl'
                  }`}>
                  {stats.byProduction.calves}
                </div>
                <div className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'
                  }`}>
                  Calves
                </div>
              </div>
              <div className="text-center">
                <div className={`font-bold text-blue-600 ${isMobile ? 'text-xl' : 'text-2xl'
                  }`}>
                  {stats.byProduction.heifers}
                </div>
                <div className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'
                  }`}>
                  Heifers
                </div>
              </div>
              <div className="text-center">
                <div className={`font-bold text-purple-600 ${isMobile ? 'text-xl' : 'text-2xl'
                  }`}>
                  {stats.byProduction.served}
                </div>
                <div className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'
                  }`}>
                  Served
                </div>
              </div>
              {!isMobile && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.byProduction.lactating}
                    </div>
                    <div className="text-sm text-gray-600">Lactating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {stats.byProduction.dry}
                    </div>
                    <div className="text-sm text-gray-600">Dry</div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile: Show remaining stats in second row */}
            {isMobile && (
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">
                    {stats.byProduction.lactating}
                  </div>
                  <div className="text-xs text-gray-600">Lactating</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-600">
                    {stats.byProduction.dry}
                  </div>
                  <div className="text-xs text-gray-600">Dry</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Animals List */}
      <AnimalsList
        animals={animals}
        farmId={farmId}
        userRole={userRole}
        onAnimalUpdated={handleAnimalUpdated}
        onExportAnimals={handleExportAnimals}
        loading={loading}
      />

      {/* Add Animal Modal */}
      <AddAnimalModal
        farmId={farmId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAnimalAdded={handleAnimalAdded}
        onHealthRecordCreated={handleHealthRecordCreated}
      />

      {/* Import Animals Modal */}
      <ImportAnimalsModal
        farmId={farmId}
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onAnimalsImported={handleAnimalsImported}
      />

      {showHealthRecordModal && selectedHealthRecord && (
        <CompleteHealthRecordModal
          isOpen={showHealthRecordModal}
          onClose={() => setShowHealthRecordModal(false)}
          healthRecord={selectedHealthRecord}
          animal={selectedHealthRecord.animal || selectedHealthRecord.animals || animals.find(a => a.id === selectedHealthRecord.animal_id)}
          onHealthRecordUpdated={handleHealthRecordCompleted}
        />
      )}

      {showWeightUpdateModal && selectedAnimalForWeight && (
      <EditAnimalModal
        animal={selectedAnimalForWeight}
        farmId={farmId}
        isOpen={showWeightUpdateModal}
        onClose={() => {
          setShowWeightUpdateModal(false)
          setSelectedAnimalForWeight(null)
        }}
        onAnimalUpdated={handleWeightUpdated}
        highlightWeight={true}
        weightUpdateReason={selectedAnimalForWeight.weightUpdateReason}
      />
    )}
    </div>
  )
}

function getWeightReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    'new_calf_over_month': 'New calf >30 days',
    'purchased_over_month': 'Purchased >30 days',
    'routine_schedule': 'Routine check',
    'special_event': 'Special monitoring'
  }
  return labels[reason] || reason
}