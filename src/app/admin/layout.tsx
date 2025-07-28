import { AdminAuthProvider } from '@/lib/hooks/useAdminAuth'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminAuthProvider>
      <AdminAuthGuard>
        <div className="h-screen bg-gray-50">
          <AdminHeader />
          <div className="flex h-full pt-16">
            <AdminSidebar />
            <main className="flex-1 overflow-auto">
              <div className="py-6">
                {children}
              </div>
            </main>
          </div>
        </div>
      </AdminAuthGuard>
    </AdminAuthProvider>
  )
}