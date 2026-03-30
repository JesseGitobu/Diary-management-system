'use client'

import { useMemo } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { ProductionSettings } from '@/types/production-distribution-settings'
import { AlertTriangle, Thermometer } from 'lucide-react'

interface ProductionHealthSectionProps {
  form: UseFormReturn<any>
  settings: ProductionSettings | null
}

const QUARTERS = [
  { id: 'FL', label: 'Front Left' },
  { id: 'FR', label: 'Front Right' },
  { id: 'RL', label: 'Rear Left' },
  { id: 'RR', label: 'Rear Right' }
]

export function ProductionHealthSection({
  form,
  settings
}: ProductionHealthSectionProps) {
  const temperature = form.watch('temperature')
  const mastitis_test_performed = form.watch('mastitis_test_performed')
  const mastitis_result = form.watch('mastitis_result')
  const affected_quarters = form.watch('affected_quarters') || []

  // Temperature warnings
  const tempWarning = useMemo(() => {
    if (temperature === null || temperature === undefined) return null
    if (temperature < 38) return 'low'
    if (temperature > 39.5) return 'high'
    return null
  }, [temperature])

  const toggleQuarter = (quarter: string) => {
    const current = affected_quarters || []
    const updated = current.includes(quarter)
      ? current.filter((q: string) => q !== quarter)
      : [...current, quarter]
    form.setValue('affected_quarters', updated.length > 0 ? updated : null)
  }

  return (
    <div className="space-y-4 p-4 bg-stone-50 rounded-lg border border-stone-200">
      <h4 className="font-medium text-stone-900">Health & Safety Checks</h4>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column — Health Checks */}
        <div className="space-y-4">
          {/* Temperature */}
          <div>
            <Label htmlFor="temperature">Temperature (°C)</Label>
            <div className="relative mt-2">
              <div className="absolute left-3 top-2.5">
                <Thermometer className={`w-5 h-5 ${
                  tempWarning === 'high' ? 'text-red-500' :
                  tempWarning === 'low' ? 'text-blue-500' :
                  'text-green-500'
                }`} />
              </div>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                placeholder="38.5"
                className="pl-10"
                {...form.register('temperature', {
                  valueAsNumber: true,
                  setValueAs: (value) => value === '' ? null : parseFloat(value) || null
                })}
              />
            </div>
            {tempWarning && (
              <p className={`text-xs mt-1 flex items-center space-x-1 ${
                tempWarning === 'high' ? 'text-red-600' : 'text-blue-600'
              }`}>
                <AlertTriangle className="w-3 h-3" />
                <span>
                  {tempWarning === 'high'
                    ? 'Temperature is high - possible fever'
                    : 'Temperature is low - check animal'}
                </span>
              </p>
            )}
            {!tempWarning && temperature && (
              <p className="text-xs mt-1 text-green-600">Normal temperature</p>
            )}
          </div>

          {/* Mastitis Test Toggle */}
          <div>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="mastitis_test_performed"
                checked={mastitis_test_performed || false}
                onChange={(e) => {
                  form.setValue('mastitis_test_performed', e.target.checked)
                  if (!e.target.checked) {
                    form.setValue('mastitis_result', null)
                    form.setValue('affected_quarters', null)
                  }
                }}
                className={`w-4 h-4 rounded border-stone-300 focus:ring-2 ${
                  settings?.requireMastitisTest
                    ? 'border-red-500 text-red-600 focus:ring-red-500'
                    : 'text-green-600 focus:ring-green-500'
                }`}
              />
              <Label htmlFor="mastitis_test_performed" className="cursor-pointer font-medium">
                Perform Mastitis Test
                {settings?.requireMastitisTest && (
                  <span className="ml-2 inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                    Required
                  </span>
                )}
              </Label>
            </div>
            <p className="text-xs text-stone-600 mt-1 ml-7">
              {settings?.requireMastitisTest
                ? 'Mastitis test is required before this record can be saved'
                : 'Check for signs of mastitis using CMT or similar test'}
            </p>
            {settings?.requireMastitisTest && !mastitis_test_performed && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                ⚠️ This record cannot be saved without performing a mastitis test
              </div>
            )}
          </div>

          {/* Mastitis Result */}
          {mastitis_test_performed && (
            <div>
              <Label htmlFor="mastitis_result">
                Test Result <span className="text-red-500">*</span>
              </Label>
              <select
                id="mastitis_result"
                value={mastitis_result || ''}
                onChange={(e) => {
                  form.setValue('mastitis_result', e.target.value as any || null)
                  if (e.target.value === 'negative') {
                    form.setValue('affected_quarters', null)
                  }
                }}
                className={`w-full mt-2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                  form.formState.errors.mastitis_result
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-stone-300 focus:ring-green-500'
                }`}
              >
                <option value="">Select result...</option>
                <option value="negative">✓ Negative - No mastitis</option>
                <option value="mild">⚠️ Mild - Slight signs</option>
                <option value="severe">✖️ Severe - Clear signs</option>
              </select>
              {form.formState.errors.mastitis_result && (
                <p className="text-xs text-red-600 mt-1 flex items-center space-x-1">
                  <span>⚠️ {(form.formState.errors.mastitis_result as any)?.message || 'Invalid selection'}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column — Status & Quarters */}
        <div className="space-y-4">
          {/* Affected Quarters */}
          {mastitis_test_performed && (mastitis_result === 'mild' || mastitis_result === 'severe') && (
            <div>
              <Label>Affected Quarters</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {QUARTERS.map(quarter => (
                  <label key={quarter.id} className="flex items-center space-x-2 cursor-pointer p-2 border border-stone-200 rounded hover:bg-stone-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={affected_quarters.includes(quarter.id)}
                      onChange={() => toggleQuarter(quarter.id)}
                      className="w-4 h-4 rounded border-stone-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-stone-700">{quarter.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Safety Status Info */}
          {mastitis_result === 'severe' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700 font-medium">
                ⚠️ This animal should be marked as "Unsafe - Health Issue" below
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
