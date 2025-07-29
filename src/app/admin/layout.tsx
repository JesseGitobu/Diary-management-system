// src/app/admin/layout.tsx
'use client'

import { usePathname } from 'next/navigation'
import { AdminAuthProvider } from '@/lib/hooks/useAdminAuth'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Don't wrap auth page with AdminAuthGuard
  const isAuthPage = pathname === '/admin/auth'
  
  if (isAuthPage) {
    return (
      <AdminAuthProvider>
        {children}
      </AdminAuthProvider>
    )
  }
  
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