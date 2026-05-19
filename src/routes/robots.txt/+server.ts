import { env } from "$env/dynamic/private";

function getSiteUrl(request: Request) {
  return (env as any).PRIVATE_SITE_URL || new URL(request.url).origin;
}

export async function GET({ request }) {
  const siteUrl = getSiteUrl(request).replace(/\/$/, "");
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    "# Block internal and API endpoints",
    "Disallow: /api/",
    "Disallow: /admin/",
    "Disallow: /viewer/",
    "Disallow: /calendar",
    "Disallow: /search",
    "",
    "# Sitemap",
    `Sitemap: ${siteUrl}/sitemap.xml`
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
