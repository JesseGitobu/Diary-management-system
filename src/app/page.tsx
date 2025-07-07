import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-farm-green/10 to-farm-sky/10">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Modern Dairy Farm
            <span className="text-farm-green"> Management</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Streamline your dairy operations with smart herd management, 
            milk tracking, and comprehensive farm analytics.
          </p>
          <Button size="lg" asChild>
            <Link href="/auth">Get Started Free</Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Herd Management</CardTitle>
              <CardDescription>
                Track individual animals, health records, and breeding cycles
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Production Tracking</CardTitle>
              <CardDescription>
                Monitor milk production, quality, and performance metrics
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Team Collaboration</CardTitle>
              <CardDescription>
                Invite team members and manage farm operations together
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  )
}