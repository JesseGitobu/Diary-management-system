-- ============================================================================
-- SUPABASE DIAGNOSTIC QUERIES FOR ANIMAL DATA RETRIEVAL
-- ============================================================================
-- Run these queries in Supabase SQL Editor to diagnose data retrieval issues
-- Replace YOUR_FARM_ID with an actual farm ID
-- Replace YOUR_ANIMAL_ID with an actual animal ID

-- ============================================================================
-- 1. CHECK IF DATA EXISTS IN MAIN TABLES
-- ============================================================================

-- 1.1 List all animals in your farm
SELECT id, tag_number, name, animal_source, production_status, created_at
FROM animals
WHERE farm_id = 'YOUR_FARM_ID'
ORDER BY created_at DESC
LIMIT 10;

-- 1.2 Check how many animals exist per farm
SELECT farm_id, COUNT(*) as animal_count
FROM animals
GROUP BY farm_id
ORDER BY animal_count DESC;

-- ============================================================================
-- 2. CHECK PURCHASE DATA
-- ============================================================================

-- 2.1 Check all purchase records
SELECT 
  ap.id,
  ap.animal_id,
  ap.farm_id,
  ap.purchase_date,
  ap.purchase_price,
  ap.farm_seller_name,
  ap.farm_seller_contact,
  ap.previous_farm_tag,
  ap.dam_tag_at_origin,
  ap.dam_name_at_origin,
  ap.sire_tag_or_semen_code,
  ap.sire_name_or_semen_source,
  a.tag_number as animal_tag
FROM animal_purchases ap
LEFT JOIN animals a ON ap.animal_id = a.id
WHERE ap.farm_id = 'YOUR_FARM_ID'
ORDER BY ap.created_at DESC;

-- 2.2 Check if a specific animal has purchase data
SELECT 
  ap.*,
  a.tag_number,
  a.name
FROM animal_purchases ap
LEFT JOIN animals a ON ap.animal_id = a.id
WHERE ap.animal_id = 'YOUR_ANIMAL_ID';

-- 2.3 Check for orphaned purchase records (animal doesn't exist)
SELECT 
  ap.id,
  ap.animal_id,
  ap.farm_seller_name,
  a.id as animal_exists
FROM animal_purchases ap
LEFT JOIN animals a ON ap.animal_id = a.id
WHERE a.id IS NULL;

-- ============================================================================
-- 3. CHECK LACTATION DATA
-- ============================================================================

-- 3.1 Check all lactation records in your farm
SELECT 
  lcr.id,
  lcr.animal_id,
  lcr.lactation_number,
  lcr.start_date,
  lcr.expected_end_date,
  lcr.actual_end_date,
  lcr.status,
  lcr.peak_yield_litres,
  a.tag_number,
  a.name,
  a.production_status
FROM lactation_cycle_records lcr
LEFT JOIN animals a ON lcr.animal_id = a.id
WHERE lcr.farm_id = 'YOUR_FARM_ID'
ORDER BY lcr.created_at DESC
LIMIT 20;

-- 3.2 Check lactation records for a specific animal (all statuses)
SELECT 
  id,
  animal_id,
  lactation_number,
  status,
  start_date,
  expected_end_date,
  actual_end_date,
  peak_yield_litres,
  total_yield_litres,
  created_at
FROM lactation_cycle_records
WHERE animal_id = 'YOUR_ANIMAL_ID'
ORDER BY created_at DESC;

-- 3.3 Check lactation status distribution
SELECT 
  farm_id,
  status,
  COUNT(*) as count
FROM lactation_cycle_records
WHERE farm_id = 'YOUR_FARM_ID'
GROUP BY farm_id, status;

-- 3.4 Check animals with production_status but NO lactation records
SELECT 
  a.id,
  a.tag_number,
  a.name,
  a.production_status,
  COUNT(lcr.id) as lactation_count
FROM animals a
LEFT JOIN lactation_cycle_records lcr ON a.id = lcr.animal_id
WHERE a.farm_id = 'YOUR_FARM_ID'
  AND a.production_status IN ('served', 'lactating', 'steaming_dry_cows', 'open_culling_dry_cows', 'dry')
GROUP BY a.id, a.tag_number, a.name, a.production_status
HAVING COUNT(lcr.id) = 0
LIMIT 20;

-- ============================================================================
-- 4. FULL ANIMAL DETAIL QUERY (matches getAnimalById logic)
-- ============================================================================

-- 4.1 Complete animal detail with all relationships
SELECT 
  -- Main animal data
  a.id,
  a.tag_number,
  a.name,
  a.animal_source,
  a.production_status,
  a.health_status,
  a.breed,
  a.gender,
  a.birth_date,
  
  -- Latest weight
  (SELECT weight_kg FROM animal_weight_records 
   WHERE animal_id = a.id 
   ORDER BY weight_date DESC LIMIT 1) as latest_weight,
  
  -- Latest lactation (any status)
  (SELECT lactation_number FROM lactation_cycle_records 
   WHERE animal_id = a.id 
   ORDER BY created_at DESC LIMIT 1) as lactation_number,
  
  (SELECT start_date FROM lactation_cycle_records 
   WHERE animal_id = a.id 
   ORDER BY created_at DESC LIMIT 1) as lactation_start_date,
  
  (SELECT expected_end_date FROM lactation_cycle_records 
   WHERE animal_id = a.id 
   ORDER BY created_at DESC LIMIT 1) as lactation_expected_end,
  
  (SELECT peak_yield_litres FROM lactation_cycle_records 
   WHERE animal_id = a.id 
   ORDER BY created_at DESC LIMIT 1) as current_daily_production,
  
  -- Purchase info
  (SELECT purchase_date FROM animal_purchases 
   WHERE animal_id = a.id LIMIT 1) as purchase_date,
  
  (SELECT purchase_price FROM animal_purchases 
   WHERE animal_id = a.id LIMIT 1) as purchase_price,
  
  (SELECT farm_seller_name FROM animal_purchases 
   WHERE animal_id = a.id LIMIT 1) as seller_name,
  
  (SELECT farm_seller_contact FROM animal_purchases 
   WHERE animal_id = a.id LIMIT 1) as seller_contact,
  
  (SELECT previous_farm_tag FROM animal_purchases 
   WHERE animal_id = a.id LIMIT 1) as previous_farm_tag,
  
  (SELECT dam_tag_at_origin FROM animal_purchases 
   WHERE animal_id = a.id LIMIT 1) as origin_dam_tag,
  
  (SELECT dam_name_at_origin FROM animal_purchases 
   WHERE animal_id = a.id LIMIT 1) as origin_dam_name,
  
  (SELECT sire_tag_or_semen_code FROM animal_purchases 
   WHERE animal_id = a.id LIMIT 1) as origin_sire_tag,
  
  (SELECT sire_name_or_semen_source FROM animal_purchases 
   WHERE animal_id = a.id LIMIT 1) as origin_sire_name
  
FROM animals a
WHERE a.id = 'YOUR_ANIMAL_ID';

-- ============================================================================
-- 5. CHECK RELATIONSHIP INTEGRITY
-- ============================================================================

-- 5.1 Check if animal_purchases foreign keys are valid
SELECT 
  COUNT(*) as total_purchases,
  SUM(CASE WHEN animal_id IS NOT NULL THEN 1 ELSE 0 END) as has_animal_fk,
  SUM(CASE WHEN a.id IS NULL THEN 1 ELSE 0 END) as orphaned_purchases
FROM animal_purchases ap
LEFT JOIN animals a ON ap.animal_id = a.id;

-- 5.2 Check if lactation_cycle_records foreign keys are valid
SELECT 
  COUNT(*) as total_lactations,
  SUM(CASE WHEN animal_id IS NOT NULL THEN 1 ELSE 0 END) as has_animal_fk,
  SUM(CASE WHEN a.id IS NULL THEN 1 ELSE 0 END) as orphaned_lactations
FROM lactation_cycle_records lcr
LEFT JOIN animals a ON lcr.animal_id = a.id;

-- ============================================================================
-- 6. DEBUG: PURCHASED ANIMALS ANALYSIS
-- ============================================================================

-- 6.1 All purchased animals with their purchase details
SELECT 
  a.id,
  a.tag_number,
  a.name,
  a.animal_source,
  a.production_status,
  ap.purchase_date,
  ap.purchase_price,
  ap.farm_seller_name,
  ap.previous_farm_tag,
  ap.dam_tag_at_origin,
  ap.sire_tag_or_semen_code
FROM animals a
FULL OUTER JOIN animal_purchases ap ON a.id = ap.animal_id
WHERE a.farm_id = 'YOUR_FARM_ID' 
  AND a.animal_source = 'purchased_animal'
ORDER BY a.created_at DESC;

-- 6.2 Count purchased vs born animals
SELECT 
  a.animal_source,
  COUNT(*) as total,
  SUM(CASE WHEN ap.id IS NOT NULL THEN 1 ELSE 0 END) as with_purchase_data,
  SUM(CASE WHEN ap.id IS NULL THEN 1 ELSE 0 END) as without_purchase_data
FROM animals a
LEFT JOIN animal_purchases ap ON a.id = ap.animal_id
WHERE a.farm_id = 'YOUR_FARM_ID'
GROUP BY a.animal_source;

-- ============================================================================
-- 7. DEBUG: LACTATING ANIMALS ANALYSIS
-- ============================================================================

-- 7.1 Animals with lactating production status and their lactation records
SELECT 
  a.id,
  a.tag_number,
  a.name,
  a.production_status,
  COUNT(lcr.id) as lactation_record_count,
  MAX(lcr.lactation_number) as highest_lactation_number,
  MAX(lcr.start_date) as latest_start_date
FROM animals a
LEFT JOIN lactation_cycle_records lcr ON a.id = lcr.animal_id
WHERE a.farm_id = 'YOUR_FARM_ID'
  AND a.production_status IN ('served', 'lactating', 'steaming_dry_cows', 'open_culling_dry_cows', 'dry')
GROUP BY a.id, a.tag_number, a.name, a.production_status
ORDER BY a.created_at DESC;

-- ============================================================================
-- 8. QUICK STATUS CHECK
-- ============================================================================

-- 8.1 Quick summary of data in your farm
SELECT 
  'Total Animals' as metric, COUNT(DISTINCT a.id)::text as value
FROM animals a
WHERE a.farm_id = 'YOUR_FARM_ID'
UNION ALL
SELECT 'Purchased Animals', COUNT(DISTINCT ap.animal_id)::text
FROM animal_purchases ap
WHERE ap.farm_id = 'YOUR_FARM_ID'
UNION ALL
SELECT 'With Lactation Records', COUNT(DISTINCT lcr.animal_id)::text
FROM lactation_cycle_records lcr
WHERE lcr.farm_id = 'YOUR_FARM_ID'
UNION ALL
SELECT 'Lactating Status', COUNT(*)::text
FROM animals a
WHERE a.farm_id = 'YOUR_FARM_ID' AND a.production_status = 'lactating'
UNION ALL
SELECT 'Served Status', COUNT(*)::text
FROM animals a
WHERE a.farm_id = 'YOUR_FARM_ID' AND a.production_status = 'served'
UNION ALL
SELECT 'Steaming Dry Status', COUNT(*)::text
FROM animals a
WHERE a.farm_id = 'YOUR_FARM_ID' AND a.production_status = 'steaming_dry_cows';

-- ============================================================================
-- 9. TROUBLESHOOTING: Check Supabase policies
-- ============================================================================

-- 9.1 Check if RLS policies might be blocking access
-- Note: This won't show the actual policies, but you can check in Supabase dashboard
-- Go to: Database > animals > RLS Policies
-- Go to: Database > animal_purchases > RLS Policies
-- Go to: Database > lactation_cycle_records > RLS Policies

-- Check current user's farm_id (if using auth)
-- This helps verify if RLS is filtering correctly
SELECT 
  auth.uid() as current_user_id,
  'Check if this matches expected user' as note;
