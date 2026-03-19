## Production System Migration Checklist

### Phase 1: Database & API ✅ COMPLETED
- [x] Created migration file: `019_update_production_records_with_health_quality_fields.sql`
- [x] Updated API: `POST /api/production` with comprehensive validation
- [x] Created endpoint: `GET /api/production/history`
- [x] Created endpoint: `DELETE /api/production/[id]`
- [x] All endpoints handle new fields: temperature, mastitis, lactose, pH, milking_session
- [x] Form components ready: IndividualRecordForm, GroupRecordForm, RecordProductionModal

### Phase 2: Manual Implementation - USER TODO

#### Step 1: Apply Database Migration
- [ ] Go to Supabase Dashboard
- [ ] Navigate to SQL Editor
- [ ] Run the migration: `supabase/migrations/019_update_production_records_with_health_quality_fields.sql`
- [ ] Verify no errors (should see "Migration applied successfully")
- [ ] Verify new columns exist in production_records table

#### Step 2: Regenerate TypeScript Types
After migration, regenerate types to ensure IDE support:
```bash
# Run this command in your project root
supabase gen types typescript > src/lib/supabase/types.ts
```
- [ ] Types regenerated successfully
- [ ] Check that production_records type includes all new fields

#### Step 3: Update GlobalModalWrapper.tsx
- [ ] Open: `src/components/layout/GlobalModalWrapper.tsx`
- [ ] Find the ProductionEntryForm import
- [ ] Replace with RecordProductionModal import
- [ ] Update the modal component usage (see COMPONENT_REFERENCE_UPDATES.md)
- [ ] Add productionSettings prop if not already available
- [ ] Test: Modal opens and closes correctly

#### Step 4: Update AnimalProductionRecords.tsx
- [ ] Open: `src/components/animals/AnimalProductionRecords.tsx`
- [ ] Find the ProductionEntryForm import
- [ ] Replace with RecordProductionModal import
- [ ] Update the modal component usage (see COMPONENT_REFERENCE_UPDATES.md)
- [ ] Add productionSettings prop if not already available
- [ ] Test: Modal opens from animal details and works correctly

#### Step 5: Testing - Individual Record
- [ ] Open production modal from dashboard
- [ ] Click "By Individual" tab
- [ ] Search for an animal
- [ ] Select an animal
- [ ] Fill in required fields:
  - [ ] Milk volume
  - [ ] Milking session
  - [ ] Milk safety status
- [ ] Fill in optional health fields:
  - [ ] Temperature (e.g., 38.5)
  - [ ] Mastitis test checkbox
  - [ ] If mastitis checked, select result (negative/mild/severe)
- [ ] Fill in optional quality fields:
  - [ ] Fat content
  - [ ] Protein content
  - [ ] SCC
  - [ ] Lactose
  - [ ] pH
- [ ] Add notes
- [ ] Click Save
- [ ] Verify record appears in dashboard
- [ ] Check database to confirm all fields saved

#### Step 6: Testing - Group Record
- [ ] Go to production modal
- [ ] Click "By Group" tab
- [ ] Select a milking group (if none, create one in Milking Groups Manager)
- [ ] Click Next
- [ ] See list of animals in group
- [ ] Search for an animal in the group (verify search works)
- [ ] Select the first animal
- [ ] Fill in all fields (required and optional)
- [ ] Click Save
- [ ] Verify animal marked as recorded in queue
- [ ] Select next animal
- [ ] Test "Back to Animal Selection" button
- [ ] Record multiple animals to test full flow

#### Step 7: Testing - Historical Context
- [ ] Record an animal on Day 1
- [ ] Record the same animal on Day 2
- [ ] When recording on Day 2, historical context should show:
  - [ ] Yesterday's total volume
  - [ ] Previous session volume (if any)
  - [ ] Same time yesterday volume

#### Step 8: Testing - Error Handling
- [ ] Try to save without required fields (should show errors)
- [ ] Try invalid temperature (e.g., 50°C, should reject)
- [ ] Try invalid pH (e.g., 20, should reject)
- [ ] Try negative volume (should reject)
- [ ] Verify error messages are helpful

#### Step 9: Testing - API Direct Calls (Optional)
```bash
# Test POST with all fields
curl -X POST http://localhost:3000/api/production \
  -H "Content-Type: application/json" \
  -d '{
    "farm_id": "YOUR_FARM_ID",
    "animal_id": "ANIMAL_ID",
    "record_date": "2024-03-18",
    "milk_volume": 15.5,
    "milking_session": "morning",
    "milk_safety_status": "safe",
    "temperature": 38.5,
    "mastitis_test_performed": true,
    "mastitis_result": "negative",
    "fat_content": 3.8,
    "protein_content": 3.2,
    "somatic_cell_count": 200000,
    "lactose_content": 4.7,
    "ph_level": 6.7,
    "notes": "Test record"
  }'
```

#### Step 10: Delete Old File
- [ ] Verify all tests pass
- [ ] Verify no imports of ProductionEntryForm remain
- [ ] Delete: `src/components/production/ProductionEntryForm.tsx`
- [ ] Delete: `src/components/production/ProductionRecordingPage.tsx` (optional, if not used)
- [ ] Run build to confirm no broken imports: `npm run build`

### Phase 3: Cleanup & Documentation
- [ ] Update team on new production recording system
- [ ] Test on mobile devices
- [ ] Verify performance with large animal groups
- [ ] Archive old documentation
- [ ] Add notes to PRODUCTION_SYSTEM_SUMMARY.md about go-live date

---

## Verification Checklist

### Database Level
- [ ] production_records table has 18 columns (including new ones)
- [ ] Indexes created for: animal_id, date, milking_session, recorded_by, session_date
- [ ] RLS policies active on production_records table
- [ ] Check constraints prevent invalid data

### API Level
- [ ] POST /api/production succeeds with all fields
- [ ] GET /api/production/history returns correct data
- [ ] DELETE /api/production/[id] removes records
- [ ] API validation rejects invalid data with helpful messages
- [ ] Audit trail captures recorded_by and timestamps

### Component Level
- [ ] IndividualRecordForm works independently
- [ ] GroupRecordForm shows searchable animal lists
- [ ] RecordProductionModal switches between tabs cleanly
- [ ] All dropdowns populate from settings
- [ ] Search functionality works
- [ ] Validation shows field-level errors

### End-to-End
- [ ] User can record single animal
- [ ] User can record group of animals
- [ ] Historical context loads
- [ ] Data persists and appears in dashboard
- [ ] Edit/Delete operations work
- [ ] Mobile experience is acceptable

---

## Rollback Plan (If Needed)

If something goes wrong:

1. **Database**: 
   - Recent backup should exist
   - Can revert migration if data structure wrong

2. **API**: 
   - Old code still handles basic fields
   - Can disable new fields temporarily

3. **Components**: 
   - Keep ProductionEntryForm.tsx file until fully confident
   - Can quickly revert imports if needed

---

## Support & Troubleshooting

### Common Issues

**"Unknown columns" error in API**
- Migration may not have run
- Check Supabase SQL Editor for errors
- Verify column names match exactly

**"Cannot find module" error**
- Make sure all imports are updated
- Check file paths are correct
- Rebuild project: `npm run build`

**Modal doesn't open**
- Check component props are passed correctly
- Verify onClose callback is set
- Check browser console for errors

**Data not saving**
- Check API response for validation errors
- Verify farm_id is passed correctly
- Check RLS policies allow inserts
- Verify recorded_by is being set

**Historical context not showing**
- Check /api/production/history endpoint
- Verify animalId, date, session params are correct
- Look for console errors in browser dev tools

---

## Timeline Estimate

- Phase 1 (Database + API): ✅ Complete
- Phase 2 (Implementation): 1-2 hours
- Testing: 2-3 hours
- Total: 3-5 hours

## Questions?

Refer to:
- PRODUCTION_SYSTEM_SUMMARY.md - Overview
- PRODUCTION_MIGRATION_GUIDE.md - Detailed guide
- COMPONENT_REFERENCE_UPDATES.md - Specific code changes
