'use client'

import { useMemo, useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { ProductionSettings } from '@/types/production-distribution-settings'
import { AlertTriangle, Thermometer, ShieldCheck, ShieldAlert, ShieldX, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

interface ProductionHealthSectionProps {
  form: UseFormReturn<any>
  settings: ProductionSettings | null
}

const QUARTERS = [
  { id: 'FL', label: 'FL', full: 'Front left'  },
  { id: 'FR', label: 'FR', full: 'Front right' },
  { id: 'RL', label: 'RL', full: 'Rear left'   },
  { id: 'RR', label: 'RR', full: 'Rear right'  },
]

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

export function ProductionHealthSection({
  form,
  settings,
}: ProductionHealthSectionProps) {
  const temperature          = form.watch('temperature')
  const mastitisPerformed    = form.watch('mastitis_test_performed')
  const mastitisResult       = form.watch('mastitis_result')
  const affectedQuarters     = form.watch('affected_quarters') || []
  const mastitisRequired     = !!settings?.requireMastitisTest

  // Auto-check mastitis if farm settings require it
  useEffect(() => {
    if (mastitisRequired && !mastitisPerformed) {
      form.setValue('mastitis_test_performed', true)
    }
  }, [mastitisRequired, mastitisPerformed, form])

  // Temperature status
  const tempStatus = useMemo(() => {
    if (temperature == null || isNaN(temperature)) return null
    if (temperature < 38.0) return 'low'
    if (temperature > 39.5) return 'high'
    return 'normal'
  }, [temperature])

  const tempMeta = {
    low:    { label: 'Low — check animal',   cls: 'text-sky-600',    Icon: AlertTriangle },
    high:   { label: 'High — possible fever', cls: 'text-red-600',   Icon: AlertTriangle },
    normal: { label: 'Normal range',          cls: 'text-emerald-600', Icon: CheckCircle2 },
  }

  const toggleQuarter = (q: string) => {
    const current: string[] = affectedQuarters || []
    const next = current.includes(q) ? current.filter(x => x !== q) : [...current, q]
    form.setValue('affected_quarters', next.length ? next : null)
  }

  // Mastitis result options
  const resultOptions = [
    {
      value: 'negative',
      label: 'Negative',
      sub: 'No mastitis',
      activeCls: 'bg-emerald-600 border-emerald-600 text-white',
      idleCls: 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50',
      Icon: CheckCircle2,
    },
    {
      value: 'mild',
      label: 'Mild',
      sub: 'Slight signs',
      activeCls: 'bg-amber-500 border-amber-500 text-white',
      idleCls: 'bg-white border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50',
      Icon: AlertTriangle,
    },
    {
      value: 'severe',
      label: 'Severe',
      sub: 'Clear signs',
      activeCls: 'bg-red-600 border-red-600 text-white',
      idleCls: 'bg-white border-gray-200 text-gray-700 hover:border-red-300 hover:bg-red-50',
      Icon: XCircle,
    },
  ] as const

  return (
    <div className="space-y-4">

      {/* ── Temperature ──────────────────────────────────────────────────── */}
      <div>
        <FieldLabel>Temperature</FieldLabel>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Thermometer
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                tempStatus === 'high'   ? 'text-red-500'
                : tempStatus === 'low' ? 'text-sky-500'
                : tempStatus === 'normal' ? 'text-emerald-500'
                : 'text-gray-400'
              }`}
            />
            <input
              type="number"
              step="0.1"
              placeholder="38.5"
              className={`w-full text-sm pl-9 pr-10 py-2.5 border rounded-xl bg-gray-50 focus:outline-none focus:ring-2 transition-colors ${
                tempStatus === 'high'
                  ? 'border-red-300 focus:ring-red-400/30 focus:border-red-400'
                  : tempStatus === 'low'
                  ? 'border-sky-300 focus:ring-sky-400/30 focus:border-sky-400'
                  : 'border-gray-200 focus:ring-emerald-500/30 focus:border-emerald-400'
              }`}
              {...form.register('temperature', {
                setValueAs: v => (v === '' || v == null) ? null : (isNaN(parseFloat(v)) ? null : parseFloat(v)),
              })}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 pointer-events-none">
              °C
            </span>
          </div>

          {/* Inline status pill */}
          {tempStatus && (() => {
            const { label, cls, Icon } = tempMeta[tempStatus]
            return (
              <span className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap ${cls}`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </span>
            )
          })()}
        </div>
      </div>

      {/* ── Mastitis test ─────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border transition-colors ${
        mastitisResult === 'severe'
          ? 'border-red-200 bg-red-50/40'
          : mastitisResult === 'mild'
          ? 'border-amber-200 bg-amber-50/30'
          : mastitisPerformed && mastitisResult === 'negative'
          ? 'border-emerald-200 bg-emerald-50/30'
          : 'border-gray-100 bg-gray-50/60'
      }`}>

        {/* Toggle row */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-800 leading-tight">
              Mastitis test
              {mastitisRequired && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 uppercase tracking-wide">
                  Required
                </span>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {mastitisRequired
                ? 'Must be performed before saving'
                : 'CMT or similar field test'}
            </p>
          </div>

          {/* Toggle switch */}
          <button
            type="button"
            role="switch"
            aria-checked={mastitisPerformed}
            onClick={() => {
              if (mastitisRequired) return   // can't un-toggle when required
              const next = !mastitisPerformed
              form.setValue('mastitis_test_performed', next)
              if (!next) {
                form.setValue('mastitis_result', null)
                form.setValue('affected_quarters', null)
              }
            }}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 transition-colors focus:outline-none ${
              mastitisPerformed
                ? 'bg-emerald-600 border-emerald-600'
                : 'bg-gray-200 border-gray-200'
            } ${mastitisRequired ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
                mastitisPerformed ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Result buttons — only when toggled on */}
        {mastitisPerformed && (
          <div className="px-4 pb-4 space-y-3">
            <FieldLabel required>Test result</FieldLabel>

            <div className="grid grid-cols-3 gap-2">
              {resultOptions.map(({ value, label, sub, activeCls, idleCls, Icon }) => {
                const isActive = mastitisResult === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      form.setValue('mastitis_result', value, { shouldValidate: true })
                      if (value === 'negative') {
                        form.setValue('affected_quarters', null)
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl border text-center transition-all ${
                      isActive ? activeCls : idleCls
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'opacity-100' : 'opacity-50'}`} />
                    <span className="text-xs font-semibold leading-none">{label}</span>
                    <span className={`text-[10px] leading-none ${isActive ? 'opacity-80' : 'opacity-60'}`}>{sub}</span>
                  </button>
                )
              })}
            </div>

            {/* Validation error */}
            {form.formState.errors.mastitis_result && (
              <p className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                {(form.formState.errors.mastitis_result as any)?.message || 'Select a result'}
              </p>
            )}

            {/* Affected quarters — only for mild/severe */}
            {(mastitisResult === 'mild' || mastitisResult === 'severe') && (
              <div className="pt-2 border-t border-gray-200/60">
                <FieldLabel>Affected quarters</FieldLabel>
                <div className="grid grid-cols-4 gap-1.5">
                  {QUARTERS.map(q => {
                    const isChecked = (affectedQuarters as string[]).includes(q.id)
                    return (
                      <button
                        key={q.id}
                        type="button"
                        title={q.full}
                        onClick={() => toggleQuarter(q.id)}
                        className={`flex flex-col items-center py-2 rounded-xl border text-xs font-semibold transition-all ${
                          isChecked
                            ? mastitisResult === 'severe'
                              ? 'bg-red-600 border-red-600 text-white'
                              : 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <span className="font-bold">{q.label}</span>
                        <span className={`text-[9px] font-normal mt-0.5 ${isChecked ? 'opacity-80' : 'opacity-60'}`}>
                          {q.full.split(' ')[0]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Severe mastitis alert */}
            {mastitisResult === 'severe' && (
              <div className="flex items-start gap-2 p-3 bg-red-100 border border-red-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium leading-snug">
                  Milk from this animal will be automatically marked as <strong>Unsafe – Health</strong>.
                </p>
              </div>
            )}

            {mastitisResult === 'mild' && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-snug">
                  Monitor closely. Consider adjusting milk safety status if concerned.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Required-but-not-done warning */}
        {mastitisRequired && !mastitisPerformed && (
          <div className="px-4 pb-4">
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 font-medium">
                This record cannot be saved without completing the mastitis test.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}