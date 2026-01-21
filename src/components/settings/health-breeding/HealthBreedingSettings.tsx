// src/components/settings/health-breeding/HealthBreedingSettings.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useDeviceInfo } from '@/lib/hooks/useDeviceInfo'
import {
    Heart,
    Activity,
    Syringe,
    Calendar,
    Baby,
    Bell,
    Save,
    ArrowLeft,
    AlertTriangle,
    Info,
    RotateCcw,
    Stethoscope
} from 'lucide-react'
import HealthSettingsTab from './HealthSettingsTab' // ✅ ADD THIS

interface HealthBreedingSettingsProps {
    farmId: string
    userRole: string
    initialSettings: any // Breeding settings
    healthSettings?: any // ✅ ADD THIS - Health settings
    farmName: string
    veterinarians?: any[] // ✅ ADD THIS - Optional
}

export default function HealthBreedingSettings({
    farmId,
    userRole,
    initialSettings,
    healthSettings, // ✅ ADD THIS
    farmName,
    veterinarians = [] // ✅ ADD THIS
}: HealthBreedingSettingsProps) {
    const { isMobile } = useDeviceInfo()
    const [activeTab, setActiveTab] = useState('breeding')
    const [isLoading, setIsLoading] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    // Breeding Cycle Configuration
    const [cycleSettings, setCycleSettings] = useState({
        minimumBreedingAgeMonths: 15,
        defaultCycleInterval: 21,
        autoCreateNextEvent: true,
        alertType: ['app', 'sms']
    })

    // Heat Detection Settings
    const [heatSettings, setHeatSettings] = useState({
        detectionMethod: 'manual' as 'manual' | 'sensor',
        responsibleUser: 'worker' as 'worker' | 'manager' | 'vet',
        missedHeatAlert: 25,
        reminderFrequency: 'daily' as 'daily' | 'every_2_days' | 'weekly'
    })

    // Insemination Settings
    const [inseminationSettings, setInseminationSettings] = useState({
        breedingMethod: 'ai' as 'ai' | 'natural' | 'et',
        defaultAITechnician: '',
        semenProvider: '',
        costPerAI: 500,
        defaultBull: '',
        autoSchedulePregnancyCheck: true,
        pregnancyCheckDays: 45
    })

    // Pregnancy Check Settings
    const [pregnancySettings, setPregnancySettings] = useState({
        entryMethod: 'vet_only' as 'vet_only' | 'manual',
        diagnosisInterval: 45,
        autoCreateHeatOnFailed: true,
        heatRetryDays: 21
    })

    // Calving Settings
    const [calvingSettings, setCalvingSettings] = useState({
        defaultGestation: 280,
        daysPregnantAtDryoff: 220,
        autoRegisterCalf: true,
        calfIdFormat: 'farm_year_number' as 'farm_year_number' | 'dam_number' | 'sequential',
        autoCreateDryOff: true,
        autoCreateLactation: true,
        postpartumBreedingDelayDays: 60
    })

    // Smart Alerts
    const [smartAlerts, setSmartAlerts] = useState({
        heatReminders: true,
        breedingReminders: true,
        pregnancyCheckReminders: true,
        calvingReminders: true
    })

    const isInitialLoad = useRef(true)

    // Load settings only once when component mounts
    useEffect(() => {
        if (initialSettings && isInitialLoad.current) {
            // Load all settings - USE CAMELCASE EVERYWHERE
            setCycleSettings({
                minimumBreedingAgeMonths: initialSettings.minimumBreedingAgeMonths || 15, // ✅ FIXED
                defaultCycleInterval: initialSettings.defaultCycleInterval || 21,
                autoCreateNextEvent: initialSettings.autoCreateNextEvent ?? true,
                alertType: initialSettings.alertType || ['app', 'sms']
            })

            setHeatSettings({
                detectionMethod: initialSettings.detectionMethod || 'manual',
                responsibleUser: initialSettings.responsibleUser || 'worker',
                missedHeatAlert: initialSettings.missedHeatAlert || 25,
                reminderFrequency: initialSettings.reminderFrequency || 'daily'
            })

            setInseminationSettings({
                breedingMethod: initialSettings.breedingMethod || 'ai',
                defaultAITechnician: initialSettings.defaultAITechnician || '',
                semenProvider: initialSettings.semenProvider || '',
                costPerAI: initialSettings.costPerAI || 500,
                defaultBull: initialSettings.defaultBull || '',
                autoSchedulePregnancyCheck: initialSettings.autoSchedulePregnancyCheck ?? true,
                pregnancyCheckDays: initialSettings.pregnancyCheckDays || 45
            })

            setPregnancySettings({
                entryMethod: initialSettings.entryMethod || 'vet_only',
                diagnosisInterval: initialSettings.diagnosisInterval || 45,
                autoCreateHeatOnFailed: initialSettings.autoCreateHeatOnFailed ?? true,
                heatRetryDays: initialSettings.heatRetryDays || 21
            })

            setCalvingSettings({
                defaultGestation: initialSettings.defaultGestation || 280,
                daysPregnantAtDryoff: initialSettings.daysPregnantAtDryoff || 220, // ✅ FIXED
                autoRegisterCalf: initialSettings.autoRegisterCalf ?? true,
                calfIdFormat: initialSettings.calfIdFormat || 'farm_year_number',
                autoCreateDryOff: initialSettings.autoCreateDryOff ?? true,
                autoCreateLactation: initialSettings.autoCreateLactation ?? true,
                postpartumBreedingDelayDays: initialSettings.postpartumBreedingDelayDays || 60 // ✅ FIXED
            })

            if (initialSettings.smartAlerts) {
                setSmartAlerts({
                    heatReminders: initialSettings.smartAlerts.heatReminders ?? true,
                    breedingReminders: initialSettings.smartAlerts.breedingReminders ?? true,
                    pregnancyCheckReminders: initialSettings.smartAlerts.pregnancyCheckReminders ?? true,
                    calvingReminders: initialSettings.smartAlerts.calvingReminders ?? true
                })
            }

            // Mark as loaded
            setTimeout(() => {
                isInitialLoad.current = false
            }, 100)
        }
    }, [initialSettings])

    // Track changes only after initial load
    useEffect(() => {
        if (!isInitialLoad.current) {
            setHasUnsavedChanges(true)
        }
    }, [cycleSettings, heatSettings, inseminationSettings, pregnancySettings, calvingSettings, smartAlerts])

    const handleSaveSettings = async () => {
        const userConfirmed = window.confirm(
            `Are you sure you want to save these breeding settings?\n\n` +
            `This will update your farm's breeding cycle management configuration.\n\n` +
            `Click OK to proceed or Cancel to review your settings.`
        )

        if (!userConfirmed) return

        setIsLoading(true)
        try {
            const response = await fetch('/api/settings/health-breeding', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    farmId,
                    settings: {
                        ...cycleSettings,
                        ...heatSettings,
                        ...inseminationSettings,
                        ...pregnancySettings,
                        ...calvingSettings,
                        smartAlerts
                    }
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save settings')
            }

            toast.success('Breeding settings saved successfully!', {
                duration: 4000,
                position: 'top-right',
            })

            setHasUnsavedChanges(false) // Reset the flag after successful save
        } catch (error) {
            console.error('Error saving settings:', error)
            toast.error(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`, {
                duration: 6000,
                position: 'top-right',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const resetToDefaults = () => {
        const confirmed = window.confirm(
            `⚠️ Reset to Default Settings?\n\n` +
            `This will reset all breeding settings to their default values.\n\n` +
            `Are you sure you want to continue?`
        )

        if (!confirmed) return


        setCycleSettings({ minimumBreedingAgeMonths: 15, defaultCycleInterval: 21, autoCreateNextEvent: true, alertType: ['app', 'sms'] })
        setHeatSettings({ detectionMethod: 'manual', responsibleUser: 'worker', missedHeatAlert: 25, reminderFrequency: 'daily' })
        setInseminationSettings({ breedingMethod: 'ai', defaultAITechnician: '', semenProvider: '', costPerAI: 500, defaultBull: '', autoSchedulePregnancyCheck: true, pregnancyCheckDays: 45 })
        setPregnancySettings({ entryMethod: 'vet_only', diagnosisInterval: 45, autoCreateHeatOnFailed: true, heatRetryDays: 21 })
        setCalvingSettings({ defaultGestation: 280, daysPregnantAtDryoff: 220, autoRegisterCalf: true, calfIdFormat: 'farm_year_number', autoCreateDryOff: true, autoCreateLactation: true, postpartumBreedingDelayDays: 60 })
        setSmartAlerts({ heatReminders: true, breedingReminders: true, pregnancyCheckReminders: true, calvingReminders: true })

        toast.success('Settings reset to defaults', { duration: 3000 })
    }

    const handleBack = () => {
        if (hasUnsavedChanges) {
            const confirmed = window.confirm(
                `⚠️ Unsaved Changes\n\nYou have unsaved changes. Are you sure you want to leave?`
            )
            if (!confirmed) return
        }
        window.history.back()
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

                <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                        <Heart className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                        <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                            Health & Breeding
                        </h1>
                        <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
                            Configure breeding cycle and reproductive health settings for {farmName}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200">
                <div className="flex gap-4 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('breeding')}
                        className={`px-4 py-3 font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === 'breeding'
                            ? 'border-pink-600 text-pink-600'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Breeding Cycle
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('health')}
                        className={`px-4 py-3 font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === 'health'
                            ? 'border-pink-600 text-pink-600'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4" />
                            Health Settings
                        </div>
                    </button>
                </div>
            </div>

            {activeTab === 'breeding' && (
                <div className="space-y-6">
                    {/* General Breeding Cycle Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-pink-600" />
                                Breeding Cycle Configuration
                            </CardTitle>
                            <CardDescription>General settings for breeding cycle management</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="breedingAge">Minimum Breeding Age (months)</Label>
                                    <Input
                                        id="breedingAge"
                                        type="number"
                                        min="12"
                                        max="24"
                                        value={cycleSettings.minimumBreedingAgeMonths}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            const parsed = value === '' ? 0 : parseInt(value)
                                            setCycleSettings({
                                                ...cycleSettings,
                                                minimumBreedingAgeMonths: isNaN(parsed) ? 0 : parsed
                                            })
                                        }}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Recommended: 15-18 months for dairy heifers
                                    </p>
                                </div>
                                <div>
                                    <Label htmlFor="cycleInterval">Default Heat Cycle Interval (days)</Label>
                                    <Input
                                        id="cycleInterval"
                                        type="number"
                                        value={cycleSettings.defaultCycleInterval}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            const parsed = value === '' ? 0 : parseInt(value)
                                            setCycleSettings({
                                                ...cycleSettings,
                                                defaultCycleInterval: isNaN(parsed) ? 0 : parsed
                                            })
                                        }}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Standard is 21 days for dairy cattle</p>
                                </div>

                                <div>
                                    <Label>Alert Delivery Methods</Label>
                                    <div className="space-y-2 mt-2">
                                        {['app', 'sms', 'whatsapp'].map((method) => (
                                            <label key={method} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={cycleSettings.alertType.includes(method)}
                                                    onChange={(e) => {
                                                        const updated = e.target.checked
                                                            ? [...cycleSettings.alertType, method]
                                                            : cycleSettings.alertType.filter(m => m !== method)
                                                        setCycleSettings({ ...cycleSettings, alertType: updated })
                                                    }}
                                                    className="w-4 h-4 text-pink-600 rounded"
                                                />
                                                <span className="text-sm capitalize">{method}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>


                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <Label>Enable Automatic Next-Event Creation</Label>
                                    <p className="text-xs text-gray-500">Auto-schedule follow-up events</p>
                                </div>
                                <Switch
                                    checked={cycleSettings.autoCreateNextEvent}
                                    onCheckedChange={(checked) => setCycleSettings({ ...cycleSettings, autoCreateNextEvent: checked })}
                                />
                            </div>

                            <InfoBox>
                                <strong>Breeding Readiness:</strong> Animals will be flagged as ready for breeding when they reach {cycleSettings.minimumBreedingAgeMonths} months of age. This helps prevent breeding heifers too early, which can cause health complications.
                            </InfoBox>

                            <InfoBox>
                                <strong>Kenyan Tip:</strong> SMS and WhatsApp alerts are recommended for rural areas with limited internet connectivity.
                            </InfoBox>
                        </CardContent>
                    </Card>

                    {/* Heat Detection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-pink-600" />
                                Heat Detection Settings
                            </CardTitle>
                            <CardDescription>Configure how heat is detected and tracked</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Detection Method</Label>
                                    <Select
                                        value={heatSettings.detectionMethod}
                                        onValueChange={(value: 'manual' | 'sensor') => setHeatSettings({ ...heatSettings, detectionMethod: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="manual">Manual (Visual Observation)</SelectItem>
                                            <SelectItem value="sensor">Sensor-Based (Future)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Responsible User Role</Label>
                                    <Select
                                        value={heatSettings.responsibleUser}
                                        onValueChange={(value: 'worker' | 'manager' | 'vet') => setHeatSettings({ ...heatSettings, responsibleUser: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="worker">Farm Worker</SelectItem>
                                            <SelectItem value="manager">Farm Manager</SelectItem>
                                            <SelectItem value="vet">Veterinarian</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Alert After Missed Heat (days)</Label>
                                    <Input
                                        type="number"
                                        value={heatSettings.missedHeatAlert}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            const parsed = value === '' ? 0 : parseInt(value)
                                            setHeatSettings({
                                                ...heatSettings,
                                                missedHeatAlert: isNaN(parsed) ? 0 : parsed
                                            })
                                        }}
                                    />
                                </div>

                                <div>
                                    <Label>Reminder Frequency</Label>
                                    <Select
                                        value={heatSettings.reminderFrequency}
                                        onValueChange={(value: 'daily' | 'every_2_days' | 'weekly') => setHeatSettings({ ...heatSettings, reminderFrequency: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Daily</SelectItem>
                                            <SelectItem value="every_2_days">Every 2 Days</SelectItem>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Insemination */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Syringe className="w-5 h-5 text-pink-600" />
                                Insemination Settings
                            </CardTitle>
                            <CardDescription>Configure AI and natural service preferences</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Primary Breeding Method</Label>
                                <div className="grid md:grid-cols-3 gap-3 mt-2">
                                    {[
                                        { value: 'ai', label: 'Artificial Insemination (AI)', desc: 'Most common in Kenya' },
                                        { value: 'natural', label: 'Natural Service', desc: 'Using bulls' },
                                        { value: 'et', label: 'Embryo Transfer (ET)', desc: 'Advanced breeding' }
                                    ].map((method) => (
                                        <label
                                            key={method.value}
                                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${inseminationSettings.breedingMethod === method.value
                                                ? 'border-pink-500 bg-pink-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="breedingMethod"
                                                value={method.value}
                                                checked={inseminationSettings.breedingMethod === method.value}
                                                onChange={(e) => setInseminationSettings({ ...inseminationSettings, breedingMethod: e.target.value as 'ai' | 'natural' | 'et' })}
                                                className="sr-only"
                                            />
                                            <div className="text-sm font-medium">{method.label}</div>
                                            <div className="text-xs text-gray-500 mt-1">{method.desc}</div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <Label>Auto-Schedule Pregnancy Check</Label>
                                        <p className="text-xs text-gray-500">After {inseminationSettings.pregnancyCheckDays} days</p>
                                    </div>
                                    <Switch
                                        checked={inseminationSettings.autoSchedulePregnancyCheck}
                                        onCheckedChange={(checked) => setInseminationSettings({ ...inseminationSettings, autoSchedulePregnancyCheck: checked })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pregnancy Check */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-pink-600" />
                                Pregnancy Check Settings
                            </CardTitle>
                            <CardDescription>Configure pregnancy diagnosis workflow</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Entry Permissions</Label>
                                    <Select
                                        value={pregnancySettings.entryMethod}
                                        onValueChange={(value: 'vet_only' | 'manual') => setPregnancySettings({ ...pregnancySettings, entryMethod: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="vet_only">Vet Only</SelectItem>
                                            <SelectItem value="manual">Anyone Can Enter</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {pregnancySettings.entryMethod === 'vet_only'
                                            ? 'Recommended for small/medium farms'
                                            : 'For farms with trained staff'}
                                    </p>
                                </div>

                                <div>
                                    <Label>Default Check Interval (days post-AI)</Label>
                                    <Input
                                        type="number"
                                        value={pregnancySettings.diagnosisInterval}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            const parsed = value === '' ? 0 : parseInt(value)
                                            setPregnancySettings({
                                                ...pregnancySettings,
                                                diagnosisInterval: isNaN(parsed) ? 0 : parsed
                                            })
                                        }}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Typical range: 45-60 days</p>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <Label>If Not Pregnant, Auto-Create Heat Reminder</Label>
                                        <p className="text-xs text-gray-500">After {pregnancySettings.heatRetryDays} days</p>
                                    </div>
                                    <Switch
                                        checked={pregnancySettings.autoCreateHeatOnFailed}
                                        onCheckedChange={(checked) => setPregnancySettings({ ...pregnancySettings, autoCreateHeatOnFailed: checked })}
                                    />
                                </div>
                            </div>

                            <InfoBox>
                                <strong>Best Practice:</strong> Early pregnancy detection (45-60 days) reduces open days and improves herd productivity.
                            </InfoBox>
                        </CardContent>
                    </Card>

                    {/* Calving Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Baby className="w-5 h-5 text-pink-600" />
                                Calving Event Settings
                            </CardTitle>
                            <CardDescription>Configure calving and post-calving automation</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Default Gestation Period (days)</Label>
                                    <Input
                                        type="number"
                                        value={calvingSettings.defaultGestation}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            const parsed = value === '' ? 0 : parseInt(value)
                                            setCalvingSettings({
                                                ...calvingSettings,
                                                defaultGestation: isNaN(parsed) ? 0 : parsed
                                            })
                                        }}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Standard: 280 days</p>
                                </div>

                                <div>
                                    <Label>Days After Calving Before Rebreeding</Label>
                                    <Input
                                        type="number"
                                        min="30"
                                        max="120"
                                        value={calvingSettings.postpartumBreedingDelayDays}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            const parsed = value === '' ? 0 : parseInt(value)
                                            setCalvingSettings({
                                                ...calvingSettings,
                                                postpartumBreedingDelayDays: isNaN(parsed) ? 0 : parsed
                                            })
                                        }}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Recommended: 45-60 days</p>
                                </div>
                            </div>

                            {/* NEW SECTION - Dry-off timing */}
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <Label className="mb-3 block">Dry-Off Schedule</Label>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm">Days Pregnant at Dry-Off</Label>
                                        <Input
                                            type="number"
                                            min="180"
                                            max="250"
                                            value={calvingSettings.daysPregnantAtDryoff}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                const parsed = value === '' ? 0 : parseInt(value)
                                                setCalvingSettings({
                                                    ...calvingSettings,
                                                    daysPregnantAtDryoff: isNaN(parsed) ? 0 : parsed
                                                })
                                            }}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Days after conception to stop milking
                                        </p>
                                    </div>

                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                        <div className="text-xs text-blue-900">
                                            <div className="font-medium mb-1">Calculated Dry Period:</div>
                                            <div>
                                                {calvingSettings.defaultGestation - calvingSettings.daysPregnantAtDryoff} days
                                                before expected calving
                                            </div>
                                            <div className="mt-2 text-blue-700">
                                                {calvingSettings.defaultGestation - calvingSettings.daysPregnantAtDryoff >= 50 &&
                                                    calvingSettings.defaultGestation - calvingSettings.daysPregnantAtDryoff <= 70
                                                    ? '✓ Within recommended range (50-70 days)'
                                                    : '⚠ Outside typical range (50-70 days)'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick presets */}
                                <div className="mt-3">
                                    <Label className="text-xs text-gray-600 mb-2 block">Quick Presets:</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCalvingSettings({
                                                ...calvingSettings,
                                                daysPregnantAtDryoff: 210
                                            })}
                                        >
                                            70-day dry (210)
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCalvingSettings({
                                                ...calvingSettings,
                                                daysPregnantAtDryoff: 220
                                            })}
                                        >
                                            60-day dry (220)
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCalvingSettings({
                                                ...calvingSettings,
                                                daysPregnantAtDryoff: 230
                                            })}
                                        >
                                            50-day dry (230)
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Info box about dry period importance */}
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex gap-2 text-sm text-blue-900">
                                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <strong>Dry Period Management:</strong> When auto-create dry-off is enabled,
                                        the system will automatically schedule dry-off {calvingSettings.daysPregnantAtDryoff} days
                                        after successful insemination (approximately {calvingSettings.defaultGestation - calvingSettings.daysPregnantAtDryoff} days
                                        before expected calving). This ensures adequate mammary recovery.
                                    </div>
                                </div>
                            </div>

                            {/* Add helpful info box */}
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex gap-2 text-sm text-amber-900">
                                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <strong>Voluntary Waiting Period:</strong> Animals will not be flagged for breeding until {calvingSettings.postpartumBreedingDelayDays} days after calving. This allows uterine recovery and improves conception rates.
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>Auto-Register Calf in System</Label>
                                    <Switch
                                        checked={calvingSettings.autoRegisterCalf}
                                        onCheckedChange={(checked) => setCalvingSettings({ ...calvingSettings, autoRegisterCalf: checked })}
                                    />
                                </div>

                                {calvingSettings.autoRegisterCalf && (
                                    <div className="ml-6">
                                        <Label>Calf ID Format</Label>
                                        <Select
                                            value={calvingSettings.calfIdFormat}
                                            onValueChange={(value: 'farm_year_number' | 'dam_number' | 'sequential') =>
                                                setCalvingSettings({ ...calvingSettings, calfIdFormat: value })}
                                        >
                                            <SelectTrigger className="w-full md:w-64">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="farm_year_number">Farm-Year-Number (e.g., KMB-2025-001)</SelectItem>
                                                <SelectItem value="dam_number">Dam ID + Number (e.g., C123-001)</SelectItem>
                                                <SelectItem value="sequential">Sequential (e.g., 001, 002, 003)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>Auto-Create Dry-Off Event for Mother</Label>
                                    <Switch
                                        checked={calvingSettings.autoCreateDryOff}
                                        onCheckedChange={(checked) => setCalvingSettings({ ...calvingSettings, autoCreateDryOff: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>Auto-Create New Lactation Record</Label>
                                    <Switch
                                        checked={calvingSettings.autoCreateLactation}
                                        onCheckedChange={(checked) => setCalvingSettings({ ...calvingSettings, autoCreateLactation: checked })}
                                    />
                                </div>
                            </div>

                            <InfoBox>
                                <strong>Automation Benefits:</strong> Auto-registration saves time and ensures accurate dam-calf linkage for breeding records and lineage tracking.
                            </InfoBox>
                        </CardContent>
                    </Card>

                    {/* Smart Alerts */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-pink-600" />
                                Smart Alerts Configuration
                            </CardTitle>
                            <CardDescription>Configure automatic notifications for breeding events</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(smartAlerts).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                                        <Label className="capitalize">
                                            {key.replace(/([A-Z])/g, ' $1').replace('Reminders', ' Reminders').trim()}
                                        </Label>
                                        <Switch
                                            checked={value}
                                            onCheckedChange={(checked) => setSmartAlerts({ ...smartAlerts, [key]: checked })}
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-6 border-t">
                        <div className="flex items-center space-x-2">
                            <Info className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-gray-600">
                                Changes will apply to future breeding events
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
                                Reset to Defaults
                            </Button>
                            <Button
                                onClick={handleSaveSettings}
                                disabled={isLoading}
                                className={`bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center ${isMobile ? 'w-full' : ''} ${hasUnsavedChanges ? '' : ''}`}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {isLoading ? 'Saving...' : 'Save Settings'}
                                {hasUnsavedChanges && (
                                    <span className="ml-1 w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'health' && (
                <HealthSettingsTab
                    farmId={farmId}
                    userRole={userRole}
                    initialSettings={healthSettings || {}} // Pass health settings
                    farmName={farmName}
                    veterinarians={veterinarians}
                />
            )}
        </div>
    )
}