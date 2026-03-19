// ANIMAL CATEGORIES - API VALIDATION & DATA PERSISTENCE IMPLEMENTATION

## Overview

This document describes the complete data flow for animal categorization system with dynamic characteristics, including validation, processing, and persistence.

## Data Flow Architecture

### Frontend → API → Database

```
Frontend Form (AnimalCategoriesManager.tsx)
        ↓
   Form Submission with:
   - name, description
   - min_age_days, max_age_days
   - gender ('any', 'male', 'female')
   - production_status ('calf', 'heifer', 'bull', 'served', 'lactating', 'dry')
   - characteristics: {
       - Booleans: lactating, pregnant, breeding_male, growth_phase
       - Checkboxes: mastitis_risk, under_treatment, vaccination_due, etc.
       - Ranges: {min, max} for: dim, milk_yield, lactation_number, etc.
       - Milking Schedules: [{id, name, frequency, times[]}]
     }
        ↓
   API Endpoint (route.ts)
        ↓
   Validation Layer (animal-category-validation.ts)
        ↓
   Processing Layer (replace temp IDs, cleanup)
        ↓
   Database Layer (Supabase)
        ↓
   Stored as JSONB in characteristics column
```

## Validation Implementation

### 1. Validation Utilities (animal-category-validation.ts)

**Functions:**
- `validateTimeFormat(time)` - Validates HH:MM format
- `validateTimesAscending(times)` - Ensures times are in order
- `validateMilkingSchedule(schedule, index)` - Complete schedule validation
- `validateRangeCharacteristic(field, range)` - Range value validation with bounds
- `validateAgeRange(min, max)` - Age range consistency
- `validateAnimalCategoryData(data)` - Main validation function
- `processCharacteristicsForStorage(characteristics)` - ID replacement & cleanup

**Range Bounds:**
- DIM: 0-500 days
- Milk Yield: 0-100 liters
- Lactation Number: 1-15 lactations
- Days Pregnant: 0-290 days
- Days to Calving: 0-290 days
- Age: 0-7300 days (~20 years)
- Weight: 0-1500 kg
- Daily Gain: 0-5 kg/day
- Body Condition Score: 0-10
- Services per Conception: 1-10
- Days Since Heat: 0-60 days

### 2. Milking Schedule Validation

**Requirements:**
✓ Frequency must be 1-4
✓ Times.length must equal frequency
✓ Each time must be HH:MM format (00:00-23:59)
✓ Times must be in ascending order
✓ Schedule must have id, name

**Example Valid Schedules:**
- 1x daily: [frequency: 1, times: ["06:00"]]
- 2x daily: [frequency: 2, times: ["05:00", "14:30"]]
- 3x daily: [frequency: 3, times: ["05:00", "09:30", "14:30"]]
- 4x daily: [frequency: 4, times: ["05:00", "09:00", "14:00", "18:00"]]

### 3. ID Management

**Temporary IDs (Frontend Generated):**
- Format: `schedule_${Date.now()}`
- Example: `schedule_1703123456789`
- Purpose: Unique identification during form editing

**Persistent IDs (API Generated):**
- Generated: via `replaceTemporaryScheduleIds()` function
- Format: UUID v4
- Stored: in database characteristics.milking_schedules[].id
- Loaded: on edit to preserve state

### 4. Data Processing Pipeline

```javascript
// Frontend sends:
{
  characteristics: {
    milking_schedules: [
      {id: "schedule_1703123456789", name: "Morning", frequency: 1, times: ["06:00"]}
    ]
  }
}

// After validation in API:
✓ Schedule structure verified
✓ Times format validated
✓ Frequency matches times.length
✓ Times in ascending order

// After processing:
{
  characteristics: {
    milking_schedules: [
      {id: "550e8400-e29b-41d4-a716-446655440000", name: "Morning", frequency: 1, times: ["06:00"]}
    ]
  }
}

// Response to frontend:
{
  success: true,
  data: {
    id: "category-uuid",
    characteristics: {
      milking_schedules: [
        {id: "550e8400-e29b-41d4-a716-446655440000", name: "Morning", frequency: 1, times: ["06:00"]}
      ]
    }
  }
}
```

## API Endpoints

### POST /api/farms/[farmId]/feed-management/animal-categories

Creates a new animal category with full validation.

**Request Payload:**
```json
{
  "name": "Lactating Cows",
  "description": "High-producing lactating cows",
  "gender": "female",
  "production_status": "lactating",
  "min_age_days": 100,
  "max_age_days": 2000,
  "characteristics": {
    "lactating": true,
    "dim_range": {"min": 50, "max": 300},
    "milk_yield_range": {"min": 25, "max": 60},
    "milking_schedules": [
      {"id": "schedule_1703123456789", "name": "Morning", "frequency": 1, "times": ["06:00"]}
    ],
    "selected_milking_schedule_id": "schedule_1703123456789"
  }
}
```

**Validation Steps:**
1. ✓ Name required and non-empty
2. ✓ Gender in ['any', 'male', 'female']
3. ✓ Production status in valid list
4. ✓ Age range: min ≤ max, non-negative
5. ✓ All ranges within bounds
6. ✓ All range min ≤ max
7. ✓ Milking schedules: frequency matches times.length
8. ✓ Times: valid HH:MM format, ascending order

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "farm_id": "farm-uuid",
    "name": "Lactating Cows",
    "production_status": "lactating",
    "characteristics": {
      "lactating": true,
      "dim_range": {"min": 50, "max": 300},
      "milking_schedules": [
        {"id": "550e8400-e29b-41d4-a716-446655440001", "name": "Morning", "frequency": 1, "times": ["06:00"]}
      ]
    },
    "created_at": "2024-01-15T10:00:00Z"
  },
  "message": "Animal category created successfully"
}
```

**Error Response (Validation Failure):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {"field": "milking_schedules[0]", "message": "Frequency (3) must match number of times (2)"},
    {"field": "dim_range.min", "message": "Minimum (-10) must be between 0 and 500 (days)"}
  ]
}
```

### PUT /api/farms/[farmId]/feed-management/animal-categories/[id]

Updates an existing category with same validation as POST.

**Key Behavior:**
- Validates all data like POST
- Replaces temporary IDs with persistent UUIDs
- Preserves existing UUIDs (detects non-temp format)
- Returns updated category with all IDs

### Database Schema Requirements

**animal_categories table:**
```sql
CREATE TABLE animal_categories (
  id UUID PRIMARY KEY,
  farm_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  gender VARCHAR(10),  -- 'any', 'male', 'female'
  production_status VARCHAR(50),  -- 'calf', 'heifer', 'bull', 'served', 'lactating', 'dry'
  min_age_days INT,
  max_age_days INT,
  characteristics JSONB,  -- Stores all ranges, checkboxes, milking schedules
  is_default BOOLEAN DEFAULT false,
  sort_order INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINTS:
    - UNIQUE(farm_id, name)
    - CHECK(gender IN ('any', 'male', 'female') OR gender IS NULL)
    - CHECK(production_status IN ('calf', 'heifer', 'bull', 'served', 'lactating', 'dry') OR production_status IS NULL)
    - CHECK(min_age_days >= 0)
    - CHECK(max_age_days >= 0)
    - CHECK(min_age_days <= max_age_days)
);
```

## Frontend Integration

### Edit Flow (Loading with Real IDs)

```typescript
// 1. User opens edit form
// 2. Frontend loads category from API
const category = await fetch(`/api/farms/${farmId}/feed-management/animal-categories/${categoryId}`)

// 3. Category has REAL UUIDs from database
// 4. Frontend displays form with existing values
// 5. User modifies data
// 6. Form submission sends (including real UUIDs)
// 7. API recognizes real UUIDs (doesn't match temp pattern)
// 8. Real UUIDs preserved during save
// 9. Updated category returned with same IDs
// 10. Frontend state updated with persistent IDs
```

### Error Handling

**Frontend should display errors:**
```javascript
catch (error) {
  const errorData = await response.json()
  
  if (errorData.details) {
    // Show each validation error
    errorData.details.forEach(err => {
      console.error(`${err.field}: ${err.message}`)
    })
  } else {
    console.error(errorData.error)
  }
}
```

## Testing Checklist

- [ ] Create category with 1x daily milking schedule
- [ ] Create category with 3x daily milking schedule
- [ ] Try invalid frequency (5x milking) → should fail
- [ ] Try mismatched times (frequency: 3, times: 2) → should fail
- [ ] Try invalid time format ("25:00") → should fail
- [ ] Try times not in order (["14:00", "09:00"]) → should fail
- [ ] Try range min > max ("dim_range": {"min": 300, "max": 50"}) → should fail
- [ ] Try range outside bounds → should fail
- [ ] Create category, edit it, verify IDs preserved
- [ ] Create new schedule in edit form, verify new UUID generated
- [ ] Delete schedule, verify removed from database
- [ ] Verify characteristics stored as JSONB in database
- [ ] Test all production status/gender combinations

## Migration File

See: `010_enhance_animal_categories_table.sql`

**Changes:**
- ADD 6 new columns (gender, production_status, age fields, characteristics, updated_at)
- RENAME category_name → name
- CREATE 6 indexes for performance
- ADD CHECK constraints for data integrity
- CREATE trigger for automatic updated_at

## Production Deployment Steps

1. Apply migration: `010_enhance_animal_categories_table.sql`
2. Deploy validation utilities: `animal-category-validation.ts`
3. Deploy API endpoints with validation in route.ts files
4. Update database functions: `feedManagementSettings.ts`
5. Test complete CRUD flow
6. Monitor for validation errors in logs

---

**Implementation Status:** ✅ Complete
- ✅ Validation utilities created
- ✅ API endpoints enhanced with validation
- ✅ Database functions updated
- ✅ ID replacement logic implemented
- ✅ Error response structure defined
- ✅ Migration file ready for deployment
