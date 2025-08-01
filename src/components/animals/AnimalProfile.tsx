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
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
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
  AlertTriangle,
  MoreVertical,
  Share
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
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [animalData, setAnimalData] = useState(animal)
  const router = useRouter()
  const { isMobile, isTouch } = useDeviceInfo()
  
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
      return isMobile ? `${diffDays}d` : `${diffDays} days`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return isMobile ? `${months}mo` : `${months} month${months !== 1 ? 's' : ''}`
    } else {
      const years = Math.floor(diffDays / 365)
      const remainingMonths = Math.floor((diffDays % 365) / 30)
      return isMobile 
        ? `${years}y ${remainingMonths}m`
        : `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
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

  // Mobile action menu items
  const actionMenuItems = [
    ...(canEdit ? [{
      label: 'Edit Animal',
      icon: Edit,
      onClick: () => {
        setShowEditModal(true)
        setShowActionMenu(false)
      }
    }] : []),
    {
      label: 'Add Photo',
      icon: Camera,
      onClick: () => {
        // Handle photo upload
        setShowActionMenu(false)
      }
    },
    ...(canRelease ? [{
      label: 'Release Animal',
      icon: AlertTriangle,
      onClick: () => {
        setShowReleaseModal(true)
        setShowActionMenu(false)
      },
      destructive: true
    }] : [])
  ]
  
  return (
    <div className={cn(
      "space-y-6",
      isMobile && "pb-safe" // Safe area for mobile
    )}>
      {/* Mobile Header */}
      {isMobile ? (
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" asChild className="p-2">
                <Link href="/dashboard/animals">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  {animalData.name || `#${animalData.tag_number}`}
                </h1>
                <p className="text-sm text-gray-600 truncate">
                  {animalData.breed || 'Unknown breed'}
                </p>
              </div>
            </div>
            
            {/* Mobile Action Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={() => setShowActionMenu(!showActionMenu)}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
              
              {showActionMenu && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setShowActionMenu(false)}
                  />
                  
                  {/* Menu */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
                      {actionMenuItems.map((item, index) => (
                        <button
                          key={index}
                          onClick={item.onClick}
                          className={cn(
                            "w-full flex items-center px-4 py-2 text-sm hover:bg-gray-50 transition-colors",
                            item.destructive 
                              ? "text-red-600 hover:bg-red-50" 
                              : "text-gray-700"
                          )}
                        >
                          <item.icon className="w-4 h-4 mr-3" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Desktop Header */
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
      )}
      
      {/* Quick Stats - Responsive Grid */}
      <div className={cn(
        "grid gap-4",
        isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-4"
      )}>
        <Card>
          <CardContent className={cn(
            isMobile ? "p-3" : "p-4"
          )}>
            <div className={cn(
              "flex items-center",
              isMobile ? "space-x-2" : "space-x-3"
            )}>
              <div className={cn(
                "bg-blue-100 rounded-lg flex items-center justify-center",
                isMobile ? "w-8 h-8" : "w-10 h-10"
              )}>
                <Calendar className={cn(
                  "text-blue-600",
                  isMobile ? "w-4 h-4" : "w-5 h-5"
                )} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "text-gray-600",
                  isMobile ? "text-xs" : "text-sm"
                )}>Age</p>
                <p className={cn(
                  "font-medium truncate",
                  isMobile ? "text-sm" : "text-base"
                )}>
                  {calculateAge(animalData.birth_date)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className={cn(
            isMobile ? "p-3" : "p-4"
          )}>
            <div className={cn(
              "flex items-center",
              isMobile ? "space-x-2" : "space-x-3"
            )}>
              <div className={cn(
                "bg-green-100 rounded-lg flex items-center justify-center",
                isMobile ? "w-8 h-8" : "w-10 h-10"
              )}>
                <Weight className={cn(
                  "text-green-600",
                  isMobile ? "w-4 h-4" : "w-5 h-5"
                )} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "text-gray-600",
                  isMobile ? "text-xs" : "text-sm"
                )}>Weight</p>
                <p className={cn(
                  "font-medium truncate",
                  isMobile ? "text-sm" : "text-base"
                )}>
                  {animalData.weight ? `${animalData.weight}kg` : 'Not recorded'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className={cn(
            isMobile ? "p-3" : "p-4"
          )}>
            <div className={cn(
              "flex items-center",
              isMobile ? "space-x-2" : "space-x-3"
            )}>
              <div className={cn(
                "bg-purple-100 rounded-lg flex items-center justify-center",
                isMobile ? "w-8 h-8" : "w-10 h-10"
              )}>
                <Heart className={cn(
                  "text-purple-600",
                  isMobile ? "w-4 h-4" : "w-5 h-5"
                )} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "text-gray-600",
                  isMobile ? "text-xs" : "text-sm"
                )}>Status</p>
                <Badge className={cn(
                  getStatusBadgeColor(animalData.status),
                  isMobile ? "text-xs px-1.5 py-0.5" : ""
                )}>
                  {animalData.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className={cn(
            isMobile ? "p-3" : "p-4"
          )}>
            <div className={cn(
              "flex items-center",
              isMobile ? "space-x-2" : "space-x-3"
            )}>
              <div className={cn(
                "bg-yellow-100 rounded-lg flex items-center justify-center",
                isMobile ? "w-8 h-8" : "w-10 h-10"
              )}>
                <Milk className={cn(
                  "text-yellow-600",
                  isMobile ? "w-4 h-4" : "w-5 h-5"
                )} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "text-gray-600",
                  isMobile ? "text-xs" : "text-sm"
                )}>Gender</p>
                <p className={cn(
                  "font-medium capitalize truncate",
                  isMobile ? "text-sm" : "text-base"
                )}>
                  {animalData.gender}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Tabs - Mobile Optimized */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className={cn(
          isMobile && "sticky top-16 bg-white border-b border-gray-200 z-10 -mx-4 px-4 pb-2"
        )}>
          <TabsList className={cn(
            "grid w-full",
            isMobile ? "grid-cols-4 h-10" : "grid-cols-4"
          )}>
            <TabsTrigger 
              value="overview"
              className={cn(isMobile ? "text-xs px-2" : "")}
            >
              {isMobile ? "Info" : "Overview"}
            </TabsTrigger>
            <TabsTrigger 
              value="health"
              className={cn(isMobile ? "text-xs px-2" : "")}
            >
              Health
            </TabsTrigger>
            <TabsTrigger 
              value="production"
              className={cn(isMobile ? "text-xs px-2" : "")}
            >
              {isMobile ? "Prod." : "Production"}
            </TabsTrigger>
            <TabsTrigger 
              value="notes"
              className={cn(isMobile ? "text-xs px-2" : "")}
            >
              Notes
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className={cn(isMobile && "mt-4")}>
          <TabsContent value="overview" className="space-y-6 mt-0">
            <AnimalBasicInfo 
              animal={animalData} 
              canEdit={canEdit}
              onEditClick={() => setShowEditModal(true)}
            />
          </TabsContent>
          <TabsContent value="production" className="space-y-6 mt-0">
            <AnimalProductionRecords 
              animalId={animalData.id}
              canAddRecords={canAddRecords}
            />
          </TabsContent>
          <TabsContent value="health" className="space-y-6 mt-0">
            <AnimalHealthRecords 
              animalId={animalData.id}
              canAddRecords={canAddRecords}
            />
          </TabsContent>
          
          <TabsContent value="notes" className="space-y-6 mt-0">
            <Card>
              <CardHeader className={cn(
                isMobile ? "px-4 py-3" : ""
              )}>
                <CardTitle className={cn(
                  isMobile ? "text-base" : ""
                )}>Notes</CardTitle>
                <CardDescription className={cn(
                  isMobile ? "text-sm" : ""
                )}>
                  Additional information about this animal
                </CardDescription>
              </CardHeader>
              <CardContent className={cn(
                isMobile ? "px-4 pb-4 pt-0" : ""
              )}>
                {animalData.notes ? (
                  <p className={cn(
                    "text-gray-700 whitespace-pre-wrap",
                    isMobile ? "text-sm leading-relaxed" : ""
                  )}>
                    {animalData.notes}
                  </p>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500 italic">No notes recorded yet.</p>
                    {canEdit && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4"
                        onClick={() => setShowEditModal(true)}
                      >
                        Add Notes
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
      
      {/* Floating Action Button for Mobile */}
      {isMobile && canAddRecords && (
        <div className="fixed bottom-20 right-4 z-50">
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => {
              // Navigate to quick add record based on active tab
              if (activeTab === 'health') {
                // Navigate to add health record
              } else if (activeTab === 'production') {
                // Navigate to add production record
              }
            }}
          >
            <FileText className="h-6 w-6" />
          </Button>
        </div>
      )}
      
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