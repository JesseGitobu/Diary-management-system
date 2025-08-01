'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { Home, Plus, BarChart3, User } from 'lucide-react'
import { GiCow } from 'react-icons/gi'

const bottomNavItems = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Animals', href: '/dashboard/animals', icon: GiCow },
  { name: 'Add', href: '/dashboard/animals/add', icon: Plus, isSpecial: true },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Profile', href: '/dashboard/settings', icon: User },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
      <div className="flex items-center justify-around">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          
          if (item.isSpecial) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center w-12 h-12 bg-dairy-primary rounded-full text-white shadow-lg"
              >
                <item.icon className="w-6 h-6" />
              </Link>
            )
          }
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors min-w-[60px]",
                isActive
                  ? "text-dairy-primary bg-dairy-primary/10"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}