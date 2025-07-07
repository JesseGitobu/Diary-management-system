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
  Plus,
  Minus,
  Edit,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

interface InventoryItemCardProps {
  item: any
  canManage: boolean
  onStockUpdate: (itemId: string, newStock: number) => void
}

export function InventoryItemCard({ item, canManage, onStockUpdate }: InventoryItemCardProps) {
  const [isUpdatingStock, setIsUpdatingStock] = useState(false)
  const [stockAdjustment, setStockAdjustment] = useState('')
  const [adjustmentType, setAdjustmentType] = useState<'in' | 'out'>('in')
  
  const isLowStock = item.current_stock < item.minimum_stock
  const isExpiringSoon = item.expiry_date && 
    new Date(item.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  
  const handleStockAdjustment = async () => {
    if (!stockAdjustment || isNaN(Number(stockAdjustment))) return
    
    try {
      const response = await fetch('/api/inventory/adjust-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
          type: adjustmentType,
          quantity: Number(stockAdjustment),
          notes: `Stock ${adjustmentType === 'in' ? 'added' : 'removed'} via dashboard`,
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        onStockUpdate(item.id, result.newStock)
        setStockAdjustment('')
        setIsUpdatingStock(false)
      } else {
        alert('Failed to update stock: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating stock:', error)
      alert('Failed to update stock')
    }
  }
  
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
    return colors[category as Category] ?? colors.other
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
              <DropdownMenuTrigger>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
          <Badge className={getCategoryColor(item.category)}>
            {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
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
          
          {item.unit_cost && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Unit Cost</span>
              <span>${item.unit_cost.toFixed(2)}</span>
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
            {!isUpdatingStock ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsUpdatingStock(true)}
                className="w-full"
              >
                <Package className="w-4 h-4 mr-2" />
                Adjust Stock
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Button
                    variant={adjustmentType === 'in' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAdjustmentType('in')}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={adjustmentType === 'out' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAdjustmentType('out')}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    placeholder="Quantity"
                    value={stockAdjustment}
                    onChange={(e) => setStockAdjustment(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsUpdatingStock(false)
                      setStockAdjustment('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleStockAdjustment}
                    disabled={!stockAdjustment}
                  >
                    Update
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        
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
    </Card>
  )
}