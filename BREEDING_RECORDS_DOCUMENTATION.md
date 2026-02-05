# Breeding Records Auto-Generation Documentation
## What Gets Saved When Purchased Animal is Registered with 'SERVED' or 'DRY' Status

---

## 🔴 CRITICAL FINDING: Current Implementation Issue

**SERVED and DRY statuses currently prepare breeding data structures but DO NOT INSERT them into the database.**

Only **LACTATING** status actually creates and saves records to the database.

---

## 1️⃣ PRODUCTION STATUS: 'SERVED'

### Input Data Required:
- `service_date` - When the animal was serviced
- `service_method` - Type of breeding (artificial_insemination, natural_breeding, embryo_transfer)
- `expected_calving_date` - Expected calving date (auto-calculated from service date + gestation period)

### Prepared Data Structure (NOT Currently Inserted):
```javascript
breedingData = {
  animal_id: animalId,
  farm_id: farmId,
  breeding_type: 'artificial_insemination', // derived from service_method
  breeding_date: service_date,
  notes: '🤖 Auto-generated from registration (Served status)',
  created_at: timestamp,
  updated_at: timestamp
}

pregnancyData = {
  animal_id: animalId,
  farm_id: farmId,
  pregnancy_status: 'suspected', // ⚠️ NOT confirmed - just suspected
  expected_calving_date: calculated_or_provided_date,
  gestation_length: 280, // from farm breeding settings
  pregnancy_notes: 'Auto-generated from registration data',
  created_at: timestamp,
  updated_at: timestamp
}
```

### Tables That WOULD Be Updated (if insertion was implemented):
1. **breeding_records** table
   - `animal_id`
   - `farm_id`
   - `breeding_type`
   - `breeding_date`
   - `notes`
   - `created_at`/`updated_at`

2. **pregnancy_records** table
   - `animal_id`
   - `farm_id`
   - `pregnancy_status` (set to 'suspected')
   - `expected_calving_date`
   - `gestation_length`
   - `pregnancy_notes`
   - `created_at`/`updated_at`

### Status Explanation:
- **pregnancy_status: 'suspected'** - The system considers it a suspected pregnancy because the animal is newly registered and hasn't had a pregnancy check yet
- **Breeding Record**: Would be created with the service date as the breeding date
- This represents an animal that has been serviced but is waiting for pregnancy confirmation

---

## 2️⃣ PRODUCTION STATUS: 'DRY'

### Input Data Required:
- `expected_calving_date` - **REQUIRED** - When the animal is expected to calve
- `service_date` - **Optional** - system calculates this backward if not provided
- `service_method` - **Optional** - defaults to artificial_insemination
- `lactation_number` - **Optional** - Breeding cycle number (1st, 2nd, 3rd, etc.)

### Prepared Data Structure (NOT Currently Inserted):
```javascript
// Calculated values:
calvingDate = new Date(expected_calving_date)
breedingDate = calvingDate - 280 days (gestation period)
confirmationDate = breedingDate + 45 days (pregnancy check days)

breedingData = {
  animal_id: animalId,
  farm_id: farmId,
  breeding_type: 'artificial_insemination', // derived from service_method
  breeding_date: breedingDateStr, // calculated backward
  notes: '🤖 Auto-generated from registration (Dry/Pregnant status)',
  created_at: timestamp,
  updated_at: timestamp
}

pregnancyData = {
  animal_id: animalId,
  farm_id: farmId,
  pregnancy_status: 'confirmed', // ✅ This is confirmed, not suspected
  confirmed_date: confirmationDateStr, // calculated
  confirmation_method: 'rectal_palpation',
  expected_calving_date: expected_calving_date,
  gestation_length: 280,
  pregnancy_notes: `Auto-generated from registration data. Pregnancy confirmed on ${confirmationDateStr}`,
  created_at: timestamp,
  updated_at: timestamp
}
```

### Tables That WOULD Be Updated (if insertion was implemented):
1. **breeding_records** table
   - `animal_id`
   - `farm_id`
   - `breeding_type`
   - `breeding_date` (calculated backward from calving date)
   - `notes`
   - `created_at`/`updated_at`

2. **pregnancy_records** table
   - `animal_id`
   - `farm_id`
   - `breeding_record_id` - **REQUIRED FOREIGN KEY**
   - `pregnancy_status` (set to 'confirmed')
   - `confirmed_date` (calculated)
   - `confirmation_method` (set to 'rectal_palpation')
   - `expected_calving_date`
   - `gestation_length`
   - `pregnancy_notes`
   - `created_at`/`updated_at`

### Status Explanation:
- **pregnancy_status: 'confirmed'** - The animal is in the dry period, which means it's already confirmed pregnant
- **Dates Calculated Backward**: 
  - From expected_calving_date: `280 days back = breeding_date`
  - From breeding_date: `+45 days = confirmation_date`
- **Lactation Number**: Saved to `lactation_number` field in the animals table (not directly in breeding records)

---

## 3️⃣ PRODUCTION STATUS: 'LACTATING'

### Input Data Required:
- `lactation_number` - **Required** - How many lactation cycles the animal has had
- `days_in_milk` - **Optional** - Current days in milk (default: 60 if not provided)
- `current_daily_production` - **Optional** - Current milk production
- `lactation_number` - **Optional** - Lactation cycle number

### TABLES ACTUALLY BEING INSERTED (✅ This One Works!):

**For each lactation cycle from number N down to 1:**

#### 1. **breeding_records** table (PER CYCLE)
```javascript
{
  animal_id: animalId,
  farm_id: farmId,
  breeding_type: 'artificial_insemination',
  breeding_date: calvingDate - 280 days,
  notes: '🤖 Auto-generated from registration (Lactation #N)',
  auto_generated: true,
  created_at: timestamp,
  updated_at: timestamp
}
```

#### 2. **breeding_events** table - HEAT DETECTION (PER CYCLE)
```javascript
{
  farm_id: farmId,
  animal_id: animalId,
  event_type: 'heat_detection',
  event_date: (breedingDate - 3 days),
  heat_signs: ['standing_heat', 'tail_raising', 'mucus_discharge'],
  heat_action_taken: 'insemination_scheduled',
  notes: '🤖 Auto-generated Lactation #N heat detection',
  created_by: userId
}
```

#### 3. **breeding_events** table - INSEMINATION (PER CYCLE)
```javascript
{
  farm_id: farmId,
  animal_id: animalId,
  event_type: 'insemination',
  event_date: breedingDate,
  insemination_method: 'artificial_insemination',
  semen_bull_code: 'AUTO_GEN_xxxxx',
  technician_name: 'Auto-System',
  notes: '🤖 Auto-generated Lactation #N insemination',
  created_by: userId
}
```

#### 4. **pregnancy_records** table (PER CYCLE)
```javascript
{
  animal_id: animalId,
  farm_id: farmId,
  breeding_record_id: breedingRecord.id, // FK to breeding_records
  pregnancy_status: 'completed',
  confirmed_date: (breedingDate + 45 days),
  confirmation_method: 'ultrasound',
  expected_calving_date: calvingDate,
  actual_calving_date: calvingDate,
  gestation_length: 280,
  pregnancy_notes: 'Auto-generated Lactation #N...',
  created_at: timestamp,
  updated_at: timestamp
}
```

#### 5. **breeding_events** table - PREGNANCY CHECK (PER CYCLE)
```javascript
{
  farm_id: farmId,
  animal_id: animalId,
  event_type: 'pregnancy_check',
  event_date: (breedingDate + 45 days),
  pregnancy_result: 'pregnant',
  examination_method: 'ultrasound',
  veterinarian_name: 'Auto-System',
  estimated_due_date: calvingDate,
  notes: '🤖 Auto-generated Lactation #N pregnancy confirmation',
  created_by: userId
}
```

#### 6. **breeding_events** table - CALVING EVENT (PER CYCLE)
```javascript
{
  farm_id: farmId,
  animal_id: animalId,
  event_type: 'calving',
  event_date: calvingDate,
  calving_outcome: 'normal',
  calf_gender: 'male' or 'female' (random),
  calf_weight: 40-50 kg (random),
  calf_health_status: 'healthy',
  notes: '🤖 Auto-generated Lactation #N calving',
  created_by: userId
}
```

#### 7. **calving_records** table (PER CYCLE)
```javascript
{
  pregnancy_record_id: pregnancyRecord.id, // FK to pregnancy_records
  mother_id: animalId,
  farm_id: farmId,
  calving_date: calvingDate,
  calving_time: '12:00:00',
  calving_difficulty: 'normal',
  assistance_required: false,
  veterinarian: null,
  complications: null,
  birth_weight: calf_weight,
  calf_gender: calf_gender,
  calf_alive: true,
  calf_health_status: 'healthy',
  colostrum_quality: 'excellent',
  notes: '🤖 Auto-generated Lactation #N from registration',
  created_at: timestamp,
  updated_at: timestamp,
}
```

---

## 📊 Summary Table

| Aspect | SERVED | DRY | LACTATING |
|--------|--------|-----|-----------|
| **Records Inserted** | ❌ NO (prepared but not inserted) | ❌ NO (prepared but not inserted) | ✅ YES |
| **Tables Created** | None (currently) | None (currently) | 7 tables per cycle |
| **Pregnancy Status** | suspected | confirmed | completed |
| **Dates Calculated** | Forward from service date | Backward from calving date | Backward from calving date |
| **Cycles Generated** | 1 | 1 | N (based on lactation_number) |
| **breeding_events Created** | None | None | 4 per cycle (heat, insemination, pregnancy check, calving) |

---

## ⚠️ Important Notes

1. **SERVED and DRY Status Issue**: The current implementation prepares the data structures but does NOT insert them into the database. Only LACTATING animals actually get records saved.

2. **Animal Table**: The `lactation_number` field in the animals table is populated with the value provided by the user for all three statuses (if provided).

3. **Database Requirements**:
   - `pregnancy_records.breeding_record_id` has NOT NULL constraint (must have a breeding record)
   - `calving_records.pregnancy_record_id` requires a pregnancy record to exist
   - `breeding_events` records are independent and can be created without breeding_records

4. **Auto-Generation Benefits for LACTATING**:
   - Creates complete breeding history for all previous lactations
   - Provides timeline of heat detection, breeding, pregnancy checks, and calvings
   - Enables accurate production tracking and breeding analysis
   - Supports heat cycle management and pregnancy monitoring

5. **Farm Breeding Settings Used**:
   - `default_gestation` (default: 280 days) - for calculating dates
   - `pregnancy_check_days` (default: 45 days) - for pregnancy confirmation timing
   - `postpartum_breeding_delay_days` (default: 60 days) - for lactating cycles only

---

## 🔧 Recommended Fix

To complete the implementation for SERVED and DRY statuses, add an else clause after the lactating cycle loop to handle non-lactating scenarios:

```typescript
} else {
  // Handle SERVED and DRY scenarios (currently empty/not implemented)
  console.log('Processing SERVED/DRY scenario...')
  
  const { data: breedingRecord, error: breedingError } = await supabase
    .from('breeding_records')
    .insert(breedingData)
    .select()
    .single()
  
  if (!breedingError && breedingRecord) {
    pregnancyData.breeding_record_id = breedingRecord.id
    
    const { error: pregnancyError } = await supabase
      .from('pregnancy_records')
      .insert(pregnancyData)
  }
}
```
