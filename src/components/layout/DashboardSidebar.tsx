// src/components/layout/DashboardSidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { GiCow } from 'react-icons/gi'
import { Home, LogOut, Settings, BarChart3, Warehouse, Tractor, Heart, Droplets, Wheat, Coins, CalendarFold } from 'lucide-react'
import { Button } from '../ui/Button'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { SupportButton } from '../support/SupportButton'

// Map database feature IDs to Navigation paths
const featureToRouteMap: Record<string, string> = {
  'breeding_records': '/dashboard/breeding',
  'health_records': '/dashboard/health',
  'milk_tracking': '/dashboard/production',
  'feed_tracking': '/dashboard/feed',
  'finance_tracking': '/dashboard/financial',
  'inventory_equipment': '/dashboard/inventory', // Maps to both inventory and equipment
  'performance_analysis_reporting_tools': '/dashboard/reports',
}

// Separate definition for equipment since it shares a feature flag
const equipmentRoute = '/dashboard/equipment'

const allNavigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, alwaysVisible: true },
  { name: 'Herd Management', href: '/dashboard/animals', icon: GiCow, alwaysVisible: true }, // Always visible if farm exists
  { name: 'Breeding', href: '/dashboard/breeding', icon: CalendarFold },
  { name: 'Health', href: '/dashboard/health', icon: Heart },
  { name: 'Production', href: '/dashboard/production', icon: Droplets },
  { name: 'Feed', href: '/dashboard/feed', icon: Wheat },
  { name: 'Finance', href: '/dashboard/financial', icon: Coins },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Warehouse },
  { name: 'Equipment', href: '/dashboard/equipment', icon: Tractor },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
]

const bottomNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface DashboardSidebarProps {
  trackingFeatures?: string[] | null
  animalCount?: number
  farmId?: string | null
}

export function DashboardSidebar({ 
  trackingFeatures = [], 
  animalCount = 0, 
  farmId 
}: DashboardSidebarProps) {
  const { signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)
  
  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      router.push('/auth')
    } catch (error) {
      console.error('Sign out error:', error)
      setIsSigningOut(false)
    }
  }

  const visibleNavigation = allNavigationItems.filter(item => {
    if (!farmId) {
        return item.href === '/dashboard';
    }

    if (item.href === '/dashboard') return true;

    if (animalCount === 0) {
      return item.name === 'Herd Management';
    }

    if (item.alwaysVisible) return true;

    if (!trackingFeatures || trackingFeatures.length === 0) return true;

    const isEnabled = Object.entries(featureToRouteMap).some(([feature, route]) => {
      if (trackingFeatures.includes(feature)) {
         if (route === item.href) return true;
         if (feature === 'inventory_equipment' && item.href === equipmentRoute) return true;
      }
      return false;
    });

    return isEnabled;
  })
  
  const renderNavItem = (item: typeof allNavigationItems[0]) => {
    const isActive = pathname === item.href
    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
          isActive
            ? 'bg-dairy-primary/10 text-dairy-primary'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        )}
      >
        <item.icon
          className={cn(
            'mr-3 h-5 w-5',
            isActive
              ? 'text-dairy-primary'
              : 'text-gray-400 group-hover:text-gray-500'
          )}
        />
        {item.name}
      </Link>
    )
  }
  
  return (
    <div className="hidden md:flex md:w-64 md:flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="flex flex-col flex-grow pt-5 bg-white border-r border-gray-200" style={{ height: '100%' }}>
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {visibleNavigation.map(renderNavItem)}
        </nav>
        
        <div className="mt-auto px-2 pb-4 space-y-1">
          {/* Support Button - ABOVE Settings */}
          <SupportButton farmId={farmId} />
          
          {/* Settings */}
          {farmId && bottomNavigation.map(renderNavItem)}
          
          {/* Sign Out Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full flex items-center justify-center space-x-2 mt-4"
          >
            <LogOut className="w-4 h-4" />
            <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}