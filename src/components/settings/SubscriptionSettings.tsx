'use client'

import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { SubscriptionSettings as SubscriptionType } from '@/lib/database/subscription-settings'
import {
  CreditCard,
  Crown,
  TrendingUp,
  Users,
  HardDrive,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Download,
  Info,
  Smartphone,
  Clock,
  Zap,
  RotateCcw
} from 'lucide-react'

interface SubscriptionSettingsProps {
  farmId: string
  subscription: SubscriptionType | null
  paymentHistory: any[]
  farmName: string
}

const PLAN_FEATURES = {
  free: {
    name: 'Free Plan',
    color: 'bg-gray-100 text-gray-800',
    icon: '🆓',
    price: 0,
    features: [
      'Up to 10 animals',
      '2 users',
      '1 GB storage',
      'Basic health tracking',
      'Basic breeding records',
      'Basic milk production',
      'Data export (CSV)'
    ],
    limits: {
      animals: 10,
      users: 2,
      storage: 1,
      records: 500
    }
  },
  starter: {
    name: 'Starter Plan',
    color: 'bg-blue-100 text-blue-800',
    icon: '🌱',
    price: 1500,
    features: [
      'Up to 50 animals',
      '5 users',
      '5 GB storage',
      'Full health management',
      'Advanced breeding tracking',
      'Production analytics',
      'Financial tracking',
      'Email support'
    ],
    limits: {
      animals: 50,
      users: 5,
      storage: 5,
      records: 2000
    }
  },
  professional: {
    name: 'Professional Plan',
    color: 'bg-purple-100 text-purple-800',
    icon: '💼',
    price: 3500,
    features: [
      'Up to 200 animals',
      '15 users',
      '20 GB storage',
      'All Starter features',
      'Advanced reports & analytics',
      'API access',
      'Priority support',
      'Custom branding',
      'Multi-farm management'
    ],
    limits: {
      animals: 200,
      users: 15,
      storage: 20,
      records: 10000
    }
  },
  enterprise: {
    name: 'Enterprise Plan',
    color: 'bg-amber-100 text-amber-800',
    icon: '🏢',
    price: 'Custom',
    features: [
      'Unlimited animals',
      'Unlimited users',
      'Unlimited storage',
      'All Professional features',
      'Dedicated account manager',
      '24/7 phone support',
      'Custom integrations',
      'Training & onboarding',
      'SLA guarantee'
    ],
    limits: {
      animals: 9999,
      users: 9999,
      storage: 9999,
      records: 999999
    }
  }
}

export default function SubscriptionSettings({
  farmId,
  subscription,
  paymentHistory,
  farmName
}: SubscriptionSettingsProps) {
  const { isMobile } = useDeviceInfo()
  const [isLoading, setIsLoading] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  if (!subscription) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600">No subscription found for this farm</p>
        </div>
      </div>
    )
  }

  const currentPlan = PLAN_FEATURES[subscription.planType]
  const isTrialActive = subscription.planStatus === 'trial' && 
    subscription.trialEndDate && 
    new Date(subscription.trialEndDate) > new Date()

  const daysUntilRenewal = subscription.currentPeriodEnd 
    ? Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  const handleUpgrade = async (newPlan: string) => {
    const confirmed = window.confirm(
      `Upgrade to ${PLAN_FEATURES[newPlan as keyof typeof PLAN_FEATURES].name}?\n\n` +
      `This will change your subscription and billing.\n\n` +
      `Continue?`
    )

    if (!confirmed) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId,
          action: 'request_upgrade',
          data: {
            newPlan,
            effectiveDate: new Date().toISOString()
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process upgrade')
      }

      toast.success('Upgrade request submitted! Our team will contact you shortly.')
      setShowUpgradeModal(false)
      
      // Refresh page
      window.location.reload()
    } catch (error) {
      console.error('Error upgrading:', error)
      toast.error(`Failed to upgrade: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      `⚠️ Cancel Subscription?\n\n` +
      `Are you sure you want to cancel your subscription?\n\n` +
      `Your access will continue until ${subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'the end of the billing period'}.\n\n` +
      `This action can be undone.`
    )

    if (!confirmed) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId,
          action: 'cancel_subscription'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel')
      }

      toast.success('Subscription cancelled. Access continues until period end.')
      window.location.reload()
    } catch (error) {
      console.error('Error cancelling:', error)
      toast.error(`Failed to cancel: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReactivate = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId,
          action: 'reactivate'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reactivate')
      }

      toast.success('Subscription reactivated!')
      window.location.reload()
    } catch (error) {
      console.error('Error reactivating:', error)
      toast.error(`Failed to reactivate: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateAutoRenew = async (enabled: boolean) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId,
          updates: { autoRenew: enabled }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update')
      }

      toast.success(`Auto-renewal ${enabled ? 'enabled' : 'disabled'}`)
      window.location.reload()
    } catch (error) {
      console.error('Error updating auto-renew:', error)
      toast.error(`Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: subscription.currency
    }).format(amount)
  }

  const getUsagePercentage = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-amber-500'
    return 'bg-green-500'
  }

  return (
    <div className={`${isMobile ? 'px-4 py-4' : 'dashboard-container'} pb-20 lg:pb-6`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Settings</span>
          </Button>
        </div>

        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              Account & Subscription
            </h1>
            <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
              Manage your subscription and billing for {farmName}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Trial Alert */}
        {isTrialActive && (
          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">Trial Period Active</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Your {subscription.planType === 'free' ? '30-day free' : 'premium'} trial ends on{' '}
                  <strong>{formatDate(subscription.trialEndDate!)}</strong>
                  {subscription.planType === 'free' && (
                    <span> - Upgrade anytime to unlock more features!</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Notice */}
        {subscription.planStatus === 'cancelled' && (
          <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900">Subscription Cancelled</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Your subscription was cancelled on {formatDate(subscription.cancelledAt!)}.
                  Access continues until {formatDate(subscription.currentPeriodEnd!)}.
                </p>
                <Button
                  onClick={handleReactivate}
                  disabled={isLoading}
                  className="mt-3 bg-amber-600 hover:bg-amber-700"
                  size="sm"
                >
                  Reactivate Subscription
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-600" />
              Current Plan
            </CardTitle>
            <CardDescription>Your active subscription details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{currentPlan.icon}</div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-bold">{currentPlan.name}</h3>
                    <Badge className={currentPlan.color}>
                      {subscription.planStatus}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {typeof currentPlan.price === 'number' 
                      ? formatCurrency(currentPlan.price)
                      : currentPlan.price}
                    {typeof currentPlan.price === 'number' && (
                      <span className="text-base font-normal text-gray-600">
                        /{subscription.billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                    )}
                  </p>
                  
                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    {subscription.subscriptionStartDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Started: {formatDate(subscription.subscriptionStartDate)}</span>
                      </div>
                    )}
                    {subscription.currentPeriodEnd && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {subscription.planStatus === 'cancelled' ? 'Access until' : 'Renews on'}:{' '}
                          {formatDate(subscription.currentPeriodEnd)}
                          {daysUntilRenewal !== null && (
                            <span className="ml-1 text-gray-500">
                              ({daysUntilRenewal} days)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {subscription.planType !== 'enterprise' && subscription.planStatus !== 'cancelled' && (
                <Button
                  onClick={() => setShowUpgradeModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Upgrade Plan
                </Button>
              )}
            </div>

            {/* Plan Features */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-semibold mb-3">Plan Features</h4>
              <div className="grid md:grid-cols-2 gap-2">
                {currentPlan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Current Usage
            </CardTitle>
            <CardDescription>Track your plan limits and usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Animals */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                      🐄
                    </div>
                    <Label>Animals</Label>
                  </div>
                  <span className="text-sm font-medium">
                    {subscription.currentAnimalsCount} / {subscription.maxAnimals}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getUsageColor(
                      getUsagePercentage(subscription.currentAnimalsCount, subscription.maxAnimals)
                    )}`}
                    style={{
                      width: `${getUsagePercentage(subscription.currentAnimalsCount, subscription.maxAnimals)}%`
                    }}
                  />
                </div>
              </div>

              {/* Users */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <Label>Users</Label>
                  </div>
                  <span className="text-sm font-medium">
                    {subscription.currentUsersCount} / {subscription.maxUsers}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getUsageColor(
                      getUsagePercentage(subscription.currentUsersCount, subscription.maxUsers)
                    )}`}
                    style={{
                      width: `${getUsagePercentage(subscription.currentUsersCount, subscription.maxUsers)}%`
                    }}
                  />
                </div>
              </div>

              {/* Storage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-blue-600" />
                    <Label>Storage</Label>
                  </div>
                  <span className="text-sm font-medium">
                    {(subscription.currentStorageUsedMb / 1024).toFixed(2)} GB / {subscription.maxStorageGb} GB
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getUsageColor(
                      getUsagePercentage(subscription.currentStorageUsedMb / 1024, subscription.maxStorageGb)
                    )}`}
                    style={{
                      width: `${getUsagePercentage(subscription.currentStorageUsedMb / 1024, subscription.maxStorageGb)}%`
                    }}
                  />
                </div>
              </div>

              {/* Monthly Records */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <Label>Monthly Records</Label>
                  </div>
                  <span className="text-sm font-medium">
                    {subscription.currentMonthlyRecords} / {subscription.maxMonthlyRecords}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getUsageColor(
                      getUsagePercentage(subscription.currentMonthlyRecords, subscription.maxMonthlyRecords)
                    )}`}
                    style={{
                      width: `${getUsagePercentage(subscription.currentMonthlyRecords, subscription.maxMonthlyRecords)}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Usage Warnings */}
            {(getUsagePercentage(subscription.currentAnimalsCount, subscription.maxAnimals) >= 90 ||
              getUsagePercentage(subscription.currentStorageUsedMb / 1024, subscription.maxStorageGb) >= 90) && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex gap-2 text-sm text-amber-900">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Approaching Limit:</strong> You're near your plan limits. Consider upgrading to avoid service interruption.
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-purple-600" />
              Payment Method
            </CardTitle>
            <CardDescription>Your billing and payment information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscription.paymentMethod === 'mpesa' && subscription.mpesaNumber && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">M-PESA</div>
                      <div className="text-sm text-gray-600">{subscription.mpesaNumber}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Update</Button>
                </div>
              )}

              {subscription.paymentMethod === 'card' && subscription.cardLastFour && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">Card ending in {subscription.cardLastFour}</div>
                      <div className="text-sm text-gray-600">Credit/Debit Card</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Update</Button>
                </div>
              )}

              {!subscription.paymentMethod && subscription.planType !== 'free' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex gap-2 text-sm text-amber-900">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <div>
                      <strong>Payment Method Required:</strong> Please add a payment method to continue your subscription.
                    </div>
                  </div>
                  <Button className="mt-3" size="sm">Add Payment Method</Button>
                </div>
              )}

              {/* Billing Contact */}
              {subscription.billingEmail && (
                <div className="pt-4 border-t">
                  <Label className="text-sm text-gray-600">Billing Contact</Label>
                  <div className="mt-2 space-y-1 text-sm">
                    <div>Email: {subscription.billingEmail}</div>
                    {subscription.billingPhone && <div>Phone: {subscription.billingPhone}</div>}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Auto-Renewal */}
        {subscription.planType !== 'free' && subscription.planStatus !== 'cancelled' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-purple-600" />
                Auto-Renewal
              </CardTitle>
              <CardDescription>Manage automatic subscription renewal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Automatic Renewal</Label>
                  <p className="text-sm text-gray-600">
                    {subscription.autoRenew
                      ? `Your subscription will automatically renew on ${subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'the renewal date'}`
                      : 'Your subscription will not renew automatically'}
                  </p>
                </div>
                <Switch
                  checked={subscription.autoRenew}
                  onCheckedChange={handleUpdateAutoRenew}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              Payment History
            </CardTitle>
            <CardDescription>Your recent transactions and invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No payment history yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paymentHistory.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      {payment.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : payment.status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                      <div>
                        <div className="font-medium">{formatCurrency(payment.amount)}</div>
                        <div className="text-sm text-gray-600">
                          {formatDate(payment.payment_date)}
                          {payment.invoice_number && ` • Invoice #${payment.invoice_number}`}
                        </div>
                      </div>
                    </div>
                    {payment.invoice_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={payment.invoice_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-3 h-3 mr-1" />
                          Invoice
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        {subscription.planStatus !== 'cancelled' && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible actions for your subscription</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <Label className="text-red-900">Cancel Subscription</Label>
                  <p className="text-sm text-red-700">
                    Your access will continue until the end of the current billing period
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleCancelSubscription}
                  disabled={isLoading}
                >
                  Cancel Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help & Support */}
        <div className="p-4 bg-gray-50 border rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-3">
                Have questions about your subscription or billing? Our support team is here to help.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Contact Support
                </Button>
                <Button variant="outline" size="sm">
                  View FAQs
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Upgrade Your Plan</h2>
                <Button variant="ghost" onClick={() => setShowUpgradeModal(false)}>
                  ✕
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(PLAN_FEATURES).map(([key, plan]) => {
                  if (key === 'free' || key === subscription.planType) return null
                  
                  return (
                    <Card key={key} className="relative overflow-hidden">
                      {key === 'professional' && (
                        <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                          POPULAR
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-3xl">{plan.icon}</span>
                          <CardTitle>{plan.name}</CardTitle>
                        </div>
                        <div className="text-3xl font-bold">
                          {typeof plan.price === 'number' 
                            ? formatCurrency(plan.price)
                            : plan.price}
                          {typeof plan.price === 'number' && (
                            <span className="text-base font-normal text-gray-600">/month</span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 mb-4">
                          {plan.features.slice(0, 5).map((feature, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <span>{feature}</span>
                            </div>
                          ))}
                          {plan.features.length > 5 && (
                            <div className="text-sm text-gray-500">
                              +{plan.features.length - 5} more features
                            </div>
                          )}
                        </div>
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleUpgrade(key)}
                          disabled={isLoading}
                        >
                          {key === 'enterprise' ? 'Contact Sales' : 'Upgrade Now'}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-2 text-sm text-blue-900">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Instant Upgrade:</strong> Your new features will be available immediately. Billing will be prorated for the current period.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}