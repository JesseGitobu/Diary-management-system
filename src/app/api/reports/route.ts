import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/database/auth'
import { generateProductionReport, generateFeedReport, generateFinancialReport, generateComprehensiveReport } from '@/lib/database/reports'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userRole = await getUserRole(user.id)
    
    if (!userRole?.farm_id) {
      return NextResponse.json({ error: 'No farm associated with user' }, { status: 400 })
    }
    
    const body = await request.json()
    const { reportType, dateRange, animalIds } = body
    
    const filters = {
      farmId: userRole.farm_id,
      dateRange,
      animalIds,
      reportType
    }
    
    let reportData
    
    switch (reportType) {
      case 'production':
        reportData = await generateProductionReport(filters)
        break
      case 'feed':
        reportData = await generateFeedReport(filters)
        break
      case 'financial':
        reportData = await generateFinancialReport(filters)
        break
      case 'comprehensive':
        reportData = await generateComprehensiveReport(filters)
        break
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }
    
    return NextResponse.json({
      success: true,
      data: reportData,
      generatedAt: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Reports API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}