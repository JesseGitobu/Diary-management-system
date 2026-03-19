# Milking Sessions Complete Data Flow - All Files Involved

## Overview
The Milking Sessions feature follows a 3-layer architecture: **UI** → **API** → **Database**

**Total Files Involved: 8 files**

---

## Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ USER ACTION: Edit Sessions in Production Settings              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE #1: GeneralSessionsSection.tsx                            │
│ └─ Local state: sessions[] array                               │
│ └─ User edits session name or time                             │
│ └─ Calls: updateSetting('milkingSessions', sessions)           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE #2: ProductionSettingsTab.tsx                             │
│ └─ Receives updateSetting('milkingSessions', [...])            │
│ └─ **AUTO-SYNC LOGIC**: Generates sessionTimes from names      │
│ └─ Updates state.settings with both:                           │
│    - milkingSessions (full array with id, name, time)          │
│    - sessionTimes (object mapping: morning→"05:30")            │
│ └─ Calls: handleSave()                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE #3: settings-handlers.ts (lib/utils)                      │
│ └─ Function: saveSettings(endpoint, farmId, settings, callback)│
│ └─ HTTP POST request to '/api/settings/production'             │
│ └─ Body: { farmId, settings }                                  │
│    Where settings includes:                                    │
│    - milkingSessions: [{id, name, time}, ...]                  │
│    - sessionTimes: {morning: "05:30", ...}                     │
│    - enabledSessions: ['morning', 'afternoon']                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    [NETWORK REQUEST]
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE #4: /api/settings/production/route.ts                     │
│ └─ Endpoint: POST /api/settings/production                     │
│ └─ Extracts: { farmId, settings }                              │
│ └─ Auth check: Verify user is farm_owner or farm_manager       │
│ └─ Calls: updateProductionSettings(farmId, settings)           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE #5: lib/database/production-settings.ts                   │
│ └─ Function: updateProductionSettings(farmId, settings)        │
│ └─ Transforms camelCase → snake_case:                          │
│    - milkingSessions → milking_sessions                        │
│    - sessionTimes → session_times                              │
│    - enabledSessions → enabled_sessions                        │
│ └─ Creates dbSettings object with all mappings                 │
│ └─ Calls: supabase.upsert() on farm_production_settings        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE #6: PostgreSQL Database                                   │
│ └─ Table: farm_production_settings                             │
│ └─ Columns Updated:                                            │
│    - milking_sessions (JSONB)                                  │
│    - session_times (JSONB)                                     │
│    - enabled_sessions (TEXT[])                                 │
│    - default_session (VARCHAR)                                 │
└─────────────────────────────────────────────────────────────────┘

[USER NAVIGATES AWAY AND RETURNS]

┌─────────────────────────────────────────────────────────────────┐
│ DATA RETRIEVAL PATH                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE #5: lib/database/production-settings.ts                   │
│ └─ Function: getProductionSettings(farmId)                     │
│ └─ Query: SELECT * FROM farm_production_settings               │
│ └─ Calls: transformDbToProductionSettings(data)                │
│ └─ Transforms snake_case → camelCase:                          │
│    - milking_sessions → milkingSessions                        │
│    - session_times → sessionTimes                              │
│    - enabled_sessions → enabledSessions                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE #2: ProductionSettingsTab.tsx                             │
│ └─ initialSettings prop receives transformed data              │
│ └─ Passes to GeneralSessionsSection as settings.milkingSessions│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FILE #1: GeneralSessionsSection.tsx                            │
│ └─ Displays sessions from settings.milkingSessions ✅           │
│ └─ Shows saved session names and times                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## File-by-File Breakdown

### **FILE #1: GeneralSessionsSection.tsx**
**Location:** `src/components/settings/production-distribution/sections/`

**Purpose:** UI for editing milking sessions

**What it does:**
```typescript
// Local component state
const [sessions, setSessions] = useState<Session[]>(
  settings.milkingSessions || [default sessions]
)

// When user edits
const updateSession = (id: string, field: 'name' | 'time', value: string) => {
  const updatedSessions = sessions.map(s =>
    s.id === id ? { ...s, [field]: value } : s
  )
  setSessions(updatedSessions)
  updateSetting('milkingSessions', updatedSessions)  // ← Push up to parent
}
```

**Data Structure:**
```typescript
interface Session {
  id: string           // unique ID (timestamp-based)
  name: string         // e.g., "Morning"
  time: string         // e.g., "05:30" (24-hour format)
}
```

**Output to parent:**
```javascript
['milkingSessions', [{id: "1", name: "Morning", time: "05:30"}, ...]]
```

---

### **FILE #2: ProductionSettingsTab.tsx** ⭐ KEY FILE
**Location:** `src/components/settings/production-distribution/`

**Purpose:** Central state manager - handles all settings including AUTO-SYNC

**Key Function: `updateSetting()`**
```typescript
const updateSetting = (key: string, value: any) => {
  setSettings((prev: any) => {
    const updated = { ...prev, [key]: value }
    
    // ⭐ AUTO-SYNC: When milkingSessions changes
    if (key === 'milkingSessions' && Array.isArray(value)) {
      const sessionTimes: Record<string, string> = {}
      value.forEach((session: any) => {
        // "Morning" → "morning"
        const sessionKey = session.name?.toLowerCase().replace(/\s+/g, '') || ''
        if (sessionKey && session.time) {
          sessionTimes[sessionKey] = session.time  // e.g., morning: "05:30"
        }
      })
      // Update both fields
      updated.sessionTimes = sessionTimes
    }
    
    return updated
  })
}
```

**So when user edits sessions:**
- ✅ `milkingSessions` updates (full session objects)
- ✅ `sessionTimes` auto-updates (derived from names and times)
- ✅ `enabledSessions` reflects which sessions are checked

**Save Flow:**
```typescript
const handleSave = async () => {
  await saveSettings('/api/settings/production', farmId, settings, callback)
  // settings contains: milkingSessions, sessionTimes, enabledSessions, etc.
}
```

---

### **FILE #3: settings-handlers.ts**
**Location:** `src/lib/utils/`

**Purpose:** HTTP client - sends data to API

**Function:**
```typescript
export async function saveSettings(
  endpoint: string,           // '/api/settings/production'
  farmId: string,
  settings: any,              // Full ProductionSettings object
  onSuccess: () => void
): Promise<void> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      farmId,
      settings  // ← Contains milkingSessions, sessionTimes, enabledSessions
    })
  })
  
  if (!response.ok) throw new Error(...)
  
  toast.success('Settings saved successfully')
  onSuccess()
}
```

**Data sent to API:**
```json
{
  "farmId": "uuid-123...",
  "settings": {
    "milkingSessions": [
      { "id": "1", "name": "Morning", "time": "05:30" },
      { "id": "2", "name": "Afternoon", "time": "14:30" }
    ],
    "sessionTimes": {
      "morning": "05:30",
      "afternoon": "14:30"
    },
    "enabledSessions": ["morning", "afternoon"],
    "defaultSession": "morning",
    ...other settings...
  }
}
```

---

### **FILE #4: /api/settings/production/route.ts**
**Location:** `src/app/api/settings/production/`

**Purpose:** API endpoint - validates & delegates to database layer

**POST Handler:**
```typescript
export async function POST(request: NextRequest) {
  // 1. Extract
  const body = await request.json()
  const { farmId, settings } = body
  
  // 2. Authenticate
  const { user } = await supabase.auth.getUser()
  if (!user) return 401 Unauthorized
  
  // 3. Verify permissions
  const userRole = await supabase
    .from('user_roles')
    .select('role_type')
    .eq('user_id', user.id)
    .eq('farm_id', farmId)
  
  if (!['farm_owner', 'farm_manager'].includes(userRole.role_type)) {
    return 403 Forbidden
  }
  
  // 4. Delegate to database layer
  const result = await updateProductionSettings(farmId, settings)
  
  return NextResponse.json({ success: true })
}
```

**Responsibility:** Auth & validation only (not transformation)

---

### **FILE #5: lib/database/production-settings.ts** ⭐ KEY FILE
**Location:** `src/lib/database/`

**Purpose:** Database layer - transforms data and executes queries

**Part A: SAVE - `updateProductionSettings()`**
```typescript
export async function updateProductionSettings(
  farmId: string,
  settings: ProductionSettings  // camelCase
): Promise<{ success: boolean }> {
  const supabase = createAdminClient()
  
  // Transform camelCase → snake_case
  const dbSettings = {
    farm_id: farmId,
    
    // ← These are the 3 session-related columns
    milking_sessions: settings.milkingSessions || [],        // JSONB array
    session_times: settings.sessionTimes,                    // JSONB object
    enabled_sessions: settings.enabledSessions,              // TEXT[]
    default_session: settings.defaultSession,                // VARCHAR
    
    // ... all other columns ...
    
    updated_at: new Date().toISOString()
  }
  
  // Upsert (insert or update)
  const { error } = await supabase
    .from('farm_production_settings')
    .upsert(dbSettings, { onConflict: 'farm_id' })
  
  if (error) throw error
  return { success: true }
}
```

**Part B: RETRIEVE - `getProductionSettings()`**
```typescript
export async function getProductionSettings(farmId: string): Promise<ProductionSettings> {
  const supabase = await createServerSupabaseClient()
  
  const { data } = await supabase
    .from('farm_production_settings')
    .select('*')
    .eq('farm_id', farmId)
    .single()
  
  return transformDbToProductionSettings(data)
}

// Transform snake_case → camelCase
function transformDbToProductionSettings(data: any): ProductionSettings {
  return {
    milkingSessions: data.milking_sessions || [],          // ← From JSONB
    sessionTimes: data.session_times,                       // ← From JSONB
    enabledSessions: data.enabled_sessions,                 // ← From TEXT[]
    defaultSession: data.default_session,                   // ← From VARCHAR
    
    // ... all other fields ...
  }
}
```

**Transformation Summary:**
| Direction | From | To |
|-----------|------|-----|
| **SAVE** | `milkingSessions` | `milking_sessions` |
| **SAVE** | `sessionTimes` | `session_times` |
| **SAVE** | `enabledSessions` | `enabled_sessions` |
| **RETRIEVE** | `milking_sessions` | `milkingSessions` |
| **RETRIEVE** | `session_times` | `sessionTimes` |
| **RETRIEVE** | `enabled_sessions` | `enabledSessions` |

---

### **FILE #6: farm_production_settings Table (PostgreSQL)**
**Location:** Database

**Schema Columns for Sessions:**
```sql
CREATE TABLE farm_production_settings (
  id UUID PRIMARY KEY,
  farm_id UUID UNIQUE NOT NULL,
  
  -- Session Configuration
  milking_sessions JSONB DEFAULT '[]',  -- Array of {id, name, time}
  session_times JSONB DEFAULT '{"morning":"06:00","afternoon":"14:00","evening":"18:00"}',
  enabled_sessions TEXT[] DEFAULT ARRAY['morning', 'afternoon', 'evening'],
  default_session VARCHAR(50) DEFAULT 'morning',
  
  -- Other columns...
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(farm_id)
);
```

**Data Stored:**
```sql
INSERT INTO farm_production_settings (
  farm_id,
  milking_sessions,
  session_times,
  enabled_sessions,
  default_session
) VALUES (
  'farm-uuid-123',
  '[{"id":"1","name":"Morning","time":"05:30"},{"id":"2","name":"Afternoon","time":"14:30"}]'::jsonb,
  '{"morning":"05:30","afternoon":"14:30"}'::jsonb,
  ARRAY['morning', 'afternoon']::text[],
  'morning'
);
```

---

### **FILE #7: production-distribution-settings.ts (TypeScript Types)**
**Location:** `src/types/`

**ProductionSettings Interface:**
```typescript
export interface ProductionSettings {
  // Sessions
  enabledSessions: ('morning' | 'afternoon' | 'evening')[]
  defaultSession: 'morning' | 'afternoon' | 'evening'
  sessionTimes: {
    morning: string
    afternoon: string
    evening: string
  }
  allowMultipleSessionsPerDay: boolean
  requireSessionTimeRecording: boolean
  sessionIntervalHours: number
  
  // Milking Sessions Array
  milkingSessions?: Array<{
    id: string
    name: string
    time: string
  }>
  
  // ... other 50+ fields ...
}
```

**Default Values:**
```typescript
export const getDefaultProductionSettings = (): ProductionSettings => ({
  enabledSessions: ['morning', 'afternoon', 'evening'],
  defaultSession: 'morning',
  sessionTimes: {
    morning: '06:00',
    afternoon: '14:00',
    evening: '18:00'
  },
  milkingSessions: [
    { id: '1', name: 'Morning', time: '06:00' },
    { id: '2', name: 'Afternoon', time: '14:00' },
    { id: '3', name: 'Evening', time: '18:00' }
  ],
  // ... other defaults ...
})
```

---

### **FILE #8: RecordProductionModal.tsx (Consumption)**
**Location:** `src/components/production/`

**Reads session data:**
```typescript
// Gets enabledSessions from database
const enabledSessions = useMemo(() => {
  if (settings?.enabledSessions && settings.enabledSessions.length > 0) {
    return settings.enabledSessions as MilkingSession[]  // ← From database ✅
  }
  // fallback...
}, [settings?.enabledSessions])

// Gets session times from database
const sessionLabels: Record<MilkingSession, string> = useMemo(() => {
  const sessionTimes = (settings?.sessionTimes || {}) as Record<string, string>
  return {
    morning: sessionTimes['morning'] ? `Morning (${sessionTimes['morning']})` : 'Morning (5:00 AM)',
    afternoon: sessionTimes['afternoon'] ? `Afternoon (${sessionTimes['afternoon']})` : 'Afternoon (2:30 PM)',
    evening: sessionTimes['evening'] ? `Evening (${sessionTimes['evening']})` : 'Evening (6:00 PM)'
  }
}, [settings?.sessionTimes])

// Renders selector
<select value={selectedSession}>
  {enabledSessions.map(session => (
    <option value={session}>
      {sessionLabels[session]}
    </option>
  ))}
</select>
```

---

## Data Structure Summary

### **Milking Sessions Data (3 representations)**

**1. UI Level (GeneralSessionsSection)**
```javascript
sessions: [
  { id: '1', name: 'Morning', time: '05:30' },
  { id: '2', name: 'Afternoon', time: '14:30' }
]
```

**2. Settings State Level (ProductionSettingsTab)**
```javascript
settings: {
  milkingSessions: [
    { id: '1', name: 'Morning', time: '05:30' },
    { id: '2', name: 'Afternoon', time: '14:30' }
  ],
  sessionTimes: {
    morning: '05:30',
    afternoon: '14:30'
  },
  enabledSessions: ['morning', 'afternoon'],
  defaultSession: 'morning'
}
```

**3. Database Level (PostgreSQL)**
```sql
milking_sessions: '[{"id":"1","name":"Morning","time":"05:30"}...]'::jsonb
session_times: '{"morning":"05:30","afternoon":"14:30"}'::jsonb
enabled_sessions: ['morning', 'afternoon']
default_session: 'morning'
```

---

## File Count Summary

| # | File | Layer | Purpose |
|---|------|-------|---------|
| 1 | GeneralSessionsSection.tsx | UI | Edit sessions |
| 2 | ProductionSettingsTab.tsx | State | Manage all settings + auto-sync |
| 3 | settings-handlers.ts | Network | Send to API |
| 4 | /api/settings/production/route.ts | API | Auth & validate |
| 5 | production-settings.ts | Database | Transform & query |
| 6 | farm_production_settings table | DB | Store data |
| 7 | production-distribution-settings.ts | Types | Type definitions |
| 8 | RecordProductionModal.tsx | Consumption | Read & display |

**Total: 8 Files**

---

## Key Points

### ✅ Auto-Sync Feature
When user edits `milkingSessions`, `updateSetting()` in ProductionSettingsTab **automatically** generates `sessionTimes`:
- "Morning" → "morning"
- Time "05:30" → stored in sessionTimes.morning

### ✅ Single Source of Truth
Database stores both:
- `milking_sessions` - Full array (UI display)
- `session_times` - Derived object (RecordProductionModal uses this)

### ✅ Transformation Pipeline
```
camelCase (UI & API) ↔ snake_case (Database)
```

### ✅ Enabled Sessions Array
Tracks which sessions are active:
- User checks boxes in UI
- Stored as TEXT[] array in DB
- Used to filter session dropdown in RecordProductionModal

---

## Complete Save Cycle Example

**User Action:** Edits Morning session time from 06:00 to 05:30

**File 1 (GeneralSessionsSection):**
- User changes time input
- `updateSession('1', 'time', '05:30')`
- Calls `updateSetting('milkingSessions', [{id: '1', name: 'Morning', time: '05:30'}, ...])`

**File 2 (ProductionSettingsTab):**
- Receives `updateSetting('milkingSessions', [...])`
- Auto-sync: Creates `sessionTimes = {morning: '05:30'}`
- User clicks "Save Settings"
- Calls `handleSave()`

**File 3 (settings-handlers):**
- `saveSettings('/api/settings/production', farmId, {...milkingSessions, ...sessionTimes, ...})`

**File 4 (API route):**
- Receives POST request
- Validates user permissions
- Calls `updateProductionSettings(farmId, settings)`

**File 5 (Database layer):**
- Transforms settings to dbSettings
- Maps `milkingSessions` → `milking_sessions`
- Maps `sessionTimes` → `session_times`
- Upserts to farm_production_settings table

**File 6 (PostgreSQL):**
- Stores:
  - `milking_sessions: '[{"id":"1","name":"Morning","time":"05:30"}]'`
  - `session_times: '{"morning":"05:30"}'`

**Retrieval (Next visit):**
- File 5 queries database
- File 5 transforms data back to camelCase
- File 1 displays saved sessions ✅

