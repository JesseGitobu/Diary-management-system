# Vaccination Diseases Management System

## Overview

The Vaccination Diseases Management System provides a comprehensive solution for tracking and managing vaccination protocols for dairy animals. It adheres to Codd's DBMS normalization rules (1NF, 2NF, 3NF) and implements multi-layered security through Row-Level Security (RLS), input validation, and proper authorization checks.

## Architecture

### Database Layer (`supabase/migrations/013_create_farm_vaccination_diseases.sql`)

**Table: `farm_vaccination_diseases`**

#### Design Principles (Codd's Rules Compliance)

1. **1NF (First Normal Form)**: All attributes contain atomic values
   - Disease name, vaccine name, and other fields store single values
   - No repeating groups or multivalued attributes
   - Booster settings are normalized - separate fields with CHECK constraint logic

2. **2NF (Second Normal Form)**: Non-key attributes depend fully on the entire primary key
   - Primary key: `id`
   - All attributes depend entirely on the vaccination disease entity
   - No partial dependencies on composite keys

3. **3NF (Third Normal Form)**: Non-key attributes don't depend on other non-key attributes
   - No transitive dependencies
   - Derived values (like calculated next dose dates) are NOT stored
   - Farm_id maintains referential integrity through FK constraints

#### Data Security Features

- **Row-Level Security (RLS)**: Four policies control data access:
  - `SELECT`: Users see only diseases from farms they have access to
  - `INSERT`: Only farm_owner, farm_manager, veterinarian roles can create
  - `UPDATE`: Only authorized roles can modify diseases
  - `DELETE`: Only farm owners can delete (soft delete via is_active flag preferred)

- **Referential Integrity**: Foreign keys with CASCADE delete ensure data consistency
- **Domain Constraints**: CHECK constraints enforce business rules
  - Vaccination interval must be positive
  - Cost must be non-negative
  - Booster intervals required when booster_required = TRUE
  - Temporal consistency (created_at ≤ updated_at)

#### Indexes for Performance

```sql
-- Farm-based queries (multi-tenant isolation)
idx_farm_vaccination_diseases_farm_id(farm_id)

-- Filtering active diseases
idx_farm_vaccination_diseases_active(farm_id, is_active)

-- Disease name searches
idx_farm_vaccination_diseases_name(farm_id, LOWER(name))

-- Time-series queries
idx_farm_vaccination_diseases_created_at(farm_id, created_at DESC)

-- Vaccine tracking
idx_farm_vaccination_diseases_vaccine(farm_id, vaccine_name)
```

### Application Layer

#### Database Functions (`src/lib/database/vaccination-settings.ts`)

All database operations are centralized with validation and error handling:

```typescript
// Get all diseases for a farm
getVaccinationDiseases(farmId: string)

// Get single disease
getVaccinationDiseaseById(farmId: string, diseaseId: string)

// Create new disease with validation
createVaccinationDisease(farmId: string, diseaseData: VaccinationDiseaseInput, userId: string)

// Update disease with partial updates
updateVaccinationDisease(farmId: string, diseaseId: string, diseaseData: Partial<VaccinationDiseaseInput>)

// Soft or hard delete
deleteVaccinationDisease(farmId: string, diseaseId: string, hardDelete?: boolean)

// Get statistics for dashboards
getVaccinationDiseaseStats(farmId: string)

// Bulk operations
bulkUpdateVaccinationDiseaseStatus(farmId: string, diseaseIds: string[], isActive: boolean)
```

**Validation**:
```typescript
function validateVaccinationDiseaseInput(data: Partial<VaccinationDiseaseInput>): {
  valid: boolean
  error?: string
}
```

Validates:
- Required fields (disease_name, vaccine_name)
- Numeric constraints (intervals > 0, age >= 0, cost >= 0)
- Booster logic (interval required when booster_required = TRUE)
- Valid administration routes
- Data trimming (removes whitespace)

#### API Endpoints (`src/app/api/settings/vaccination-diseases/route.ts`)

**GET /api/settings/vaccination-diseases**
- Query params: `farmId` (required), `action` (optional: 'stats')
- Response: Array of vaccination diseases or statistics
- Authorization: Farm access verification + RLS

**POST /api/settings/vaccination-diseases**
- Create new vaccination disease
- Required roles: farm_owner, farm_manager, veterinarian
- Tracks `created_by` for audit trail

**PUT /api/settings/vaccination-diseases**
- Update single disease or bulk operations
- Bulk action: `action=bulkUpdateStatus` with `diseaseIds` and `isActive`
- Single update: Include `diseaseId` and `diseaseData`

**DELETE /api/settings/vaccination-diseases**
- Soft delete (default): Sets `is_active = FALSE`
- Hard delete (`hardDelete=true`): Permanent deletion (farm_owner only)
- Audit trail maintained through timestamps

#### UI Component (`src/components/settings/health-breeding/VaccinationDiseasesManager.tsx`)

**Features**:
- Add/Edit/Delete vaccination diseases
- Inline form for creating/editing
- Active/Inactive disease lists
- Cost tracking in KES
- Booster schedule management
- Real-time validation feedback
- Toast notifications for all operations

**State Management**:
- Local state for form data
- Automatic API sync on save
- Empty state guidance
- Loading states with disabled UI during operations

## Usage Guide

### For End Users

1. **Navigate to Settings**
   - Dashboard → Settings → Health & Breeding → Health Tab

2. **Add a Vaccination Disease**
   - Click "Add Disease" button
   - Fill in disease details:
     - Disease name (e.g., "Brucellosis")
     - Scientific name (optional)
     - Vaccine name (e.g., "Brucella S19")
     - First vaccination age (in months)
     - Vaccination interval (in months)
     - Route of administration
     - Cost in KES
     - Booster settings (if applicable)
   - Click "Save Disease"

3. **Edit a Disease**
   - Click the edit icon on active disease card
   - Modify fields as needed
   - Click "Save Disease"

4. **Deactivate a Disease**
   - Click the delete icon to soft-delete
   - Disease moves to "Inactive" section
   - Can be reactivated by editing and activating

### For Developers

#### Integrating Vaccination Diseases into Other Features

1. **Fetch vaccination schedule for an animal**:
```typescript
import { getVaccinationDiseases } from '@/lib/database/vaccination-settings'

const { data: diseases } = await getVaccinationDiseases(farmId)
// Use data to create vaccination reminders
```

2. **Display in health records form**:
```typescript
const { data: diseases } = await getVaccinationDiseases(farmId)
// Map diseases to select options for vaccination records
```

3. **Calculate vaccination costs**:
```typescript
const { stats } = await getVaccinationDiseaseStats(farmId)
// Total cost = sum(disease.cost_kes for disease in diseases)
```

4. **Create vaccination reminders**:
```typescript
// Use age_at_first_vaccination_months and vaccination_interval_months
// to calculate next due date for each animal
const nextDueDate = new Date()
nextDueDate.setMonth(nextDueDate.getMonth() + disease.vaccination_interval_months)
```

## Data Model

### VaccinationDisease Interface

```typescript
interface VaccinationDisease {
  id: string                                    // UUID PK
  farm_id: string                              // FK to farms
  name: string                                 // Common name (non-empty)
  scientific_name?: string                     // Optional scientific name
  vaccine_name: string                         // Product name (non-empty)
  age_at_first_vaccination_months: number      // >= 0
  vaccination_interval_months: number          // > 0
  booster_required: boolean                    // TRUE/FALSE flag
  booster_interval_months?: number             // Required if booster_required=TRUE, > 0
  administered_via: VaccinationRoute           // IM|SC|Intranasal|Oral
  cost_kes: number                             // >= 0, numeric precision
  is_active: boolean                           // Soft delete flag
  notes?: string                               // Optional notes
  created_by?: string                          // FK to auth.users
  created_at?: string                          // ISO timestamp
  updated_at?: string                          // ISO timestamp
}

type VaccinationRoute = 'intramuscular' | 'subcutaneous' | 'intranasal' | 'oral'
```

## Security & Access Control

### Role-Based Access

| Role | SELECT | INSERT | UPDATE | DELETE (Soft) | DELETE (Hard) |
|------|--------|--------|--------|---------------|---------------|
| Farm Owner | ✓ | ✓ | ✓ | ✓ | ✓ |
| Farm Manager | ✓ | ✓ | ✓ | ✓ | ✗ |
| Veterinarian | ✓ | ✓ | ✓ | ✓ | ✗ |
| Farm Worker | ✓ | ✗ | ✗ | ✗ | ✗ |
| Other Users | ✗ | ✗ | ✗ | ✗ | ✗ |

### Security Layers

1. **Authentication**: User must be logged in (getCurrentUser)
2. **Authorization**: User must have farm access (getUserRole)
3. **Role Validation**: Specific roles required for modifications
4. **RLS Policies**: Database-level enforcement (cannot be bypassed)
5. **Input Validation**: Server-side validation of all inputs
6. **Audit Trail**: created_by and timestamps for all records

## Error Handling

### Validation Errors (400 Bad Request)

```json
{
  "error": "Disease name is required and cannot be empty"
}
```

### Authorization Errors (403 Forbidden)

```json
{
  "error": "You do not have permission to create vaccination diseases for this farm"
}
```

### Not Found Errors (404 Not Found)

```json
{
  "error": "Vaccination disease not found or you do not have access"
}
```

### Server Errors (500 Internal Server Error)

```json
{
  "error": "Internal server error"
}
```

## Database Constraints Summary

| Constraint | Type | Purpose |
|-----------|------|---------|
| PK (id) | PRIMARY KEY | Unique identification |
| FK (farm_id) | FOREIGN KEY CASCADE | Multi-tenant isolation |
| FK (created_by) | FOREIGN KEY SET NULL | Audit trail |
| ck_disease_name_not_empty | CHECK | Require name |
| ck_vaccine_name_not_empty | CHECK | Require vaccine |
| ck_vaccination_interval_positive | CHECK | Interval > 0 |
| ck_age_at_first_vaccination_non_negative | CHECK | Age >= 0 |
| ck_booster_interval_validation | CHECK | Booster logic |
| ck_created_at_not_future | CHECK | Temporal integrity |
| ck_updated_at_not_future | CHECK | Temporal integrity |
| ck_temporal_consistency | CHECK | updated_at >= created_at |

## Performance Considerations

1. **Index Strategy**: Multi-field indexes on common query patterns
2. **Query Optimization**: Always filter by farm_id first (sargable)
3. **Pagination**: Consider adding for large disease lists
4. **Caching**: Consider caching disease lists per farm in memory
5. **Batch Operations**: Use bulkUpdateVaccinationDiseaseStatus for multiple updates

## Future Enhancements

1. **Vaccination Schedule Integration**: Auto-generate schedules for animals based on diseases
2. **Batch Vaccinations**: Group animals for vaccination campaigns
3. **Vaccine Inventory**: Track vaccine stock and expiration dates
4. **Compliance Reporting**: Generate reports on vaccination compliance
5. **Mobile App Support**: Optimize for offline access
6. **Multi-language Support**: Localize disease and vaccine names
7. **Custom Fields**: Allow farms to add custom vaccine attributes
8. **Historical Tracking**: Archive old disease configurations

## Deployment Checklist

- [ ] Run migration: `013_create_farm_vaccination_diseases.sql`
- [ ] Deploy database functions: `vaccination-settings.ts`
- [ ] Deploy API endpoints: `vaccination-diseases/route.ts`
- [ ] Update UI component with API integration
- [ ] Test CREATE, READ, UPDATE, DELETE operations
- [ ] Verify RLS policies work correctly
- [ ] Test authorization for different roles
- [ ] Verify error handling and user feedback
- [ ] Load test with large disease lists
- [ ] Update API documentation
- [ ] Brief team on new feature
