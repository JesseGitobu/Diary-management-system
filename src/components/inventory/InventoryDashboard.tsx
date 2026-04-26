'use client'

import { useState } from 'react'
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

// ===================== FILLER / DEMO DATA =====================

const FILLER_INVENTORY_ITEMS = [
  // Feed
  { id: 'fi-1', name: 'Dairy Meal (High Energy)', category: 'feed', subcategory: 'Concentrates',
    unit_of_measure: 'kg', current_stock: 850, minimum_stock: 500, reorder_level: 700,
    cost_per_unit: 65, total_value: 55250, supplier: 'Unga Feeds Ltd', is_perishable: false,
    requires_batch_tracking: false, expiry_date: null, last_restocked: '2026-04-10' },
  { id: 'fi-2', name: 'Napier Grass Silage', category: 'feed', subcategory: 'Forage',
    unit_of_measure: 'kg', current_stock: 3200, minimum_stock: 2000, reorder_level: 2500,
    cost_per_unit: 8, total_value: 25600, supplier: 'Farm Fodder Co', is_perishable: true,
    requires_batch_tracking: true, expiry_date: '2026-06-15', last_restocked: '2026-04-05' },
  { id: 'fi-3', name: 'Cottonseed Cake', category: 'feed', subcategory: 'Protein Supplements',
    unit_of_measure: 'kg', current_stock: 280, minimum_stock: 300, reorder_level: 400,
    cost_per_unit: 90, total_value: 25200, supplier: 'Unga Feeds Ltd', is_perishable: false,
    requires_batch_tracking: false, expiry_date: null, last_restocked: '2026-03-28' },
  { id: 'fi-4', name: 'Mineral Lick Blocks', category: 'feed', subcategory: 'Minerals',
    unit_of_measure: 'pieces', current_stock: 24, minimum_stock: 10, reorder_level: 15,
    cost_per_unit: 350, total_value: 8400, supplier: 'Livestock Supplies Kenya', is_perishable: false,
    requires_batch_tracking: false, expiry_date: null, last_restocked: '2026-04-01' },
  { id: 'fi-5', name: 'Wheat Bran', category: 'feed', subcategory: 'Roughage',
    unit_of_measure: 'kg', current_stock: 600, minimum_stock: 400, reorder_level: 500,
    cost_per_unit: 45, total_value: 27000, supplier: 'Unga Feeds Ltd', is_perishable: false,
    requires_batch_tracking: false, expiry_date: null, last_restocked: '2026-04-08' },
  // Medical
  { id: 'fi-6', name: 'Oxytocin Injection', category: 'medical', subcategory: 'Hormones',
    unit_of_measure: 'vials', current_stock: 15, minimum_stock: 20, reorder_level: 25,
    cost_per_unit: 450, total_value: 6750, supplier: 'Vetcure Kenya', is_perishable: true,
    requires_batch_tracking: true, expiry_date: '2026-08-30', last_restocked: '2026-03-15' },
  { id: 'fi-7', name: 'Penicillin-Streptomycin', category: 'medical', subcategory: 'Antibiotics',
    unit_of_measure: 'vials', current_stock: 30, minimum_stock: 15, reorder_level: 20,
    cost_per_unit: 380, total_value: 11400, supplier: 'Vetcure Kenya', is_perishable: true,
    requires_batch_tracking: true, expiry_date: '2027-01-15', last_restocked: '2026-04-02' },
  { id: 'fi-8', name: 'Ivermectin (Dewormer)', category: 'medical', subcategory: 'Antiparasitics',
    unit_of_measure: 'liters', current_stock: 2.5, minimum_stock: 2, reorder_level: 3,
    cost_per_unit: 3200, total_value: 8000, supplier: 'Livestock Pharmacy', is_perishable: true,
    requires_batch_tracking: true, expiry_date: '2026-10-20', last_restocked: '2026-02-20' },
  { id: 'fi-9', name: 'Calcium Borogluconate', category: 'medical', subcategory: 'IV / Minerals',
    unit_of_measure: 'bottles', current_stock: 8, minimum_stock: 10, reorder_level: 15,
    cost_per_unit: 650, total_value: 5200, supplier: 'Vetcure Kenya', is_perishable: true,
    requires_batch_tracking: true, expiry_date: '2026-05-10', last_restocked: '2026-01-30' },
  // Equipment
  { id: 'fi-10', name: 'Milking Cluster Assembly', category: 'equipment', subcategory: 'Milking',
    unit_of_measure: 'pieces', current_stock: 6, minimum_stock: 4, reorder_level: 5,
    cost_per_unit: 18500, total_value: 111000, supplier: 'Agri Equipment Ltd', is_perishable: false,
    requires_batch_tracking: false, expiry_date: null, last_restocked: '2025-11-10' },
  { id: 'fi-11', name: 'Teat Cup Liners', category: 'equipment', subcategory: 'Milking',
    unit_of_measure: 'pieces', current_stock: 48, minimum_stock: 20, reorder_level: 30,
    cost_per_unit: 850, total_value: 40800, supplier: 'Agri Equipment Ltd', is_perishable: false,
    requires_batch_tracking: false, expiry_date: null, last_restocked: '2026-03-05' },
  // Supplies
  { id: 'fi-12', name: 'Teat Dip Solution', category: 'supplies', subcategory: 'Hygiene',
    unit_of_measure: 'liters', current_stock: 45, minimum_stock: 20, reorder_level: 30,
    cost_per_unit: 1200, total_value: 54000, supplier: 'FarmChem Solutions', is_perishable: false,
    requires_batch_tracking: false, expiry_date: null, last_restocked: '2026-04-12' },
  { id: 'fi-13', name: 'Bedding Straw', category: 'supplies', subcategory: 'Bedding',
    unit_of_measure: 'bales', current_stock: 85, minimum_stock: 50, reorder_level: 60,
    cost_per_unit: 280, total_value: 23800, supplier: 'Farm Fodder Co', is_perishable: false,
    requires_batch_tracking: false, expiry_date: null, last_restocked: '2026-04-14' },
  { id: 'fi-14', name: 'Milking Gloves (Box)', category: 'supplies', subcategory: 'PPE',
    unit_of_measure: 'boxes', current_stock: 12, minimum_stock: 5, reorder_level: 8,
    cost_per_unit: 480, total_value: 5760, supplier: 'FarmChem Solutions', is_perishable: false,
    requires_batch_tracking: false, expiry_date: null, last_restocked: '2026-03-20' },
  // Chemicals
  { id: 'fi-15', name: 'Lime Powder (Disinfectant)', category: 'chemicals', subcategory: 'Disinfectants',
    unit_of_measure: 'kg', current_stock: 120, minimum_stock: 80, reorder_level: 100,
    cost_per_unit: 35, total_value: 4200, supplier: 'FarmChem Solutions', is_perishable: false,
    requires_batch_tracking: false, expiry_date: null, last_restocked: '2026-04-01' },
  // Semen & Breeding
  { id: 'fi-16', name: 'Friesland Bull Semen (Straws)', category: 'semen', subcategory: 'Dairy Bulls',
    unit_of_measure: 'doses', current_stock: 35, minimum_stock: 20, reorder_level: 25,
    cost_per_unit: 2500, total_value: 87500, supplier: 'Kenya AI Services', is_perishable: true,
    requires_batch_tracking: true, expiry_date: '2028-12-31', last_restocked: '2026-04-18' },
  { id: 'fi-17', name: 'Holstein-Friesian Semen (High Milk)', category: 'semen', subcategory: 'Dairy Bulls',
    unit_of_measure: 'doses', current_stock: 20, minimum_stock: 10, reorder_level: 15,
    cost_per_unit: 3800, total_value: 76000, supplier: 'Kenya AI Services', is_perishable: true,
    requires_batch_tracking: true, expiry_date: '2029-06-30', last_restocked: '2026-04-18' },
  { id: 'fi-18', name: 'Jersey Bull Semen', category: 'semen', subcategory: 'Dairy Bulls',
    unit_of_measure: 'doses', current_stock: 8, minimum_stock: 10, reorder_level: 15,
    cost_per_unit: 2200, total_value: 17600, supplier: 'East Africa Genetics', is_perishable: true,
    requires_batch_tracking: true, expiry_date: '2028-03-31', last_restocked: '2026-02-10' },
  { id: 'fi-19', name: 'AI Insemination Kit', category: 'semen', subcategory: 'AI Supplies',
    unit_of_measure: 'kits', current_stock: 5, minimum_stock: 3, reorder_level: 4,
    cost_per_unit: 4500, total_value: 22500, supplier: 'Kenya AI Services', is_perishable: false,
    requires_batch_tracking: false, expiry_date: null, last_restocked: '2026-03-01' },
  { id: 'fi-20', name: 'Liquid Nitrogen (LN2)', category: 'semen', subcategory: 'Cryo Storage',
    unit_of_measure: 'liters', current_stock: 18, minimum_stock: 25, reorder_level: 30,
    cost_per_unit: 180, total_value: 3240, supplier: 'Industrial Gases Kenya', is_perishable: false,
    requires_batch_tracking: false, expiry_date: null, last_restocked: '2026-04-10' },
]

const FILLER_SUPPLIERS = [
  { id: 'sup-1', name: 'Unga Feeds Ltd', contact_person: 'John Mwangi', phone: '+254 712 345 678',
    email: 'feeds@ungagroup.com', address: 'Industrial Area, Nairobi', product_categories: ['feed'],
    reliability_score: 4.8, payment_terms: 'Net 30', last_delivery: '2026-04-10', total_purchases_ytd: 186000, status: 'active' },
  { id: 'sup-2', name: 'Vetcure Kenya', contact_person: 'Dr. Alice Kamau', phone: '+254 733 222 111',
    email: 'orders@vetcure.co.ke', address: 'Karen, Nairobi', product_categories: ['medical'],
    reliability_score: 4.9, payment_terms: 'Cash on Delivery', last_delivery: '2026-04-02', total_purchases_ytd: 95000, status: 'active' },
  { id: 'sup-3', name: 'Agri Equipment Ltd', contact_person: 'Peter Ochieng', phone: '+254 720 999 444',
    email: 'sales@agriequip.co.ke', address: 'Westlands, Nairobi', product_categories: ['equipment'],
    reliability_score: 4.5, payment_terms: 'Net 45', last_delivery: '2026-03-05', total_purchases_ytd: 151800, status: 'active' },
  { id: 'sup-4', name: 'Kenya AI Services', contact_person: 'Samuel Kipchoge', phone: '+254 700 111 333',
    email: 'info@kenyaai.co.ke', address: 'Nakuru, Kenya', product_categories: ['semen'],
    reliability_score: 4.7, payment_terms: 'Prepaid', last_delivery: '2026-04-18', total_purchases_ytd: 185000, status: 'active' },
  { id: 'sup-5', name: 'FarmChem Solutions', contact_person: 'Grace Wanjiru', phone: '+254 717 555 888',
    email: 'orders@farmchem.co.ke', address: 'Thika Road, Nairobi', product_categories: ['supplies', 'chemicals'],
    reliability_score: 4.3, payment_terms: 'Net 14', last_delivery: '2026-04-14', total_purchases_ytd: 67760, status: 'active' },
  { id: 'sup-6', name: 'East Africa Genetics', contact_person: 'Dr. Brian Mutua', phone: '+254 728 777 999',
    email: 'genetics@eagenetics.com', address: 'Gigiri, Nairobi', product_categories: ['semen'],
    reliability_score: 4.6, payment_terms: 'Net 30', last_delivery: '2026-02-10', total_purchases_ytd: 17600, status: 'active' },
]

const FILLER_STORAGE = [
  { id: 'stor-1', name: 'Main Feed Store', type: 'feedstore', capacity_kg: 10000, current_usage_kg: 5030,
    building: 'Storage Block A', temperature: 'Ambient', humidity_control: false, status: 'active', items_stored: 5 },
  { id: 'stor-2', name: 'Veterinary Medicine Cabinet', type: 'cold-storage', capacity_kg: 50, current_usage_kg: 12,
    building: 'Milking Parlour', temperature: '2–8°C', humidity_control: true, status: 'active', items_stored: 4 },
  { id: 'stor-3', name: 'Equipment Room', type: 'warehouse', capacity_kg: 5000, current_usage_kg: 1200,
    building: 'Workshop', temperature: 'Ambient', humidity_control: false, status: 'active', items_stored: 3 },
  { id: 'stor-4', name: 'Semen Cryogenic Tank (LN2)', type: 'cryogenic', capacity_kg: 30, current_usage_kg: 18,
    building: 'Breeding Station', temperature: '-196°C', humidity_control: false, status: 'active', items_stored: 4 },
  { id: 'stor-5', name: 'Chemical Store', type: 'hazmat', capacity_kg: 2000, current_usage_kg: 455,
    building: 'Storage Block B', temperature: 'Ambient', humidity_control: false, status: 'active', items_stored: 2 },
]

const FILLER_MOVEMENTS = [
  { id: 'mv-1', item_name: 'Dairy Meal', movement_type: 'purchase', quantity: 500, unit: 'kg',
    source: 'Unga Feeds Ltd', destination: 'Main Feed Store', reference_id: 'PO-2026-041',
    performed_by: 'James Kariuki', timestamp: '2026-04-10 09:15', notes: 'Monthly resupply' },
  { id: 'mv-2', item_name: 'Dairy Meal', movement_type: 'usage', quantity: -150, unit: 'kg',
    source: 'Main Feed Store', destination: 'Milking Herd', reference_id: 'FR-2026-0418',
    performed_by: 'Auto-system', timestamp: '2026-04-18 06:00', notes: 'Morning ration — 52 cows' },
  { id: 'mv-3', item_name: 'Friesland Semen', movement_type: 'purchase', quantity: 20, unit: 'doses',
    source: 'Kenya AI Services', destination: 'Cryogenic Tank', reference_id: 'PO-2026-042',
    performed_by: 'Samuel Kipchoge', timestamp: '2026-04-18 14:00', notes: 'Breeding season restock' },
  { id: 'mv-4', item_name: 'Oxytocin Injection', movement_type: 'usage', quantity: -3, unit: 'vials',
    source: 'Medicine Cabinet', destination: 'Treatment', reference_id: 'HR-2026-0412',
    performed_by: 'Dr. Alice Kamau', timestamp: '2026-04-12 08:30', notes: 'Used in 3 calvings' },
  { id: 'mv-5', item_name: 'Penicillin-Streptomycin', movement_type: 'purchase', quantity: 20, unit: 'vials',
    source: 'Vetcure Kenya', destination: 'Medicine Cabinet', reference_id: 'PO-2026-039',
    performed_by: 'Grace Wanjiru', timestamp: '2026-04-02 10:45', notes: '' },
  { id: 'mv-6', item_name: 'Bedding Straw', movement_type: 'usage', quantity: -15, unit: 'bales',
    source: 'Main Feed Store', destination: 'Cow Stalls', reference_id: 'DA-2026-0415',
    performed_by: 'Peter Maina', timestamp: '2026-04-15 07:00', notes: 'Weekly re-bedding' },
  { id: 'mv-7', item_name: 'Teat Dip Solution', movement_type: 'purchase', quantity: 20, unit: 'liters',
    source: 'FarmChem Solutions', destination: 'Chemical Store', reference_id: 'PO-2026-040',
    performed_by: 'Grace Wanjiru', timestamp: '2026-04-12 11:30', notes: '' },
  { id: 'mv-8', item_name: 'Holstein-Friesian Semen', movement_type: 'usage', quantity: -5, unit: 'doses',
    source: 'Cryogenic Tank', destination: 'Breeding', reference_id: 'BR-2026-0416',
    performed_by: 'Dr. Brian Mutua', timestamp: '2026-04-16 09:00', notes: '5 heifers inseminated' },
  { id: 'mv-9', item_name: 'Cottonseed Cake', movement_type: 'adjustment', quantity: -20, unit: 'kg',
    source: 'Main Feed Store', destination: 'Adjustment', reference_id: 'SC-2026-0420',
    performed_by: 'James Kariuki', timestamp: '2026-04-20 16:00', notes: 'Monthly count correction' },
  { id: 'mv-10', item_name: 'Ivermectin', movement_type: 'usage', quantity: -0.5, unit: 'liters',
    source: 'Medicine Cabinet', destination: 'Treatment', reference_id: 'HR-2026-0408',
    performed_by: 'Dr. Alice Kamau', timestamp: '2026-04-08 14:30', notes: 'Quarterly deworming — 30 animals' },
]

const FILLER_PURCHASE_ORDERS = [
  { id: 'po-1', po_number: 'PO-2026-042', supplier: 'Kenya AI Services', order_date: '2026-04-17',
    expected_delivery: '2026-04-18', actual_delivery: '2026-04-18', status: 'delivered', total_amount: 88000,
    items: [
      { name: 'Friesland Bull Semen', qty: 20, unit: 'doses', unit_price: 2500, total: 50000 },
      { name: 'Holstein-Friesian Semen', qty: 10, unit: 'doses', unit_price: 3800, total: 38000 },
    ] },
  { id: 'po-2', po_number: 'PO-2026-041', supplier: 'Unga Feeds Ltd', order_date: '2026-04-08',
    expected_delivery: '2026-04-10', actual_delivery: '2026-04-10', status: 'delivered', total_amount: 57750,
    items: [
      { name: 'Dairy Meal', qty: 500, unit: 'kg', unit_price: 65, total: 32500 },
      { name: 'Wheat Bran', qty: 250, unit: 'kg', unit_price: 45, total: 11250 },
      { name: 'Cottonseed Cake', qty: 150, unit: 'kg', unit_price: 90, total: 13500 },
    ] },
  { id: 'po-3', po_number: 'PO-2026-040', supplier: 'FarmChem Solutions', order_date: '2026-04-11',
    expected_delivery: '2026-04-12', actual_delivery: '2026-04-12', status: 'delivered', total_amount: 24000,
    items: [
      { name: 'Teat Dip Solution', qty: 20, unit: 'liters', unit_price: 1200, total: 24000 },
    ] },
  { id: 'po-4', po_number: 'PO-2026-043', supplier: 'Vetcure Kenya', order_date: '2026-04-22',
    expected_delivery: '2026-04-25', actual_delivery: null, status: 'pending', total_amount: 18750,
    items: [
      { name: 'Oxytocin Injection', qty: 10, unit: 'vials', unit_price: 450, total: 4500 },
      { name: 'Calcium Borogluconate', qty: 10, unit: 'bottles', unit_price: 650, total: 6500 },
      { name: 'Ivermectin', qty: 2, unit: 'liters', unit_price: 3200, total: 6400 },
    ] },
  { id: 'po-5', po_number: 'PO-2026-044', supplier: 'Farm Fodder Co', order_date: '2026-04-24',
    expected_delivery: '2026-04-28', actual_delivery: null, status: 'in-transit', total_amount: 56000,
    items: [
      { name: 'Napier Grass Silage', qty: 4000, unit: 'kg', unit_price: 8, total: 32000 },
      { name: 'Bedding Straw', qty: 80, unit: 'bales', unit_price: 280, total: 22400 },
    ] },
]

const FILLER_BATCHES = [
  { id: 'bat-1', item_name: 'Calcium Borogluconate', batch_number: 'CAB-2025-F1',
    expiry_date: '2026-05-10', quantity: 8, unit: 'bottles', supplier: 'Vetcure Kenya',
    location: 'Medicine Cabinet', days_to_expiry: 14 },
  { id: 'bat-2', item_name: 'Oxytocin Injection', batch_number: 'OXY-2026-A3',
    expiry_date: '2026-08-30', quantity: 12, unit: 'vials', supplier: 'Vetcure Kenya',
    location: 'Medicine Cabinet', days_to_expiry: 126 },
  { id: 'bat-3', item_name: 'Ivermectin', batch_number: 'IVM-2025-B2',
    expiry_date: '2026-10-20', quantity: 2.5, unit: 'liters', supplier: 'Livestock Pharmacy',
    location: 'Medicine Cabinet', days_to_expiry: 177 },
  { id: 'bat-4', item_name: 'Napier Grass Silage', batch_number: 'NGS-2026-APR',
    expiry_date: '2026-06-15', quantity: 3200, unit: 'kg', supplier: 'Farm Fodder Co',
    location: 'Main Feed Store', days_to_expiry: 50 },
  { id: 'bat-5', item_name: 'Penicillin-Streptomycin', batch_number: 'PEN-2026-C4',
    expiry_date: '2027-01-15', quantity: 30, unit: 'vials', supplier: 'Vetcure Kenya',
    location: 'Medicine Cabinet', days_to_expiry: 264 },
  { id: 'bat-6', item_name: 'Jersey Bull Semen', batch_number: 'JBS-2025-003',
    expiry_date: '2028-03-31', quantity: 8, unit: 'doses', supplier: 'East Africa Genetics',
    location: 'Cryogenic Tank', days_to_expiry: 705 },
  { id: 'bat-7', item_name: 'Friesland Bull Semen', batch_number: 'FRS-2026-001',
    expiry_date: '2028-12-31', quantity: 35, unit: 'doses', supplier: 'Kenya AI Services',
    location: 'Cryogenic Tank', days_to_expiry: 980 },
  { id: 'bat-8', item_name: 'Holstein-Friesian Semen', batch_number: 'HFS-2026-002',
    expiry_date: '2029-06-30', quantity: 20, unit: 'doses', supplier: 'Kenya AI Services',
    location: 'Cryogenic Tank', days_to_expiry: 1160 },
]

const FILLER_USAGE_RECORDS = [
  { id: 'use-1', item_name: 'Dairy Meal', quantity_used: 150, unit: 'kg', usage_type: 'feeding',
    animal_group: 'Lactating Herd (52 cows)', related_record: 'FR-2026-0418', date: '2026-04-18', performed_by: 'Auto-system', cost: 9750 },
  { id: 'use-2', item_name: 'Oxytocin Injection', quantity_used: 3, unit: 'vials', usage_type: 'treatment',
    animal_group: 'Cow #007, #012, #031', related_record: 'HR-2026-0412', date: '2026-04-12', performed_by: 'Dr. Alice Kamau', cost: 1350 },
  { id: 'use-3', item_name: 'Friesland Bull Semen', quantity_used: 5, unit: 'doses', usage_type: 'breeding',
    animal_group: 'Heifers #H04–#H08', related_record: 'BR-2026-0416', date: '2026-04-16', performed_by: 'Dr. Brian Mutua', cost: 12500 },
  { id: 'use-4', item_name: 'Ivermectin', quantity_used: 0.5, unit: 'liters', usage_type: 'treatment',
    animal_group: 'Dry Cows (30)', related_record: 'HR-2026-0408', date: '2026-04-08', performed_by: 'Dr. Alice Kamau', cost: 1600 },
  { id: 'use-5', item_name: 'Teat Dip Solution', quantity_used: 3, unit: 'liters', usage_type: 'routine',
    animal_group: 'Milking Herd (52)', related_record: 'MR-2026-0418', date: '2026-04-18', performed_by: 'James Kariuki', cost: 3600 },
  { id: 'use-6', item_name: 'Bedding Straw', quantity_used: 15, unit: 'bales', usage_type: 'routine',
    animal_group: 'All Cow Stalls', related_record: 'DA-2026-0415', date: '2026-04-15', performed_by: 'Peter Maina', cost: 4200 },
  { id: 'use-7', item_name: 'Holstein-Friesian Semen', quantity_used: 5, unit: 'doses', usage_type: 'breeding',
    animal_group: 'Cows #022–#026', related_record: 'BR-2026-0416', date: '2026-04-16', performed_by: 'Dr. Brian Mutua', cost: 19000 },
  { id: 'use-8', item_name: 'Penicillin-Streptomycin', quantity_used: 5, unit: 'vials', usage_type: 'treatment',
    animal_group: 'Mastitis cases (3 cows)', related_record: 'HR-2026-0420', date: '2026-04-20', performed_by: 'Dr. Alice Kamau', cost: 1900 },
]

const FILLER_ALERTS = [
  { id: 'alr-1', alert_type: 'low_stock', severity: 'critical', item_name: 'Oxytocin Injection',
    message: 'Stock (15 vials) below minimum level (20 vials)', triggered_at: '2026-04-26', action: 'Create purchase order immediately' },
  { id: 'alr-2', alert_type: 'low_stock', severity: 'critical', item_name: 'Liquid Nitrogen (LN2)',
    message: 'LN2 level (18 L) critically below minimum (25 L) — stored semen at risk', triggered_at: '2026-04-26', action: 'Order LN2 immediately from Industrial Gases Kenya' },
  { id: 'alr-3', alert_type: 'expiry', severity: 'critical', item_name: 'Calcium Borogluconate',
    message: 'Batch CAB-2025-F1 expires in 14 days (2026-05-10)', triggered_at: '2026-04-26', action: 'Use before expiry or arrange supplier return' },
  { id: 'alr-4', alert_type: 'low_stock', severity: 'warning', item_name: 'Cottonseed Cake',
    message: 'Stock (280 kg) approaching minimum (300 kg)', triggered_at: '2026-04-25', action: 'Review and reorder if needed' },
  { id: 'alr-5', alert_type: 'low_stock', severity: 'warning', item_name: 'Jersey Bull Semen',
    message: 'Only 8 doses remaining, below minimum (10)', triggered_at: '2026-04-24', action: 'Review breeding plan and reorder if required' },
  { id: 'alr-6', alert_type: 'expiry', severity: 'warning', item_name: 'Napier Grass Silage',
    message: 'Batch NGS-2026-APR expires in 50 days (2026-06-15)', triggered_at: '2026-04-20', action: 'Prioritise in daily rations to avoid wastage' },
]

const FILLER_WASTE_RECORDS = [
  { id: 'wst-1', item_name: 'Teat Dip Solution', quantity_lost: 5, unit: 'liters', reason: 'Spillage',
    location: 'Milking Parlour', estimated_loss: 6000, date: '2026-04-18', recorded_by: 'Peter Maina', notes: 'Container knocked over during milking shift' },
  { id: 'wst-2', item_name: 'Dairy Meal', quantity_lost: 45, unit: 'kg', reason: 'Spillage',
    location: 'Main Feed Store', estimated_loss: 2925, date: '2026-04-15', recorded_by: 'James Kariuki', notes: 'Bag tear during handling — floor swept' },
  { id: 'wst-3', item_name: 'Napier Grass Silage', quantity_lost: 200, unit: 'kg', reason: 'Spoilage',
    location: 'Main Feed Store', estimated_loss: 1600, date: '2026-04-10', recorded_by: 'James Kariuki', notes: 'Poor seal on silage pit section' },
  { id: 'wst-4', item_name: 'Oxytocin Injection', quantity_lost: 2, unit: 'vials', reason: 'Expired',
    location: 'Medicine Cabinet', estimated_loss: 900, date: '2026-03-31', recorded_by: 'Dr. Alice Kamau', notes: 'Previous batch missed during stock check' },
]

// Analytics chart data
const CHART_CATEGORY_VALUE = [
  { category: 'Semen', value: 207 },
  { category: 'Equipment', value: 152 },
  { category: 'Feed', value: 141 },
  { category: 'Supplies', value: 84 },
  { category: 'Medical', value: 31 },
  { category: 'Chemicals', value: 4 },
]
const CHART_MONTHLY_PROCUREMENT = [
  { month: 'Nov', amount: 152 },
  { month: 'Dec', amount: 42 },
  { month: 'Jan', amount: 85 },
  { month: 'Feb', amount: 57 },
  { month: 'Mar', amount: 90 },
  { month: 'Apr', amount: 245 },
]
const CHART_USAGE_BY_TYPE = [
  { name: 'Breeding', value: 31500, color: '#8b5cf6' },
  { name: 'Feeding',  value: 9750,  color: '#22c55e' },
  { name: 'Routine',  value: 7800,  color: '#3b82f6' },
  { name: 'Treatment',value: 4850,  color: '#ef4444' },
]
const CHART_TURNOVER = [
  { item: 'Dairy Meal',    rate: 8.5 },
  { item: 'Teat Dip',     rate: 7.2 },
  { item: 'Bedding Straw',rate: 6.8 },
  { item: 'Oxytocin',     rate: 4.2 },
  { item: 'Penicillin',   rate: 3.1 },
  { item: 'Semen (Fries)',rate: 2.4 },
]

// ===================== HELPERS =====================

const kes = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n)

function movementBadge(type: string) {
  const map: Record<string, { label: string; color: string; icon: any }> = {
    purchase:   { label: 'Purchase',   color: 'bg-green-100 text-green-800',  icon: ArrowUpCircle },
    usage:      { label: 'Usage',      color: 'bg-blue-100 text-blue-800',    icon: ArrowDownCircle },
    adjustment: { label: 'Adjustment', color: 'bg-yellow-100 text-yellow-800',icon: RefreshCw },
    transfer:   { label: 'Transfer',   color: 'bg-purple-100 text-purple-800',icon: ArrowRightLeft },
    loss:       { label: 'Loss/Waste', color: 'bg-red-100 text-red-800',      icon: Trash2 },
  }
  return map[type] || map.adjustment
}

function expiryBadge(days: number) {
  if (days <= 14) return { label: `${days}d — CRITICAL`, color: 'bg-red-100 text-red-800' }
  if (days <= 30) return { label: `${days}d — Expiring`, color: 'bg-orange-100 text-orange-800' }
  if (days <= 90) return { label: `${days}d — Soon`,     color: 'bg-yellow-100 text-yellow-700' }
  return               { label: `${days}d — OK`,       color: 'bg-green-100 text-green-800' }
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    delivered:   'bg-green-100 text-green-800',
    pending:     'bg-yellow-100 text-yellow-800',
    'in-transit':'bg-blue-100 text-blue-800',
    cancelled:   'bg-red-100 text-red-800',
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

// ===================== PROPS =====================

interface UnifiedInventoryDashboardProps {
  farmId: string
  inventoryItems: any[]
  inventoryStats: any
  inventoryAlerts: any[]
  suppliers: any[]
  supplierStats: any
  storage?: any[]
  storageStats?: any
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
  canManage,
}: UnifiedInventoryDashboardProps) {
  const [inventoryItems, setInventoryItems]   = useState(initialItems.length > 0 ? initialItems : FILLER_INVENTORY_ITEMS)
  const [suppliers, setSuppliers]             = useState(initialSuppliers.length > 0 ? initialSuppliers : FILLER_SUPPLIERS)
  const [storageLocations, setStorageLocations] = useState(initialStorage.length > 0 ? initialStorage : FILLER_STORAGE)
  const [showAddItemModal, setShowAddItemModal]       = useState(false)
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false)
  const [showAddStorageModal, setShowAddStorageModal]  = useState(false)
  const [editingSupplier, setEditingSupplier]          = useState<any | null>(null)
  const [editingStorage, setEditingStorage]            = useState<any | null>(null)
  const [selectedCategory, setSelectedCategory]        = useState<string>('all')
  const [showAlerts, setShowAlerts]                    = useState(false)
  const [viewMode, setViewMode]                        = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters]                  = useState(false)
  const [activeTab, setActiveTab]                      = useState('inventory')
  const [expandedPO, setExpandedPO]                    = useState<string | null>(null)
  const [movementFilter, setMovementFilter]            = useState('all')
  const { isMobile, isTablet, isSmallMobile, isDesktop } = useDeviceInfo()

  const categories = [
    { value: 'all',          label: 'All Items',        shortLabel: 'All' },
    { value: 'feed',         label: 'Feed',             shortLabel: 'Feed' },
    { value: 'medical',      label: 'Medical',          shortLabel: 'Med' },
    { value: 'equipment',    label: 'Equipment',        shortLabel: 'Equip' },
    { value: 'supplies',     label: 'Supplies',         shortLabel: 'Supply' },
    { value: 'chemicals',    label: 'Chemicals',        shortLabel: 'Chem' },
    { value: 'semen',        label: 'Semen & Breeding', shortLabel: 'Semen' },
    { value: 'machines',     label: 'Machines',         shortLabel: 'Mach' },
    { value: 'construction', label: 'Construction',     shortLabel: 'Build' },
    { value: 'maintenance',  label: 'Maintenance',      shortLabel: 'Maint' },
    { value: 'other',        label: 'Other',            shortLabel: 'Other' },
  ]

  const filteredItems  = selectedCategory === 'all' ? inventoryItems : inventoryItems.filter(i => i.category === selectedCategory)
  const lowStockItems  = inventoryItems.filter(i => i.current_stock < i.minimum_stock)
  const expiringItems  = inventoryItems.filter(i => {
    if (!i.expiry_date) return false
    return new Date(i.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  })
  const displayStats = inventoryStats?.totalItems > 0 ? inventoryStats : {
    totalItems: inventoryItems.length,
    totalValue: inventoryItems.reduce((s: number, i: any) => s + (i.total_value || 0), 0),
    lowStockItems: lowStockItems.length,
    expiringItems: expiringItems.length,
  }
  const displaySupplierStats = supplierStats?.totalSuppliers > 0 ? supplierStats : {
    totalSuppliers: suppliers.length,
    supplierTypes: { feed: 1, medical: 2, equipment: 1, semen: 2, supplies: 1 },
  }
  const filteredMovements = movementFilter === 'all'
    ? FILLER_MOVEMENTS
    : FILLER_MOVEMENTS.filter(m => m.movement_type === movementFilter)

  // Handlers
  const handleItemAdded       = (item: any)   => { setInventoryItems(p => [item, ...p]); setShowAddItemModal(false) }
  const handleSupplierAdded   = (s: any)      => { setSuppliers(p => [s, ...p]); setShowAddSupplierModal(false) }
  const handleSupplierUpdated = (s: any)      => { setSuppliers(p => p.map(x => x.id === s.id ? s : x)); setEditingSupplier(null) }
  const handleSupplierDeleted = (id: string)  => setSuppliers(p => p.filter(s => s.id !== id))
  const handleStorageAdded    = (s: any)      => { setStorageLocations(p => [s, ...p]); setShowAddStorageModal(false) }
  const handleStorageUpdated  = (s: any)      => { setStorageLocations(p => p.map(x => x.id === s.id ? s : x)); setEditingStorage(null) }
  const handleStorageDeleted  = (id: string)  => setStorageLocations(p => p.filter(s => s.id !== id))
  const handleStockUpdate     = (id: string, n: number) => setInventoryItems(p => p.map(i => i.id === id ? { ...i, current_stock: n } : i))

  // Stats cards data
  const overviewStats = [
    { title: 'Total Items',   value: displayStats.totalItems,      description: 'Active inventory items',   icon: Package,     color: 'text-blue-600',   bgColor: 'bg-blue-50' },
    { title: 'Low Stock',     value: displayStats.lowStockItems,   description: 'Items below minimum',      icon: TrendingDown, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { title: 'Expiring Soon', value: displayStats.expiringItems,   description: 'Within 30 days',           icon: Calendar,    color: 'text-red-600',    bgColor: 'bg-red-50' },
    { title: 'Total Value',   value: kes(displayStats.totalValue), description: 'Current inventory value',  icon: DollarSign,  color: 'text-green-600',  bgColor: 'bg-green-50' },
  ]
  const supplierStatsCards = [
    { title: 'Total Suppliers',   value: displaySupplierStats.totalSuppliers,                  description: 'Active vendor relationships', icon: Building2, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { title: 'Feed Suppliers',    value: displaySupplierStats.supplierTypes.feed || 0,          description: 'Feed vendors',                icon: Package,   color: 'text-green-600',  bgColor: 'bg-green-50' },
    { title: 'Medical Suppliers', value: displaySupplierStats.supplierTypes.medical || 0,       description: 'Medical vendors',             icon: Syringe,   color: 'text-red-600',    bgColor: 'bg-red-50' },
    { title: 'Semen / Genetics',  value: (displaySupplierStats.supplierTypes.semen || 0),      description: 'Genetics vendors',            icon: Droplets,  color: 'text-violet-600', bgColor: 'bg-violet-50' },
  ]
  const storageStatsCards = [
    { title: 'Storage Locations', value: storageLocations.length, description: 'Active storage areas',          icon: Archive,      color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    { title: 'Feed Stores',       value: storageLocations.filter((s: any) => s.type === 'feedstore').length, description: 'Feed storage areas', icon: Boxes, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { title: 'Cold / Cryo Units', value: storageLocations.filter((s: any) => ['cold-storage','cryogenic'].includes(s.type)).length, description: 'Temp-controlled storage', icon: Thermometer, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { title: 'Expiry Alerts',     value: FILLER_BATCHES.filter(b => b.days_to_expiry <= 30).length,          description: 'Batches expiring < 30 days', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50' },
  ]

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
              {activeTab === 'inventory'   && <Button onClick={() => setShowAddItemModal(true)}     size={isMobile ? 'sm' : 'default'}><Plus className="mr-1 lg:mr-2 h-4 w-4" />{isMobile ? 'Item' : 'Add Item'}</Button>}
              {activeTab === 'suppliers'   && <Button onClick={() => setShowAddSupplierModal(true)} size={isMobile ? 'sm' : 'default'}><Plus className="mr-1 lg:mr-2 h-4 w-4" />{isMobile ? 'Supplier' : 'Add Supplier'}</Button>}
              {activeTab === 'storage'     && <Button onClick={() => setShowAddStorageModal(true)}  size={isMobile ? 'sm' : 'default'}><Plus className="mr-1 lg:mr-2 h-4 w-4" />{isMobile ? 'Storage' : 'Add Storage'}</Button>}
              {activeTab === 'procurement' && <Button onClick={() => {}}                            size={isMobile ? 'sm' : 'default'}><Plus className="mr-1 lg:mr-2 h-4 w-4" />{isMobile ? 'PO' : 'Create PO'}</Button>}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Tabs ── */}
      <div className="px-4 lg:px-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex w-max min-w-full gap-1 h-auto p-1">
              <TabsTrigger value="inventory"   className="flex-shrink-0 text-xs px-3 py-2"><Package     className="h-3.5 w-3.5 mr-1.5" />Inventory</TabsTrigger>
              <TabsTrigger value="movements"   className="flex-shrink-0 text-xs px-3 py-2"><History     className="h-3.5 w-3.5 mr-1.5" />Movements</TabsTrigger>
              <TabsTrigger value="procurement" className="flex-shrink-0 text-xs px-3 py-2"><ShoppingCart className="h-3.5 w-3.5 mr-1.5" />Procurement</TabsTrigger>
              <TabsTrigger value="suppliers"   className="flex-shrink-0 text-xs px-3 py-2"><Building2   className="h-3.5 w-3.5 mr-1.5" />Suppliers</TabsTrigger>
              <TabsTrigger value="storage"     className="flex-shrink-0 text-xs px-3 py-2"><Archive     className="h-3.5 w-3.5 mr-1.5" />Storage</TabsTrigger>
              <TabsTrigger value="batches"     className="flex-shrink-0 text-xs px-3 py-2"><Calendar    className="h-3.5 w-3.5 mr-1.5" />Batches &amp; Expiry</TabsTrigger>
              <TabsTrigger value="usage"       className="flex-shrink-0 text-xs px-3 py-2"><Activity    className="h-3.5 w-3.5 mr-1.5" />Usage</TabsTrigger>
              <TabsTrigger value="alerts"      className="flex-shrink-0 text-xs px-3 py-2"><AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Alerts &amp; Waste</TabsTrigger>
              <TabsTrigger value="analytics"   className="flex-shrink-0 text-xs px-3 py-2"><BarChart2   className="h-3.5 w-3.5 mr-1.5" />Analytics</TabsTrigger>
            </TabsList>
          </div>

          {/* ═══════════ TAB 1 — INVENTORY ═══════════ */}
          <TabsContent value="inventory" className="mt-4 lg:mt-6 space-y-4 lg:space-y-6">
            <InventoryStatsCards stats={overviewStats} lowStockCount={lowStockItems.length} expiringCount={expiringItems.length} />

            {(lowStockItems.length > 0 || expiringItems.length > 0) && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-orange-800 text-sm">Inventory Alerts</h3>
                        <p className="text-orange-700 text-xs mt-1">{lowStockItems.length} low stock · {expiringItems.length} expiring soon</p>
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
                          <Badge className="bg-orange-100 text-orange-800 text-xs">Low: {item.current_stock} {item.unit_of_measure}</Badge>
                        </div>
                      ))}
                      {expiringItems.slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded text-sm">
                          <span className="font-medium">{item.name}</span>
                          <Badge className="bg-red-100 text-red-800 text-xs">Expires: {new Date(item.expiry_date).toLocaleDateString()}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Category sub-tabs */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <div className="overflow-x-auto pb-1">
                <TabsList className={isDesktop ? 'h-10 flex gap-1 justify-start' : 'inline-flex w-max gap-0.5 h-auto p-0.5'}>
                  {categories.map(cat => (
                    <TabsTrigger
                      key={cat.value}
                      value={cat.value}
                      className={isSmallMobile ? 'text-[10px] px-1.5 py-1.5 h-8 flex-shrink-0' : 'text-xs px-2.5 py-2 h-9 flex-shrink-0'}
                    >
                      {isMobile ? cat.shortLabel : cat.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {categories.map(cat => (
                <TabsContent key={cat.value} value={cat.value} className="mt-4">
                  {filteredItems.length === 0 ? (
                    <Card><CardContent className="text-center py-12">
                      <Package className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900">No {cat.label.toLowerCase()} items</h3>
                      <p className="mt-2 text-sm text-gray-500">Add your first inventory item to get started.</p>
                      {canManage && <Button className="mt-4" onClick={() => setShowAddItemModal(true)}><Plus className="mr-2 h-4 w-4" />Add Item</Button>}
                    </CardContent></Card>
                  ) : (
                    <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6' : 'space-y-3'}>
                      {filteredItems.map(item => (
                        <InventoryItemCard key={item.id} item={item} canManage={canManage} onStockUpdate={handleStockUpdate} viewMode={viewMode} isMobile={isMobile} />
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
                { label: 'Purchases (Apr)', value: '3',  sub: 'Receipts this month',  color: 'text-green-600',  bg: 'bg-green-50',  Icon: ArrowUpCircle },
                { label: 'Usage Events',    value: '5',  sub: 'Consumption records',  color: 'text-blue-600',   bg: 'bg-blue-50',   Icon: ArrowDownCircle },
                { label: 'Adjustments',     value: '1',  sub: 'Stock corrections',    color: 'text-yellow-600', bg: 'bg-yellow-50', Icon: RefreshCw },
                { label: 'Total Movements', value: '10', sub: 'All movement records', color: 'text-gray-600',   bg: 'bg-gray-50',   Icon: History },
              ].map(({ label, value, sub, color, bg, Icon }) => (
                <Card key={label}><CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                      <p className="text-xs text-gray-500 mt-1">{sub}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${bg}`}><Icon className={`h-6 w-6 ${color}`} /></div>
                  </div>
                </CardContent></Card>
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
                      <Button key={t} variant={movementFilter === t ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setMovementFilter(t)}>
                        {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
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
                            <td className="px-4 py-3 text-gray-500 text-xs">{mv.timestamp.split(' ')[0]}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════ TAB 3 — PROCUREMENT ═══════════ */}
          <TabsContent value="procurement" className="mt-4 lg:mt-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Pending Orders', value: '1',        sub: 'Awaiting delivery',      color: 'text-yellow-600', bg: 'bg-yellow-50', Icon: Clock },
                { label: 'In Transit',     value: '1',        sub: 'Shipments en route',     color: 'text-blue-600',   bg: 'bg-blue-50',   Icon: Truck },
                { label: 'Delivered (Apr)',value: '3',        sub: 'Received this month',    color: 'text-green-600',  bg: 'bg-green-50',  Icon: CheckCircle2 },
                { label: 'Apr Spend',      value: kes(244500), sub: 'Total procurement cost', color: 'text-purple-600', bg: 'bg-purple-50', Icon: DollarSign },
              ].map(({ label, value, sub, color, bg, Icon }) => (
                <Card key={label}><CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{label}</p>
                      <p className={`font-bold text-gray-900 mt-1 ${String(value).length > 8 ? 'text-sm' : 'text-2xl'}`}>{value}</p>
                      <p className="text-xs text-gray-500 mt-1">{sub}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${bg}`}><Icon className={`h-6 w-6 ${color}`} /></div>
                  </div>
                </CardContent></Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Purchase Orders</CardTitle>
                <CardDescription>Expand any order to view line items</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {FILLER_PURCHASE_ORDERS.map(po => (
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
                        <p className="text-xs text-gray-500">{po.actual_delivery ? `Delivered ${po.actual_delivery}` : `Expected ${po.expected_delivery}`}</p>
                      </div>
                      {expandedPO === po.id ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
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
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════ TAB 4 — SUPPLIERS ═══════════ */}
          <TabsContent value="suppliers" className="mt-4 lg:mt-6 space-y-4 lg:space-y-6">
            <SupplierStatsCards stats={supplierStatsCards} totalSuppliers={displaySupplierStats.totalSuppliers} supplierTypes={displaySupplierStats.supplierTypes} />
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
                    {canManage && <Button className="mt-4" onClick={() => setShowAddSupplierModal(true)}><Plus className="mr-2 h-4 w-4" />Add Supplier</Button>}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {suppliers.map(s => <SupplierCard key={s.id} supplier={s} canManage={canManage} onEdit={setEditingSupplier} onDelete={handleSupplierDeleted} />)}
                  </div>
                )}
              </CardContent>
            </Card>

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
                      {FILLER_SUPPLIERS.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                          <td className="px-4 py-3 text-gray-600 hidden md:table-cell capitalize text-xs">{s.product_categories.join(', ')}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{kes(s.total_purchases_ytd)}</td>
                          <td className="px-4 py-3 text-center hidden sm:table-cell">
                            <span className="flex items-center justify-center gap-1">
                              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                              <span className="font-medium">{s.reliability_score}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden lg:table-cell text-xs">{s.payment_terms}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════ TAB 5 — STORAGE ═══════════ */}
          <TabsContent value="storage" className="mt-4 lg:mt-6 space-y-4 lg:space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {storageStatsCards.map((stat, i) => (
                <Card key={i}><CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                      <p className="text-xs text-gray-500 mt-2">{stat.description}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}><stat.icon className={`h-6 w-6 ${stat.color}`} /></div>
                  </div>
                </CardContent></Card>
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
                    {canManage && <Button className="mt-4" onClick={() => setShowAddStorageModal(true)}><Plus className="mr-2 h-4 w-4" />Add Storage Location</Button>}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {storageLocations.map((loc: any) => <StorageCard key={loc.id} storage={loc} canManage={canManage} onEdit={setEditingStorage} onDelete={handleStorageDeleted} />)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Capacity Utilisation</CardTitle>
                <CardDescription>Stock level vs capacity per storage area</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {FILLER_STORAGE.map(loc => {
                  const pct = Math.round((loc.current_usage_kg / loc.capacity_kg) * 100)
                  const bar = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'
                  return (
                    <div key={loc.id}>
                      <div className="flex justify-between items-center mb-1">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{loc.name}</span>
                          <span className="ml-2 text-xs text-gray-500 capitalize">{loc.type} · {loc.temperature}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-700">{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{loc.current_usage_kg.toLocaleString()} / {loc.capacity_kg.toLocaleString()} kg · {loc.items_stored} items stored</p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════ TAB 6 — BATCHES & EXPIRY ═══════════ */}
          <TabsContent value="batches" className="mt-4 lg:mt-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Batches',       value: FILLER_BATCHES.length,                                 sub: 'Active tracked batches', color: 'text-blue-600',   bg: 'bg-blue-50',   Icon: Archive },
                { label: 'Critical (<14 days)', value: FILLER_BATCHES.filter(b => b.days_to_expiry <= 14).length, sub: 'Expire imminently',  color: 'text-red-600',    bg: 'bg-red-50',    Icon: AlertCircle },
                { label: 'Expiring ≤30 days',   value: FILLER_BATCHES.filter(b => b.days_to_expiry <= 30).length, sub: 'Require attention',  color: 'text-orange-600', bg: 'bg-orange-50', Icon: AlertTriangle },
                { label: 'Safe (>90 days)',      value: FILLER_BATCHES.filter(b => b.days_to_expiry > 90).length,  sub: 'No action needed',   color: 'text-green-600',  bg: 'bg-green-50',  Icon: CheckCircle2 },
              ].map(({ label, value, sub, color, bg, Icon }) => (
                <Card key={label}><CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                      <p className="text-xs text-gray-500 mt-1">{sub}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${bg}`}><Icon className={`h-6 w-6 ${color}`} /></div>
                  </div>
                </CardContent></Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Batch Register</CardTitle>
                <CardDescription>Track batches for medicines, vaccines, semen and perishable feed</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
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
                      {FILLER_BATCHES.map(bat => {
                        const eb = expiryBadge(bat.days_to_expiry)
                        return (
                          <tr key={bat.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{bat.item_name}</td>
                            <td className="px-4 py-3 text-gray-600 font-mono text-xs">{bat.batch_number}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{bat.quantity} {bat.unit}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{bat.location}</td>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════ TAB 7 — USAGE TRACKING ═══════════ */}
          <TabsContent value="usage" className="mt-4 lg:mt-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Usage Cost (Apr)', value: kes(54000), sub: 'Consumption cost this month', color: 'text-purple-600', bg: 'bg-purple-50', Icon: DollarSign },
                { label: 'Feeding Events',          value: '1',       sub: 'Feed usage records',          color: 'text-green-600',  bg: 'bg-green-50',  Icon: Boxes },
                { label: 'Treatment Events',        value: '3',       sub: 'Medicine usage records',      color: 'text-red-600',    bg: 'bg-red-50',    Icon: Syringe },
                { label: 'Breeding Events',         value: '2',       sub: 'AI / semen usage records',    color: 'text-violet-600', bg: 'bg-violet-50', Icon: Droplets },
              ].map(({ label, value, sub, color, bg, Icon }) => (
                <Card key={label}><CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{label}</p>
                      <p className={`font-bold text-gray-900 mt-1 ${String(value).length > 8 ? 'text-sm' : 'text-2xl'}`}>{value}</p>
                      <p className="text-xs text-gray-500 mt-1">{sub}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${bg}`}><Icon className={`h-6 w-6 ${color}`} /></div>
                  </div>
                </CardContent></Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Usage by Type</CardTitle>
                  <CardDescription>Cost breakdown this month</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { type: 'Breeding',  cost: 31500, pct: 58, bar: 'bg-violet-500' },
                    { type: 'Feeding',   cost: 9750,  pct: 18, bar: 'bg-green-500' },
                    { type: 'Routine',   cost: 7800,  pct: 14, bar: 'bg-blue-500' },
                    { type: 'Treatment', cost: 4850,  pct: 9,  bar: 'bg-red-500' },
                  ].map(({ type, cost, pct, bar }) => (
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Usage</CardTitle>
                  <CardDescription>Latest consumption events</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {FILLER_USAGE_RECORDS.slice(0, 5).map(u => (
                      <div key={u.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{u.item_name}</p>
                          <p className="text-xs text-gray-500">{u.animal_group} · {u.date}</p>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-sm font-semibold text-gray-900">{kes(u.cost)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${usageBadge(u.usage_type)}`}>{u.usage_type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

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
                      {FILLER_USAGE_RECORDS.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{u.item_name}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{u.quantity_used} {u.unit}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${usageBadge(u.usage_type)}`}>{u.usage_type}</span></td>
                          <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{u.animal_group}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell font-mono">{u.related_record}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{kes(u.cost)}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{u.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════ TAB 8 — ALERTS & WASTE ═══════════ */}
          <TabsContent value="alerts" className="mt-4 lg:mt-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Critical Alerts',  value: FILLER_ALERTS.filter(a => a.severity === 'critical').length, sub: 'Require immediate action', color: 'text-red-600',    bg: 'bg-red-50',    Icon: AlertCircle },
                { label: 'Warnings',         value: FILLER_ALERTS.filter(a => a.severity === 'warning').length,  sub: 'Monitor closely',         color: 'text-orange-600', bg: 'bg-orange-50', Icon: AlertTriangle },
                { label: 'Waste Events',     value: FILLER_WASTE_RECORDS.length,                                 sub: 'Recorded losses (Apr)',    color: 'text-gray-600',   bg: 'bg-gray-50',   Icon: Trash2 },
                { label: 'Total Waste Cost', value: kes(FILLER_WASTE_RECORDS.reduce((s, w) => s + w.estimated_loss, 0)), sub: 'Estimated loss value', color: 'text-red-600', bg: 'bg-red-50', Icon: DollarSign },
              ].map(({ label, value, sub, color, bg, Icon }) => (
                <Card key={label}><CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{label}</p>
                      <p className={`font-bold text-gray-900 mt-1 ${String(value).length > 8 ? 'text-sm' : 'text-2xl'}`}>{value}</p>
                      <p className="text-xs text-gray-500 mt-1">{sub}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${bg}`}><Icon className={`h-6 w-6 ${color}`} /></div>
                  </div>
                </CardContent></Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Alerts</CardTitle>
                <CardDescription>Sorted by severity — critical first</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...FILLER_ALERTS].sort((a, b) => a.severity === 'critical' ? -1 : 1).map(alert => (
                  <div key={alert.id} className={`p-4 rounded-lg border ${alert.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
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
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Info className="h-3 w-3" />Action: {alert.action}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="flex-shrink-0 text-xs hidden sm:flex">
                        <Eye className="h-3 w-3 mr-1" />View
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Waste &amp; Loss Register</CardTitle>
                <CardDescription>Track all inventory losses — spoilage, spillage, theft and expiry</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
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
                      {FILLER_WASTE_RECORDS.map(w => (
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
                          <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{w.location}</td>
                          <td className="px-4 py-3 text-right font-bold text-red-700">{kes(w.estimated_loss)}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">{w.notes}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{w.date}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t">
                        <td colSpan={3} className="px-4 py-3 font-semibold text-gray-700 text-right hidden md:table-cell">Total Loss</td>
                        <td colSpan={2} className="px-4 py-3 font-semibold text-gray-700 md:hidden">Total Loss</td>
                        <td className="px-4 py-3 text-right font-bold text-red-700">{kes(FILLER_WASTE_RECORDS.reduce((s, w) => s + w.estimated_loss, 0))}</td>
                        <td colSpan={2} className="hidden lg:table-cell" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════ TAB 9 — ANALYTICS ═══════════ */}
          <TabsContent value="analytics" className="mt-4 lg:mt-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Inventory Value', value: kes(618360), sub: 'All categories combined',  color: 'text-green-600',  bg: 'bg-green-50',  Icon: DollarSign },
                { label: 'Apr Procurement',       value: kes(244500), sub: 'This month purchases',     color: 'text-blue-600',   bg: 'bg-blue-50',   Icon: ShoppingCart },
                { label: 'Apr Consumption',       value: kes(54000),  sub: 'Items consumed this month',color: 'text-purple-600', bg: 'bg-purple-50', Icon: Activity },
                { label: 'Apr Waste / Loss',      value: kes(11425),  sub: 'Preventable losses',       color: 'text-red-600',    bg: 'bg-red-50',    Icon: Trash2 },
              ].map(({ label, value, sub, color, bg, Icon }) => (
                <Card key={label}><CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{label}</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{value}</p>
                      <p className="text-xs text-gray-500 mt-1">{sub}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${bg}`}><Icon className={`h-6 w-6 ${color}`} /></div>
                  </div>
                </CardContent></Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Inventory Value by Category</CardTitle>
                  <CardDescription>Current stock value (KES thousands)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={CHART_CATEGORY_VALUE} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit="K" />
                      <Tooltip formatter={(v: any) => [`KES ${v}K`, 'Value']} />
                      <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Usage Cost by Type</CardTitle>
                  <CardDescription>Consumption breakdown this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={CHART_USAGE_BY_TYPE} cx="50%" cy="50%" outerRadius={85} dataKey="value">
                        {CHART_USAGE_BY_TYPE.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => kes(Number(v))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Procurement Trend</CardTitle>
                <CardDescription>Total purchasing spend Nov 2025 – Apr 2026 (KES thousands)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={CHART_MONTHLY_PROCUREMENT} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="K" />
                    <Tooltip formatter={(v: any) => [`KES ${v}K`, 'Spend']} />
                    <Area type="monotone" dataKey="amount" stroke="#6366f1" fill="#e0e7ff" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Inventory Turnover Rate</CardTitle>
                <CardDescription>Times stock is fully replenished per year — higher is better for perishables</CardDescription>
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
                      {CHART_TURNOVER.map(row => {
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key Insights</CardTitle>
                <CardDescription>Automated analysis of your inventory data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { type: 'warning', Icon: TrendingDown, text: 'Semen inventory represents 33% of total stock value (KES 207K). Ensure cryogenic storage is maintained to protect this investment.' },
                  { type: 'info',    Icon: TrendingUp,   text: 'Feed cost per litre of milk is approx KES 14.4/litre based on the current herd of 52 cows producing ~420 L/day.' },
                  { type: 'danger',  Icon: AlertCircle,  text: 'Liquid Nitrogen is critically low. A supply failure could compromise all stored semen straws valued at KES 181K.' },
                  { type: 'success', Icon: CheckCircle2, text: 'Medicine stock is well-managed — only 1 item below minimum. Penicillin-Streptomycin is safely above reorder level.' },
                ].map(({ type, Icon, text }, i) => {
                  const s: Record<string, string> = {
                    warning: 'bg-orange-50 border-orange-200 text-orange-800',
                    info:    'bg-blue-50 border-blue-200 text-blue-800',
                    danger:  'bg-red-50 border-red-200 text-red-800',
                    success: 'bg-green-50 border-green-200 text-green-800',
                  }
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${s[type]}`}>
                      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{text}</p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
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
      {showAddItemModal    && <AddInventoryModal  farmId={farmId} isOpen={showAddItemModal}    onClose={() => setShowAddItemModal(false)}    onItemAdded={handleItemAdded} />}
      {showAddSupplierModal && <AddSupplierModal  farmId={farmId} isOpen={showAddSupplierModal} onClose={() => setShowAddSupplierModal(false)} onSupplierAdded={handleSupplierAdded} />}
      {editingSupplier      && <EditSupplierModal supplier={editingSupplier} isOpen={!!editingSupplier} onClose={() => setEditingSupplier(null)} onSupplierUpdated={handleSupplierUpdated} />}
      {showAddStorageModal  && <AddStorageModal   farmId={farmId} isOpen={showAddStorageModal}  onClose={() => setShowAddStorageModal(false)}  onStorageAdded={handleStorageAdded} />}
      {editingStorage       && <EditStorageModal  storage={editingStorage}  isOpen={!!editingStorage}  onClose={() => setEditingStorage(null)}  onStorageUpdated={handleStorageUpdated} />}
    </div>
  )
}
