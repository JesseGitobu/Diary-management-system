// src/components/production/ProductionSessionBanner.tsx
'use client'

import { Clock, AlertTriangle, Droplets } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ProductionSessionBannerProps {
  sessionName: string
  sessionTime: string
  isLate: boolean
  remainingAnimals: number
  totalEligibleAnimals: number
  onRecordClick: () => void
}

export function ProductionSessionBanner({
  sessionName,
  sessionTime,
  isLate,
  remainingAnimals,
  totalEligibleAnimals,
  onRecordClick
}: ProductionSessionBannerProps) {
  
  // Progress calculation
  const progress = Math.round(((totalEligibleAnimals - remainingAnimals) / totalEligibleAnimals) * 100) || 0

  // Do not render if task is complete
  if (remainingAnimals <= 0) return null

  return (
    <div 
      className={`
        w-full p-4 rounded-lg shadow-sm border-l-4 mb-6 transition-all duration-300
        ${isLate 
          ? 'bg-amber-50 border-amber-400' 
          : 'bg-blue-50 border-blue-500'
        }
      `}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left Side: Status & Time */}
        <div className="flex items-start space-x-3">
          <div className={`
            p-2 rounded-full 
            ${isLate ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}
          `}>
            {isLate ? <AlertTriangle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
          </div>
          
          <div>
            <h3 className={`font-bold text-lg capitalize ${isLate ? 'text-amber-800' : 'text-blue-800'}`}>
              {sessionName} Session {isLate && <span className="text-xs font-bold uppercase bg-amber-200 text-amber-800 px-2 py-0.5 rounded ml-2 align-middle">Late Entry</span>}
            </h3>
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <span>Scheduled: {sessionTime}</span>
              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
              <span>Today, {new Date().toLocaleDateString()}</span>
            </p>
          </div>
        </div>

        {/* Right Side: Progress & Action */}
        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="flex-1 md:flex-none min-w-[200px]">
            <div className="flex justify-between text-sm font-medium mb-1">
              <span className="text-gray-600">Milking Progress</span>
              <span className={isLate ? 'text-amber-700' : 'text-blue-700'}>
                {remainingAnimals} remaining
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isLate ? 'bg-amber-500' : 'bg-blue-500'}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1 text-right">
              {totalEligibleAnimals - remainingAnimals} of {totalEligibleAnimals} animals milked
            </p>
          </div>

          <Button 
            onClick={onRecordClick}
            className={`
              whitespace-nowrap shadow-sm
              ${isLate 
                ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            <Droplets className="w-4 h-4 mr-2" />
            Record Now
          </Button>
        </div>
      </div>
    </div>
  )
}