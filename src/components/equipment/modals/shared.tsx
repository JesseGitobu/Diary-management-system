'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { LucideIcon } from 'lucide-react'

// ─── Shared Modal Shell ────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, icon: Icon, accentColor = 'emerald', children, footer }: {
  open: boolean
  onClose: () => void
  title: string
  icon: LucideIcon
  accentColor?: 'emerald' | 'amber' | 'blue' | 'rose' | 'violet' | 'slate'
  children: ReactNode
  footer?: ReactNode
}) {
  if (!open) return null
  const accent = {
    emerald: { bg: 'bg-emerald-600', ring: 'ring-emerald-200', text: 'text-emerald-600', light: 'bg-emerald-50', btn: 'bg-emerald-600 hover:bg-emerald-700' },
    amber:   { bg: 'bg-amber-500',   ring: 'ring-amber-200',   text: 'text-amber-600',   light: 'bg-amber-50',   btn: 'bg-amber-500 hover:bg-amber-600' },
    blue:    { bg: 'bg-blue-600',    ring: 'ring-blue-200',    text: 'text-blue-600',    light: 'bg-blue-50',    btn: 'bg-blue-600 hover:bg-blue-700' },
    rose:    { bg: 'bg-rose-600',    ring: 'ring-rose-200',    text: 'text-rose-600',    light: 'bg-rose-50',    btn: 'bg-rose-600 hover:bg-rose-700' },
    violet:  { bg: 'bg-violet-600',  ring: 'ring-violet-200',  text: 'text-violet-600',  light: 'bg-violet-50',  btn: 'bg-violet-600 hover:bg-violet-700' },
    slate:   { bg: 'bg-slate-700',   ring: 'ring-slate-200',   text: 'text-slate-700',   light: 'bg-slate-100',  btn: 'bg-slate-700 hover:bg-slate-800' },
  }[accentColor]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`${accent.bg} px-6 py-5 flex items-center gap-3`}>
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-white font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="ml-auto text-white/70 hover:text-white text-xl leading-none">×</button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="border-t border-slate-100 px-6 py-4 flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Reusable Field Components ─────────────────────────────────────────────────
export const Field = ({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
      {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
)

export const Input = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-slate-50" {...props} />
)

export const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) => (
  <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-slate-50" {...props}>
    {children}
  </select>
)

export const Textarea = ({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-slate-50 resize-none" {...props} />
)

export const SectionLabel = ({ children }: { children: ReactNode }) => (
  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-1">{children}</p>
)
