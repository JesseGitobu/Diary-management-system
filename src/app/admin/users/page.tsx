// src/app/admin/users/page.tsx
import { getCurrentAdmin } from '@/lib/supabase/server'
import { getAllUsers } from '@/lib/database/admin'
import { redirect } from 'next/navigation'
import { UserManagement } from '@/components/admin/UserManagement'

export default async function AdminUsersPage() {
  const user = await getCurrentAdmin()
  
  if (!user) {
    redirect('/admin/auth')
  }
  
  const { users, count } = await getAllUsers(50, 0)
  
  return (
    <div className="dashboard-container">
      <UserManagement 
        initialUsers={users}
        totalCount={count}
      />
    </div>
  )
}