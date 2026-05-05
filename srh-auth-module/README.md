# SRH Microsoft Authentication Module (Standalone)

This is a decoupled version of the Microsoft Entra ID + Microsoft Forms authentication logic originally developed for **CampusWeb**.

## CampusWeb Integration Properties

When re-integrating this module back into CampusWeb, note the following properties:

- **Target Domain**: `stud.srh-university.de` (Enforced in `authService.ts`).
- **Required Scopes**: `openid`, `profile`, `email`, `User.Read`, `Sites.Read.All`.
- **Backend**: SharePoint List `FormSubmissions` via Microsoft Graph API.
- **Auto-Mapping Logic**:
  - `campus`: Maps to `campusId` in `settingsStore`.
  - `school`: Maps to `schoolId` (e.g., `teac`, `bls`).
  - `department`: Combined with campus ID (e.g., `teac_berlin`).
- **Dependencies**: Requires `@azure/msal-browser`.

## Files Included

- `src/lib/authConfig.ts`: MSAL and SharePoint IDs.
- `src/lib/services/authService.ts`: Core logic for auth and Graph API.
- `src/lib/stores/authStore.ts`: Svelte store for reactive state.
- `src/lib/components/AuthOverlay.svelte`: UI overlay for login and verification.

## Setup Instructions

1. Install dependencies: `npm install`.
2. Update `src/lib/authConfig.ts` with real IDs:
   - `clientId`
   - `tenantId`
   - `siteId`
   - `listId`
3. Run in dev mode: `npm run dev`.

## Integration Back to CampusWeb

1. Copy the `src/lib` files back to `campusweb/src/lib`.
2. Re-import and mount `AuthOverlay.svelte` in `src/routes/+layout.svelte`.
3. Ensure `settingsStore.patch` calls in `AuthOverlay` are wired to the main app's settings.
