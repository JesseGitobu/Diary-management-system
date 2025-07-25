// Health Record Quick Actions Component
// src/components/health/HealthRecordQuickActions.tsx

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Plus, Stethoscope, Syringe, Pill, Calendar } from 'lucide-react'

interface HealthRecordQuickActionsProps {
  animalId: string
  onQuickAdd: (animalId: string, recordType: string) => void
}

export function HealthRecordQuickActions({ animalId, onQuickAdd }: HealthRecordQuickActionsProps) {
  const quickActions = [
    {
      type: 'vaccination',
      label: 'Vaccination',
      icon: '💉',
      description: 'Record vaccination',
      color: 'bg-green-50 hover:bg-green-100 border-green-200'
    },
    {
      type: 'treatment',
      label: 'Treatment',
      icon: '💊',
      description: 'Medical treatment',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      type: 'checkup',
      label: 'Checkup',
      icon: '🩺',
      description: 'Routine checkup',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
    },
    {
      type: 'injury',
      label: 'Injury',
      icon: '🩹',
      description: 'Injury record',
      color: 'bg-red-50 hover:bg-red-100 border-red-200'
    }
  ]
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Plus className="w-5 h-5" />
          <span>Quick Add Health Record</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.type}
              onClick={() => onQuickAdd(animalId, action.type)}
              className={`p-3 rounded-lg border-2 transition-colors text-left ${action.color}`}
            >
              <div className="text-2xl mb-2">{action.icon}</div>
              <div className="font-medium text-sm">{action.label}</div>
              <div className="text-xs text-gray-600">{action.description}</div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}