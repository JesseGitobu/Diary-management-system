// components/settings/SettingsMainPage.tsx (UPDATED)

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import {
  Building2,
  Users,
  Tag,
  Droplets, // Changed from Milk
  Truck, // Added for combined icon
  Wheat,
  Heart,
  Bell,
  DollarSign,
  Database,
  CreditCard,
  ChevronRight,
  Settings as SettingsIcon,
  ArrowLeft
} from 'lucide-react'

interface SettingsMainPageProps {
  farmId: string
  userRole: string
  farmData: {
    name: string
    owner: string
    subscription_plan: string
  }
}

interface SettingSection {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  permissions: string[]
  badge?: string
}

export function SettingsMainPage({ farmId, userRole, farmData }: SettingsMainPageProps) {
  const router = useRouter()
  const { isMobile } = useDeviceInfo()

  const settingSections: SettingSection[] = [
    {
      id: 'farm-profile',
      title: 'Farm Profile',
      description: 'Farm details, location, and basic information',
      icon: <Building2 className="h-5 w-5" />,
      href: `/dashboard/settings/farm-profile?farmId=${farmId}`,
      permissions: ['farm_owner', 'farm_manager']
    },
    {
      id: 'users-roles',
      title: 'Users & Roles',
      description: 'Manage team members and their permissions',
      icon: <Users className="h-5 w-5" />,
      href: `/dashboard/settings/team?farmId=${farmId}`,
      permissions: ['farm_owner', 'farm_manager']
    },
    {
      id: 'animal-tagging',
      title: 'Animal Classification and Tagging',
      description: 'Configure animal identification and tagging preferences',
      icon: <Tag className="h-5 w-5" />,
      href: `/dashboard/settings/animal-tagging?farmId=${farmId}`,
      permissions: ['farm_owner', 'farm_manager', 'worker']
    },
    {
      id: 'production-distribution',
      title: 'Production & Distribution',
      description: 'Milk production tracking, quality settings, and distribution channels',
      icon: (
        <div className="flex items-center gap-1">
          <Droplets className="h-4 w-4" />
          <Truck className="h-4 w-4" />
        </div>
      ),
      href: `/dashboard/settings/production-distribution?farmId=${farmId}`,
      permissions: ['farm_owner', 'farm_manager'],
    },
    {
      id: 'feed-management',
      title: 'Feed Management',
      description: 'Feed types, rations, costs, and inventory alerts',
      icon: <Wheat className="h-5 w-5" />,
      href: `/dashboard/settings/feed-management?farmId=${farmId}`,
      permissions: ['farm_owner', 'farm_manager', 'worker']
    },
    {
      id: 'health-breeding',
      title: 'Health & Breeding',
      description: 'Vaccination schedules, treatments, and breeding preferences',
      icon: <Heart className="h-5 w-5" />,
      href: `/dashboard/settings/health-breeding?farmId=${farmId}`,
      permissions: ['farm_owner', 'farm_manager', 'veterinarian']
    },
    {
      id: 'notifications',
      title: 'Notifications & Alerts',
      description: 'Configure alerts and notification delivery methods',
      icon: <Bell className="h-5 w-5" />,
      href: `/dashboard/settings/notifications?farmId=${farmId}`,
      permissions: ['farm_owner', 'farm_manager', 'worker', 'veterinarian']
    },
    {
      id: 'financial',
      title: 'Financial Settings',
      description: 'Milk pricing, payments, and currency preferences',
      icon: <DollarSign className="h-5 w-5" />,
      href: `/dashboard/settings/financial?farmId=${farmId}`,
      permissions: ['farm_owner', 'farm_manager']
    },
    {
      id: 'data-backup',
      title: 'Data & Backup',
      description: 'Export options, sync settings, and backup preferences',
      icon: <Database className="h-5 w-5" />,
      href: `/dashboard/settings/data-backup?farmId=${farmId}`,
      permissions: ['farm_owner', 'farm_manager']
    },
    {
      id: 'subscription',
      title: 'Account & Subscription',
      description: 'Billing, plan details, and account management',
      icon: <CreditCard className="h-5 w-5" />,
      href: `/dashboard/settings/subscription?farmId=${farmId}`,
      permissions: ['farm_owner'],
      badge: farmData.subscription_plan
    }
  ]

  // Filter sections based on user permissions
  const accessibleSections = settingSections.filter(section =>
    section.permissions.includes(userRole)
  )

  const handleBack = () => {
    router.push(`/dashboard?farmId=${farmId}`)
  }

  return (
    <div className={`
      ${isMobile ? 'px-4 py-4' : 'dashboard-container'} 
      pb-20 lg:pb-6
    `}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {!isMobile && <span>Back to Dashboard</span>}
          </Button>
        </div>
        
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              Settings
            </h1>
            <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
              Configure {farmData.name} settings and preferences
            </p>
          </div>
        </div>
      </div>

      {/* Role Information */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Users className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">Your Role</span>
        </div>
        <p className="text-sm text-gray-600">
          You are logged in as <span className="font-medium">{userRole.replace('_', ' ')}</span>.
          {userRole !== 'farm_owner' && (
            <span> Some settings may be restricted based on your permissions.</span>
          )}
        </p>
      </div>

      {/* Settings Grid */}
      <div className={`
        grid gap-4 mt-6
        ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}
      `}>
        {accessibleSections.map((section) => (
          <Link key={section.id} href={section.href} className="block">
            <Card className="cursor-pointer hover:shadow-md transition-shadow duration-200 hover:border-gray-300 h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      {section.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className={isMobile ? "text-base" : "text-lg"}>
                        {section.title}
                      </CardTitle>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {section.badge && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        section.badge === 'New' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {section.badge}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className={isMobile ? "text-sm" : undefined}>
                  {section.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className={`mt-8 pt-6 border-t border-gray-200`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className={`flex flex-wrap gap-3 ${isMobile ? 'flex-col' : ''}`}>
          <Link href={`/dashboard/settings/data-backup?farmId=${farmId}`} className={isMobile ? 'w-full' : ''}>
            <Button
              variant="outline"
              className={`flex items-center space-x-2 ${isMobile ? 'w-full justify-center' : ''}`}
            >
              <Database className="w-4 h-4" />
              <span>Export Data</span>
            </Button>
          </Link>
          <Link href={`/dashboard/settings/notifications?farmId=${farmId}`} className={isMobile ? 'w-full' : ''}>
            <Button
              variant="outline"
              className={`flex items-center space-x-2 ${isMobile ? 'w-full justify-center' : ''}`}
            >
              <Bell className="w-4 h-4" />
              <span>Manage Alerts</span>
            </Button>
          </Link>
          {userRole === 'farm_owner' && (
            <Link href={`/dashboard/settings/team?farmId=${farmId}`} className={isMobile ? 'w-full' : ''}>
              <Button
                variant="outline"
                className={`flex items-center space-x-2 ${isMobile ? 'w-full justify-center' : ''}`}
              >
                <Users className="w-4 h-4" />
                <span>Add Team Member</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}