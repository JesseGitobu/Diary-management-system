//src/components/admin/AdminSidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Headphones, 
  CreditCard, 
  BarChart3,
  Settings,
  FileText,
  Activity,
  MessageSquare // New Icon for Inquiries
} from 'lucide-react'

const navigation = [
  { name: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Farms', href: '/admin/farms', icon: Building2 },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Support', href: '/admin/support', icon: Headphones },
  { name: 'Billing', href: '/admin/billing', icon: CreditCard },
  { name: 'Inquiries', href: '/admin/inquiries', icon: MessageSquare }, // ✅ Added here
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Monitoring', href: '/admin/monitoring', icon: Activity },
  { name: 'Audit Logs', href: '/admin/audit', icon: FileText },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  
  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 bg-white border-r border-gray-200 overflow-y-auto">
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                  isActive
                    ? 'bg-red-50 text-red-700 border-r-2 border-red-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5',
                    isActive
                      ? 'text-red-600'
                      : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
        
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            System Status: <span className="text-green-600 font-medium">Operational</span>
          </div>
        </div>
      </div>
    </div>
  )
}