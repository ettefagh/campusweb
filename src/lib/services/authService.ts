import { PublicClientApplication, type AccountInfo, type AuthenticationResult } from "@azure/msal-browser";
import { msalConfig, loginRequest, sharepointConfig } from "../authConfig";

let msalInstance: PublicClientApplication | null = null;

export async function getMsalInstance() {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
  }
  return msalInstance;
}

// ─── STEP A: Login and verify domain ────────────────────────────────────────

export async function loginAndVerifyDomain(): Promise<{
  account: AccountInfo;
  accessToken: string;
  isValidDomain: boolean;
}> {
  const instance = await getMsalInstance();

  let authResult: AuthenticationResult;

  try {
    // Try silent login first (returning user)
    const accounts = instance.getAllAccounts();
    if (accounts.length > 0) {
      authResult = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
    } else {
      // First-time login: redirect to Microsoft login page
      authResult = await instance.acquireTokenPopup(loginRequest);
    }
  } catch (error) {
    console.warn("Silent token acquisition failed, falling back to popup", error);
    authResult = await instance.acquireTokenPopup(loginRequest);
  }

  const account = authResult.account;
  const email = account.username; // e.g. "maxmustermann@stud.srh-university.de"

  // Domain verification — enforced in your app layer
  const isValidDomain = email.toLowerCase().endsWith(`@${sharepointConfig.targetDomain.toLowerCase()}`);

  return {
    account,
    accessToken: authResult.accessToken,
    isValidDomain,
  };
}

// ─── STEP B: Check if this user has submitted the form ───────────────────────

export interface FormSubmissionResult {
  submitted: boolean;
  campus?: string;
  school?: string;
  department?: string;
  submittedAt?: string;
}

export async function checkFormSubmission(
  accessToken: string,
  userOid: string  // from account.localAccountId (this IS the OID in MSAL)
): Promise<FormSubmissionResult> {
  // Query the SharePoint list for a row where UserOID matches this user
  const filterQuery = `UserOID eq '${userOid}'`;
  const selectFields = "UserOID,UserEmail,Campus,School,Department,SubmittedAt";

  const url =
    `https://graph.microsoft.com/v1.0/sites/${sharepointConfig.siteId}` +
    `/lists/${sharepointConfig.listId}/items` +
    `?$filter=fields/${filterQuery}&$expand=fields($select=${selectFields})&$top=1`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Graph API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.value && data.value.length > 0) {
    const fields = data.value[0].fields;
    return {
      submitted: true,
      campus: fields.Campus,
      school: fields.School,
      department: fields.Department,
      submittedAt: fields.SubmittedAt,
    };
  }

  return { submitted: false };
}

// ─── HELPERS: Map Form Strings to Internal IDs ────────────────────────────────

export function mapCampusName(name: string | undefined): string | null {
  if (!name) return null;
  const normalized = name.toLowerCase().trim();
  if (normalized.includes("berlin")) return "berlin";
  if (normalized.includes("heidelberg")) return "heidelberg";
  if (normalized.includes("hamburg")) return "hamburg";
  if (normalized.includes("leipzig")) return "leipzig";
  // Add more mappings as needed
  return null;
}

export function mapSchoolName(name: string | undefined): string | null {
  if (!name) return null;
  const normalized = name.toLowerCase().trim();
  if (normalized.includes("technology") || normalized.includes("teac")) return "teac";
  if (normalized.includes("business") || normalized.includes("bls")) return "bls";
  if (normalized.includes("arts") || normalized.includes("aim")) return "aim";
  if (normalized.includes("health") || normalized.includes("hes")) return "hes";
  if (normalized.includes("psychology") || normalized.includes("psy")) return "psy";
  return null;
}
