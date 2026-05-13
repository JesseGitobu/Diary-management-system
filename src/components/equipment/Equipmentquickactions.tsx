'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu'
import {
  ChevronDown, Plus, Calendar, User, LogIn, Gauge, AlertTriangle, TrendingDown, Trash2, CalendarClock,
  FileText, Wrench, Settings,
} from 'lucide-react'
import { AssignEquipmentModal } from './modals/AssignEquipmentModal'
import { CheckInCheckOutModal } from './modals/CheckInCheckOutModal'
import { UsageLogModal } from './modals/UsageLogModal'
import { DamageReportModal } from './modals/DamageReportModal'
import { DepreciationModal } from './modals/DepreciationModal'
import { DisposalModal } from './modals/DisposalModal'
import { BookingReservationModal } from './modals/BookingReservationModal'
import { DocumentsModal } from './modals/DocumentsModal'

// ─── Quick Actions Dropdown ───────────────────────────────────────────────────
export function EquipmentQuickActions({
  farmId,
  equipment,          // currently selected/focused equipment item (optional)
  canManage = true,
  onAddEquipment,     // () => void — open AddEquipmentModal (existing)
  onScheduleMaintenance, // () => void — open MaintenanceScheduleModal (existing)
}: {
  farmId: string
  equipment?: any
  canManage?: boolean
  onAddEquipment: () => void
  onScheduleMaintenance: () => void
}) {
  const [modal, setModal] = useState<'assign' | 'checkin' | 'usage' | 'damage' | 'depreciation' | 'disposal' | 'booking' | 'documents' | null>(null)
  const close = () => setModal(null)

  // Pick a representative equipment item for demo
  const eq = equipment || null

  const groups = [
    {
      label: 'Assets',
      items: [
        { id: 'add',       label: 'Add New Asset',       icon: Plus,          action: onAddEquipment },
        { id: 'schedule',  label: 'Schedule Maintenance', icon: Wrench,        action: onScheduleMaintenance },
        { id: 'booking',   label: 'Book / Reserve',       icon: CalendarClock, action: () => setModal('booking') },
      ],
    },
    {
      label: 'People & Usage',
      items: [
        { id: 'assign',    label: 'Assign Equipment',     icon: User,    action: () => setModal('assign') },
        { id: 'checkin',   label: 'Check In / Out',       icon: LogIn,   action: () => setModal('checkin') },
        { id: 'usage',     label: 'Log Usage',            icon: Gauge,   action: () => setModal('usage') },
      ],
    },
    {
      label: 'Issues & Lifecycle',
      items: [
        { id: 'damage',      label: 'Report Damage',        icon: AlertTriangle, action: () => setModal('damage') },
        { id: 'depreciation',label: 'View Depreciation',    icon: TrendingDown,  action: () => setModal('depreciation') },
        { id: 'disposal',    label: 'Dispose / Retire',     icon: Trash2,        action: () => setModal('disposal') },
      ],
    },
    {
      label: 'Config & Documents',
      items: [
        { id: 'documents',label: 'Documents',            icon: FileText, action: () => setModal('documents') },
      ],
    },
  ]

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="flex items-center gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold">
            <Settings className="w-4 h-4" />
            Quick Actions
            <ChevronDown className="w-3.5 h-3.5 ml-0.5 text-slate-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {groups.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <DropdownMenuSeparator />}
              <div className="px-2 py-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{group.label}</p>
              </div>
              {group.items.map(item => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={item.action}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <item.icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span className="text-sm">{item.label}</span>
                </DropdownMenuItem>
              ))}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal renders */}
      <AssignEquipmentModal      open={modal === 'assign'}      onClose={close} equipment={eq} />
      <CheckInCheckOutModal      open={modal === 'checkin'}     onClose={close} equipment={eq} />
      <UsageLogModal             open={modal === 'usage'}       onClose={close} equipment={eq} />
      <DamageReportModal         open={modal === 'damage'}      onClose={close} equipment={eq} farmId={farmId} />
      <DepreciationModal         open={modal === 'depreciation'}onClose={close} equipment={eq} />
      <DisposalModal             open={modal === 'disposal'}    onClose={close} equipment={eq} farmId={farmId} />
      <BookingReservationModal   open={modal === 'booking'}     onClose={close} equipment={eq} />
      <DocumentsModal            open={modal === 'documents'}   onClose={close} equipment={eq} />
    </>
  )
}