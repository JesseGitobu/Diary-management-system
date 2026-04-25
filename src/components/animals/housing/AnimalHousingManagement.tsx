'use client'

import { useState } from 'react'
import { Plus, Trash2, ArrowRight, Search, Filter, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { AnimalHousingAssignment, AnimalMovementLog, HousingPen } from '@/types/housing'

interface AnimalHousingManagementProps {
  farmId: string
  pens: HousingPen[]
  onAnimalAssigned?: (assignment: AnimalHousingAssignment) => void
  onAnimalMoved?: (movement: AnimalMovementLog) => void
}

export function AnimalHousingManagement({
  farmId,
  pens,
  onAnimalAssigned,
  onAnimalMoved,
}: AnimalHousingManagementProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [selectedAnimal, setSelectedAnimal] = useState<any>(null)
  const [selectedPen, setSelectedPen] = useState<string | null>(null)

  // Sample data - will be replaced with API
  const assignments: AnimalHousingAssignment[] = [
    {
      id: 'a1',
      animal_id: 'animal1',
      pen_id: 'p1',
      farm_id: farmId,
      assigned_at: new Date().toISOString(),
      status: 'assigned',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'a2',
      animal_id: 'animal2',
      pen_id: 'p1',
      farm_id: farmId,
      assigned_at: new Date().toISOString(),
      status: 'assigned',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const movementLogs: AnimalMovementLog[] = [
    {
      id: 'mov1',
      animal_id: 'animal3',
      from_pen_id: 'p2',
      to_pen_id: 'p3',
      farm_id: farmId,
      moved_at: new Date(Date.now() - 3600000).toISOString(),
      moved_by: 'user1',
      reason: 'Production status change',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Assignments</h3>
          <p className="text-sm text-gray-600">
            Manage where each animal is housed and track movements
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAssignModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Assign Animal
          </Button>
          <Button variant="outline" onClick={() => setShowMoveModal(true)}>
            <ArrowRight className="h-4 w-4 mr-2" />
            Move Animal
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by animal tag, ID, or pen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Animals by Pen */}
      <div className="grid gap-4">
        {pens.slice(0, 3).map(pen => (
          <Card key={pen.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h4 className="font-semibold text-lg">{pen.pen_number}</h4>
                  <Badge variant="outline">{pen.special_type.replace(/_/g, ' ')}</Badge>
                </div>
                <Badge className={
                  pen.current_occupancy >= pen.capacity 
                    ? 'bg-red-100 text-red-800'
                    : pen.current_occupancy >= pen.capacity * 0.9
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }>
                  {pen.current_occupancy}/{pen.capacity}
                </Badge>
              </div>
              <CardDescription>
                {pen.assigned_animals.length} animals assigned
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Occupancy Bar */}
              <div className="space-y-1">
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${
                      pen.current_occupancy >= pen.capacity
                        ? 'bg-red-500'
                        : pen.current_occupancy >= pen.capacity * 0.9
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min((pen.current_occupancy / pen.capacity) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Animals List */}
              {pen.assigned_animals.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {pen.assigned_animals.slice(0, 5).map((animalId, idx) => (
                    <div
                      key={animalId}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex items-center space-x-3">
                        <Badge variant="secondary">#{idx + 1}</Badge>
                        <span className="text-sm font-medium">Animal {animalId}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {pen.assigned_animals.length > 5 && (
                    <p className="text-xs text-gray-600 px-2">
                      +{pen.assigned_animals.length - 5} more animals
                    </p>
                  )}
                </div>
              )}

              {/* Pen Conditions Alert */}
              {pen.current_occupancy === pen.capacity && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Pen is at full capacity</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Movements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Movements</CardTitle>
          <CardDescription>Last 10 animal movements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {movementLogs.map(log => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <Badge variant="outline">Animal {log.animal_id}</Badge>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-medium">Pen {log.from_pen_id}</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">Pen {log.to_pen_id}</span>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p className="font-medium">{log.reason}</p>
                  <p className="text-xs">
                    {new Date(log.moved_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
