'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Heart, Baby, TrendingUp, Clock, Search } from 'lucide-react'

interface BreedingStatsCardsProps {
  stats: {
    totalBreedings: number
    heatDetected: number
    currentPregnant: number
    expectedCalvingsThisMonth: number
    conceptionRate: number
  }
}

export function BreedingStatsCards({ stats }: BreedingStatsCardsProps) {
  const getConceptionRateColor = (rate: number) => {
    if (rate >= 60) return 'text-green-600'
    if (rate >= 45) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConceptionRateStatus = (rate: number) => {
    if (rate >= 60) return 'Excellent'
    if (rate >= 45) return 'Good'
    return 'Needs attention'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Breedings</CardTitle>
          <Heart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalBreedings}</div>
          <p className="text-xs text-muted-foreground">
            All time breeding records
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Heat Detected</CardTitle>
          <Search className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.heatDetected}</div>
          <p className="text-xs text-muted-foreground">
            Last 30 days
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Currently Pregnant</CardTitle>
          <Baby className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.currentPregnant}</div>
          <p className="text-xs text-muted-foreground">
            Confirmed pregnancies
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expected Calvings</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.expectedCalvingsThisMonth}</div>
          <p className="text-xs text-muted-foreground">
            This month
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conception Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getConceptionRateColor(stats.conceptionRate)}`}>
            {stats.conceptionRate}%
          </div>
          <p className="text-xs text-muted-foreground">
            {getConceptionRateStatus(stats.conceptionRate)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}