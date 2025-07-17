'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { AnimalBasicInfo } from '@/components/animals/AnimalBasicInfo'
import { AnimalHealthRecords } from '@/components/animals/AnimalHealthRecords'
import { AnimalProductionRecords } from '@/components/animals/AnimalProductionRecords'
import { EditAnimalModal } from '@/components/animals/EditAnimalModal'
import { ReleaseAnimalModal } from '@/components/animals/ReleaseAnimalModal'
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  Weight, 
  MapPin,
  Heart,
  Milk,
  FileText,
  Camera,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface AnimalProfileProps {
  animal: any
  userRole: string
  farmId: string
}

export function AnimalProfile({ animal, userRole, farmId }: AnimalProfileProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showReleaseModal, setShowReleaseModal] = useState(false)
  const [animalData, setAnimalData] = useState(animal)
  const router = useRouter()
  
  const canEdit = ['farm_owner', 'farm_manager'].includes(userRole)
  const canAddRecords = ['farm_owner', 'farm_manager', 'worker'].includes(userRole)
  const canRelease = ['farm_owner', 'farm_manager'].includes(userRole)
  
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pregnant': return 'bg-blue-100 text-blue-800'
      case 'dry': return 'bg-yellow-100 text-yellow-800'
      case 'sick': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 'Unknown'
    
    const birth = new Date(birthDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - birth.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 30) {
      return `${diffDays} days`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} month${months !== 1 ? 's' : ''}`
    } else {
      const years = Math.floor(diffDays / 365)
      const remainingMonths = Math.floor((diffDays % 365) / 30)
      return `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
    }
  }
  
  const handleAnimalUpdated = (updatedAnimal: any) => {
    setAnimalData(updatedAnimal)
    setShowEditModal(false)
  }
  
  const handleAnimalReleased = () => {
    setShowReleaseModal(false)
    router.push('/dashboard/animals')
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/animals">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Animals
            </Link>
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {animalData.name || `Animal ${animalData.tag_number}`}
            </h1>
            <p className="text-gray-600">
              Tag: {animalData.tag_number} • {animalData.breed || 'Unknown breed'}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Camera className="mr-2 h-4 w-4" />
            Add Photo
          </Button>
          
          {canEdit && (
            <Button 
            
              size="sm"
              onClick={() => setShowEditModal(true)}
              className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-600"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Animal
            </Button>
          )}
          
          {canRelease && (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setShowReleaseModal(true)}
              className="text-red-600 border-red-300 hover:bg-red-500 hover:text-white hover:border-red-600"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Release Animal
            </Button>
          )}
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Age</p>
                <p className="font-medium">{calculateAge(animalData.birth_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Weight className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Weight</p>
                <p className="font-medium">{animalData.weight ? `${animalData.weight} kg` : 'Not recorded'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge className={getStatusBadgeColor(animalData.status)}>
                  {animalData.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Milk className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Gender</p>
                <p className="font-medium capitalize">{animalData.gender}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">Health Records</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <AnimalBasicInfo 
            animal={animalData} 
            canEdit={canEdit}
            onEditClick={() => setShowEditModal(true)}
          />
        </TabsContent>
        
        <TabsContent value="health" className="space-y-6">
          <AnimalHealthRecords 
            animalId={animalData.id}
            canAddRecords={canAddRecords}
          />
        </TabsContent>
        
        <TabsContent value="production" className="space-y-6">
          <AnimalProductionRecords 
            animalId={animalData.id}
            canAddRecords={canAddRecords}
          />
        </TabsContent>
        
        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>
                Additional information about this animal
              </CardDescription>
            </CardHeader>
            <CardContent>
              {animalData.notes ? (
                <p className="text-gray-700 whitespace-pre-wrap">{animalData.notes}</p>
              ) : (
                <p className="text-gray-500 italic">No notes recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Edit Animal Modal */}
      {showEditModal && (
        <EditAnimalModal
          animal={animalData}
          farmId={farmId}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onAnimalUpdated={handleAnimalUpdated}
        />
      )}
      
      {/* Release Animal Modal */}
      {showReleaseModal && (
        <ReleaseAnimalModal
          animal={animalData}
          isOpen={showReleaseModal}
          onClose={() => setShowReleaseModal(false)}
          onAnimalReleased={handleAnimalReleased}
        />
      )}
    </div>
  )
}