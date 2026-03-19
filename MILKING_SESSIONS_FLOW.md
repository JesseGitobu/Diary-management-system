# Milking Sessions Data Flow - Complete Documentation

## Overview
The Milking Sessions feature allows users to configure which milking sessions are available for a farm, set the times for each session, and control how production data is recorded per session.

---

## Data Flow Diagram

```
USER INTERFACE (UI)
    ↓
[ProductionDistributionSettings.tsx]
    ↓
[ProductionSettingsTab.tsx] (activeTab='production')
    ↓
[GeneralSessionsSection.tsx] (activeSection='general')
    ↓
STATE: milkingSessions in GeneralSessionsSection
    ↓
updateSetting('milkingSessions', updatedSessions)
    ↓
ProductionSettingsTab.setState(milkingSessions)
    ↓
handleSave() → saveSettings()
    ↓
API POST /api/settings/production
    ↓
[route.ts] → updateProductionSettings()
    ↓
DATABASE: farm_production_settings table
    ↓
Data retrieval when needed
```

---

## Files Involved

### 1. **UI Layer** - Components
#### [src/components/settings/production-distribution/ProductionDistributionSettings.tsx](src/components/settings/production-distribution/ProductionDistributionSettings.tsx)
- **Role**: Main container for settings tabs
- **Key Props**: `productionSettings` (initial data passed from parent)
- **Action**: Renders `ProductionSettingsTab` in a Suspense boundary
- **Data Flow**: Passes `productionSettings` → `initialSettings` to ProductionSettingsTab

#### [src/components/settings/production-distribution/ProductionSettingsTab.tsx](src/components/settings/production-distribution/ProductionSettingsTab.tsx)
- **Role**: Main settings tab manager
- **State**: 
  - `settings` - Full ProductionSettings object (initialized from `initialSettings`)
  - `activeSection` - Which section to display (default: 'general')
- **Flow**:
  1. Initialize settings from `initialSettings` prop
  2. When `activeSection === 'general'`, render `GeneralSessionsSection`
  3. Pass `settings` and `updateSetting` callback to child
- **Save Process**:
  ```typescript
  const handleSave = async () => {
    await saveSettings(
      '/api/settings/production',  // endpoint
      farmId,                       // farm ID
      settings,                     // Full settings object incl. milkingSessions
      () => { onUnsavedChanges(false) }
    )
  }
  ```

#### [src/components/settings/production-distribution/sections/GeneralSessionsSection.tsx](src/components/settings/production-distribution/sections/GeneralSessionsSection.tsx)
- **Role**: UI for configuring milking sessions
- **State**: `sessions` array
  ```typescript
  interface Session {
    id: string
    name: string      // e.g., "Morning"
    time: string      // e.g., "06:00"
  }
  ```
- **Initial Data**: `settings.milkingSessions` (from props)
- **Key Functions**:
  - `addSession()` - Creates new session, updates parent via `updateSetting('milkingSessions', ...)`
  - `removeSession(id)` - Removes session, updates parent
  - `updateSession(id, field, value)` - Updates specific field (name or time)
  - Each update triggers: `updateSetting('milkingSessions', updatedSessions)`
- **UI Elements**:
  - Session name input (text)
  - Session time input (type="time")
  - Delete button per session
  - "Add Session" button

---

### 2. **Handler Layer** - Save Logic
#### [src/lib/utils/settings-handlers.ts](src/lib/utils/settings-handlers.ts)
- **Function**: `saveSettings(endpoint, farmId, settings, onSuccess)`
- **Args**:
  - `endpoint`: '/api/settings/production'
  - `farmId`: Farm UUID
  - `settings`: Full ProductionSettings object (including milkingSessions)
  - `onSuccess`: Callback function
- **Process**:
  ```typescript
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ farmId, settings })  // ← milkingSessions here
  })
  ```
- **Success**: Toast notification + callback
- **Error**: Toast error message

---

### 3. **API Layer** - Route Handler
#### [src/app/api/settings/production/route.ts](src/app/api/settings/production/route.ts)
- **Endpoints**: GET, PUT, POST
- **POST Method** (used by saveSettings):
  ```typescript
  export async function POST(request: NextRequest) {
    const body = await request.json()
    const { farmId, settings } = body
    
    // Verify permissions check
    // ...
    
    // Call database function
    const result = await updateProductionSettings(farmId, settings)
    
    return NextResponse.json({ success: true })
  }
  ```
- **Flow**:
  1. Extract `farmId` and `settings` from request body
  2. Authenticate user and verify permissions (farm_owner or farm_manager)
  3. Call `updateProductionSettings()` from database layer
  4. Return success/error response

---

### 4. **Database Layer** - TypeScript abstraction
#### [src/lib/database/production-settings.ts](src/lib/database/production-settings.ts)

##### **Function: `updateProductionSettings(farmId, settings)`**
- **Purpose**: Transform TypeScript object to database schema and upsert
- **Transformation** - From camelCase to snake_case:
  ```typescript
  const dbSettings = {
    // ... other fields ...
    milking_sessions: settings.milkingSessions || [],  // ← Stores sessions array
    // ... other fields ...
  }
  ```
- **Database Operation**:
  ```typescript
  const { error } = await supabase
    .from('farm_production_settings')
    .upsert(dbSettings, { onConflict: 'farm_id' })
  ```
- **Column**: `milking_sessions` (JSONB type)

##### **Function: `getProductionSettings(farmId)`**
- **Purpose**: Fetch and transform database data to TypeScript object
- **Query**:
  ```typescript
  const { data } = await supabase
    .from('farm_production_settings')
    .select('*')
    .eq('farm_id', farmId)
    .single()
  ```
- **Transformation** - From snake_case to camelCase:
  ```typescript
  function transformDbToProductionSettings(data: any): ProductionSettings {
    return {
      // ... other fields ...
      milkingSessions: data.milking_sessions || [],  // ← Reads from database
      // ... other fields ...
    }
  }
  ```

---

### 5. **Type Definitions**
#### [src/types/production-distribution-settings.ts](src/types/production-distribution-settings.ts)

##### **ProductionSettings Interface**:
```typescript
export interface ProductionSettings {
  // ... other properties ...
  
  // 2. Milking Session Configuration
  enabledSessions: ('morning' | 'afternoon' | 'evening')[]
  defaultSession: 'morning' | 'afternoon' | 'evening'
  sessionTimes: {
    morning: string      // e.g., "06:00"
    afternoon: string    // e.g., "14:00"
    evening: string      // e.g., "18:00"
  }
  allowMultipleSessionsPerDay: boolean
  requireSessionTimeRecording: boolean
  sessionIntervalHours: number
  
  // Production Sessions & Costs
  milkingSessions?: Array<{
    id: string
    name: string
    time: string
  }>
  
  // ... other properties ...
}
```

##### **Default Values**:
```typescript
export const getDefaultProductionSettings = (): ProductionSettings => ({
  // ... other defaults ...
  
  enabledSessions: ['morning', 'afternoon', 'evening'],
  defaultSession: 'morning',
  sessionTimes: {
    morning: '06:00',
    afternoon: '14:00',
    evening: '18:00'
  },
  allowMultipleSessionsPerDay: true,
  requireSessionTimeRecording: false,
  sessionIntervalHours: 8,
  
  milkingSessions: [
    { id: '1', name: 'Morning', time: '06:00' },
    { id: '2', name: 'Afternoon', time: '14:00' },
    { id: '3', name: 'Evening', time: '18:00' }
  ],
  
  // ... other defaults ...
})
```

---

### 6. **Database Schema**
#### PostgreSQL: `farm_production_settings` Table

```sql
CREATE TABLE farm_production_settings (
  -- Milking Session Fields
  enabled_sessions TEXT[] DEFAULT ARRAY['morning', 'afternoon', 'evening'],
  default_session VARCHAR(50) DEFAULT 'morning',
  session_times JSONB DEFAULT '{"morning": "06:00", "afternoon": "14:00", "evening": "18:00"}',
  allow_multiple_sessions_per_day BOOLEAN DEFAULT true,
  require_session_time_recording BOOLEAN DEFAULT false,
  session_interval_hours INTEGER DEFAULT 8,
  enable_smart_session_banner BOOLEAN DEFAULT false,
  session_late_threshold_minutes INTEGER DEFAULT 30,
  
  -- Production Sessions Array (NEW)
  milking_sessions JSONB DEFAULT '[]',
  
  -- ... other columns ...
);
```

**Column Types**:
- `enabled_sessions`: TEXT[] - Array of enabled session names
- `default_session`: VARCHAR(50) - Default selected session
- `session_times`: JSONB - Object mapping sessions to times
- `milking_sessions`: JSONB - Array of session objects with id, name, time

---

## Complete Data Flow Example

### User Action: Configure Milking Sessions
1. **User opens** ProductionDistributionSettings
2. **User clicks** on "Production Settings" tab
3. **User clicks** on "General & Sessions" section
4. **Section displays** GeneralSessionsSection with 3 default sessions
5. **User edits** session time for "Morning" from "06:00" to "05:30"
6. **updateSession()** is called in GeneralSessionsSection
7. **updateSetting('milkingSessions', [...])** propagates up to ProductionSettingsTab
8. **ProductionSettingsTab state** updates: `settings.milkingSessions = [...]`
9. **UI marks** as "unsaved changes"
10. **User clicks** "Save Settings" button
11. **handleSave()** calls `saveSettings()`
12. **POST request** sent to `/api/settings/production`:
    ```json
    {
      "farmId": "uuid-...",
      "settings": {
        "enabledSessions": ["morning", "afternoon", "evening"],
        "defaultSession": "morning",
        "sessionTimes": {
          "morning": "05:30",
          "afternoon": "14:00",
          "evening": "18:00"
        },
        "milkingSessions": [
          { "id": "1", "name": "Morning", "time": "05:30" },
          { "id": "2", "name": "Afternoon", "time": "14:00" },
          { "id": "3", "name": "Evening", "time": "18:00" }
        ],
        // ... other settings ...
      }
    }
    ```
13. **API Handler** (/api/settings/production/route.ts):
    - Authenticates user
    - Verifies farm_owner or farm_manager role
    - Calls `updateProductionSettings(farmId, settings)`
14. **Database Function** (production-settings.ts):
    - Maps camelCase to snake_case
    - Updates `farm_production_settings` table row
    ```sql
    UPDATE farm_production_settings
    SET milking_sessions = '[{"id":"1","name":"Morning","time":"05:30"},...]',
        session_times = '{"morning":"05:30","afternoon":"14:00","evening":"18:00"}',
        updated_at = NOW()
    WHERE farm_id = 'uuid-...'
    ```
15. **Success response** returned to client
16. **Toast notification** shows: "Settings saved successfully"
17. **RecordProductionModal** next time it opens will read `sessionTimes.morning = "05:30"`

---

## Key Relationships

### Between session_times and milking_sessions
- **session_times**: JSONB object mapping session name → time string
  - Used for: Displaying times in UI, date picker constraints
  - Example: `{"morning": "05:30", "afternoon": "14:00", "evening": "18:00"}`

- **milking_sessions**: JSONB array of {id, name, time} objects
  - Used for: Full session management with custom IDs and names
  - Example: `[{"id": "1", "name": "Morning", "time": "05:30"}, ...]`

### How RecordProductionModal uses these values
```typescript
// In RecordProductionModal.tsx
const enabledSessions = useMemo(() => {
  if (!settings?.sessionTimes) return ['morning', 'afternoon', 'evening']
  
  const sessions: MilkingSession[] = []
  if (settings.sessionTimes.morning) sessions.push('morning')
  if (settings.sessionTimes.afternoon) sessions.push('afternoon')
  if (settings.sessionTimes.evening) sessions.push('evening')
  
  return sessions.length > 0 ? sessions : ['morning']
}, [settings?.sessionTimes])

const sessionLabels: Record<MilkingSession, string> = useMemo(() => {
  const sessionTimes = (settings?.sessionTimes || {}) as Record<string, string>
  return {
    morning: sessionTimes['morning'] ? `Morning (${sessionTimes['morning']})` : 'Morning (5:00 AM)',
    afternoon: sessionTimes['afternoon'] ? `Afternoon (${sessionTimes['afternoon']})` : 'Afternoon (2:30 PM)',
    evening: sessionTimes['evening'] ? `Evening (${sessionTimes['evening']})` : 'Evening (6:00 PM)'
  }
}, [settings?.sessionTimes])
```

---

## Summary

| Layer | File | Purpose | Key Component |
|-------|------|---------|---|
| **UI** | ProductionDistributionSettings.tsx | Container component | Passes productionSettings to ProductionSettingsTab |
| **UI** | ProductionSettingsTab.tsx | Settings manager | Manages state, handles save |
| **UI** | GeneralSessionsSection.tsx | Session editor | Edit individual sessions |
| **Handler** | settings-handlers.ts | Network communication | Sends to API |
| **API** | /api/settings/production/route.ts | Route handler | Authorization & delegation |
| **Database** | production-settings.ts | ORM abstraction | Transforms & persists data |
| **Types** | production-distribution-settings.ts | Type definitions | Interface & defaults |
| **DB** | PostgreSQL farm_production_settings | Data storage | Stores milking_sessions JSONB |

