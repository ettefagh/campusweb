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
  const email = getAccountEmail(account); // e.g. "maxmustermann@stud.srh-university.de"
  const isValidDomain = isAllowedDomain(email);

  return {
    account,
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
  account: AccountInfo
): Promise<FormSubmissionResult> {
  const userOid = getAccountOid(account);

  if (!userOid) {
    throw new Error("Authenticated account is missing a trusted object ID claim.");
  }

  // Query the SharePoint list for a row where UserOID matches this user
  const filterQuery = `UserOID eq '${escapeODataString(userOid)}'`;
  const selectFields = "UserOID,UserEmail,Campus,School,Department,SubmittedAt";

  const url =
    `https://graph.microsoft.com/v1.0/sites/${sharepointConfig.siteId}` +
    `/lists/${sharepointConfig.listId}/items` +
    `?$filter=fields/${filterQuery}&$expand=fields($select=${selectFields})&$top=1`;

  const accessToken = await getSharePointAccessToken(account);
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

async function getSharePointAccessToken(account: AccountInfo): Promise<string> {
  const instance = await getMsalInstance();
  const request = {
    scopes: sharepointConfig.scopes,
    account,
  };

  try {
    const result = await instance.acquireTokenSilent(request);
    return result.accessToken;
  } catch {
    const result = await instance.acquireTokenPopup(request);
    return result.accessToken;
  }
}

function getAccountEmail(account: AccountInfo): string {
  const claims = account.idTokenClaims as Record<string, unknown> | undefined;
  const claimEmail = claims?.email || claims?.preferred_username || claims?.upn;
  return typeof claimEmail === "string" ? claimEmail : account.username;
}

function getAccountOid(account: AccountInfo): string | null {
  const claims = account.idTokenClaims as Record<string, unknown> | undefined;
  const oid = claims?.oid;

  if (typeof oid !== "string" || !isGuid(oid)) {
    return null;
  }

  return oid;
}

function isAllowedDomain(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedDomain = sharepointConfig.targetDomain.trim().toLowerCase();
  return normalizedEmail.endsWith(`@${normalizedDomain}`);
}

function isGuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
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
