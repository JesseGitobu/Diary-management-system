//src/components/admin/AdminSettings.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Settings, 
  Save, 
  Bell,
  Lock,
  Database,
  Mail,
  Shield,
  Globe,
  RefreshCw,
  Check,
  AlertCircle
} from 'lucide-react'

export function AdminSettings() {
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [settings, setSettings] = useState({
    // General Settings
    siteName: 'FarmTrack Pro',
    supportEmail: 'support@farmtrackpro.com',
    defaultTimezone: 'UTC',
    
    // Security Settings
    sessionTimeout: '24',
    requireTwoFactor: false,
    passwordMinLength: '8',
    
    // Email Settings
    emailProvider: 'sendgrid',
    emailFrom: 'noreply@farmtrackpro.com',
    emailNotifications: true,
    
    // Billing Settings
    allowTrials: true,
    trialDays: '14',
    gracePeriodDays: '7',
    
    // System Settings
    maintenanceMode: false,
    debugMode: false,
    autoBackup: true,
    backupFrequency: 'daily'
  })

  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(false)
    setSaveError('')
    
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (!response.ok) {
        throw new Error('Failed to save settings')
      }
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setSaveError('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-2">
            Configure platform-wide settings and preferences
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {saveSuccess && (
            <div className="flex items-center space-x-2 text-green-600">
              <Check className="w-4 h-4" />
              <span className="text-sm">Saved successfully</span>
            </div>
          )}
          {saveError && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{saveError}</span>
            </div>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5" />
            <CardTitle>General Settings</CardTitle>
          </div>
          <CardDescription>
            Basic platform configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Site Name</label>
            <Input
              value={settings.siteName}
              onChange={(e) => setSettings({...settings, siteName: e.target.value})}
              placeholder="FarmTrack Pro"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Support Email</label>
            <Input
              type="email"
              value={settings.supportEmail}
              onChange={(e) => setSettings({...settings, supportEmail: e.target.value})}
              placeholder="support@farmtrackpro.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Default Timezone</label>
            <select
              value={settings.defaultTimezone}
              onChange={(e) => setSettings({...settings, defaultTimezone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <CardTitle>Security Settings</CardTitle>
          </div>
          <CardDescription>
            Authentication and access control
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Session Timeout (hours)</label>
            <Input
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => setSettings({...settings, sessionTimeout: e.target.value})}
              min="1"
              max="168"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Minimum Password Length</label>
            <Input
              type="number"
              value={settings.passwordMinLength}
              onChange={(e) => setSettings({...settings, passwordMinLength: e.target.value})}
              min="6"
              max="32"
            />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Require Two-Factor Authentication</p>
              <p className="text-sm text-gray-600">Enforce 2FA for all admin users</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireTwoFactor}
                onChange={(e) => setSettings({...settings, requireTwoFactor: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5" />
            <CardTitle>Email Settings</CardTitle>
          </div>
          <CardDescription>
            Email delivery and notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email Provider</label>
            <select
              value={settings.emailProvider}
              onChange={(e) => setSettings({...settings, emailProvider: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="sendgrid">SendGrid</option>
              <option value="mailgun">Mailgun</option>
              <option value="ses">Amazon SES</option>
              <option value="smtp">Custom SMTP</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">From Email Address</label>
            <Input
              type="email"
              value={settings.emailFrom}
              onChange={(e) => setSettings({...settings, emailFrom: e.target.value})}
              placeholder="noreply@farmtrackpro.com"
            />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-gray-600">Send automated email notifications</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Billing Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <CardTitle>Billing Settings</CardTitle>
          </div>
          <CardDescription>
            Subscription and payment configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Allow Free Trials</p>
              <p className="text-sm text-gray-600">Enable trial period for new signups</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowTrials}
                onChange={(e) => setSettings({...settings, allowTrials: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Trial Period (days)</label>
            <Input
              type="number"
              value={settings.trialDays}
              onChange={(e) => setSettings({...settings, trialDays: e.target.value})}
              disabled={!settings.allowTrials}
              min="7"
              max="30"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Payment Grace Period (days)</label>
            <Input
              type="number"
              value={settings.gracePeriodDays}
              onChange={(e) => setSettings({...settings, gracePeriodDays: e.target.value})}
              min="3"
              max="14"
            />
          </div>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <CardTitle>System Settings</CardTitle>
          </div>
          <CardDescription>
            System maintenance and operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Maintenance Mode</p>
              <p className="text-sm text-gray-600">Disable access for maintenance</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Debug Mode</p>
              <p className="text-sm text-gray-600">Enable detailed error logging</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.debugMode}
                onChange={(e) => setSettings({...settings, debugMode: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Automatic Backups</p>
              <p className="text-sm text-gray-600">Schedule automatic data backups</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoBackup}
                onChange={(e) => setSettings({...settings, autoBackup: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Backup Frequency</label>
            <select
              value={settings.backupFrequency}
              onChange={(e) => setSettings({...settings, backupFrequency: e.target.value})}
              disabled={!settings.autoBackup}
              className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => {
              if (confirm('Are you sure you want to reset all settings to defaults?')) {
                setSettings({
                  siteName: 'FarmTrack Pro',
                  supportEmail: 'support@farmtrackpro.com',
                  defaultTimezone: 'UTC',
                  sessionTimeout: '24',
                  requireTwoFactor: false,
                  passwordMinLength: '8',
                  emailProvider: 'sendgrid',
                  emailFrom: 'noreply@farmtrackpro.com',
                  emailNotifications: true,
                  allowTrials: true,
                  trialDays: '14',
                  gracePeriodDays: '7',
                  maintenanceMode: false,
                  debugMode: false,
                  autoBackup: true,
                  backupFrequency: 'daily'
                })
              }
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset All Settings
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => {
              if (confirm('Are you sure you want to clear all cache? This may temporarily slow down the system.')) {
                alert('Cache clearing functionality would be implemented here')
              }
            }}
          >
            <Database className="mr-2 h-4 w-4" />
            Clear All Cache
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}