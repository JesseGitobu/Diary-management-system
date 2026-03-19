// TESTING GUIDE FOR ANIMAL CATEGORIES API

## Unit Test Examples

### Test File Location
`__tests__/api/animal-category-validation.test.ts`

### Test Cases

```typescript
import {
  validateTimeFormat,
  validateTimesAscending,
  validateMilkingSchedule,
  validateRangeCharacteristic,
  validateAgeRange,
  validateAnimalCategoryData,
  replaceTemporaryScheduleIds
} from '@/lib/database/animal-category-validation'

describe('Animal Category Validation', () => {
  
  // ============ TIME FORMAT VALIDATION ============
  describe('validateTimeFormat', () => {
    it('accepts valid HH:MM format', () => {
      expect(validateTimeFormat('06:00').valid).toBe(true)
      expect(validateTimeFormat('14:30').valid).toBe(true)
      expect(validateTimeFormat('23:59').valid).toBe(true)
    })
    
    it('rejects invalid formats', () => {
      expect(validateTimeFormat('6:00').valid).toBe(false)
      expect(validateTimeFormat('25:00').valid).toBe(false)
      expect(validateTimeFormat('06:60').valid).toBe(false)
      expect(validateTimeFormat('18'). valid).toBe(false)
    })
  })

  // ============ TIMES ASCENDING VALIDATION ============
  describe('validateTimesAscending', () => {
    it('accepts times in ascending order', () => {
      expect(validateTimesAscending(['05:00', '14:30']).valid).toBe(true)
      expect(validateTimesAscending(['05:00', '09:00', '14:00', '18:00']).valid).toBe(true)
    })
    
    it('rejects times not in order', () => {
      expect(validateTimesAscending(['14:30', '05:00']).valid).toBe(false)
      expect(validateTimesAscending(['05:00', '05:00', '14:30']).valid).toBe(false)
    })
  })

  // ============ MILKING SCHEDULE VALIDATION ============
  describe('validateMilkingSchedule', () => {
    it('validates correct morning schedule', () => {
      const schedule = {
        id: 'schedule_1703123456789',
        name: 'Morning Milking',
        frequency: 1,
        times: ['06:00']
      }
      const result = validateMilkingSchedule(schedule, 0)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
    
    it('validates correct 2x daily schedule', () => {
      const schedule = {
        id: 'schedule_1703123456789',
        name: 'Morning & Afternoon',
        frequency: 2,
        times: ['05:00', '14:30']
      }
      const result = validateMilkingSchedule(schedule, 0)
      expect(result.valid).toBe(true)
    })
    
    it('rejects frequency mismatch', () => {
      const schedule = {
        id: 'schedule_1703123456789',
        name: 'Wrong Times',
        frequency: 3,
        times: ['05:00', '14:30']  // Should have 3 times!
      }
      const result = validateMilkingSchedule(schedule, 0)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('Frequency'))).toBe(true)
    })
    
    it('rejects invalid time format', () => {
      const schedule = {
        id: 'schedule_1703123456789',
        name: 'Invalid Time',
        frequency: 1,
        times: ['25:00']
      }
      const result = validateMilkingSchedule(schedule, 0)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('HH:MM'))).toBe(true)
    })
    
    it('rejects times not in order', () => {
      const schedule = {
        id: 'schedule_1703123456789',
        name: 'Out of Order',
        frequency: 2,
        times: ['14:30', '05:00']  // Not ascending!
      }
      const result = validateMilkingSchedule(schedule, 0)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('ascending'))).toBe(true)
    })
    
    it('rejects frequency outside 1-4 range', () => {
      const schedule = {
        id: 'schedule_1703123456789',
        name: 'Too Many Times',
        frequency: 5,
        times: ['05:00', '09:00', '12:00', '15:00', '18:00']
      }
      const result = validateMilkingSchedule(schedule, 0)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field.includes('frequency'))).toBe(true)
    })
  })

  // ============ RANGE CHARACTERISTIC VALIDATION ============
  describe('validateRangeCharacteristic', () => {
    it('validates valid DIM range', () => {
      const result = validateRangeCharacteristic('dim_range', {min: 50, max: 300})
      expect(result.valid).toBe(true)
    })
    
    it('rejects min > max', () => {
      const result = validateRangeCharacteristic('dim_range', {min: 300, max: 50})
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('must be less than')
    })
    
    it('rejects values outside bounds', () => {
      const result = validateRangeCharacteristic('dim_range', {min: -10, max: 300})
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('must be between')
    })
    
    it('allows null values', () => {
      const result = validateRangeCharacteristic('dim_range', {min: null, max: null})
      expect(result.valid).toBe(true)
    })
  })

  // ============ AGE RANGE VALIDATION ============
  describe('validateAgeRange', () => {
    it('validates correct age range', () => {
      expect(validateAgeRange(180, 2000).valid).toBe(true)
    })
    
    it('rejects min > max', () => {
      expect(validateAgeRange(2000, 180).valid).toBe(false)
    })
    
    it('rejects negative ages', () => {
      expect(validateAgeRange(-100, 500).valid).toBe(false)
    })
  })

  // ============ FULL VALIDATION ============
  describe('validateAnimalCategoryData', () => {
    it('validates correct complete category', () => {
      const data = {
        name: 'Lactating Cows',
        description: 'High-producing lactating cows',
        gender: 'female',
        production_status: 'lactating',
        min_age_days: 100,
        max_age_days: 2000,
        characteristics: {
          lactating: true,
          dim_range: {min: 50, max: 300},
          milk_yield_range: {min: 25, max: 60},
          milking_schedules: [
            {id: 'schedule_1234', name: 'Morning', frequency: 1, times: ['06:00']}
          ]
        }
      }
      const result = validateAnimalCategoryData(data)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
    
    it('rejects missing name', () => {
      const data = {
        description: 'No name',
        characteristics: {}
      }
      const result = validateAnimalCategoryData(data)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'name')).toBe(true)
    })
    
    it('rejects invalid gender', () => {
      const data = {
        name: 'Category',
        gender: 'unknown',
        characteristics: {}
      }
      const result = validateAnimalCategoryData(data)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'gender')).toBe(true)
    })
  })

  // ============ ID REPLACEMENT ============
  describe('replaceTemporaryScheduleIds', () => {
    it('replaces temp IDs with UUIDs', () => {
      const schedules = [
        {id: 'schedule_1703123456789', name: 'Morning', frequency: 1, times: ['06:00']},
        {id: 'schedule_1703123456790', name: 'Evening', frequency: 1, times: ['14:30']}
      ]
      const result = replaceTemporaryScheduleIds(schedules)
      
      expect(result[0].id).not.toMatch(/^schedule_/)
      expect(result[1].id).not.toMatch(/^schedule_/)
      expect(result[0].name).toBe('Morning')
      expect(result[1].name).toBe('Evening')
    })
    
    it('preserves real UUID IDs', () => {
      const realUUID = '550e8400-e29b-41d4-a716-446655440000'
      const schedules = [
        {id: realUUID, name: 'Morning', frequency: 1, times: ['06:00']}
      ]
      const result = replaceTemporaryScheduleIds(schedules)
      
      expect(result[0].id).toBe(realUUID)
    })
  })
})
```

## Integration Test Examples

### Test the Complete API Flow

```typescript
describe('Animal Categories API Integration', () => {
  
  it('POST should validate and create category with correct UUID replacement', async () => {
    const payload = {
      name: 'Test Lactating Cows',
      gender: 'female',
      production_status: 'lactating',
      characteristics: {
        lactating: true,
        milking_schedules: [
          {
            id: `schedule_${Date.now()}`,
            name: 'Morning Milking',
            frequency: 1,
            times: ['06:00']
          }
        ]
      }
    }
    
    const response = await fetch('/api/farms/farm-id/feed-management/animal-categories', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    })
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    
    // Verify temp ID was replaced
    const scheduleId = data.data.characteristics.milking_schedules[0].id
    expect(scheduleId).not.toMatch(/^schedule_/)
    expect(scheduleId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })
  
  it('POST should reject invalid milking schedule', async () => {
    const payload = {
      name: 'Invalid Schedule',
      characteristics: {
        milking_schedules: [
          {
            id: 'schedule_123',
            name: 'Bad Schedule',
            frequency: 3,  // frequency 3
            times: ['05:00', '14:30']  // but only 2 times!
          }
        ]
      }
    }
    
    const response = await fetch('/api/farms/farm-id/feed-management/animal-categories', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    })
    
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.details).toBeDefined()
    expect(data.details.some(e => e.message.includes('must match'))).toBe(true)
  })
  
  it('PUT should preserve existing UUID IDs', async () => {
    // First create a category
    const createResponse = await fetch('/api/farms/farm-id/feed-management/animal-categories', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        name: 'Original',
        characteristics: {
          milking_schedules: [{
            id: `schedule_${Date.now()}`,
            name: 'Morning',
            frequency: 1,
            times: ['06:00']
          }]
        }
      })
    })
    const created = await createResponse.json()
    const originalScheduleId = created.data.characteristics.milking_schedules[0].id
    
    // Now update with same schedule
    const updatePayload = {
      name: 'Updated',
      characteristics: {
        milking_schedules: [{
          id: originalScheduleId,  // Using real UUID
          name: 'Morning (Updated)',
          frequency: 1,
          times: ['06:30']
        }]
      }
    }
    
    const updateResponse = await fetch(`/api/farms/farm-id/feed-management/animal-categories/${created.data.id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(updatePayload)
    })
    
    const updated = await updateResponse.json()
    // ID should be preserved
    expect(updated.data.characteristics.milking_schedules[0].id).toBe(originalScheduleId)
  })
})
```

## Manual Testing Scenarios

### Scenario 1: Create Simple 1x Daily Category
```bash
curl -X POST http://localhost:3000/api/farms/[farmId]/feed-management/animal-categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Morning Milking Only",
    "gender": "female",
    "production_status": "lactating",
    "characteristics": {
      "lactating": true,
      "milking_schedules": [{
        "id": "schedule_'"$(date +%s)"'",
        "name": "6 AM Milking",
        "frequency": 1,
        "times": ["06:00"]
      }],
      "selected_milking_schedule_id": "schedule_'"$(date +%s)"'"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Morning Milking Only",
    "characteristics": {
      "lactating": true,
      "milking_schedules": [{
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "6 AM Milking",
        "frequency": 1,
        "times": ["06:00"]
      }]
    }
  },
  "message": "Animal category created successfully"
}
```

### Scenario 2: Try Invalid Frequency (Should Fail)
```json
{
  "name": "Invalid",
  "characteristics": {
    "milking_schedules": [{
      "id": "schedule_123",
      "name": "Bad",
      "frequency": 5,
      "times": ["05:00", "09:00", "12:00", "15:00", "18:00"]
    }]
  }
}
```

**Expected Error:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [{
    "field": "milking_schedules[0].frequency",
    "message": "Frequency must be an integer between 1 and 4"
  }]
}
```

## Verification Checklist

After deploying to production:

- [ ] Verify migration applied successfully
- [ ] Create category with 1x daily schedule
- [ ] Verify schedule ID is UUID (not temp format)
- [ ] Edit category with same schedule
- [ ] Verify UUID preserved on update
- [ ] Try creating with invalid frequency
- [ ] Verify validation error returned
- [ ] Try creating with times out of order
- [ ] Verify times ascending validation works
- [ ] Create with range characteristics
- [ ] Verify ranges stored in JSONB
- [ ] Try creating with min > max range
- [ ] Verify range validation error returned

---

**Updated:** 2024-01-15
