// src/components/mobile/MobileNavigation.tsx
'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { 
  Home, 
  CalendarFold, 
  Heart,
  Coins,
  Droplets, 
  Wheat, 
  BarChart3,
  Warehouse, 
  Tractor,
  Users, 
  Settings,
  Menu,
  X
} from 'lucide-react'
import { GiCow } from 'react-icons/gi'

const mobileNavItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: GiCow, label: 'Herd Management', href: '/dashboard/animals' },
  { icon: CalendarFold, label: 'Breeding', href: '/dashboard/breeding' },
  { icon: Heart, label: 'Health', href: '/dashboard/health' },
  { icon: Droplets, label: 'Production', href: '/dashboard/production' },
  { icon: Wheat, label: 'Feed', href: '/dashboard/feed' },
  { icon: Coins, label: 'Finance', href: '/dashboard/financial' },
  { icon: Warehouse, label: 'Inventory', href: '/dashboard/inventory' },
  { icon: Tractor, label: 'Equipment', href: '/dashboard/equipment' },
  { icon: BarChart3, label: 'Reports', href: '/dashboard/reports' },
  { icon: Users, label: 'Team', href: '/dashboard/settings/team' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
]

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className={"logo"}>DairyTrack Pro</div>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Slide-out Menu */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setIsOpen(false)} />
          <nav className="fixed top-0 left-0 bottom-0 flex flex-col w-5/6 max-w-sm bg-white">
            <div className="px-4 py-3 bg-dairy-primary">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Menu</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-md text-white hover:bg-white hover:bg-opacity-20"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 px-4 py-4 space-y-1">
              {mobileNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center px-3 py-3 text-sm font-medium rounded-md',
                      isActive
                        ? 'bg-dairy-primary text-white'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="grid grid-cols-5 py-2">
          {mobileNavItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center py-2 px-1',
                  isActive ? 'text-dairy-primary' : 'text-gray-400'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs mt-1 text-center">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}