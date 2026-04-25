'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Plus,
  Building2,
  Layers,
  Box,
  Wrench,
  BarChart3,
  ChevronRight,
  ChevronDown,
  MapPin,
  Users,
  AlertCircle,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Settings,
  Eye,
  EyeOff,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import {
  HousingBuilding,
  HousingUnit,
  HousingPen,
  HousingAnalytics,
  SpecialHousingType,
  AnimalHousingAssignment,
  CleaningSchedule,
  MaintenanceSchedule,
} from '@/types/housing'
import { AssignAnimalModal } from './housing/modals/AssignAnimalModal'
import { MoveAnimalModal } from './housing/modals/MoveAnimalModal'
import { ScheduleCleaningModal } from './housing/modals/ScheduleCleaningModal'
import { ScheduleMaintenanceModal } from './housing/modals/ScheduleMaintenanceModal'
import { LogCleaningActivityModal } from './housing/modals/LogCleaningActivityModal'
import { LogMaintenanceActivityModal } from './housing/modals/LogMaintenanceActivityModal'

import { AddBuildingModal } from './housing/modals/AddBuildingModal'
import { AddUnitModal } from './housing/modals/AddUnitModal'
import { CreatePenModal } from './housing/modals/CreatePenModal'

interface HousingAndFacilitiesProps {
  farmId: string
  isMobile: boolean
}

export function HousingAndFacilities({ farmId, isMobile }: HousingAndFacilitiesProps) {
  // State Management
  const [activeTab, setActiveTab] = useState('hierarchy')
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)
  const [selectedPen, setSelectedPen] = useState<string | null>(null)
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set())
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set())
  const [expandedPens, setExpandedPens] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [filterHousingType, setFilterHousingType] = useState<SpecialHousingType | 'all'>('all')

  // Modal State Management
  const [isAssignAnimalModalOpen, setIsAssignAnimalModalOpen] = useState(false)
  const [isMoveAnimalModalOpen, setIsMoveAnimalModalOpen] = useState(false)
  const [isScheduleCleaningModalOpen, setIsScheduleCleaningModalOpen] = useState(false)
  const [isLogCleaningModalOpen, setIsLogCleaningModalOpen] = useState(false)
  const [isScheduleMaintenanceModalOpen, setIsScheduleMaintenanceModalOpen] = useState(false)
  const [isLogMaintenanceModalOpen, setIsLogMaintenanceModalOpen] = useState(false)
  const [isAddBuildingModalOpen, setIsAddBuildingModalOpen] = useState(false)
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false)
  const [isCreatePenModalOpen, setIsCreatePenModalOpen] = useState(false)

  // Buildings: fetched from DB
  const [buildings, setBuildings] = useState<HousingBuilding[]>([])
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(true)

  // Units: fetched from DB
  const [units, setUnits] = useState<HousingUnit[]>([])

  // Pens: fetched from DB
  const [pens, setPens] = useState<HousingPen[]>([])

  // Unassigned animals: fetched from DB
  const [unassignedAnimals, setUnassignedAnimals] = useState<any[]>([])

  // Assigned animals (already in a pen): fetched from DB
  const [assignedAnimals, setAssignedAnimals] = useState<any[]>([])

  // Housing assignments: fetched from DB
  const [housingAssignments, setHousingAssignments] = useState<any[]>([])
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false)

  const fetchHierarchy = useCallback(async () => {
    setIsLoadingBuildings(true)
    try {
      const [buildingsRes, unitsRes, pensRes] = await Promise.all([
        fetch('/api/housing/buildings'),
        fetch('/api/housing/units'),
        fetch('/api/housing/pens'),
      ])
      if (buildingsRes.ok) setBuildings((await buildingsRes.json()).data ?? [])
      if (unitsRes.ok)    setUnits((await unitsRes.json()).data ?? [])
      if (pensRes.ok)     setPens((await pensRes.json()).data ?? [])
    } catch (err) {
      console.error('Failed to load housing hierarchy:', err)
    } finally {
      setIsLoadingBuildings(false)
    }
  }, [])

  const fetchAnimals = useCallback(async () => {
    try {
      const [unassignedRes, assignedRes, assignmentsRes] = await Promise.all([
        fetch('/api/housing/unassigned-animals'),
        fetch('/api/housing/assigned-animals'),
        fetch('/api/housing/assignments'),
      ])
      if (unassignedRes.ok) setUnassignedAnimals((await unassignedRes.json()).data ?? [])
      if (assignedRes.ok)   setAssignedAnimals((await assignedRes.json()).data ?? [])
      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json()
        setHousingAssignments(data.data ?? [])
      }
    } catch (err) {
      console.error('Failed to load animals:', err)
    }
  }, [])

  useEffect(() => { fetchHierarchy() }, [fetchHierarchy])
  useEffect(() => { fetchAnimals() }, [fetchAnimals])

  // Analytics: derived from real buildings
  const analytics = useMemo<HousingAnalytics>(() => {
    const total_capacity = buildings.reduce((s, b) => s + b.total_capacity, 0)
    const total_occupancy = buildings.reduce((s, b) => s + b.current_occupancy, 0)
    return {
      farm_id: farmId,
      total_capacity,
      total_occupancy,
      utilization_percentage: total_capacity > 0 ? (total_occupancy / total_capacity) * 100 : 0,
      by_building: buildings.map(b => ({
        building_id: b.id,
        building_name: b.name,
        occupancy: b.current_occupancy,
        capacity: b.total_capacity,
        utilization_percentage: b.total_capacity > 0 ? (b.current_occupancy / b.total_capacity) * 100 : 0,
      })),
      by_housing_type: [
        { type: 'regular_housing' as const, count: pens.filter(p => p.special_type === 'regular_housing').length, occupancy: Math.floor(total_occupancy * 0.6), capacity: Math.floor(total_capacity * 0.6) },
        { type: 'dry_cow_pen' as const, count: pens.filter(p => p.special_type === 'dry_cow_pen').length, occupancy: Math.floor(total_occupancy * 0.2), capacity: Math.floor(total_capacity * 0.2) },
        { type: 'isolation_pen' as const, count: pens.filter(p => p.special_type === 'isolation_pen').length, occupancy: Math.floor(total_occupancy * 0.1), capacity: Math.floor(total_capacity * 0.1) },
        { type: 'calf_housing' as const, count: 0, occupancy: 0, capacity: 0 },
      ],
      animal_density_per_pen: [],
      facility_efficiency: {
        cleanliness_score: 92,
        maintenance_compliance: 88,
        equipment_uptime: 95,
        environmental_quality: 89,
      },
      last_updated: new Date().toISOString(),
    }
  }, [buildings, pens, farmId])

  // Toggle functions
  const toggleBuilding = (buildingId: string) => {
    const newSet = new Set(expandedBuildings)
    if (newSet.has(buildingId)) {
      newSet.delete(buildingId)
    } else {
      newSet.add(buildingId)
    }
    setExpandedBuildings(newSet)
  }

  const toggleUnit = (unitId: string) => {
    const newSet = new Set(expandedUnits)
    if (newSet.has(unitId)) {
      newSet.delete(unitId)
    } else {
      newSet.add(unitId)
    }
    setExpandedUnits(newSet)
  }

  const togglePen = (penId: string) => {
    const newSet = new Set(expandedPens)
    if (newSet.has(penId)) {
      newSet.delete(penId)
    } else {
      newSet.add(penId)
    }
    setExpandedPens(newSet)
  }

  // Get related data
  const selectedPenData = pens.find(p => p.id === selectedPen)
  const selectedUnitData = units.find(u => u.id === selectedUnit)
  const selectedBuildingData = buildings.find(b => b.id === selectedBuilding)


  const getHousingTypeLabel = (type: SpecialHousingType) => {
    const labels: Record<SpecialHousingType, string> = {
      regular_housing: 'Regular Housing',
      isolation_pen: 'Isolation Pen',
      maternity_pen: 'Maternity Pen',
      dry_cow_pen: 'Dry Cow Pen',
      calf_housing: 'Calf Housing',
      quarantine_zone: 'Quarantine Zone',
      weighing_zone: 'Weighing Zone',
      treatment_zone: 'Treatment Zone',
      milking_parlor: 'Milking Parlor',
    }
    return labels[type]
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      cleaning: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      unavailable: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className={`space-y-6 ${isMobile ? 'px-0' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900`}>
            Housing & Facilities Management
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage farm structure, animal assignments, and facility operations
          </p>
        </div>
        <Button size="default" className="flex items-center space-x-2" onClick={() => setIsAddBuildingModalOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className={isMobile ? 'hidden' : ''}>Add Building</span>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_capacity}</div>
            <p className="text-xs text-gray-600">animals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_occupancy}</div>
            <p className="text-xs text-gray-600">animals housed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.utilization_percentage.toFixed(1)}%</div>
            <p className="text-xs text-gray-600">capacity used</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Buildings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{buildings.length}</div>
            <p className="text-xs text-gray-600">active buildings</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3 lg:grid-cols-5' : 'grid-cols-5'}`}>
          <TabsTrigger value="hierarchy" className="flex items-center space-x-1">
            <Layers className="h-4 w-4" />
            <span className={isMobile ? 'hidden sm:inline' : ''}>Hierarchy</span>
          </TabsTrigger>
          <TabsTrigger value="animals" className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span className={isMobile ? 'hidden sm:inline' : ''}>Animals</span>
          </TabsTrigger>
          <TabsTrigger value="cleaning" className="flex items-center space-x-1">
            <Wrench className="h-4 w-4" />
            <span className={isMobile ? 'hidden sm:inline' : ''}>Cleaning</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center space-x-1">
            <Settings className="h-4 w-4" />
            <span className={isMobile ? 'hidden sm:inline' : ''}>Maint.</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-1">
            <BarChart3 className="h-4 w-4" />
            <span className={isMobile ? 'hidden sm:inline' : ''}>Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* HIERARCHY TAB */}
        <TabsContent value="hierarchy" className="space-y-4 mt-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Hierarchy Navigator */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Farm Structure</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {/* Add Unit Button - Shows when building is selected */}
                {selectedBuildingData && !selectedUnit && !selectedPen && (
                  <div className="mb-4 pb-3 border-b">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full flex items-center justify-center space-x-2"
                      onClick={() => setIsAddUnitModalOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-xs">Add Unit to {selectedBuildingData.name}</span>
                    </Button>
                  </div>
                )}

                {/* Add Pen Button - Shows when unit is selected */}
                {selectedUnitData && selectedBuildingData && (
                  <div className="mb-4 pb-3 border-b">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full flex items-center justify-center space-x-2"
                      onClick={() => setIsCreatePenModalOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-xs">Add Pen to {selectedUnitData.name}</span>
                    </Button>
                  </div>
                )}

                {isLoadingBuildings ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  </div>
                ) : buildings.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-500">
                    <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No buildings yet.</p>
                    <p className="text-xs mt-1">Click "Add Building" to get started.</p>
                  </div>
                ) : null}

                {buildings.map(building => (
                  <div key={building.id} className="space-y-1">
                    <button
                      onClick={() => {
                        setSelectedBuilding(building.id)
                        toggleBuilding(building.id)
                      }}
                      className={`w-full flex items-center space-x-2 p-2 rounded hover:bg-gray-100 ${
                        selectedBuilding === building.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      {expandedBuildings.has(building.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium flex-1 text-left">{building.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {building.current_occupancy}/{building.total_capacity}
                      </Badge>
                    </button>

                    {expandedBuildings.has(building.id) && (
                      <div className="ml-4 space-y-1 border-l border-gray-200 pl-2">
                        {units
                          .filter(u => u.building_id === building.id)
                          .map(unit => (
                            <div key={unit.id} className="space-y-1">
                              <button
                                onClick={() => {
                                  setSelectedUnit(unit.id)
                                  toggleUnit(unit.id)
                                }}
                                className={`w-full flex items-center space-x-2 p-2 rounded text-sm hover:bg-gray-100 ${
                                  selectedUnit === unit.id ? 'bg-blue-50' : ''
                                }`}
                              >
                                {expandedUnits.has(unit.id) ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                                <Layers className="h-3 w-3 text-green-600" />
                                <span className="flex-1 text-left">{unit.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {unit.current_occupancy}/{unit.total_capacity}
                                </Badge>
                              </button>

                              {expandedUnits.has(unit.id) && (
                                <div className="ml-4 space-y-1 border-l border-gray-200 pl-2">
                                  {pens
                                    .filter(p => p.unit_id === unit.id)
                                    .map(pen => (
                                      <button
                                        key={pen.id}
                                        onClick={() => setSelectedPen(pen.id)}
                                        className={`w-full flex items-center space-x-2 p-2 rounded text-xs hover:bg-gray-100 ${
                                          selectedPen === pen.id ? 'bg-blue-50' : ''
                                        }`}
                                      >
                                        <Box className="h-3 w-3 text-orange-600" />
                                        <span className="flex-1 text-left">{pen.pen_number}</span>
                                        <Badge
                                          variant="outline"
                                          className={`text-xs ${getStatusColor(pen.status)}`}
                                        >
                                          {pen.current_occupancy}/{pen.capacity}
                                        </Badge>
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Detailed View */}
            <div className="lg:col-span-2 space-y-4">
              {/* Pen Details */}
              {selectedPenData && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Pen Details: {selectedPenData.pen_number}</CardTitle>
                      <Badge className={getStatusColor(selectedPenData.status)}>
                        {selectedPenData.status}
                      </Badge>
                    </div>
                    <CardDescription>{getHousingTypeLabel(selectedPenData.special_type)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Capacity */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Occupancy
                      </label>
                      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-green-500 h-full"
                          style={{
                            width: `${(selectedPenData.current_occupancy / selectedPenData.capacity) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {selectedPenData.current_occupancy} of {selectedPenData.capacity} animals
                      </p>
                    </div>

                    {/* Dimensions */}
                    {selectedPenData.dimensions && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-600">Dimensions</p>
                          <p className="font-medium">
                            {selectedPenData.dimensions.length_meters}m × {selectedPenData.dimensions.width_meters}m
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Area</p>
                          <p className="font-medium">{selectedPenData.dimensions.area_sqm} m²</p>
                        </div>
                      </div>
                    )}

                    {/* Environmental Conditions */}
                    {selectedPenData.conditions && (
                      <div className="space-y-3 border-t pt-4">
                        <h4 className="font-semibold text-sm">Environmental Conditions</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-600">Ventilation</p>
                            <Badge variant="outline">{selectedPenData.conditions.ventilation_quality}</Badge>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Lighting</p>
                            <Badge variant="outline">{selectedPenData.conditions.lighting_type}</Badge>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Water Access</p>
                            <Badge variant="outline">
                              {selectedPenData.conditions.water_access ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Drainage</p>
                            <Badge variant="outline">{selectedPenData.conditions.drainage}</Badge>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 border-t pt-4">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setIsMoveAnimalModalOpen(true)}>
                        <Users className="h-4 w-4 mr-2" />
                        Move Animal
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setIsAssignAnimalModalOpen(true)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Assign Animal
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Unit Details */}
              {selectedUnitData && !selectedPenData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{selectedUnitData.name}</CardTitle>
                    <CardDescription>Unit - {selectedUnitData.unit_type}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Capacity Utilization</p>
                      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full"
                          style={{
                            width: `${(selectedUnitData.current_occupancy / selectedUnitData.total_capacity) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {selectedUnitData.current_occupancy} of {selectedUnitData.total_capacity} animals
                      </p>
                    </div>
                    <p className="text-sm">
                      <strong>Pens:</strong> {selectedUnitData.pens_count}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Building Details */}
              {selectedBuildingData && !selectedUnitData && !selectedPenData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{selectedBuildingData.name}</CardTitle>
                    <CardDescription>{selectedBuildingData.type}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Building Utilization</p>
                      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-purple-500 h-full"
                          style={{
                            width: `${(selectedBuildingData.current_occupancy / selectedBuildingData.total_capacity) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {selectedBuildingData.current_occupancy} of {selectedBuildingData.total_capacity} animals
                      </p>
                    </div>
                    {selectedBuildingData.location && (
                      <p className="text-sm flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>{selectedBuildingData.location}</span>
                      </p>
                    )}
                    <p className="text-sm">
                      <strong>Units:</strong> {selectedBuildingData.units_count}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ANIMAL HOUSING MANAGEMENT TAB */}
        <TabsContent value="animals" className="space-y-4 mt-6">
          {/* Summary Cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{assignedAnimals.length}</p>
                  <p className="text-xs text-gray-600 mt-1">Assigned Animals</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{unassignedAnimals.length}</p>
                  <p className="text-xs text-gray-600 mt-1">Unassigned Animals</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">{pens.length}</p>
                  <p className="text-xs text-gray-600 mt-1">Total Pens</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600">
                    {pens.length > 0 
                      ? Math.round((pens.reduce((sum, p) => sum + p.current_occupancy, 0) / pens.reduce((sum, p) => sum + p.capacity, 0)) * 100) 
                      : 0}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Occupancy</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Animals by Pen */}
          <Card>
            <CardHeader>
              <div className="flex justify-end gap-2 px-6 pb-4">
              <Button size="sm" onClick={() => setIsAssignAnimalModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Assign Animal
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsMoveAnimalModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Move Animal
              </Button>
            </div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Animals by Pen</span>
              </CardTitle>
              <CardDescription>
                View all animals assigned to pens and stalls
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {pens.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pens created yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pens.map(pen => {
                    // Get animals assigned to this pen
                    const penAnimals = housingAssignments.filter(assignment => assignment.pen_id === pen.id)
                    const penUnit = units.find(u => u.id === pen.unit_id)
                    const penBuilding = buildings.find(b => b.id === pen.building_id)
                    const isPenExpanded = expandedPens.has(pen.id)

                    return (
                      <div key={pen.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Pen Header - Clickable to Toggle */}
                        <button
                          onClick={() => togglePen(pen.id)}
                          className="w-full bg-gradient-to-r from-blue-50 to-blue-100 p-4 border-b border-gray-200 hover:from-blue-100 hover:to-blue-150 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 text-left">
                              {isPenExpanded ? (
                                <ChevronDown className="h-5 w-5 text-blue-600 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                              )}
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  Pen {pen.pen_number} - {pen.special_type.replace(/_/g, ' ')}
                                </h3>
                                <p className="text-xs text-gray-600 mt-1">
                                  {penBuilding?.name} → {penUnit?.name}
                                </p>
                              </div>
                            </div>
                            <div className="text-right ml-4 flex-shrink-0">
                              <div className="text-sm font-semibold text-gray-900">
                                {pen.current_occupancy} / {pen.capacity}
                              </div>
                              <div className="text-xs text-gray-600">animals</div>
                            </div>
                          </div>

                          {/* Capacity Bar */}
                          <div className="mt-3 bg-white rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-colors ${
                                (pen.current_occupancy / pen.capacity) > 0.9
                                  ? 'bg-red-500'
                                  : (pen.current_occupancy / pen.capacity) > 0.7
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{
                                width: `${(pen.current_occupancy / pen.capacity) * 100}%`,
                              }}
                            />
                          </div>
                        </button>

                        {/* Animals List - Collapsable */}
                        {isPenExpanded && (
                          <div className="divide-y">
                            {penAnimals.length > 0 ? (
                              penAnimals.map((assignment) => {
                                const animal = assignment.animals || assignment.animal
                                if (!animal) return null

                                return (
                                  <div
                                    key={assignment.id}
                                    className="p-4 hover:bg-gray-50 flex items-center justify-between"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                          {animal.tag_number?.charAt(0) || 'A'}
                                        </div>
                                        <div>
                                          <p className="font-medium text-gray-900">
                                            #{animal.tag_number}
                                          </p>
                                          <p className="text-xs text-gray-600">
                                            {animal.name || 'Unnamed'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm">
                                      {animal.production_status && (
                                        <Badge variant="outline" className="text-xs">
                                          {animal.production_status.replace(/_/g, ' ')}
                                        </Badge>
                                      )}
                                      {animal.breed && (
                                        <span className="text-xs text-gray-600 min-w-fit">
                                          {animal.breed}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })
                            ) : (
                              <div className="p-4 text-center text-gray-500 text-sm">
                                No animals assigned to this pen
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLEANING & ACTIVITIES TAB */}
        <TabsContent value="cleaning" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wrench className="h-5 w-5" />
                <span>Cleaning & Activities Schedule</span>
              </CardTitle>
              <CardDescription>
                Track cleaning schedules and Activities logs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-12 text-gray-500">
                <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">Cleaning schedules and Activities logs</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button size="sm" onClick={() => setIsScheduleCleaningModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Cleaning
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsLogCleaningModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Log Cleaning
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>



        {/* Facilities and Equipment Maintenance TAB */}
        <TabsContent value="maintenance" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Facilities and Equipment Maintenance</span>
              </CardTitle>
              <CardDescription>
                Track maintenance schedules and equipment service logs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-12 text-gray-500">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">Facilities and Equipment Maintenance</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button size="sm" onClick={() => setIsScheduleMaintenanceModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Maintenance
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsLogMaintenanceModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Log Maintenance
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4 mt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Facility Efficiency */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Facility Efficiency Scores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(analytics.facility_efficiency).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        {key.replace(/_/g, ' ').toUpperCase()}
                      </label>
                      <span className="text-sm font-bold text-gray-900">{value}%</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${
                          value >= 90
                            ? 'bg-green-500'
                            : value >= 75
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Housing Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Animal Distribution by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.by_housing_type.map(type => (
                    <div key={type.type} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{getHousingTypeLabel(type.type)}</span>
                        <span className="text-gray-600">{type.occupancy}/{type.capacity}</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full"
                          style={{ width: `${(type.occupancy / type.capacity) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Animal Density Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Animal Density per Pen</CardTitle>
              <CardDescription>Space per animal in square meters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 font-medium">Pen</th>
                      <th className="text-center py-2 font-medium">Animals</th>
                      <th className="text-center py-2 font-medium">Capacity</th>
                      <th className="text-center py-2 font-medium">Density (m²/animal)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.animal_density_per_pen.map(pen => (
                      <tr key={pen.pen_id} className="border-b hover:bg-gray-50">
                        <td className="py-3 font-medium">{pen.pen_name}</td>
                        <td className="text-center">{pen.animal_count}</td>
                        <td className="text-center">{pen.capacity}</td>
                        <td className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              pen.density_sqm_per_animal && pen.density_sqm_per_animal >= 5
                                ? 'bg-green-100 text-green-800'
                                : pen.density_sqm_per_animal && pen.density_sqm_per_animal >= 4
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {pen.density_sqm_per_animal?.toFixed(1)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Components */}
      {/* Animal Management Modals */}
      <AssignAnimalModal
        isOpen={isAssignAnimalModalOpen}
        onClose={() => setIsAssignAnimalModalOpen(false)}
        onAssign={(data) => {
          setIsAssignAnimalModalOpen(false)
        }}
        pens={pens}
        unassignedAnimals={unassignedAnimals}
        farmId={farmId}
      />

      <MoveAnimalModal
        isOpen={isMoveAnimalModalOpen}
        onClose={() => setIsMoveAnimalModalOpen(false)}
        onMove={(data) => {
          setIsMoveAnimalModalOpen(false)
        }}
        pens={pens}
        assignedAnimals={assignedAnimals}
      />

      <ScheduleCleaningModal
        isOpen={isScheduleCleaningModalOpen}
        onClose={() => setIsScheduleCleaningModalOpen(false)}
        onSchedule={(data) => {
          setIsScheduleCleaningModalOpen(false)
        }}
        pens={pens}
      />

      {/* Cleaning & Maintenance Modals */}
      <LogCleaningActivityModal
        isOpen={isLogCleaningModalOpen}
        onClose={() => setIsLogCleaningModalOpen(false)}
        onLog={(data) => {
          setIsLogCleaningModalOpen(false)
        }}
        pens={pens}
      />

      <ScheduleMaintenanceModal
        isOpen={isScheduleMaintenanceModalOpen}
        onClose={() => setIsScheduleMaintenanceModalOpen(false)}
        onSchedule={(data) => {
          setIsScheduleMaintenanceModalOpen(false)
        }}
      />

      <LogMaintenanceActivityModal
        isOpen={isLogMaintenanceModalOpen}
        onClose={() => setIsLogMaintenanceModalOpen(false)}
        onLog={(data) => {
          setIsLogMaintenanceModalOpen(false)
        }}
      />



      {/* Building Modal */}
      <AddBuildingModal
        isOpen={isAddBuildingModalOpen}
        onClose={() => setIsAddBuildingModalOpen(false)}
        onAdd={(building) => {
          setBuildings(prev => [...prev, building])
          setIsAddBuildingModalOpen(false)
        }}
      />

      {/* Unit Modal — key on selectedBuilding forces remount so useState initializes with the correct building */}
      <AddUnitModal
        key={selectedBuilding ?? 'no-building'}
        isOpen={isAddUnitModalOpen}
        onClose={() => setIsAddUnitModalOpen(false)}
        onAdd={(unit) => {
          setUnits(prev => [...prev, unit])
          setIsAddUnitModalOpen(false)
        }}
        selectedBuildingId={selectedBuilding}
        buildings={buildings}
        farmId={farmId}
      />

      {/* Pen Modal — key forces remount so useState initializers pick up the current building/unit */}
      <CreatePenModal
        key={`pen-modal-${selectedBuilding}-${selectedUnit}`}
        isOpen={isCreatePenModalOpen}
        onClose={() => setIsCreatePenModalOpen(false)}
        onAdd={(pen) => {
          setPens(prev => [...prev, pen])
          setIsCreatePenModalOpen(false)
        }}
        selectedBuildingId={selectedBuilding}
        selectedUnitId={selectedUnit}
        buildings={buildings}
        units={units}
        farmId={farmId}
      />
    </div>
  )
}
