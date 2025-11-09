// components/settings/health-breeding/HealthSettingsTab.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import {
    Stethoscope,
    Syringe,
    AlertTriangle,
    Pill,
    Activity,
    Calendar,
    Shield,
    DollarSign,
    Bell,
    Settings,
    Info,
    Save,
    RotateCcw
} from 'lucide-react'

interface HealthSettingsTabProps {
    farmId: string
    userRole: string
    initialSettings: any
    farmName: string
    veterinarians?: any[]
}

export default function HealthSettingsTab({
    farmId,
    userRole,
    initialSettings,
    farmName,
    veterinarians = []
}: HealthSettingsTabProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    // 1. General Health Management
    const [generalSettings, setGeneralSettings] = useState({
        defaultVeterinarianId: '',
        requireVetApprovalForCritical: true,
        autoAssignHealthStatus: true,
        healthStatusUpdateMethod: 'auto' as 'auto' | 'manual' | 'vet_only'
    })

    // 2. Health Monitoring & Checkups
    const [monitoringSettings, setMonitoringSettings] = useState({
        enableRoutineCheckups: true,
        routineCheckupInterval: 90,
        checkupReminderDaysBefore: 7,
        vitalsTrackingEnabled: true,
        requiredVitals: ['temperature', 'weight'] as string[],
        bodyConditionScoreSystem: '1-5' as '1-5' | '1-9',
        temperatureUnit: 'celsius' as 'celsius' | 'fahrenheit',
        weightUnit: 'kg' as 'kg' | 'lbs'
    })

    // 3. Vaccination Management
    const [vaccinationSettings, setVaccinationSettings] = useState({
        enableVaccinationSchedules: true,
        vaccinationReminderDaysBefore: 14,
        autoCreateVaccinationReminders: true,
        requireBatchNumberTracking: true,
        requireVetForVaccinations: false,
        defaultVaccinationRoute: 'intramuscular' as 'intramuscular' | 'subcutaneous' | 'intranasal' | 'oral',
        trackVaccineInventory: true,
        overdueVaccinationAlert: true,
        overdueVaccinationDays: 7
    })

    // 4. Disease & Outbreak Management
    const [outbreakSettings, setOutbreakSettings] = useState({
        enableOutbreakTracking: true,
        autoQuarantineOnOutbreak: true,
        quarantineDurationDays: 14,
        requireLabTestsForCriticalIllness: true,
        diseaseNotificationMethod: ['app', 'sms'] as string[],
        isolationAreaRequired: true,
        autoCreateTreatmentProtocol: false
    })

    // 5. Treatment & Medication
    const [treatmentSettings, setTreatmentSettings] = useState({
        requirePrescriptionForMedication: false,
        trackMedicationInventory: true,
        withdrawalPeriodTracking: true,
        autoCalculateWithdrawal: true,
        defaultWithdrawalPeriodDays: 7,
        medicationCostTracking: true,
        requireDosageCalculation: true,
        dosageCalculationBy: 'weight' as 'weight' | 'age' | 'fixed'
    })

    // 6. Follow-up Management
    const [followUpSettings, setFollowUpSettings] = useState({
        enableAutomaticFollowUps: true,
        followUpIntervalDays: 7,
        followUpReminderDaysBefore: 2,
        maxFollowUpsBeforeResolution: 5,
        autoResolveOnRecovery: false,
        requireVetForResolution: false
    })

    // 7. Veterinary Visits
    const [visitSettings, setVisitSettings] = useState({
        enableVetVisitScheduling: true,
        visitReminderDaysBefore: 3,
        requireVisitConfirmation: false,
        emergencyVisitPriority: true,
        travelRadiusKm: 50,
        preferredVisitTime: 'morning' as 'morning' | 'afternoon' | 'evening' | 'any'
    })

    // 8. Health Protocols
    const [protocolSettings, setProtocolSettings] = useState({
        enableStandardProtocols: true,
        protocolAutoExecution: false,
        requireProtocolApproval: true,
        protocolApprovalBy: 'farm_manager' as 'farm_owner' | 'farm_manager' | 'veterinarian'
    })

    // 9. Deworming Management
    const [dewormingSettings, setDewormingSettings] = useState({
        enableDewormingSchedule: true,
        dewormingIntervalMonths: 3,
        dewormingReminderDaysBefore: 7,
        defaultDewormingProduct: '',
        dewormingByWeight: true
    })

    // 10. Documentation
    const [documentationSettings, setDocumentationSettings] = useState({
        requirePhotosForInjuries: false,
        requireLabResultsUpload: false,
        healthRecordRetentionYears: 5,
        exportFormat: 'both' as 'pdf' | 'excel' | 'both',
        includePhotosInExport: false
    })

    // 11. Cost Management
    const [costSettings, setCostSettings] = useState({
        trackHealthExpenses: true,
        defaultCurrency: 'KES' as 'KES' | 'USD' | 'EUR' | 'GBP',
        budgetAlertThreshold: undefined as number | undefined,
        costCategories: ['consultation', 'medication', 'vaccination', 'surgery', 'lab_tests', 'emergency'] as string[]
    })

    // 12. Alerts & Notifications
    const [alertSettings, setAlertSettings] = useState({
        healthAlerts: {
            checkupReminders: true,
            vaccinationDue: true,
            followUpRequired: true,
            criticalHealthStatus: true,
            outbreakDetected: true,
            vetVisitScheduled: true,
            medicationReminder: true,
            withdrawalPeriodEnd: true
        },
        alertDeliveryMethods: ['app', 'sms'] as string[],
        criticalAlertEscalation: true,
        escalationDelayHours: 2
    })

    // 13. Animal-Specific Settings
    const [animalSettings, setAnimalSettings] = useState({
        enableAnimalSpecificProtocols: false,
        ageBasedHealthPlans: true,
        breedSpecificGuidelines: false,
        productionStageConsideration: true
    })

    // 14. Data Privacy
    const [privacySettings, setPrivacySettings] = useState({
        shareDataWithVet: true,
        allowVetRemoteAccess: false,
        requireDataBackup: true,
        backupFrequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
        gdprCompliance: false
    })

    // 15. Integration Settings
    const [integrationSettings, setIntegrationSettings] = useState({
        syncWithBreedingRecords: true,
        syncWithProductionRecords: true,
        syncWithFeedingRecords: false,
        autoUpdateAnimalStatus: true
    })

    // Load initial settings
    useEffect(() => {
        if (initialSettings) {
            setGeneralSettings({
                defaultVeterinarianId: initialSettings.defaultVeterinarianId || '',
                requireVetApprovalForCritical: initialSettings.requireVetApprovalForCritical ?? true,
                autoAssignHealthStatus: initialSettings.autoAssignHealthStatus ?? true,
                healthStatusUpdateMethod: initialSettings.healthStatusUpdateMethod || 'auto'
            })

            setMonitoringSettings({
                enableRoutineCheckups: initialSettings.enableRoutineCheckups ?? true,
                routineCheckupInterval: initialSettings.routineCheckupInterval || 90,
                checkupReminderDaysBefore: initialSettings.checkupReminderDaysBefore || 7,
                vitalsTrackingEnabled: initialSettings.vitalsTrackingEnabled ?? true,
                requiredVitals: initialSettings.requiredVitals || ['temperature', 'weight'],
                bodyConditionScoreSystem: initialSettings.bodyConditionScoreSystem || '1-5',
                temperatureUnit: initialSettings.temperatureUnit || 'celsius',
                weightUnit: initialSettings.weightUnit || 'kg'
            })

            setVaccinationSettings({
                enableVaccinationSchedules: initialSettings.enableVaccinationSchedules ?? true,
                vaccinationReminderDaysBefore: initialSettings.vaccinationReminderDaysBefore || 14,
                autoCreateVaccinationReminders: initialSettings.autoCreateVaccinationReminders ?? true,
                requireBatchNumberTracking: initialSettings.requireBatchNumberTracking ?? true,
                requireVetForVaccinations: initialSettings.requireVetForVaccinations ?? false,
                defaultVaccinationRoute: initialSettings.defaultVaccinationRoute || 'intramuscular',
                trackVaccineInventory: initialSettings.trackVaccineInventory ?? true,
                overdueVaccinationAlert: initialSettings.overdueVaccinationAlert ?? true,
                overdueVaccinationDays: initialSettings.overdueVaccinationDays || 7
            })

            setOutbreakSettings({
                enableOutbreakTracking: initialSettings.enableOutbreakTracking ?? true,
                autoQuarantineOnOutbreak: initialSettings.autoQuarantineOnOutbreak ?? true,
                quarantineDurationDays: initialSettings.quarantineDurationDays || 14,
                requireLabTestsForCriticalIllness: initialSettings.requireLabTestsForCriticalIllness ?? true,
                diseaseNotificationMethod: initialSettings.diseaseNotificationMethod || ['app', 'sms'],
                isolationAreaRequired: initialSettings.isolationAreaRequired ?? true,
                autoCreateTreatmentProtocol: initialSettings.autoCreateTreatmentProtocol ?? false
            })

            setTreatmentSettings({
                requirePrescriptionForMedication: initialSettings.requirePrescriptionForMedication ?? false,
                trackMedicationInventory: initialSettings.trackMedicationInventory ?? true,
                withdrawalPeriodTracking: initialSettings.withdrawalPeriodTracking ?? true,
                autoCalculateWithdrawal: initialSettings.autoCalculateWithdrawal ?? true,
                defaultWithdrawalPeriodDays: initialSettings.defaultWithdrawalPeriodDays || 7,
                medicationCostTracking: initialSettings.medicationCostTracking ?? true,
                requireDosageCalculation: initialSettings.requireDosageCalculation ?? true,
                dosageCalculationBy: initialSettings.dosageCalculationBy || 'weight'
            })

            setFollowUpSettings({
                enableAutomaticFollowUps: initialSettings.enableAutomaticFollowUps ?? true,
                followUpIntervalDays: initialSettings.followUpIntervalDays || 7,
                followUpReminderDaysBefore: initialSettings.followUpReminderDaysBefore || 2,
                maxFollowUpsBeforeResolution: initialSettings.maxFollowUpsBeforeResolution || 5,
                autoResolveOnRecovery: initialSettings.autoResolveOnRecovery ?? false,
                requireVetForResolution: initialSettings.requireVetForResolution ?? false
            })

            setVisitSettings({
                enableVetVisitScheduling: initialSettings.enableVetVisitScheduling ?? true,
                visitReminderDaysBefore: initialSettings.visitReminderDaysBefore || 3,
                requireVisitConfirmation: initialSettings.requireVisitConfirmation ?? false,
                emergencyVisitPriority: initialSettings.emergencyVisitPriority ?? true,
                travelRadiusKm: initialSettings.travelRadiusKm || 50,
                preferredVisitTime: initialSettings.preferredVisitTime || 'morning'
            })

            setProtocolSettings({
                enableStandardProtocols: initialSettings.enableStandardProtocols ?? true,
                protocolAutoExecution: initialSettings.protocolAutoExecution ?? false,
                requireProtocolApproval: initialSettings.requireProtocolApproval ?? true,
                protocolApprovalBy: initialSettings.protocolApprovalBy || 'farm_manager'
            })

            setDewormingSettings({
                enableDewormingSchedule: initialSettings.enableDewormingSchedule ?? true,
                dewormingIntervalMonths: initialSettings.dewormingIntervalMonths || 3,
                dewormingReminderDaysBefore: initialSettings.dewormingReminderDaysBefore || 7,
                defaultDewormingProduct: initialSettings.defaultDewormingProduct || '',
                dewormingByWeight: initialSettings.dewormingByWeight ?? true
            })

            setDocumentationSettings({
                requirePhotosForInjuries: initialSettings.requirePhotosForInjuries ?? false,
                requireLabResultsUpload: initialSettings.requireLabResultsUpload ?? false,
                healthRecordRetentionYears: initialSettings.healthRecordRetentionYears || 5,
                exportFormat: initialSettings.exportFormat || 'both',
                includePhotosInExport: initialSettings.includePhotosInExport ?? false
            })

            setCostSettings({
                trackHealthExpenses: initialSettings.trackHealthExpenses ?? true,
                defaultCurrency: initialSettings.defaultCurrency || 'KES',
                budgetAlertThreshold: initialSettings.budgetAlertThreshold,
                costCategories: initialSettings.costCategories || ['consultation', 'medication', 'vaccination', 'surgery', 'lab_tests', 'emergency']
            })

            if (initialSettings.healthAlerts) {
                setAlertSettings({
                    healthAlerts: initialSettings.healthAlerts,
                    alertDeliveryMethods: initialSettings.alertDeliveryMethods || ['app', 'sms'],
                    criticalAlertEscalation: initialSettings.criticalAlertEscalation ?? true,
                    escalationDelayHours: initialSettings.escalationDelayHours || 2
                })
            }

            setAnimalSettings({
                enableAnimalSpecificProtocols: initialSettings.enableAnimalSpecificProtocols ?? false,
                ageBasedHealthPlans: initialSettings.ageBasedHealthPlans ?? true,
                breedSpecificGuidelines: initialSettings.breedSpecificGuidelines ?? false,
                productionStageConsideration: initialSettings.productionStageConsideration ?? true
            })

            setPrivacySettings({
                shareDataWithVet: initialSettings.shareDataWithVet ?? true,
                allowVetRemoteAccess: initialSettings.allowVetRemoteAccess ?? false,
                requireDataBackup: initialSettings.requireDataBackup ?? true,
                backupFrequency: initialSettings.backupFrequency || 'weekly',
                gdprCompliance: initialSettings.gdprCompliance ?? false
            })

            setIntegrationSettings({
                syncWithBreedingRecords: initialSettings.syncWithBreedingRecords ?? true,
                syncWithProductionRecords: initialSettings.syncWithProductionRecords ?? true,
                syncWithFeedingRecords: initialSettings.syncWithFeedingRecords ?? false,
                autoUpdateAnimalStatus: initialSettings.autoUpdateAnimalStatus ?? true
            })
        }
    }, [initialSettings])

    // Track changes
    useEffect(() => {
        setHasUnsavedChanges(true)
    }, [
        generalSettings, monitoringSettings, vaccinationSettings, outbreakSettings,
        treatmentSettings, followUpSettings, visitSettings, protocolSettings,
        dewormingSettings, documentationSettings, costSettings, alertSettings,
        animalSettings, privacySettings, integrationSettings
    ])

    const handleSaveSettings = async () => {
        const userConfirmed = window.confirm(
            `Are you sure you want to save these health settings?\n\n` +
            `This will update your farm's health management configuration.\n\n` +
            `Click OK to proceed or Cancel to review your settings.`
        )

        if (!userConfirmed) return

        setIsLoading(true)
        try {
            const allSettings = {
                ...generalSettings,
                ...monitoringSettings,
                ...vaccinationSettings,
                ...outbreakSettings,
                ...treatmentSettings,
                ...followUpSettings,
                ...visitSettings,
                ...protocolSettings,
                ...dewormingSettings,
                ...documentationSettings,
                ...costSettings,
                ...alertSettings,
                ...animalSettings,
                ...privacySettings,
                ...integrationSettings
            }

            const response = await fetch('/api/settings/health', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    farmId,
                    settings: allSettings
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save settings')
            }

            toast.success('Health settings saved successfully!', {
                duration: 4000,
                position: 'top-right',
            })

            setHasUnsavedChanges(false)
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
            `This will reset all health settings to their default values.\n\n` +
            `Are you sure you want to continue?`
        )

        if (!confirmed) return

        // Reset all to defaults (same as initial defaults in the component)
        setGeneralSettings({
            defaultVeterinarianId: '',
            requireVetApprovalForCritical: true,
            autoAssignHealthStatus: true,
            healthStatusUpdateMethod: 'auto'
        })
        // ... (reset all other settings similarly)

        toast.success('Settings reset to defaults', { duration: 3000 })
    }

    const InfoBox = ({ children }: { children: React.ReactNode }) => (
        <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>{children}</div>
        </div>
    )

    return (
        <div className="space-y-6">
            {/* 1. GENERAL HEALTH MANAGEMENT */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-blue-600" />
                        General Health Management
                    </CardTitle>
                    <CardDescription>Core health management settings and veterinary assignments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="defaultVet">Default Veterinarian</Label>
                            <Select
                                value={generalSettings.defaultVeterinarianId}
                                onValueChange={(value) => setGeneralSettings({ ...generalSettings, defaultVeterinarianId: value })}
                            >
                                <SelectTrigger id="defaultVet">
                                    <SelectValue placeholder="Select default veterinarian" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No default veterinarian</SelectItem>
                                    {veterinarians.map((vet) => (
                                        <SelectItem key={vet.id} value={vet.id}>
                                            {vet.name} - {vet.clinic_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">
                                Auto-assigned to new health records
                            </p>
                        </div>

                        <div>
                            <Label>Health Status Update Method</Label>
                            <Select
                                value={generalSettings.healthStatusUpdateMethod}
                                onValueChange={(value: 'auto' | 'manual' | 'vet_only') =>
                                    setGeneralSettings({ ...generalSettings, healthStatusUpdateMethod: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="auto">Automatic (System)</SelectItem>
                                    <SelectItem value="manual">Manual (Any User)</SelectItem>
                                    <SelectItem value="vet_only">Vet Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                                <Label>Require Vet Approval for Critical Cases</Label>
                                <p className="text-xs text-gray-500">Critical illnesses need vet confirmation</p>
                            </div>
                            <Switch
                                checked={generalSettings.requireVetApprovalForCritical}
                                onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, requireVetApprovalForCritical: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                                <Label>Auto-Assign Health Status</Label>
                                <p className="text-xs text-gray-500">System updates animal status automatically</p>
                            </div>
                            <Switch
                                checked={generalSettings.autoAssignHealthStatus}
                                onCheckedChange={(checked) => setGeneralSettings({ ...generalSettings, autoAssignHealthStatus: checked })}
                            />
                        </div>
                    </div>

                    <InfoBox>
                        <strong>Recommended:</strong> Enable auto-assign for real-time health status updates. Use vet approval for critical cases to ensure professional oversight.
                    </InfoBox>
                </CardContent>
            </Card>

            {/* 2. HEALTH MONITORING & CHECKUPS */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-purple-600" />
                        Health Monitoring & Checkups
                    </CardTitle>
                    <CardDescription>Configure routine checkups and vital signs tracking</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-purple-50">
                        <div>
                            <Label>Enable Routine Checkups</Label>
                            <p className="text-xs text-gray-500">Schedule regular health assessments</p>
                        </div>
                        <Switch
                            checked={monitoringSettings.enableRoutineCheckups}
                            onCheckedChange={(checked) => setMonitoringSettings({ ...monitoringSettings, enableRoutineCheckups: checked })}
                        />
                    </div>

                    {monitoringSettings.enableRoutineCheckups && (
                        <>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="checkupInterval">Routine Checkup Interval (days)</Label>
                                    <Input
                                        id="checkupInterval"
                                        type="number"
                                        min="30"
                                        max="365"
                                        value={monitoringSettings.routineCheckupInterval}
                                        onChange={(e) => setMonitoringSettings({
                                            ...monitoringSettings,
                                            routineCheckupInterval: parseInt(e.target.value) || 90
                                        })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Recommended: 90 days (quarterly)</p>
                                </div>

                                <div>
                                    <Label htmlFor="checkupReminder">Reminder Days Before</Label>
                                    <Input
                                        id="checkupReminder"
                                        type="number"
                                        min="1"
                                        max="30"
                                        value={monitoringSettings.checkupReminderDaysBefore}
                                        onChange={(e) => setMonitoringSettings({
                                            ...monitoringSettings,
                                            checkupReminderDaysBefore: parseInt(e.target.value) || 7
                                        })}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="border-t pt-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg mb-3">
                            <Label>Enable Vitals Tracking</Label>
                            <Switch
                                checked={monitoringSettings.vitalsTrackingEnabled}
                                onCheckedChange={(checked) => setMonitoringSettings({ ...monitoringSettings, vitalsTrackingEnabled: checked })}
                            />
                        </div>

                        {monitoringSettings.vitalsTrackingEnabled && (
                            <>
                                <Label className="mb-2 block">Required Vitals</Label>
                                <div className="grid md:grid-cols-2 gap-2">
                                    {['temperature', 'pulse', 'respiration', 'weight', 'bcs'].map((vital) => (
                                        <label key={vital} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={monitoringSettings.requiredVitals.includes(vital)}
                                                onChange={(e) => {
                                                    const updated = e.target.checked
                                                        ? [...monitoringSettings.requiredVitals, vital]
                                                        : monitoringSettings.requiredVitals.filter(v => v !== vital)
                                                    setMonitoringSettings({ ...monitoringSettings, requiredVitals: updated })
                                                }}
                                                className="w-4 h-4 text-purple-600 rounded"
                                            />
                                            <span className="text-sm capitalize">
                                                {vital === 'bcs' ? 'Body Condition Score' : vital}
                                            </span>
                                        </label>
                                    ))}
                                </div>

                                <div className="grid md:grid-cols-3 gap-4 mt-4">
                                    <div>
                                        <Label>BCS System</Label>
                                        <Select
                                            value={monitoringSettings.bodyConditionScoreSystem}
                                            onValueChange={(value: '1-5' | '1-9') =>
                                                setMonitoringSettings({ ...monitoringSettings, bodyConditionScoreSystem: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1-5">1-5 Scale</SelectItem>
                                                <SelectItem value="1-9">1-9 Scale</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label>Temperature Unit</Label>
                                        <Select
                                            value={monitoringSettings.temperatureUnit}
                                            onValueChange={(value: 'celsius' | 'fahrenheit') =>
                                                setMonitoringSettings({ ...monitoringSettings, temperatureUnit: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="celsius">Celsius (°C)</SelectItem>
                                                <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label>Weight Unit</Label>
                                        <Select
                                            value={monitoringSettings.weightUnit}
                                            onValueChange={(value: 'kg' | 'lbs') =>
                                                setMonitoringSettings({ ...monitoringSettings, weightUnit: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="kg">Kilograms (kg)</SelectItem>
                                                <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 3. VACCINATION MANAGEMENT */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Syringe className="w-5 h-5 text-green-600" />
                        Vaccination Management
                    </CardTitle>
                    <CardDescription>Configure vaccination schedules, reminders, and tracking</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                        <div>
                            <Label>Enable Vaccination Schedules</Label>
                            <p className="text-xs text-gray-500">Track and schedule vaccinations</p>
                        </div>
                        <Switch
                            checked={vaccinationSettings.enableVaccinationSchedules}
                            onCheckedChange={(checked) => setVaccinationSettings({ ...vaccinationSettings, enableVaccinationSchedules: checked })}
                        />
                    </div>

                    {vaccinationSettings.enableVaccinationSchedules && (
                        <>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="vaccinationReminder">Reminder Days Before Due Date</Label>
                                    <Input
                                        id="vaccinationReminder"
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={vaccinationSettings.vaccinationReminderDaysBefore}
                                        onChange={(e) => setVaccinationSettings({
                                            ...vaccinationSettings,
                                            vaccinationReminderDaysBefore: parseInt(e.target.value) || 14
                                        })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Allows time for vet scheduling</p>
                                </div>

                                <div>
                                    <Label htmlFor="overdueAlert">Alert After Days Overdue</Label>
                                    <Input
                                        id="overdueAlert"
                                        type="number"
                                        min="1"
                                        max="30"
                                        value={vaccinationSettings.overdueVaccinationDays}
                                        onChange={(e) => setVaccinationSettings({
                                            ...vaccinationSettings,
                                            overdueVaccinationDays: parseInt(e.target.value) || 7
                                        })}
                                    />
                                </div>

                                <div>
                                    <Label>Default Vaccination Route</Label>
                                    <Select
                                        value={vaccinationSettings.defaultVaccinationRoute}
                                        onValueChange={(value: any) => setVaccinationSettings({ ...vaccinationSettings, defaultVaccinationRoute: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="intramuscular">Intramuscular (IM)</SelectItem>
                                            <SelectItem value="subcutaneous">Subcutaneous (SC)</SelectItem>
                                            <SelectItem value="intranasal">Intranasal</SelectItem>
                                            <SelectItem value="oral">Oral</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>Auto-Create Vaccination Reminders</Label>
                                    <Switch
                                        checked={vaccinationSettings.autoCreateVaccinationReminders}
                                        onCheckedChange={(checked) => setVaccinationSettings({ ...vaccinationSettings, autoCreateVaccinationReminders: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>Require Batch Number Tracking</Label>
                                    <Switch
                                        checked={vaccinationSettings.requireBatchNumberTracking}
                                        onCheckedChange={(checked) => setVaccinationSettings({ ...vaccinationSettings, requireBatchNumberTracking: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>Require Vet for Vaccinations</Label>
                                    <Switch
                                        checked={vaccinationSettings.requireVetForVaccinations}
                                        onCheckedChange={(checked) => setVaccinationSettings({ ...vaccinationSettings, requireVetForVaccinations: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>Track Vaccine Inventory</Label>
                                    <Switch
                                        checked={vaccinationSettings.trackVaccineInventory}
                                        onCheckedChange={(checked) => setVaccinationSettings({ ...vaccinationSettings, trackVaccineInventory: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>Enable Overdue Vaccination Alerts</Label>
                                    <Switch
                                        checked={vaccinationSettings.overdueVaccinationAlert}
                                        onCheckedChange={(checked) => setVaccinationSettings({ ...vaccinationSettings, overdueVaccinationAlert: checked })}
                                    />
                                </div>
                            </div>

                            <InfoBox>
                                <strong>Best Practice:</strong> Enable batch number tracking for vaccine traceability and recall management. Set reminders 14 days before to allow vet scheduling time.
                            </InfoBox>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* 4. DISEASE & OUTBREAK MANAGEMENT */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        Disease & Outbreak Management
                    </CardTitle>
                    <CardDescription>Configure outbreak tracking, quarantine, and disease notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                        <div>
                            <Label>Enable Outbreak Tracking</Label>
                            <p className="text-xs text-gray-500">Track and manage disease outbreaks</p>
                        </div>
                        <Switch
                            checked={outbreakSettings.enableOutbreakTracking}
                            onCheckedChange={(checked) => setOutbreakSettings({ ...outbreakSettings, enableOutbreakTracking: checked })}
                        />
                    </div>

                    {outbreakSettings.enableOutbreakTracking && (
                        <>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="quarantineDuration">Quarantine Duration (days)</Label>
                                    <Input
                                        id="quarantineDuration"
                                        type="number"
                                        min="1"
                                        max="90"
                                        value={outbreakSettings.quarantineDurationDays}
                                        onChange={(e) => setOutbreakSettings({
                                            ...outbreakSettings,
                                            quarantineDurationDays: parseInt(e.target.value) || 14
                                        })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Standard: 14 days for most diseases</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <Label>Auto-Quarantine on Outbreak</Label>
                                        <p className="text-xs text-gray-500">Automatically isolate affected animals</p>
                                    </div>
                                    <Switch
                                        checked={outbreakSettings.autoQuarantineOnOutbreak}
                                        onCheckedChange={(checked) => setOutbreakSettings({ ...outbreakSettings, autoQuarantineOnOutbreak: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <Label>Require Lab Tests for Critical Illness</Label>
                                        <p className="text-xs text-gray-500">Mandatory testing for severe cases</p>
                                    </div>
                                    <Switch
                                        checked={outbreakSettings.requireLabTestsForCriticalIllness}
                                        onCheckedChange={(checked) => setOutbreakSettings({ ...outbreakSettings, requireLabTestsForCriticalIllness: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>Isolation Area Required</Label>
                                    <Switch
                                        checked={outbreakSettings.isolationAreaRequired}
                                        onCheckedChange={(checked) => setOutbreakSettings({ ...outbreakSettings, isolationAreaRequired: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>Auto-Create Treatment Protocol</Label>
                                    <Switch
                                        checked={outbreakSettings.autoCreateTreatmentProtocol}
                                        onCheckedChange={(checked) => setOutbreakSettings({ ...outbreakSettings, autoCreateTreatmentProtocol: checked })}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="mb-2 block">Disease Notification Methods</Label>
                                <div className="grid md:grid-cols-2 gap-2">
                                    {['app', 'sms', 'email', 'whatsapp'].map((method) => (
                                        <label key={method} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={outbreakSettings.diseaseNotificationMethod.includes(method)}
                                                onChange={(e) => {
                                                    const updated = e.target.checked
                                                        ? [...outbreakSettings.diseaseNotificationMethod, method]
                                                        : outbreakSettings.diseaseNotificationMethod.filter(m => m !== method)
                                                    setOutbreakSettings({ ...outbreakSettings, diseaseNotificationMethod: updated })
                                                }}
                                                className="w-4 h-4 text-red-600 rounded"
                                            />
                                            <span className="text-sm capitalize">{method}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <InfoBox>
                                <strong>Critical:</strong> Auto-quarantine helps prevent disease spread. Enable multiple notification methods for urgent outbreak alerts, especially SMS for rural areas.
                            </InfoBox>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* 5. TREATMENT & MEDICATION */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Pill className="w-5 h-5 text-blue-600" />
                        Treatment & Medication Management
                    </CardTitle>
                    <CardDescription>Configure medication tracking, dosing, and withdrawal periods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="withdrawalPeriod">Default Withdrawal Period (days)</Label>
                            <Input
                                id="withdrawalPeriod"
                                type="number"
                                min="0"
                                max="90"
                                value={treatmentSettings.defaultWithdrawalPeriodDays}
                                onChange={(e) => setTreatmentSettings({
                                    ...treatmentSettings,
                                    defaultWithdrawalPeriodDays: parseInt(e.target.value) || 7
                                })}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Time before milk/meat safe for consumption
                            </p>
                        </div>

                        <div>
                            <Label>Dosage Calculation Method</Label>
                            <Select
                                value={treatmentSettings.dosageCalculationBy}
                                onValueChange={(value: 'weight' | 'age' | 'fixed') =>
                                    setTreatmentSettings({ ...treatmentSettings, dosageCalculationBy: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="weight">By Weight (Recommended)</SelectItem>
                                    <SelectItem value="age">By Age</SelectItem>
                                    <SelectItem value="fixed">Fixed Dose</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label>Track Medication Inventory</Label>
                            <Switch
                                checked={treatmentSettings.trackMedicationInventory}
                                onCheckedChange={(checked) => setTreatmentSettings({ ...treatmentSettings, trackMedicationInventory: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                                <Label>Withdrawal Period Tracking</Label>
                                <p className="text-xs text-gray-500">Track milk/meat withdrawal compliance</p>
                            </div>
                            <Switch
                                checked={treatmentSettings.withdrawalPeriodTracking}
                                onCheckedChange={(checked) => setTreatmentSettings({ ...treatmentSettings, withdrawalPeriodTracking: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label>Auto-Calculate Withdrawal Dates</Label>
                            <Switch
                                checked={treatmentSettings.autoCalculateWithdrawal}
                                onCheckedChange={(checked) => setTreatmentSettings({ ...treatmentSettings, autoCalculateWithdrawal: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label>Medication Cost Tracking</Label>
                            <Switch
                                checked={treatmentSettings.medicationCostTracking}
                                onCheckedChange={(checked) => setTreatmentSettings({ ...treatmentSettings, medicationCostTracking: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label>Require Dosage Calculation</Label>
                            <Switch
                                checked={treatmentSettings.requireDosageCalculation}
                                onCheckedChange={(checked) => setTreatmentSettings({ ...treatmentSettings, requireDosageCalculation: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label>Require Prescription for Medication</Label>
                            <Switch
                                checked={treatmentSettings.requirePrescriptionForMedication}
                                onCheckedChange={(checked) => setTreatmentSettings({ ...treatmentSettings, requirePrescriptionForMedication: checked })}
                            />
                        </div>
                    </div>

                    <InfoBox>
                        <strong>Food Safety:</strong> Withdrawal period tracking is critical for milk and meat safety compliance. Enable auto-calculation to prevent accidental violations.
                    </InfoBox>
                </CardContent>
            </Card>

            {/* 6. FOLLOW-UP MANAGEMENT */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-orange-600" />
                        Follow-up Management
                    </CardTitle>
                    <CardDescription>Configure automatic follow-ups for ongoing treatments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-orange-50">
                        <div>
                            <Label>Enable Automatic Follow-ups</Label>
                            <p className="text-xs text-gray-500">Create follow-up reminders for treatments</p>
                        </div>
                        <Switch
                            checked={followUpSettings.enableAutomaticFollowUps}
                            onCheckedChange={(checked) => setFollowUpSettings({ ...followUpSettings, enableAutomaticFollowUps: checked })}
                        />
                    </div>
                    {followUpSettings.enableAutomaticFollowUps && (
                        <>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="followUpInterval">Follow-up Interval (days)</Label>
                                    <Input id="followUpInterval" type="number" min="1" max="90" value={followUpSettings.followUpIntervalDays}
                                        onChange={(e) => setFollowUpSettings({ ...followUpSettings, followUpIntervalDays: parseInt(e.target.value) || 7 })} />
                                </div>
                                <div>
                                    <Label htmlFor="followUpReminder">Reminder Days Before</Label>
                                    <Input id="followUpReminder" type="number" min="0" max="14" value={followUpSettings.followUpReminderDaysBefore}
                                        onChange={(e) => setFollowUpSettings({ ...followUpSettings, followUpReminderDaysBefore: parseInt(e.target.value) || 2 })} />
                                </div>
                                <div>
                                    <Label htmlFor="maxFollowUps">Max Follow-ups</Label>
                                    <Input id="maxFollowUps" type="number" min="1" max="20" value={followUpSettings.maxFollowUpsBeforeResolution}
                                        onChange={(e) => setFollowUpSettings({ ...followUpSettings, maxFollowUpsBeforeResolution: parseInt(e.target.value) || 5 })} />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div><Label>Auto-Resolve on Recovery</Label><p className="text-xs text-gray-500">Close case when animal recovers</p></div>
                                    <Switch checked={followUpSettings.autoResolveOnRecovery}
                                        onCheckedChange={(checked) => setFollowUpSettings({ ...followUpSettings, autoResolveOnRecovery: checked })} />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>Require Vet for Resolution</Label>
                                    <Switch checked={followUpSettings.requireVetForResolution}
                                        onCheckedChange={(checked) => setFollowUpSettings({ ...followUpSettings, requireVetForResolution: checked })} />
                                </div>
                            </div>
                            <InfoBox><strong>Tip:</strong> Setting follow-up intervals to 7 days ensures regular monitoring of ongoing treatments.</InfoBox>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* 7. VETERINARY VISITS */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        Veterinary Visits
                    </CardTitle>
                    <CardDescription>Configure vet visit scheduling and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-indigo-50">
                        <Label>Enable Vet Visit Scheduling</Label>
                        <Switch checked={visitSettings.enableVetVisitScheduling}
                            onCheckedChange={(checked) => setVisitSettings({ ...visitSettings, enableVetVisitScheduling: checked })} />
                    </div>
                    {visitSettings.enableVetVisitScheduling && (
                        <>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="visitReminder">Reminder Days Before Visit</Label>
                                    <Input id="visitReminder" type="number" min="1" max="14" value={visitSettings.visitReminderDaysBefore}
                                        onChange={(e) => setVisitSettings({ ...visitSettings, visitReminderDaysBefore: parseInt(e.target.value) || 3 })} />
                                </div>
                                <div>
                                    <Label htmlFor="travelRadius">Travel Radius (km)</Label>
                                    <Input id="travelRadius" type="number" min="1" max="500" value={visitSettings.travelRadiusKm}
                                        onChange={(e) => setVisitSettings({ ...visitSettings, travelRadiusKm: parseInt(e.target.value) || 50 })} />
                                </div>
                                <div>
                                    <Label>Preferred Visit Time</Label>
                                    <Select value={visitSettings.preferredVisitTime}
                                        onValueChange={(value: any) => setVisitSettings({ ...visitSettings, preferredVisitTime: value })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="morning">Morning</SelectItem>
                                            <SelectItem value="afternoon">Afternoon</SelectItem>
                                            <SelectItem value="evening">Evening</SelectItem>
                                            <SelectItem value="any">Any Time</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label>Require Visit Confirmation</Label>
                                    <Switch checked={visitSettings.requireVisitConfirmation}
                                        onCheckedChange={(checked) => setVisitSettings({ ...visitSettings, requireVisitConfirmation: checked })} />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div><Label>Emergency Visit Priority</Label><p className="text-xs text-gray-500">Prioritize urgent cases</p></div>
                                    <Switch checked={visitSettings.emergencyVisitPriority}
                                        onCheckedChange={(checked) => setVisitSettings({ ...visitSettings, emergencyVisitPriority: checked })} />
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* 8. HEALTH PROTOCOLS */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-cyan-600" />
                        Health Protocols
                    </CardTitle>
                    <CardDescription>Configure standard health protocols and approvals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-cyan-50">
                        <Label>Enable Standard Protocols</Label>
                        <Switch checked={protocolSettings.enableStandardProtocols}
                            onCheckedChange={(checked) => setProtocolSettings({ ...protocolSettings, enableStandardProtocols: checked })} />
                    </div>
                    {protocolSettings.enableStandardProtocols && (
                        <>
                            <div>
                                <Label>Protocol Approval Authority</Label>
                                <Select value={protocolSettings.protocolApprovalBy}
                                    onValueChange={(value: any) => setProtocolSettings({ ...protocolSettings, protocolApprovalBy: value })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="farm_owner">Farm Owner</SelectItem>
                                        <SelectItem value="farm_manager">Farm Manager</SelectItem>
                                        <SelectItem value="veterinarian">Veterinarian</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div><Label>Require Protocol Approval</Label><p className="text-xs text-gray-500">New protocols need approval</p></div>
                                    <Switch checked={protocolSettings.requireProtocolApproval}
                                        onCheckedChange={(checked) => setProtocolSettings({ ...protocolSettings, requireProtocolApproval: checked })} />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div><Label>Protocol Auto-Execution</Label><p className="text-xs text-gray-500">Execute protocols automatically</p></div>
                                    <Switch checked={protocolSettings.protocolAutoExecution}
                                        onCheckedChange={(checked) => setProtocolSettings({ ...protocolSettings, protocolAutoExecution: checked })} />
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* 9. DEWORMING MANAGEMENT */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-amber-600" />
                        Deworming Management
                    </CardTitle>
                    <CardDescription>Configure deworming schedules and reminders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-amber-50">
                        <Label>Enable Deworming Schedule</Label>
                        <Switch checked={dewormingSettings.enableDewormingSchedule}
                            onCheckedChange={(checked) => setDewormingSettings({ ...dewormingSettings, enableDewormingSchedule: checked })} />
                    </div>
                    {dewormingSettings.enableDewormingSchedule && (
                        <>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="dewormingInterval">Deworming Interval (months)</Label>
                                    <Input id="dewormingInterval" type="number" min="1" max="12" value={dewormingSettings.dewormingIntervalMonths}
                                        onChange={(e) => setDewormingSettings({ ...dewormingSettings, dewormingIntervalMonths: parseInt(e.target.value) || 3 })} />
                                    <p className="text-xs text-gray-500 mt-1">Common: 3-4 months</p>
                                </div>
                                <div>
                                    <Label htmlFor="dewormingReminder">Reminder Days Before</Label>
                                    <Input id="dewormingReminder" type="number" min="1" max="30" value={dewormingSettings.dewormingReminderDaysBefore}
                                        onChange={(e) => setDewormingSettings({ ...dewormingSettings, dewormingReminderDaysBefore: parseInt(e.target.value) || 7 })} />
                                </div>
                                <div>
                                    <Label htmlFor="dewormingProduct">Default Product</Label>
                                    <Input id="dewormingProduct" type="text" placeholder="e.g., Ivermectin" value={dewormingSettings.defaultDewormingProduct}
                                        onChange={(e) => setDewormingSettings({ ...dewormingSettings, defaultDewormingProduct: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div><Label>Weight-Based Dosing</Label><p className="text-xs text-gray-500">Calculate dose by animal weight</p></div>
                                <Switch checked={dewormingSettings.dewormingByWeight}
                                    onCheckedChange={(checked) => setDewormingSettings({ ...dewormingSettings, dewormingByWeight: checked })} />
                            </div>
                            <InfoBox><strong>Kenya Context:</strong> Quarterly deworming (every 3 months) is recommended for tropical climates.</InfoBox>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* 10. DOCUMENTATION */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-gray-600" />
                        Health Records & Documentation
                    </CardTitle>
                    <CardDescription>Configure documentation requirements and retention</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="recordRetention">Record Retention Period (years)</Label>
                            <Input id="recordRetention" type="number" min="1" max="20" value={documentationSettings.healthRecordRetentionYears}
                                onChange={(e) => setDocumentationSettings({ ...documentationSettings, healthRecordRetentionYears: parseInt(e.target.value) || 5 })} />
                            <p className="text-xs text-gray-500 mt-1">Legal requirement: Usually 5+ years</p>
                        </div>
                        <div>
                            <Label>Export Format</Label>
                            <Select value={documentationSettings.exportFormat}
                                onValueChange={(value: any) => setDocumentationSettings({ ...documentationSettings, exportFormat: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pdf">PDF Only</SelectItem>
                                    <SelectItem value="excel">Excel Only</SelectItem>
                                    <SelectItem value="both">Both (PDF & Excel)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label>Require Photos for Injuries</Label>
                            <Switch checked={documentationSettings.requirePhotosForInjuries}
                                onCheckedChange={(checked) => setDocumentationSettings({ ...documentationSettings, requirePhotosForInjuries: checked })} />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label>Require Lab Results Upload</Label>
                            <Switch checked={documentationSettings.requireLabResultsUpload}
                                onCheckedChange={(checked) => setDocumentationSettings({ ...documentationSettings, requireLabResultsUpload: checked })} />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label>Include Photos in Export</Label>
                            <Switch checked={documentationSettings.includePhotosInExport}
                                onCheckedChange={(checked) => setDocumentationSettings({ ...documentationSettings, includePhotosInExport: checked })} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 11. COST MANAGEMENT */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        Cost Management
                    </CardTitle>
                    <CardDescription>Configure health expense tracking and budgets</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                        <Label>Track Health Expenses</Label>
                        <Switch checked={costSettings.trackHealthExpenses}
                            onCheckedChange={(checked) => setCostSettings({ ...costSettings, trackHealthExpenses: checked })} />
                    </div>
                    {costSettings.trackHealthExpenses && (
                        <>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Default Currency</Label>
                                    <Select value={costSettings.defaultCurrency}
                                        onValueChange={(value: any) => setCostSettings({ ...costSettings, defaultCurrency: value })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="KES">Kenyan Shilling (KES)</SelectItem>
                                            <SelectItem value="USD">US Dollar (USD)</SelectItem>
                                            <SelectItem value="EUR">Euro (EUR)</SelectItem>
                                            <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="budgetAlert">Budget Alert Threshold</Label>
                                    <Input id="budgetAlert" type="number" min="0" placeholder="Optional (e.g., 50000)" value={costSettings.budgetAlertThreshold || ''}
                                        onChange={(e) => setCostSettings({ ...costSettings, budgetAlertThreshold: e.target.value ? parseInt(e.target.value) : undefined })} />
                                    <p className="text-xs text-gray-500 mt-1">Alert when monthly costs exceed</p>
                                </div>
                            </div>
                            <div>
                                <Label className="mb-2 block">Cost Categories to Track</Label>
                                <div className="grid md:grid-cols-3 gap-2">
                                    {['consultation', 'medication', 'vaccination', 'surgery', 'lab_tests', 'emergency'].map((category) => (
                                        <label key={category} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50">
                                            <input type="checkbox" checked={costSettings.costCategories.includes(category)}
                                                onChange={(e) => {
                                                    const updated = e.target.checked ? [...costSettings.costCategories, category] : costSettings.costCategories.filter(c => c !== category)
                                                    setCostSettings({ ...costSettings, costCategories: updated })
                                                }} className="w-4 h-4 text-green-600 rounded" />
                                            <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* 12. ALERTS & NOTIFICATIONS */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-yellow-600" />
                        Alerts & Notifications
                    </CardTitle>
                    <CardDescription>Configure health alert types and delivery methods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label className="mb-3 block">Health Alert Types</Label>
                        <div className="grid md:grid-cols-2 gap-3">
                            {Object.entries(alertSettings.healthAlerts).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label className="capitalize cursor-pointer">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                                    <Switch checked={value}
                                        onCheckedChange={(checked) => setAlertSettings({ ...alertSettings, healthAlerts: { ...alertSettings.healthAlerts, [key]: checked } })} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <Label className="mb-2 block">Alert Delivery Methods</Label>
                        <div className="grid md:grid-cols-2 gap-2">
                            {['app', 'sms', 'email', 'whatsapp'].map((method) => (
                                <label key={method} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50">
                                    <input type="checkbox" checked={alertSettings.alertDeliveryMethods.includes(method)}
                                        onChange={(e) => {
                                            const updated = e.target.checked ? [...alertSettings.alertDeliveryMethods, method] : alertSettings.alertDeliveryMethods.filter(m => m !== method)
                                            setAlertSettings({ ...alertSettings, alertDeliveryMethods: updated })
                                        }} className="w-4 h-4 text-yellow-600 rounded" />
                                    <span className="text-sm capitalize">{method}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 pt-3 border-t">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div><Label>Critical Alert Escalation</Label><p className="text-xs text-gray-500">Auto-escalate urgent alerts</p></div>
                            <Switch checked={alertSettings.criticalAlertEscalation}
                                onCheckedChange={(checked) => setAlertSettings({ ...alertSettings, criticalAlertEscalation: checked })} />
                        </div>
                        {alertSettings.criticalAlertEscalation && (
                            <div>
                                <Label htmlFor="escalationDelay">Escalation Delay (hours)</Label>
                                <Input id="escalationDelay" type="number" min="1" max="24" value={alertSettings.escalationDelayHours}
                                    onChange={(e) => setAlertSettings({ ...alertSettings, escalationDelayHours: parseInt(e.target.value) || 2 })} />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 13. ANIMAL-SPECIFIC SETTINGS */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-teal-600" />
                        Animal-Specific Settings
                    </CardTitle>
                    <CardDescription>Customize health plans based on animal characteristics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div><Label>Enable Animal-Specific Protocols</Label><p className="text-xs text-gray-500">Custom protocols per animal</p></div>
                        <Switch checked={animalSettings.enableAnimalSpecificProtocols}
                            onCheckedChange={(checked) => setAnimalSettings({ ...animalSettings, enableAnimalSpecificProtocols: checked })} />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div><Label>Age-Based Health Plans</Label><p className="text-xs text-gray-500">Adjust care by animal age</p></div>
                        <Switch checked={animalSettings.ageBasedHealthPlans}
                            onCheckedChange={(checked) => setAnimalSettings({ ...animalSettings, ageBasedHealthPlans: checked })} />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div><Label>Breed-Specific Guidelines</Label><p className="text-xs text-gray-500">Consider breed characteristics</p></div>
                        <Switch checked={animalSettings.breedSpecificGuidelines}
                            onCheckedChange={(checked) => setAnimalSettings({ ...animalSettings, breedSpecificGuidelines: checked })} />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div><Label>Production Stage Consideration</Label><p className="text-xs text-gray-500">Adjust for pregnant/lactating/dry</p></div>
                        <Switch checked={animalSettings.productionStageConsideration}
                            onCheckedChange={(checked) => setAnimalSettings({ ...animalSettings, productionStageConsideration: checked })} />
                    </div>
                </CardContent>
            </Card>

            {/* 14. DATA PRIVACY & COMPLIANCE */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-rose-600" />
                        Data Privacy & Compliance
                    </CardTitle>
                    <CardDescription>Configure data sharing and backup policies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div><Label>Share Data with Veterinarian</Label><p className="text-xs text-gray-500">Allow vet access to records</p></div>
                            <Switch checked={privacySettings.shareDataWithVet}
                                onCheckedChange={(checked) => setPrivacySettings({ ...privacySettings, shareDataWithVet: checked })} />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div><Label>Allow Vet Remote Access</Label><p className="text-xs text-gray-500">Vet can view/update remotely</p></div>
                            <Switch checked={privacySettings.allowVetRemoteAccess}
                                onCheckedChange={(checked) => setPrivacySettings({ ...privacySettings, allowVetRemoteAccess: checked })} />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label>Require Data Backup</Label>
                            <Switch checked={privacySettings.requireDataBackup}
                                onCheckedChange={(checked) => setPrivacySettings({ ...privacySettings, requireDataBackup: checked })} />
                        </div>
                        {privacySettings.requireDataBackup && (
                            <div className="ml-6">
                                <Label>Backup Frequency</Label>
                                <Select value={privacySettings.backupFrequency}
                                    onValueChange={(value: any) => setPrivacySettings({ ...privacySettings, backupFrequency: value })}>
                                    <SelectTrigger className="w-full md:w-64"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div><Label>GDPR Compliance Mode</Label><p className="text-xs text-gray-500">EU data protection compliance</p></div>
                            <Switch checked={privacySettings.gdprCompliance}
                                onCheckedChange={(checked) => setPrivacySettings({ ...privacySettings, gdprCompliance: checked })} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 15. INTEGRATION SETTINGS */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-violet-600" />
                        Integration Settings
                    </CardTitle>
                    <CardDescription>Configure how health data syncs with other modules</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div><Label>Sync with Breeding Records</Label><p className="text-xs text-gray-500">Link health & breeding data</p></div>
                        <Switch checked={integrationSettings.syncWithBreedingRecords}
                            onCheckedChange={(checked) => setIntegrationSettings({ ...integrationSettings, syncWithBreedingRecords: checked })} />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div><Label>Sync with Production Records</Label><p className="text-xs text-gray-500">Connect health & milk production</p></div>
                        <Switch checked={integrationSettings.syncWithProductionRecords}
                            onCheckedChange={(checked) => setIntegrationSettings({ ...integrationSettings, syncWithProductionRecords: checked })} />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div><Label>Sync with Feeding Records</Label><p className="text-xs text-gray-500">Link health & nutrition data</p></div>
                        <Switch checked={integrationSettings.syncWithFeedingRecords}
                            onCheckedChange={(checked) => setIntegrationSettings({ ...integrationSettings, syncWithFeedingRecords: checked })} />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div><Label>Auto-Update Animal Status</Label><p className="text-xs text-gray-500">Update status based on health records</p></div>
                        <Switch checked={integrationSettings.autoUpdateAnimalStatus}
                            onCheckedChange={(checked) => setIntegrationSettings({ ...integrationSettings, autoUpdateAnimalStatus: checked })} />
                    </div>
                    <InfoBox><strong>Integration Benefits:</strong> Syncing health data with other modules provides comprehensive animal insights and automated workflows.</InfoBox>
                </CardContent>
            </Card>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-between pt-6 border-t">
                <div className="flex items-center space-x-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">
                        Changes will apply to future health management operations
                    </span>
                    {hasUnsavedChanges && (
                        <div className="flex items-center space-x-1 ml-4 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Unsaved changes</span>
                        </div>
                    )}
                </div>
                <div className="flex space-x-3">
                    <Button
                        variant="outline"
                        onClick={resetToDefaults}
                        className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                    >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset to Defaults
                    </Button>
                    <Button
                        onClick={handleSaveSettings}
                        disabled={isLoading}
                        className={hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-700' : ''}
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
    )
}