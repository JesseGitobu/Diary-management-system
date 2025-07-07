import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" />
    </div>
  )
}