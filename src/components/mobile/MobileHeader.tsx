// src/components/mobile/MobileHeader.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
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
  X,
  LogOut,
  HelpCircle
} from 'lucide-react'
import { GiCow } from 'react-icons/gi'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { SupportModal } from '@/components/support/SupportModal'

interface MobileHeaderProps {
  trackingFeatures?: string[] | null
  animalCount?: number
  farmId?: string | null
}

const allNavItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: GiCow, label: 'Herd Management', href: '/dashboard/animals' },
  { icon: CalendarFold, label: 'Breeding', href: '/dashboard/breeding', feature: 'breeding_records' },
  { icon: Heart, label: 'Health', href: '/dashboard/health', feature: 'health_records' },
  { icon: Droplets, label: 'Production', href: '/dashboard/production', feature: 'milk_tracking' },
  { icon: Wheat, label: 'Feed', href: '/dashboard/feed', feature: 'feed_tracking' },
  { icon: Coins, label: 'Finance', href: '/dashboard/financial', feature: 'finance_tracking' },
  { icon: Warehouse, label: 'Inventory', href: '/dashboard/inventory', feature: 'inventory_equipment' },
  { icon: Tractor, label: 'Equipment', href: '/dashboard/equipment', feature: 'inventory_equipment' },
  { icon: BarChart3, label: 'Reports', href: '/dashboard/reports', feature: 'performance_analysis_reporting_tools' },
  { icon: Users, label: 'Team', href: '/dashboard/settings/team' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
]

export function MobileHeader({ trackingFeatures = [], animalCount = 0, farmId }: MobileHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Sign out error:', error)
      setIsSigningOut(false)
    }
  }

  const visibleItems = allNavItems.filter(item => {
    if (!farmId) return item.href === '/dashboard';

    if (item.href === '/dashboard') return true;
    if (item.href === '/dashboard/settings') return true;

    if (animalCount === 0) {
      return item.label === 'Herd Management';
    }

    if (!item.feature) return true;
    if (!trackingFeatures || trackingFeatures.length === 0) return true;

    return trackingFeatures.includes(item.feature);
  })

  return (
    <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center">
          <div className="logo">DairyTrack Pro</div>
        </Link>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="p-2" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
      )}

      <div className={cn(
        "fixed top-0 right-0 bottom-0 w-80 bg-white shadow-lg transform transition-transform duration-300 z-50 flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-dairy-primary rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 break-words">
                  {user?.user_metadata?.full_name || user?.email}
                </p>
                <p className="text-sm text-gray-600">Farm Owner</p>
              </div>

              <button
                className="p-2 text-gray-500 hover:bg-white hover:text-dairy-primary hover:shadow-sm rounded-lg transition-all disabled:opacity-50 flex-shrink-0"
                aria-label="Sign Out"
                onClick={handleSignOut}
                disabled={isSigningOut}
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          {visibleItems.map((item) => {
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

          {/* Support Link */}
          {farmId && (
            <button
              onClick={() => {
                setShowSupport(true)
                setIsOpen(false)
              }}
              className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-100"
            >
              <HelpCircle className="w-5 h-5" />
              <span>Support & Help</span>
            </button>
          )}
        </nav>
      </div>

      {/* Support Modal */}
      {farmId && (
        <SupportModal
          isOpen={showSupport}
          onClose={() => setShowSupport(false)}
          farmId={farmId}
        />
      )}
    </header>
  )
}