import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient, getCurrentAdmin } from '@/lib/supabase/server'
import { AdminInquiriesList } from '@/components/admin/AdminInquiriesList'

export const metadata: Metadata = {
  title: 'Inquiries | Admin Dashboard',
  description: 'Manage incoming contact form inquiries',
}

// Check if user is a Super Admin

export default async function AdminInquiriesPage() {
  const user = await getCurrentAdmin()
    
    if (!user) {
      redirect('/admin/auth')
    }

  // Fetch inquiries
  const supabase = await createServerSupabaseClient()
  const { data: inquiries, error } = await supabase
    .from('contact_inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching inquiries:', error)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inquiries</h1>
          <p className="text-muted-foreground">
            Manage and respond to messages from the landing page.
          </p>
        </div>
      </div>
      
      <AdminInquiriesList initialInquiries={inquiries || []} />
    </div>
  )
}