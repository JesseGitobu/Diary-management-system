import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Dog } from 'lucide-react'

export default function AnimalNotFound() {
  return (
    <div className="dashboard-container">
      <div className="max-w-md mx-auto mt-16">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Dog className="w-8 h-8 text-gray-400" />
            </div>
            <CardTitle>Animal Not Found</CardTitle>
            <CardDescription>
              The animal you're looking for doesn't exist or you don't have permission to view it.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/dashboard/animals">
                Back to Animals
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}