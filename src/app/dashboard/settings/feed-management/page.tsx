// app/dashboard/settings/feed-management/page.tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import {
  getFeedTypeCategories,
  getAnimalCategories,
  getWeightConversions,
  initializeFarmFeedManagementSettings,
} from '@/lib/database/feedManagementSettings'
import { getAllFeedSettings } from '@/lib/database/feedSettings'
import { FeedManagementSettings } from '@/components/settings/feeds/FeedManagementSettings'

interface FeedManagementSettingsPageProps {
  searchParams: Promise<{ farmId: string }>
}

export default async function FeedManagementSettingsPage({
  searchParams,
}: FeedManagementSettingsPageProps) {
  const { farmId } = await searchParams

  if (!farmId) redirect('/dashboard')

  const user = await getCurrentUser()
  if (!user) redirect('/auth/signin')

  const userRole = await getUserRole(user.id) as any
  if (!userRole || userRole.farm_id !== farmId) redirect('/dashboard')

  try {
    const [
      feedTypeCategories,
      animalCategories,
      weightConversions,
      feedSettings,
    ] = await Promise.all([
      getFeedTypeCategories(farmId),
      getAnimalCategories(farmId),
      getWeightConversions(farmId),
      getAllFeedSettings(farmId),
    ])

    // Seed defaults if the farm has never been configured
    if (feedTypeCategories.length === 0 && animalCategories.length === 0 && weightConversions.length === 0) {
      await initializeFarmFeedManagementSettings(farmId)

      const [
        refreshedCategories,
        refreshedAnimalCategories,
        refreshedConversions,
        refreshedFeedSettings,
      ] = await Promise.all([
        getFeedTypeCategories(farmId),
        getAnimalCategories(farmId),
        getWeightConversions(farmId),
        getAllFeedSettings(farmId),
      ])

      return (
        <FeedManagementSettings
          farmId={farmId}
          userRole={userRole.role_type}
          feedTypeCategories={refreshedCategories}
          animalCategories={refreshedAnimalCategories}
          weightConversions={refreshedConversions}
          timeSlots={refreshedFeedSettings.timeSlots}
          alertSettings={refreshedFeedSettings.alertSettings}
          frequencyDefaults={refreshedFeedSettings.frequencyDefaults}
        />
      )
    }

    return (
      <FeedManagementSettings
        farmId={farmId}
        userRole={userRole.role_type}
        feedTypeCategories={feedTypeCategories}
        animalCategories={animalCategories}
        weightConversions={weightConversions}
        timeSlots={feedSettings.timeSlots}
        alertSettings={feedSettings.alertSettings}
        frequencyDefaults={feedSettings.frequencyDefaults}
      />
    )
  } catch (error) {
    console.error('Error loading feed management settings:', error)
    return (
      <FeedManagementSettings
        farmId={farmId}
        userRole={userRole.role_type}
        feedTypeCategories={[]}
        animalCategories={[]}
        weightConversions={[]}
        timeSlots={[]}
        alertSettings={[]}
        frequencyDefaults={[]}
      />
    )
  }
}

export async function generateMetadata() {
  return {
    title: 'Feed Management Settings – Farm Management System',
    description: 'Configure feed categories, weight conversions, feeding schedules, and alert thresholds for your dairy farm.',
  }
}
