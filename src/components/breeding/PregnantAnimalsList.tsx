'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Baby, Calendar, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface PregnantAnimalsListProps {
  farmId: string
  canManage: boolean
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

export function PregnantAnimalsList({ farmId, canManage }: PregnantAnimalsListProps) {
  const [pregnantAnimals, setPregnantAnimals] = useState<PregnantAnimal[]>([])
  const [loading, setLoading] = useState(true)

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
            <p className="text-sm text-gray-500 mt-2">Loading pregnant animals...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const dueSoonCount = pregnantAnimals.filter(a => {
    const daysUntil = getDaysUntilDue(a.estimated_due_date)
    return daysUntil <= 7 && daysUntil >= 0
  }).length

  const overdueCount = pregnantAnimals.filter(a => 
    getDaysUntilDue(a.estimated_due_date) < 0
  ).length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Baby className="h-5 w-5" />
            <span>Pregnant Animals</span>
          </CardTitle>
          <CardDescription>
            Monitor pregnant animals and expected calving dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pregnantAnimals.length === 0 ? (
            <div className="text-center py-8">
              <Baby className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No pregnant animals
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Animals will appear here after confirmed pregnancies
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pregnantAnimals.map((animal) => {
                const daysUntilDue = getDaysUntilDue(animal.estimated_due_date)
                const isOverdue = daysUntilDue < 0
                const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0
                
                return (
                  <div key={animal.id} className="border border-gray-200 rounded-lg p-4">
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
                            Tag: {animal.tag_number} • {animal.days_pregnant} days pregnant
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
                            <Button size="sm">
                              Record Calving
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Pregnancy Progress</span>
                        <span>{Math.round((animal.days_pregnant / 280) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            isOverdue ? 'bg-red-500' : isDueSoon ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((animal.days_pregnant / 280) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Baby className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Total Pregnant</p>
                <p className="text-lg font-bold text-green-600">{pregnantAnimals.length}</p>
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