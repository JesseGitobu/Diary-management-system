'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Switch } from '@/components/ui/Switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { DistributionSettings } from '@/types/production-distribution-settings'
import { CalfFeedingDisplay } from './CalfFeedingDisplay'
import { cn } from '@/lib/utils/cn'

import {
  Plus,
  Users,
  Phone,
  MapPin,
  DollarSign,
  Edit,
  Trash2,
  Save,
  X,
  Building2,
  Truck,
  Store,
  UserCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Mail,
  Clock,
  ShoppingBag,
  GitBranch,
  Package
} from 'lucide-react'

interface Channel {
  id: string
  name: string
  type: 'cooperative' | 'processor' | 'direct' | 'retail' | 'other'
  contact: string | null
  pricePerLiter: number | null
  isActive: boolean
  location?: string | null
  paymentTerms?: string | null
  notes?: string | null
  email?: string | null
  contactPerson?: string | null
  isPaidFor?: boolean
  isSystemChannel?: boolean
  metadata?: {
    storeType?: string
    customerCount?: string
    retailOutlets?: string
    deliveryOptions?: string
    salesMethod?: string
    customerType?: string
    salesFrequency?: string
    buyerDetails?: string
    useReason?: string
    customReason?: string
    authorizationPerson?: string
  }
}

interface ChannelManagerProps {
  farmId: string
  channels: Channel[]
  onSuccess: () => void
  isMobile: boolean
  settings: DistributionSettings | null
}

interface FormData {
  name: string
  type: 'cooperative' | 'processor' | 'direct' | 'retail' | 'other'
  contact: string
  email: string
  contactPerson: string
  pricePerLiter: string
  location: string
  paymentTerms: string
  notes: string
  isActive: boolean
  storeType?: string
  customerCount?: string
  retailOutlets?: string
  deliveryOptions?: string
  salesMethod?: string
  customerType?: string
  salesFrequency?: string
  buyerDetails?: string
  useReason?: string
  customReason?: string
  authorizationPerson?: string
  isPaidFor?: boolean
}

const channelTypes = [
  { value: 'cooperative', label: 'Cooperative', icon: Building2, description: 'Farmer cooperative societies' },
  { value: 'processor',   label: 'Processor',   icon: Truck,      description: 'Milk processing companies'  },
  { value: 'direct',      label: 'Direct Sale',  icon: UserCheck,  description: 'Direct to consumer sales'   },
  { value: 'retail',      label: 'Retail',       icon: Store,      description: 'Retail shops and outlets'   },
  { value: 'other',       label: 'Other',        icon: Users,      description: 'Other distribution channels'},
]

const paymentTermsOptions = [
  'Immediate Payment','Weekly Payment','Bi-weekly Payment','Monthly Payment',
  'Net 30 Days','Net 60 Days','Upon Delivery','Custom Terms',
]

// ─── Design tokens ────────────────────────────────────────────────────────────
const TYPE_STYLES: Record<string, { dot: string; badge: string; strip: string }> = {
  direct:      { dot: 'bg-[#E2853A]', badge: 'bg-[#FAEEDA] text-[#854F0B] border-[#FAC775]',   strip: 'bg-[#fdf6ee]' },
  processor:   { dot: 'bg-[#3A82E2]', badge: 'bg-[#E6F1FB] text-[#185FA5] border-[#85B7EB]',   strip: 'bg-[#f0f6fd]' },
  cooperative: { dot: 'bg-[#3AB87B]', badge: 'bg-[#EAF3DE] text-[#3B6D11] border-[#97C459]',   strip: 'bg-[#f2f9ec]' },
  retail:      { dot: 'bg-[#9B59E2]', badge: 'bg-[#EEEDFE] text-[#534AB7] border-[#AFA9EC]',   strip: 'bg-[#f5f4fe]' },
  other:       { dot: 'bg-[#888780]', badge: 'bg-[#F1EFE8] text-[#5F5E5A] border-[#B4B2A9]',   strip: 'bg-[#f7f6f3]' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailPill({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[11px] text-gray-500">
      <Icon className="h-3 w-3 shrink-0" />
      {label}
    </span>
  )
}

function PriceChip({ price }: { price: number }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-0.5">
      <span className="text-[13px] font-medium text-gray-800">KSh {price}</span>
      <span className="text-[10px] text-gray-400">/ liter</span>
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const s = TYPE_STYLES[type] ?? TYPE_STYLES.other
  const cfg = channelTypes.find(t => t.value === type)
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${s.badge}`}>
      {cfg?.label ?? type}
    </span>
  )
}

function ChannelCard({
  channel,
  isMobile,
  farmId,
  expandedCalfFeeding,
  setExpandedCalfFeeding,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  channel: Channel
  isMobile: boolean
  farmId: string
  expandedCalfFeeding: Record<string, boolean>
  setExpandedCalfFeeding: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  onEdit: (c: Channel) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string, active: boolean) => void
}) {
  const s = TYPE_STYLES[channel.type] ?? TYPE_STYLES.other
  const meta = channel.metadata ?? {}

  // Build detail pills from metadata
  const detailPills: { icon: React.ElementType; label: string }[] = []

  if (channel.type === 'retail') {
    if (meta.storeType)      detailPills.push({ icon: ShoppingBag, label: meta.storeType })
    if (meta.customerCount)  detailPills.push({ icon: Users,       label: `${meta.customerCount} daily customers` })
    if (meta.retailOutlets)  detailPills.push({ icon: Store,       label: `${meta.retailOutlets} outlet(s)` })
    if (meta.deliveryOptions)detailPills.push({ icon: Truck,       label: meta.deliveryOptions })
  }

  if (channel.type === 'direct') {
    if (meta.salesMethod)    detailPills.push({ icon: GitBranch,   label: meta.salesMethod })
    if (meta.customerType)   detailPills.push({ icon: UserCheck,   label: meta.customerType })
    if (meta.salesFrequency) detailPills.push({ icon: Clock,       label: meta.salesFrequency })
    if (meta.buyerDetails)   detailPills.push({ icon: Users,       label: meta.buyerDetails })
  }

  if (channel.type === 'other') {
    const reason = meta.useReason === 'custom' ? (meta.customReason ?? 'Other') : (meta.useReason ?? '')
    if (reason)                        detailPills.push({ icon: Users,     label: reason })
    if (meta.authorizationPerson)      detailPills.push({ icon: UserCheck, label: `Auth: ${meta.authorizationPerson}` })
    detailPills.push({ icon: DollarSign, label: channel.isPaidFor ? 'Paid' : 'Unpaid' })
  }

  const hasStrip = channel.pricePerLiter !== null || detailPills.length > 0 || channel.paymentTerms

  const isCalfFeeding = channel.name === 'Calves Feeding' && channel.isSystemChannel

  return (
    <div className={`rounded-xl border border-gray-200 bg-white overflow-hidden transition-all duration-150 hover:border-gray-300 hover:shadow-sm ${!channel.isActive ? 'opacity-60' : ''}`}>
      {/* ── Main row ── */}
      <div className="flex items-start justify-between gap-4 px-4 py-3.5">
        {/* Left */}
        <div className="flex min-w-0 flex-col gap-2">
          {/* Identity */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
            <span className="text-[14px] font-medium text-gray-900 leading-tight">{channel.name}</span>
            <TypeBadge type={channel.type} />
            {channel.isSystemChannel && (
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
                System
              </span>
            )}
            {!channel.isActive && (
              <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-600">
                Inactive
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {channel.contact && (
              <span className="flex items-center gap-1 text-[12px] text-gray-400">
                <Phone className="h-3 w-3" /> {channel.contact}
              </span>
            )}
            {channel.contactPerson && (
              <span className="flex items-center gap-1 text-[12px] text-gray-400">
                <UserCheck className="h-3 w-3" /> {channel.contactPerson}
              </span>
            )}
            {channel.email && (
              <span className="flex items-center gap-1 text-[12px] text-gray-400">
                <Mail className="h-3 w-3" /> {channel.email}
              </span>
            )}
            {channel.location && (
              <span className="flex items-center gap-1 text-[12px] text-gray-400">
                <MapPin className="h-3 w-3" /> {channel.location}
              </span>
            )}
          </div>
        </div>

        {/* Right: toggle + actions */}
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <Switch
            checked={channel.isActive}
            onCheckedChange={(checked) => onToggleActive(channel.id, checked)}
            className="scale-90"
          />
          <button
            onClick={() => onEdit(channel)}
            disabled={channel.isSystemChannel}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Edit"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(channel.id)}
            disabled={channel.isSystemChannel}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Delete"
            title={channel.isSystemChannel ? 'Cannot delete system channels' : 'Delete'}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Detail strip ── */}
      {hasStrip && (
        <div className={`flex flex-wrap items-center gap-2 px-4 py-2.5 border-t border-gray-100 ${s.strip}`}>
          {channel.pricePerLiter !== null && <PriceChip price={channel.pricePerLiter} />}
          {channel.paymentTerms && (
            <DetailPill icon={DollarSign} label={channel.paymentTerms} />
          )}
          {detailPills.map((p, i) => (
            <DetailPill key={i} icon={p.icon} label={p.label} />
          ))}
        </div>
      )}

      {/* ── Notes ── */}
      {channel.notes && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-yellow-50">
          <p className="text-[12px] text-gray-500 leading-relaxed">{channel.notes}</p>
        </div>
      )}

      {/* ── Calf Feeding ── */}
      {isCalfFeeding && (
        <div className="border-t border-gray-100">
          <button
            onClick={() =>
              setExpandedCalfFeeding(prev => ({ ...prev, [channel.id]: !prev[channel.id] }))
            }
            className="flex w-full items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
          >
            <span className="text-[13px] font-medium text-amber-900">Calf Feeding Schedule</span>
            {expandedCalfFeeding[channel.id]
              ? <ChevronUp className="h-4 w-4 text-amber-600" />
              : <ChevronDown className="h-4 w-4 text-amber-600" />
            }
          </button>
          {expandedCalfFeeding[channel.id] && (
            <div className="px-4 pb-4 pt-3 bg-amber-50 border-t border-amber-100">
              <CalfFeedingDisplay farmId={farmId} compact={isMobile} isMobile={isMobile} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChannelManager({
  farmId,
  channels: initialChannels,
  onSuccess,
  isMobile,
  settings,
}: ChannelManagerProps) {
  const [channels, setChannels] = useState(initialChannels)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [expandedCalfFeeding, setExpandedCalfFeeding] = useState<Record<string, boolean>>({})

  const allowedChannelTypes = useMemo(() => {
    if (!settings?.channelTypesEnabled) return channelTypes
    return channelTypes.filter(t =>
      settings.channelTypesEnabled.includes(t.value as 'cooperative' | 'processor' | 'direct' | 'retail' | 'other')
    )
  }, [settings])

  const isChannelLimitReached = useMemo(() => {
    if (!settings?.maxActiveChannels) return false
    return channels.filter(c => c.isActive).length >= settings.maxActiveChannels
  }, [channels, settings])

  const defaultFormData = (): FormData => ({
    name: '', type: (allowedChannelTypes[0]?.value ?? 'cooperative') as FormData['type'],
    contact: '', email: '', contactPerson: '', pricePerLiter: '',
    location: '', paymentTerms: 'Monthly Payment', notes: '', isActive: true,
    storeType: '', customerCount: '', retailOutlets: '', deliveryOptions: '',
    salesMethod: '', customerType: '', salesFrequency: '', buyerDetails: '',
    useReason: 'home', customReason: '', authorizationPerson: '', isPaidFor: true,
  })

  const [formData, setFormData] = useState<FormData>(defaultFormData)

  const resetForm = () => { setFormData(defaultFormData()); setErrors({}) }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validateForm = (): boolean => {
    const e: Record<string, string> = {}
    
    // Name is always required
    if (!formData.name.trim()) e.name = 'Channel name is required'

    // Type-specific validations
    if (formData.type === 'other') {
      // For 'other' type channels
      if (!formData.contactPerson?.trim()) e.contactPerson = 'Person collecting is required'
      // authorizationPerson only required if isPaidFor
      if (formData.isPaidFor && !formData.authorizationPerson?.trim()) {
        e.authorizationPerson = 'Authorization person is required for paid channels'
      }
      if (formData.useReason === 'custom' && !(formData.customReason || '').trim()) {
        e.customReason = 'Please specify the reason'
      }
      // Price is only required if it's a paid channel
      if (formData.isPaidFor) {
        if (!formData.pricePerLiter || formData.pricePerLiter.trim() === '') {
          e.pricePerLiter = 'Price per liter is required for paid channels'
        } else if (parseFloat(formData.pricePerLiter) <= 0) {
          e.pricePerLiter = 'Price must be greater than 0'
        }
      }
    } else {
      // For cooperative, processor, direct, retail types
      if (!formData.contact?.trim()) e.contact = 'Contact number is required'
      
      // Price is required for all non-'other' types
      if (!formData.pricePerLiter || formData.pricePerLiter.trim() === '') {
        e.pricePerLiter = 'Price per liter is required'
      } else if (parseFloat(formData.pricePerLiter) <= 0) {
        e.pricePerLiter = 'Price must be greater than 0'
      }

      // Email validation if provided
      if (formData.email && formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
        e.email = 'Please enter a valid email address'
      }

      // Retail specific
      if (formData.type === 'retail' && !formData.storeType) {
        e.storeType = 'Store type is required'
      }

      // Direct sale specific
      if (formData.type === 'direct') {
        if (!formData.salesMethod) e.salesMethod = 'Sales method is required'
        if (!formData.customerType) e.customerType = 'Customer type is required'
        if (!formData.salesFrequency) e.salesFrequency = 'Sales frequency is required'
      }
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      // Build the payload based on channel type
      const payload: any = {
        farmId,
        name: formData.name.trim(),
        type: formData.type,
        isActive: formData.isActive,
        notes: formData.notes?.trim() || null,
      }

      // Handle price - convert only if provided and not empty
      if (formData.pricePerLiter && formData.pricePerLiter.trim() !== '') {
        const priceValue = parseFloat(formData.pricePerLiter)
        if (!isNaN(priceValue) && priceValue > 0) {
          payload.pricePerLiter = priceValue
        } else {
          payload.pricePerLiter = null
        }
      } else {
        payload.pricePerLiter = null
      }

      // Add contact info for non-'other' types
      if (formData.type !== 'other') {
        payload.contact = formData.contact?.trim() || null
        payload.email = formData.email?.trim() || null
        payload.location = formData.location?.trim() || null
        payload.contactPerson = formData.contactPerson?.trim() || null
        payload.paymentTerms = formData.paymentTerms || 'Monthly Payment'
      } else {
        // For 'other' type channels
        payload.contactPerson = formData.contactPerson?.trim() || null
        payload.isPaidFor = formData.isPaidFor
        // Only set payment terms for paid 'other' channels
        if (formData.isPaidFor) {
          payload.paymentTerms = formData.paymentTerms || 'Monthly Payment'
        }
      }

      // Build metadata based on channel type
      const metadata: any = {}

      if (formData.type === 'retail') {
        if (formData.storeType?.trim()) metadata.storeType = formData.storeType.trim()
        if (formData.customerCount?.trim()) metadata.customerCount = formData.customerCount.trim()
        if (formData.retailOutlets?.trim()) metadata.retailOutlets = formData.retailOutlets.trim()
        if (formData.deliveryOptions?.trim()) metadata.deliveryOptions = formData.deliveryOptions.trim()
      }

      if (formData.type === 'direct') {
        if (formData.salesMethod?.trim()) metadata.salesMethod = formData.salesMethod.trim()
        if (formData.customerType?.trim()) metadata.customerType = formData.customerType.trim()
        if (formData.salesFrequency?.trim()) metadata.salesFrequency = formData.salesFrequency.trim()
        if (formData.buyerDetails?.trim()) metadata.buyerDetails = formData.buyerDetails.trim()
      }

      if (formData.type === 'other') {
        if (formData.useReason?.trim()) metadata.useReason = formData.useReason.trim()
        if (formData.useReason === 'custom' && formData.customReason?.trim()) {
          metadata.customReason = formData.customReason.trim()
        }
        if (formData.isPaidFor && formData.authorizationPerson?.trim()) {
          metadata.authorizationPerson = formData.authorizationPerson.trim()
        }
      }

      if (Object.keys(metadata).length > 0) {
        payload.metadata = metadata
      }

      const url = editingChannel
        ? `/api/distribution/channels/${editingChannel.id}`
        : '/api/distribution/channels'
      const method = editingChannel ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to save channel')
      }

      const saved: Channel = await response.json()
      setChannels(prev =>
        editingChannel ? prev.map(c => c.id === editingChannel.id ? saved : c) : [...prev, saved]
      )
      setShowAddForm(false)
      setEditingChannel(null)
      resetForm()
      onSuccess()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save channel. Please try again.'
      setErrors({ submit: message })
      console.error('Channel save error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (channel: Channel) => {
    setEditingChannel(channel)
    const m = channel.metadata ?? {}
    setFormData({
      name: channel.name, type: channel.type,
      contact: channel.contact ?? '', email: channel.email ?? '',
      contactPerson: channel.contactPerson ?? '',
      pricePerLiter: channel.pricePerLiter?.toString() ?? '',
      location: channel.location ?? '', paymentTerms: channel.paymentTerms ?? 'Monthly Payment',
      notes: channel.notes ?? '', isActive: channel.isActive,
      storeType: m.storeType ?? '', customerCount: m.customerCount ?? '',
      retailOutlets: m.retailOutlets ?? '', deliveryOptions: m.deliveryOptions ?? '',
      salesMethod: m.salesMethod ?? '', customerType: m.customerType ?? '',
      salesFrequency: m.salesFrequency ?? '', buyerDetails: m.buyerDetails ?? '',
      useReason: m.useReason ?? 'home', customReason: m.customReason ?? '',
      authorizationPerson: m.authorizationPerson ?? '', isPaidFor: channel.isPaidFor !== false,
    })
    setShowAddForm(true)
  }

  const handleDelete = async (channelId: string) => {
    const channel = channels.find(c => c.id === channelId)
    if (channel?.isSystemChannel) { alert('System channels cannot be deleted.'); return }
    if (!confirm('Are you sure you want to delete this channel?')) return
    try {
      const res = await fetch(`/api/distribution/channels/${channelId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setChannels(prev => prev.filter(c => c.id !== channelId))
    } catch {
      alert('Failed to delete channel. Please try again.')
    }
  }

  const handleToggleActive = async (channelId: string, isActive: boolean) => {
    if (isActive && isChannelLimitReached) {
      alert(`Cannot enable channel. Maximum active channels limit (${settings?.maxActiveChannels}) reached.`)
      return
    }
    try {
      const res = await fetch(`/api/distribution/channels/${channelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) throw new Error()
      setChannels(prev => prev.map(c => c.id === channelId ? { ...c, isActive } : c))
    } catch {
      console.error('Error updating channel status')
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const activeChannels = channels.filter(c => c.isActive)
  const avgPrice = activeChannels.length
    ? Math.round((activeChannels.reduce((s, c) => s + (c.pricePerLiter ?? 0), 0) / activeChannels.length) * 10) / 10
    : 0
  const typeCount = new Set(channels.map(c => c.type)).size

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className={`space-y-5 ${isMobile ? '' : 'max-w-4xl mx-auto'}`}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm">
            <GitBranch className="h-4 w-4" />
          </div>
          <div>
            <h2 className={`${isMobile ? 'text-base' : 'text-[17px]'} font-semibold text-gray-900 leading-tight`}>
              Distribution channels
            </h2>
            <p className="text-[12px] text-gray-400 mt-0.5">Manage milk distribution partners and pricing</p>
          </div>
        </div>

        {settings?.enableChannelManagement !== false && (
          <Button
            onClick={() => {
              if (isChannelLimitReached && !editingChannel) {
                alert(`Maximum active channels limit (${settings?.maxActiveChannels}) reached.`)
                return
              }
              resetForm(); setEditingChannel(null); setShowAddForm(true)
            }}
            disabled={isChannelLimitReached && !editingChannel}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            variant="outline"
          >
            <Plus className="h-3.5 w-3.5" />
            {isMobile ? 'Add' : 'Add channel'}
          </Button>
        )}
      </div>

      {/* ── Limit warning ── */}
      {isChannelLimitReached && (
        <Alert className="rounded-xl border-amber-200 bg-amber-50 py-2.5 px-4">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-[12px] text-amber-700 ml-1">
            Active channel limit ({settings?.maxActiveChannels}) reached. Disable a channel to add a new one.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Add / Edit dialog ── */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              {editingChannel ? 'Edit channel' : 'Add new channel'}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-gray-400">
              {editingChannel ? 'Update channel information' : 'Add a new distribution channel'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pr-1">
  {/* Section: Basic Configuration */}
  <div className="space-y-4">
    <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
      <div className="p-1.5 bg-blue-50 rounded-md">
        <Building2 className="w-4 h-4 text-blue-600" />
      </div>
      <h3 className="text-sm font-semibold text-gray-800">General Information</h3>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Channel Type */}
      <div className="col-span-full">
        <Label htmlFor="type" className="text-[12px] font-bold text-gray-500 uppercase tracking-tight">Channel type *</Label>
        <Select value={formData.type} onValueChange={(v) => handleInputChange('type', v as any)}>
          <SelectTrigger className="mt-1.5 h-11 rounded-xl border-gray-200 bg-gray-50/30 transition-all focus:ring-2 focus:ring-blue-500/20">
            <SelectValue>
              {(() => {
                const sel = allowedChannelTypes.find(t => t.value === formData.type)
                const Icon = sel?.icon
                return sel ? (
                  <div className="flex items-center gap-2.5 font-medium text-gray-900">
                    {Icon && <Icon className="h-4 w-4 text-blue-500" />}
                    <span>{sel.label}</span>
                  </div>
                ) : null
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-xl border-gray-100">
            {allowedChannelTypes.map(t => {
              const Icon = t.icon
              return (
                <SelectItem key={t.value} value={t.value} className="py-3 focus:bg-blue-50">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1 bg-gray-100 rounded text-gray-500"><Icon className="h-4 w-4" /></div>
                    <div>
                      <div className="font-semibold text-gray-900">{t.label}</div>
                      <div className="text-[11px] text-gray-500 leading-tight mt-0.5">{t.description}</div>
                    </div>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label className="text-[12px] font-bold text-gray-500 uppercase tracking-tight">Channel name *</Label>
        <Input
          value={formData.name}
          onChange={e => handleInputChange('name', e.target.value)}
          placeholder="e.g., Murang'a Dairy"
          className={cn(
            "h-11 rounded-xl border-gray-200 bg-white transition-all focus:ring-2",
            errors.name ? "border-red-300 focus:ring-red-100" : "focus:ring-blue-100"
          )}
        />
        {errors.name && <p className="text-[11px] font-medium text-red-500 pl-1">{errors.name}</p>}
      </div>

      {/* Contact Person / Person Collecting */}
      <div className="space-y-1.5">
        <Label className="text-[12px] font-bold text-gray-500 uppercase tracking-tight">
          {formData.type === 'other' ? 'Authorized collector *' : 'Contact person'}
        </Label>
        <div className="relative">
          <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={formData.contactPerson}
            onChange={e => handleInputChange('contactPerson', e.target.value)}
            placeholder="Full Name"
            className={cn(
              "h-11 pl-10 rounded-xl border-gray-200 bg-white transition-all focus:ring-2",
              formData.type === 'other' && errors.contactPerson ? "border-red-300 focus:ring-red-100" : "focus:ring-blue-100"
            )}
          />
        </div>
      </div>
    </div>
  </div>

  {/* Section: Conditional Specifics */}
  {(formData.type === 'retail' || formData.type === 'direct' || formData.type === 'other') && (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
        <div className="p-1.5 bg-purple-50 rounded-md">
          <Package className="w-4 h-4 text-purple-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">Logistics & Usage</h3>
      </div>

      {/* Retail Panel */}
      {formData.type === 'retail' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-blue-100 bg-blue-50/30 p-5 shadow-inner">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-blue-600/70 uppercase">Store type *</Label>
            <Select value={formData.storeType ?? ''} onValueChange={v => handleInputChange('storeType', v)}>
              <SelectTrigger className="h-10 rounded-lg border-blue-100 bg-white shadow-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {['supermarket','convenience_store','kiosk','restaurant','hotel'].map(v => (
                  <SelectItem key={v} value={v} className="capitalize">{v.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-blue-600/70 uppercase">Daily customers</Label>
            <Input type="number" value={formData.customerCount ?? ''} onChange={e => handleInputChange('customerCount', e.target.value)} className="h-10 rounded-lg border-blue-100 shadow-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-blue-600/70 uppercase">Total outlets</Label>
            <Input type="number" value={formData.retailOutlets ?? ''} onChange={e => handleInputChange('retailOutlets', e.target.value)} className="h-10 rounded-lg border-blue-100 shadow-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-blue-600/70 uppercase">Schedule</Label>
            <Select value={formData.deliveryOptions ?? ''} onValueChange={v => handleInputChange('deliveryOptions', v)}>
              <SelectTrigger className="h-10 rounded-lg border-blue-100 bg-white shadow-sm"><SelectValue placeholder="Frequency" /></SelectTrigger>
              <SelectContent>
                {['daily','twice_weekly','weekly'].map(v => (
                  <SelectItem key={v} value={v} className="capitalize">{v.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Direct Sales Panel */}
      {formData.type === 'direct' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-orange-100 bg-orange-50/30 p-5 shadow-inner">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-orange-600/70 uppercase">Sales method *</Label>
            <Select value={formData.salesMethod ?? ''} onValueChange={v => handleInputChange('salesMethod', v)}>
              <SelectTrigger className="h-10 rounded-lg border-orange-100 bg-white shadow-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {['pickup','delivery','both'].map(v => (
                  <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-orange-600/70 uppercase">Frequency *</Label>
            <Select value={formData.salesFrequency ?? ''} onValueChange={v => handleInputChange('salesFrequency', v)}>
              <SelectTrigger className="h-10 rounded-lg border-orange-100 bg-white shadow-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {['daily','alternate_days','weekly','as_needed'].map(v => (
                  <SelectItem key={v} value={v} className="capitalize">{v.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-full space-y-1.5">
            <Label className="text-[11px] font-bold text-orange-600/70 uppercase">Buyer details</Label>
            <Input value={formData.buyerDetails ?? ''} onChange={e => handleInputChange('buyerDetails', e.target.value)} placeholder="Preferences, etc." className="h-10 rounded-lg border-orange-100 shadow-sm" />
          </div>
        </div>
      )}

      {/* Other Panel */}
      {formData.type === 'other' && (
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/80 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase">Use reason *</Label>
              <Select value={formData.useReason ?? 'home'} onValueChange={v => handleInputChange('useReason', v)}>
                <SelectTrigger className="h-10 rounded-lg bg-white border-gray-200 shadow-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[['home','Home Use'],['kitchen','Kitchen Use'],['wastage','Wastage'],['custom','Other']].map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.useReason === 'custom' && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase">Specify reason *</Label>
                <Input value={formData.customReason ?? ''} onChange={e => handleInputChange('customReason', e.target.value)} className="h-10 rounded-lg bg-white shadow-sm" />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <Switch checked={formData.isPaidFor} onCheckedChange={c => handleInputChange('isPaidFor', c)} />
              <Label className="text-sm font-medium text-gray-700">{formData.isPaidFor ? 'Paid usage' : 'Internal/Unpaid usage'}</Label>
            </div>
            <div className="h-8 w-px bg-gray-100" />
            <div className="text-[11px] text-gray-400 font-medium italic">Payment required</div>
          </div>
        </div>
      )}
    </div>
  )}

  {/* Section: Contact & Financials */}
  <div className="space-y-4">
    <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
      <div className="p-1.5 bg-emerald-50 rounded-md">
        <DollarSign className="w-4 h-4 text-emerald-600" />
      </div>
      <h3 className="text-sm font-semibold text-gray-800">Contact & Pricing</h3>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {formData.type !== 'other' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-bold text-gray-500 uppercase tracking-tight">Phone number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input value={formData.contact} onChange={e => handleInputChange('contact', e.target.value)} placeholder="+254..." className="h-11 pl-10 rounded-xl border-gray-200" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-bold text-gray-500 uppercase tracking-tight">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} placeholder="office@example.com" className="h-11 pl-10 rounded-xl border-gray-200" />
            </div>
          </div>
        </>
      )}

      {/* Pricing - Only if paid */}
      {!(formData.type === 'other' && !formData.isPaidFor) && (
        <>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-bold text-gray-500 uppercase tracking-tight">Price per liter (KSh) *</Label>
            <Input type="number" step="0.01" value={formData.pricePerLiter} onChange={e => handleInputChange('pricePerLiter', e.target.value)} className="h-11 rounded-xl border-gray-200 bg-emerald-50/20 font-bold text-emerald-700" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-bold text-gray-500 uppercase tracking-tight">Payment terms</Label>
            <Select value={formData.paymentTerms} onValueChange={v => handleInputChange('paymentTerms', v)}>
              <SelectTrigger className="h-11 rounded-xl border-gray-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                {paymentTermsOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>

    {formData.type !== 'other' && (
      <div className="space-y-1.5">
        <Label className="text-[12px] font-bold text-gray-500 uppercase tracking-tight">Location</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={formData.location} onChange={e => handleInputChange('location', e.target.value)} placeholder="Physical address" className="h-11 pl-10 rounded-xl border-gray-200" />
        </div>
      </div>
    )}

    <div className="space-y-1.5">
      <Label className="text-[12px] font-bold text-gray-500 uppercase tracking-tight">Additional notes</Label>
      <Textarea value={formData.notes} onChange={e => handleInputChange('notes', e.target.value)} placeholder="Mention delivery points, preferred containers, etc." rows={2} className="rounded-xl border-gray-200 resize-none focus:ring-blue-100" />
    </div>

    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
      <Switch id="isActive" checked={formData.isActive} onCheckedChange={c => handleInputChange('isActive', c)} />
      <div className="space-y-0.5">
        <Label htmlFor="isActive" className="text-sm font-bold text-slate-800">Active Channel</Label>
        <p className="text-[11px] text-slate-500 italic">This channel will be visible during milk records entry</p>
      </div>
    </div>
  </div>

  {/* Form Submission Errors */}
  {errors.submit && (
    <Alert className="rounded-xl border-red-200 bg-red-50 text-red-800 py-3">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="text-xs font-medium ml-2">{errors.submit}</AlertDescription>
    </Alert>
  )}

  {/* Actions */}
  <div className="sticky bottom-0 bg-white/90 backdrop-blur-sm pt-4 pb-2 border-t border-gray-100 flex gap-3">
    <Button
      type="button" variant="outline"
      onClick={() => { setShowAddForm(false); setEditingChannel(null); resetForm() }}
      className="flex-1 h-12 rounded-xl border-gray-200 text-gray-600 font-semibold transition-all hover:bg-gray-50"
    >
      Cancel
    </Button>
    <Button 
      type="submit" 
      disabled={isSubmitting} 
      className="flex-[2] h-12 rounded-xl bg-blue-600 font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
    >
      {isSubmitting ? (
        <span className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          Processing...
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {editingChannel ? 'Update Channel' : 'Save New Channel'}
        </span>
      )}
    </Button>
  </div>
</form>
        </DialogContent>
      </Dialog>

      {/* ── Channels list ── */}
      <div className={`space-y-2 overflow-y-auto pr-1 ${isMobile ? 'max-h-[700px]' : 'max-h-[800px]'} scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent`}>
        {channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
            <GitBranch className="h-8 w-8 text-gray-300 mb-3" />
            <p className="text-[14px] font-medium text-gray-500">No distribution channels yet</p>
            <p className="text-[12px] text-gray-400 mb-4 mt-1">Add your first channel to get started</p>
            <Button onClick={() => setShowAddForm(true)} variant="outline" className="rounded-lg border-gray-200 text-[13px]">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add channel
            </Button>
          </div>
        ) : (
          channels.map(channel => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              isMobile={isMobile}
              farmId={farmId}
              expandedCalfFeeding={expandedCalfFeeding}
              setExpandedCalfFeeding={setExpandedCalfFeeding}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))
        )}
      </div>

      {/* ── Stats bar ── */}
      {channels.length > 0 && (
        <div className="grid grid-cols-4 divide-x divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden">
          {[
            { value: channels.length, label: 'Total channels', color: 'text-blue-600' },
            { value: activeChannels.length, label: 'Active', color: 'text-green-600' },
            { value: `KSh ${avgPrice}`, label: 'Avg price', color: 'text-amber-600' },
            { value: typeCount, label: 'Channel types', color: 'text-purple-600' },
          ].map(({ value, label, color }) => (
            <div key={label} className="flex flex-col items-center justify-center py-3 px-2">
              <span className={`text-[15px] font-semibold ${color}`}>{value}</span>
              <span className="text-[11px] text-gray-400 mt-0.5 text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}