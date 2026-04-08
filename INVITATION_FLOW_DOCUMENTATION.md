# Invitation Acceptance Flow - Complete Documentation

## Overview
When a user receives an invitation email and accepts it, here's the complete flow across all involved files:

---

## 1. EMAIL LINK FLOW

**User receives email with link:**
```
http://localhost:3000/invite/[TOKEN]
```

**Files Involved:**

### `src/app/invite/[token]/page.tsx` - Invitation Landing Page
- **Purpose:** First page user sees when clicking invitation link
- **Process:**
  1. Extracts token from URL
  2. Calls `validateInvitationToken(token)` to verify token validity and expiration
  3. Calls `getInvitationDetails(token)` to fetch invitation details
  4. If valid → Shows `<InvitationLanding />` component
  5. If invalid → Redirects to `/auth?error={error_code}`

**Key Logic:**
```typescript
const validation = await validateInvitationToken(token)
if (!validation.isValid) {
  redirect(`/auth?error=${validation.error}`)
}
const invitationDetails = await getInvitationDetails(token)
```

---

## 2. INVITATION LANDING COMPONENT

### `src/components/auth/InvitationLanding.tsx` - Display Invitation Details
- **Props:**
  - `invitation` - Detailed invitation data
  - `token` - The invitation token
  
- **What User Sees:**
  - Farm name and location
  - Inviter name
  - Role assigned (farm_manager, worker, veterinarian)
  - Expiration date/days remaining
  - Accept or Decline buttons

- **User Actions:**
  
  **Accept →** Redirects to:
  ```
  /auth?invitation=[TOKEN]&mode=signup
  ```
  
  **Decline →** Calls `/api/invitations/decline` endpoint to update status to 'declined'

---

## 3. SIGNUP/AUTH FORM

### `src/components/auth/AuthForm.tsx` - Signup with Preloaded Data
- **Triggered By:** `/auth?invitation=[TOKEN]&mode=signup`
- **Process:**
  1. Extracts invitation token from URL
  2. Loads invitation data via `/api/invitations/validate?token=[TOKEN]`
  3. Pre-fills email field with invitee email from invitation
  4. User fills out:
     - Full Name (if not already filled)
     - Password
     - Confirm Password
  5. User clicks "Sign Up"

- **SignUp Call:**
  - Calls `signUp()` from `useAuth()` hook
  - Sends credentials to Supabase Auth
  - Creates new auth user

---

## 4. API ENDPOINTS

### `src/app/api/invitations/validate/route.ts` - GET Request
```typescript
GET /api/invitations/validate?token=[TOKEN]
```
- **Purpose:** Validate token and return invitation details
- **Returns:**
  ```json
  {
    "success": true,
    "invitation": {
      "id": "...",
      "email": "invitee@example.com",
      "full_name": "...",
      "role_type": "farm_manager",
      "farms": {
        "name": "Farm Name",
        "location": "...",
        "farm_type": "..."
      },
      "expires_at": "...",
      ...
    }
  }
  ```

### `src/app/api/invitations/decline/route.ts` - POST Request
```typescript
POST /api/invitations/decline
Body: { token: "[TOKEN]" }
```
- **Purpose:** Decline an invitation
- **Updates:** `status` → 'declined' in invitations table
- **Redirect:** User sent to home page

---

## 5. DATABASE HELPER FUNCTIONS

### `src/lib/database/team.ts` - Core Logic

#### `validateInvitationToken(token: string)`
- Queries `invitations` table
- Checks:
  - Token exists
  - Status is 'pending'
  - Not expired (expires_at > now)
- Returns: `{ isValid: boolean, error?: string, invitation?: {...} }`

#### `getInvitationDetails(token: string)`
- Queries `invitations` table with farm details joined
- Fetches inviter info from auth.users
- Validates expiration
- Returns full invitation object with:
  - Farm details (name, location, farm_type)
  - Inviter info (email, metadata)
  - Role assignment
  - All invitation metadata

#### `createTeamInvitation(farmId, inviterUserId, invitationData)`
- Generates unique token
- Sets expiration (7 days)
- Creates record in `invitations` table
- Returns: `{ success: boolean, invitation, invitationData }`

---

## 6. AUTH HOOK - WHERE ACCEPTANCE IS FINALIZED

### `src/lib/hooks/useAuth.ts` - signUp function
- **Called By:** AuthForm component
- **Process After User Signs Up:**
  1. Creates Supabase auth user
  2. **Important:** Check if invitation token exists in context/URL
  3. If yes → Should call acceptance endpoint to:
     - Update invitation status → 'accepted'
     - Set accepted_at timestamp
     - Create user_roles entry in database
     - Assign user to farm with role

**⚠️ POTENTIAL GAP:** Need to verify if acceptance flow is complete after signup

---

## 7. COMPLETE USER JOURNEY

```
1. User receives email → /invite/[TOKEN]
                ↓
2. Page validates token → validateInvitationToken()
                ↓
3. Shows invitation details → InvitationLanding component
                ↓
4. User clicks "Accept" → /auth?invitation=[TOKEN]&mode=signup
                ↓
5. AuthForm auto-fills email → Calls /api/invitations/validate
                ↓
6. User enters full name & password → Clicks "Sign Up"
                ↓
7. Creates auth user → signUp() from useAuth
                ↓
8. [SHOULD HAPPEN] Updates invitation → status='accepted'
                ↓
9. [SHOULD HAPPEN] Creates user_roles → Links user to farm
                ↓
10. Redirect to dashboard or onboarding
```

---

## 8. DATABASE TABLES INVOLVED

### `invitations` Table
```sql
id              - UUID (Primary Key)
token           - VARCHAR (Unique)
farm_id         - UUID (Foreign Key → farms)
email           - VARCHAR
role_type       - VARCHAR ('farm_manager', 'worker', 'veterinarian')
invited_by      - UUID (Foreign Key → auth.users)
status          - VARCHAR ('pending', 'accepted', 'declined', 'expired')
expires_at      - TIMESTAMP
created_at      - TIMESTAMP
```

### `user_roles` Table
```sql
id              - UUID (Primary Key)
user_id         - UUID (Foreign Key → auth.users)
farm_id         - UUID (Foreign Key → farms)
role            - VARCHAR ('farm_owner', 'farm_manager', 'worker', ...)
status          - VARCHAR ('pending_setup', 'active')
created_at      - TIMESTAMP
```

---

## 9. KEY FILES CHECKLIST

✅ **Existing Files:**
- `src/app/invite/[token]/page.tsx` - Invitation landing
- `src/components/auth/InvitationLanding.tsx` - UI for invitation
- `src/components/auth/AuthForm.tsx` - Signup form
- `src/lib/database/team.ts` - Database helpers
- `src/app/api/invitations/validate/route.ts` - Validate API
- `src/app/api/invitations/decline/route.ts` - Decline API

❓ **May Need Verification:**
- Check if `useAuth.ts` signUp function calls invitation acceptance
- Verify user_roles entry creation after signup
- Confirm final redirect after acceptance

---

## 10. INTEGRATION WITH NEW INVITATION SYSTEM

**NEW System Created By User:**
- `src/app/api/teams/invitations/route.ts` - Creates invitations
- `src/lib/database/invitations.ts` - New invitation interface
- **Table:** `farm_invitations` (different from `invitations` table)

**Status:** Need to integrate both systems or migrate to single invitation table.
