// Mobile-Optimized DistributionRecordsList.tsx
'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'

import { 
  Search, 
  Filter, 
  Truck, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Phone,
  MapPin,
  MoreVertical,
  Edit,
  Eye
} from 'lucide-react'

interface DistributionRecord {
  id: string
  date: string
  channelName: string
  channelType: 'cooperative' | 'processor' | 'direct' | 'retail'
  volume: number
  pricePerLiter: number
  totalAmount: number
  status: 'pending' | 'delivered' | 'paid'
  paymentMethod?: string
  driverName?: string
  deliveryTime?: string
  notes?: string
  vehicleNumber?: string
}

interface DistributionRecordsListProps {
  records: DistributionRecord[]
  canEdit: boolean
  isMobile: boolean
}

const statusConfig = {
  pending: {
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    label: 'Pending'
  },
  delivered: {
    color: 'bg-blue-100 text-blue-800',
    icon: Truck,
    label: 'Delivered'
  },
  paid: {
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    label: 'Paid'
  }
}

const channelTypeConfig = {
  cooperative: {
    color: 'bg-green-100 text-green-800',
    label: 'Cooperative'
  },
  processor: {
    color: 'bg-blue-100 text-blue-800',
    label: 'Processor'
  },
  direct: {
    color: 'bg-orange-100 text-orange-800',
    label: 'Direct Sale'
  },
  retail: {
    color: 'bg-purple-100 text-purple-800',
    label: 'Retail'
  }
}

const paymentMethodIcons = {
  cash: '💵',
  mpesa: '📱',
  bank: '🏦',
  credit: '📋'
}

export function DistributionRecordsList({
  records: initialRecords,
  canEdit,
  isMobile
}: DistributionRecordsListProps) {
  const [records, setRecords] = useState(initialRecords)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [channelTypeFilter, setChannelTypeFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Filter records based on search and filters
  const filteredRecords = records.filter(record => {
    const matchesSearch = record.channelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter
    const matchesChannelType = channelTypeFilter === 'all' || record.channelType === channelTypeFilter

    return matchesSearch && matchesStatus && matchesChannelType
  })

  const handleStatusUpdate = async (recordId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/distribution/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        setRecords(prev => prev.map(record => 
          record.id === recordId ? { ...record, status: newStatus as any } : record
        ))
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-KE', { 
      day: 'numeric', 
      month: 'short',
      year: isMobile ? '2-digit' : 'numeric'
    })
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return ''
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No distribution records yet</p>
        <p className="text-gray-400 text-sm">Start by recording your first distribution</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by channel, driver, or vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Toggle for Mobile */}
        {isMobile && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters {(statusFilter !== 'all' || channelTypeFilter !== 'all') && '(Active)'}
          </Button>
        )}

        {/* Filters */}
        {(!isMobile || showFilters) && (
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>

            <Select value={channelTypeFilter} onValueChange={setChannelTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by channel type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channel Types</SelectItem>
                <SelectItem value="cooperative">Cooperative</SelectItem>
                <SelectItem value="processor">Processor</SelectItem>
                <SelectItem value="direct">Direct Sale</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Records Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
          {filteredRecords.length !== records.length && ` (filtered from ${records.length})`}
        </span>
        {(statusFilter !== 'all' || channelTypeFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all')
              setChannelTypeFilter('all')
            }}
            className="text-xs"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Records List */}
      <div className="space-y-3">
        {filteredRecords.map((record) => {
          const StatusIcon = statusConfig[record.status].icon
          
          return (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
                {isMobile ? (
                  /* Mobile Layout */
                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{record.channelName}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={channelTypeConfig[record.channelType].color}>
                            {channelTypeConfig[record.channelType].label}
                          </Badge>
                          <Badge className={statusConfig[record.status].color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[record.status].label}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">
                          KSh {record.totalAmount.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(record.date)}
                        </div>
                      </div>
                    </div>

                    {/* Volume and Price Row */}
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">{record.volume}L</div>
                          <div className="text-xs text-gray-500">Volume</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">
                            KSh {record.pricePerLiter}
                          </div>
                          <div className="text-xs text-gray-500">Per Liter</div>
                        </div>
                      </div>
                      {record.paymentMethod && (
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <span>{paymentMethodIcons[record.paymentMethod as keyof typeof paymentMethodIcons]}</span>
                            <span className="text-sm capitalize">{record.paymentMethod}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Driver and Vehicle Info */}
                    {(record.driverName || record.vehicleNumber) && (
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        {record.driverName && (
                          <div className="flex items-center space-x-1">
                            <Truck className="w-4 h-4" />
                            <span>{record.driverName}</span>
                          </div>
                        )}
                        {record.vehicleNumber && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>{record.vehicleNumber}</span>
                          </div>
                        )}
                        {record.deliveryTime && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatTime(record.deliveryTime)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    {canEdit && (
                      <div className="flex space-x-2 pt-2">
                        {record.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(record.id, 'delivered')}
                            className="flex-1"
                          >
                            <Truck className="w-4 h-4 mr-1" />
                            Mark Delivered
                          </Button>
                        )}
                        {record.status === 'delivered' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(record.id, 'paid')}
                            className="flex-1"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Paid
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="px-3"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Desktop Layout */
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="font-medium text-gray-900">{record.channelName}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={channelTypeConfig[record.channelType].color}>
                            {channelTypeConfig[record.channelType].label}
                          </Badge>
                          {record.driverName && (
                            <span className="text-sm text-gray-500">
                              Driver: {record.driverName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">{record.volume}L</div>
                        <div className="text-xs text-gray-500">Volume</div>
                      </div>

                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">
                          KSh {record.pricePerLiter}
                        </div>
                        <div className="text-xs text-gray-500">Per Liter</div>
                      </div>

                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">
                          KSh {record.totalAmount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">Total</div>
                      </div>

                      <div className="text-center">
                        <Badge className={statusConfig[record.status].color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig[record.status].label}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(record.date)}
                        </div>
                      </div>

                      {canEdit && (
                        <div className="flex items-center space-x-2">
                          {record.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(record.id, 'delivered')}
                            >
                              <Truck className="w-4 h-4 mr-1" />
                              Delivered
                            </Button>
                          )}
                          {record.status === 'delivered' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(record.id, 'paid')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Paid
                            </Button>
                          )}
                          <Button size="sm" variant="ghost">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* No Results */}
      {filteredRecords.length === 0 && records.length > 0 && (
        <div className="text-center py-8">
          <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">No records match your search criteria</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('all')
              setChannelTypeFilter('all')
            }}
            className="mt-2"
          >
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  )
}