'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog'
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Calendar,
  MoreVertical,
  Eye,
  UserCheck,
  Zap,
  Clock,
  Leaf,
  ShieldAlert,
  Activity,
  Venus,
  Mars,
  VenetianMask
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

interface AnimalCategory {
  id: string
  name: string
  description: string
  min_age_days?: number
  max_age_days?: number
  gender?: string
  characteristics: any
  is_default: boolean
  sort_order: number
  matching_animals_count?: number
  assigned_animals_count?: number
  production_status?: string
  production_statuses?: string[] // Support for multiple production statuses
  feed_ration_id?: string | null
}

interface MatchingAnimal {
  id: string
  tag_number: string
  name: string | null
  gender: string | null
  birth_date: string | null
  production_status: string | null
  status: string
  days_in_milk: number | null
  current_daily_production: number | null
  age_days: number | null
}

interface AnimalAssignment {
  id: string
  animal_id: string
  category_id: string
  assignment_method: string
  assigned_at: string
  animal: MatchingAnimal
}

interface AssignmentData {
  category: AnimalCategory
  assignedAnimals: AnimalAssignment[]
  matchingAnimals: MatchingAnimal[]
  allAnimalsByProductionStatus: MatchingAnimal[]
  animalsToRemove: MatchingAnimal[]
}

interface MilkingSchedule {
  id: string
  name: string
  frequency: number
  times: string[]
}

interface AnimalCategoriesManagerProps {
  farmId: string
  categories: AnimalCategory[]
  onCategoriesUpdate: (categories: AnimalCategory[]) => void
  canEdit: boolean
  isMobile: boolean
}

interface CategoryFormData {
  name: string
  description: string
  min_age_days: string
  max_age_days: string
  gender: string
  lactating: boolean
  pregnant: boolean
  breeding_male: boolean
  growth_phase: boolean
  production_status: string
  production_statuses: string[] // Support multiple production statuses
  // Lactation ranges
  dim_range_min?: string
  dim_range_max?: string
  milk_yield_range_min?: string
  milk_yield_range_max?: string
  lactation_number_range_min?: string
  lactation_number_range_max?: string
  // Pregnancy ranges
  days_pregnant_range_min?: string
  days_pregnant_range_max?: string
  days_to_calving_range_min?: string
  days_to_calving_range_max?: string
  // Growth ranges
  age_days_range_min?: string
  age_days_range_max?: string
  weight_range_min?: string
  weight_range_max?: string
  daily_gain_range_min?: string
  daily_gain_range_max?: string
  // Health checkboxes
  mastitis_risk?: boolean
  under_treatment?: boolean
  vaccination_due?: boolean
  lameness_prone?: boolean
  reproductive_issue?: boolean
  // Body ranges
  body_condition_score_range_min?: string
  body_condition_score_range_max?: string
  weight_kg_range_min?: string
  weight_kg_range_max?: string
  // Breeding ranges
  services_per_conception_range_min?: string
  services_per_conception_range_max?: string
  days_since_heat_range_min?: string
  days_since_heat_range_max?: string
  // Management/Milking - now time-based schedules
  selected_milking_schedule_id?: string
  milking_schedules?: MilkingSchedule[]
  // Feeding - feed ration assignment
  selected_feed_ration_id?: string
  // Feeding checkboxes
  high_concentrate?: boolean
  dry_cow_ration?: boolean
  heifer_ration?: boolean
  high_forage?: boolean
  steaming_feed_ration?: boolean
  bull_feed_ration?: boolean
  calf_feed_ration?: boolean
}

// Hierarchical characteristics grouped by category - shown based on production status
const CHARACTERISTIC_GROUPS = {
  lactation: {
    label: 'Lactation Characteristics',
    description: 'Filter lactating cows by production stage and output',
    type: 'ranges',
    options: [
      { key: 'dim_range', label: 'Days in Milk (DIM)', description: 'Production stage', type: 'range', unit: 'days', min: 0, max: 500 },
      { key: 'milk_yield_range', label: 'Daily Milk Yield', description: 'Liters per day', type: 'range', unit: 'L/day', min: 0, max: 60 },
      { key: 'lactation_number_range', label: 'Lactation Number', description: 'Which lactation cycle', type: 'range', unit: 'lactations', min: 1, max: 10 }
    ]
  },
  pregnancy: {
    label: 'Pregnancy Characteristics',
    description: 'Filter pregnant cows by stage and expected calving',
    type: 'ranges',
    options: [
      { key: 'days_pregnant_range', label: 'Days Pregnant', description: 'Gestation stage', type: 'range', unit: 'days', min: 0, max: 280 },
      { key: 'days_to_calving_range', label: 'Days to Calving', description: 'Expected calving timeline', type: 'range', unit: 'days', min: 0, max: 280 }
    ]
  },
  growth: {
    label: 'Growth Characteristics',
    description: 'Filter young animals by age and development stage',
    type: 'ranges',
    options: [
      { key: 'age_days_range', label: 'Age Range', description: 'Days old', type: 'range', unit: 'days', min: 0, max: 900 },
      { key: 'weight_range', label: 'Weight Range', description: 'Kilograms', type: 'range', unit: 'kg', min: 0, max: 700 },
      { key: 'daily_gain_range', label: 'Daily Growth Rate', description: 'Kg per day', type: 'range', unit: 'kg/day', min: 0, max: 2 }
    ]
  },
  health: {
    label: 'Health Characteristics',
    description: 'Filter by health status and treatment needs',
    type: 'checkboxes',
    options: [
      { key: 'mastitis_risk', label: 'Mastitis Risk', description: 'High SCC or treatment history' },
      { key: 'under_treatment', label: 'Currently Under Treatment', description: 'Active medication/therapy' },
      { key: 'vaccination_due', label: 'Vaccination Due', description: 'Overdue for vaccinations' },
      { key: 'lameness_prone', label: 'Lameness History', description: 'Foot/leg issues' },
      { key: 'reproductive_issue', label: 'Reproductive Issue', description: 'Fertility concerns' }
    ]
  },
  body: {
    label: 'Body Metrics',
    description: 'Filter by body condition and physical parameters',
    type: 'ranges',
    options: [
      { key: 'body_condition_score_range', label: 'Body Condition Score (BCS)', description: '1-5 scale', type: 'range', unit: 'BCS', min: 1, max: 5 },
      { key: 'weight_kg_range', label: 'Weight', description: 'Kilograms', type: 'range', unit: 'kg', min: 100, max: 800 }
    ]
  },
  breeding: {
    label: 'Breeding Characteristics',
    description: 'Filter by breeding performance and fertility',
    type: 'ranges',
    options: [
      { key: 'services_per_conception_range', label: 'Services per Conception', description: 'Number of breeding attempts', type: 'range', unit: 'services', min: 1, max: 10 },
      { key: 'days_since_heat_range', label: 'Days Since Last Heat', description: 'Heat detection timeline', type: 'range', unit: 'days', min: 0, max: 100 }
    ]
  },
  management: {
    label: 'Milking Schedules',
    description: 'Define custom milking schedules by frequency and specific times',
    type: 'custom_schedules'
  },
  feeding: {
    label: 'Feed Ration Assignment',
    description: 'Assign a specific feed ration to this animal category',
    type: 'feed_rations'
  }
}

// Returns which characteristic groups are relevant for each production status
const getRelevantCharacteristics = (productionStatus: string): string[] => {
  const mapping: Record<string, string[]> = {
    calf: ['growth', 'health', 'body', 'feeding'],
    heifer: ['growth', 'health', 'body', 'breeding', 'feeding'],
    served: ['lactation', 'pregnancy', 'health', 'body', 'breeding', 'management', 'feeding'],
    lactating: ['lactation', 'health', 'body', 'management', 'feeding'],
    steaming_dry_cows: ['pregnancy', 'health', 'body', 'feeding'],
    open_culling_dry_cows: ['health', 'body', 'feeding', 'breeding'],
    bull: ['health', 'body', 'breeding', 'management']
  }
  return mapping[productionStatus] || []
}

// Returns the intersection of characteristics common to ALL selected production statuses
const getCommonCharacteristics = (productionStatuses: string[]): string[] => {
  if (productionStatuses.length === 0) return []
  if (productionStatuses.length === 1) return getRelevantCharacteristics(productionStatuses[0])
  
  // Get characteristics for each status
  const allCharacteristics = productionStatuses.map(status => getRelevantCharacteristics(status))
  
  // Find intersection (characteristics that appear in ALL arrays)
  return allCharacteristics[0].filter(char => 
    allCharacteristics.every(characteristics => characteristics.includes(char))
  )
}

const GENDER_OPTIONS = [
  { value: 'any', label: 'Any Gender' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' }
]

export function AnimalCategoriesManager({
  farmId,
  categories,
  onCategoriesUpdate,
  canEdit,
  isMobile
}: AnimalCategoriesManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AnimalCategory | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<AnimalCategory | null>(null)
  const [viewingAnimals, setViewingAnimals] = useState<AnimalCategory | null>(null)
  const [matchingAnimals, setMatchingAnimals] = useState<MatchingAnimal[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [loadingAnimals, setLoadingAnimals] = useState(false)
  const [assignmentData, setAssignmentData] = useState<AssignmentData | null>(null)
  const [assignmentMode, setAssignmentMode] = useState<'auto' | 'manual'>('auto')
  const [syncingCategory, setSyncingCategory] = useState(false)
  const [selectedForAdd, setSelectedForAdd] = useState<Set<string>>(new Set())
  const [selectedForRemove, setSelectedForRemove] = useState<Set<string>>(new Set())
  const [assignmentTab, setAssignmentTab] = useState<'assigned' | 'suggested' | 'remove'>('assigned')
  const [manualModeSearch, setManualModeSearch] = useState('')
  const [selectedAnimalForPreview, setSelectedAnimalForPreview] = useState<string | null>(null)
  // Milking schedule management state
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<MilkingSchedule | null>(null)
  const [newScheduleName, setNewScheduleName] = useState('')
  const [newScheduleFrequency, setNewScheduleFrequency] = useState('2')
  const [newScheduleTimes, setNewScheduleTimes] = useState<string[]>(['05:00', '14:30'])
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    min_age_days: '',
    max_age_days: '',
    gender: 'female', // Default to female
    lactating: false,
    pregnant: false,
    breeding_male: false,
    growth_phase: false,
    production_status: '', // Default to calf
    production_statuses: [], // Support multiple production statuses
    milking_schedules: [],
    selected_milking_schedule_id: ''
  })

  const [farmMilkingSessions, setFarmMilkingSessions] = useState<Array<{ id: string; name: string; time: string; requiresTimeInput?: boolean }>>([])
  const [feedRations, setFeedRations] = useState<Array<{ id: string; name: string; description?: string; is_active: boolean }>>([])

  useEffect(() => {
    const fetchFarmSettings = async () => {
      try {
        const response = await fetch(`/api/settings/production?farmId=${farmId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setFarmMilkingSessions(data.settings?.milkingSessions || [])
          }
        }
      } catch (error) {
        console.error('Failed to fetch farm production settings:', error)
      }
    }
    fetchFarmSettings()
  }, [farmId])

  useEffect(() => {
    const fetchFeedRations = async () => {
      try {
        const response = await fetch(`/api/farms/${farmId}/feed-rations`)
        if (response.ok) {
          const data = await response.json()
          setFeedRations(data.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch feed rations:', error)
      }
    }
    fetchFeedRations()
  }, [farmId])

  // Milking schedule management functions
  const handleFrequencyChange = useCallback((newFrequency: string) => {
    setNewScheduleFrequency(newFrequency)
    const freq = parseInt(newFrequency)
    
    // Generate default times based on frequency
    const defaultTimes: Record<number, string[]> = {
      1: ['06:00'],
      2: ['05:00', '14:30'],
      3: ['05:00', '09:30', '14:30'],
      4: ['05:00', '09:00', '14:00', '18:00']
    }
    
    const times = defaultTimes[freq] || defaultTimes[2]
    setNewScheduleTimes(times)
  }, [])

  const handleAddMilkingSchedule = useCallback(() => {
    if (!newScheduleName.trim()) return

    const newSchedule: MilkingSchedule = {
      id: `schedule_${Date.now()}`,
      name: newScheduleName,
      frequency: parseInt(newScheduleFrequency),
      times: newScheduleTimes.slice(0, parseInt(newScheduleFrequency))
    }

    setFormData(prev => ({
      ...prev,
      milking_schedules: [...(prev.milking_schedules || []), newSchedule],
      selected_milking_schedule_id: newSchedule.id
    }))

    // Reset schedule form
    setNewScheduleName('')
    setNewScheduleFrequency('2')
    setNewScheduleTimes(['05:00', '14:30'])
    setEditingSchedule(null)
    setShowScheduleForm(false)
  }, [newScheduleName, newScheduleFrequency, newScheduleTimes])

  const handleRemoveMilkingSchedule = useCallback((scheduleId: string) => {
    setFormData(prev => ({
      ...prev,
      milking_schedules: (prev.milking_schedules || []).filter(s => s.id !== scheduleId),
      selected_milking_schedule_id: 
        prev.selected_milking_schedule_id === scheduleId 
          ? (prev.milking_schedules || []).find(s => s.id !== scheduleId)?.id || ''
          : prev.selected_milking_schedule_id
    }))
  }, [])

  const handleEditMilkingSchedule = useCallback((schedule: MilkingSchedule) => {
    setEditingSchedule(schedule)
    setNewScheduleName(schedule.name)
    setNewScheduleFrequency(schedule.frequency.toString())
    setNewScheduleTimes(schedule.times)
    setShowScheduleForm(true)
  }, [])

  const handleUpdateMilkingSchedule = useCallback(() => {
    if (!editingSchedule || !newScheduleName.trim()) return

    setFormData(prev => ({
      ...prev,
      milking_schedules: (prev.milking_schedules || []).map(s =>
        s.id === editingSchedule.id
          ? {
              ...s,
              name: newScheduleName,
              frequency: parseInt(newScheduleFrequency),
              times: newScheduleTimes.slice(0, parseInt(newScheduleFrequency))
            }
          : s
      )
    }))

    // Reset schedule form
    setNewScheduleName('')
    setNewScheduleFrequency('2')
    setNewScheduleTimes(['05:00', '14:30'])
    setEditingSchedule(null)
    setShowScheduleForm(false)
  }, [editingSchedule, newScheduleName, newScheduleFrequency, newScheduleTimes])

  const handleUpdateScheduleTime = useCallback((index: number, time: string) => {
    const newTimes = [...newScheduleTimes]
    newTimes[index] = time
    setNewScheduleTimes(newTimes)
  }, [newScheduleTimes])

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      description: '',
      min_age_days: '',
      max_age_days: '',
      gender: 'female', // Default to female
      lactating: false,
      pregnant: false,
      breeding_male: false,
      growth_phase: false,
      production_status: 'calf', // Default to calf
      production_statuses: [], // Support multiple production statuses
      selected_milking_schedule_id: '',
      milking_schedules: [],
      selected_feed_ration_id: ''
    })
  }, [])

  const handleAdd = useCallback(() => {
    resetForm()
    setShowAddModal(true)
  }, [resetForm])

  const handleEdit = useCallback((category: AnimalCategory) => {
    const newFormData: CategoryFormData = {
      name: category.name,
      description: category.description || '',
      min_age_days: category.min_age_days?.toString() || '',
      max_age_days: category.max_age_days?.toString() || '',
      gender: category.gender || 'any',
      lactating: category.characteristics?.lactating || false,
      pregnant: category.characteristics?.pregnant || false,
      breeding_male: category.characteristics?.breeding_male || false,
      growth_phase: category.characteristics?.growth_phase || false,
      production_status: category.production_status || 'calf',
      production_statuses: category.production_statuses || (category.production_status ? [category.production_status] : []),
      selected_milking_schedule_id: category.characteristics?.selected_milking_schedule_id || '',
      milking_schedules: category.characteristics?.milking_schedules || [],
      selected_feed_ration_id: category.feed_ration_id || category.characteristics?.selected_feed_ration_id || ''
    }

    // Populate range fields from characteristics
    const rangeFields = [
      'dim_range', 'milk_yield_range', 'lactation_number_range',
      'days_pregnant_range', 'days_to_calving_range',
      'age_days_range', 'weight_range', 'daily_gain_range',
      'body_condition_score_range', 'weight_kg_range',
      'services_per_conception_range', 'days_since_heat_range'
    ]

    rangeFields.forEach(field => {
      const rangeData = category.characteristics?.[field as keyof typeof category.characteristics]
      if (rangeData && typeof rangeData === 'object') {
        const minKey = `${field}_min` as keyof CategoryFormData
        const maxKey = `${field}_max` as keyof CategoryFormData
        ;(newFormData as any)[minKey] = rangeData.min?.toString() || ''
        ;(newFormData as any)[maxKey] = rangeData.max?.toString() || ''
      }
    })

    // Populate checkbox fields from characteristics (excluding management/milking and feeding)
    const checkboxFields = [
      'mastitis_risk', 'under_treatment', 'vaccination_due', 'lameness_prone', 'reproductive_issue'
    ]

    checkboxFields.forEach(field => {
      const key = field as keyof CategoryFormData
      ;(newFormData as any)[key] = category.characteristics?.[field as keyof typeof category.characteristics] || false
    })

    // Auto-expand groups that have existing data so the user can see pre-filled values
    const autoExpanded: Record<string, boolean> = {}

    // Expand milking group if any schedule data present
    if (
      (newFormData.milking_schedules && newFormData.milking_schedules.length > 0) ||
      newFormData.selected_milking_schedule_id
    ) {
      autoExpanded.management = true
    }

    // Expand feeding group if a ration is assigned
    if (newFormData.selected_feed_ration_id) {
      autoExpanded.feeding = true
    }

    // Expand range-based groups if any field in the group has a value
    const groupRangeMap: Record<string, string[]> = {
      lactation: ['dim_range', 'milk_yield_range', 'lactation_number_range'],
      pregnancy: ['days_pregnant_range', 'days_to_calving_range'],
      growth:    ['age_days_range', 'weight_range', 'daily_gain_range'],
      body:      ['body_condition_score_range', 'weight_kg_range'],
      breeding:  ['services_per_conception_range', 'days_since_heat_range'],
    }

    Object.entries(groupRangeMap).forEach(([group, fields]) => {
      const hasData = fields.some(f => {
        const minVal = (newFormData as any)[`${f}_min`]
        const maxVal = (newFormData as any)[`${f}_max`]
        return (minVal && minVal !== '') || (maxVal && maxVal !== '')
      })
      if (hasData) autoExpanded[group] = true
    })

    // Expand health group if any checkbox is set
    const healthFields = ['mastitis_risk', 'under_treatment', 'vaccination_due', 'lameness_prone', 'reproductive_issue']
    if (healthFields.some(f => (newFormData as any)[f])) {
      autoExpanded.health = true
    }

    setExpandedGroups(autoExpanded)
    setFormData(newFormData)
    setEditingCategory(category)
    setShowAddModal(true)
  }, [])

  const handleModalClose = useCallback(() => {
    setShowAddModal(false)
    setEditingCategory(null)
    setExpandedGroups({})
    resetForm()
  }, [resetForm])

  const handleViewAnimals = async (category: AnimalCategory) => {
    setViewingAnimals(category)
    setLoadingAnimals(true)
    setAssignmentData(null)

    try {
      console.log('🐛 Debug: Fetching assignments for category:', category.id, 'farmId:', farmId)
      const url = `/api/farms/${farmId}/animal-categories/${category.id}/assignments`
      console.log('🐛 Debug: Fetch URL:', url)

      const response = await fetch(url)
      console.log('🐛 Debug: Response status:', response.status, response.statusText)
      console.log('🐛 Debug: Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('🐛 Debug: Response error text:', errorText)
        throw new Error(`Failed to fetch assignments: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()
      console.log('🐛 Debug: Response data:', result)

      setAssignmentData(result.data)
      setMatchingAnimals(result.data.matchingAnimals || [])
      setAssignmentMode('auto')
      setAssignmentTab('assigned')
      setSelectedForAdd(new Set())
      setSelectedForRemove(new Set())
    } catch (error) {
      console.error('Error fetching assignments:', error)
      setAssignmentData(null)
      setMatchingAnimals([])
    } finally {
      setLoadingAnimals(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setLoading(true)
    try {
      // Build characteristics object from form data
      const characteristics: Record<string, any> = {
        lactating: formData.lactating,
        pregnant: formData.pregnant,
        breeding_male: formData.breeding_male,
        growth_phase: formData.growth_phase
      }

      // Add range characteristics
      const rangeFields = [
        'dim_range', 'milk_yield_range', 'lactation_number_range',
        'days_pregnant_range', 'days_to_calving_range',
        'age_days_range', 'weight_range', 'daily_gain_range',
        'body_condition_score_range', 'weight_kg_range',
        'services_per_conception_range', 'days_since_heat_range'
      ]

      rangeFields.forEach(field => {
        const minKey = `${field}_min` as keyof CategoryFormData
        const maxKey = `${field}_max` as keyof CategoryFormData
        const minVal = formData[minKey]
        const maxVal = formData[maxKey]
        
        if (minVal || maxVal) {
          characteristics[field] = {
            min: minVal ? parseFloat(minVal as unknown as string) : null,
            max: maxVal ? parseFloat(maxVal as unknown as string) : null
          }
        }
      })

      // Add checkbox characteristics (excluding management/milking and feeding)
      const checkboxFields = [
        'mastitis_risk', 'under_treatment', 'vaccination_due', 'lameness_prone', 'reproductive_issue'
      ]

      checkboxFields.forEach(field => {
        const key = field as keyof CategoryFormData
        if (formData[key]) {
          characteristics[field] = true
        }
      })

      // Add milking schedules
      if (formData.milking_schedules && formData.milking_schedules.length > 0) {
        characteristics.milking_schedules = formData.milking_schedules
        characteristics.selected_milking_schedule_id = formData.selected_milking_schedule_id || ''
      }

      // Add feed ration assignment
      if (formData.milking_schedules && formData.milking_schedules.length > 0) {
        characteristics.milking_schedules = formData.milking_schedules
        characteristics.selected_milking_schedule_id = formData.selected_milking_schedule_id || ''
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        min_age_days: formData.min_age_days ? parseInt(formData.min_age_days) : null,
        max_age_days: formData.max_age_days ? parseInt(formData.max_age_days) : null,
        gender: formData.gender || null,
        characteristics,
        is_default: false,
        production_status: formData.production_status || null,
        production_statuses: formData.production_statuses && formData.production_statuses.length > 0 ? formData.production_statuses : null,
        feed_ration_id: formData.selected_feed_ration_id || null
      }

      const url = editingCategory
        ? `/api/farms/${farmId}/feed-management/animal-categories/${editingCategory.id}`
        : `/api/farms/${farmId}/feed-management/animal-categories`

      const method = editingCategory ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error Response:', errorData)
        
        // Format validation errors for display
        if (errorData.details && Array.isArray(errorData.details)) {
          const errorMessages = errorData.details
            .map((err: any) => `${err.field}: ${err.message}`)
            .join('\n')
          throw new Error(`Validation Error:\n${errorMessages}`)
        }
        
        throw new Error(errorData.error || errorData.message || 'Failed to save category')
      }

      const result = await response.json()

      if (editingCategory) {
        onCategoriesUpdate(categories.map(cat =>
          cat.id === editingCategory.id ? result.data : cat
        ))
      } else {
        onCategoriesUpdate([...categories, result.data])
      }

      handleModalClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Error saving category:', errorMessage)
      alert(errorMessage)
      // You might want to show a toast notification here
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingCategory) return

    setLoading(true)
    try {
      const response = await fetch(`/api/farms/${farmId}/feed-management/animal-categories/${deletingCategory.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete category')
      }

      onCategoriesUpdate(categories.filter(cat => cat.id !== deletingCategory.id))
      setDeletingCategory(null)
    } catch (error) {
      console.error('Error deleting category:', error)
    } finally {
      setLoading(false)
    }
  }

  // Memoized event handlers to prevent input focus issues
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, name: e.target.value }))
  }, [])

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, description: e.target.value }))
  }, [])

  const handleMinAgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, min_age_days: e.target.value }))
  }, [])

  const handleMaxAgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, max_age_days: e.target.value }))
  }, [])

  const handleGenderChange = useCallback((value: string) => {
  setFormData(prev => {
    const newFormData = {
      ...prev,
      gender: value
    }

    // Reset production status if it's invalid for the new gender
    if (value === 'male' && ['heifer', 'served', 'lactating', 'steaming_dry_cows', 'open_culling_dry_cows'].includes(prev.production_status)) {
      newFormData.production_status = 'bull'
    } else if (value === 'female' && prev.production_status === 'bull') {
      newFormData.production_status = 'heifer'
    } else if (value === 'any') { // ← Add handling for 'any'
      newFormData.production_status = 'calf'
    }

    return newFormData
  })
}, [])

  const handleCharacteristicChange = useCallback((key: string, value: boolean | string) => {
    setFormData(prev => {
      // Handle both boolean values (for checkboxes) and numeric string values (for range inputs)
      if (typeof value === 'string') {
        return { ...prev, [key]: value === '' ? '' : value }
      }
      return { ...prev, [key]: value }
    })
  }, [])

  const formatAge = (minAge?: number, maxAge?: number) => {
    if (!minAge && !maxAge) return 'Any age'
    if (minAge && !maxAge) return `${Math.floor(minAge / 30)}+ months`
    if (!minAge && maxAge) return `Up to ${Math.floor(maxAge / 30)} months`
    if (minAge && maxAge) return `${Math.floor(minAge / 30)}-${Math.floor(maxAge / 30)} months`
    return 'Any age'
  }

  const formatAnimalAge = (ageDays: number | null) => {
    if (!ageDays) return 'Unknown'
    if (ageDays < 30) return `${ageDays} days`
    if (ageDays < 365) return `${Math.floor(ageDays / 30)} months`
    const years = Math.floor(ageDays / 365)
    const months = Math.floor((ageDays % 365) / 30)
    return `${years}y ${months}m`
  }

  // Evaluate which characteristics an animal matches for a given category
  const evaluateAnimalCharacteristics = (animal: MatchingAnimal, category: AnimalCategory) => {
    const matches: Record<string, boolean> = {}
    const details: Record<string, string> = {}
    const labels: Record<string, string> = {}

    // Check production status (support both single and multiple)
    const targetStatuses = (category as any).production_statuses && (category as any).production_statuses.length > 0
      ? (category as any).production_statuses
      : category.production_status 
        ? [category.production_status]
        : []
    
    if (targetStatuses.length > 0) {
      matches.production_status = targetStatuses.includes(animal.production_status || '')
      details.production_status = animal.production_status || 'Unknown'
      labels.production_status = 'Production'
    }

    // Check gender
    if (category.gender && category.gender !== 'any') {
      matches.gender = animal.gender?.toLowerCase() === category.gender.toLowerCase()
      details.gender = animal.gender || 'Unknown'
      labels.gender = 'Gender'
    }

    // Check age range
    if (category.min_age_days !== undefined || category.max_age_days !== undefined) {
      if (animal.age_days !== null) {
        let ageMatches = true
        if (category.min_age_days && animal.age_days < category.min_age_days) {
          ageMatches = false
        } else if (category.max_age_days && animal.age_days > category.max_age_days) {
          ageMatches = false
        }
        matches.age = ageMatches
      } else {
        matches.age = true // Unknown age is considered matching
      }
      details.age = animal.age_days !== null ? formatAnimalAge(animal.age_days) : 'Unknown'
      labels.age = 'Age'
    }

    // Check DIM range
    if (category.characteristics?.dim_range && animal.days_in_milk !== null) {
      const range = category.characteristics.dim_range
      const dimMatches = (!range.min || animal.days_in_milk >= range.min) && (!range.max || animal.days_in_milk <= range.max)
      matches.dim_range = dimMatches
      details.dim_range = `${animal.days_in_milk} days`
      labels.dim_range = 'DIM'
    }

    // Check milk yield range
    if (category.characteristics?.milk_yield_range && animal.current_daily_production !== null) {
      const range = category.characteristics.milk_yield_range
      const yieldMatches = (!range.min || animal.current_daily_production >= range.min) && (!range.max || animal.current_daily_production <= range.max)
      matches.milk_yield_range = yieldMatches
      details.milk_yield_range = `${animal.current_daily_production} L/day`
      labels.milk_yield_range = 'Milk Yield'
    }

    // Note: Boolean and other characteristics would need additional animal data fields
    // that aren't currently in the MatchingAnimal interface

    return { matches, details, labels }
  }

  // Check if an animal meets ALL criteria defined for a category (strict validation)
  const animalMeetsAllCriteria = (animal: MatchingAnimal, category: AnimalCategory): boolean => {
    // Production status is required if defined (support both single and multiple)
    const targetStatuses = (category as any).production_statuses && (category as any).production_statuses.length > 0
      ? (category as any).production_statuses
      : category.production_status 
        ? [category.production_status]
        : []
    
    if (targetStatuses.length > 0 && !targetStatuses.includes(animal.production_status || '')) {
      return false
    }

    // Gender must match if specified and not 'any'
    if (category.gender && category.gender !== 'any') {
      if (animal.gender?.toLowerCase() !== category.gender.toLowerCase()) {
        return false
      }
    }

    // Check age range - must be within bounds
    if (category.min_age_days !== undefined && animal.age_days !== null && animal.age_days < category.min_age_days) {
      return false
    }
    if (category.max_age_days !== undefined && animal.age_days !== null && animal.age_days > category.max_age_days) {
      return false
    }

    // Check ALL range characteristics - if ANY are defined, they MUST match
    if (category.characteristics) {
      const chars = category.characteristics

      // DIM range (Days in Milk)
      const dimRangeMin = chars.dim_range_min || chars.dim_range?.min
      const dimRangeMax = chars.dim_range_max || chars.dim_range?.max
      if ((dimRangeMin || dimRangeMax) && animal.days_in_milk !== null) {
        if (dimRangeMin && animal.days_in_milk < dimRangeMin) return false
        if (dimRangeMax && animal.days_in_milk > dimRangeMax) return false
      } else if ((dimRangeMin || dimRangeMax) && animal.days_in_milk === null) {
        // If range is defined but animal has no data, they don't match
        return false
      }

      // Milk yield range
      const yieldRangeMin = chars.milk_yield_range_min || chars.milk_yield_range?.min
      const yieldRangeMax = chars.milk_yield_range_max || chars.milk_yield_range?.max
      if ((yieldRangeMin || yieldRangeMax) && animal.current_daily_production !== null) {
        if (yieldRangeMin && animal.current_daily_production < yieldRangeMin) return false
        if (yieldRangeMax && animal.current_daily_production > yieldRangeMax) return false
      } else if ((yieldRangeMin || yieldRangeMax) && animal.current_daily_production === null) {
        // If range is defined but animal has no data, they don't match
        return false
      }
    }

    // All defined criteria passed
    return true
  }

  const sortedCategories = useMemo(() =>
    [...categories].sort((a, b) => a.sort_order - b.sort_order),
    [categories]
  )

  // Component to display characteristic matching indicators
  const CharacteristicMatchDisplay = ({ animal, category }: { animal: MatchingAnimal, category: AnimalCategory }) => {
    if (!category.characteristics && !category.production_status && !(category as any).production_statuses?.length && !category.gender && category.min_age_days === undefined && category.max_age_days === undefined) {
      return null
    }

    const { matches, details, labels } = evaluateAnimalCharacteristics(animal, category)
    const relevantChars = Object.keys(matches).filter(char => matches[char] !== undefined)

    if (relevantChars.length === 0) return null

    const matchCount = Object.values(matches).filter(Boolean).length
    const totalCount = Object.values(matches).length

    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {relevantChars.map(char => {
          const matched = matches[char]
          const detail = details[char]
          const label = (labels as any)?.[char] || char.replace(/_/g, ' ').charAt(0).toUpperCase() + char.replace(/_/g, ' ').slice(1)
          return (
            <div
              key={char}
              className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                matched
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
              title={`${label}: ${detail}`}
            >
              {matched ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
              <span className="capitalize">{label}</span>
            </div>
          )
        })}
        <div className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 ml-auto">
          {matchCount}/{totalCount}
        </div>
      </div>
    )
  }

  const ActionButtons = ({ category }: { category: AnimalCategory }) => {
    if (isMobile) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewAnimals(category)}>
              <Eye className="mr-2 h-4 w-4" />
              View Animals {(category.assigned_animals_count ?? 0) > 0 ? `(${category.assigned_animals_count})` : ''}
            </DropdownMenuItem>
            {canEdit && (
              <>
                <DropdownMenuItem onClick={() => handleEdit(category)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                {!category.is_default && (
                  <DropdownMenuItem
                    onClick={() => setDeletingCategory(category)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return (
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewAnimals(category)}
        >
          <Eye className="h-4 w-4 mr-1" />
          View Animals ({category.assigned_animals_count ?? 0})
        </Button>
        {canEdit && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(category)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            {!category.is_default && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingCategory(category)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </>
        )}
      </div>
    )
  }

  // Add production status options that respect gender selection
  const getProductionStatusOptions = (gender: string) => {
    if (gender === 'male') {
      return [
        { 
          value: 'calf', 
          label: 'Calf',
          description: 'Young male, not yet mature'
        },
        { 
          value: 'bull', 
          label: 'Bull (Breeding Male)',
          description: 'Male cows above 6 months'
        }
      ]
    }

    if (gender === 'female') {
      return [
        { 
          value: 'calf', 
          label: 'Calf',
          description: 'Young female, not yet breeding age'
        },
        { 
          value: 'heifer', 
          label: 'Heifer',
          description: 'Young female, not yet calved'
        },
        { 
          value: 'served', 
          label: 'Served (In-Calf)',
          description: 'Pregnant female, expecting offspring and lactating'
        },
        { 
          value: 'lactating', 
          label: 'Lactating',
          description: 'Actively producing milk'
        },
        { 
          value: 'steaming_dry_cows', 
          label: 'Steaming Dry',
          description: 'Stopped milking, preparing to calve'
        },
        { 
          value: 'open_culling_dry_cows', 
          label: 'Open Culling Dry',
          description: 'Dry cow with reproductive issues or not in breeding cycle'
        }
      ]
    }

    // Gender neutral - only calf is appropriate
    return [
      {
        value: 'calf',
        label: 'Calf',
        description: 'Young animal, gender not specified'
      }
    ]
  }

  // ── Card display helpers ──────────────────────────────────────────────────

  const PRODUCTION_STATUS_META: Record<string, { label: string; pill: string; bar: string }> = {
    calf:                  { label: 'Calf',            pill: 'bg-amber-100  text-amber-800  border border-amber-200',  bar: 'bg-amber-400'  },
    heifer:                { label: 'Heifer',          pill: 'bg-blue-100   text-blue-800   border border-blue-200',   bar: 'bg-blue-400'   },
    served:                { label: 'In-Calf',         pill: 'bg-purple-100 text-purple-800 border border-purple-200', bar: 'bg-purple-400' },
    lactating:             { label: 'Lactating',       pill: 'bg-green-100  text-green-800  border border-green-200',  bar: 'bg-green-400'  },
    steaming_dry_cows:     { label: 'Steaming Dry',    pill: 'bg-orange-100 text-orange-800 border border-orange-200', bar: 'bg-orange-400' },
    open_culling_dry_cows: { label: 'Culling Dry',     pill: 'bg-gray-100   text-gray-700   border border-gray-200',   bar: 'bg-gray-400'   },
    bull:                  { label: 'Bull',             pill: 'bg-teal-100   text-teal-800   border border-teal-200',   bar: 'bg-teal-400'   },
  }

  const getStatusMeta = (status: string) =>
    PRODUCTION_STATUS_META[status] ?? { label: status, pill: 'bg-gray-100 text-gray-700 border border-gray-200', bar: 'bg-gray-400' }

  const primaryBarColor = (category: AnimalCategory) => {
    const statuses: string[] = (category as any).production_statuses?.length
      ? (category as any).production_statuses
      : category.production_status ? [category.production_status] : []
    return statuses.length ? getStatusMeta(statuses[0]).bar : 'bg-gray-300'
  }

  const getRangeRows = (category: AnimalCategory) => {
    const chars = category.characteristics as any
    if (!chars) return []
    const rows: { label: string; value: string }[] = []
    const fmt = (min: any, max: any, unit: string) => {
      if (min != null && max != null) return `${min}–${max} ${unit}`
      if (min != null) return `≥ ${min} ${unit}`
      if (max != null) return `≤ ${max} ${unit}`
      return null
    }
    const push = (label: string, field: string, unit: string) => {
      const r = chars[field]
      if (!r) return
      const v = fmt(r.min, r.max, unit)
      if (v) rows.push({ label, value: v })
    }
    push('DIM',         'dim_range',               'days')
    push('Milk',        'milk_yield_range',         'L/d')
    push('Lactation',   'lactation_number_range',   '#')
    push('Pregnant',    'days_pregnant_range',      'days')
    push('To calving',  'days_to_calving_range',    'days')
    push('Age',         'age_days_range',            'days')
    push('Weight',      'weight_range',             'kg')
    push('Gain',        'daily_gain_range',         'kg/d')
    push('BCS',         'body_condition_score_range','')
    push('Services',    'services_per_conception_range', '')
    return rows
  }

  const HEALTH_FLAGS: { key: string; label: string }[] = [
    { key: 'mastitis_risk',     label: 'Mastitis Risk'    },
    { key: 'under_treatment',   label: 'Under Treatment'  },
    { key: 'vaccination_due',   label: 'Vaccination Due'  },
    { key: 'lameness_prone',    label: 'Lameness Prone'   },
    { key: 'reproductive_issue',label: 'Repro Issue'      },
  ]

  const getHealthFlags = (category: AnimalCategory) =>
    HEALTH_FLAGS.filter(f => (category.characteristics as any)?.[f.key])

  const getMilkingInfo = (category: AnimalCategory): string | null => {
    const chars = category.characteristics as any
    if (!chars) return null
    const schedId = chars.selected_milking_schedule_id
    if (!schedId) return null
    if (schedId === 'farm_default') {
      if (farmMilkingSessions.length === 0) return 'Farm default schedule'
      const times = farmMilkingSessions.map((s: any) => s.time).join(', ')
      return `${farmMilkingSessions.length}× daily · ${times}`
    }
    const sched = (chars.milking_schedules ?? []).find((s: any) => s.id === schedId)
    if (!sched) return null
    return `${sched.frequency}× daily · ${(sched.times ?? []).slice(0, sched.frequency).join(', ')}`
  }

  const getFeedRationName = (rationId: string): string => {
    const ration = feedRations.find(r => r.id === rationId)
    return ration ? ration.name : 'Assigned ration'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Animal Categories</h3>
          <p className="text-sm text-gray-600">
            Define animal groups for targeted feeding and management
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        )}
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        {sortedCategories.map((category) => {
          const statuses: string[] = (category as any).production_statuses?.length
            ? (category as any).production_statuses
            : category.production_status ? [category.production_status] : []
          const rangeRows   = getRangeRows(category)
          const healthFlags = getHealthFlags(category)
          const milkingInfo = getMilkingInfo(category)
          const rationId    = category.feed_ration_id || (category.characteristics as any)?.selected_feed_ration_id as string | undefined
          const barColor    = primaryBarColor(category)

          return (
            <div key={category.id} className="border rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">

              {/* Colour accent bar */}
              <div className={`h-1 w-full ${barColor}`} />

              {/* Header */}
              <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <h4 className="font-semibold text-gray-900 text-base">{category.name}</h4>
                    {category.is_default && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                    {category.assigned_animals_count !== undefined && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        <UserCheck className="w-3 h-3" />
                        {category.assigned_animals_count} animals
                      </span>
                    )}
                  </div>
                  {category.description && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{category.description}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <ActionButtons category={category} />
                </div>
              </div>

              {/* Body */}
              <div className="px-4 pb-4 space-y-2.5">

                {/* Row 1 — production statuses + gender + age */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {statuses.length > 0
                    ? statuses.map(s => (
                        <span key={s} className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${getStatusMeta(s).pill}`}>
                          {getStatusMeta(s).label}
                        </span>
                      ))
                    : <span className="text-xs text-gray-400 italic">No production status</span>
                  }

                  {category.gender && category.gender !== 'any' && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full">
                      {category.gender === 'female'
                        ? <Venus className="w-3 h-3 text-pink-500" />
                        : <Mars  className="w-3 h-3 text-blue-500" />}
                      {category.gender === 'female' ? 'Female' : 'Male'}
                    </span>
                  )}
                  {category.gender === 'any' && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full">
                      <VenetianMask className="w-3 h-3 text-gray-400" />
                      Any gender
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {formatAge(category.min_age_days, category.max_age_days)}
                  </span>
                </div>

                {/* Row 2 — milking schedule + feed ration */}
                {(milkingInfo || rationId) && (
                  <div className="flex flex-wrap gap-3">
                    {milkingInfo && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-medium">Milking:</span>
                        {milkingInfo}
                      </span>
                    )}
                    {rationId && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">
                        <Leaf className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-medium">Ration:</span>
                        {getFeedRationName(rationId)}
                      </span>
                    )}
                  </div>
                )}

                {/* Row 3 — range characteristics */}
                {rangeRows.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <Activity className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    {rangeRows.map(row => (
                      <span key={row.label} className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                        <span className="font-medium text-gray-500">{row.label}</span>
                        {row.value}
                      </span>
                    ))}
                  </div>
                )}

                {/* Row 4 — health flags */}
                {healthFlags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    {healthFlags.map(f => (
                      <span key={f.key} className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                        {f.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {categories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="mx-auto h-8 w-8 text-gray-400 mb-3" />
            <h3 className="font-medium text-gray-900 mb-1">No animal categories yet</h3>
            <p className="text-sm">Create your first animal category to get started.</p>
            {canEdit && (
              <Button className="mt-4" onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={handleModalClose}
        className="max-w-lg"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingCategory ? 'Edit Animal Category' : 'Add New Animal Category'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="animal-name">Category Name *</Label>
              <Input
                id="animal-name"
                key={`name-${editingCategory?.id || 'new'}`}
                value={formData.name}
                onChange={handleNameChange}
                placeholder="e.g., Young Heifers, Dry Cows"
                required
                autoComplete="off"
              />
            </div>

            <div>
              <Label htmlFor="animal-description">Description</Label>
              <textarea
                id="animal-description"
                key={`description-${editingCategory?.id || 'new'}`}
                value={formData.description}
                onChange={handleDescriptionChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                placeholder="Describe this animal category..."
              />
            </div>

            {/* Gender Selection */}
            <div>
              <Label htmlFor="animal-gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => {
                  setFormData(prev => {
                    const newFormData = {
                      ...prev,
                      gender: value
                    }

                    // Reset production status if it's invalid for the new gender
                    if (value === 'male' && ['heifer', 'served', 'lactating', 'steaming_dry_cows', 'open_culling_dry_cows'].includes(prev.production_status)) {
                      newFormData.production_status = 'bull'
                    } else if (value === 'female' && prev.production_status === 'bull') {
                      newFormData.production_status = 'heifer'
                    } else if (!value) {
                      newFormData.production_status = 'calf'
                    }

                    return newFormData
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Production Status Selection - Multiple */}
            <div>
              <Label>Production Status *</Label>
              <p className="text-xs text-gray-600 mb-2">Select one or more production statuses. Only characteristics common to all selected statuses will be available.</p>
              <div className="space-y-2 border border-gray-300 rounded-lg p-3 bg-gray-50">
                {getProductionStatusOptions(formData.gender).map(option => (
                  <div key={option.value} className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id={`status_${option.value}`}
                      checked={formData.production_statuses.includes(option.value)}
                      onChange={(e) => {
                        const newStatuses = e.target.checked
                          ? [...formData.production_statuses, option.value]
                          : formData.production_statuses.filter(s => s !== option.value)
                        setFormData(prev => ({ 
                          ...prev, 
                          production_statuses: newStatuses,
                          production_status: newStatuses[0] || '' // Keep first as primary for backward compatibility
                        }))
                      }}
                      className="mt-1"
                    />
                    <label htmlFor={`status_${option.value}`} className="flex-1 cursor-pointer">
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-gray-600">{option.description}</div>
                    </label>
                  </div>
                ))}
              </div>
              {formData.production_statuses.length === 0 && (
                <p className="text-xs text-orange-600 mt-1">Please select at least one production status</p>
              )}
              {formData.production_statuses.length > 1 && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                  ℹ️ Characteristics will show only options common to all {formData.production_statuses.length} selected statuses
                </div>
              )}
            </div>

            {/* Characteristics - Contextual Groups */}
            <div>
              <Label>Filtering Characteristics</Label>
              <p className="text-xs text-gray-600 mb-3">Select characteristics to define this group. Options are limited to those applicable across all selected production statuses.</p>
              <div className="space-y-3 mt-2 max-h-96 overflow-y-auto">
                {getCommonCharacteristics(formData.production_statuses).length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Select at least one production status first to see available characteristics.</p>
                ) : (
                  getCommonCharacteristics(formData.production_statuses).map((groupKey) => {
                    const group = CHARACTERISTIC_GROUPS[groupKey as keyof typeof CHARACTERISTIC_GROUPS]
                    if (!group) return null
                    
                    const isExpanded = expandedGroups[groupKey] ?? false
                    const isRangeType = group.type === 'ranges'
                    
                    return (
                      <div key={groupKey} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Group Header - Expandable */}
                        <button
                          type="button"
                          onClick={() => setExpandedGroups(prev => ({ ...prev, [groupKey]: !isExpanded }))}
                          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-medium text-sm text-gray-900"
                        >
                          <div className="flex-1 text-left">
                            <h4 className="font-semibold">{group.label}</h4>
                            <p className="text-xs text-gray-600 mt-1">{group.description}</p>
                          </div>
                          <svg
                            className={`w-4 h-4 text-gray-600 transform transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </button>
                        
                        {/* Group Options - Collapsible */}
                        {isExpanded && (
                          <div className="px-4 py-3 bg-white space-y-3 border-t border-gray-200">
                            {group.type === 'custom_schedules' ? (
                              // Custom Milking Schedules UI
                              <div className="space-y-4">
                                {/* Available Schedules */}
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-gray-900">Available Schedules:</p>
                                  
                                  {/* Farm Milking Session */}
                                  {farmMilkingSessions.length > 0 && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                          <p className="font-medium text-sm text-gray-900">Farm Milking Session (Settings)</p>
                                          <p className="text-xs text-gray-600 mt-1">
                                            {farmMilkingSessions.length}x daily at {farmMilkingSessions.map(s => s.time).join(', ')}
                                          </p>
                                        </div>
                                        <div className="flex items-center space-x-2 ml-2">
                                          <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={formData.selected_milking_schedule_id === 'farm_default'}
                                              onChange={() => {
                                                setFormData(prev => ({ 
                                                  ...prev, 
                                                  selected_milking_schedule_id: 
                                                    prev.selected_milking_schedule_id === 'farm_default' 
                                                      ? undefined 
                                                      : 'farm_default' 
                                                }));
                                              }}
                                              className="h-4 w-4 text-farm-green"
                                            />
                                            <span className="text-xs text-gray-600">Select</span>
                                          </label>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Custom Schedules */}
                                  {formData.milking_schedules && formData.milking_schedules.length > 0 && (
                                    <>
                                      <p className="text-sm font-medium text-gray-900 mt-4">Custom Schedules:</p>
                                      {formData.milking_schedules.map((schedule) => (
                                        <div
                                          key={schedule.id}
                                          className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                                        >
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                              <p className="font-medium text-sm text-gray-900">{schedule.name}</p>
                                              <p className="text-xs text-gray-600 mt-1">
                                                {schedule.frequency}x daily at {schedule.times.join(', ')}
                                              </p>
                                            </div>
                                            <div className="flex items-center space-x-2 ml-2">
                                              <label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={formData.selected_milking_schedule_id === schedule.id}
                                                  onChange={() => {
                                                    setFormData(prev => ({
                                                      ...prev,
                                                      selected_milking_schedule_id: 
                                                        prev.selected_milking_schedule_id === schedule.id 
                                                          ? undefined 
                                                          : schedule.id
                                                    }));
                                                  }}
                                                  className="h-4 w-4 text-farm-green"
                                                />
                                                <span className="text-xs text-gray-600">Select</span>
                                              </label>
                                              <button
                                                type="button"
                                                onClick={() => handleEditMilkingSchedule(schedule)}
                                                className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                                              >
                                                Edit
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveMilkingSchedule(schedule.id)}
                                                className="text-red-600 hover:text-red-900 text-xs font-medium"
                                              >
                                                Remove
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </>
                                  )}
                                  
                                  {(!farmMilkingSessions.length && (!formData.milking_schedules || formData.milking_schedules.length === 0)) && (
                                    <p className="text-sm text-gray-500 italic">No schedules available. Configure milking sessions in farm settings or create custom schedules below.</p>
                                  )}
                                </div>

                                {/* Schedule Form */}
                                {showScheduleForm ? (
                                  <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg space-y-3">
                                    <h4 className="font-medium text-sm text-gray-900">
                                      {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
                                    </h4>

                                    <div>
                                      <label className="text-xs font-medium text-gray-700 block mb-1">
                                        Schedule Name
                                      </label>
                                      <Input
                                        type="text"
                                        value={newScheduleName}
                                        onChange={(e) => setNewScheduleName(e.target.value)}
                                        placeholder="e.g., Peak Season, Dry Season"
                                        className="text-sm"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-xs font-medium text-gray-700 block mb-1">
                                        Milking Frequency
                                      </label>
                                      <Select value={newScheduleFrequency} onValueChange={handleFrequencyChange}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="1">Once daily (1x)</SelectItem>
                                          <SelectItem value="2">Twice daily (2x)</SelectItem>
                                          <SelectItem value="3">Three times daily (3x)</SelectItem>
                                          <SelectItem value="4">Four times daily (4x)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div>
                                      <label className="text-xs font-medium text-gray-700 block mb-2">
                                        Milking Times
                                      </label>
                                      <div className="space-y-2">
                                        {newScheduleTimes.slice(0, parseInt(newScheduleFrequency)).map((time, index) => (
                                          <div key={index} className="flex items-center space-x-2">
                                            <span className="text-xs text-gray-600 w-12">Milking {index + 1}:</span>
                                            <input
                                              type="time"
                                              value={time}
                                              onChange={(e) => handleUpdateScheduleTime(index, e.target.value)}
                                              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-farm-green"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="flex justify-end space-x-2 pt-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowScheduleForm(false)
                                          setEditingSchedule(null)
                                          setNewScheduleName('')
                                          setNewScheduleFrequency('2')
                                          setNewScheduleTimes(['05:00', '14:30'])
                                        }}
                                        className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={editingSchedule ? handleUpdateMilkingSchedule : handleAddMilkingSchedule}
                                        className="px-3 py-1 text-xs bg-farm-green text-white rounded hover:bg-farm-green-dark"
                                      >
                                        {editingSchedule ? 'Update' : 'Add'} Schedule
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setShowScheduleForm(true)}
                                    className="w-full px-3 py-2 text-sm border border-dashed border-gray-300 rounded hover:bg-gray-50 text-farm-green font-medium"
                                  >
                                    + Create New Schedule
                                  </button>
                                )}
                              </div>
                            ) : group.type === 'feed_rations' ? (
                              // Feed Rations Assignment UI
                              <div className="space-y-4">
                                {/* Available Feed Rations */}
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-gray-900">Available Feed Rations:</p>
                                  
                                  {/* Feed Rations List */}
                                  {feedRations.length > 0 ? (
                                    feedRations.map((ration) => (
                                      <div
                                        key={ration.id}
                                        className="p-3 bg-orange-50 border border-orange-200 rounded-lg"
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1">
                                            <p className="font-medium text-sm text-gray-900">{ration.name}</p>
                                            {ration.description && (
                                              <p className="text-xs text-gray-600 mt-1">{ration.description}</p>
                                            )}
                                            {!ration.is_active && (
                                              <span className="text-xs text-orange-600 mt-1">(Inactive)</span>
                                            )}
                                          </div>
                                          <div className="flex items-center space-x-2 ml-2">
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={formData.selected_feed_ration_id === ration.id}
                                                onChange={() => {
                                                  setFormData(prev => ({
                                                    ...prev,
                                                    selected_feed_ration_id: 
                                                      prev.selected_feed_ration_id === ration.id 
                                                        ? undefined 
                                                        : ration.id
                                                  }));
                                                }}
                                                className="h-4 w-4 text-farm-green"
                                              />
                                              <span className="text-xs text-gray-600">Select</span>
                                            </label>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-sm text-gray-500 italic">No feed rations available. Create feed rations in the Feed Management section.</p>
                                  )}
                                  
                                  {formData.selected_feed_ration_id && (
                                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                                      Selected ration will be assigned to animals in this category
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (group as any).options ? (
                              // Regular Characteristics (ranges/checkboxes)
                              (group as any).options.map((option: any) => {
                                if (isRangeType && option.type === 'range') {
                                  // Render range inputs
                                  const minKey = `${option.key}_min`
                                  const maxKey = `${option.key}_max`
                                  return (
                                    <div key={option.key} className="p-3 bg-gray-50 rounded border border-gray-200">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                          <span className="text-sm font-medium text-gray-900 block">{option.label}</span>
                                          <p className="text-xs text-gray-500">{option.description}</p>
                                        </div>
                                        <span className="text-xs font-semibold text-gray-600 ml-2">{option.unit}</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="text-xs text-gray-600 block mb-1">Min</label>
                                          <input
                                            type="number"
                                            value={typeof formData[minKey as keyof CategoryFormData] === 'string' ? (formData[minKey as keyof CategoryFormData] as string) : ''}
                                            onChange={(e) => handleCharacteristicChange(minKey, e.target.value)}
                                            placeholder="Min"
                                            min={option.min}
                                            max={option.max}
                                            step={option.step}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-farm-green"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-600 block mb-1">Max</label>
                                          <input
                                            type="number"
                                            value={typeof formData[maxKey as keyof CategoryFormData] === 'string' ? (formData[maxKey as keyof CategoryFormData] as string) : ''}
                                            onChange={(e) => handleCharacteristicChange(maxKey, e.target.value)}
                                            placeholder="Max"
                                            min={option.min}
                                            max={option.max}
                                            step={option.step}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-farm-green"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )
                                } else {
                                  // Render checkboxes
                                  return (
                                    <label
                                      key={option.key}
                                      className="flex items-start space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={formData[option.key as keyof CategoryFormData] as boolean ?? false}
                                        onChange={(e) => handleCharacteristicChange(option.key, e.target.checked)}
                                        className="mt-1 h-4 w-4 text-farm-green border-gray-300 rounded focus:ring-farm-green"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium text-gray-900 block">{option.label}</span>
                                        <p className="text-xs text-gray-500">{option.description}</p>
                                      </div>
                                    </label>
                                  )
                                }
                              })
                            ) : (
                              <p className="text-sm text-gray-500 italic">No options available</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleModalClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <LoadingSpinner size="sm" /> : (editingCategory ? 'Update' : 'Create')}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Matching Animals Modal - with Assignment Management */}
      <Modal
        isOpen={!!viewingAnimals}
        onClose={() => setViewingAnimals(null)}
        className="max-w-5xl"
      >
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Manage Animals for "{viewingAnimals?.name}"
              </h3>
              {assignmentData && (
                <span className="text-sm text-gray-600">
                  {assignmentData.assignedAnimals.length} assigned • 
                  {' ' + (assignmentData.matchingAnimals.length - assignmentData.assignedAnimals.length)} to add • 
                  {' ' + assignmentData.animalsToRemove.length} to remove
                </span>
              )}
            </div>

            {/* Mode Selection */}
            <div className="flex items-center space-x-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setAssignmentMode('auto')
                    setAssignmentTab('assigned')
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    assignmentMode === 'auto'
                      ? 'bg-farm-green text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  🤖 Auto-Sync Mode
                </button>
                <button
                  onClick={() => setAssignmentMode('manual')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    assignmentMode === 'manual'
                      ? 'bg-farm-green text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ✋ Manual Mode
                </button>
              </div>
            </div>
          </div>

          {loadingAnimals ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : !assignmentData ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="mx-auto h-8 w-8 text-gray-400 mb-3" />
              <p>Failed to load assignment data</p>
            </div>
          ) : assignmentMode === 'auto' ? (
            <>
              {/* Auto-Sync Mode */}
              <div className="space-y-4">
                {/* Tab Navigation */}
                <div className="flex space-x-2 border-b border-gray-200">
                  <button
                    onClick={() => setAssignmentTab('assigned')}
                    className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                      assignmentTab === 'assigned'
                        ? 'border-farm-green text-farm-green'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ✓ Currently Assigned ({assignmentData.assignedAnimals.length})
                  </button>
                  <button
                    onClick={() => setAssignmentTab('suggested')}
                    className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                      assignmentTab === 'suggested'
                        ? 'border-farm-green text-farm-green'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ✅ Ready to Add ({Math.max(0, assignmentData.matchingAnimals.filter((m: any) => !assignmentData.assignedAnimals.find((a: any) => a.animal_id === m.id)).length)})
                  </button>
                  <button
                    onClick={() => setAssignmentTab('remove')}
                    className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                      assignmentTab === 'remove'
                        ? 'border-farm-green text-farm-green'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ❌ Suggested to Remove ({assignmentData.animalsToRemove.length})
                  </button>
                </div>

                {/* Auto-Sync Summary & Button */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900">Auto-Sync Animals</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      {Math.max(0, assignmentData.matchingAnimals.length - assignmentData.assignedAnimals.length)} to add,{' '}
                      {assignmentData.animalsToRemove.length} to remove
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      setSyncingCategory(true)
                      try {
                        const response = await fetch(
                          `/api/farms/${farmId}/animal-categories/${viewingAnimals?.id}/auto-sync`,
                          { method: 'POST' }
                        )
                        if (response.ok) {
                          // Refresh assignment data
                          if (viewingAnimals) {
                            await handleViewAnimals(viewingAnimals)
                          }
                        } else {
                          alert('Failed to sync animals')
                        }
                      } catch (error) {
                        console.error('Error syncing animals:', error)
                        alert('Error syncing animals')
                      } finally {
                        setSyncingCategory(false)
                      }
                    }}
                    disabled={
                      syncingCategory ||
                      (Math.max(0, assignmentData.matchingAnimals.length - assignmentData.assignedAnimals.length) === 0 &&
                        assignmentData.animalsToRemove.length === 0)
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                  >
                    {syncingCategory ? <LoadingSpinner size="sm" /> : '🔄 Sync Now'}
                  </Button>
                </div>

                {/* Content Based on Selected Tab */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {assignmentTab === 'assigned' && (
                    <div className="max-h-96 overflow-y-auto">
                      {assignmentData.assignedAnimals.length > 0 ? (
                        <div className="divide-y">
                          {assignmentData.assignedAnimals.map((assignment: any) => (
                            <div key={assignment.id} className="p-3 hover:bg-gray-50">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="font-medium">#{assignment.animal?.tag_number || 'N/A'}</span>
                                {assignment.animal?.name && (
                                  <span className="text-gray-600">({assignment.animal.name})</span>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {assignment.animal?.gender || 'Unknown'}
                                </Badge>
                                <Badge variant={assignment.assignment_method === 'auto' ? 'secondary' : 'outline'} className="text-xs">
                                  {assignment.assignment_method === 'auto' ? '🤖 Auto' : '✋ Manual'}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-500 mb-2">
                                Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                              </div>
                              {assignment.animal && viewingAnimals && (
                                <CharacteristicMatchDisplay animal={assignment.animal} category={viewingAnimals} />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-gray-500">
                          <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p>No animals assigned yet</p>
                        </div>
                      )}
                    </div>
                  )}

                  {assignmentTab === 'suggested' && (
                    <div className="max-h-96 overflow-y-auto">
                      <div className="sticky top-0 bg-green-50 border-b border-green-200 p-2 text-xs text-green-700">
                        Only animals meeting ALL criteria are shown here
                      </div>
                      {(() => {
                        const suggestedAnimals = assignmentData.matchingAnimals.filter(
                          (m: any) => !assignmentData.assignedAnimals.find((a: any) => a.animal_id === m.id) && viewingAnimals !== null
                        )
                        return suggestedAnimals.length > 0 ? (
                          <div className="divide-y">
                            {suggestedAnimals.map((animal: any) => (
                              <div key={animal.id} className="p-3 hover:bg-green-50">
                                <div className="flex items-center space-x-3 mb-1">
                                  <span className="font-medium">#{animal.tag_number}</span>
                                  {animal.name && <span className="text-gray-600">({animal.name})</span>}
                                  <Badge variant="outline" className="text-xs">
                                    {animal.gender || 'Unknown'}
                                  </Badge>
                                  {animal.production_status && (
                                    <Badge variant="secondary" className="text-xs">
                                      {animal.production_status}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mb-2">
                                  Age: {formatAnimalAge(animal.age_days)}{animal.days_in_milk ? ` • DIM: ${animal.days_in_milk}` : ''}
                                </div>
                                {viewingAnimals && (
                                  <CharacteristicMatchDisplay animal={animal} category={viewingAnimals} />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-6 text-center text-gray-500">
                            <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                            <p>All matching animals are already assigned</p>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {assignmentTab === 'remove' && (
                    <div className="max-h-96 overflow-y-auto">
                      <div className="sticky top-0 bg-red-50 border-b border-red-200 p-2 text-xs text-red-700">
                        Animals no longer meeting ALL criteria are shown here
                      </div>
                      {assignmentData.animalsToRemove.length > 0 ? (
                        <div className="divide-y">
                          {assignmentData.animalsToRemove
                            .filter(
                              (a: any) => assignmentData.assignedAnimals.find((aa: any) => aa.animal_id === a.id)
                            )
                            .map((animal: any) => (
                              <div key={animal.id} className="p-3 hover:bg-red-50">
                                <div className="flex items-center space-x-3 mb-1">
                                  <span className="font-medium">#{animal.tag_number}</span>
                                  {animal.name && <span className="text-gray-600">({animal.name})</span>}
                                  <Badge variant="outline" className="text-xs">
                                    {animal.gender || 'Unknown'}
                                  </Badge>
                                  <Badge variant="destructive" className="text-xs">
                                    No longer matches
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-500 mb-2">
                                  No longer fits category criteria
                                </div>
                                {viewingAnimals && (
                                  <CharacteristicMatchDisplay animal={animal} category={viewingAnimals} />
                                )}
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-gray-500">
                          <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p>No animals need to be removed</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Manual Mode */}
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-900">Manual Assignment</h4>
                  <p className="text-sm text-amber-700">
                    Select animals from the following production status{(viewingAnimals as any)?.production_statuses?.length > 1 ? 'es' : ''}: <span className="font-medium">
                      {(viewingAnimals as any)?.production_statuses?.length > 0
                        ? (viewingAnimals as any).production_statuses.join(', ')
                        : viewingAnimals?.production_status || 'selected'
                      }
                    </span>. Animals are shown with characteristic evaluation to help your decision.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by animal name or tag number..."
                    value={manualModeSearch}
                    onChange={(e) => setManualModeSearch(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green focus:border-transparent"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Add Animals Section */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                    <div className="bg-green-50 border-b border-green-200 p-3">
                      <h4 className="font-medium text-green-900">Add Animals</h4>
                      <p className="text-xs text-green-700">{viewingAnimals?.production_status || 'Selected'} production status</p>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y">
                      {(() => {
                        // Filter animals: only those from production status not yet assigned, and matching search
                        // Use allAnimalsByProductionStatus for manual mode, not matchingAnimals (which filters by characteristics)
                        const filteredAnimals = (assignmentData.allAnimalsByProductionStatus || []).filter((m: any) => {
                          const isNotAssigned = !assignmentData.assignedAnimals.find((a: any) => a.animal_id === m.id)
                          const matchesSearch = !manualModeSearch || 
                            (m.tag_number && m.tag_number.toLowerCase().includes(manualModeSearch.toLowerCase())) ||
                            (m.name && m.name.toLowerCase().includes(manualModeSearch.toLowerCase()))
                          return isNotAssigned && matchesSearch
                        })

                        return filteredAnimals.length > 0 ? (
                          filteredAnimals.map((animal: any) => (
                            <div 
                              key={animal.id} 
                              className="p-3 hover:bg-green-50 cursor-pointer border-b"
                              onClick={() => setSelectedAnimalForPreview(selectedAnimalForPreview === animal.id ? null : animal.id)}
                            >
                              <label className="flex items-center space-x-3 mb-2">
                                <input
                                  type="checkbox"
                                  checked={selectedForAdd.has(animal.id)}
                                  onChange={() => {
                                    const newSet = new Set(selectedForAdd)
                                    if (newSet.has(animal.id)) {
                                      newSet.delete(animal.id)
                                    } else {
                                      newSet.add(animal.id)
                                    }
                                    setSelectedForAdd(newSet)
                                  }}
                                  className="h-4 w-4 rounded border-gray-300"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">#{animal.tag_number}</div>
                                  {animal.name && <div className="text-xs text-gray-600 truncate">{animal.name}</div>}
                                  <div className="text-xs text-gray-500 mt-1">
                                    Age: {formatAnimalAge(animal.age_days)}{animal.days_in_milk ? ` • DIM: ${animal.days_in_milk}` : ''}
                                  </div>
                                </div>
                              </label>
                              
                              {/* Characteristic Preview when selected */}
                              {selectedAnimalForPreview === animal.id && viewingAnimals && (
                                <div className="mt-3 pt-3 border-t border-green-200">
                                  <p className="text-xs font-medium text-gray-700 mb-2">Characteristic Match:</p>
                                  <CharacteristicMatchDisplay animal={animal} category={viewingAnimals} />
                                  <p className="text-xs text-amber-600 mt-2 italic">
                                    ℹ️ You can add this animal even if not all characteristics match the category
                                  </p>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-6 text-center text-gray-500 text-sm">
                            <Users className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                            {manualModeSearch ? 'No animals match your search' : 'All animals from this production status are assigned or nothing to show'}
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Remove Animals Section */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                    <div className="bg-red-50 border-b border-red-200 p-3">
                      <h4 className="font-medium text-red-900">Remove Animals</h4>
                      <p className="text-xs text-red-700">Currently assigned</p>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y">
                      {(() => {
                        const filteredRemove = assignmentData.assignedAnimals.filter((assignment: any) => {
                          const matchesSearch = !manualModeSearch || 
                            (assignment.animal?.tag_number && assignment.animal.tag_number.toLowerCase().includes(manualModeSearch.toLowerCase())) ||
                            (assignment.animal?.name && assignment.animal.name.toLowerCase().includes(manualModeSearch.toLowerCase()))
                          return matchesSearch
                        })

                        return filteredRemove.length > 0 ? (
                          filteredRemove.map((assignment: any) => (
                            <div key={assignment.id} className="p-3 hover:bg-red-50">
                              <label className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={selectedForRemove.has(assignment.animal_id)}
                                  onChange={() => {
                                    const newSet = new Set(selectedForRemove)
                                    if (newSet.has(assignment.animal_id)) {
                                      newSet.delete(assignment.animal_id)
                                    } else {
                                      newSet.add(assignment.animal_id)
                                    }
                                    setSelectedForRemove(newSet)
                                  }}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">#{assignment.animal?.tag_number || 'N/A'}</div>
                                  {assignment.animal?.name && <div className="text-xs text-gray-600 truncate">{assignment.animal.name}</div>}
                                  <div className="text-xs text-gray-500 mt-1">
                                    Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </label>
                            </div>
                          ))
                        ) : (
                          <div className="p-6 text-center text-gray-500 text-sm">
                            <Users className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                            {manualModeSearch ? 'No animals match your search' : 'No animals assigned'}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>

                {/* Apply Changes Button */}
                <Button
                  onClick={async () => {
                    setLoading(true)
                    try {
                      const addPromises = Array.from(selectedForAdd).map(animalId =>
                        fetch(
                          `/api/farms/${farmId}/animal-categories/${viewingAnimals?.id}/assignments`,
                          {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ animal_id: animalId, assignment_method: 'manual' })
                          }
                        )
                      )

                      const removePromises = Array.from(selectedForRemove).map(animalId =>
                        fetch(
                          `/api/farms/${farmId}/animal-categories/${viewingAnimals?.id}/assignments`,
                          {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ animal_id: animalId })
                          }
                        )
                      )

                      await Promise.all([...addPromises, ...removePromises])

                      // Refresh assignment data in modal
                      if (viewingAnimals) {
                        await handleViewAnimals(viewingAnimals)
                      }
                      setSelectedForAdd(new Set())
                      setSelectedForRemove(new Set())
                      setManualModeSearch('')
                      setSelectedAnimalForPreview(null)

                      // Refresh overall categories list to show updated animal counts
                      try {
                        const categoriesResponse = await fetch(`/api/farms/${farmId}/feed-management/animal-categories`)
                        if (categoriesResponse.ok) {
                          const result = await categoriesResponse.json()
                          if (result.data) {
                            onCategoriesUpdate(result.data)
                          }
                        }
                      } catch (error) {
                        console.error('Error refreshing categories:', error)
                      }
                    } catch (error) {
                      console.error('Error updating assignments:', error)
                      alert('Error updating assignments')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading || (selectedForAdd.size === 0 && selectedForRemove.size === 0)}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" />
                    </>
                  ) : (
                    `Apply Changes (${selectedForAdd.size + selectedForRemove.size})`
                  )}
                </Button>
              </div>
            </>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setViewingAnimals(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Animal Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}