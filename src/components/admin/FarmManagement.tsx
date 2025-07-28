'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { 
  Building2, 
  Users,  
  MapPin, 
  Calendar,
  Search,
  MoreHorizontal,
  Eye,
  Ban,
  Trash2
} from 'lucide-react'
import { GiCow } from 'react-icons/gi'
import Link from 'next/link'

interface UserRole {
  role_type: string
  profiles?: {
    user_metadata?: {
      full_name?: string
    }
    email?: string
  }
}

interface FarmManagementProps {
  initialFarms: any[]
  totalCount: number
}

export function FarmManagement({ initialFarms, totalCount }: FarmManagementProps) {
  const [farms, setFarms] = useState(initialFarms)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  const getSubscriptionBadge = (subscription: any) => {
    if (!subscription) return <Badge variant="outline">No Subscription</Badge>
    
    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      past_due: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <Badge className={statusColors[subscription.status as string] || 'bg-gray-100 text-gray-800'}>
        {subscription.plan_type} - {subscription.status}
      </Badge>
    )
  }

  const filteredFarms = farms.filter(farm => 
    farm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    farm.location?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Farm Management</h1>
          <p className="text-gray-600 mt-2">
            Manage all farms on the platform ({totalCount} total)
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search farms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button variant="outline">
          Export Data
        </Button>
      </div>

      {/* Farms List */}
      <div className="grid grid-cols-1 gap-6">
        {filteredFarms.map((farm) => (
          <Card key={farm.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {farm.name}
                    </h3>
                    {getSubscriptionBadge(farm.billing_subscriptions?.[0])}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {farm.location || 'Location not set'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {farm.user_roles?.length || 0} team members
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <GiCow className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {farm.animals?.length || 0} animals
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Created {new Date(farm.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Farm Owner Info */}
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>Owner:</span>
                    <span className="font-medium">
                      {farm.user_roles?.find((r: UserRole) => r.role_type === 'farm_owner')?.profiles?.user_metadata?.full_name || 
                       farm.user_roles?.find((r: UserRole) => r.role_type === 'farm_owner')?.profiles?.email || 
                       'Unknown'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/farms/${farm.id}`}>
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Link>
                  </Button>
                  
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More */}
      {filteredFarms.length < totalCount && (
        <div className="text-center">
          <Button variant="outline" disabled={loading}>
            {loading ? 'Loading...' : 'Load More Farms'}
          </Button>
        </div>
      )}
    </div>
  )
}