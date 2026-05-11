'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  X, Truck, Clock, Wrench, User, Fuel, Activity, TrendingDown,
  AlertTriangle, FileText, Calendar, DollarSign, MapPin, Hash,
  LogIn, LogOut, Bell, Gauge, Timer, Shield, ChevronDown, 
  ChevronUp, Download, Trash2, HardHat
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

// ─── Simulation Data (Updated to reflect Quick Action Inputs) ─────────────────

const SIMULATED_EQUIPMENT = {
  id: 'eq-001',
  asset_id: 'EQ-2021-001',
  name: 'John Deere 5075E Tractor',
  serial_number: 'JD5075E-2021-001',
  status: 'operational', // Result of 'Disposal' or 'Check In/Out'
  condition: 'good', // Captured during 'Check-In'
  brand: 'John Deere',
  model: '5075E',
  year_manufactured: 2021,
  current_location: 'Field A', // Updated by 'Check In/Out'
  odometer_hours: 1240.5, // Updated by 'Usage Log'
  fuel_level_pct: 75, // Updated by 'Check In/Out'
  purchase_date: '2021-03-15',
  purchase_cost: 45000,
  current_value: 38500, // Result of 'Depreciation Modal'
  expected_useful_life: 15,
}

// Data captured from 'AssignEquipmentModal'
const SIMULATED_ASSIGNMENTS = [
  {
    id: 'asgn-001',
    staff_name: 'James Kamau',
    role: 'Driver',
    certification_required: 'Heavy Machinery Class G',
    date_out: '2024-05-10T07:00:00Z',
    expected_return: '2024-05-15T18:00:00Z',
    actual_return: null,
    notes: 'Assigned for primary ploughing season.',
  }
]

// Data captured from 'CheckInCheckOutModal'
const SIMULATED_CHECK_SESSIONS = [
  {
    id: 'sess-001',
    type: 'out',
    timestamp: '2024-05-11T06:30:00Z',
    staff: 'James Kamau',
    purpose: 'Ploughing — North Paddock',
    location: 'Field A',
    fuel_level: 80,
    condition: 'Excellent'
  },
  {
    id: 'sess-002',
    type: 'in',
    timestamp: '2024-05-10T17:45:00Z',
    staff: 'Peter Mwangi',
    purpose: 'Routine Transport',
    location: 'Main Barn',
    fuel_level: 65,
    condition: 'Good',
    damage_notes: 'Minor scratch on left fender during barn entry.'
  }
]

// Data captured from 'UsageLogModal'
const SIMULATED_USAGE_LOGS = [
  {
    id: 'ulog-001',
    date: '2024-05-11',
    hours_run: 5.5,
    fuel_consumed: 28.5,
    task: 'Deep Ploughing - Field A',
    operator: 'James Kamau',
    notes: 'Hard soil, high torque used.'
  }
]

// Data captured from 'DamageReportModal'
const SIMULATED_DAMAGE_REPORTS = [
  {
    id: 'dmg-001',
    description: 'Left fender scratch',
    urgency: 'Low',
    discovered_by: 'Peter Mwangi',
    date: '2024-05-10',
    work_order_created: false,
    status: 'open'
  }
]

// Data captured from 'DepreciationModal'
const SIMULATED_DEPRECIATION = {
  method: 'Straight-Line',
  residual_value: 4500,
  useful_life: 15,
  ledger: [
    { period: '2023-2024', amount: 2700, end_value: 39600 },
    { period: '2022-2023', amount: 2700, end_value: 42300 }
  ]
}

// Data captured from 'DocumentsModal'
const SIMULATED_DOCS = [
  { name: 'Purchase_Receipt.pdf', type: 'Receipt', date: '2021-03-15', size: '142 KB' },
  { name: 'Insurance_2024.pdf', type: 'Insurance', date: '2024-01-01', size: '210 KB' }
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

// ─── Tab Components ───────────────────────────────────────────────────────────

function OverviewTab({ eq }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <SectionHeader icon={Hash} title="Asset Identity" />
          <div className="space-y-2 mt-2">
            <KV label="Serial Number" value={eq.serial_number} />
            <KV label="Brand/Model" value={`${eq.brand} ${eq.model}`} />
            <KV label="Year" value={eq.year_manufactured} />
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <SectionHeader icon={MapPin} title="Current Location" />
          <p className="text-lg font-bold text-slate-800 mt-2">{eq.current_location}</p>
          <p className="text-xs text-slate-500">Updated via last Check-In</p>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center">
          <Timer className="w-5 h-5 text-blue-50 mx-auto mb-2 fill-blue-500" />
          <p className="text-xl font-black text-slate-800">{eq.odometer_hours}h</p>
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Runtime</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center">
          <Fuel className="w-5 h-5 text-amber-50 mx-auto mb-2 fill-amber-500" />
          <p className="text-xl font-black text-slate-800">{eq.fuel_level_pct}%</p>
          <p className="text-[10px] uppercase font-bold text-slate-400">Current Fuel</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center">
          <Activity className="w-5 h-5 text-emerald-50 mx-auto mb-2 fill-emerald-500" />
          <p className="text-xl font-black text-slate-800 capitalize">{eq.condition}</p>
          <p className="text-[10px] uppercase font-bold text-slate-400">Condition</p>
        </div>
      </div>
    </div>
  )
}

function HistoryTab() {
  return (
    <div className="space-y-4">
      <SectionHeader icon={Clock} title="Assignment & Check-In Log" />
      <div className="relative pl-4 border-l-2 border-slate-100 space-y-6">
        {SIMULATED_CHECK_SESSIONS.map((sess) => (
          <div key={sess.id} className="relative">
            <div className={cn(
              "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white",
              sess.type === 'out' ? "bg-blue-500" : "bg-emerald-500"
            )} />
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {sess.type === 'out' ? 'Checked Out' : 'Checked In'} by {sess.staff}
                  </p>
                  <p className="text-xs text-slate-400">{fmtDate(sess.timestamp)} at {fmtTime(sess.timestamp)}</p>
                </div>
                <Badge className={sess.type === 'out' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}>
                  {sess.type.toUpperCase()}
                </Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <p><span className="text-slate-400">Fuel:</span> <span className="font-semibold">{sess.fuel_level}%</span></p>
                <p><span className="text-slate-400">Location:</span> <span className="font-semibold">{sess.location}</span></p>
              </div>
              {sess.damage_notes && (
                <p className="mt-2 text-xs bg-rose-50 text-rose-700 p-2 rounded-lg border border-rose-100">
                  <AlertTriangle className="w-3 h-3 inline mr-1" /> {sess.damage_notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FinancialTab({ eq }: any) {
  const { ledger, method, residual_value } = SIMULATED_DEPRECIATION
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-violet-50/50 p-4 rounded-xl border border-violet-100">
          <SectionHeader icon={TrendingDown} title="Depreciation Config" />
          <div className="space-y-1 mt-2">
            <KV label="Method" value={method} />
            <KV label="Useful Life" value={`${residual_value} years`} />
            <KV label="Residual Value" value={`$${residual_value.toLocaleString()}`} />
          </div>
        </div>
        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
          <SectionHeader icon={DollarSign} title="Current Valuation" />
          <p className="text-2xl font-black text-emerald-800 mt-1">${eq.current_value.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 font-medium">Book Value as of Today</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Value History</p>
        {ledger.map((item, i) => (
          <div key={i} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
            <div>
              <p className="text-sm font-bold text-slate-800">{item.period}</p>
              <p className="text-xs text-rose-500 font-medium">-${item.amount.toLocaleString()} Depreciated</p>
            </div>
            <p className="text-sm font-black text-slate-700">${item.end_value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Modal Logic ─────────────────────────────────────────────────────────

const KV = ({ label, value }: { label: string, value: any }) => (
  <div className="flex justify-between text-xs">
    <span className="text-slate-400 font-medium">{label}</span>
    <span className="text-slate-700 font-bold">{value}</span>
  </div>
)

const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
  <div className="flex items-center gap-2 mb-1">
    <Icon className="w-3.5 h-3.5 text-slate-500" />
    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">{title}</span>
  </div>
)

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'history', label: 'Check Logs', icon: Clock },
  { id: 'usage', label: 'Usage Logs', icon: Gauge },
  { id: 'damage', label: 'Incidents', icon: AlertTriangle },
  { id: 'financial', label: 'Financial', icon: DollarSign },
  { id: 'docs', label: 'Documents', icon: FileText },
]

export function EquipmentHistoryModal({ open, onClose, equipment = SIMULATED_EQUIPMENT }: any) {
  const [activeTab, setActiveTab] = useState('overview')
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden border border-slate-200" style={{ maxHeight: '90vh' }}>
        
        {/* Header (Matching your Modal Style) */}
        <div className="bg-slate-900 px-8 py-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-white font-black text-2xl tracking-tight">{equipment.name}</h2>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-none px-3 font-bold uppercase text-[10px]">
                  {equipment.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-slate-400 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" />{equipment.asset_id}</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{equipment.current_location}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex gap-1 mt-8 overflow-x-auto no-scrollbar">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  activeTab === t.id ? "bg-white text-slate-900 shadow-md" : "text-slate-400 hover:text-slate-200 hover:bg-white/10"
                )}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8 bg-slate-50/30">
          {activeTab === 'overview' && <OverviewTab eq={equipment} />}
          {activeTab === 'history' && <HistoryTab />}
          {activeTab === 'financial' && <FinancialTab eq={equipment} />}
          {/* Usage, Damage, and Docs follow similar mapping patterns */}
          {activeTab === 'usage' && (
            <div className="space-y-4">
              {SIMULATED_USAGE_LOGS.map(log => (
                <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                   <div className="flex justify-between mb-2">
                     <p className="font-black text-slate-800">{log.task}</p>
                     <span className="text-blue-600 font-black">+{log.hours_run}h</span>
                   </div>
                   <div className="flex gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                     <span className="flex items-center gap-1"><User className="w-3 h-3" /> {log.operator}</span>
                     <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {log.date}</span>
                     <span className="flex items-center gap-1"><Fuel className="w-3 h-3" /> {log.fuel_consumed}L Used</span>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-white border-t border-slate-100 flex items-center justify-between">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {equipment.id}</p>
           <div className="flex gap-3">
              <Button variant="outline" size="sm" className="font-bold text-xs h-9 border-slate-200 px-4">
                <Download className="w-3.5 h-3.5 mr-2" /> Export History
              </Button>
              <Button onClick={onClose} className="font-bold text-xs h-9 bg-slate-900 text-white px-6">
                Close
              </Button>
           </div>
        </div>
      </div>
    </div>
  )
}