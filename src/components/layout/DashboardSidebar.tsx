'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { GiCow } from 'react-icons/gi'
import { Home, LogOut, Users, Settings, BarChart3, Warehouse, Tractor, Heart, Droplets, Wheat, Coins, CalendarFold } from 'lucide-react'
import { Button } from '../ui/Button'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'

// Main navigation items (will stay at the top)
const mainNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Herd Management', href: '/dashboard/animals', icon: GiCow },
  { name: 'Breeding', href: '/dashboard/breeding', icon: CalendarFold },
  { name: 'Health', href: '/dashboard/health', icon: Heart },
  { name: 'Production', href: '/dashboard/production', icon: Droplets },
  { name: 'Feed', href: '/dashboard/feed', icon: Wheat },
  { name: 'Finance', href: '/dashboard/financial', icon: Coins },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Warehouse },
  { name: 'Equipment', href: '/dashboard/equipment', icon: Tractor },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Team', href: '/dashboard/settings/team', icon: Users },
]

// Bottom navigation items (will be pushed to the bottom)
const bottomNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function DashboardSidebar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  
  const handleSignOut = async () => {
    try {
      await signOut()
      // Router push as backup (signOut should handle redirect)
      router.push('/')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }
  
  const renderNavItem = (item: typeof mainNavigation[0]) => {
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
        {/* Main Navigation - Top Section */}
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {mainNavigation.map(renderNavItem)}
        </nav>
        
        {/* Bottom Section - Settings and Sign Out */}
        <div className="mt-auto px-2 pb-4 space-y-1">
          {/* Bottom Navigation Items */}
          {bottomNavigation.map(renderNavItem)}
          
          {/* Sign Out Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center space-x-2 mt-4"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    </div>
  )
}