# Distribution Channels - Complete Data Mapping Documentation

## Overview
This document outlines the complete data flow for distribution channels from form input through database storage to display.

---

## Database Schema (distribution_channels table)

### Core Fields
| Field | Type | Column Name | Notes |
|-------|------|-------------|-------|
| ID | UUID | `id` | Auto-generated, Primary Key |
| Farm | UUID | `farm_id` | Foreign key to farms table |
| Name | varchar(255) | `name` | Channel name (required) |
| Type | varchar(100) | `type` | cooperative\|processor\|direct\|retail\|other |
| Contact | varchar(20) | `contact` | Phone number (required except for 'other') |
| Contact Person | varchar(255) | `contact_person` | Person's name |
| Email | varchar(255) | `email` | Email address |
| Location | text | `location` | Geographic location |
| Payment Terms | varchar(255) | `payment_terms` | Payment schedule |
| Notes | text | `notes` | Additional notes |
| Is Active | boolean | `is_active` | Active status (default: true) |
| Price Per Liter | numeric(10,2) | `price_per_liter` | Price in KSh |
| Is Paid For | boolean | `is_paid_for` | Payment status (default: true) |
| Metadata | jsonb | `metadata` | Type-specific fields (see below) |
| Created At | timestamp | `created_at` | Creation timestamp |
| Updated At | timestamp | `updated_at` | Last update timestamp |

### Type-Specific Fields (Stored in metadata JSONB)

#### RETAIL Type
```json
{
  "storeType": "supermarket|convenience_store|kiosk|restaurant|hotel",
  "customerCount": "number string",
  "retailOutlets": "number string",
  "deliveryOptions": "string"
}
```

#### DIRECT Type
```json
{
  "salesMethod": "string",
  "customerType": "string",
  "salesFrequency": "string",
  "buyerDetails": "string"
}
```

#### OTHER Type
```json
{
  "useReason": "home|business|other",
  "customReason": "string (if useReason='other')",
  "authorizationPerson": "string"
}
```

#### COOPERATIVE & PROCESSOR Types
- No metadata fields required
- Use core fields only

---

## Data Flow: Complete Journey

### 1. FORM INPUT (ChannelManager.tsx)

#### FormData Interface
```typescript
interface FormData {
  // Core fields
  name: string
  type: 'cooperative' | 'processor' | 'direct' | 'retail' | 'other'
  contact: string
  email: string
  contactPerson: string
  pricePerLiter: string
  location: string
  paymentTerms: string
  notes: string
  isActive: boolean
  isPaidFor: boolean
  
  // Type-specific fields
  storeType?: string                  // retail only
  customerCount?: string              // retail only
  retailOutlets?: string              // retail only
  deliveryOptions?: string            // retail only
  
  salesMethod?: string                // direct only
  customerType?: string               // direct only
  salesFrequency?: string             // direct only
  buyerDetails?: string               // direct only
  
  useReason?: string                  // other only
  customReason?: string               // other only
  authorizationPerson?: string        // other only
}
```

### 2. VALIDATION (ChannelManager.tsx - validateForm)

**Common validation:**
- name: required
- contact: required (except for 'other' type)
- pricePerLiter: required (except unpaid 'other' type), must be > 0
- email: valid format (if provided)

**Type-specific validation:**

**RETAIL:**
- storeType: required

**DIRECT:**
- salesMethod: required
- customerType: required
- salesFrequency: required

**OTHER:**
- contactPerson: required
- authorizationPerson: required
- customReason: required (if useReason = 'custom')

### 3. API SUBMISSION (handleSubmit - ChannelManager.tsx)

**POST /api/distribution/channels (NEW):**
```javascript
{
  farmId,
  name,
  type,
  contact,
  email,
  contactPerson,
  pricePerLiter,
  location,
  paymentTerms,
  notes,
  isActive,
  isPaidFor,
  // Type-specific fields sent directly (API constructs metadata)
  storeType,
  customerCount,
  retailOutlets,
  deliveryOptions,
  salesMethod,
  customerType,
  salesFrequency,
  buyerDetails,
  useReason,
  customReason,
  authorizationPerson
}
```

**PUT /api/distribution/channels/[id] (EDIT):**
- Same structure as POST

### 4. API PROCESSING (channels/route.ts)

**Transformation in API:**

The API transforms form fields into database columns:

```typescript
// Field mapping
{
  farm_id: farmId,                    // required
  name: name.trim(),                  // required
  type: type,                         // required
  contact: contact?.trim() || null,   // varchar(20)
  contact_person: contactPerson?.trim() || null,
  email: email?.trim() || null,
  location: location?.trim() || null,
  payment_terms: paymentTerms || null,
  notes: notes?.trim() || null,
  is_active: isActive,
  is_paid_for: isPaidFor,
  price_per_liter: parseFloat(pricePerLiter),
  
  // Metadata constructed based on type
  metadata: {
    // Only includes fields relevant to the type
    storeType,        // if type === 'retail'
    customerCount,
    retailOutlets,
    deliveryOptions,
    
    salesMethod,      // if type === 'direct'
    customerType,
    salesFrequency,
    buyerDetails,
    
    useReason,        // if type === 'other'
    customReason,
    authorizationPerson
  }
}
```

### 5. DATABASE STORAGE

Stored in `distribution_channels` table with proper type conversions:
- price_per_liter: NUMERIC(10,2)
- is_active: BOOLEAN DEFAULT true
- is_paid_for: BOOLEAN DEFAULT true
- metadata: JSONB (indexes available via GIN)

### 6. DATA RETRIEVAL (getDistributionChannels - channels.ts)

**Database Query:**
```sql
SELECT * FROM distribution_channels 
WHERE farm_id = $1 
ORDER BY name ASC
```

**Result Mapping to DistributionChannel Interface:**
```typescript
interface DistributionChannel {
  id: channel.id                              // UUID
  name: channel.name                          // varchar
  type: channel.type                          // varchar
  contact: channel.contact                    // varchar (null safe)
  email: channel.email                        // varchar (null safe)
  contactPerson: channel.contact_person       // varchar (null safe)
  pricePerLiter: channel.price_per_liter      // numeric (null safe)
  isActive: channel.is_active                 // boolean
  location: channel.location                  // text (null safe)
  paymentTerms: channel.payment_terms         // varchar (null safe)
  notes: channel.notes                        // text (null safe)
  isPaidFor: channel.is_paid_for              // boolean (null safe)
  metadata: channel.metadata                  // JSONB object with type-specific fields
}
```

### 7. COMPONENT DISPLAY (ChannelManager.tsx - Render)

**Desktop Layout:**
- Left Column: contactPerson, email, location
- Middle Column: pricePerLiter, paymentTerms (pricing section)
- Right Column: Type-specific details from metadata via renderMetadataDetails()

**Mobile Layout:**
- Sequential sections with same data

**Type-Specific Detail Rendering (renderMetadataDetails):**

**RETAIL:**
```
Store Type: {metadata.storeType}
Daily Customers: {metadata.customerCount}
Retail Outlets: {metadata.retailOutlets}
Delivery Options: {metadata.deliveryOptions}
```

**DIRECT:**
```
Sales Method: {metadata.salesMethod}
Customer Type: {metadata.customerType}
Sales Frequency: {metadata.salesFrequency}
Buyer Details: {metadata.buyerDetails}
```

**OTHER:**
```
Use Reason: {metadata.useReason}
Custom Reason: {metadata.customReason}
Authorization Person: {metadata.authorizationPerson}
```

### 8. EDIT FLOW (handleEdit - ChannelManager.tsx)

**When editing a channel:**
1. Load complete channel object including metadata
2. Extract metadata fields and populate form
3. Reconstruct FormData object with both core and type-specific fields:

```typescript
const metadata = channel.metadata || {}

const formData = {
  // Core fields from channel
  name: channel.name,
  type: channel.type,
  contact: channel.contact || '',
  email: channel.email || '',
  contactPerson: channel.contactPerson || '',
  pricePerLiter: channel.pricePerLiter?.toString() || '',
  location: channel.location || '',
  paymentTerms: channel.paymentTerms || 'Monthly Payment',
  notes: channel.notes || '',
  isActive: channel.isActive,
  isPaidFor: channel.isPaidFor !== false,
  
  // Type-specific from metadata
  storeType: metadata.storeType || '',
  customerCount: metadata.customerCount || '',
  retailOutlets: metadata.retailOutlets || '',
  deliveryOptions: metadata.deliveryOptions || '',
  
  salesMethod: metadata.salesMethod || '',
  customerType: metadata.customerType || '',
  salesFrequency: metadata.salesFrequency || '',
  buyerDetails: metadata.buyerDetails || '',
  
  useReason: metadata.useReason || 'home',
  customReason: metadata.customReason || '',
  authorizationPerson: metadata.authorizationPerson || ''
}
```

---

## Integration with Production Page

**Page Component (src/app/dashboard/production/page.tsx):**

Fetches channels and maps them for dashboard:
```typescript
channels={channels.map(channel => ({
  id: channel.id,
  name: channel.name,
  type: channel.type as "cooperative" | "processor" | "direct" | "retail" | "other",
  contact: channel.contact || "",
  pricePerLiter: channel.pricePerLiter || 0,
  isActive: channel.isActive ?? true,
  email: channel.email || null,
  contactPerson: channel.contactPerson || null,
  location: channel.location || null,
  paymentTerms: channel.paymentTerms || null,
  notes: channel.notes || null,
  isPaidFor: channel.isPaidFor ?? true,
  metadata: channel.metadata
}))}
```

---

## Data Integrity Checks

### Database Constraints
1. **distribution_channels_pkey** - Ensures unique ID
2. **distribution_channels_farm_id_fkey** - Validates farm exists
3. **distribution_channels_valid_type** - Ensures type is one of the 5 allowed values
4. **distribution_channels_positive_price** - Ensures price > 0 OR (type = 'other' AND is_paid_for = false)

### Indexes for Performance
1. `idx_distribution_channels_farm_id` - Queries by farm
2. `idx_distribution_channels_farm_type_active` - Common filter combinations
3. `idx_distribution_channels_type` - Type filtering
4. `idx_distribution_channels_is_active` - Active status filtering
5. `idx_distribution_channels_is_paid_for` - Payment status filtering
6. `idx_distribution_channels_metadata` - GIN index for JSONB queries

### Validation Rules Summary
| Field | Requirement | Type-Specific Notes |
|-------|-------------|-------------------|
| name | Always required | - |
| type | Required, must be valid | - |
| contact | Required (all except 'other') | 'other' can be null |
| email | Optional | Must be valid format if provided |
| pricePerLiter | Required if type != 'other' OR isPaidFor = true | Must be > 0 |
| contactPerson | Optional | Required for 'other' type |
| location | Optional | Hidden for 'other' type |
| paymentTerms | Optional | - |
| notes | Optional | - |
| isActive | Default true | - |
| isPaidFor | Default true | Only applicable to 'other' type |
| metadata.* | Type-dependent | Only populated for relevant type |

---

## Summary

✅ **Complete data flow verified:**
1. Form captures all inputs (common + type-specific)
2. Validation enforces type-specific requirements
3. API transforms and stores in proper database columns
4. Metadata JSONB stores type-specific fields
5. Retrieval includes all fields including metadata
6. Edit flow properly restores type-specific data
7. Display functions access metadata for rendering type-specific details
8. Database constraints ensure data integrity

**All channel types are now fully supported with their respective type-specific fields properly stored, retrieved, and displayed.**
