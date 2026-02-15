// src/components/settings/feeds/FeedManagementSettings.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { FeedTypeCategoriesManager } from '@/components/settings/feeds/FeedTypeCategoriesManager'
import { WeightConversionsManager } from '@/components/settings/feeds/WeightConversionsManager'
import { ConsumptionBatchesManager } from '@/components/settings/feeds/ConsumptionBatchesManager'
import {
  ArrowLeft,
  Wheat,
  Tags,
  Scale,
  Utensils,
  Info
} from 'lucide-react'

interface FeedManagementSettingsProps {
  farmId: string
  userRole: string
  feedTypeCategories: any[]
  feedTypes?: any[]
  weightConversions: any[]
  consumptionBatches: any[]
  batchFactors: any[]
  animalCategories: any[]
}

export function FeedManagementSettings({
  farmId,
  userRole,
  feedTypeCategories: initialFeedTypeCategories,
  feedTypes: initialFeedTypes = [],
  weightConversions: initialWeightConversions,
  consumptionBatches: initialConsumptionBatches,
  batchFactors: initialBatchFactors,
  animalCategories: initialAnimalCategories
}: FeedManagementSettingsProps) {
  const router = useRouter()
  const { isMobile } = useDeviceInfo()
  const [activeTab, setActiveTab] = useState('feed-categories')

  // State for managing data
  const [feedTypeCategories, setFeedTypeCategories] = useState(initialFeedTypeCategories)
  const [feedTypes, setFeedTypes] = useState(initialFeedTypes)
  const [weightConversions, setWeightConversions] = useState(initialWeightConversions)
  const [consumptionBatches, setConsumptionBatches] = useState(initialConsumptionBatches)
  const [batchFactors, setBatchFactors] = useState(initialBatchFactors)
  const [animalCategories, setAnimalCategories] = useState(initialAnimalCategories)

  const canManageSettings = ['farm_owner', 'farm_manager'].includes(userRole)

  const handleBack = () => {
    router.push(`/dashboard/settings?farmId=${farmId}`)
  }

  const tabConfig = [
    {
      id: 'feed-categories',
      label: isMobile ? 'Feed Types' : 'Feed Type Categories',
      icon: <Tags className="w-4 h-4" />,
      description: 'Organize feed types into categories'
    },
    {
      id: 'weight-conversions',
      label: isMobile ? 'Weights' : 'Weight Conversions',
      icon: <Scale className="w-4 h-4" />,
      description: 'Custom weight units and conversions'
    },
    {
      id: 'consumption-batches',
      label: isMobile ? 'Batches' : 'Consumption Batches',
      icon: <Utensils className="w-4 h-4" />,
      description: 'Feeding batch templates and rules'
    }
  ]

  return (
    <div className={`${isMobile ? 'px-4 py-4' : 'dashboard-container'} pb-20 lg:pb-6`}>
      {/* Header */}
      <div className="mb-6">
        <div className={`${isMobile ? 'mb-4' : 'flex items-center space-x-4 mb-4'}`}>
          <Button
            variant="ghost"
            onClick={handleBack}
            className={`flex items-center space-x-2 ${isMobile ? 'w-full justify-start' : ''}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className={`${isMobile ? 'ml-2' : ''}`}>Back to Settings</span>
          </Button>
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
              Configure feed type categories, weight conversions, and consumption settings
            </p>
          </div>
        </div>

        {!canManageSettings && (
          <Card className="border-amber-200 bg-amber-50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">Limited Access</h4>
                  <p className="text-sm text-amber-700">
                    You have read-only access to these settings. Contact your farm manager to make changes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Settings Overview Stats */}
      <div className={`grid gap-4 mb-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{feedTypeCategories.length}</div>
            <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Categories</p>
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
            <div className="text-2xl font-bold text-orange-600">{weightConversions.length}</div>
            <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Units</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-600">{consumptionBatches.length}</div>
            <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Batches</p>
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
          {tabConfig.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={`
                ${isMobile
                  ? 'text-xs px-2 py-2 h-10'
                  : 'text-sm px-6 py-2 h-10 min-w-[140px] flex items-center space-x-2'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Feed Type Categories Tab */}
        <TabsContent value="feed-categories">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Tags className="w-5 h-5" />
                <span>Feed Type Categories</span>
              </CardTitle>
              <CardDescription>
                Organize your feed types into categories for better organization and reporting.
                Categories help group similar feeds and make inventory management easier.
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

        {/* Weight Conversions Tab */}
        <TabsContent value="weight-conversions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Scale className="w-5 h-5" />
                <span>Weight Conversions</span>
              </CardTitle>
              <CardDescription>
                Set up custom weight units and conversions for feed measurements.
                This helps when you don't have scales and need to use containers or local measurements.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WeightConversionsManager
                farmId={farmId}
                conversions={weightConversions}
                onConversionsUpdate={setWeightConversions}
                canEdit={canManageSettings}
                isMobile={isMobile}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consumption Batches Tab */}
        <TabsContent value="consumption-batches">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Utensils className="w-5 h-5" />
                <span>Consumption Batches</span>
              </CardTitle>
              <CardDescription>
                Create feeding batch templates based on animal characteristics like age, breeding status,
                and milk production. This speeds up daily feeding records and ensures consistent nutrition.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConsumptionBatchesManager
                farmId={farmId}
                batches={consumptionBatches}
                feedTypeCategories={feedTypeCategories}
                batchFactors={batchFactors}
                animalCategories={animalCategories}
                onBatchesUpdate={setConsumptionBatches}
                onFactorsUpdate={setBatchFactors}
                canEdit={canManageSettings}
                isMobile={isMobile}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Help Text */}
      <Card className="mt-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 mb-1">How These Settings Work Together</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Feed Type Categories</strong> organize your feeds into logical groups</li>
                <li>• <strong>Weight Conversions</strong> let you use local measurements instead of scales</li>
                <li>• <strong>Consumption Batches</strong> create feeding templates for animal groups</li>
                <li>• <strong>Nutritional Data</strong> and <strong>Feed Mix Recipes</strong> tabs are now in Feed Management dashboard</li>
                <li>• All changes are reflected in daily feed management and recommendations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}