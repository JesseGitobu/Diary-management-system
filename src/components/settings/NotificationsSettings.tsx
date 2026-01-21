'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import {
  ArrowLeft,
  Bell,
  Heart,
  Milk,
  Calendar,
  TrendingDown,
  Wrench,
  Smartphone,
  MessageSquare,
  Mail,
  Save,
  AlertTriangle,
  Clock,
  Phone
} from 'lucide-react'

interface NotificationSettings {
  // Health Alerts
  health_alerts_enabled: boolean
  sick_animal_alerts: boolean
  vaccination_reminders: boolean
  treatment_due_alerts: boolean
  health_check_reminders: boolean
  
  // Breeding Alerts
  breeding_alerts_enabled: boolean
  heat_detection_alerts: boolean
  calving_reminders: boolean
  pregnancy_check_reminders: boolean
  breeding_schedule_alerts: boolean
  
  // Production Alerts
  production_alerts_enabled: boolean
  milk_yield_drop_alerts: boolean
  milk_yield_threshold: number
  quality_issue_alerts: boolean
  milking_schedule_alerts: boolean
  
  // Task & Maintenance Alerts
  task_alerts_enabled: boolean
  feed_low_alerts: boolean
  equipment_maintenance_alerts: boolean
  routine_task_reminders: boolean
  
  // Delivery Methods
  in_app_notifications: boolean
  sms_notifications: boolean
  sms_phone_number: string
  whatsapp_notifications: boolean
  whatsapp_phone_number: string
  email_notifications: boolean
  email_address: string
  
  // Timing
  quiet_hours_enabled: boolean
  quiet_start_time: string
  quiet_end_time: string
  urgent_override_quiet_hours: boolean
}

interface NotificationsSettingsProps {
  farmId: string
  userRole: string
  initialSettings: NotificationSettings
}

export function NotificationsSettings({ farmId, userRole, initialSettings }: NotificationsSettingsProps) {
  const router = useRouter()
  const { isMobile } = useDeviceInfo()
  const [settings, setSettings] = useState<NotificationSettings>(initialSettings)
  const [loading, setLoading] = useState(false)
  const [testingNotification, setTestingNotification] = useState<string | null>(null)

  const handleBack = () => {
    router.push(`/dashboard/settings`)
  }

  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleInputChange = (key: keyof NotificationSettings, value: string | number) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/farms/${farmId}/notification-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        throw new Error('Failed to update notification settings')
      }

      // Show success message
      alert('Notification settings saved successfully!')
    } catch (error) {
      console.error('Error updating notification settings:', error)
      alert('Failed to update notification settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTestNotification = async (method: 'sms' | 'whatsapp' | 'email') => {
    setTestingNotification(method)
    try {
      const response = await fetch(`/api/farms/${farmId}/test-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ method, settings })
      })

      if (!response.ok) {
        throw new Error('Failed to send test notification')
      }

      alert(`Test ${method} notification sent successfully!`)
    } catch (error) {
      console.error('Error sending test notification:', error)
      alert(`Failed to send test ${method} notification. Please check your settings.`)
    } finally {
      setTestingNotification(null)
    }
  }

  const alertCategories = [
    {
      id: 'health',
      title: 'Health Alerts',
      description: 'Notifications about animal health and medical care',
      icon: Heart,
      color: 'text-red-600 bg-red-100',
      enabled: settings.health_alerts_enabled,
      onToggle: (value: boolean) => handleToggle('health_alerts_enabled', value),
      items: [
        {
          key: 'sick_animal_alerts' as keyof NotificationSettings,
          label: 'Sick Animal Alerts',
          description: 'When animals are marked as sick or injured'
        },
        {
          key: 'vaccination_reminders' as keyof NotificationSettings,
          label: 'Vaccination Reminders',
          description: 'Before vaccination schedules are due'
        },
        {
          key: 'treatment_due_alerts' as keyof NotificationSettings,
          label: 'Treatment Due Alerts',
          description: 'When treatments need to be administered'
        },
        {
          key: 'health_check_reminders' as keyof NotificationSettings,
          label: 'Health Check Reminders',
          description: 'Regular health inspection reminders'
        }
      ]
    },
    {
      id: 'breeding',
      title: 'Breeding Alerts',
      description: 'Notifications about breeding and reproduction',
      icon: Calendar,
      color: 'text-purple-600 bg-purple-100',
      enabled: settings.breeding_alerts_enabled,
      onToggle: (value: boolean) => handleToggle('breeding_alerts_enabled', value),
      items: [
        {
          key: 'heat_detection_alerts' as keyof NotificationSettings,
          label: 'Heat Detection Alerts',
          description: 'When cows show signs of being in heat'
        },
        {
          key: 'calving_reminders' as keyof NotificationSettings,
          label: 'Calving Reminders',
          description: 'Before expected calving dates'
        },
        {
          key: 'pregnancy_check_reminders' as keyof NotificationSettings,
          label: 'Pregnancy Check Reminders',
          description: 'Schedule pregnancy confirmations'
        },
        {
          key: 'breeding_schedule_alerts' as keyof NotificationSettings,
          label: 'Breeding Schedule Alerts',
          description: 'Optimal breeding time notifications'
        }
      ]
    },
    {
      id: 'production',
      title: 'Production Alerts',
      description: 'Notifications about milk production and quality',
      icon: Milk,
      color: 'text-blue-600 bg-blue-100',
      enabled: settings.production_alerts_enabled,
      onToggle: (value: boolean) => handleToggle('production_alerts_enabled', value),
      items: [
        {
          key: 'milk_yield_drop_alerts' as keyof NotificationSettings,
          label: 'Milk Yield Drop Alerts',
          description: 'When production drops significantly'
        },
        {
          key: 'quality_issue_alerts' as keyof NotificationSettings,
          label: 'Quality Issue Alerts',
          description: 'When milk quality tests fail'
        },
        {
          key: 'milking_schedule_alerts' as keyof NotificationSettings,
          label: 'Milking Schedule Alerts',
          description: 'Milking time reminders'
        }
      ]
    },
    {
      id: 'tasks',
      title: 'Task & Maintenance',
      description: 'Notifications about farm tasks and equipment',
      icon: Wrench,
      color: 'text-green-600 bg-green-100',
      enabled: settings.task_alerts_enabled,
      onToggle: (value: boolean) => handleToggle('task_alerts_enabled', value),
      items: [
        {
          key: 'feed_low_alerts' as keyof NotificationSettings,
          label: 'Feed Low Alerts',
          description: 'When feed inventory is running low'
        },
        {
          key: 'equipment_maintenance_alerts' as keyof NotificationSettings,
          label: 'Equipment Maintenance',
          description: 'Scheduled equipment maintenance reminders'
        },
        {
          key: 'routine_task_reminders' as keyof NotificationSettings,
          label: 'Routine Task Reminders',
          description: 'Daily and weekly farm task reminders'
        }
      ]
    }
  ]

  return (
    <div className={`
      ${isMobile ? 'px-4 py-4' : 'dashboard-container'} 
      pb-20 lg:pb-6
    `}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Settings</span>
          </Button>
        </div>
        
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              Notifications & Alerts
            </h1>
            <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
              Configure what alerts you receive and how you want to be notified
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Alert Categories */}
        {alertCategories.map((category) => (
          <Card key={category.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${category.color}`}>
                    <category.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={category.enabled}
                  onCheckedChange={category.onToggle}
                />
              </div>
            </CardHeader>
            
            {category.enabled && (
              <CardContent className="space-y-3">
                {category.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div>
                      <Label className="font-medium">{item.label}</Label>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                    <Switch
                      checked={settings[item.key] as boolean}
                      onCheckedChange={(value) => handleToggle(item.key, value)}
                    />
                  </div>
                ))}
                
                {/* Special settings for production alerts */}
                {category.id === 'production' && settings.milk_yield_drop_alerts && (
                  <div className="pt-2 border-t border-gray-200">
                    <Label htmlFor="yield-threshold">Milk Yield Drop Threshold (%)</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input
                        id="yield-threshold"
                        type="number"
                        value={settings.milk_yield_threshold}
                        onChange={(e) => handleInputChange('milk_yield_threshold', parseInt(e.target.value) || 0)}
                        min="5"
                        max="50"
                        className="w-20"
                      />
                      <span className="text-sm text-gray-600">
                        Alert when production drops by this percentage
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}

        {/* Delivery Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Smartphone className="w-5 h-5" />
              <span>Delivery Methods</span>
            </CardTitle>
            <CardDescription>
              Choose how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* In-App Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="w-5 h-5 text-gray-600" />
                <div>
                  <Label className="font-medium">In-App Notifications</Label>
                  <p className="text-sm text-gray-600">Notifications within the app</p>
                </div>
              </div>
              <Switch
                checked={settings.in_app_notifications}
                onCheckedChange={(value) => handleToggle('in_app_notifications', value)}
              />
            </div>

            {/* SMS Notifications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-600" />
                  <div>
                    <Label className="font-medium">SMS Notifications</Label>
                    <p className="text-sm text-gray-600">Text message alerts</p>
                  </div>
                </div>
                <Switch
                  checked={settings.sms_notifications}
                  onCheckedChange={(value) => handleToggle('sms_notifications', value)}
                />
              </div>
              
              {settings.sms_notifications && (
                <div className="ml-8 space-y-2">
                  <Label htmlFor="sms-phone">Phone Number</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="sms-phone"
                      value={settings.sms_phone_number}
                      onChange={(e) => handleInputChange('sms_phone_number', e.target.value)}
                      placeholder="+254712345678"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleTestNotification('sms')}
                      disabled={!settings.sms_phone_number || testingNotification === 'sms'}
                      className="flex items-center space-x-1"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{testingNotification === 'sms' ? 'Testing...' : 'Test'}</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* WhatsApp Notifications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                  <div>
                    <Label className="font-medium">WhatsApp Notifications</Label>
                    <p className="text-sm text-gray-600">WhatsApp Business messages</p>
                  </div>
                </div>
                <Switch
                  checked={settings.whatsapp_notifications}
                  onCheckedChange={(value) => handleToggle('whatsapp_notifications', value)}
                />
              </div>
              
              {settings.whatsapp_notifications && (
                <div className="ml-8 space-y-2">
                  <Label htmlFor="whatsapp-phone">WhatsApp Number</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="whatsapp-phone"
                      value={settings.whatsapp_phone_number}
                      onChange={(e) => handleInputChange('whatsapp_phone_number', e.target.value)}
                      placeholder="+254712345678"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleTestNotification('whatsapp')}
                      disabled={!settings.whatsapp_phone_number || testingNotification === 'whatsapp'}
                      className="flex items-center space-x-1"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{testingNotification === 'whatsapp' ? 'Testing...' : 'Test'}</span>
                    </Button>
                  </div>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      WhatsApp notifications require you to have WhatsApp Business API enabled. Contact support for setup.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>

            {/* Email Notifications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <div>
                    <Label className="font-medium">Email Notifications</Label>
                    <p className="text-sm text-gray-600">Email alerts and summaries</p>
                  </div>
                </div>
                <Switch
                  checked={settings.email_notifications}
                  onCheckedChange={(value) => handleToggle('email_notifications', value)}
                />
              </div>
              
              {settings.email_notifications && (
                <div className="ml-8 space-y-2">
                  <Label htmlFor="email-address">Email Address</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="email-address"
                      type="email"
                      value={settings.email_address}
                      onChange={(e) => handleInputChange('email_address', e.target.value)}
                      placeholder="your.email@example.com"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleTestNotification('email')}
                      disabled={!settings.email_address || testingNotification === 'email'}
                      className="flex items-center space-x-1"
                    >
                      <Mail className="w-4 h-4" />
                      <span>{testingNotification === 'email' ? 'Testing...' : 'Test'}</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Quiet Hours</span>
            </CardTitle>
            <CardDescription>
              Set times when you don't want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Enable Quiet Hours</Label>
                <p className="text-sm text-gray-600">Suppress non-urgent notifications during these hours</p>
              </div>
              <Switch
                checked={settings.quiet_hours_enabled}
                onCheckedChange={(value) => handleToggle('quiet_hours_enabled', value)}
              />
            </div>
            
            {settings.quiet_hours_enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quiet-start">Start Time</Label>
                    <Input
                      id="quiet-start"
                      type="time"
                      value={settings.quiet_start_time}
                      onChange={(e) => handleInputChange('quiet_start_time', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="quiet-end">End Time</Label>
                    <Input
                      id="quiet-end"
                      type="time"
                      value={settings.quiet_end_time}
                      onChange={(e) => handleInputChange('quiet_end_time', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Override for Urgent Alerts</Label>
                    <p className="text-sm text-gray-600">Send urgent notifications even during quiet hours</p>
                  </div>
                  <Switch
                    checked={settings.urgent_override_quiet_hours}
                    onCheckedChange={(value) => handleToggle('urgent_override_quiet_hours', value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex justify-end space-x-3'}`}>
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={loading}
            className={isMobile ? 'w-full' : ''}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className={`bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2 ${isMobile ? 'w-full' : ''}`}
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Settings'}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}