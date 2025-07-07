'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Milk, Plus } from 'lucide-react'

interface AnimalProductionRecordsProps {
  animalId: string
  canAddRecords: boolean
}

export function AnimalProductionRecords({ animalId, canAddRecords }: AnimalProductionRecordsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Production Records</h3>
          <p className="text-sm text-gray-600">
            Track milk production and quality metrics
          </p>
        </div>
        {canAddRecords && (
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add Record (Coming Soon)
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Milk className="w-5 h-5" />
            <span>Milk Production</span>
          </CardTitle>
          <CardDescription>
            Daily milk production tracking and quality metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Milk className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Production tracking coming soon
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              This feature will be available in the next update
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}