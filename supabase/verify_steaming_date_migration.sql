-- ============================================================================
-- VERIFICATION SCRIPT: Steaming Date Migration
-- Purpose: Verify that the migration (006) completed successfully
-- Run this script in Supabase SQL Editor or psql to validate the changes
-- ============================================================================

-- ============================================================================
-- CHECK 1: Verify steaming_date column exists in pregnancy_records
-- ============================================================================
\echo '========== CHECK 1: steaming_date column in pregnancy_records =========='
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'pregnancy_records' 
  AND column_name = 'steaming_date';

-- Expected output: 1 row with:
--   column_name: steaming_date
--   data_type: date
--   is_nullable: YES

\echo ''

-- ============================================================================
-- CHECK 2: Verify steaming_date column REMOVED from calving_records
-- ============================================================================
\echo '========== CHECK 2: steaming_date column removed from calving_records =========='
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '❌ FAILED - steaming_date still exists in calving_records'
    ELSE '✅ PASSED - steaming_date successfully removed from calving_records'
  END as status
FROM information_schema.columns
WHERE table_name = 'calving_records' 
  AND column_name = 'steaming_date';

\echo ''

-- ============================================================================
-- CHECK 3: Count migrated steaming_date values
-- ============================================================================
\echo '========== CHECK 3: Steaming dates migrated to pregnancy_records =========='
SELECT 
  COUNT(*) as total_steaming_dates,
  COUNT(DISTINCT farm_id) as farms_affected,
  COUNT(DISTINCT animal_id) as animals_with_steaming_dates,
  COUNT(DISTINCT service_record_id) as service_records_with_steaming_dates,
  MIN(steaming_date) as earliest_steaming_date,
  MAX(steaming_date) as latest_steaming_date
FROM public.pregnancy_records
WHERE steaming_date IS NOT NULL;

\echo 'Sample of migrated records:'
SELECT 
  pr.id,
  pr.animal_id,
  pr.service_record_id,
  pr.pregnancy_status,
  pr.steaming_date,
  pr.confirmed_date,
  pr.expected_calving_date,
  cr.id as linked_calving_record_id
FROM public.pregnancy_records pr
LEFT JOIN public.calving_records cr ON pr.id = cr.pregnancy_record_id
WHERE pr.steaming_date IS NOT NULL
LIMIT 5;

\echo ''

-- ============================================================================
-- CHECK 4: Verify NO orphaned calving_records (all have calving_date)
-- ============================================================================
\echo '========== CHECK 4: No orphaned calving_records =========='
SELECT 
  COUNT(*) as orphaned_calving_records
FROM public.calving_records
WHERE calving_date IS NULL;

-- Expected output: 0

\echo 'Total calving_records in database:'
SELECT COUNT(*) as total_calving_records FROM public.calving_records;

\echo ''

-- ============================================================================
-- CHECK 5: Verify relationship integrity (all calving_records link to pregnancy_records)
-- ============================================================================
\echo '========== CHECK 5: Relationship integrity =========='
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '❌ FAILED - Found orphaned calving_records'
    ELSE '✅ PASSED - All calving_records link to valid pregnancy_records'
  END as status,
  COUNT(*) as orphaned_count
FROM public.calving_records cr
LEFT JOIN public.pregnancy_records pr ON cr.pregnancy_record_id = pr.id
WHERE pr.id IS NULL;

\echo ''

-- ============================================================================
-- CHECK 6: Verify indexes were created correctly
-- ============================================================================
\echo '========== CHECK 6: New index on pregnancy_records.steaming_date =========='
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'pregnancy_records'
  AND indexname = 'idx_pregnancy_records_steaming_date';

-- Expected output: 1 row with new index definition

\echo ''

-- ============================================================================
-- CHECK 7: Verify old indexes from calving_records were removed
-- ============================================================================
\echo '========== CHECK 7: Old steaming_date indexes removed from calving_records =========='
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '❌ FAILED - Old indexes still exist'
    ELSE '✅ PASSED - All old steaming_date indexes removed'
  END as status,
  COUNT(*) as old_indexes_remaining
FROM pg_indexes
WHERE tablename = 'calving_records'
  AND indexname LIKE '%steaming%';

\echo ''

-- ============================================================================
-- CHECK 8: Data consistency - Verify migration didn't lose data
-- ============================================================================
\echo '========== CHECK 8: Data consistency =========='
\echo 'Breaking down steaming_date distribution:'
SELECT 
  EXTRACT(YEAR FROM steaming_date)::integer as year,
  COUNT(*) as count
FROM public.pregnancy_records
WHERE steaming_date IS NOT NULL
GROUP BY EXTRACT(YEAR FROM steaming_date)
ORDER BY year DESC;

\echo ''

-- ============================================================================
-- CHECK 9: Constraint validation
-- ============================================================================
\echo '========== CHECK 9: Constraint validation =========='
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'pregnancy_records'
  AND constraint_name LIKE '%steaming%';

\echo 'Sample of pregnancy_records with steaming_date validation:'
SELECT 
  pr.id,
  pr.confirmed_date,
  pr.steaming_date,
  CASE 
    WHEN pr.steaming_date >= pr.confirmed_date OR pr.confirmed_date IS NULL THEN '✅ Valid'
    ELSE '❌ Invalid - steaming_date before confirmed_date'
  END as validation_status
FROM public.pregnancy_records pr
WHERE pr.steaming_date IS NOT NULL
LIMIT 5;

\echo ''

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================
\echo '========== MIGRATION SUMMARY REPORT =========='

WITH migration_stats AS (
  SELECT 
    'steaming_date values migrated' as metric,
    COUNT(*) as value
  FROM public.pregnancy_records
  WHERE steaming_date IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'total pregnancy_records',
    COUNT(*)
  FROM public.pregnancy_records
  
  UNION ALL
  
  SELECT 
    'total calving_records',
    COUNT(*)
  FROM public.calving_records
  
  UNION ALL
  
  SELECT 
    'calving_records with invalid calving_date',
    COUNT(*)
  FROM public.calving_records
  WHERE calving_date IS NULL
  
  UNION ALL
  
  SELECT 
    'orphaned calving_records (no pregnancy_record)',
    COUNT(*)
  FROM public.calving_records cr
  LEFT JOIN public.pregnancy_records pr ON cr.pregnancy_record_id = pr.id
  WHERE pr.id IS NULL
)
SELECT * FROM migration_stats;

\echo ''
\echo '========== MIGRATION VERIFICATION COMPLETE =========='
\echo 'If all CHECKs show ✅ PASSED, the migration was successful!'
\echo 'If any CHECKs show ❌ FAILED, review the migration logs and rollback if needed.'
