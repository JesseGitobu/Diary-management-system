'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { 
  Home, 
  Plus, 
  BarChart3, 
  User, 
  X,
  ChevronLeft,
  FileText,
  Heart,
  Droplets,
  Wheat,
  TrendingUp,
  Activity,
  Beaker,
  Zap,
  Calendar,
  Heart as HeartIcon,
  Truck,
  Settings
} from 'lucide-react'
import { GiCow } from 'react-icons/gi'
import { Button } from '@/components/ui/Button'

const bottomNavItems = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Animals', href: '/dashboard/animals', icon: GiCow },
  { name: 'Add', href: '#', icon: Plus, isSpecial: true },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Profile', href: '/dashboard/settings', icon: User },
]

const quickAddItems = [
  {
    id: 'add-animal',
    label: 'Add Animal Record',
    href: '#',
    icon: GiCow,
    color: 'text-blue-600',
    isModal: true,
    modalAction: 'showAddAnimalModal'
  },
  {
    id: 'add-breeding',
    label: 'Add Breeding Record',
    href: '#',
    icon: FileText,
    color: 'text-purple-600',
    isSubmenu: true,
    submenuItems: [
      {
        id: 'heat-detection',
        label: 'Heat Detection',
        href: '/dashboard/breeding/heat-detection/add',
        icon: Zap,
        color: 'text-orange-600'
      },
      {
        id: 'insemination',
        label: 'Insemination Record',
        href: '/dashboard/breeding/insemination/add',
        icon: Beaker,
        color: 'text-blue-600'
      },
      {
        id: 'pregnancy-check',
        label: 'Pregnancy Check',
        href: '/dashboard/breeding/pregnancy-check/add',
        icon: Activity,
        color: 'text-pink-600'
      },
      {
        id: 'calving-event',
        label: 'Calving Event',
        href: '/dashboard/breeding/calving/add',
        icon: Heart,
        color: 'text-red-600'
      }
    ]
  },
  {
    id: 'add-health',
    label: 'Add Health Record',
    href: '#',
    icon: Heart,
    color: 'text-red-600',
    isSubmenu: true,
    submenuItems: [
      {
        id: 'health-record',
        label: 'Health Record',
        href: '/dashboard/health/add',
        icon: FileText,
        color: 'text-blue-600'
      },
      {
        id: 'schedule-vaccination',
        label: 'Schedule Vaccination',
        href: '/dashboard/health/vaccination/add',
        icon: Zap,
        color: 'text-green-600'
      },
      {
        id: 'schedule-visit',
        label: 'Schedule Vet Visit',
        href: '/dashboard/health/visit/add',
        icon: Calendar,
        color: 'text-blue-600'
      },
      {
        id: 'add-veterinarian',
        label: 'Add Veterinarian',
        href: '/dashboard/health/veterinarian/add',
        icon: User,
        color: 'text-indigo-600'
      }
    ]
  },
  {
    id: 'add-production',
    label: 'Add Production Record',
    href: '#',
    icon: Droplets,
    color: 'text-cyan-600',
    isSubmenu: true,
    submenuItems: [
      {
        id: 'record-production',
        label: 'Record Production',
        href: '/dashboard/production/add',
        icon: Droplets,
        color: 'text-cyan-600'
      },
      {
        id: 'bulk-entry',
        label: 'Bulk Entry',
        href: '/dashboard/production/bulk',
        icon: BarChart3,
        color: 'text-purple-600'
      },
      {
        id: 'export-data',
        label: 'Export Data',
        href: '/dashboard/production/export',
        icon: TrendingUp,
        color: 'text-green-600'
      },
      {
        id: 'view-reports',
        label: 'View Reports',
        href: '/dashboard/production/reports',
        icon: FileText,
        color: 'text-indigo-600'
      }
    ]
  },
  {
    id: 'add-distribution',
    label: 'Add Distribution Record',
    href: '#',
    icon: Truck,
    color: 'text-orange-600',
    isSubmenu: true,
    submenuItems: [
      {
        id: 'record-distribution',
        label: 'Record Distribution',
        href: '/dashboard/distribution/add',
        icon: Truck,
        color: 'text-blue-600'
      },
      {
        id: 'manage-channels',
        label: 'Manage Channels',
        href: '/dashboard/distribution/channels',
        icon: Settings,
        color: 'text-purple-600'
      },
      {
        id: 'export-distribution',
        label: 'Export Data',
        href: '/dashboard/distribution/export',
        icon: TrendingUp,
        color: 'text-green-600'
      },
      {
        id: 'view-distribution-reports',
        label: 'View Routes',
        href: '/dashboard/distribution/routes',
        icon: FileText,
        color: 'text-indigo-600'
      }
    ]
  },
  {
    id: 'add-feed',
    label: 'Add Feed Record',
    href: '#',
    icon: Wheat,
    color: 'text-amber-600',
    isSubmenu: true,
    submenuItems: [
      {
        id: 'record-feeding',
        label: 'Record Feeding',
        href: '/dashboard/feed/add',
        icon: Wheat,
        color: 'text-amber-600'
      },
      {
        id: 'add-feed-type',
        label: 'Add Feed Type',
        href: '/dashboard/feed/type/add',
        icon: FileText,
        color: 'text-blue-600'
      },
      {
        id: 'add-inventory',
        label: 'Add Inventory',
        href: '/dashboard/feed/inventory/add',
        icon: BarChart3,
        color: 'text-green-600'
      }
    ]
  }
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [currentMenu, setCurrentMenu] = useState<'main' | 'submenu'>('main')
  const [selectedMenuItems, setSelectedMenuItems] = useState<any>(null)

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowActionSheet(true)
  }

  const handleSubmenuOpen = (item: any) => {
    if (item.isSubmenu) {
      setSelectedMenuItems(item)
      setCurrentMenu('submenu')
    }
  }

  const handleBackToMain = () => {
    setCurrentMenu('main')
    setSelectedMenuItems(null)
  }

  const handleItemClick = (item: any) => {
    if (item.isSubmenu) {
      handleSubmenuOpen(item)
    } else if (item.isModal) {
      // Dispatch custom event for modal action
      window.dispatchEvent(new CustomEvent('mobileNavModalAction', { detail: { action: item.modalAction } }))
      setShowActionSheet(false)
      setCurrentMenu('main')
      setSelectedMenuItems(null)
    } else {
      setShowActionSheet(false)
      setCurrentMenu('main')
      setSelectedMenuItems(null)
    }
  }

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb z-40">
        <div className="flex items-center justify-around">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            
            if (item.isSpecial) {
              return (
                <button
                  key={item.name}
                  onClick={handleAddClick}
                  className="flex flex-col items-center justify-center w-12 h-12 bg-dairy-primary rounded-full text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                  <item.icon className="w-6 h-6" />
                </button>
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

      {/* Action Sheet Overlay */}
      {showActionSheet && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50 lg:hidden"
          onClick={() => {
            setShowActionSheet(false)
            setCurrentMenu('main')
            setSelectedMenuItems(null)
          }}
        />
      )}

      {/* Action Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-lg transform transition-transform duration-300 lg:hidden",
          showActionSheet ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="p-4 max-h-[90vh] overflow-y-auto">
          {/* Header with Back Button for Submenu */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              {currentMenu === 'submenu' && (
                <button
                  onClick={handleBackToMain}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-lg font-semibold text-gray-900">
                {currentMenu === 'main' ? 'Quick Add' : selectedMenuItems?.label}
              </h2>
            </div>
            <button
              onClick={() => {
                setShowActionSheet(false)
                setCurrentMenu('main')
                setSelectedMenuItems(null)
              }}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Menu Items */}
          {currentMenu === 'main' && (
            <div className="space-y-2 pb-6">
              {quickAddItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors active:bg-gray-100 text-left"
                  >
                    <div className={cn("w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center", item.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-gray-900 font-medium flex-1">{item.label}</span>
                    {item.isSubmenu && (
                      <ChevronLeft className="w-4 h-4 text-gray-400 transform rotate-180" />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Submenu Items */}
          {currentMenu === 'submenu' && selectedMenuItems?.submenuItems && (
            <div className="space-y-2 pb-6">
              {selectedMenuItems.submenuItems.map((subItem: any) => {
                const Icon = subItem.icon
                return (
                  <button
                    key={subItem.id}
                    onClick={() => {
                      if (subItem.isModal) {
                        window.dispatchEvent(new CustomEvent('mobileNavModalAction', { detail: { action: subItem.modalAction } }))
                        setShowActionSheet(false)
                        setCurrentMenu('main')
                        setSelectedMenuItems(null)
                      } else {
                        // Handle regular link navigation
                        window.location.href = subItem.href
                      }
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors active:bg-gray-100 text-left"
                  >
                    <div className={cn("w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center", subItem.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-gray-900 font-medium">{subItem.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}