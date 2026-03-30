'use client'

import { useState } from 'react'
import { ChevronDown, Plus, Settings, Target } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu'

interface QuickActionsDropdownProps {
  onRecordProduction: () => void
  onManageMilkingGroups: () => void
  onSetTargets: () => void
  isMobile?: boolean
}

export function QuickActionsDropdown({
  onRecordProduction,
  onManageMilkingGroups,
  onSetTargets,
  isMobile = false
}: QuickActionsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Quick Actions
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onRecordProduction} className="flex items-center gap-2 cursor-pointer">
          <Plus className="h-4 w-4 text-blue-600" />
          <span>Record Production</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onManageMilkingGroups} className="flex items-center gap-2 cursor-pointer">
          <Settings className="h-4 w-4 text-purple-600" />
          <span>Manage Milking Groups</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onSetTargets} className="flex items-center gap-2 cursor-pointer">
          <Target className="h-4 w-4 text-green-600" />
          <span>Set Targets</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
