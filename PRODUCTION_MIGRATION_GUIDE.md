## Production System Migration - Implementation Guide

### Completed Tasks:

1. **Database Migration Created**: `019_update_production_records_with_health_quality_fields.sql`
   - Added milking_session, temperature, mastitis_test_performed, mastitis_result, affected_quarters, lactose_content, ph_level, recorded_by, updated_at columns
   - Added appropriate indexes and check constraints
   - Added RLS policies for security
   - Added auto-update trigger for updated_at timestamp

2. **API Routes Updated**:
   - `src/app/api/production/route.ts` - Enhanced POST handler with field validation
   - `src/app/api/production/history/route.ts` - Created new endpoint for historical context
   - `src/app/api/production/[id]/route.ts` - Created DELETE endpoint for record management

3. **New Form Components Ready**:
   - `IndividualRecordForm.tsx` - Records one animal at a time
   - `GroupRecordForm.tsx` - Records multiple animals from a group
   - `RecordProductionModal.tsx` - Main modal wrapper with tab switching

### Files to Update/Remove:

#### Update References (Replace ProductionEntryForm with RecordProductionModal):
1. `src/components/layout/GlobalModalWrapper.tsx` - Update import and usage
2. `src/components/animals/AnimalProductionRecords.tsx` - Update import and usage

#### Files to Remove (After migration complete):
1. `src/components/production/ProductionEntryForm.tsx` - Old form, replaced by new system

### Migration Steps for Implementation:

1. **Apply Database Migration**:
   ```bash
   # Run the migration file in Supabase
   supabase migration push 019_update_production_records_with_health_quality_fields.sql
   ```

2. **Verify API Endpoints**:
   - POST /api/production (creates records with new fields)
   - GET /api/production (fetches records)
   - GET /api/production/history (fetches historical context)
   - DELETE /api/production/[id] (deletes records)

3. **Update Component References** (Sample pattern):
   
   Instead of:
   ```tsx
   <ProductionEntryForm
     farmId={farmId}
     animals={animals}
     onSuccess={onSuccess}
   />
   ```
   
   Use:
   ```tsx
   <RecordProductionModal
     isOpen={isOpen}
     onClose={onClose}
     farmId={farmId}
     animals={animals}
     settings={productionSettings}
     onSuccess={onSuccess}
   />
   ```

### Production Records Table - Final Schema:

**Columns**:
- `id` (uuid, primary key)
- `animal_id` (uuid, foreign key to animals)
- `farm_id` (uuid, foreign key to farms)
- `record_date` (date)
- `milk_volume` (numeric, liters)
- `milking_session` (text) - NEW
- `milk_safety_status` (enum: safe, unsafe_health, unsafe_colostrum)
- `temperature` (numeric) - NEW
- `mastitis_test_performed` (boolean) - NEW
- `mastitis_result` (enum: negative, mild, severe) - NEW
- `affected_quarters` (text[]) - NEW
- `fat_content` (numeric, %)
- `protein_content` (numeric, %)
- `somatic_cell_count` (integer)
- `lactose_content` (numeric, %) - NEW
- `ph_level` (numeric) - NEW
- `notes` (text)
- `recorded_by` (uuid, foreign key to auth.users) - NEW
- `created_at` (timestamp)
- `updated_at` (timestamp) - NEW

**Indexes**:
- idx_production_records_animal_id
- idx_production_records_date
- idx_production_records_milking_session (NEW)
- idx_production_records_recorded_by (NEW)
- idx_production_records_session_date (NEW)

### Data Flow:

1. User opens production modal from dashboard/animals page
2. Selects recording method (Individual or Group)
3. For Individual: Select animal → Record data
4. For Group: Select group → Select animal from group → Record data
5. Form validates all inputs against production settings
6. Data sent to POST /api/production with:
   - farm_id (verified server-side)
   - All production fields
   - recorded_by (set to user.id)
7. Record stored in production_records table
8. Daily summary updated automatically

### Form Fields Captured:

**Core Recording**:
- animal_id, record_date, milking_session
- milk_volume (required)
- milk_safety_status (required)

**Health Monitoring**:
- temperature (optional, 35-41°C range)
- mastitis_test_performed (optional, boolean)
- mastitis_result (optional, if test performed)
- affected_quarters (optional, array of quarter IDs)

**Quality Metrics**:
- fat_content (optional, 0-15%)
- protein_content (optional, 0-10%)
- somatic_cell_count (optional)
- lactose_content (optional, 0-10%) - NEW
- ph_level (optional, 0-14) - NEW

**Additional**:
- notes (optional, free text)

### Validation Rules:

- Temperature: 35-41°C (physiological range)
- Fat content: 0-15%
- Protein content: 0-10%
- Lactose: 0-10%
- pH level: 0-14
- Somatic cell count: 0-9,999,999
- Milk volume: > 0 liters

### RLS Policies Applied:

1. Users can view production records for their farm
2. Users can create production records for their farm (recorded_by must be current user)
3. Users can update their own production records
4. Users can delete their own production records

All policies check farm_id against user_roles table for multi-tenant safety.
