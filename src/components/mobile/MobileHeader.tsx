'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/Button'
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
  User, 
  Settings,
  Menu,
  X
} from 'lucide-react'
import { GiCow } from 'react-icons/gi'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

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

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, signOut } = useAuth()
  const pathname = usePathname()

  return (
    <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center">
          <div className={"logo"}>DairyTrack Pro</div>
        </Link>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>
      
      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
      )}
      
      {/* Mobile Menu */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-80 bg-white shadow-lg transform transition-transform duration-300 z-50",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* User Info */}
          <div className="flex items-center space-x-3 mb-6 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-dairy-primary rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {user?.user_metadata?.full_name || user?.email}
              </p>
              <p className="text-sm text-gray-600">Farm Owner</p>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="space-y-2">
            {mobileNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-dairy-primary text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
          
          
        </div>
      </div>
    </header>
  )
}