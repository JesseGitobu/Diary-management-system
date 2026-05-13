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
  distribution_date: string
  distribution_channels?: {
    id: string
    name: string
    type: 'cooperative' | 'processor' | 'direct' | 'retail' | 'other'
    contact_person?: string
    is_paid_for?: boolean | null
  }
  channelName?: string
  channelType?: 'cooperative' | 'processor' | 'direct' | 'retail' | 'other'
  isPaidFor?: boolean
  quantity_distributed: number
  unit_price?: number | null
  total_amount?: number | null
  distribution_status: 'pending' | 'delivered' | 'paid' | 'cancelled'
  notes?: string | null
  deliveries?: Array<{
    id: string
    delivery_date: string
    delivery_time?: string | null
    driver_name?: string | null
    vehicle_number?: string | null
    notes?: string | null
  }>
}

interface DistributionRecordsListProps {
  records: DistributionRecord[]
  canEdit: boolean
  isMobile: boolean
}

const statusConfig: Record<string, any> = {
  pending: {
    color: 'bg-amber-50 text-amber-700 border border-amber-200',
    icon: Clock,
    label: 'Pending',
    gradient: 'from-amber-400 to-orange-500'
  },
  delivered: {
    color: 'bg-blue-50 text-blue-700 border border-blue-200',
    icon: Truck,
    label: 'Delivered',
    gradient: 'from-blue-400 to-cyan-500'
  },
  paid: {
    color: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    icon: CheckCircle,
    label: 'Paid',
    gradient: 'from-emerald-400 to-green-500'
  },
  cancelled: {
    color: 'bg-red-50 text-red-700 border border-red-200',
    icon: AlertCircle,
    label: 'Cancelled',
    gradient: 'from-red-400 to-rose-500'
  }
}

const channelTypeConfig: Record<string, any> = {
  cooperative: {
    color: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    label: 'Cooperative',
    icon: '🤝',
    dot: 'bg-emerald-500'
  },
  processor: {
    color: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    label: 'Processor',
    icon: '🏭',
    dot: 'bg-indigo-500'
  },
  direct: {
    color: 'bg-orange-50 text-orange-700 border border-orange-200',
    label: 'Direct Sale',
    icon: '👤',
    dot: 'bg-orange-500'
  },
  retail: {
    color: 'bg-purple-50 text-purple-700 border border-purple-200',
    label: 'Retail',
    icon: '🏪',
    dot: 'bg-purple-500'
  },
  other: {
    color: 'bg-gray-50 text-gray-700 border border-gray-200',
    label: 'Other',
    icon: '📦',
    dot: 'bg-gray-500'
  }
}

// Default configs for missing values
const DEFAULT_STATUS_CONFIG = { color: 'bg-gray-50 text-gray-700 border border-gray-200', icon: AlertCircle, label: 'Unknown', gradient: 'from-gray-400 to-slate-500' }
const DEFAULT_CHANNEL_TYPE_CONFIG = { color: 'bg-slate-50 text-slate-700 border border-slate-200', label: 'Unknown', icon: '❓', dot: 'bg-slate-500' }

// Helper functions for safe config lookup
const getStatusConfig = (status: any) => {
  if (!status) return DEFAULT_STATUS_CONFIG
  return statusConfig[status] || DEFAULT_STATUS_CONFIG
}

const getChannelTypeConfig = (channelType: any) => {
  if (!channelType) return DEFAULT_CHANNEL_TYPE_CONFIG
  return channelTypeConfig[channelType] || DEFAULT_CHANNEL_TYPE_CONFIG
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
  const [paidStatusFilter, setPaidStatusFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Filter records based on search and filters
  const filteredRecords = records.map(record => ({
    ...record,
    channelName: record.distribution_channels?.name || 'Unknown Channel',
    channelType: record.distribution_channels?.type || 'other',
    isPaidFor: record.distribution_channels?.is_paid_for !== false,
    status: record.distribution_status
  })).filter(record => {
    const driverName = record.deliveries?.[0]?.driver_name || ''
    const vehicleNumber = record.deliveries?.[0]?.vehicle_number || ''
    const quantity = record.quantity_distributed.toString()
    
    const matchesSearch = 
      record.channelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quantity.includes(searchTerm)
    
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter
    const matchesChannelType = channelTypeFilter === 'all' || record.channelType === channelTypeFilter
    const matchesPaidStatus = paidStatusFilter === 'all' || 
      (paidStatusFilter === 'paid' && record.isPaidFor) ||
      (paidStatusFilter === 'unpaid' && !record.isPaidFor)

    return matchesSearch && matchesStatus && matchesChannelType && matchesPaidStatus
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
      <div className="text-center py-16 px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <Truck className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-900 text-lg font-semibold">No distribution records yet</p>
        <p className="text-gray-500 text-sm mt-1">Start by recording your first milk distribution to your sales channels</p>
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
            Filters {(statusFilter !== 'all' || channelTypeFilter !== 'all' || paidStatusFilter !== 'all') && <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold bg-blue-500 text-white rounded-full">3</span>}
          </Button>
        )}

        {/* Filters */}
        {(!isMobile || showFilters) && (
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-3`}>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
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
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paidStatusFilter} onValueChange={setPaidStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by payment status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Status</SelectItem>
                <SelectItem value="paid">Paid Channels</SelectItem>
                <SelectItem value="unpaid">Unpaid Channels</SelectItem>
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
        {(statusFilter !== 'all' || channelTypeFilter !== 'all' || paidStatusFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all')
              setChannelTypeFilter('all')
              setPaidStatusFilter('all')
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
          const statusConfig_item = getStatusConfig(record.status)
          const StatusIcon = statusConfig_item.icon
          const channelConfig = getChannelTypeConfig(record.channelType)
          
          return (
            <Card key={record.id} className="hover:shadow-lg transition-all duration-200 border-0 bg-white overflow-hidden">
              <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
                {isMobile ? (
                  /* Mobile Layout */
                  <div className="space-y-4">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-base">{record.channelName}</div>
                        <div className="flex items-center flex-wrap gap-2 mt-2">
                          <Badge className={`${channelConfig.color} text-xs font-medium`}>
                            {channelConfig.icon} {channelConfig.label}
                          </Badge>
                          <Badge className={`${statusConfig_item.color} text-xs font-medium`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig_item.label}
                          </Badge>
                          {!record.isPaidFor && (
                            <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
                              Unpaid Channel
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {record.isPaidFor && record.total_amount !== null && record.total_amount !== undefined ? (
                          <div className="font-bold text-lg text-gray-900">
                            KSh {record.total_amount.toLocaleString()}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">—</div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(record.distribution_date)}
                        </div>
                      </div>
                    </div>

                    {/* Volume and Price Row - Only if paid */}
                    {record.isPaidFor ? (
                      <div className="grid grid-cols-2 gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100">
                        <div className="text-center">
                          <div className="text-xl font-bold text-blue-600">{record.quantity_distributed}L</div>
                          <div className="text-xs text-gray-600 font-medium">Volume</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-emerald-600">
                            KSh {record.unit_price || '—'}
                          </div>
                          <div className="text-xs text-gray-600 font-medium">Per Liter</div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <div className="text-center">
                          <p className="text-xs text-amber-700 font-medium">This is an unpaid channel - pricing data unavailable</p>
                          <div className="text-sm font-semibold text-amber-900 mt-1">{record.quantity_distributed}L distributed</div>
                        </div>
                      </div>
                    )}

                    {/* Driver and Vehicle Info */}
                    {record.deliveries && record.deliveries.length > 0 && (
                      <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        {record.deliveries[0].driver_name && (
                          <div className="flex items-center space-x-2 text-sm text-gray-700">
                            <Truck className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="font-medium">{record.deliveries[0].driver_name}</span>
                          </div>
                        )}
                        {record.deliveries[0].vehicle_number && (
                          <div className="flex items-center space-x-2 text-sm text-gray-700">
                            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="font-medium">{record.deliveries[0].vehicle_number}</span>
                          </div>
                        )}
                        {record.deliveries[0].delivery_time && (
                          <div className="flex items-center space-x-2 text-sm text-gray-700">
                            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                            <span>{formatTime(record.deliveries[0].delivery_time)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {record.notes && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-900">{record.notes}</p>
                      </div>
                    )}

                    {/* Action Buttons - Only for processors/cooperatives with paid channels and deliveries enabled */}
                    {canEdit && record.isPaidFor && (record.channelType === 'processor' || record.channelType === 'cooperative') && record.deliveries && record.deliveries.length > 0 && (
                      <div className="flex gap-2 pt-2">
                        {record.status === 'pending' && (
                          <Button
                            size="sm"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handleStatusUpdate(record.id, 'delivered')}
                          >
                            <Truck className="w-4 h-4 mr-2" />
                            Delivered
                          </Button>
                        )}
                        {record.status === 'delivered' && (
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleStatusUpdate(record.id, 'paid')}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Paid
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="px-3"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Desktop Layout */
                  <div className="flex items-center justify-between gap-6">
                    {/* Left: Channel Info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`h-3 w-3 shrink-0 rounded-full ${channelConfig.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">{record.channelName}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={`${channelConfig.color} text-xs font-medium`}>
                            {channelConfig.icon} {channelConfig.label}
                          </Badge>
                          {!record.isPaidFor && (
                            <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
                              Unpaid
                            </Badge>
                          )}
                          {record.deliveries && record.deliveries.length > 0 && record.deliveries[0].driver_name && (
                            <span className="text-xs text-gray-500">
                              🚚 {record.deliveries[0].driver_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Data */}
                    <div className="flex items-center gap-8">
                      {/* Volume */}
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{record.quantity_distributed}L</div>
                        <div className="text-xs text-gray-500 font-medium">Volume</div>
                      </div>

                      {/* Price - Only if paid */}
                      {record.isPaidFor ? (
                        <>
                          <div className="text-center">
                            <div className="text-lg font-bold text-emerald-600">
                              KSh {record.unit_price || '—'}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">Per Liter</div>
                          </div>

                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-900">
                              KSh {record.total_amount?.toLocaleString() || '0'}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">Total</div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="text-xs text-amber-700 font-medium">No pricing data</div>
                        </div>
                      )}

                      {/* Status & Date */}
                      <div className="text-center">
                        <Badge className={`${statusConfig_item.color} text-xs font-medium inline-flex gap-1`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConfig_item.label}
                        </Badge>
                        <div className="text-xs text-gray-500 font-medium mt-1">
                          {formatDate(record.distribution_date)}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions - Only for processors/cooperatives with paid channels and deliveries enabled */}
                    {canEdit && record.isPaidFor && (record.channelType === 'processor' || record.channelType === 'cooperative') && record.deliveries && record.deliveries.length > 0 && (
                      <div className="flex items-center gap-2 shrink-0">
                        {record.status === 'pending' && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handleStatusUpdate(record.id, 'delivered')}
                          >
                            <Truck className="w-4 h-4 mr-1" />
                            Delivered
                          </Button>
                        )}
                        {record.status === 'delivered' && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleStatusUpdate(record.id, 'paid')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Paid
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* No Results */}
      {filteredRecords.length === 0 && records.length > 0 && (
        <div className="text-center py-12 px-4">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-full mb-4">
            <Search className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-900 font-semibold">No matching records</p>
          <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filters to find what you're looking for</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('all')
              setChannelTypeFilter('all')
              setPaidStatusFilter('all')
            }}
            className="mt-4"
          >
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  )
}