import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getDashboardStats } from '@/lib/database/dashboard'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { 
  Plus, 
  Users,
  BarChart3, 
  Heart, 
  Milk, 
  Wheat, 
  DollarSign,
  Package,
  Wrench,
  TrendingUp,
  AlertCircle,
  Calendar,
  Target,
  Clock,
  ArrowRight,
  Activity,
  Zap,
  Shield,
  MapPin,
  Baby
} from 'lucide-react'
import { GiCow } from 'react-icons/gi'
import Link from 'next/link'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole) {
    redirect('/auth')
  }
  
  // Handle pending setup status
  if (userRole.status === 'pending_setup') {
    redirect('/onboarding')
  }
  
  if (!userRole.farm_id) {
    redirect('/onboarding')
  }

  // Get comprehensive dashboard data
  const dashboardStats = await getDashboardStats(userRole.farm_id)
  const canManageTeam = ['farm_owner', 'farm_manager'].includes(userRole.role_type)
  const canManageAnimals = ['farm_owner', 'farm_manager', 'worker'].includes(userRole.role_type)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50">
      <div className="dashboard-container py-4 md:py-6">
        {/* Welcome Header - Mobile Optimized */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Welcome back, {user.user_metadata?.full_name?.split(' ')[0] || 'Farmer'}! 👋
              </h1>
              <p className="text-gray-600 mt-1 text-sm md:text-base">
                {dashboardStats?.farm?.name || 'Your Farm'} • {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
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

        {/* Critical Alerts Section - Mobile First */}
        {(dashboardStats?.alerts?.length ?? 0) > 0 && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-orange-800">
                <AlertCircle className="w-5 h-5 mr-2" />
                Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {dashboardStats?.alerts?.slice(0, 3).map((alert, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        alert.priority === 'high' ? 'bg-red-500' : 
                        alert.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                        <p className="text-xs text-gray-600">{alert.description}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics Grid - Mobile Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6">
          {/* Total Animals */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Animals</CardTitle>
              <GiCow className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-gray-900">
                {dashboardStats?.animals?.total || 0}
              </div>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                <p className="text-xs text-green-600">
                  {dashboardStats?.animals?.female || 0}F, {dashboardStats?.animals?.male || 0}M
                </p>
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
              <div className="text-xl md:text-2xl font-bold text-gray-900">
                {dashboardStats?.production?.todayMilk || '0'}L
              </div>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-3 h-3 text-blue-500 mr-1" />
                <p className="text-xs text-blue-600">
                  Avg {dashboardStats?.production?.avgPerCow || '0'}L/cow
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Health Status */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Health</CardTitle>
              <Heart className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-green-600">
                {dashboardStats?.health?.healthyCount || 0}
              </div>
              <div className="flex items-center mt-1">
                <Shield className="w-3 h-3 text-green-500 mr-1" />
                <p className="text-xs text-green-600">
                  {dashboardStats?.health?.sickCount || 0} need attention
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Revenue */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-gray-900">
                ${dashboardStats?.financial?.monthlyRevenue || '0'}
              </div>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-3 h-3 text-emerald-500 mr-1" />
                <p className="text-xs text-emerald-600">
                  {dashboardStats?.financial?.profitMargin || '0'}% profit
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - Mobile Optimized */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2 text-yellow-500" />
              Quick Actions
            </CardTitle>
            <CardDescription>Most common daily tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {canManageAnimals && (
                <Button asChild variant="outline" className="h-auto py-4 flex-col space-y-2">
                  <Link href="/dashboard/production/record">
                    <Milk className="w-5 h-5 text-blue-600" />
                    <span className="text-xs">Record Milk</span>
                  </Link>
                </Button>
              )}
              
              {canManageAnimals && (
                <Button asChild variant="outline" className="h-auto py-4 flex-col space-y-2">
                  <Link href="/dashboard/animals/add">
                    <Plus className="w-5 h-5 text-green-600" />
                    <span className="text-xs">Add Animal</span>
                  </Link>
                </Button>
              )}
              
              <Button asChild variant="outline" className="h-auto py-4 flex-col space-y-2">
                <Link href="/dashboard/health/check">
                  <Heart className="w-5 h-5 text-red-500" />
                  <span className="text-xs">Health Check</span>
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="h-auto py-4 flex-col space-y-2">
                <Link href="/dashboard/reports">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <span className="text-xs">View Reports</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Management Overview - Feature Rich */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Animal Management Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <GiCow className="w-5 h-5 mr-2 text-green-600" />
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
              
              {/* Recent Calvings */}
              {(dashboardStats?.breeding?.recentCalvings?.length ?? 0) > 0 && (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2 flex items-center">
                    <Baby className="w-4 h-4 mr-1 text-pink-500" />
                    Recent Calvings
                  </p>
                  {dashboardStats?.breeding?.recentCalvings?.slice(0, 2).map((calving, index) => (
                    <div key={index} className="flex items-center justify-between text-xs py-1">
                      <span>{calving.cowName}</span>
                      <span className="text-gray-500">{calving.daysAgo}d ago</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Production & Health Overview */}
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
              {/* Production Metrics */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Weekly Average</span>
                  <span className="font-medium">{dashboardStats?.production?.weeklyAvg || '0'}L/day</span>
                </div>
                <Progress 
                  value={dashboardStats?.production?.weeklyProgress || 0} 
                  className="h-2" 
                />
                <p className="text-xs text-gray-500">
                  {dashboardStats?.production?.weeklyProgress || 0}% of weekly target
                </p>
              </div>

              {/* Health Alerts */}
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

        {/* Management Grid - All Features */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {/* Feed Management */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/dashboard/feed">
              <CardContent className="p-4 text-center">
                <Wheat className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                <h3 className="font-medium text-sm mb-1">Feed</h3>
                <p className="text-xs text-gray-600">
                  ${dashboardStats?.feed?.monthlyCost || '0'}/month
                </p>
                <Badge variant="outline" className="mt-2 text-xs">
                  {dashboardStats?.feed?.daysRemaining || '0'} days left
                </Badge>
              </CardContent>
            </Link>
          </Card>

          {/* Financial Management */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/dashboard/finance">
              <CardContent className="p-4 text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <h3 className="font-medium text-sm mb-1">Finance</h3>
                <p className="text-xs text-gray-600">
                  ${dashboardStats?.financial?.monthlyProfit || '0'} profit
                </p>
                <Badge variant="outline" className="mt-2 text-xs">
                  {dashboardStats?.financial?.profitMargin || '0'}% margin
                </Badge>
              </CardContent>
            </Link>
          </Card>

          {/* Inventory Management */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/dashboard/inventory">
              <CardContent className="p-4 text-center">
                <Package className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <h3 className="font-medium text-sm mb-1">Inventory</h3>
                <p className="text-xs text-gray-600">
                  {dashboardStats?.inventory?.totalItems || '0'} items
                </p>
                <Badge variant="outline" className="mt-2 text-xs">
                  {dashboardStats?.inventory?.lowStockCount || '0'} low stock
                </Badge>
              </CardContent>
            </Link>
          </Card>

          {/* Equipment Management */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/dashboard/equipment">
              <CardContent className="p-4 text-center">
                <Wrench className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <h3 className="font-medium text-sm mb-1">Equipment</h3>
                <p className="text-xs text-gray-600">
                  {dashboardStats?.equipment?.totalCount || '0'} machines
                </p>
                <Badge variant="outline" className="mt-2 text-xs">
                  {dashboardStats?.equipment?.maintenanceDue || '0'} due
                </Badge>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Recent Activity & Team */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
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
                  {(dashboardStats?.activities ?? []).slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.type === 'health' ? 'bg-red-500' : 
                        activity.type === 'production' ? 'bg-blue-500' :
                        activity.type === 'breeding' ? 'bg-pink-500' : 'bg-green-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-600">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {activity.timeAgo}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No recent activity</p>
                  <p className="text-xs text-gray-400">
                    Start by recording some data
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team & Weather */}
          <div className="space-y-6">
            {/* Team Status */}
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

            {/* Weather & Location */}
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
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {dashboardStats?.farmAge || 0} days
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobile-Specific Bottom Navigation Preview */}
        <div className="md:hidden mt-8 p-4 bg-white rounded-lg border">
          <p className="text-xs text-gray-500 text-center mb-3">Quick Navigation</p>
          <div className="grid grid-cols-5 gap-2">
            <Link href="/dashboard/animals" className="text-center p-2">
              <GiCow className="w-5 h-5 mx-auto text-green-600" />
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
  )
}