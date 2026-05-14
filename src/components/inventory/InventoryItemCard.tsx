'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { 
  Package, 
  AlertTriangle, 
  Calendar,
  Edit,
  MoreHorizontal,
  Truck,
  ChevronDown
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { RestockInventoryModal } from './Restockinventorymodal'

interface InventoryItemCardProps {
  item: any
  canManage: boolean
  onStockUpdate: (itemId: string, newStock: number) => void
  viewMode?: 'grid' | 'list'
  isMobile?: boolean
}

export function InventoryItemCard({ item, canManage, onStockUpdate, viewMode, isMobile }: InventoryItemCardProps) {
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  
  const isLowStock = item.current_stock < item.minimum_stock
  const isExpiringSoon = item.expiry_date && 
    new Date(item.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  
  // Extract category name - handle both object (from API join) and string (legacy)
  const categoryName = typeof item.category === 'string' 
    ? item.category 
    : item.category?.name || item.category?.display_name || 'other'
  
  // Extract subcategory name - handle both object and string
  const subcategoryName = typeof item.subcategory === 'string'
    ? item.subcategory
    : item.subcategory?.name
  
  const categoryList = [
    'feed',
    'medical',
    'equipment',
    'supplies',
    'chemicals',
    'maintenance',
    'other',
  ] as const
  type Category = typeof categoryList[number]

  const getCategoryColor = (category: string) => {
    const colors: Record<Category, string> = {
      feed: 'bg-green-100 text-green-800',
      medical: 'bg-red-100 text-red-800', 
      equipment: 'bg-blue-100 text-blue-800',
      supplies: 'bg-yellow-100 text-yellow-800',
      chemicals: 'bg-purple-100 text-purple-800',
      maintenance: 'bg-gray-100 text-gray-800',
      other: 'bg-gray-100 text-gray-800',
    }
    return colors[category.toLowerCase() as Category] ?? colors.other
  }
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{item.name}</CardTitle>
            {item.description && (
              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
            )}
          </div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* <DropdownMenuItem onClick={() => setShowRestockModal(true)}>
                  <Truck className="w-4 h-4 mr-2" />
                  Stock Movement
                </DropdownMenuItem> */}
                <DropdownMenuItem>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Item
                </DropdownMenuItem>
                <DropdownMenuItem>
                  View History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className={getCategoryColor(categoryName)}>
            {categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}
          </Badge>
          {item.sku && (
            <Badge variant="outline">
              SKU: {item.sku}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stock Information */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Stock</span>
            <div className="flex items-center space-x-2">
              {isLowStock && (
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              )}
              <span className={`font-bold ${isLowStock ? 'text-orange-600' : 'text-gray-900'}`}>
                {item.current_stock} {item.unit_of_measure}
              </span>
            </div>
          </div>
          
          {item.minimum_stock > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Minimum Stock</span>
              <span>{item.minimum_stock} {item.unit_of_measure}</span>
            </div>
          )}
          
          {(item.cost_per_unit || item.unit_cost) && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Unit Cost</span>
              <span>${(item.cost_per_unit || item.unit_cost).toFixed(2)}</span>
            </div>
          )}
        </div>
        
        {/* Alerts */}
        {(isLowStock || isExpiringSoon) && (
          <div className="space-y-1">
            {isLowStock && (
              <div className="flex items-center text-orange-600 text-sm">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Low stock alert
              </div>
            )}
            {isExpiringSoon && (
              <div className="flex items-center text-red-600 text-sm">
                <Calendar className="w-4 h-4 mr-1" />
                Expires {new Date(item.expiry_date).toLocaleDateString()}
              </div>
            )}
          </div>
        )}
        
        {/* Stock Adjustment */}
        {canManage && (
          <div className="pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowRestockModal(true)}
              className="w-full"
            >
              <Package className="w-4 h-4 mr-2" />
              Adjust Stock
            </Button>
          </div>
        )}
        
        {/* Expandable Details Section */}
        <div className="pt-2 border-t">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
          >
            <span>More Details</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          
          {isExpanded && (
            <div className="mt-3 space-y-2 pt-3 border-t text-sm">
              {subcategoryName && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subcategory</span>
                  <span className="font-medium text-gray-900">{subcategoryName}</span>
                </div>
              )}
              
              {item.reorder_level && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Reorder Level</span>
                  <span className="font-medium text-gray-900">{item.reorder_level} {item.unit_of_measure}</span>
                </div>
              )}
              
              {item.cost_per_unit && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Cost per Unit</span>
                  <span className="font-medium text-gray-900">KES {item.cost_per_unit.toLocaleString()}</span>
                </div>
              )}
              
              {item.total_value && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Value</span>
                  <span className="font-medium text-gray-900">KES {item.total_value.toLocaleString()}</span>
                </div>
              )}
              
              {item.is_perishable !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Perishable</span>
                  <span className={`font-medium px-2 py-1 rounded text-xs ${item.is_perishable ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                    {item.is_perishable ? 'Yes' : 'No'}
                  </span>
                </div>
              )}
              
              {item.requires_batch_tracking !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Batch Tracking</span>
                  <span className={`font-medium px-2 py-1 rounded text-xs ${item.requires_batch_tracking ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                    {item.requires_batch_tracking ? 'Required' : 'Not Required'}
                  </span>
                </div>
              )}
              
              {item.last_restocked && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Restocked</span>
                  <span className="font-medium text-gray-900">{new Date(item.last_restocked).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Additional Info */}
        <div className="text-xs text-gray-500 space-y-1">
          {item.storage_location && (
            <div>Location: {item.storage_location}</div>
          )}
          {item.supplier?.name && (
            <div>Supplier: {item.supplier.name}</div>
          )}
        </div>
      </CardContent>
      
      <RestockInventoryModal
        isOpen={showRestockModal}
        onClose={() => setShowRestockModal(false)}
        onStockUpdated={onStockUpdate}
        item={item}
      />
    </Card>
  )
}