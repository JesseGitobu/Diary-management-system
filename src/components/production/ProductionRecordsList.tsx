// src/components/production/ProductionRecordsList.tsx

'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  Eye, 
  Edit, 
  Trash2, 
  Clock, 
  Droplets, 
  Thermometer,
  Activity,
  MoreHorizontal,
  Calendar
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

interface ProductionRecord {
  id: string
  animal_id: string
  record_date: string
  milking_session: 'morning' | 'afternoon' | 'evening'
  milk_volume: number
  fat_content?: number
  protein_content?: number
  somatic_cell_count?: number
  lactose_content?: number
  temperature?: number
  ph_level?: number
  notes?: string
  created_at: string
  animals?: {
    id: string
    tag_number: string
    name?: string
  }
}

interface ProductionRecordsListProps {
  records: ProductionRecord[]
  canEdit: boolean
  onEdit?: (record: ProductionRecord) => void
  onDelete?: (recordId: string) => void
  onView?: (record: ProductionRecord) => void
  isMobile?: boolean
}

// Consistent, hydration-safe date formatting
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ProductionRecordsList({ 
  records, 
  canEdit, 
  onEdit,
  onDelete,
  onView,
  isMobile = false 
}: ProductionRecordsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const handleDelete = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this production record?')) {
      return
    }
    
    setDeletingId(recordId)
    
    try {
      const response = await fetch(`/api/production/${recordId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete record')
      }
      
      if (onDelete) {
        onDelete(recordId)
      } else {
        window.location.reload()
      }
    } catch (error) {
      console.error('Error deleting record:', error)
      alert('Failed to delete record. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }
  
  const getSessionBadgeColor = (session: string) => {
    switch (session) {
      case 'morning': return 'bg-blue-100 text-blue-800'
      case 'afternoon': return 'bg-yellow-100 text-yellow-800'
      case 'evening': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getQualityIndicator = (fatContent?: number, proteinContent?: number) => {
    if (!fatContent || !proteinContent) return null
    const fatGood = fatContent >= 3.5 && fatContent <= 4.5
    const proteinGood = proteinContent >= 3.0 && proteinContent <= 3.5
    if (fatGood && proteinGood) return { label: 'Excellent', color: 'bg-green-100 text-green-800' }
    if (fatGood || proteinGood) return { label: 'Good', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Needs Attention', color: 'bg-red-100 text-red-800' }
  }
  
  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <Droplets className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No production records</h3>
        <p className="mt-2 text-sm text-gray-500">
          Start by recording your first milk production data.
        </p>
        <Button className="mt-4">
          <Droplets className="mr-2 h-4 w-4" />
          Record Production
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {records.map((record) => {
        const qualityIndicator = getQualityIndicator(record.fat_content, record.protein_content)
        
        return (
          <Card key={record.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-farm-green/10 rounded-lg flex items-center justify-center">
                      <Droplets className="w-6 h-6 text-farm-green" />
                    </div>
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {record.animals?.name || `Animal ${record.animals?.tag_number}`}
                      </h4>
                      <Badge className={getSessionBadgeColor(record.milking_session)}>
                        <Clock className="w-3 h-3 mr-1" />
                        {record.milking_session}
                      </Badge>
                      {qualityIndicator && (
                        <Badge className={qualityIndicator.color}>
                          {qualityIndicator.label}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(record.record_date)}
                      </span>
                      <span>Tag: {record.animals?.tag_number}</span>
                    </div>
                    
                    {/* Production Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{record.milk_volume}</p>
                        <p className="text-xs text-blue-600 font-medium">Liters</p>
                      </div>
                      {record.fat_content && (
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <p className="text-xl font-bold text-orange-600">{record.fat_content}%</p>
                          <p className="text-xs text-orange-600 font-medium">Fat</p>
                        </div>
                      )}
                      {record.protein_content && (
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-xl font-bold text-green-600">{record.protein_content}%</p>
                          <p className="text-xs text-green-600 font-medium">Protein</p>
                        </div>
                      )}
                      {record.somatic_cell_count && (
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <p className="text-sm font-bold text-purple-600">
                            {(record.somatic_cell_count / 1000).toFixed(0)}k
                          </p>
                          <p className="text-xs text-purple-600 font-medium">SCC</p>
                        </div>
                      )}
                      {record.temperature && (
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <p className="text-xl font-bold text-red-600">{record.temperature}°C</p>
                          <p className="text-xs text-red-600 font-medium">Temp</p>
                        </div>
                      )}
                      {record.ph_level && (
                        <div className="text-center p-3 bg-indigo-50 rounded-lg">
                          <p className="text-xl font-bold text-indigo-600">{record.ph_level}</p>
                          <p className="text-xs text-indigo-600 font-medium">pH</p>
                        </div>
                      )}
                    </div>
                    
                    {record.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Notes:</span> {record.notes}
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Recorded on {formatDateTime(record.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {canEdit && (
                  <div className="flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild={true}>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView?.(record)} className="flex items-center">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(record)} className="flex items-center">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Record
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(record.id)}
                          disabled={deletingId === record.id}
                          className="flex items-center text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {deletingId === record.id ? 'Deleting...' : 'Delete Record'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
      
      {records.length >= 10 && (
        <div className="text-center py-4">
          <Button variant="outline">Load More Records</Button>
        </div>
      )}
    </div>
  )
}
