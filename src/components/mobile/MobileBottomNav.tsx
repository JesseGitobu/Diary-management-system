// src/components/mobile/MobileBottomNav.tsx
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
        href: '#',
        icon: Zap,
        color: 'text-orange-600',
        isModal: true,
        modalAction: 'showHeatDetectionModal'
      },
      {
        id: 'insemination',
        label: 'Insemination Record',
        href: '#',
        icon: Beaker,
        color: 'text-blue-600',
        isModal: true,
        modalAction: 'showInseminationModal'
      },
      {
        id: 'pregnancy-check',
        label: 'Pregnancy Check',
        href: '#',
        icon: Activity,
        color: 'text-pink-600',
        isModal: true,
        modalAction: 'showPregnancyCheckModal'
      },
      {
        id: 'calving-event',
        label: 'Calving Event',
        href: '#',
        icon: Heart,
        color: 'text-red-600',
        isModal: true,
        modalAction: 'showCalvingEventModal'
      }
    ]
  },
  {
    id: 'add-health',
    label: 'Add Health Record',
    href: '#',
    icon: HeartIcon,
    color: 'text-red-600',
    isSubmenu: true,
    submenuItems: [
      {
        id: 'health-record',
        label: 'Health Record',
        href: '#',
        icon: FileText,
        color: 'text-blue-600',
        isModal: true,
        modalAction: 'showHealthRecordModal'
      },
      {
        id: 'schedule-vaccination',
        label: 'Schedule Vaccination',
        href: '#',
        icon: Zap,
        color: 'text-green-600',
        isModal: true,
        modalAction: 'showVaccinationModal'
      },
      {
        id: 'schedule-visit',
        label: 'Schedule Vet Visit',
        href: '#',
        icon: Calendar,
        color: 'text-blue-600',
        isModal: true,
        modalAction: 'showVetVisitModal'
      },
      {
        id: 'add-veterinarian',
        label: 'Add Veterinarian',
        href: '#',
        icon: User,
        color: 'text-indigo-600',
        isModal: true,
        modalAction: 'showVeterinarianModal'
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
        href: '#', // Changed from link
        icon: Droplets,
        color: 'text-cyan-600',
        isModal: true, // ADD THIS
        modalAction: 'showRecordProductionModal' // ADD THIS
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
        href: '#', // Changed from link
        icon: Truck,
        color: 'text-blue-600',
        isModal: true, // ADD THIS
        modalAction: 'showRecordDistributionModal' // ADD THIS
      },
      {
        id: 'manage-channels',
        label: 'Manage Channels',
        href: '#', // Changed from link
        icon: Settings,
        color: 'text-purple-600',
        isModal: true, // ADD THIS
        modalAction: 'showManageChannelsModal' // ADD THIS
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
        href: '#',
        icon: Wheat,
        color: 'text-amber-600',
        isModal: true,
        modalAction: 'showRecordFeedingModal'
      },
      {
        id: 'add-feed-type',
        label: 'Add Feed Type',
        href: '#', // Changed from link to #
        icon: FileText,
        color: 'text-blue-600',
        isModal: true, // Added
        modalAction: 'showAddFeedTypeModal' // Matches GlobalModalWrapper
      },
      {
        id: 'add-inventory',
        label: 'Add Inventory',
        href: '#', // Changed from link to #
        icon: BarChart3,
        color: 'text-green-600',
        isModal: true, // Added
        modalAction: 'showAddInventoryModal' // Matches GlobalModalWrapper
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

  const closeMenu = () => {
    setShowActionSheet(false)
    setCurrentMenu('main')
    setSelectedMenuItems(null)
  }

  const handleItemClick = (item: any) => {
    if (item.isSubmenu) {
      handleSubmenuOpen(item)
    } else if (item.isModal) {
      // 1. Dispatch custom event to GlobalModalWrapper
      window.dispatchEvent(
        new CustomEvent('mobileNavModalAction', {
          detail: { action: item.modalAction }
        })
      )
      // 2. Close the menu immediately
      closeMenu()
    } else {
      // 3. Handle standard links
      if (item.href && item.href !== '#') {
        window.location.href = item.href
      }
      closeMenu()
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
                  // Preserved your exact styling (bg-dairy-primary)
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
                  // Preserved your exact active styling (text-dairy-primary)
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
          onClick={closeMenu}
        />
      )}

      {/* Action Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-lg transform transition-transform duration-300 lg:hidden flex flex-col",
          showActionSheet ? "translate-y-0" : "translate-y-full"
        )}
        style={{ maxHeight: '85vh' }}
      >
        <div className="p-4 overflow-y-auto">
          {/* Header with Back Button for Submenu */}
          <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 pb-2 border-b border-gray-100">
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
              onClick={closeMenu}
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
                    <div className={cn("w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0", item.color)}>
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
                    onClick={() => handleItemClick(subItem)}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors active:bg-gray-100 text-left"
                  >
                    <div className={cn("w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0", subItem.color)}>
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