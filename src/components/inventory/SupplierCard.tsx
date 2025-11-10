//src/components/inventory/SupplierCard.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Building2, Phone, Mail, MapPin, Edit, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

interface SupplierCardProps {
  supplier: any
  canManage: boolean
}

export function SupplierCard({ supplier, canManage }: SupplierCardProps) {
  type SupplierType = 'feed' | 'medical' | 'equipment' | 'supplies' | 'maintenance' | 'other';

  const getTypeColor = (type: string) => {
    const colors: Record<SupplierType, string> = {
      feed: 'bg-green-100 text-green-800',
      medical: 'bg-red-100 text-red-800',
      equipment: 'bg-blue-100 text-blue-800',
      supplies: 'bg-yellow-100 text-yellow-800',
      maintenance: 'bg-gray-100 text-gray-800',
      other: 'bg-gray-100 text-gray-800',
    }
    return colors[type as SupplierType] || colors.other
  }
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{supplier.name}</CardTitle>
            {supplier.contact_person && (
              <p className="text-sm text-gray-600 mt-1">
                Contact: {supplier.contact_person}
              </p>
            )}
          </div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Supplier
                </DropdownMenuItem>
                <DropdownMenuItem>
                  View Purchase History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {supplier.supplier_type && (
          <Badge className={getTypeColor(supplier.supplier_type)}>
            {supplier.supplier_type.charAt(0).toUpperCase() + supplier.supplier_type.slice(1)}
          </Badge>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {supplier.email && (
          <div className="flex items-center text-sm">
            <Mail className="w-4 h-4 mr-2 text-gray-400" />
            <span>{supplier.email}</span>
          </div>
        )}
        
        {supplier.phone && (
          <div className="flex items-center text-sm">
            <Phone className="w-4 h-4 mr-2 text-gray-400" />
            <span>{supplier.phone}</span>
          </div>
        )}
        
        {supplier.address && (
          <div className="flex items-start text-sm">
            <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
            <span className="flex-1">{supplier.address}</span>
          </div>
        )}
        
        {supplier.payment_terms && (
          <div className="text-sm">
            <span className="text-gray-600">Payment Terms: </span>
            <span className="font-medium">{supplier.payment_terms}</span>
          </div>
        )}
        
        {supplier.notes && (
          <div className="text-sm text-gray-600 pt-2 border-t">
            {supplier.notes}
          </div>
        )}
      </CardContent>
    </Card>
  )
}