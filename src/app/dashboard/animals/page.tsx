import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { getFarmAnimals, getAnimalStats } from '@/lib/database/animals'
import { redirect } from 'next/navigation'
import { AnimalsList } from '@/components/animals/AnimalsList'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Plus, Dog, Users, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default async function AnimalsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }
  
  const userRole = await getUserRole(user.id)
  
  if (!userRole?.farm_id) {
    redirect('/dashboard')
  }
  
  const animals = await getFarmAnimals(userRole.farm_id)
  const stats = await getAnimalStats(userRole.farm_id)
  
  return (
    <div className="dashboard-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Animals</h1>
          <p className="text-gray-600 mt-2">
            Manage your herd and track individual animal information
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/animals/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Animal
          </Link>
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Animals</CardTitle>
            <Dog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Active animals in your herd
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Female</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.female}</div>
            <p className="text-xs text-muted-foreground">
              Female animals
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Male</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.male}</div>
            <p className="text-xs text-muted-foreground">
              Male animals
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Animals List */}
      <AnimalsList animals={animals} />
    </div>
  )
}