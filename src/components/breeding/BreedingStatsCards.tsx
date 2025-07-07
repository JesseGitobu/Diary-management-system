'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Heart, Baby, TrendingUp, Clock } from 'lucide-react'

interface BreedingStatsCardsProps {
  stats: {
    totalBreedings: number
    currentPregnant: number
    expectedCalvingsThisMonth: number
    conceptionRate: number
  }
}

export function BreedingStatsCards({ stats }: BreedingStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
          <div className="text-2xl font-bold">{stats.conceptionRate}%</div>
          <p className="text-xs text-muted-foreground">
            {stats.conceptionRate >= 60 ? 'Excellent' : stats.conceptionRate >= 45 ? 'Good' : 'Needs attention'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}