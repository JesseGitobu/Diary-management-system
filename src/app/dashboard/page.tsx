// src/app/dashboard/page.tsx
import { Metadata } from 'next'
import { getCurrentUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getDashboardStats } from '@/lib/database/dashboard'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Dashboard | DairyTrack Pro',
  description: 'Manage your dairy farm operations. Track animals, milk production, health records, breeding, and financial metrics in real-time.',
}
import { OnboardingBanner } from '@/components/dashboard/OnboardingBanner'
// Import the BIG button for the Hero section
import { AddAnimalButton } from '@/components/dashboard/AddAnimalButton'
// Import the SMALL button for the Quick Actions grid
import { QuickAddAnimalButton } from '@/components/dashboard/QuickAddAnimalButton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import {
  Users, BarChart3, Heart, Milk, Wheat, DollarSign, Package, Wrench,
  TrendingUp, AlertCircle, Clock, ArrowRight, Activity, Zap, Shield, MapPin, Baby,
} from 'lucide-react' // Note: GiCow is usually react-icons, fixed below
import { GiCow as GiCowIcon } from 'react-icons/gi'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth')

  const userRole = await getUserRole(user.id) as any
  if (!userRole) redirect('/auth')

  const needsOnboarding = userRole.status === 'pending_setup' || !userRole.farm_id

  const supabase = await createServerSupabaseClient()
  const { data: farmProfileResult } = await supabase
    .from('farm_profiles')
    .select('onboarding_completed, completion_percentage, farm_name')
    .eq('user_id', user.id)
    .maybeSingle()

  const farmProfile = farmProfileResult as any
  const isOnboardingIncomplete = !farmProfile?.onboarding_completed || needsOnboarding

  const dashboardStats = (userRole.farm_id
    ? await getDashboardStats(userRole.farm_id)
    : null) as any

  // 🎯 DETERMINE STATES
  const hasFarm = !!userRole.farm_id;
  // Check if we actually have animals
  const hasAnimals = (dashboardStats?.animals?.total || 0) > 0;

  // SCENARIO 1: Skipped Onboarding (No Farm ID yet or pending status) -> Everything Inactive
  const isSkipped = needsOnboarding;

  // SCENARIO 2: Farm Created, Setup Done, BUT No Animals -> Stats blurred, Add Button Active
  const isSetupButEmpty = hasFarm && !hasAnimals && !isSkipped;

  // SCENARIO 3: Active (Has Animals)
  const isActiveMode = hasFarm && hasAnimals;

  // Helper style for inactive/blurred elements
  const inactiveStyle = "opacity-40 blur-[2px] pointer-events-none select-none grayscale-[0.5]";

  const canManageTeam = ['farm_owner', 'farm_manager'].includes(userRole.role_type)
  const canManageAnimals = ['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)

  const checkBannerDismissed = () => {
    if (typeof window === 'undefined') return false
    const dismissalData = localStorage.getItem('onboarding-banner-dismissed')
    if (!dismissalData) return false
    try {
      const { timestamp } = JSON.parse(dismissalData)
      const dismissedAt = new Date(timestamp)
      const now = new Date()
      const hoursSinceDismissal = (now.getTime() - dismissedAt.getTime()) / (1000 * 60 * 60)
      return hoursSinceDismissal < 24
    } catch { return false }
  }

  return (
    <div className="min-h-screen">
      <div className="dashboard-container py-6 md:py-8 relative">

        {/* 1. Onboarding Banner (Always visible if incomplete) */}
        {isOnboardingIncomplete && !checkBannerDismissed() && (
          <div className="relative z-50 mb-8">
            <OnboardingBanner
              userName={user.user_metadata?.full_name || user.email || 'there'}
              farmId={userRole.farm_id ?? undefined}
              completionPercentage={farmProfile?.completion_percentage || 0}
            />
          </div>
        )}

        {/* 2. Welcome Header */}
        {/* Blurred if Skipped or Empty */}
        <div className={cn("mb-8 transition-all duration-300", (isSkipped || isSetupButEmpty) && inactiveStyle)}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Welcome back, {user.user_metadata?.full_name?.split(' ')[0] || 'Farmer'}! 👋
              </h1>
              <p className="text-gray-600 mt-1 text-sm md:text-base">
                {dashboardStats?.farm?.name || 'Your Farm'} • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="mt-3 sm:mt-0">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Activity className="w-3 h-3 mr-1" />
                {dashboardStats?.summary?.totalAnimals || 0} Animals Active
              </Badge>
            </div>
          </div>
        </div>

        {/* 3. Key Metrics Grid */}
        {/* Blurred if Skipped or Empty */}
        <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8", (isSkipped || isSetupButEmpty) && inactiveStyle)}>
          {/* Total Animals */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Animals</CardTitle>
              <GiCowIcon className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-gray-900">{dashboardStats?.animals?.total || 0}</div>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                <p className="text-xs text-green-600">{dashboardStats?.animals?.female || 0}F, {dashboardStats?.animals?.male || 0}M</p>
              </div>
            </CardContent>
          </Card>
          {/* Milk Production */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Today's Milk</CardTitle>
              <Milk className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-gray-900">{dashboardStats?.production?.todayMilk || '0'}L</div>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-3 h-3 text-blue-500 mr-1" />
                <p className="text-xs text-blue-600">Avg {dashboardStats?.production?.avgPerCow || '0'}L/cow</p>
              </div>
            </CardContent>
          </Card>
          {/* Health */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Health</CardTitle>
              <Heart className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-green-600">{dashboardStats?.health?.healthyCount || 0}</div>
              <div className="flex items-center mt-1">
                <Shield className="w-3 h-3 text-green-500 mr-1" />
                <p className="text-xs text-green-600">{dashboardStats?.health?.sickCount || 0} need attention</p>
              </div>
            </CardContent>
          </Card>
          {/* Revenue */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-gray-900">${dashboardStats?.financial?.monthlyRevenue || '0'}</div>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-3 h-3 text-emerald-500 mr-1" />
                <p className="text-xs text-emerald-600">{dashboardStats?.financial?.profitMargin || '0'}% profit</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 4. Display: "Add First Animal" Hero */}
        {/* Only visible in Scenario B (Setup Done, No Animals) */}
        {isSetupButEmpty && (
          <div className="mb-8 flex flex-col items-center justify-center bg-white rounded-xl p-12 text-center shadow-md border-2 border-green-100 max-w-2xl mx-auto animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-green-50">
              <GiCowIcon className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Welcome to your new farm!
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto mb-8 text-lg leading-relaxed">
              Your farm profile is ready. The next step is to add your first animal to start tracking production, health, and more.
            </p>
            {/* BIG BUTTON: Links to Modal */}
            <AddAnimalButton />
          </div>
        )}

        {/* 5. Quick Actions Section */}
        {/* Logic: 
            - If Skipped: Entire card is blurred.
            - If SetupButEmpty: Card is active, but individual buttons (except Add) are blurred.
            - If Active: All active.
        */}
        <Card className={cn("mb-8", isSkipped && inactiveStyle)}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2 text-yellow-500" />
              Quick Actions
            </CardTitle>
            <CardDescription>Most common daily tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

              {/* ADD ANIMAL - Active if farm exists (Scenario B or C) */}
              {canManageAnimals && (
                <QuickAddAnimalButton
                  isActive={!isSkipped}
                  isHighlighted={isSetupButEmpty}
                />
              )}

              {/* OTHER ACTIONS - Active ONLY if we have animals (Scenario C) */}
              {canManageAnimals && (
                <Button asChild variant="outline" className={cn("h-auto py-4 flex-col space-y-2", !isActiveMode && inactiveStyle)}>
                  <Link href="/dashboard/production">
                    <Milk className="w-5 h-5 text-blue-600" />
                    <span className="text-xs">Record Milk</span>
                  </Link>
                </Button>
              )}

              <Button asChild variant="outline" className={cn("h-auto py-4 flex-col space-y-2", !isActiveMode && inactiveStyle)}>
                <Link href="/dashboard/health/">
                  <Heart className="w-5 h-5 text-red-500" />
                  <span className="text-xs">Health Check</span>
                </Link>
              </Button>

              <Button asChild variant="outline" className={cn("h-auto py-4 flex-col space-y-2", !isActiveMode && inactiveStyle)}>
                <Link href="/dashboard/reports">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <span className="text-xs">View Reports</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 6. Rest of Dashboard (Blurred if No Animals) */}
        <div className={cn("transition-all duration-300", (!isActiveMode) && inactiveStyle)}>

          {/* Critical Alerts */}
          {(dashboardStats?.alerts?.length ?? 0) > 0 && (
            <Card className="mb-8 border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-orange-800">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {dashboardStats?.alerts?.slice(0, 3).map((alert: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${alert.priority === 'high' ? 'bg-red-500' : alert.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                          <p className="text-xs text-gray-600">{alert.description}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">View</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Management Grid & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <GiCowIcon className="w-5 h-5 mr-2 text-green-600" />
                    Animal Management
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/dashboard/animals">
                      View All <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Milking Cows</span>
                    <span className="font-medium">{dashboardStats?.animals?.milkingCows || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Pregnant</span>
                    <span className="font-medium">{dashboardStats?.breeding?.pregnantCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Due Soon</span>
                    <span className="font-medium text-orange-600">{dashboardStats?.breeding?.dueSoon || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Dry Cows</span>
                    <span className="font-medium">{dashboardStats?.animals?.dryCows || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-600" />
                    Production & Health
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/dashboard/production">
                      View All <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Weekly Average</span>
                    <span className="font-medium">{dashboardStats?.production?.weeklyAvg || '0'}L/day</span>
                  </div>
                  <Progress value={dashboardStats?.production?.weeklyProgress || 0} className="h-2" />
                  <p className="text-xs text-gray-500">{dashboardStats?.production?.weeklyProgress || 0}% of weekly target</p>
                </div>
                {/* Health Status Mini Report */}
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2 flex items-center">
                    <Heart className="w-4 h-4 mr-1 text-red-500" />
                    Health Status
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-medium text-green-600">{dashboardStats?.health?.healthyCount || 0}</div>
                      <div className="text-gray-500">Healthy</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-yellow-600">{dashboardStats?.health?.treatmentCount || 0}</div>
                      <div className="text-gray-500">Treatment</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-red-600">{dashboardStats?.health?.sickCount || 0}</div>
                      <div className="text-gray-500">Sick</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Other Management Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/dashboard/feed">
                <CardContent className="p-4 text-center">
                  <Wheat className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                  <h3 className="font-medium text-sm mb-1">Feed</h3>
                  <p className="text-xs text-gray-600">${dashboardStats?.feed?.monthlyCost || '0'}/month</p>
                  <Badge variant="outline" className="mt-2 text-xs">{dashboardStats?.feed?.daysRemaining || '0'} days left</Badge>
                </CardContent>
              </Link>
            </Card>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/dashboard/finance">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <h3 className="font-medium text-sm mb-1">Finance</h3>
                  <p className="text-xs text-gray-600">${dashboardStats?.financial?.monthlyProfit || '0'} profit</p>
                  <Badge variant="outline" className="mt-2 text-xs">{dashboardStats?.financial?.profitMargin || '0'}% margin</Badge>
                </CardContent>
              </Link>
            </Card>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/dashboard/inventory">
                <CardContent className="p-4 text-center">
                  <Package className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <h3 className="font-medium text-sm mb-1">Inventory</h3>
                  <p className="text-xs text-gray-600">{dashboardStats?.inventory?.totalItems || '0'} items</p>
                  <Badge variant="outline" className="mt-2 text-xs">{dashboardStats?.inventory?.lowStockCount || '0'} low stock</Badge>
                </CardContent>
              </Link>
            </Card>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/dashboard/equipment">
                <CardContent className="p-4 text-center">
                  <Wrench className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                  <h3 className="font-medium text-sm mb-1">Equipment</h3>
                  <p className="text-xs text-gray-600">{dashboardStats?.equipment?.totalCount || '0'} machines</p>
                  <Badge variant="outline" className="mt-2 text-xs">{dashboardStats?.equipment?.maintenanceDue || '0'} due</Badge>
                </CardContent>
              </Link>
            </Card>
          </div>

          {/* Recent Activity & Team */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-gray-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(dashboardStats?.activities?.length ?? 0) > 0 ? (
                  <div className="space-y-3">
                    {(dashboardStats?.activities ?? []).slice(0, 5).map((activity: any, index: number) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${activity.type === 'health' ? 'bg-red-500' :
                          activity.type === 'production' ? 'bg-blue-500' :
                            activity.type === 'breeding' ? 'bg-pink-500' : 'bg-green-500'
                          }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                          <p className="text-xs text-gray-600">{activity.description}</p>
                          <p className="text-xs text-gray-400 mt-1">{activity.timeAgo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No recent activity</p>
                    <p className="text-xs text-gray-400">Start by recording some data</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team & Weather */}
            <div className="space-y-8">
              {canManageTeam && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Users className="w-5 h-5 mr-2 text-blue-600" />
                        Team
                      </div>
                      <Button asChild size="sm" variant="ghost">
                        <Link href="/dashboard/settings/team">
                          Manage <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-gray-600">Active Members</span>
                      <span className="font-medium">{dashboardStats?.team?.total || 1}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Pending Invites</span>
                      <span className="font-medium text-orange-600">{dashboardStats?.team?.pending || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-green-600" />
                    Farm Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Location</span>
                      <span className="font-medium">{dashboardStats?.farm?.location || 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Farm Type</span>
                      <span className="font-medium capitalize">{dashboardStats?.farm?.farm_type || 'Mixed'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Operating</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">{dashboardStats?.farmAge || 0} days</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Mobile-Specific Bottom Navigation Preview */}
          <div className="md:hidden mt-8 mb-12 p-4 bg-white rounded-lg border">
            <p className="text-xs text-gray-500 text-center mb-3">Quick Navigation</p>
            <div className="grid grid-cols-5 gap-2">
              <Link href="/dashboard/animals" className="text-center p-2">
                <GiCowIcon className="w-5 h-5 mx-auto text-green-600" />
                <span className="text-xs text-gray-600 block mt-1">Animals</span>
              </Link>
              <Link href="/dashboard/production" className="text-center p-2">
                <Milk className="w-5 h-5 mx-auto text-blue-600" />
                <span className="text-xs text-gray-600 block mt-1">Milk</span>
              </Link>
              <Link href="/dashboard/health" className="text-center p-2">
                <Heart className="w-5 h-5 mx-auto text-red-500" />
                <span className="text-xs text-gray-600 block mt-1">Health</span>
              </Link>
              <Link href="/dashboard/feed" className="text-center p-2">
                <Wheat className="w-5 h-5 mx-auto text-yellow-600" />
                <span className="text-xs text-gray-600 block mt-1">Feed</span>
              </Link>
              <Link href="/dashboard/reports" className="text-center p-2">
                <BarChart3 className="w-5 h-5 mx-auto text-purple-600" />
                <span className="text-xs text-gray-600 block mt-1">Reports</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}