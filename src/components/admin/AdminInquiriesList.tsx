'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Mail, 
  Phone, 
  Calendar,
  CheckCircle2,
  Clock,
  Archive,
  ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import { toast } from 'react-hot-toast'

interface Inquiry {
  id: string
  full_name: string
  email: string
  phone: string | null
  farm_details: string
  message: string
  status: 'new' | 'read' | 'contacted' | 'archived'
  created_at: string
}

interface AdminInquiriesListProps {
  initialInquiries: Inquiry[]
}

export function AdminInquiriesList({ initialInquiries }: AdminInquiriesListProps) {
  const [inquiries, setInquiries] = useState<Inquiry[]>(initialInquiries)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const supabase = createClient()

  // Filter logic
  const filteredInquiries = inquiries.filter(inquiry => {
    const matchesSearch = 
      inquiry.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.farm_details.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || inquiry.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">New</Badge>
      case 'read':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Read</Badge>
      case 'contacted':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Contacted</Badge>
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Archived</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Update Status Handler
  const handleStatusUpdate = async (id: string, newStatus: Inquiry['status']) => {
    setIsUpdating(true)
    try {
      const { error } = await (supabase
        .from('contact_inquiries') as any)
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error

      // Update local state
      setInquiries(prev => prev.map(item => 
        item.id === id ? { ...item, status: newStatus } : item
      ))
      
      // Also update selected inquiry if open
      if (selectedInquiry?.id === id) {
        setSelectedInquiry(prev => prev ? { ...prev, status: newStatus } : null)
      }

      toast.success(`Marked as ${newStatus}`)
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  // View Details Handler
  const handleViewDetails = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry)
    setIsDetailsOpen(true)
    
    // Auto-mark as read if new
    if (inquiry.status === 'new') {
      handleStatusUpdate(inquiry.id, 'read')
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search inquiries..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Inquiries</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Inquiries Table */}
      <Card>
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-base font-medium">
            Recent Inquiries ({filteredInquiries.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="min-h-screen overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Farm Details</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="bg-gray-100 p-3 rounded-full mb-3">
                          <Mail className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="font-medium">No inquiries found</p>
                        <p className="text-xs mt-1">Try adjusting your filters or search terms</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInquiries.map((inquiry) => (
                    <tr 
                      key={inquiry.id} 
                      className="bg-white border-b hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleViewDetails(inquiry)}
                    >
                      <td className="px-6 py-4">
                        {getStatusBadge(inquiry.status)}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {inquiry.full_name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-gray-900">{inquiry.email}</span>
                          {inquiry.phone && (
                            <span className="text-gray-500 text-xs">{inquiry.phone}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {inquiry.farm_details}
                      </td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {format(new Date(inquiry.created_at), 'MMM d, yyyy')}
                        <span className="block text-xs">
                          {format(new Date(inquiry.created_at), 'h:mm a')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewDetails(inquiry)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleStatusUpdate(inquiry.id, 'contacted')}>
                              <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                              Mark Contacted
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusUpdate(inquiry.id, 'archived')}>
                              <Archive className="mr-2 h-4 w-4 text-gray-500" />
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Inquiry Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between mr-8">
              <div>
                <DialogTitle className="text-xl">Inquiry Details</DialogTitle>
                <DialogDescription>
                  Received on {selectedInquiry && format(new Date(selectedInquiry.created_at), 'PPP at p')}
                </DialogDescription>
              </div>
              {selectedInquiry && getStatusBadge(selectedInquiry.status)}
            </div>
          </DialogHeader>

          {selectedInquiry && (
            <div className="grid gap-6 py-4">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Full Name</h4>
                  <p className="font-medium text-gray-900">{selectedInquiry.full_name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Farm Info</h4>
                  <p className="font-medium text-gray-900">{selectedInquiry.farm_details}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
                  <a href={`mailto:${selectedInquiry.email}`} className="text-blue-600 hover:underline flex items-center gap-1">
                    {selectedInquiry.email}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Phone</h4>
                  {selectedInquiry.phone ? (
                    <a href={`tel:${selectedInquiry.phone}`} className="text-blue-600 hover:underline flex items-center gap-1">
                      {selectedInquiry.phone}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-gray-400">Not provided</span>
                  )}
                </div>
              </div>

              {/* Message Body */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Message</h4>
                <div className="p-4 bg-white border rounded-lg text-gray-700 whitespace-pre-wrap leading-relaxed min-h-[120px]">
                  {selectedInquiry.message}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between items-center border-t pt-4">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => selectedInquiry && handleStatusUpdate(selectedInquiry.id, 'archived')}
                disabled={isUpdating}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button 
                variant="outline"
                onClick={() => setIsDetailsOpen(false)}
              >
                Close
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  if (selectedInquiry) {
                    handleStatusUpdate(selectedInquiry.id, 'contacted')
                    setIsDetailsOpen(false)
                  }
                }}
                disabled={isUpdating}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Contacted
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}