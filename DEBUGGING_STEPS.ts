// ============================================================================
// DEBUGGING GUIDE: Animal Data Retrieval Issues
// ============================================================================
// Add this file to help diagnose data retrieval problems

// Step 1: Add console logging to getAnimalById function
// File: src/lib/database/animals.ts

/*
Add this after the Supabase query:

  if (error) {
    console.error('Error fetching animal:', error)
    return null
  }
  
  if (!data) {
    console.warn('No data returned for animal:', animalId)
    return null
  }
  
  // ADD THESE DEBUG LOGS:
  console.log('=== ANIMAL DATA DEBUG ===')
  console.log('Animal ID:', animalId)
  console.log('Raw data keys:', Object.keys(data))
  console.log('Full raw data:', JSON.stringify(data, null, 2))
  
  // Check specific relationships
  console.log('--- PURCHASE DATA ---')
  console.log('Purchase array:', data.purchase)
  console.log('Purchase[0]:', data.purchase?.[0])
  
  console.log('--- LACTATION DATA ---')
  console.log('Lactation array:', data.lactation)
  console.log('Lactation[0]:', data.lactation?.[0])
  console.log('Lactation number value:', data.lactation?.[0]?.lactation_number)
  
  console.log('--- WEIGHT DATA ---')
  console.log('Weights array:', data.weights)
  console.log('Weight[0]:', data.weights?.[0])
  
  // Check FK relationships
  console.log('--- RELATIONSHIPS ---')
  console.log('Mother FK:', data.mother)
  console.log('Father FK:', data.father)
  console.log('Calf record:', data.calfRecord)
  console.log('=== END DEBUG ===')
*/

// Step 2: Run these diagnostic queries in Supabase SQL Editor
// ============================================================================

// QUERY A: Check if your farm has any data at all
// Copy this and replace YOUR_FARM_ID_HERE with an actual farm ID from your database
/*
SELECT 
  'Animals' as table_name, 
  COUNT(*) as record_count
FROM animals 
WHERE farm_id = 'YOUR_FARM_ID_HERE'
UNION ALL
SELECT 'Purchases', COUNT(*)
FROM animal_purchases 
WHERE farm_id = 'YOUR_FARM_ID_HERE'
UNION ALL
SELECT 'Lactation Records', COUNT(*)
FROM lactation_cycle_records 
WHERE farm_id = 'YOUR_FARM_ID_HERE'
UNION ALL
SELECT 'Calving Records', COUNT(*)
FROM calving_records 
WHERE farm_id = 'YOUR_FARM_ID_HERE';
*/

// QUERY B: Check a specific animal with all data
// Replace YOUR_ANIMAL_ID_HERE with an actual animal ID
/*
SELECT 
  a.id,
  a.tag_number,
  a.name,
  a.animal_source,
  a.production_status,
  -- Purchase data
  ap.purchase_date,
  ap.purchase_price,
  ap.farm_seller_name,
  ap.dam_tag_at_origin,
  ap.sire_tag_or_semen_code,
  -- Lactation data
  lcr.lactation_number,
  lcr.start_date,
  lcr.peak_yield_litres,
  -- Weight data
  awr.weight_kg
FROM animals a
LEFT JOIN animal_purchases ap ON a.id = ap.animal_id
LEFT JOIN lactation_cycle_records lcr 
  ON a.id = lcr.animal_id 
  ORDER BY lcr.created_at DESC
  LIMIT 1
LEFT JOIN animal_weight_records awr 
  ON a.id = awr.animal_id 
  ORDER BY awr.weight_date DESC
  LIMIT 1
WHERE a.id = 'YOUR_ANIMAL_ID_HERE';
*/

// QUERY C: Check for RLS policy issues
/*
-- This query will fail if RLS policies are blocking you
SELECT COUNT(*) FROM animals;
SELECT COUNT(*) FROM animal_purchases;
SELECT COUNT(*) FROM lactation_cycle_records;
*/

// Step 3: Browser Console Debugging
// ============================================================================
// Open browser DevTools > Console (F12)
// Look for the debug logs from Step 1

// Common issues to look for:
// 1. purchase: null or []
//    -> Purchase data doesn't exist for this animal
//    -> OR animal_id FK is not matching

// 2. lactation: null or []
//    -> No lactation records exist
//    -> OR lactation records were created without actual_end_date (still valid)

// 3. Data appears in logs but not in UI
//    -> Component might not be rendering correctly
//    -> Check AnimalBasicInfo.tsx for conditional rendering

// Step 4: Check RLS Policies (Row Level Security)
// ============================================================================
// Go to Supabase Dashboard > Database > animals > RLS Policies
// 
// For each table (animals, animal_purchases, lactation_cycle_records):
// 1. Check if RLS is enabled (switch should be ON)
// 2. Check if policies exist for:
//    - SELECT: Check farm_id and auth.uid() match
//    - INSERT: Should allow creation
//    - UPDATE: Should allow updates to own farm
//    - DELETE: If applicable
//
// Common RLS issues:
// - farm_id mismatch between tables
// - auth.uid() change during session
// - Policy condition preventing access

// Step 5: Network Request Inspection
// ============================================================================
// 1. Open browser DevTools > Network tab
// 2. Go to the animal detail page
// 3. Look for requests to Supabase (usually hostname: project.supabase.co)
// 4. Click on the Supabase requests and check:
//    - Status: Should be 200 (success)
//    - Response: Should show the data you're looking for
//    - Headers: Authorization token should be present
//
// If requests fail:
// - Status 403: Permission denied (RLS policy issue)
// - Status 404: Endpoint not found
// - Status 500: Server error

// Step 6: Test Data Creation Flow
// ============================================================================
// If data exists but doesn't retrieve:

// Test 1: Create a test animal with purchase data
const testAnimal = {
  id: 'test-animal-id',
  farm_id: 'your-farm-id',
  tag_number: 'TEST-001',
  animal_source: 'purchased_animal',
  gender: 'female',
  // ... other fields
};

// Then immediately query it:
//await getAnimalById('test-animal-id');
// Check console logs to see if purchase data appears

// Test 2: Check if import process is creating data correctly
// Look at: src/app/actions/import-animals.ts
// Check console logs during import to see:
// - lactation_cycle_records being created?
// - animal_purchases being created?
// - Validation errors?

// Step 7: Verify SQL Query Structure
// ============================================================================
// If Supabase queries work but mapping doesn't:

// The query structure should return:
// {
//   id: 'xxx',
//   tag_number: 'xxx',
//   ...other fields,
//   purchase: [
//     {
//       id: 'xxx',
//       purchase_date: 'xxx',
//       farm_seller_name: 'xxx',
//       // ... all purchase fields
//     }
//   ],
//   lactation: [
//     {
//       lactation_number: 1,
//       start_date: 'xxx',
//       peak_yield_litres: xxx,
//       // ... all lactation fields
//     }
//   ],
//   weights: [
//     {
//       weight_kg: xxx,
//       weight_date: 'xxx'
//     }
//   ]
// }

// If the arrays are empty or null, the data isn't in the database

// Step 8: Check Component Props
// ============================================================================
// In AnimalBasicInfo.tsx:
// 
// Add this log at the top of the component:
/*
console.log('AnimalBasicInfo received animal prop:', {
  tag: animal.tag_number,
  purchase_date: animal.purchase_date,
  purchase_price: animal.purchase_price,
  seller: animal.seller_info,
  lactation_number: animal.lactation_number,
  lactation_start: animal.lactation_start_date,
  origin_dam_tag: animal.origin_dam_tag,
  origin_sire_tag: animal.origin_sire_tag,
})
*/

// If these all show null/undefined, issue is in getAnimalById() mapping

// Step 9: Compare Data Flow
// ============================================================================
// EXPECTED FLOW:
// 1. Database has data in tables (QUERY A confirms)
// 2. Supabase query retrieves data (browser Network tab, Query B results)
// 3. Mapping extracts nested data (console logs show arrays/objects)
// 4. Component receives props (AnimalBasicInfo console logs)
// 5. UI renders data (browser shows on page)
//
// IDENTIFY WHERE FLOW BREAKS:
// - Between 1-2? SQL data exists but query returns empty
// - Between 2-3? Query works but mapping returns null
// - Between 3-4? Mapping works but props not received
// - Between 4-5? Props received but not rendering

// Step 10: Quick Fixes to Try
// ============================================================================

// Fix 1: Clear browser cache
// - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
// - Clear IndexedDB: DevTools > Application > Storage > IndexedDB > Clear

// Fix 2: Verify animal has correct data
// - Check if animal.animal_source === 'purchased_animal'
// - Check if lactation cycle exists for the animal
// - Check if purchase record exists for the animal

// Fix 3: Check for TypeScript type issues
// - Verify Animal type includes all new fields
// - Check no @ts-ignore comments hiding errors

// Fix 4: Verify environment variables
// - Check NEXT_PUBLIC_SUPABASE_URL is correct
// - Check NEXT_PUBLIC_SUPABASE_ANON_KEY is correct
// - Check auth token is valid
