// src/components/animals/AnimalsClientPage.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { AnimalsList } from '@/components/animals/AnimalsList'
import AddAnimalModal from '@/components/animals/AddAnimalModal'
import { ImportAnimalsModal } from '@/components/animals/ImportAnimalsModal'
import { MobileStatsCarousel } from '@/components/mobile/MobileStatsCarousel'
import { QuickActionButton } from '@/components/mobile/QuickActionButton'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import HealthNotificationBanner from '@/components/health/HealthNotificationBanner'
import CompleteHealthRecordModal from '@/components/health/CompleteHealthRecordModal'
import { 
  Plus, 
  Users, 
  BarChart3, 
  Download,
  Upload,
  TrendingUp
} from 'lucide-react'
import { GiCow } from 'react-icons/gi'
import { Animal } from '@/types/database'

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

  const handleAnimalAdded = (newAnimal: Animal) => {
    // Update local state with new animal
    setAnimals(prev => [newAnimal, ...prev])
    updateStatsForNewAnimal(newAnimal)
    setShowAddModal(false)
  }

  const handleHealthRecordCreated = (healthRecord: any) => {
    // Add to the list of records needing completion
    setHealthRecordsNeedingCompletion(prev => [healthRecord, ...prev])
    
    // Refresh the notification banner
    // This will be handled by the HealthNotificationBanner component
  }

  const handleHealthRecordClick = (recordId: string) => {
    // Find the record and open completion modal
    const record = healthRecordsNeedingCompletion.find(r => r.id === recordId)
    if (record) {
      setSelectedHealthRecord(record)
      setShowHealthRecordModal(true)
    }
  }

  const handleHealthRecordCompleted = (completedRecord: any) => {
    // Remove from incomplete list
    setHealthRecordsNeedingCompletion(prev => 
      prev.filter(r => r.id !== completedRecord.id)
    )
    setShowHealthRecordModal(false)
    setSelectedHealthRecord(null)
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
    setAnimals(prev =>
      prev.map(animal =>
        animal.id === updatedAnimal.id ? updatedAnimal : animal
      )
    )

    // Recalculate stats with updated animals
    const updatedAnimals = animals.map(animal =>
      animal.id === updatedAnimal.id ? updatedAnimal : animal
    )
    recalculateStats(updatedAnimals)
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
      icon: <div className={`h-5 w-5 rounded-full ${
        stats.byHealth?.needsAttention && stats.byHealth.needsAttention > 0 
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
        className="mb-6"
      />
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
              <div className={`h-4 w-4 rounded-full ${
                stats.byHealth?.needsAttention && stats.byHealth.needsAttention > 0 
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
                <div className={`font-bold text-yellow-600 ${
                  isMobile ? 'text-xl' : 'text-2xl'
                }`}>
                  {stats.byProduction.calves}
                </div>
                <div className={`text-gray-600 ${
                  isMobile ? 'text-xs' : 'text-sm'
                }`}>
                  Calves
                </div>
              </div>
              <div className="text-center">
                <div className={`font-bold text-blue-600 ${
                  isMobile ? 'text-xl' : 'text-2xl'
                }`}>
                  {stats.byProduction.heifers}
                </div>
                <div className={`text-gray-600 ${
                  isMobile ? 'text-xs' : 'text-sm'
                }`}>
                  Heifers
                </div>
              </div>
              <div className="text-center">
                <div className={`font-bold text-purple-600 ${
                  isMobile ? 'text-xl' : 'text-2xl'
                }`}>
                  {stats.byProduction.served}
                </div>
                <div className={`text-gray-600 ${
                  isMobile ? 'text-xs' : 'text-sm'
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
          animal={animals.find(a => a.id === selectedHealthRecord.animal_id)}
          onHealthRecordUpdated={handleHealthRecordCompleted}
        />
      )}  
    </div>
  )
}