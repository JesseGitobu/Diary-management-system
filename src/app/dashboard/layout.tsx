import { getCurrentUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav'
import { MobileNavigation } from '@/components/mobile/MobileNavigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth')
  }

  return (
    <div className="h-screen bg-gray-50">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader />
      </div>
      
      {/* Mobile Navigation */}
      <MobileHeader />
      
      <div className="flex h-full">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          <div className="py-4 md:py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  )
}