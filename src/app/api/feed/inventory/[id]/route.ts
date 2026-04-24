import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { updateFeedInventory } from '@/lib/database/feed'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
        
    const user = await getCurrentUser()
    
    
    if (!user) {
      console.error('%c[API PUT] Authorization Failed: No user', 'background: #cc0000; color: white; padding: 4px 8px');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id) as any
    
    
    if (!userRole?.farm_id) {
      console.error('%c[API PUT] Farm Association Failed', 'background: #cc0000; color: white; padding: 4px 8px');
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    // Check permissions
    if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
      console.error('%c[API PUT] Permission Denied', 'background: #cc0000; color: white; padding: 4px 8px');
      console.error('User role is not farm_owner or farm_manager, got:', userRole.role_type);
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await request.json()
    const feedTypeId = id
    
        
    const result = await updateFeedInventory(userRole.farm_id, feedTypeId, body)
    
      if (result.data) {
      console.log('Updated Record Keys:', Object.keys(result.data).join(', '));
      console.log('Updated Record:', JSON.stringify(result.data, null, 2));
    }
    
    if (!result.success) {
      console.error('%c[API PUT] Update Failed', 'background: #ff6600; color: white; padding: 4px 8px');
      console.error('Error:', result.error);
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
   
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      message: 'Feed inventory updated successfully'
    })
    
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
