import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAnimalStats } from '@/lib/database/animals'
import { getTeamStats } from '@/lib/database/team'
import { withCache } from '@/lib/cache/query-cache'

export async function getDashboardStats(farmId: string) {
  return withCache(
    `dashboard-stats-${farmId}`,
    async () => {
      const supabase = await createServerSupabaseClient()
      
      try {
        // Get basic farm info with optimized query
        const { data: farm } = await supabase
          .from('farms')
          .select('name, location, farm_type, created_at')
          .eq('id', farmId)
          .single()
        
        // Get cached statistics
        const [animalStats, teamStats] = await Promise.all([
          withCache(`animal-stats-${farmId}`, () => getAnimalStats(farmId), 2),
          withCache(`team-stats-${farmId}`, () => getTeamStats(farmId), 10)
        ])
        
        // Get recent activities with limit
        const recentActivities = await withCache(
          `recent-activities-${farmId}`,
          () => getRecentActivities(farmId, 5),
          1
        )
        
        const farmAge = farm && farm.created_at
          ? Math.floor((new Date().getTime() - new Date(farm.created_at as string).getTime()) / (1000 * 60 * 60 * 24))
          : 0
        
        return {
          farm,
          farmAge,
          animals: animalStats,
          team: teamStats,
          activities: recentActivities,
          summary: {
            totalAnimals: animalStats.total,
            totalTeamMembers: teamStats.total,
            pendingInvitations: teamStats.pending,
            farmType: farm?.farm_type || 'Unknown',
          }
        }
      } catch (error) {
        console.error('Error getting dashboard stats:', error)
        return null
      }
    },
    3 // Cache for 3 minutes
  )
}

// Optimized recent activities with better indexing
export async function getRecentActivities(farmId: string, limit: number = 5) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Use single optimized query instead of multiple queries
    const { data: activities } = await supabase
      .rpc('get_recent_farm_activities', {
        p_farm_id: farmId,
        p_limit: limit
      })
    
    return activities || []
    
  } catch (error) {
    console.error('Error getting recent activities:', error)
    return []
  }
}