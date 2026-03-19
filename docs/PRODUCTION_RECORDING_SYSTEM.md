# Production Recording System - Architecture Guide

## Overview

The new production recording system is built with a **modal-based interface** featuring two recording modes: **Individual** and **Group**. It focuses on Kenyan dairy farming workflows with enhanced health tracking and historical context.

## Component Structure

```
RecordProductionModal (Main Container)
├── Header (Date, Session, Tab Switcher)
├── Content Area (min-h-400px)
│   ├── Individual Tab
│   │   └── IndividualRecordForm (Two-step flow)
│   │       ├── Step 1: Animal Selection (search & select)
│   │       └── Step 2: Recording Form (with context)
│   │           ├── ProductionHistoricalContext
│   │           ├── ProductionHealthSection
│   │           └── Quality Parameters (conditional)
│   └── Group Tab
│       └── GroupRecordForm (Progress tracking)
│           ├── Group Selector
│           ├── Progress Bar
│           └── Embedded IndividualRecordForm
└── Close Button
```

## Components

### 1. **RecordProductionModal**
Main wrapper component that manages:
- Modal container with `max-w-4xl` layout
- Header bar with context info (date, session selector)
- Tab switching (Individual / Group)
- Modal open/close state

**Props:**
```typescript
interface RecordProductionModalProps {
  isOpen: boolean
  onClose: () => void
  farmId: string
  animals: Array<{ id: string; tag_number: string; name?: string; gender: string; production_status: string }>
  settings: ProductionSettings | null
  onSuccess?: () => void
}
```

### 2. **IndividualRecordForm**
Two-step flow for individual animal recording:

**Step 1 - Animal Selection:**
- Search input (by tag number or name)
- Animal list with avatar, status badge
- Filters to lactating females only

**Step 2 - Recording Form:**
- Large milk quantity input (prominent display)
- Animal header with "Change Animal" button
- Historical context panel (3 columns)
- Health & safety section
- Quality parameters (if enabled)
- Notes/observations textarea

**Props:**
```typescript
interface IndividualRecordFormProps {
  farmId: string
  animals: Array<{ id: string; tag_number: string; name?: string; gender: string; production_status: string }>
  session: 'morning' | 'afternoon' | 'evening'
  recordDate: string
  settings: ProductionSettings | null
  onSuccess?: () => void
}
```

### 3. **GroupRecordForm**
Batch recording for animal categories/milking groups:

**Features:**
- Group selector with progress tracking
- Shows X of Y animals recorded
- Reuses IndividualRecordForm for each animal
- Automatically progresses to next pending animal
- Success state when all recorded

**Props:**
```typescript
interface GroupRecordFormProps {
  farmId: string
  animals: Array<{ id: string; tag_number: string; name?: string; gender: string; production_status: string }>
  session: 'morning' | 'afternoon' | 'evening'
  recordDate: string
  settings: ProductionSettings | null
  onSuccess?: () => void
}
```

### 4. **ProductionHistoricalContext**
Displays historical production data for comparison:

**Displays (3-column grid):**
1. **Yesterday's Total** - All sessions combined
2. **Previous Session** - Earlier today's milking
3. **Same Time Yesterday** - Same session previous day

**Props:**
```typescript
interface ProductionHistoricalContextProps {
  farmId: string
  animalId: string
  currentDate: string
  currentSession: 'morning' | 'afternoon' | 'evening'
}
```

**API Expectation:**
```
GET /api/production/history?farmId={farmId}&animalId={animalId}&date={date}&session={session}

Response:
{
  "yesterdayTotal": 45.2 | null,
  "previousSessionVolume": 15.5 | null,
  "sameTimeYesterdayVolume": 14.8 | null
}
```

### 5. **ProductionHealthSection**
Enhanced health & safety tracking with mastitis detection:

**Left Column:**
- Temperature input with warning indicators
- Low temp (<38°C) warning
- High temp (>39.5°C) warning
- Mastitis test toggle
- Test result selector (Negative/Mild/Severe)

**Right Column:**
- Affected quarters selector (FL, FR, RL, RR)
- Shows only if mastitis test is positive
- Warning if severe (suggests marking as unsafe)

**Props:**
```typescript
interface ProductionHealthSectionProps {
  form: UseFormReturn<ProductionFormData>
  settings: ProductionSettings | null
}
```

### 6. **ProductionRecordingPage**
Entry point component providing the "Record Production" button:

**Usage:**
```tsx
<ProductionRecordingPage 
  farmId={farmId}
  animals={animals}
  settings={productionSettings}
  onRecordsUpdated={() => refetchRecords()}
/>
```

## Data Flow

### Individual Recording Flow
```
1. User clicks "Record Production"
2. Modal opens, Individual tab selected
3. User searches for animal
4. User selects animal
5. Form displays with:
   - Historical context loads in background
   - Large quantity input ready
   - Health section visible
   - Quality fields shown based on settings
6. User enters data and submits
7. POST /api/production with data
8. Success → form resets, ready for next animal
```

### Group Recording Flow
```
1. User clicks Group tab
2. User selects a milking group/category
3. Progress bar shows X of Y recorded
4. IndividualRecordForm shown for first pending animal
5. After recording each animal:
   - Animal marked as recorded
   - Progress updates
   - Form shows next pending animal
6. When all recorded:
   - Success state shown
   - Option to record another group
```

## Form Data Structure

```typescript
type ProductionFormData = {
  // Basic
  animal_id: string
  record_date: string                              // YYYY-MM-DD
  milking_session: 'morning' | 'afternoon' | 'evening'
  
  // Milk
  milk_volume: number                              // Positive number
  milk_safety_status: 'safe' | 'unsafe_health' | 'unsafe_colostrum'
  
  // Health & Safety
  temperature?: number | null                      // °C
  mastitis_test_performed?: boolean
  mastitis_result?: 'negative' | 'mild' | 'severe' | null
  affected_quarters?: string[] | null              // ['FL', 'FR', 'RL', 'RR']
  
  // Quality (conditional on settings)
  fat_content?: number | null                      // % (0-15)
  protein_content?: number | null                  // % (0-10)
  somatic_cell_count?: number | null               // cells/ml
  lactose_content?: number | null                  // % (0-10)
  ph_level?: number | null                         // pH (0-14)
  
  // Notes
  notes?: string | null
}
```

## API Endpoints Required

### 1. Production Recording
```
POST /api/production
Body: ProductionFormData & { farm_id: string }
Response: { success: true; recordId: string }
```

### 2. Historical Data
```
GET /api/production/history?farmId={farmId}&animalId={animalId}&date={date}&session={session}
Response: {
  yesterdayTotal?: number | null
  previousSessionVolume?: number | null
  sameTimeYesterdayVolume?: number | null
}
```

### 3. Animal Categories (for GroupRecordForm)
```
GET /api/farms/{farmId}/animal-categories
Response: Array<{
  id: string
  name: string
  description: string
  animals: Array<{ id: string; tag_number: string; ... }>
  // ... other fields
}>
```

## Styling & Design

### Colors
- Primary action: `green-600` / `green-500`
- Backgrounds: `stone-50` / `stone-200`
- Borders: `stone-200` / `stone-300`
- Text: `stone-900` / `stone-600`

### Responsive
- Modal: `max-w-4xl`
- Grid layouts: `grid-cols-2` for larger screens
- Mobile considerations: Columns stack on small screens

### Icons
Using Lucide React:
- `Plus` - Add button
- `Search` - Search input
- `Calendar` - Date
- `Clock` - Session time
- `Thermometer` - Temperature
- `AlertTriangle` - Warnings
- `TrendingUp` / `TrendingDown` - Historical trends
- `CheckCircle2` - Success state
- `ChevronLeft` - Back button

## Integration Example

### In a Page Component

```tsx
import { ProductionRecordingPage } from '@/components/production/ProductionRecordingPage'
import { getProductionSettings } from '@/lib/database/productionSettings'
import { getAnimals } from '@/lib/database/animals'

export default async function ProductionPage({ params }: { params: { farmId: string } }) {
  const settings = await getProductionSettings(params.farmId)
  const animals = await getAnimals(params.farmId)

  return (
    <div className="space-y-6">
      <h1>Milk Production Recording</h1>
      <ProductionRecordingPage
        farmId={params.farmId}
        animals={animals}
        settings={settings}
        onRecordsUpdated={() => {
          // Trigger refresh of production records table
          // Could use router.refresh() or a callback
        }}
      />
    </div>
  )
}
```

## State Management

- **Modal state**: Open/closed (managed by parent)
- **Tab state**: Individual/Group (RecordProductionModal)
- **Session state**: Selected milking session (RecordProductionModal)
- **Animal selection**: Current selected animal (IndividualRecordForm)
- **Form state**: React Hook Form (IndividualRecordForm)
- **Progress tracking**: Set of recorded animal IDs (GroupRecordForm)
- **Historical data**: Fetched on animal selection (ProductionHistoricalContext)

## Validation

### Client-side (Zod schema)
- `milk_volume`: Required, positive, <100
- `animal_id`: Required
- `record_date`: Required, valid date
- `milking_session`: Required, one of ['morning', 'afternoon', 'evening']
- Quality fields: Required if `settings.productionTrackingMode === 'quality_focused'`
- Temperature: Warning if <38°C or >39.5°C

### Server-side
- Validate farm ownership
- Validate animal belongs to farm
- Validate production settings exist
- Prevent duplicate records (same animal, date, session)

## Future Enhancements

1. **Bulk Import**: CSV upload for multiple animals
2. **Offline Support**: Cache records for offline submission
3. **Mobile Optimized**: Single-column form on mobile
4. **Camera Integration**: Photo of animal for verification
5. **Milking Machine Integration**: Auto-populate volume from connected equipment
6. **Notifications**: Alert if mastitis detected
7. **Historical Charts**: Show trends over time
8. **Batch Delete**: Undo last N records if needed

## Troubleshooting

### Historical context not loading?
- Check `/api/production/history` endpoint exists
- Verify database has production records table
- Check date/session parameters are formatted correctly

### Group tab shows no groups?
- Verify animal categories endpoint returns data
- Check animals are categorized properly in database
- Ensure `farm_milking_groups` table is populated

### Form not validating?
- Check Zod schema matches production settings
- Verify `settings.productionTrackingMode` is set
- Check required fields are marked in UI
