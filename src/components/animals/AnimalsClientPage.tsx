// src/components/animals/AnimalsClientPage.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { AnimalsList } from '@/components/animals/AnimalsList'
import { AddAnimalModal } from '@/components/animals/AddAnimalModal'
import { Plus, Users, BarChart3, Import, Download } from 'lucide-react'
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
  const [loading, setLoading] = useState(false)

  const canAddAnimals = ['farm_owner', 'farm_manager', 'worker'].includes(userRole)

  const handleAnimalAdded = (newAnimal: Animal) => {
    // Update local state with new animal
    setAnimals(prev => [newAnimal, ...prev])
    
    // Update stats
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
    
    // Close modal
    setShowAddModal(false)
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

    // Recalculate stats
    const originalAnimal = animals.find(a => a.id === updatedAnimal.id)
    if (originalAnimal) {
      setStats(prev => {
        let newStats = { ...prev }

        // Update total count
        newStats.total = animals.length

        // Update gender breakdown
        newStats.female = animals.filter(a => a.gender === 'female').length
        newStats.male = animals.filter(a => a.gender === 'male').length

        // Update source breakdown
        newStats.bySource = {
          newborn_calves: animals.filter(a => a.animal_source === 'newborn_calf').length,
          purchased: animals.filter(a => a.animal_source === 'purchased_animal').length,
        }

        // Update production status breakdown
        newStats.byProduction = {
          calves: animals.filter(a => a.production_status === 'calf').length,
          heifers: animals.filter(a => a.production_status === 'heifer').length,
          served: animals.filter(a => a.production_status === 'served').length,
          lactating: animals.filter(a => a.production_status === 'lactating').length,
          dry: animals.filter(a => a.production_status === 'dry').length,
        }

        // Update health status breakdown
        newStats.byHealth = {
          healthy: animals.filter(a => a.health_status === 'healthy').length,
          needsAttention: animals.filter(a => a.health_status !== 'healthy').length,
        }

        return newStats
      })
    }
  }

  const canManageAnimals = ['farm_owner', 'farm_manager', 'worker'].includes(userRole)
  const canExportData = ['farm_owner', 'farm_manager'].includes(userRole)

  return (
    <div className="dashboard-container">
      {/* Header Section */}
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
          
          {canManageAnimals && (
            <Button variant="primary" size="default" primary={true} onClick={() => setShowAddModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Animal
            </Button>
          )}
        </div>
      </div>
      
      {/* Enhanced Stats Cards */}
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
      
      {/* Quick Stats Summary */}
      {stats.byProduction && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Herd Composition</CardTitle>
            <CardDescription>
              Breakdown of animals by production status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.byProduction.calves}
                </div>
                <div className="text-sm text-gray-600">Calves</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.byProduction.heifers}
                </div>
                <div className="text-sm text-gray-600">Heifers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.byProduction.served}
                </div>
                <div className="text-sm text-gray-600">Served</div>
              </div>
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
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Animals List */}
      <AnimalsList 
        animals={animals}
        farmId={farmId}
        userRole={userRole}
        onAnimalUpdated={handleAnimalUpdated}
      />
      
      {/* Add Animal Modal */}
      <AddAnimalModal
        farmId={farmId}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAnimalAdded={handleAnimalAdded}
      />
    </div>
  )
}