# Per-Resource Action Mapping - Complete Implementation

## Overview

You can now create **ONE policy record** that reflects all selected resources and their individual actions with proper relationship mapping.

## What Changed

### 1. Database Schema - New Migration 029

**Added column:**
```sql
ALTER TABLE access_control_policies
ADD COLUMN resource_actions JSONB NOT NULL DEFAULT '{}'::jsonb;
```

**Format:**
```json
{
  "animals": ["view", "create"],
  "health": ["view", "create", "edit", "delete", "export", "manage"],
  "production": ["view"]
}
```

**Index:**
- GIN index on `resource_actions` for fast queries

### 2. Type System Updated

**Changed:**
```typescript
// OLD - Referenced all 11 types (including 'all')
export type AccessResource = 'animals' | ... | 'all'

// NEW - Database types exclude 'all'
export type AccessResource = 'animals' | 'health' | ... | 'settings'  // 10 only
export type AccessResourceWithAll = AccessResource | 'all'  // UI type with 'all'
```

**Interfaces:**
```typescript
interface AccessControlPolicy {
  resources: AccessResource[]  // e.g., ['animals', 'health']
  actions: AccessAction[]  // e.g., ['view', 'create', 'manage']
  resource_actions: Partial<Record<AccessResource, AccessAction[]>>  // NEW
  // Maps each resource to its allowed actions
}

interface CreateAccessControlInput {
  resource_actions: Partial<Record<AccessResource, AccessAction[]>>  // NEW
}
```

### 3. Component Behavior

**Before** (Multiple API calls - hitting unique constraint):
```
User submits form
  ↓
Component creates 3 API calls:
  1. POST { resources: ['animals'], actions: [...] }
  2. POST { resources: ['health'], actions: [...] }  ❌ DUPLICATE NAME ERROR
  3. POST { resources: ['production'], actions: [...] }
```

**After** (Single API call - stores one policy):
```
User submits form
  ↓
Component creates 1 API call:
  POST {
    resources: ['animals', 'health', 'production'],
    actions: ['view', 'create', 'edit', 'delete', 'export', 'manage'],
    resource_actions: {
      animals: ['view', 'create'],
      health: ['view', 'create', 'edit', 'delete', 'export', 'manage'],
      production: ['view']
    }
  }
  ↓
✅ Single record created (no duplicate name error!)
```

### 4. Data Flow

**Component (AccessControlModal.tsx):**
```typescript
// User selects:
resourceActions = {
  animals: ['view', 'create'],
  health: ['view', 'manage'],  // manage implies all 5
  production: ['view']
}

// Component builds for API call:
handleCreatePolicy() {
  const resourceActionsMapping = { ... }  // Copy resourceActions
  const allActions = [...new Set(
    Object.values(resourceActionsMapping).flat()
  )]  // Unique actions across all resources
  
  // Send ONE API call
  fetch('/api/access-control', {
    resources: ['animals', 'health', 'production'],
    actions: allActions,  // All unique
    resource_actions: resourceActionsMapping  // Per-resource mapping
  })
}
```

**API (POST route):**
```typescript
// Validates:
✅ resource_actions is object (not array)
✅ Has entries for all listed resources
✅ Each resource has non-empty action array
✅ All actions are valid
✅ All resources are valid

// Passes to database
createAccessControlPolicy(farmId, {
  resources,
  actions,
  resource_actions
})
```

**Database (access-control.ts):**
```typescript
const policyData = {
  farm_id,
  name,
  role_type,
  resources: input.resources,  // All selected resources
  actions: input.actions,  // All unique actions
  resource_actions: input.resource_actions,  // JSONB mapping
  is_granted: true
}

INSERT INTO access_control_policies (...)
  VALUES (policyData)
```

### 5. Example: One Policy, Multiple Resources

**User Selection:**
```
Resource: animals → Actions: [view, create]
Resource: health → Actions: [view, manage]  (all 5)
Resource: production → Actions: [view]
```

**Stored in Database:**
```sql
INSERT INTO access_control_policies (
  farm_id, role_type, name, 
  resources, actions, resource_actions, ...
) VALUES (
  'farm-123', 'worker', 'Farm Admin',
  ARRAY['animals', 'health', 'production'],
  ARRAY['view', 'create', 'edit', 'delete', 'export', 'manage'],
  '{
    "animals": ["view", "create"],
    "health": ["view", "create", "edit", "delete", "export", "manage"],
    "production": ["view"]
  }'::jsonb,
  ...
)
```

**Single Row Result:**
```
id: uuid-1
farm_id: farm-123
role_type: worker
name: Farm Admin
resources: ["animals", "health", "production"]
actions: ["view", "create", "edit", "delete", "export", "manage"]
resource_actions: {
  "animals": ["view", "create"],
  "health": ["view", "create", "edit", "delete", "export", "manage"],
  "production": ["view"]
}
```

### 6. Edits & Retrieval

**When editing policy:**
```typescript
handleEditPolicy(policy) {
  // Component loads resource_actions JSONB
  resourceActions = policy.resource_actions
  // Pre-populates form with exact per-resource actions
}
```

**When querying permissions:**
```typescript
getPermission(farmId, role, resource, action)
  // Query: WHERE farm_id = ? AND role_type = ?
  //   AND resources @> ARRAY[resource]
  //   AND actions @> ARRAY[action]
  // Return: is_granted boolean
```

### 7. API Validation Chain

**POST /api/access-control now validates:**

1. ✅ `resource_actions` is object (not array, not string)
2. ✅ `resource_actions` has at least one entry
3. ✅ Each key in `resource_actions` is valid resource
4. ✅ Each value is non-empty action array
5. ✅ All actions in arrays are valid
6. ✅ `resources` array matches keys in `resource_actions`
7. ✅ `actions` array contains all unique actions across all resources
8. ✅ User has permission (farm_owner/manager)

**Errors caught:**
- ❌ `resource_actions: "not an object"` → 400
- ❌ `resource_actions: []` → 400 (array not object)
- ❌ `resource_actions: { invalid_resource: [...] }` → 400
- ❌ `resource_actions: { animals: [] }` → 400 (empty actions)
- ❌ `resource_actions: { animals: ["bad_action"] }` → 400

## Migration Steps

1. **Run Migration 029:**
   ```bash
   # Adds resource_actions JSONB column
   supabase db push
   ```

2. **Update Component:**
   - Single API call instead of per-resource calls ✅
   - Sends resource_actions mapping ✅
   - No more unique constraint violations ✅

3. **Verify New Data Structure:**
   ```sql
   SELECT id, name, resources, actions, resource_actions 
   FROM access_control_policies
   LIMIT 1;
   ```
   Should show all three columns populated.

## Backward Compatibility

**Existing policies (before resource_actions):**
- Will have empty `{}` in resource_actions
- Component's `handleEditPolicy` has fallback logic:
  ```typescript
  // If resource_actions is empty, use all actions for all resources
  if (!policy.resource_actions || Object.keys(policy.resource_actions).length === 0) {
    policy.resources?.forEach((resource) => {
      resourceActionsMap[resource] = policy.actions
    })
  }
  ```

## Files Updated

| File | Changes |
|------|---------|
| `supabase/migrations/029_add_resource_actions_mapping.sql` | ✅ Created |
| `src/lib/database/access-control.ts` | ✅ Interfaces + types + validation |
| `src/app/api/access-control/route.ts` | ✅ POST validation for resource_actions |
| `src/components/teams-roles/AccessControlModal.tsx` | ✅ Single API call + mapping |

## Status

✅ **All TypeScript errors resolved**
✅ **API validation complete**
✅ **Component sends correct format**
✅ **Database schema ready (migration 029)**
✅ **Backward compatible**

## Next Steps

1. Apply migration 029 to database
2. Test form submission with multiple resources
3. Verify one policy created (not multiple)
4. Check database record shows resource_actions JSONB
5. Edit policy to confirm resource_actions loads correctly
