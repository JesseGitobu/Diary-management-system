'use client'

// ─────────────────────────────────────────────────────────────────────────────
// CHANGES vs previous version
//   1. `categories` prop added — fetched from inventory_categories in the DB.
//      Falls back to a minimal hardcoded list when not supplied so existing
//      call-sites without the prop don't break.
//   2. The "Inventory" tab's category sub-tabs now render from `categories`
//      instead of a hardcoded array.  Each tab uses category.code as the
//      filter key (matches the `category_code` field in v_inventory_items).
//   3. InventoryItemCard receives all v_inventory_items fields via the `item`
//      prop — no mapping needed here since the view already flattens them.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import {
  Package, Plus, AlertTriangle, TrendingDown, TrendingUp, Calendar,
  DollarSign, Filter, ChevronRight, Grid3X3, List, Building2,
  Archive, Boxes, ShoppingCart, History, Trash2, Activity,
  BarChart2, Syringe, Star, Clock, AlertCircle, CheckCircle2,
  Truck, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft,
  Eye, Info, Thermometer, Droplets, FlaskConical, RefreshCw,
  ChevronDown, ChevronUp
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { InventoryItemCard } from '@/components/inventory/InventoryItemCard'
import { AddInventoryModal } from '@/components/inventory/AddInventoryModal'
import { InventoryFilters } from '@/components/inventory/InventoryFilters'
import { AddSupplierModal } from '@/components/inventory/AddSupplierModal'
import { EditSupplierModal } from '@/components/inventory/EditSupplierModal'
import { SupplierCard } from '@/components/inventory/SupplierCard'
import { InventoryStatsCards } from '@/components/inventory/InventoryStatsCards'
import { SupplierStatsCards } from '@/components/inventory/SupplierStatsCards'
import { AddStorageModal } from '@/components/inventory/AddStorageModal'
import { EditStorageModal } from '@/components/inventory/EditStorageModal'
import { StorageCard } from '@/components/inventory/StorageCard'
import { CreatePurchaseOrderModal } from '@/components/inventory/Createpurchaseordermodal'

// ===================== HELPERS =====================

const kes = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

function movementBadge(type: string) {
  const map: Record<string, { label: string; color: string; icon: any }> = {
    purchase:   { label: 'Purchase',   color: 'bg-green-100 text-green-800',  icon: ArrowUpCircle },
    usage:      { label: 'Usage',      color: 'bg-blue-100 text-blue-800',    icon: ArrowDownCircle },
    adjustment: { label: 'Adjustment', color: 'bg-yellow-100 text-yellow-800', icon: RefreshCw },
    transfer:   { label: 'Transfer',   color: 'bg-purple-100 text-purple-800', icon: ArrowRightLeft },
    loss:       { label: 'Loss/Waste', color: 'bg-red-100 text-red-800',      icon: Trash2 },
  }
  return map[type] || map.adjustment
}

function expiryBadge(days: number) {
  if (days <= 14) return { label: `${days}d — CRITICAL`, color: 'bg-red-100 text-red-800' }
  if (days <= 30) return { label: `${days}d — Expiring`, color: 'bg-orange-100 text-orange-800' }
  if (days <= 90) return { label: `${days}d — Soon`,     color: 'bg-yellow-100 text-yellow-700' }
  return              { label: `${days}d — OK`,          color: 'bg-green-100 text-green-800' }
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    delivered:    'bg-green-100 text-green-800',
    pending:      'bg-yellow-100 text-yellow-800',
    'in-transit': 'bg-blue-100 text-blue-800',
    cancelled:    'bg-red-100 text-red-800',
  }
  return map[status] || 'bg-gray-100 text-gray-700'
}

function usageBadge(type: string) {
  const map: Record<string, string> = {
    breeding:  'bg-violet-100 text-violet-800',
    treatment: 'bg-red-100 text-red-800',
    feeding:   'bg-green-100 text-green-800',
    routine:   'bg-blue-100 text-blue-800',
  }
  return map[type] || 'bg-gray-100 text-gray-700'
}

// ===================== TYPES =====================

export interface InventoryCategory {
  id: string
  code: string
  name: string
  display_name: string
  emoji?: string
  color_bg?: string
  color_text?: string
  sort_order: number
}

export interface InventoryItem {
  id: string
  name: string
  // v_inventory_items flat fields
  category_code: string
  category_name: string
  category_emoji?: string
  subcategory_code?: string
  subcategory_name?: string
  unit_of_measure: string
  unit_label?: string
  current_stock: number
  minimum_stock: number
  reorder_level?: number
  reorder_quantity?: number
  cost_per_unit?: number
  total_value?: number
  preferred_supplier?: string
  storage_location?: string
  storage_type?: string
  department_name?: string
  is_perishable?: boolean
  requires_batch_tracking?: boolean
  shelf_life_days?: number
  expiry_date?: string | null
  last_restocked_at?: string
  is_low_stock?: boolean
  is_out_of_stock?: boolean
  needs_reorder?: boolean
  sku?: string
  description?: string
  notes?: string
  created_at?: string
  
}

export interface Supplier {
  id: string
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  product_categories?: string[]
  reliability_score?: number
  payment_terms?: string
  last_delivery?: string
  total_purchases_ytd?: number
  status?: string
}

export interface StorageLocation {
  id: string
  name: string
  type: string
  capacity_kg?: number
  current_usage_kg?: number
  building?: string
  temperature?: string
  humidity_control?: boolean
  status?: string
  items_stored?: number
}

export interface StockMovement {
  id: string
  item_name: string
  movement_type: string
  quantity: number
  unit: string
  source?: string
  destination?: string
  reference_id?: string
  performed_by?: string
  timestamp: string
  notes?: string
}

export interface PurchaseOrder {
  id: string
  po_number: string
  supplier: string
  order_date: string
  expected_delivery?: string
  actual_delivery?: string | null
  status: string
  total_amount: number
  items: { name: string; qty: number; unit: string; unit_price: number; total: number }[]
}

export interface Batch {
  id: string
  item_name: string
  batch_number: string
  expiry_date: string
  quantity: number
  unit: string
  supplier?: string
  location?: string
  days_to_expiry: number
}

export interface UsageRecord {
  id: string
  item_name: string
  quantity_used: number
  unit: string
  usage_type: string
  animal_group?: string
  related_record?: string
  date: string
  performed_by?: string
  cost?: number
}

export interface InventoryAlert {
  id: string
  alert_type: string
  severity: string
  item_name: string
  message: string
  triggered_at: string
  action?: string
}

export interface WasteRecord {
  id: string
  item_name: string
  quantity_lost: number
  unit: string
  reason: string
  location?: string
  estimated_loss?: number
  date: string
  recorded_by?: string
  notes?: string
}

export interface AnalyticsData {
  categoryValue?: { category: string; value: number }[]
  monthlyProcurement?: { month: string; amount: number }[]
  usageByType?: { name: string; value: number; color: string }[]
  turnover?: { item: string; rate: number }[]
  totalInventoryValue?: number
  monthProcurementTotal?: number
  monthConsumptionTotal?: number
  monthWasteTotal?: number
}

export interface MovementStats {
  purchasesThisMonth?: number
  usageEvents?: number
  adjustments?: number
  totalMovements?: number
}

export interface ProcurementStats {
  pendingOrders?: number
  inTransit?: number
  deliveredThisMonth?: number
  monthSpend?: number
}

export interface UsageStats {
  totalCostThisMonth?: number
  feedingEvents?: number
  treatmentEvents?: number
  breedingEvents?: number
  usageByType?: { type: string; cost: number; pct: number; bar: string }[]
}

export interface AlertStats {
  criticalCount?: number
  warningCount?: number
  wasteEvents?: number
  totalWasteCost?: number
}

// ===================== FALLBACK CATEGORIES =====================
// Used when the `categories` prop is not supplied by the parent.

const FALLBACK_CATEGORIES: InventoryCategory[] = [
  { id: 'all', code: 'all', name: 'All Items',    display_name: 'All Items',    sort_order: 0 },
  { id: 'f1',  code: 'feed',         name: 'Feed',         display_name: 'Feed',         sort_order: 1 },
  { id: 'f2',  code: 'medical',      name: 'Medical',      display_name: 'Medical',      sort_order: 2 },
  { id: 'f3',  code: 'equipment',    name: 'Equipment',    display_name: 'Equipment',    sort_order: 3 },
  { id: 'f4',  code: 'supplies',     name: 'Supplies',     display_name: 'Supplies',     sort_order: 4 },
  { id: 'f5',  code: 'chemicals',    name: 'Chemicals',    display_name: 'Chemicals',    sort_order: 5 },
  { id: 'f6',  code: 'maintenance',  name: 'Maintenance',  display_name: 'Maintenance',  sort_order: 6 },
  { id: 'f7',  code: 'other',        name: 'Other',        display_name: 'Other',        sort_order: 99 },
]

// ===================== PROPS =====================

interface UnifiedInventoryDashboardProps {
  farmId: string
  // Core data
  inventoryItems: InventoryItem[]
  inventoryStats: {
    totalItems?: number
    totalValue?: number
    lowStockItems?: number
    expiringItems?: number
  }
  inventoryAlerts: InventoryAlert[]
  suppliers: Supplier[]
  supplierStats: {
    totalSuppliers?: number
    supplierTypes?: Record<string, number>
  }
  storage?: StorageLocation[]
  storageStats?: { totalStorageLocations?: number; storageByType?: Record<string, number> }
  // ── NEW: DB-driven category list ──────────────────────────────────────────
  // Parent should pass the result of getInventoryCategories() here.
  // If omitted, the component falls back to FALLBACK_CATEGORIES.
  categories?: InventoryCategory[]
  // Extended data
  movements?: StockMovement[]
  movementStats?: MovementStats
  batches?: Batch[]
  usageRecords?: UsageRecord[]
  usageStats?: UsageStats
  alerts?: InventoryAlert[]
  wasteRecords?: WasteRecord[]
  alertStats?: AlertStats
  analytics?: AnalyticsData
  procurementStats?: ProcurementStats
  canManage: boolean
}

// ===================== COMPONENT =====================

export function UnifiedInventoryDashboard({
  farmId,
  inventoryItems: initialItems,
  inventoryStats,
  inventoryAlerts,
  suppliers: initialSuppliers,
  supplierStats,
  storage: initialStorage = [],
  storageStats = { totalStorageLocations: 0, storageByType: {} },
  categories: categoriesProp,
  movements = [],
  movementStats = {},
  batches = [],
  usageRecords = [],
  usageStats = {},
  alerts = [],
  wasteRecords = [],
  alertStats = {},
  analytics = {},
  procurementStats = {},
  canManage,
}: UnifiedInventoryDashboardProps) {
  const [inventoryItems, setInventoryItems]     = useState<InventoryItem[]>(initialItems)
  const [suppliers, setSuppliers]               = useState<Supplier[]>(initialSuppliers)
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>(initialStorage)
  const [purchaseOrders, setPurchaseOrders]     = useState<PurchaseOrder[]>([])
  const [loadingPOs, setLoadingPOs]             = useState(true)
  const [showAddPOModal, setShowAddPOModal]     = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false)
  const [showAddStorageModal, setShowAddStorageModal]   = useState(false)
  const [editingSupplier, setEditingSupplier]   = useState<Supplier | null>(null)
  const [editingStorage, setEditingStorage]     = useState<StorageLocation | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAlerts, setShowAlerts]             = useState(false)
  const [viewMode, setViewMode]                 = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters]           = useState(false)
  const [activeTab, setActiveTab]               = useState('inventory')
  const [expandedPO, setExpandedPO]             = useState<string | null>(null)
  const [movementFilter, setMovementFilter]     = useState('all')
  const { isMobile, isTablet, isSmallMobile, isDesktop } = useDeviceInfo()

  // Keep local state in sync when parent re-renders with fresh data
  useEffect(() => { setInventoryItems(initialItems) },    [initialItems])
  useEffect(() => { setSuppliers(initialSuppliers) },     [initialSuppliers])
  useEffect(() => { setStorageLocations(initialStorage) }, [initialStorage])

  // ── Build the category tab list from DB-supplied categories ──────────────
  // Always prepend an "All Items" tab.
  const rawCategories = categoriesProp ?? FALLBACK_CATEGORIES.filter(c => c.code !== 'all')
  const categoryTabs: InventoryCategory[] = [
    { id: 'all', code: 'all', name: 'All Items', display_name: 'All Items', sort_order: -1 },
    ...rawCategories,
  ]

  // Short labels for mobile (truncate at 6 chars)
  const shortLabel = (cat: InventoryCategory) => {
    const name = cat.display_name || cat.name
    if (cat.code === 'all') return 'All'
    return name.length > 6 ? name.slice(0, 6) + '…' : name
  }

  // ── Filter items by selected category code ────────────────────────────────
  // v_inventory_items uses `category_code` from the view
  const filteredItems = selectedCategory === 'all'
    ? inventoryItems
    : inventoryItems.filter(i => i.category_code === selectedCategory)

  // ── Derived counts ────────────────────────────────────────────────────────
  const lowStockItems  = inventoryItems.filter(i => i.is_low_stock  ?? (i.current_stock < i.minimum_stock))
  const expiringItems  = inventoryItems.filter(i => {
    if (!i.expiry_date) return false
    return new Date(i.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  })

  const displayStats = {
    totalItems:    inventoryStats?.totalItems    ?? inventoryItems.length,
    totalValue:    inventoryStats?.totalValue    ?? inventoryItems.reduce((s, i) => s + (i.total_value ?? 0), 0),
    lowStockItems: inventoryStats?.lowStockItems ?? lowStockItems.length,
    expiringItems: inventoryStats?.expiringItems ?? expiringItems.length,
  }

  const displaySupplierStats = {
    totalSuppliers: supplierStats?.totalSuppliers ?? suppliers.length,
    supplierTypes:  supplierStats?.supplierTypes  ?? {},
  }

  const filteredMovements = movementFilter === 'all'
    ? movements
    : movements.filter(m => m.movement_type === movementFilter)

  // ── Handlers ──
  const handleItemAdded       = (item: InventoryItem) => { setInventoryItems(p => [item, ...p]); setShowAddItemModal(false) }
  const handleSupplierAdded   = (s: Supplier)         => { setSuppliers(p => [s, ...p]);         setShowAddSupplierModal(false) }
  const handleSupplierUpdated = (s: Supplier)         => { setSuppliers(p => p.map(x => x.id === s.id ? s : x)); setEditingSupplier(null) }
  const handleSupplierDeleted = (id: string)          => setSuppliers(p => p.filter(s => s.id !== id))
  const handleStorageAdded    = (s: StorageLocation)  => { setStorageLocations(p => [s, ...p]);  setShowAddStorageModal(false) }
  const handleStorageUpdated  = (s: StorageLocation)  => { setStorageLocations(p => p.map(x => x.id === s.id ? s : x)); setEditingStorage(null) }
  const handleStorageDeleted  = (id: string)          => setStorageLocations(p => p.filter(s => s.id !== id))
  const handleStockUpdate     = (id: string, n: number) =>
    setInventoryItems(p => p.map(i => i.id === id ? { ...i, current_stock: n } : i))

  // ── Fetch purchase orders ──
  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        setLoadingPOs(true)
        const response = await fetch('/api/inventory/purchase-orders')
        if (!response.ok) throw new Error('Failed to fetch POs')
        const data = await response.json()
        setPurchaseOrders(data.data || data.purchaseOrders || [])
      } catch (error) {
        console.error('Error fetching purchase orders:', error)
        setPurchaseOrders([])
      } finally {
        setLoadingPOs(false)
      }
    }
    fetchPurchaseOrders()
  }, [])

  const handlePOCreated = (newPO: PurchaseOrder) => {
    setPurchaseOrders(p => [newPO, ...p])
    setShowAddPOModal(false)
  }

  // ── Stats card arrays ──
  const overviewStats = [
    { title: 'Total Items',   value: displayStats.totalItems,      description: 'Active inventory items',  icon: Package,     color: 'text-blue-600',   bgColor: 'bg-blue-50' },
    { title: 'Low Stock',     value: displayStats.lowStockItems,   description: 'Items below minimum',     icon: TrendingDown, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { title: 'Expiring Soon', value: displayStats.expiringItems,   description: 'Within 30 days',          icon: Calendar,    color: 'text-red-600',    bgColor: 'bg-red-50' },
    { title: 'Total Value',   value: kes(displayStats.totalValue), description: 'Current inventory value', icon: DollarSign,  color: 'text-green-600',  bgColor: 'bg-green-50' },
  ]

  const supplierStatsCards = [
    { title: 'Total Suppliers',   value: displaySupplierStats.totalSuppliers,              description: 'Active vendor relationships', icon: Building2, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { title: 'Feed Suppliers',    value: displaySupplierStats.supplierTypes?.feed    ?? 0, description: 'Feed vendors',               icon: Package,   color: 'text-green-600',  bgColor: 'bg-green-50' },
    { title: 'Medical Suppliers', value: displaySupplierStats.supplierTypes?.medical ?? 0, description: 'Medical vendors',            icon: Syringe,   color: 'text-red-600',    bgColor: 'bg-red-50' },
    { title: 'Semen / Genetics',  value: displaySupplierStats.supplierTypes?.semen   ?? 0, description: 'Genetics vendors',           icon: Droplets,  color: 'text-violet-600', bgColor: 'bg-violet-50' },
  ]

  const storageStatsCards = [
    { title: 'Storage Locations', value: storageLocations.length,                                                                          description: 'Active storage areas',      icon: Archive,      color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    { title: 'Feed Stores',       value: storageLocations.filter(s => s.type === 'feedstore').length,                                      description: 'Feed storage areas',        icon: Boxes,        color: 'text-amber-600',  bgColor: 'bg-amber-50' },
    { title: 'Cold / Cryo Units', value: storageLocations.filter(s => ['cold-storage', 'cryogenic'].includes(s.type)).length,              description: 'Temp-controlled storage',   icon: Thermometer,  color: 'text-blue-600',   bgColor: 'bg-blue-50' },
    { title: 'Expiry Alerts',     value: batches.filter(b => b.days_to_expiry <= 30).length,                                              description: 'Batches expiring < 30 days', icon: AlertTriangle, color: 'text-red-600',   bgColor: 'bg-red-50' },
  ]

  const criticalAlerts = alerts.filter(a => a.severity === 'critical')
  const warningAlerts  = alerts.filter(a => a.severity === 'warning')
  const totalWasteCost = wasteRecords.reduce((s, w) => s + (w.estimated_loss ?? 0), 0)

  return (
    <div className="space-y-4 lg:space-y-8 pb-20 lg:pb-8">
      {/* ── Header ── */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="px-4 lg:px-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">Track supplies, manage procurement and monitor stock levels</p>
        </div>
        <div className="flex items-center justify-between px-4 lg:px-0 lg:space-x-2">
          <div className="flex items-center space-x-2 lg:hidden">
            <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
            </Button>
            {activeTab === 'inventory' && (
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4" />
              </Button>
            )}
          </div>
          {canManage && (
            <div className="flex items-center space-x-2">
              {activeTab === 'inventory'   && <Button onClick={() => setShowAddItemModal(true)}     size={isMobile ? 'sm' : 'default'}><Plus className="mr-1 lg:mr-2 h-4 w-4" />{isMobile ? 'Item'          : 'Add Inventory Item'}</Button>}
              {activeTab === 'suppliers'   && <Button onClick={() => setShowAddSupplierModal(true)} size={isMobile ? 'sm' : 'default'}><Plus className="mr-1 lg:mr-2 h-4 w-4" />{isMobile ? 'Supplier'      : 'Add Supplier'}</Button>}
              {activeTab === 'storage'     && <Button onClick={() => setShowAddStorageModal(true)}  size={isMobile ? 'sm' : 'default'}><Plus className="mr-1 lg:mr-2 h-4 w-4" />{isMobile ? 'Storage'       : 'Add Storage'}</Button>}
              {activeTab === 'procurement' && (
                <Button onClick={() => setShowAddPOModal(true)} size={isMobile ? 'sm' : 'default'}>
                  <Plus className="mr-1 lg:mr-2 h-4 w-4" />
                  {isMobile ? 'Purchase Order' : 'Create Purchase Order'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Tabs ── */}
      <div className="px-4 lg:px-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex w-max min-w-full gap-1 h-auto p-1">
              <TabsTrigger value="inventory"   className="flex-shrink-0 text-xs px-3 py-2"><Package       className="h-3.5 w-3.5 mr-1.5" />Inventory</TabsTrigger>
              <TabsTrigger value="movements"   className="flex-shrink-0 text-xs px-3 py-2"><History       className="h-3.5 w-3.5 mr-1.5" />Movements</TabsTrigger>
              <TabsTrigger value="procurement" className="flex-shrink-0 text-xs px-3 py-2"><ShoppingCart  className="h-3.5 w-3.5 mr-1.5" />Procurement</TabsTrigger>
              <TabsTrigger value="suppliers"   className="flex-shrink-0 text-xs px-3 py-2"><Building2    className="h-3.5 w-3.5 mr-1.5" />Suppliers</TabsTrigger>
              <TabsTrigger value="storage"     className="flex-shrink-0 text-xs px-3 py-2"><Archive       className="h-3.5 w-3.5 mr-1.5" />Storage</TabsTrigger>
              <TabsTrigger value="batches"     className="flex-shrink-0 text-xs px-3 py-2"><Calendar     className="h-3.5 w-3.5 mr-1.5" />Batches &amp; Expiry</TabsTrigger>
              <TabsTrigger value="usage"       className="flex-shrink-0 text-xs px-3 py-2"><Activity     className="h-3.5 w-3.5 mr-1.5" />Usage</TabsTrigger>
              <TabsTrigger value="alerts"      className="flex-shrink-0 text-xs px-3 py-2"><AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Alerts &amp; Waste</TabsTrigger>
              <TabsTrigger value="analytics"   className="flex-shrink-0 text-xs px-3 py-2"><BarChart2    className="h-3.5 w-3.5 mr-1.5" />Analytics</TabsTrigger>
            </TabsList>
          </div>

          {/* ═══════════ TAB 1 — INVENTORY ═══════════ */}
          <TabsContent value="inventory" className="mt-4 lg:mt-6 space-y-4 lg:space-y-6">
            <InventoryStatsCards
              stats={overviewStats}
              lowStockCount={lowStockItems.length}
              expiringCount={expiringItems.length}
            />

            {(lowStockItems.length > 0 || expiringItems.length > 0) && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-orange-800 text-sm">Inventory Alerts</h3>
                        <p className="text-orange-700 text-xs mt-1">
                          {lowStockItems.length} low stock · {expiringItems.length} expiring soon
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowAlerts(!showAlerts)} className="text-orange-700 p-1">
                      <ChevronRight className={`h-4 w-4 transition-transform ${showAlerts ? 'rotate-90' : ''}`} />
                    </Button>
                  </div>
                  {showAlerts && (
                    <div className="mt-3 space-y-2">
                      {lowStockItems.slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded text-sm">
                          <span className="font-medium">{item.name}</span>
                          <Badge className="bg-orange-100 text-orange-800 text-xs">
                            Low: {item.current_stock} {item.unit_label ?? item.unit_of_measure}
                          </Badge>
                        </div>
                      ))}
                      {expiringItems.slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded text-sm">
                          <span className="font-medium">{item.name}</span>
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            Expires: {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '—'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Category sub-tabs (DB-driven) ── */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <div className="overflow-x-auto pb-1">
                <TabsList className={
                  isDesktop
                    ? 'h-10 flex gap-1 justify-start flex-wrap'
                    : 'inline-flex w-max gap-0.5 h-auto p-0.5'
                }>
                  {categoryTabs.map(cat => (
                    <TabsTrigger
                      key={cat.code}
                      value={cat.code}
                      className={
                        isSmallMobile
                          ? 'text-[10px] px-1.5 py-1.5 h-8 flex-shrink-0'
                          : 'text-xs px-2.5 py-2 h-9 flex-shrink-0'
                      }
                    >
                      {cat.emoji && <span className="mr-1">{cat.emoji}</span>}
                      {isMobile ? shortLabel(cat) : (cat.display_name || cat.name)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* One TabsContent per category tab */}
              {categoryTabs.map(cat => (
                <TabsContent key={cat.code} value={cat.code} className="mt-4">
                  {filteredItems.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Package className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">
                          No {cat.display_name.toLowerCase()} items
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">
                          Add your first inventory item to get started.
                        </p>
                        {canManage && (
                          <Button className="mt-4" onClick={() => setShowAddItemModal(true)}>
                            <Plus className="mr-2 h-4 w-4" />Add Item
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6'
                        : 'space-y-3'
                    }>
                      {filteredItems.map(item => (
                        <InventoryItemCard
                          key={item.id}
                          item={item}
                          canManage={canManage}
                          onStockUpdate={handleStockUpdate}
                          viewMode={viewMode}
                          isMobile={isMobile}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          {/* ═══════════ TAB 2 — STOCK MOVEMENTS ═══════════ */}
          <TabsContent value="movements" className="mt-4 lg:mt-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Purchases (Month)', value: movementStats.purchasesThisMonth ?? movements.filter(m => m.movement_type === 'purchase').length,   sub: 'Receipts this month',   color: 'text-green-600',  bg: 'bg-green-50',  Icon: ArrowUpCircle },
                { label: 'Usage Events',      value: movementStats.usageEvents         ?? movements.filter(m => m.movement_type === 'usage').length,      sub: 'Consumption records',   color: 'text-blue-600',   bg: 'bg-blue-50',   Icon: ArrowDownCircle },
                { label: 'Adjustments',       value: movementStats.adjustments         ?? movements.filter(m => m.movement_type === 'adjustment').length,  sub: 'Stock corrections',     color: 'text-yellow-600', bg: 'bg-yellow-50', Icon: RefreshCw },
                { label: 'Total Movements',   value: movementStats.totalMovements      ?? movements.length,                                                sub: 'All movement records',  color: 'text-gray-600',   bg: 'bg-gray-50',   Icon: History },
              ].map(({ label, value, sub, color, bg, Icon }) => (
                <Card key={label}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{label}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                        <p className="text-xs text-gray-500 mt-1">{sub}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${bg}`}><Icon className={`h-6 w-6 ${color}`} /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Movement History</CardTitle>
                    <CardDescription>All stock changes — purchases, usage, transfers and adjustments</CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {['all', 'purchase', 'usage', 'adjustment'].map(t => (
                      <Button
                        key={t}
                        variant={movementFilter === t ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                        onClick={() => setMovementFilter(t)}
                      >
                        {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredMovements.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No movement records found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Item</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Source → Destination</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Reference</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">By</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">When</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredMovements.map(mv => {
                          const badge = movementBadge(mv.movement_type)
                          const isOut = mv.quantity < 0
                          return (
                            <tr key={mv.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">{mv.item_name}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                                  <badge.icon className="h-3 w-3" />{badge.label}
                                </span>
                              </td>
                              <td className={`px-4 py-3 text-right font-semibold ${isOut ? 'text-red-600' : 'text-green-600'}`}>
                                {isOut ? '' : '+'}{mv.quantity} {mv.unit}
                              </td>
                              <td className="px-4 py-3 text-gray-600 hidden md:table-cell text-xs">{mv.source} → {mv.destination}</td>
                              <td className="px-4 py-3 text-gray-500 hidden lg:table-cell text-xs font-mono">{mv.reference_id}</td>
                              <td className="px-4 py-3 text-gray-500 hidden lg:table-cell text-xs">{mv.performed_by}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{mv.timestamp?.split(' ')[0]}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════ TAB 3 — PROCUREMENT ═══════════ */}
          <TabsContent value="procurement" className="mt-4 lg:mt-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Pending Orders', value: procurementStats.pendingOrders      ?? purchaseOrders.filter(p => p.status === 'pending').length,     sub: 'Awaiting delivery',      color: 'text-yellow-600', bg: 'bg-yellow-50', Icon: Clock },
                { label: 'In Transit',     value: procurementStats.inTransit          ?? purchaseOrders.filter(p => p.status === 'in-transit').length,  sub: 'Shipments en route',     color: 'text-blue-600',   bg: 'bg-blue-50',   Icon: Truck },
                { label: 'Delivered',      value: procurementStats.deliveredThisMonth ?? purchaseOrders.filter(p => p.status === 'delivered').length,   sub: 'Received orders',        color: 'text-green-600',  bg: 'bg-green-50',  Icon: CheckCircle2 },
                { label: 'Total Spend',    value: kes(procurementStats.monthSpend     ?? purchaseOrders.reduce((s, p) => s + p.total_amount, 0)),       sub: 'Total procurement cost', color: 'text-purple-600', bg: 'bg-purple-50', Icon: DollarSign },
              ].map(({ label, value, sub, color, bg, Icon }) => (
                <Card key={label}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{label}</p>
                        <p className={`font-bold text-gray-900 mt-1 ${String(value).length > 8 ? 'text-sm' : 'text-2xl'}`}>{value}</p>
                        <p className="text-xs text-gray-500 mt-1">{sub}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${bg}`}><Icon className={`h-6 w-6 ${color}`} /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Purchase Orders</CardTitle>
                <CardDescription>Expand any order to view line items</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingPOs ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                  </div>
                ) : purchaseOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No purchase orders yet</p>
                  </div>
                ) : (
                  purchaseOrders.map(po => (
                    <div key={po.id} className="border rounded-lg overflow-hidden">
                      <button
                        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 text-left"
                        onClick={() => setExpandedPO(expandedPO === po.id ? null : po.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm">{po.po_number}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(po.status)}`}>
                              {po.status === 'in-transit' ? 'In Transit' : po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{po.supplier} · Ordered {po.order_date}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-gray-900 text-sm">{kes(po.total_amount)}</p>
                          <p className="text-xs text-gray-500">
                            {po.actual_delivery ? `Delivered ${po.actual_delivery}` : `Expected ${po.expected_delivery}`}
                          </p>
                        </div>
                        {expandedPO === po.id
                          ? <ChevronUp   className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                      </button>
                      {expandedPO === po.id && (
                        <div className="border-t bg-gray-50 p-4">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-gray-500 uppercase tracking-wide">
                                <th className="text-left pb-2">Item</th>
                                <th className="text-right pb-2">Qty</th>
                                <th className="text-right pb-2">Unit Price</th>
                                <th className="text-right pb-2">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {po.items.map((item, i) => (
                                <tr key={i}>
                                  <td className="py-2 text-gray-700">{item.name}</td>
                                  <td className="py-2 text-right text-gray-600">{item.qty} {item.unit}</td>
                                  <td className="py-2 text-right text-gray-600">{kes(item.unit_price)}</td>
                                  <td className="py-2 text-right font-medium text-gray-900">{kes(item.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-gray-200">
                                <td colSpan={3} className="pt-2 text-right font-semibold text-gray-700">Total</td>
                                <td className="pt-2 text-right font-bold text-gray-900">{kes(po.total_amount)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════ TAB 4 — SUPPLIERS ═══════════ */}
          <TabsContent value="suppliers" className="mt-4 lg:mt-6 space-y-4 lg:space-y-6">
            <SupplierStatsCards
              stats={supplierStatsCards}
              totalSuppliers={displaySupplierStats.totalSuppliers}
              supplierTypes={displaySupplierStats.supplierTypes}
            />
            <Card>
              <CardHeader>
                <CardTitle>Supplier Directory</CardTitle>
                <CardDescription>All vendor and supplier relationships</CardDescription>
              </CardHeader>
              <CardContent>
                {suppliers.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No suppliers yet</h3>
                    {canManage && (
                      <Button className="mt-4" onClick={() => setShowAddSupplierModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />Add Supplier
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {suppliers.map(s => (
                      <SupplierCard
                        key={s.id}
                        supplier={s}
                        canManage={canManage}
                        onEdit={setEditingSupplier}
                        onDelete={handleSupplierDeleted}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {suppliers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Supplier Performance (YTD)</CardTitle>
                  <CardDescription>Purchases and reliability scores for the current year</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Category</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">YTD Purchases</th>
                          <th className="text-center px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Score</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Terms</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {suppliers.map(s => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                            <td className="px-4 py-3 text-gray-600 hidden md:table-cell capitalize text-xs">
                              {(s.product_categories ?? []).join(', ')}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                              {s.total_purchases_ytd != null ? kes(s.total_purchases_ytd) : '—'}
                            </td>
                            <td className="px-4 py-3 text-center hidden sm:table-cell">
                              {s.reliability_score != null ? (
                                <span className="flex items-center justify-center gap-1">
                                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                                  <span className="font-medium">{s.reliability_score}</span>
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-500 hidden lg:table-cell text-xs">{s.payment_terms ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════════ TAB 5 — STORAGE ═══════════ */}
          <TabsContent value="storage" className="mt-4 lg:mt-6 space-y-4 lg:space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {storageStatsCards.map((stat, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                        <p className="text-xs text-gray-500 mt-2">{stat.description}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${stat.bgColor}`}><stat.icon className={`h-6 w-6 ${stat.color}`} /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Storage Locations</CardTitle>
                <CardDescription>Define and manage your storage facilities and areas</CardDescription>
              </CardHeader>
              <CardContent>
                {storageLocations.length === 0 ? (
                  <div className="text-center py-12">
                    <Archive className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No storage locations</h3>
                    {canManage && (
                      <Button className="mt-4" onClick={() => setShowAddStorageModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />Add Storage Location
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {storageLocations.map(loc => (
                      <StorageCard
                        key={loc.id}
                        storage={loc}
                        canManage={canManage}
                        onEdit={setEditingStorage}
                        onDelete={handleStorageDeleted}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {storageLocations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Capacity Utilisation</CardTitle>
                  <CardDescription>Stock level vs capacity per storage area</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {storageLocations.map(loc => {
                    const cap  = loc.capacity_kg ?? 0
                    const used = loc.current_usage_kg ?? 0
                    const pct  = cap > 0 ? Math.round((used / cap) * 100) : 0
                    const bar  = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'
                    return (
                      <div key={loc.id}>
                        <div className="flex justify-between items-center mb-1">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{loc.name}</span>
                            <span className="ml-2 text-xs text-gray-500 capitalize">
                              {loc.type}{loc.temperature ? ` · ${loc.temperature}` : ''}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-700">{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {used.toLocaleString()} / {cap.toLocaleString()} kg
                          {loc.items_stored != null ? ` · ${loc.items_stored} items stored` : ''}
                        </p>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════════ TAB 6 — BATCHES & EXPIRY ═══════════ */}
          <TabsContent value="batches" className="mt-4 lg:mt-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Batches',     value: batches.length,                                     sub: 'Active tracked batches', color: 'text-blue-600',   bg: 'bg-blue-50',   Icon: Archive },
                { label: 'Critical (<14d)',   value: batches.filter(b => b.days_to_expiry <= 14).length,  sub: 'Expire imminently',      color: 'text-red-600',    bg: 'bg-red-50',    Icon: AlertCircle },
                { label: 'Expiring ≤30 days', value: batches.filter(b => b.days_to_expiry <= 30).length,  sub: 'Require attention',      color: 'text-orange-600', bg: 'bg-orange-50', Icon: AlertTriangle },
                { label: 'Safe (>90 days)',   value: batches.filter(b => b.days_to_expiry > 90).length,   sub: 'No action needed',       color: 'text-green-600',  bg: 'bg-green-50',  Icon: CheckCircle2 },
              ].map(({ label, value, sub, color, bg, Icon }) => (
                <Card key={label}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{label}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                        <p className="text-xs text-gray-500 mt-1">{sub}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${bg}`}><Icon className={`h-6 w-6 ${color}`} /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Batch Register</CardTitle>
                <CardDescription>Track batches for medicines, vaccines, semen and perishable feed</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {batches.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Archive className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No batch records found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Item</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Batch #</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Location</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Expiry</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {batches.map(bat => {
                          const eb = expiryBadge(bat.days_to_expiry)
                          return (
                            <tr key={bat.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">{bat.item_name}</td>
                              <td className="px-4 py-3 text-gray-600 font-mono text-xs">{bat.batch_number}</td>
                              <td className="px-4 py-3 text-right text-gray-700">{bat.quantity} {bat.unit}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{bat.location ?? '—'}</td>
                              <td className="px-4 py-3 text-gray-600 text-xs">{bat.expiry_date}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${eb.color}`}>{eb.label}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════ TAB 7 — USAGE TRACKING ═══════════ */}
          <TabsContent value="usage" className="mt-4 lg:mt-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Usage Cost', value: kes(usageStats.totalCostThisMonth ?? usageRecords.reduce((s, u) => s + (u.cost ?? 0), 0)), sub: 'Consumption cost',   color: 'text-purple-600', bg: 'bg-purple-50', Icon: DollarSign },
                { label: 'Feeding Events',   value: usageStats.feedingEvents   ?? usageRecords.filter(u => u.usage_type === 'feeding').length,   sub: 'Feed usage records', color: 'text-green-600',  bg: 'bg-green-50',  Icon: Boxes },
                { label: 'Treatment Events', value: usageStats.treatmentEvents ?? usageRecords.filter(u => u.usage_type === 'treatment').length, sub: 'Medicine usage',     color: 'text-red-600',    bg: 'bg-red-50',    Icon: Syringe },
                { label: 'Breeding Events',  value: usageStats.breedingEvents  ?? usageRecords.filter(u => u.usage_type === 'breeding').length,  sub: 'AI / semen usage',   color: 'text-violet-600', bg: 'bg-violet-50', Icon: Droplets },
              ].map(({ label, value, sub, color, bg, Icon }) => (
                <Card key={label}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{label}</p>
                        <p className={`font-bold text-gray-900 mt-1 ${String(value).length > 8 ? 'text-sm' : 'text-2xl'}`}>{value}</p>
                        <p className="text-xs text-gray-500 mt-1">{sub}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${bg}`}><Icon className={`h-6 w-6 ${color}`} /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {usageStats.usageByType && usageStats.usageByType.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Usage by Type</CardTitle>
                    <CardDescription>Cost breakdown this period</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {usageStats.usageByType.map(({ type, cost, pct, bar }) => (
                      <div key={type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{type}</span>
                          <span className="text-gray-600">{kes(cost)} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Usage</CardTitle>
                  <CardDescription>Latest consumption events</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {usageRecords.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No usage records found</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {usageRecords.slice(0, 5).map(u => (
                        <div key={u.id} className="flex items-center justify-between px-4 py-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{u.item_name}</p>
                            <p className="text-xs text-gray-500">{u.animal_group} · {u.date}</p>
                          </div>
                          <div className="text-right ml-3 flex-shrink-0">
                            <p className="text-sm font-semibold text-gray-900">{u.cost != null ? kes(u.cost) : '—'}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${usageBadge(u.usage_type)}`}>{u.usage_type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {usageRecords.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Full Usage Log</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Item</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Qty</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Animal / Group</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Record</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Cost</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {usageRecords.map(u => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{u.item_name}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{u.quantity_used} {u.unit}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${usageBadge(u.usage_type)}`}>{u.usage_type}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{u.animal_group ?? '—'}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell font-mono">{u.related_record ?? '—'}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">{u.cost != null ? kes(u.cost) : '—'}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{u.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════════ TAB 8 — ALERTS & WASTE ═══════════ */}
          <TabsContent value="alerts" className="mt-4 lg:mt-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Critical Alerts',  value: alertStats.criticalCount  ?? criticalAlerts.length,   sub: 'Require immediate action', color: 'text-red-600',    bg: 'bg-red-50',    Icon: AlertCircle },
                { label: 'Warnings',         value: alertStats.warningCount   ?? warningAlerts.length,    sub: 'Monitor closely',          color: 'text-orange-600', bg: 'bg-orange-50', Icon: AlertTriangle },
                { label: 'Waste Events',     value: alertStats.wasteEvents    ?? wasteRecords.length,     sub: 'Recorded losses',          color: 'text-gray-600',   bg: 'bg-gray-50',   Icon: Trash2 },
                { label: 'Total Waste Cost', value: kes(alertStats.totalWasteCost ?? totalWasteCost),     sub: 'Estimated loss value',     color: 'text-red-600',    bg: 'bg-red-50',    Icon: DollarSign },
              ].map(({ label, value, sub, color, bg, Icon }) => (
                <Card key={label}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{label}</p>
                        <p className={`font-bold text-gray-900 mt-1 ${String(value).length > 8 ? 'text-sm' : 'text-2xl'}`}>{value}</p>
                        <p className="text-xs text-gray-500 mt-1">{sub}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${bg}`}><Icon className={`h-6 w-6 ${color}`} /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Alerts</CardTitle>
                <CardDescription>Sorted by severity — critical first</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No active alerts</p>
                  </div>
                ) : (
                  [...alerts]
                    .sort((a, b) => (a.severity === 'critical' ? -1 : 1))
                    .map(alert => (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-lg border ${alert.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 mt-0.5 ${alert.severity === 'critical' ? 'text-red-600' : 'text-orange-600'}`}>
                            {alert.alert_type === 'expiry' ? <Calendar className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 text-sm">{alert.item_name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${alert.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                                {alert.severity.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-400">{alert.triggered_at}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                            {alert.action && (
                              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <Info className="h-3 w-3" />Action: {alert.action}
                              </p>
                            )}
                          </div>
                          <Button variant="outline" size="sm" className="flex-shrink-0 text-xs hidden sm:flex">
                            <Eye className="h-3 w-3 mr-1" />View
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Waste &amp; Loss Register</CardTitle>
                <CardDescription>Track all inventory losses — spoilage, spillage, theft and expiry</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {wasteRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Trash2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No waste records found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Item</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Qty Lost</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Location</th>
                          <th className="text-right px-4 py-3 font-medium text-gray-600">Loss</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Notes</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {wasteRecords.map(w => (
                          <tr key={w.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{w.item_name}</td>
                            <td className="px-4 py-3 text-right text-red-600 font-semibold">{w.quantity_lost} {w.unit}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                w.reason === 'Spoilage' ? 'bg-orange-100 text-orange-800' :
                                w.reason === 'Spillage' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>{w.reason}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{w.location ?? '—'}</td>
                            <td className="px-4 py-3 text-right font-bold text-red-700">
                              {w.estimated_loss != null ? kes(w.estimated_loss) : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">{w.notes ?? '—'}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{w.date}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 border-t">
                          <td colSpan={3} className="px-4 py-3 font-semibold text-gray-700 text-right hidden md:table-cell">Total Loss</td>
                          <td colSpan={2} className="px-4 py-3 font-semibold text-gray-700 md:hidden">Total Loss</td>
                          <td className="px-4 py-3 text-right font-bold text-red-700">{kes(totalWasteCost)}</td>
                          <td colSpan={2} className="hidden lg:table-cell" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════ TAB 9 — ANALYTICS ═══════════ */}
          <TabsContent value="analytics" className="mt-4 lg:mt-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Inventory Value', value: kes(analytics.totalInventoryValue   ?? displayStats.totalValue),               sub: 'All categories combined',   color: 'text-green-600',  bg: 'bg-green-50',  Icon: DollarSign },
                { label: 'Procurement (Period)',  value: kes(analytics.monthProcurementTotal ?? procurementStats.monthSpend ?? 0),       sub: 'Period purchase spend',     color: 'text-blue-600',   bg: 'bg-blue-50',   Icon: ShoppingCart },
                { label: 'Consumption (Period)',  value: kes(analytics.monthConsumptionTotal ?? usageStats.totalCostThisMonth ?? 0),     sub: 'Items consumed',            color: 'text-purple-600', bg: 'bg-purple-50', Icon: Activity },
                { label: 'Waste / Loss',          value: kes(analytics.monthWasteTotal       ?? totalWasteCost),                        sub: 'Preventable losses',        color: 'text-red-600',    bg: 'bg-red-50',    Icon: Trash2 },
              ].map(({ label, value, sub, color, bg, Icon }) => (
                <Card key={label}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{label}</p>
                        <p className="text-sm font-bold text-gray-900 mt-1">{value}</p>
                        <p className="text-xs text-gray-500 mt-1">{sub}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${bg}`}><Icon className={`h-6 w-6 ${color}`} /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {analytics.categoryValue && analytics.categoryValue.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Inventory Value by Category</CardTitle>
                    <CardDescription>Current stock value (KES thousands)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analytics.categoryValue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} unit="K" />
                        <Tooltip formatter={(v: any) => [`KES ${v}K`, 'Value']} />
                        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {analytics.usageByType && analytics.usageByType.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Usage Cost by Type</CardTitle>
                    <CardDescription>Consumption breakdown this period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={analytics.usageByType} cx="50%" cy="50%" outerRadius={85} dataKey="value">
                          {analytics.usageByType.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => kes(Number(v))} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {analytics.monthlyProcurement && analytics.monthlyProcurement.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Monthly Procurement Trend</CardTitle>
                  <CardDescription>Total purchasing spend over time (KES thousands)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={analytics.monthlyProcurement} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} unit="K" />
                      <Tooltip formatter={(v: any) => [`KES ${v}K`, 'Spend']} />
                      <Area type="monotone" dataKey="amount" stroke="#6366f1" fill="#e0e7ff" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {analytics.turnover && analytics.turnover.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Inventory Turnover Rate</CardTitle>
                  <CardDescription>Times stock is fully replenished per year</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Item</th>
                          <th className="text-center px-4 py-3 font-medium text-gray-600">Rate</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Insight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {analytics.turnover.map(row => {
                          const good = row.rate >= 5
                          const ok   = row.rate >= 3
                          return (
                            <tr key={row.item} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">{row.item}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-lg font-bold text-gray-900">{row.rate}×</span>
                                <span className="text-xs text-gray-500 ml-1">/ yr</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${good ? 'bg-green-100 text-green-800' : ok ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                  {good ? 'High' : ok ? 'Moderate' : 'Low'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                                {good ? 'Healthy throughput — consider bulk savings'
                                  : ok ? 'Adequate — monitor for overstock risk'
                                       : 'Low throughput — risk of expiry or dead stock'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {(!analytics.categoryValue || analytics.categoryValue.length === 0) &&
             (!analytics.usageByType   || analytics.usageByType.length === 0)   &&
             (!analytics.monthlyProcurement || analytics.monthlyProcurement.length === 0) &&
             (!analytics.turnover      || analytics.turnover.length === 0) && (
              <Card>
                <CardContent className="text-center py-16 text-gray-500">
                  <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">No analytics data available yet</p>
                  <p className="text-xs mt-1">
                    Analytics will appear once the parent page supplies chart data via the{' '}
                    <code className="bg-gray-100 px-1 rounded">analytics</code> prop.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Mobile Filters Panel ── */}
      {showFilters && activeTab === 'inventory' && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowFilters(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Filters</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>×</Button>
            </div>
            <InventoryFilters onFiltersChange={() => {}} totalItems={filteredItems.length} filteredItems={filteredItems.length} />
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showAddItemModal && (
        <AddInventoryModal
          farmId={farmId}
          isOpen={showAddItemModal}
          onClose={() => setShowAddItemModal(false)}
          onItemAdded={handleItemAdded}
        />
      )}
      {showAddPOModal && (
        <CreatePurchaseOrderModal
          farmId={farmId}
          isOpen={showAddPOModal}
          onClose={() => setShowAddPOModal(false)}
          onPOCreated={handlePOCreated}
          suppliers={suppliers}
          inventoryItems={inventoryItems}
        />
      )}
      {showAddSupplierModal && (
        <AddSupplierModal
          farmId={farmId}
          isOpen={showAddSupplierModal}
          onClose={() => setShowAddSupplierModal(false)}
          onSupplierAdded={handleSupplierAdded}
        />
      )}
      {editingSupplier && (
        <EditSupplierModal
          supplier={editingSupplier}
          isOpen={!!editingSupplier}
          onClose={() => setEditingSupplier(null)}
          onSupplierUpdated={handleSupplierUpdated}
        />
      )}
      {showAddStorageModal && (
        <AddStorageModal
          farmId={farmId}
          isOpen={showAddStorageModal}
          onClose={() => setShowAddStorageModal(false)}
          onStorageAdded={handleStorageAdded}
        />
      )}
      {editingStorage && (
        <EditStorageModal
          storage={editingStorage}
          isOpen={!!editingStorage}
          onClose={() => setEditingStorage(null)}
          onStorageUpdated={handleStorageUpdated}
        />
      )}
    </div>
  )
}