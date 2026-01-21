'use client'

import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import { DataBackupSettings as BackupSettingsType } from '@/lib/database/data-backup-settings'
import {
  Database,
  Download,
  Upload,
  Clock,
  Cloud,
  Bell,
  Save,
  ArrowLeft,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  RotateCcw,
  FileText,
  HardDrive,
  Trash2
} from 'lucide-react'

interface DataBackupSettingsProps {
  farmId: string
  userRole: string
  initialSettings: BackupSettingsType
  backupHistory: any[]
  farmName: string
}

export default function DataBackupSettings({
  farmId,
  userRole,
  initialSettings,
  backupHistory: initialHistory,
  farmName
}: DataBackupSettingsProps) {
  const { isMobile } = useDeviceInfo()
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [backupHistory, setBackupHistory] = useState(initialHistory)
  const [settings, setSettings] = useState(initialSettings)

  const handleSaveSettings = async () => {
    const confirmed = window.confirm(
      `Save Backup Settings?\n\n` +
      `This will update your data backup and export preferences.\n\n` +
      `Click OK to proceed.`
    )

    if (!confirmed) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/data-backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmId, settings })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save settings')
      }

      setSettings(result.settings)
      setHasUnsavedChanges(false)
      toast.success('Backup settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualBackup = async () => {
    const confirmed = window.confirm(
      `Create Manual Backup?\n\n` +
      `This will create an immediate backup of your farm data.\n\n` +
      `Continue?`
    )

    if (!confirmed) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/data-backup/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create backup')
      }

      toast.success('Backup created successfully!')
      
      // Refresh backup history
      const historyResponse = await fetch(`/api/settings/data-backup?farmId=${farmId}&includeHistory=true`)
      const historyData = await historyResponse.json()
      if (historyData.history) {
        setBackupHistory(historyData.history)
      }
    } catch (error) {
      console.error('Error creating backup:', error)
      toast.error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const updateSettings = (updates: Partial<BackupSettingsType>) => {
    setSettings({ ...settings, ...updates })
    setHasUnsavedChanges(true)
  }

  const handleBack = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        `Unsaved Changes\n\nYou have unsaved changes. Are you sure you want to leave?`
      )
      if (!confirmed) return
    }
    window.history.back()
  }

  const resetToDefaults = () => {
    const confirmed = window.confirm(
      `Reset to Default Settings?\n\n` +
      `This will reset all backup settings to their default values.\n\n` +
      `Continue?`
    )

    if (!confirmed) return

    setSettings({
      autoBackupEnabled: true,
      backupFrequency: 'weekly',
      backupTime: '02:00:00',
      includeAnimals: true,
      includeHealthRecords: true,
      includeBreedingRecords: true,
      includeProductionRecords: true,
      includeFinancialRecords: true,
      includeFeedRecords: true,
      includeUsers: false,
      includeDocuments: true,
      exportFormat: 'both',
      includePhotos: false,
      compressExports: true,
      cloudStorageEnabled: false,
      backupRetentionDays: 90,
      autoDeleteOldBackups: true,
      maxBackupSizeMb: 500,
      notifyOnBackupSuccess: true,
      notifyOnBackupFailure: true,
      offlineSyncEnabled: true,
      syncFrequencyMinutes: 30,
      conflictResolution: 'server_wins',
      enableDataValidation: true,
      enableAuditLogs: true
    })
    setHasUnsavedChanges(true)
    toast.success('Settings reset to defaults')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600 animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const InfoBox = ({ children }: { children: React.ReactNode }) => (
    <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>{children}</div>
    </div>
  )

  return (
    <div className={`${isMobile ? 'px-4 py-4' : 'dashboard-container'} pb-20 lg:pb-6`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button variant="ghost" onClick={handleBack} className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Settings</span>
          </Button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                Data & Backup
              </h1>
              <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
                Configure backup and data export settings for {farmName}
              </p>
            </div>
          </div>
          <Button onClick={handleManualBackup} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            {isMobile ? 'Backup' : 'Create Backup Now'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Automatic Backup Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Automatic Backup Schedule
            </CardTitle>
            <CardDescription>Configure when and how often your data is backed up</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Enable Automatic Backups</Label>
                <p className="text-xs text-gray-500">Automatically backup your data on a schedule</p>
              </div>
              <Switch
                checked={settings.autoBackupEnabled}
                onCheckedChange={(checked) => updateSettings({ autoBackupEnabled: checked })}
              />
            </div>

            {settings.autoBackupEnabled && (
              <div className="grid md:grid-cols-2 gap-4 ml-6">
                <div>
                  <Label>Backup Frequency</Label>
                  <Select
                    value={settings.backupFrequency}
                    onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                      updateSettings({ backupFrequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Backup Time</Label>
                  <Input
                    type="time"
                    value={settings.backupTime}
                    onChange={(e) => updateSettings({ backupTime: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Scheduled in farm's timezone</p>
                </div>
              </div>
            )}

            {settings.nextBackupDate && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-green-900">
                  <CheckCircle className="w-4 h-4" />
                  <span>Next scheduled backup: <strong>{formatDate(settings.nextBackupDate)}</strong></span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data to Include */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Data to Include in Backups
            </CardTitle>
            <CardDescription>Select which data categories to include</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { key: 'includeAnimals', label: 'Animal Records', icon: '🐄' },
                { key: 'includeHealthRecords', label: 'Health Records', icon: '💊' },
                { key: 'includeBreedingRecords', label: 'Breeding Records', icon: '❤️' },
                { key: 'includeProductionRecords', label: 'Production Records', icon: '🥛' },
                { key: 'includeFinancialRecords', label: 'Financial Records', icon: '💰' },
                { key: 'includeFeedRecords', label: 'Feed Records', icon: '🌾' },
                { key: 'includeDocuments', label: 'Documents & Files', icon: '📄' },
                { key: 'includeUsers', label: 'User Data (Sensitive)', icon: '👥' }
              ].map(({ key, label, icon }) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{icon}</span>
                    <Label>{label}</Label>
                  </div>
                  <Switch
                    checked={settings[key as keyof BackupSettingsType] as boolean}
                    onCheckedChange={(checked) => updateSettings({ [key]: checked })}
                  />
                </div>
              ))}
            </div>

            {settings.includeUsers && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex gap-2 text-sm text-amber-900">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Security Notice:</strong> User data includes sensitive information like contact details and roles. Handle exported data with care and store securely.
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export & Storage Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-blue-600" />
              Export & Storage Settings
            </CardTitle>
            <CardDescription>Configure how backups are formatted and stored</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Export Format</Label>
                <Select
                  value={settings.exportFormat}
                  onValueChange={(value: 'csv' | 'excel' | 'pdf' | 'json' | 'both') => 
                    updateSettings({ exportFormat: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="json">JSON (Technical)</SelectItem>
                    <SelectItem value="pdf">PDF (Report)</SelectItem>
                    <SelectItem value="both">Multiple Formats</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Maximum Backup Size (MB)</Label>
                <Input
                  type="number"
                  min="100"
                  max="2000"
                  value={settings.maxBackupSizeMb}
                  onChange={(e) => updateSettings({ maxBackupSizeMb: parseInt(e.target.value) || 500 })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Include Photos in Backup</Label>
                  <p className="text-xs text-gray-500">Increases backup size significantly</p>
                </div>
                <Switch
                  checked={settings.includePhotos}
                  onCheckedChange={(checked) => updateSettings({ includePhotos: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Compress Exports</Label>
                  <p className="text-xs text-gray-500">Reduce file size using ZIP compression</p>
                </div>
                <Switch
                  checked={settings.compressExports}
                  onCheckedChange={(checked) => updateSettings({ compressExports: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cloud Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-600" />
              Cloud Storage Integration
            </CardTitle>
            <CardDescription>Automatically upload backups to cloud storage (Coming Soon)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <Cloud className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Cloud storage integration (Google Drive, Dropbox) is coming in a future update.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                For now, backups can be downloaded manually from the backup history.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Retention & Cleanup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-blue-600" />
              Backup Retention & Cleanup
            </CardTitle>
            <CardDescription>Manage how long backups are kept</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Keep Backups For (days)</Label>
              <Input
                type="number"
                min="7"
                max="365"
                value={settings.backupRetentionDays}
                onChange={(e) => updateSettings({ backupRetentionDays: parseInt(e.target.value) || 90 })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended: 90 days for compliance
              </p>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Auto-Delete Old Backups</Label>
                <p className="text-xs text-gray-500">Automatically remove backups older than retention period</p>
              </div>
              <Switch
                checked={settings.autoDeleteOldBackups}
                onCheckedChange={(checked) => updateSettings({ autoDeleteOldBackups: checked })}
              />
            </div>

            <InfoBox>
              Backups older than {settings.backupRetentionDays} days will be {settings.autoDeleteOldBackups ? 'automatically deleted' : 'marked for manual deletion'}.
            </InfoBox>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Backup Notifications
            </CardTitle>
            <CardDescription>Get notified about backup status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label>Notify on Successful Backup</Label>
                <Switch
                  checked={settings.notifyOnBackupSuccess}
                  onCheckedChange={(checked) => updateSettings({ notifyOnBackupSuccess: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label>Notify on Backup Failure</Label>
                <Switch
                  checked={settings.notifyOnBackupFailure}
                  onCheckedChange={(checked) => updateSettings({ notifyOnBackupFailure: checked })}
                />
              </div>
            </div>

            <div>
              <Label>Notification Email (Optional)</Label>
              <Input
                type="email"
                placeholder="backup-alerts@example.com"
                value={settings.notificationEmail || ''}
                onChange={(e) => updateSettings({ notificationEmail: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to use farm owner's email
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Offline Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Offline Sync Settings
            </CardTitle>
            <CardDescription>Configure how offline changes are synchronized</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Enable Offline Sync</Label>
                <p className="text-xs text-gray-500">Allow data entry when offline</p>
              </div>
              <Switch
                checked={settings.offlineSyncEnabled}
                onCheckedChange={(checked) => updateSettings({ offlineSyncEnabled: checked })}
              />
            </div>

            {settings.offlineSyncEnabled && (
              <div className="ml-6 space-y-4">
                <div>
                  <Label>Sync Frequency (minutes)</Label>
                  <Select
                    value={settings.syncFrequencyMinutes.toString()}
                    onValueChange={(value) => updateSettings({ syncFrequencyMinutes: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">Every 15 minutes</SelectItem>
                      <SelectItem value="30">Every 30 minutes</SelectItem>
                      <SelectItem value="60">Every hour</SelectItem>
                      <SelectItem value="120">Every 2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Conflict Resolution Strategy</Label>
                  <Select
                    value={settings.conflictResolution}
                    onValueChange={(value: 'server_wins' | 'client_wins' | 'manual') => 
                      updateSettings({ conflictResolution: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="server_wins">Server Wins (Recommended)</SelectItem>
                      <SelectItem value="client_wins">Client Wins</SelectItem>
                      <SelectItem value="manual">Manual Review</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    How to handle conflicting changes from different devices
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Integrity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              Data Integrity & Auditing
            </CardTitle>
            <CardDescription>Ensure data quality and track changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Enable Data Validation</Label>
                  <p className="text-xs text-gray-500">Validate data before saving</p>
                </div>
                <Switch
                  checked={settings.enableDataValidation}
                  onCheckedChange={(checked) => updateSettings({ enableDataValidation: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Enable Audit Logs</Label>
                  <p className="text-xs text-gray-500">Track who changed what and when</p>
                </div>
                <Switch
                  checked={settings.enableAuditLogs}
                  onCheckedChange={(checked) => updateSettings({ enableAuditLogs: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backup History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Recent Backup History
            </CardTitle>
            <CardDescription>View and download recent backups</CardDescription>
          </CardHeader>
          <CardContent>
            {backupHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No backups yet</p>
                <p className="text-sm">Create your first backup to see it here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {backupHistory.slice(0, 10).map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(backup.status)}
                      <div>
                        <div className="text-sm font-medium">
                          {backup.backup_type === 'manual' ? 'Manual Backup' : 'Automatic Backup'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(backup.created_at)}
                          {backup.backup_size_mb && ` • ${backup.backup_size_mb.toFixed(2)} MB`}
                        </div>
                      </div>
                    </div>
                    {backup.status === 'completed' && backup.download_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={backup.download_url} download>
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center space-x-2">
            <Info className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-gray-600">
              Changes take effect immediately
            </span>
            {hasUnsavedChanges && (
              <div className="flex items-center space-x-1 ml-4 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                <AlertTriangle className="h-3 w-3" />
                <span>Unsaved changes</span>
              </div>
            )}
          </div>
          <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex space-x-3'}`}>
            <Button
              variant="outline"
              onClick={resetToDefaults}
              className={`hover:bg-red-50 hover:border-red-200 hover:text-red-700 ${isMobile ? 'w-full' : ''}`}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={isLoading}
              className={`bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center ${isMobile ? 'w-full' : ''}`}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}