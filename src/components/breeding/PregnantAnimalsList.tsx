'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Baby, Calendar, Heart, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface PregnantAnimalsListProps {
  farmId: string
  canManage: boolean
}

export function PregnantAnimalsList({ farmId, canManage }: PregnantAnimalsListProps) {
  const [pregnantAnimals, setPregnantAnimals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchPregnantAnimals()
  }, [farmId])
  
  const fetchPregnantAnimals = async () => {
    try {
      const response = await fetch(`/api/breeding/pregnant?farmId=${farmId}`)
      if (response.ok) {
        const data = await response.json()
        setPregnantAnimals(data.pregnantAnimals || [])
      }
    } catch (error) {
      console.error('Error fetching pregnant animals:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const calculatePregnancyProgress = (breedingDate: string, expectedCalvingDate: string) => {
    const bred = new Date(breedingDate).getTime()
    const expected = new Date(expectedCalvingDate).getTime()
    const now = new Date().getTime()
    
    const totalGestation = expected - bred
    const elapsed = now - bred
    
    return Math.min(Math.max((elapsed / totalGestation) * 100, 0), 100)
  }
  
  const getDaysUntilCalving = (expectedDate: string) => {
    const expected = new Date(expectedDate).getTime()
    const now = new Date().getTime()
    const days = Math.ceil((expected - now) / (1000 * 60 * 60 * 24))
    return days
  }
  
  const getPregnancyStage = (progress: number) => {
    if (progress < 33) return { stage: 'First Trimester', color: 'bg-blue-500' }
    if (progress < 66) return { stage: 'Second Trimester', color: 'bg-yellow-500' }
    if (progress < 90) return { stage: 'Third Trimester', color: 'bg-orange-500' }
    return { stage: 'Due Soon', color: 'bg-red-500' }
  }
  
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-farm-green mx-auto mb-4"></div>
            <p className="text-gray-500">Loading pregnant animals...</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (pregnantAnimals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Baby className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Pregnant Animals
          </h3>
          <p className="text-gray-600 text-center mb-6">
            No confirmed pregnancies at this time. Record breeding events and pregnancy checks to track expecting mothers.
          </p>
          {canManage && (
            <div className="flex space-x-3">
              <Button asChild variant="outline">
                <Link href="/dashboard/breeding/record">
                  <Heart className="mr-2 h-4 w-4" />
                  Record Breeding
                </Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/breeding/pregnancy-check">
                  <Baby className="mr-2 h-4 w-4" />
                  Pregnancy Check
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Pregnant Animals ({pregnantAnimals.length})
        </h2>
        {canManage && (
          <Button asChild size="sm">
            <Link href="/dashboard/breeding/calving">
              <Baby className="mr-2 h-4 w-4" />
              Record Calving
            </Link>
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pregnantAnimals.map((animal) => {
          const progress = calculatePregnancyProgress(
            animal.breeding_records[0]?.breeding_date,
            animal.expected_calving_date
          )
          const daysUntilCalving = getDaysUntilCalving(animal.expected_calving_date)
          const pregnancyStage = getPregnancyStage(progress)
          const isDueSoon = daysUntilCalving <= 14
          
          return (
            <Card key={animal.id} className={isDueSoon ? 'border-red-200 bg-red-50' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {animal.animals?.name || `Animal ${animal.animals?.tag_number}`}
                  </CardTitle>
                  <Badge variant="outline">
                    {animal.animals?.tag_number}
                  </Badge>
                </div>
                <CardDescription>
                  Bred: {new Date(animal.breeding_records[0]?.breeding_date).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pregnancy Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{pregnancyStage.stage}</span>
                    <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                
                {/* Due Date Info */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">Due Date</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {new Date(animal.expected_calving_date).toLocaleDateString()}
                    </p>
                    <p className={`text-xs ${
                      daysUntilCalving <= 7 ? 'text-red-600' : 
                      daysUntilCalving <= 14 ? 'text-orange-600' : 'text-gray-600'
                    }`}>
                      {daysUntilCalving > 0 ? `${daysUntilCalving} days` : 'Overdue'}
                    </p>
                  </div>
                </div>
                
                {/* Breeding Info */}
                <div className="text-sm text-gray-600">
                  <p>Method: {animal.breeding_records[0]?.breeding_type?.replace('_', ' ')}</p>
                  {animal.breeding_records[0]?.sire_name && (
                    <p>Sire: {animal.breeding_records[0].sire_name}</p>
                  )}
                  {animal.confirmation_method && (
                    <p>Confirmed by: {animal.confirmation_method.replace('_', ' ')}</p>
                  )}
                </div>
                
                {/* Alerts */}
                {isDueSoon && (
                  <div className="flex items-center space-x-2 p-2 bg-yellow-100 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800 font-medium">
                      Due soon - Monitor closely
                    </span>
                  </div>
                )}
                
                {/* Actions */}
                {canManage && (
                  <div className="flex space-x-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      View Details
                    </Button>
                    {daysUntilCalving <= 30 && (
                      <Button size="sm" className="flex-1">
                        Record Calving
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}