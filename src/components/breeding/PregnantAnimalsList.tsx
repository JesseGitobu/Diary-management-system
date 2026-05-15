// src/components/breeding/PregnantAnimalsList.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Baby, Calendar, Clock, AlertTriangle, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { AbortionForm } from './AbortionForm'

interface PregnantAnimalsListProps {
  farmId: string
  canManage: boolean
  hiddenAnimalIds?: string[] // IDs to hide optimistically
  onRecordCalving?: (animalId: string) => void // Handler to open modal
}

interface PregnantAnimal {
  id: string
  animal_id: string
  tag_number: string
  name?: string
  estimated_due_date: string
  days_pregnant: number
  conception_date: string
  status: 'normal' | 'overdue' | 'due_soon'
  pregnancy_status: string
}

export function PregnantAnimalsList({
  farmId,
  canManage,
  hiddenAnimalIds = [],
  onRecordCalving
}: PregnantAnimalsListProps) {
  const { isMobile } = useDeviceInfo()
  const [pregnantAnimals, setPregnantAnimals] = useState<PregnantAnimal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAbortionAnimal, setSelectedAbortionAnimal] = useState<PregnantAnimal | null>(null)
  const [abortionModalOpen, setAbortionModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'due_soon' | 'overdue'>('all')

  useEffect(() => {
    loadPregnantAnimals()
  }, [farmId])

  const loadPregnantAnimals = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/breeding/pregnant?farmId=${farmId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch pregnant animals')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setPregnantAnimals(data.pregnantAnimals || [])
      }
    } catch (error) {
      console.error('Error loading pregnant animals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAborted = (animal: PregnantAnimal) => {
    setSelectedAbortionAnimal(animal)
    setAbortionModalOpen(true)
  }

  const handleAbortionRecorded = () => {
    setAbortionModalOpen(false)
    setSelectedAbortionAnimal(null)
    loadPregnantAnimals() // ✅ Reload the list to reflect the abortion
  }

  // Filter out animals that have just been marked as calved in the parent component
  const visibleAnimals = useMemo(() => {
    let filtered = pregnantAnimals.filter(animal => !hiddenAnimalIds.includes(animal.animal_id))
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(animal => 
        (animal.name?.toLowerCase().includes(term)) ||
        (animal.tag_number?.toLowerCase().includes(term))
      )
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(animal => animal.status === statusFilter)
    }
    
    return filtered
  }, [pregnantAnimals, hiddenAnimalIds, searchTerm, statusFilter])

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'due_soon':
        return 'bg-yellow-100 text-yellow-800'
      case 'normal':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (animal: PregnantAnimal) => {
    const daysUntilDue = getDaysUntilDue(animal.estimated_due_date)
    
    if (daysUntilDue < 0) {
      return `${Math.abs(daysUntilDue)} days overdue`
    } else if (daysUntilDue <= 7) {
      return `Due in ${daysUntilDue} days`
    } else {
      return `${daysUntilDue} days to go`
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-farm-green mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading in-calf animals...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Use visibleAnimals for stats calculation
  const dueSoonCount = visibleAnimals.filter(a => {
    const daysUntil = getDaysUntilDue(a.estimated_due_date)
    return daysUntil <= 7 && daysUntil >= 0
  }).length

  const overdueCount = visibleAnimals.filter(a => 
    getDaysUntilDue(a.estimated_due_date) < 0
  ).length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Baby className="h-5 w-5" />
            <span>In-calf Animals</span>
          </CardTitle>
          <CardDescription>
            Monitor in-calf animals and expected calving dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters Section */}
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by animal name or tag number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-farm-green text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({pregnantAnimals.filter(a => !hiddenAnimalIds.includes(a.animal_id)).length})
              </button>
              
              <button
                onClick={() => setStatusFilter('normal')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'normal'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                Normal ({pregnantAnimals.filter(a => !hiddenAnimalIds.includes(a.animal_id) && a.status === 'normal').length})
              </button>
              
              <button
                onClick={() => setStatusFilter('due_soon')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'due_soon'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                }`}
              >
                Due Soon ({pregnantAnimals.filter(a => !hiddenAnimalIds.includes(a.animal_id) && a.status === 'due_soon').length})
              </button>
              
              <button
                onClick={() => setStatusFilter('overdue')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'overdue'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                Overdue ({pregnantAnimals.filter(a => !hiddenAnimalIds.includes(a.animal_id) && a.status === 'overdue').length})
              </button>
            </div>
          </div>
          {visibleAnimals.length === 0 ? (
            <div className="text-center py-8">
              <Baby className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm || statusFilter !== 'all' ? 'No animals match filters' : 'No in-calf animals'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Animals will appear here after confirmed pregnancies'}
              </p>
              {(searchTerm || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                  }}
                  className="mt-3 inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Clear filters</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {visibleAnimals.map((animal) => {
                const daysUntilDue = getDaysUntilDue(animal.estimated_due_date)
                const isOverdue = daysUntilDue < 0
                const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0
                
                return (
                  <div key={animal.id} className="border border-gray-200 rounded-lg p-4 animate-in fade-in">
                    {isMobile ? (
                      /* Mobile: stacked layout */
                      <div className="space-y-3">
                        {/* Top row: icon + name + status badge */}
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${
                            isOverdue ? 'bg-red-100' : isDueSoon ? 'bg-yellow-100' : 'bg-green-100'
                          }`}>
                            {isOverdue ? (
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                            ) : (
                              <Baby className="w-5 h-5 text-green-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {animal.name || `Animal ${animal.tag_number}`}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Tag: {animal.tag_number} · {animal.days_pregnant} days in calf
                            </p>
                          </div>
                          <Badge className={`${getStatusColor(animal.status)} flex-shrink-0 text-xs`}>
                            {getStatusLabel(animal)}
                          </Badge>
                        </div>

                        {/* Dates row */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Due: {new Date(animal.estimated_due_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Bred: {new Date(animal.conception_date).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Gestation Progress</span>
                            <span>{Math.round((animal.days_pregnant / 280) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                isOverdue ? 'bg-red-500' : isDueSoon ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min((animal.days_pregnant / 280) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Action buttons: full width */}
                        <div className="flex flex-col gap-2">
                          <Button asChild size="sm" variant="outline" className="w-full">
                            <Link href={`/dashboard/animals/${animal.animal_id}`}>
                              View Animal
                            </Link>
                          </Button>
                          {canManage && (isDueSoon || isOverdue) && (
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => onRecordCalving && onRecordCalving(animal.animal_id)}
                            >
                              Record Calving
                            </Button>
                          )}
                          {canManage && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleMarkAborted(animal)}
                            >
                              Mark as Aborted
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Desktop: side-by-side layout */
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                isOverdue ? 'bg-red-100' : isDueSoon ? 'bg-yellow-100' : 'bg-green-100'
                              }`}>
                                {isOverdue ? (
                                  <AlertTriangle className="w-6 h-6 text-red-600" />
                                ) : (
                                  <Baby className="w-6 h-6 text-green-600" />
                                )}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-medium text-gray-900">
                                {animal.name || `Animal ${animal.tag_number}`}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Tag: {animal.tag_number} · {animal.days_pregnant} days in calf
                              </p>
                              <div className="flex items-center space-x-4 mt-1">
                                <div className="flex items-center space-x-1 text-sm text-gray-500">
                                  <Calendar className="w-4 h-4" />
                                  <span>Due: {new Date(animal.estimated_due_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center space-x-1 text-sm text-gray-500">
                                  <Clock className="w-4 h-4" />
                                  <span>Bred: {new Date(animal.conception_date).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <Badge className={getStatusColor(animal.status)}>
                              {getStatusLabel(animal)}
                            </Badge>
                            <div className="mt-2 space-x-2">
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/dashboard/animals/${animal.animal_id}`}>
                                  View Animal
                                </Link>
                              </Button>
                              {canManage && (isDueSoon || isOverdue) && (
                                <Button
                                  size="sm"
                                  onClick={() => onRecordCalving && onRecordCalving(animal.animal_id)}
                                >
                                  Record Calving
                                </Button>
                              )}                            {canManage && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleMarkAborted(animal)}
                              >
                                Mark as Aborted
                              </Button>
                            )}                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Gestation Progress</span>
                            <span>{Math.round((animal.days_pregnant / 280) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                isOverdue ? 'bg-red-500' : isDueSoon ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min((animal.days_pregnant / 280) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* ✅ Abortion Modal */}
      {abortionModalOpen && selectedAbortionAnimal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <CardTitle>Mark Pregnancy as Aborted</CardTitle>
              <CardDescription>
                Recording abortion for {selectedAbortionAnimal.name || `Animal ${selectedAbortionAnimal.tag_number}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <AbortionForm
                farmId={farmId}
                animalId={selectedAbortionAnimal.animal_id}
                animalName={selectedAbortionAnimal.name}
                animalTag={selectedAbortionAnimal.tag_number}
                pregnancyRecord={{
                  id: selectedAbortionAnimal.id,
                  service_date: selectedAbortionAnimal.conception_date,
                  expected_calving_date: selectedAbortionAnimal.estimated_due_date
                }}
                onAbortionRecorded={handleAbortionRecorded}
                onCancel={() => {
                  setAbortionModalOpen(false)
                  setSelectedAbortionAnimal(null)
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Summary Statistics - Updated to use dynamic visibleAnimals count */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Baby className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Total In-calf</p>
                <p className="text-lg font-bold text-green-600">{visibleAnimals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Due Soon</p>
                <p className="text-lg font-bold text-yellow-600">{dueSoonCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Overdue</p>
                <p className="text-lg font-bold text-red-600">{overdueCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}