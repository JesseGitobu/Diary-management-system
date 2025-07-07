'use client'

import { Button } from '@/components/ui/Button'
import { Plus, Droplets, Wheat, FileText, Camera } from 'lucide-react'
import Link from 'next/link'

export function QuickActionButtons() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-white rounded-lg shadow-sm border">
      <Button asChild className="h-16 flex-col space-y-1" variant="outline">
        <Link href="/dashboard/animals/add">
          <Plus className="h-6 w-6" />
          <span className="text-xs">Add Animal</span>
        </Link>
      </Button>
      
      <Button asChild className="h-16 flex-col space-y-1" variant="outline">
        <Link href="/dashboard/production/quick-entry">
          <Droplets className="h-6 w-6" />
          <span className="text-xs">Log Production</span>
        </Link>
      </Button>
      
      <Button asChild className="h-16 flex-col space-y-1" variant="outline">
        <Link href="/dashboard/feed/quick-entry">
          <Wheat className="h-6 w-6" />
          <span className="text-xs">Record Feed</span>
        </Link>
      </Button>
      
      <Button asChild className="h-16 flex-col space-y-1" variant="outline">
        <Link href="/dashboard/reports">
          <FileText className="h-6 w-6" />
          <span className="text-xs">View Reports</span>
        </Link>
      </Button>
    </div>
  )
}