import { type Configuration, type PopupRequest } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: "YOUR_CLIENT_ID",           // Replace with real Client ID from Entra
    authority: "https://login.microsoftonline.com/YOUR_TENANT_ID", // Replace with real Tenant ID
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// Scopes requested at login. Add SharePoint permissions only after confirming the
// narrowest Graph permission your tenant/app registration supports for the list.
export const loginRequest: PopupRequest = {
  scopes: ["openid", "profile", "email", "User.Read"],
};

// SharePoint config
export const sharepointConfig = {
  siteId: "YOUR_SHAREPOINT_SITE_ID",      // Replace with real Site ID
  listId: "YOUR_FORM_SUBMISSIONS_LIST_ID", // Replace with real List ID
  scopes: ["Sites.Selected"],             // Prefer site-scoped access over tenant-wide Sites.Read.All
  targetDomain: "stud.srh-university.de",
};
