'use client'

import { useRef, useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { cn } from '@/lib/utils/cn'
import {
  Settings, CheckCircle, Clock, Wrench, XCircle,
  AlertCircle, CheckCircle2, TrendingUp, Activity, DollarSign,
} from 'lucide-react'

interface EquipmentStatsCardsProps {
  stats: {
    totalEquipment: number
    operational: number
    maintenanceDue: number
    inMaintenance: number
    broken: number
    upcomingMaintenance?: number
    totalAssetValue?: number
    totalMaintenanceCost?: number
    avgUtilization?: number
  }
}

export function EquipmentStatsCards({ stats }: EquipmentStatsCardsProps) {
  const { isMobile } = useDeviceInfo()

  const cards = [
    {
      id: 'total',
      label: 'Total Assets',
      value: stats.totalEquipment,
      sub: 'Equipment items',
      icon: Settings,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      accent: 'border-b-slate-400',
    },
    {
      id: 'operational',
      label: 'Operational',
      value: stats.operational,
      sub: `${stats.totalEquipment ? Math.round((stats.operational / stats.totalEquipment) * 100) : 0}% of fleet`,
      icon: CheckCircle,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      accent: 'border-b-emerald-500',
      highlight: stats.operational > 0,
    },
    {
      id: 'due',
      label: 'Maintenance Due',
      value: stats.maintenanceDue,
      sub: 'Needs servicing',
      icon: Clock,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      accent: 'border-b-amber-500',
      alert: stats.maintenanceDue > 0,
    },
    {
      id: 'inMaint',
      label: 'In Maintenance',
      value: stats.inMaintenance,
      sub: 'Currently serviced',
      icon: Wrench,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      accent: 'border-b-blue-500',
    },
    {
      id: 'broken',
      label: 'Broken',
      value: stats.broken,
      sub: 'Needs repair',
      icon: XCircle,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      accent: 'border-b-rose-500',
      alert: stats.broken > 0,
    },
  ]

  const financialCards = [
    stats.totalAssetValue && {
      id: 'value',
      label: 'Fleet Value',
      value: `$${(stats.totalAssetValue / 1000).toFixed(0)}k`,
      sub: 'Current book value',
      icon: TrendingUp,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    stats.avgUtilization !== undefined && {
      id: 'util',
      label: 'Avg Utilization',
      value: `${stats.avgUtilization}%`,
      sub: 'Fleet efficiency',
      icon: Activity,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    stats.totalMaintenanceCost && {
      id: 'maint',
      label: 'Maint. Spend',
      value: `$${(stats.totalMaintenanceCost / 1000).toFixed(1)}k`,
      sub: 'Cumulative cost',
      icon: DollarSign,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ].filter(Boolean) as any[]

  const isHealthy = stats.broken === 0 && stats.maintenanceDue === 0
  const isCritical = stats.broken > 0

  return (
    <div className="space-y-3">
      {/* Status KPI strip */}
      <div className={`grid gap-3 ${
        isMobile
          ? 'grid-cols-2'
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
      }`}>
        {cards.map(c => (
          <Card key={c.id} className={`border border-slate-200 border-b-4 ${c.accent} rounded-2xl shadow-sm`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${c.iconBg} flex items-center justify-center`}>
                  <c.icon className={`w-4.5 h-4.5 ${c.iconColor}`} />
                </div>
                {c.alert && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </div>
              <p className="text-2xl font-bold text-slate-900">{c.value}</p>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">{c.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financial row (if data present) */}
      {financialCards.length > 0 && (
        <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : `grid-cols-${financialCards.length}`}`}>
          {financialCards.map((c: any) => (
            <Card key={c.id} className="border border-slate-200 rounded-2xl shadow-sm bg-gradient-to-br from-white to-slate-50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <c.icon className={`w-5 h-5 ${c.iconColor}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{c.value}</p>
                  <p className="text-xs font-semibold text-slate-600">{c.label}</p>
                  <p className="text-xs text-slate-400">{c.sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Health indicator */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-semibold',
        isHealthy  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
        isCritical ? 'bg-rose-50 border-rose-200 text-rose-800' :
                     'bg-amber-50 border-amber-200 text-amber-800',
      )}>
        <div className="flex items-center gap-2">
          {isHealthy
            ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            : <AlertCircle className={`w-4 h-4 ${isCritical ? 'text-rose-500' : 'text-amber-500'}`} />}
          <span>Overall fleet status:</span>
        </div>
        <span>{isHealthy ? 'All systems healthy' : isCritical ? 'Critical issues present' : 'Monitoring required'}</span>
      </div>
    </div>
  )
}