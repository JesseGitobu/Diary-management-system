'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { Home, Users, Settings, BarChart3, Dog, Heart, Droplets, Wheat, Coins } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Animals', href: '/dashboard/animals', icon: Dog },
   { name: 'Breeding', href: '/dashboard/breeding', icon: Heart },
   { name: 'Health', href: '/dashboard/health', icon: Heart },
  { name: 'Production', href: '/dashboard/production', icon: Droplets },  // NEW
  { name: 'Feed', href: '/dashboard/feed', icon: Wheat },    // NEW
  { name: 'Finance', href: '/dashboard/financial', icon: Coins },  // NEW
  { name: 'Inventory', href: '/dashboard/inventory', icon: Wheat },
  { name: 'Equipment', href: '/dashboard/equipment', icon: Wheat },
  // { name: 'Tasks', href: '/dashboard/tasks', icon: Wheat },
  // { name: 'Calendar', href: '/dashboard/calendar', icon: Wheat },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Team', href: '/dashboard/settings/team', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  
  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 bg-white border-r border-gray-200 overflow-y-auto">
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                  isActive
                    ? 'bg-farm-green/10 text-farm-green'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5',
                    isActive
                      ? 'text-farm-green'
                      : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}