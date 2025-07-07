'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Eye, Edit, Trash2, Calendar, Weight } from 'lucide-react'
import Link from 'next/link'
import { Database } from '@/lib/supabase/types'

type Animal = Database['public']['Tables']['animals']['Row']

interface AnimalsListProps {
  animals: Animal[]
}

export function AnimalsList({ animals }: AnimalsListProps) {
  if (animals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No animals yet
            </h3>
            <p className="text-gray-600 mb-6">
              Get started by adding your first animal to the herd.
            </p>
            <Button asChild>
              <Link href="/dashboard/animals/add">
                Add Your First Animal
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {animals.map((animal) => (
        <Card key={animal.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {animal.name || `Animal ${animal.tag_number}`}
              </CardTitle>
              <Badge variant={animal.gender === 'female' ? 'default' : 'secondary'}>
                {animal.gender}
              </Badge>
            </div>
            <CardDescription>
              Tag: {animal.tag_number} • {animal.breed || 'Unknown breed'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              {animal.birth_date && (
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  Born: {new Date(animal.birth_date).toLocaleDateString()}
                </div>
              )}
              {animal.weight && (
                <div className="flex items-center text-sm text-gray-600">
                  <Weight className="w-4 h-4 mr-2" />
                  Weight: {animal.weight} kg
                </div>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button asChild size="sm" variant="outline" className="flex-1">
                <Link href={`/dashboard/animals/${animal.id}`}>
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="flex-1">
                <Link href={`/dashboard/animals/${animal.id}/edit`}>
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}