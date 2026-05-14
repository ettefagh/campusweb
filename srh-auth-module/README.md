# Microsoft Authentication Module (Standalone)

This is a decoupled version of the Microsoft Entra ID + Microsoft Forms authentication logic originally developed for **CampusWeb**.

## CampusWeb Integration Properties

When re-integrating this module back into CampusWeb, note the following properties:

- **Target Domain**: configure your allowed institutional email domain in `authConfig.ts`. The client-side check is only a UX gate; enforce it server-side before returning sensitive data.
- **Login Scopes**: `openid`, `profile`, `email`, `User.Read`.
- **SharePoint Scope**: `Sites.Selected` by default. Grant the app access only to the required SharePoint site/list; avoid tenant-wide `Sites.Read.All` unless there is no narrower option for your deployment.
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
   - `scopes` if your tenant requires a different least-privilege SharePoint permission
3. Run in dev mode: `npm run dev`.

## Security Notes

- The browser-side domain check is only a UX gate. Enforce authorization on a trusted backend before returning sensitive data.
- SharePoint lookup now uses the `oid` ID-token claim instead of `localAccountId`, and rejects accounts without a valid object ID claim.
- The OData filter value is validated as a GUID and escaped before being sent to Microsoft Graph.
- The access token is acquired inside the Graph lookup helper instead of being returned to the UI component. For stronger token isolation, move the SharePoint lookup behind a backend endpoint.

## Integration Back to CampusWeb

1. Copy the `src/lib` files back to `campusweb/src/lib`.
2. Re-import and mount `AuthOverlay.svelte` in `src/routes/+layout.svelte`.
3. Ensure `settingsStore.patch` calls in `AuthOverlay` are wired to the main app's settings.
