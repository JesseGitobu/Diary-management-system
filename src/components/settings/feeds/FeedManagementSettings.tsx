// src/components/settings/feeds/FeedManagementSettings.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { FeedTypeCategoriesManager } from '@/components/settings/feeds/FeedTypeCategoriesManager'
import { FeedUnitConversionsManager } from '@/components/settings/feeds/FeedUnitConversionsManager'
import { FeedSettingsManager } from '@/components/settings/feeds/FeedSettingsManager'
import { FeedTypesTab } from '@/components/settings/feeds/FeedTypesTab'
import { AddFeedTypeModal } from '@/components/settings/feeds/AddFeedTypeModal'
import type { FeedTimeSlot, FeedAlertSetting, FeedFrequencyDefault } from '@/lib/database/feedSettingsConstants'
import {
  ArrowLeft,
  Wheat,
  Tags,
  Scale,
  Settings,
  Info,
  MoreVertical,
  Plus,
  Package,
} from 'lucide-react'

interface FeedManagementSettingsProps {
  farmId: string
  userRole: string
  feedTypeCategories: any[]
  feedTypes?: any[]
  weightConversions: any[]
  animalCategories: any[]
  timeSlots: FeedTimeSlot[]
  alertSettings: FeedAlertSetting[]
  frequencyDefaults: FeedFrequencyDefault[]
  initialTab?: string
}

export function FeedManagementSettings({
  farmId,
  userRole,
  feedTypeCategories: initialFeedTypeCategories,
  feedTypes: initialFeedTypes = [],
  weightConversions: initialWeightConversions,
  animalCategories: initialAnimalCategories,
  timeSlots: initialTimeSlots,
  alertSettings: initialAlertSettings,
  frequencyDefaults: initialFrequencyDefaults,
  initialTab = 'feed-categories',
}: FeedManagementSettingsProps) {
  const router = useRouter()
  const { isMobile } = useDeviceInfo()
  const [activeTab, setActiveTab] = useState(initialTab)

  const [feedTypeCategories, setFeedTypeCategories] = useState(initialFeedTypeCategories)
  const [feedTypes, setFeedTypes] = useState(initialFeedTypes)
  const [weightConversions, setWeightConversions] = useState(initialWeightConversions)
  const [animalCategories] = useState(initialAnimalCategories)
  const [timeSlots, setTimeSlots] = useState<FeedTimeSlot[]>(initialTimeSlots)
  const [alertSettings, setAlertSettings] = useState<FeedAlertSetting[]>(initialAlertSettings)
  const [frequencyDefaults, setFrequencyDefaults] = useState<FeedFrequencyDefault[]>(initialFrequencyDefaults)
  const [showAddFeedTypeModal, setShowAddFeedTypeModal] = useState(false)

  const canManageSettings = ['farm_owner', 'farm_manager'].includes(userRole)

  const handleFeedTypeAdded = useCallback((newFeedType: any) => {
    setFeedTypes(prev => [...prev, newFeedType])
  }, [])

  const handleFeedTypeUpdated = useCallback((updatedFeedType: any) => {
    setFeedTypes(prev => prev.map(ft =>
      ft.id === updatedFeedType.id ? updatedFeedType : ft
    ))
  }, [])

  const handleFeedTypeDeleted = useCallback((feedTypeId: string) => {
    setFeedTypes(prev => prev.filter(ft => ft.id !== feedTypeId))
  }, [])

  const QuickActionsMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={isMobile ? 'sm' : 'default'} className="gap-2">
          <MoreVertical className="w-4 h-4" />
          {!isMobile && 'Quick Actions'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => setShowAddFeedTypeModal(true)}>
          <Package className="w-4 h-4 mr-2" />
          <span>Add Feed Type</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="text-xs text-gray-500">
          More actions coming soon
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const tabConfig = [

    {
      id: 'feed-categories',
      label: isMobile ? 'Categories' : 'Feed Type Categories',
      icon: <Tags className="w-4 h-4" />,
    },
    {
      id: 'feed-types',
      label: isMobile ? 'Types' : 'Feed Types',
      icon: <Package className="w-4 h-4" />,
    },
    {
      id: 'weight-conversions',
      label: isMobile ? 'Weights' : 'Weight Conversions',
      icon: <Scale className="w-4 h-4" />,
    },
    {
      id: 'feed-settings',
      label: isMobile ? 'Settings' : 'Feed Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ]

  return (
    <div className={`${isMobile ? 'px-4 py-4' : 'dashboard-container'} pb-20 lg:pb-6`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/dashboard/settings?farmId=${farmId}`)}
            className={`flex items-center space-x-2 ${isMobile ? '' : ''}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className={isMobile ? 'ml-2' : ''}>Back to Settings</span>
          </Button>
          {canManageSettings && <QuickActionsMenu />}
        </div>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Wheat className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              Feed Management Settings
            </h1>
            <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
              Configure feed categories, weight conversions, feeding schedules, and alerts
            </p>
          </div>
        </div>

        {!canManageSettings && (
          <Card className="border-amber-200 bg-amber-50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">Read-Only Access</h4>
                  <p className="text-sm text-amber-700">
                    Contact your farm owner or manager to make changes to these settings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Overview stats */}
      <div className={`grid gap-4 mb-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{feedTypeCategories.length}</div>
            <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Feed Categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{feedTypes.length}</div>
            <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Feed Types</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{timeSlots.filter(s => s.is_active).length}</div>
            <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Feeding Slots</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-600">{frequencyDefaults.length}</div>
            <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Category Defaults</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`
          ${isMobile
            ? 'w-full h-auto p-1 flex gap-1 overflow-x-auto'
            : 'h-12 w-auto inline-flex gap-2 justify-start'
          }
        `}>
          {tabConfig.map(tab => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={
                isMobile
                  ? 'text-xs px-2 py-2 h-10'
                  : 'text-sm px-6 py-2 h-10 min-w-[160px] flex items-center space-x-2'
              }
            >
              {tab.icon}
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Feed Types */}
        <TabsContent value="feed-types">
          <FeedTypesTab
            feedTypes={feedTypes}
            isMobile={isMobile}
            canManageFeed={canManageSettings}
            farmId={farmId}
            onAddFeedType={() => setShowAddFeedTypeModal(true)}
            onFeedTypeUpdated={handleFeedTypeUpdated}
            onFeedTypeDeleted={handleFeedTypeDeleted}
            feedTypeCategories={feedTypeCategories}
            animalCategories={animalCategories}
            weightConversions={weightConversions}
          />
        </TabsContent>

        {/* Feed Type Categories */}
        <TabsContent value="feed-categories">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Tags className="w-5 h-5" />
                <span>Feed Type Categories</span>
              </CardTitle>
              <CardDescription>
                Organise your feed types into categories for better reporting and inventory management.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeedTypeCategoriesManager
                farmId={farmId}
                categories={feedTypeCategories}
                onCategoriesUpdate={setFeedTypeCategories}
                canEdit={canManageSettings}
                isMobile={isMobile}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weight Conversions */}
        <TabsContent value="weight-conversions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Scale className="w-5 h-5" />
                <span>Weight Conversions</span>
              </CardTitle>
              <CardDescription>
                Set up custom weight units and conversions so you can record feed quantities using
                containers or local measurements instead of scales.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeedUnitConversionsManager
                farmId={farmId}
                conversions={weightConversions}
                onConversionsUpdate={setWeightConversions}
                canEdit={canManageSettings}
                isMobile={isMobile}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feed Settings – replaces Consumption Batches */}
        <TabsContent value="feed-settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Feed Settings</span>
              </CardTitle>
              <CardDescription>
                Define feeding time slots, configure alert thresholds for low stock and waste, and set
                default feeding frequencies per animal category.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeedSettingsManager
                farmId={farmId}
                timeSlots={timeSlots}
                alertSettings={alertSettings}
                frequencyDefaults={frequencyDefaults}
                animalCategories={animalCategories}
                onTimeSlotsUpdate={setTimeSlots}
                onAlertSettingsUpdate={setAlertSettings}
                onFrequencyDefaultsUpdate={setFrequencyDefaults}
                canEdit={canManageSettings}
                isMobile={isMobile}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddFeedTypeModal
        farmId={farmId}
        isOpen={showAddFeedTypeModal}
        onClose={() => setShowAddFeedTypeModal(false)}
        onSuccess={handleFeedTypeAdded}
        feedTypeCategories={feedTypeCategories}
        animalCategories={animalCategories}
        weightConversions={weightConversions}
      />

      {/* Help text */}
      <Card className="mt-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 mb-1">How These Settings Work Together</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Feed Type Categories</strong> organise feeds into logical groups for reporting</li>
                <li>• <strong>Weight Conversions</strong> let you record quantities using local measurements</li>
                <li>• <strong>Feeding Time Slots</strong> define named windows (Morning, Afternoon, Evening) used when logging consumption</li>
                <li>• <strong>Alert Thresholds</strong> control when the system notifies you about low stock, expiry, or excess waste</li>
                <li>• <strong>Frequency Defaults</strong> set the baseline feedings-per-day and quantity per animal category, used in planning and ration recommendations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
