import { env } from "$env/dynamic/private";

const PUBLIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/explore", changefreq: "weekly", priority: "0.9" },
  { path: "/feed", changefreq: "daily", priority: "0.9" }
] as const;

function getSiteUrl(request: Request) {
  return (env as any).PRIVATE_SITE_URL || new URL(request.url).origin;
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET({ request }) {
  const siteUrl = getSiteUrl(request).replace(/\/$/, "");
  const lastmod = new Date().toISOString().split("T")[0];

  const entries = PUBLIC_ROUTES.map(
    (route) => `
  <url>
    <loc>${xmlEscape(`${siteUrl}${route.path}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
  ).join("");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
