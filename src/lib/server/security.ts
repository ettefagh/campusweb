import { env } from "$env/dynamic/private";

export async function checkUrlSecurity(url: string, platformEnv?: any): Promise<string> {
  const vtKey = env.PRIVATE_VIRUSTOTAL_API_KEY || platformEnv?.PRIVATE_VIRUSTOTAL_API_KEY;
  
  if (!url || !vtKey) {
    return "";
  }

  // Only scan actual URLs
  if (!url.startsWith("http")) {
    return "";
  }

  try {
    // VirusTotal API requires base64url encoded URL
    const base64url = btoa(url)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
      
    const vtRes = await fetch(`https://www.virustotal.com/api/v3/urls/${base64url}`, {
      headers: { 'x-apikey': vtKey },
      signal: AbortSignal.timeout(4000)
    });

    if (vtRes.ok) {
      const vtData = await vtRes.json();
      const stats = vtData.data?.attributes?.last_analysis_stats;
      if (stats) {
        if (stats.malicious > 0) {
          return `\n\n🔴 <b>MALWARE WARNING:</b> ${stats.malicious} vendors flagged this link!`;
        } else if (stats.suspicious > 0) {
          return `\n\n🟡 <b>SUSPICIOUS URL:</b> ${stats.suspicious} vendors flagged this link!`;
        } else {
          return `\n\n✅ <b>Link Security:</b> Verified Safe by ${stats.harmless} vendors`;
        }
      }
    } else if (vtRes.status === 404) {
      return `\n\n⚠️ <b>Link Security:</b> URL is new and not in VirusTotal database.`;
    }
  } catch (e) {
    console.error("VirusTotal Security Check Failed:", e);
  }

  return "";
}
