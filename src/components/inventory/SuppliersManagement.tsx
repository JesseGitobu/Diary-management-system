'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Plus, Building2, Phone, Mail } from 'lucide-react'
import { AddSupplierModal } from '@/components/inventory/AddSupplierModal'
import { SupplierCard } from '@/components/inventory/SupplierCard'

interface SuppliersManagementProps {
  farmId: string
  suppliers: any[]
  supplierStats: any
  canManage: boolean
}

export function SuppliersManagement({ 
  farmId, 
  suppliers: initialSuppliers, 
  supplierStats,
  canManage 
}: SuppliersManagementProps) {
  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const [showAddModal, setShowAddModal] = useState(false)
  
  const handleSupplierAdded = (newSupplier: any) => {
    setSuppliers(prev => [newSupplier, ...prev])
    setShowAddModal(false)
  }
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-600 mt-2">
            Manage your farm suppliers and vendor relationships
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        )}
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supplierStats.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              Active vendor relationships
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feed Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supplierStats.supplierTypes.feed || 0}</div>
            <p className="text-xs text-muted-foreground">
              Feed vendors
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medical Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supplierStats.supplierTypes.medical || 0}</div>
            <p className="text-xs text-muted-foreground">
              Medical vendors
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipment Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supplierStats.supplierTypes.equipment || 0}</div>
            <p className="text-xs text-muted-foreground">
              Equipment vendors
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Suppliers List */}
      <Card>
        <CardHeader>
          <CardTitle>All Suppliers</CardTitle>
          <CardDescription>
            Your vendor and supplier directory
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No suppliers</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first supplier.
              </p>
              {canManage && (
                <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Supplier
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  canManage={canManage}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add Supplier Modal */}
      {showAddModal && (
        <AddSupplierModal
          farmId={farmId}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSupplierAdded={handleSupplierAdded}
        />
      )}
    </div>
  )
}