import { json } from "@sveltejs/kit";

export async function GET({ platform }) {
  const kv = platform?.env?.STORIES_KV;
  if (!kv) {
    return json([]);
  }

  try {
    const data = await kv.get("promotions");
    if (!data) return json([]);
    
    const rawPromotions = JSON.parse(data);
    
    // Map legacy data to the strict Promotion interface to prevent crashes
    const promotions = rawPromotions.map((p: any) => ({
      id: p.id,
      title: p.title || "Special Offer",
      subtitle: p.subtitle || p.description || "",
      linkUrl: p.linkUrl || p.link || "#",
      sponsorName: p.sponsorName,
      campusIds: Array.isArray(p.campusIds) ? p.campusIds : (p.campusId ? [p.campusId] : ["all"]),
      startsAt: p.startsAt || new Date().toISOString(),
      expiresAt: p.expiresAt,
      imageUrl: p.imageUrl,
      label: p.label || p.badge || "Promotion",
      cta: p.cta || p.ctaText || "",
      priority: p.priority || 0
    }));

    return json(promotions);
  } catch (err) {
    console.error("Failed to fetch dynamic promotions:", err);
    return json([]);
  }
}

export async function POST({ request, platform }) {
  const kv = platform?.env?.STORIES_KV;
  if (!kv) return json({ error: "KV not bound" }, { status: 500 });

  try {
    const body = await request.json();
    const data = await kv.get("promotions");
    let promotions = data ? JSON.parse(data) : [];

    if (body.id) {
      // Update existing
      const index = promotions.findIndex((p: any) => p.id === body.id);
      if (index !== -1) {
        promotions[index] = { ...promotions[index], ...body };
      } else {
        promotions.push(body);
      }
    } else {
      // Create new
      body.id = `promo-${Date.now()}`;
      if (!body.priority) body.priority = 5;
      if (!body.startsAt) body.startsAt = new Date().toISOString();
      promotions.push(body);
    }

    await kv.put("promotions", JSON.stringify(promotions));
    return json({ success: true, promotion: body });
  } catch (err) {
    console.error("Failed to save promotion:", err);
    return json({ error: "Failed to save promotion" }, { status: 500 });
  }
}

export async function DELETE({ url, platform }) {
  const kv = platform?.env?.STORIES_KV;
  if (!kv) return json({ error: "KV not bound" }, { status: 500 });

  try {
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "id required" }, { status: 400 });

    const data = await kv.get("promotions");
    if (!data) return json({ success: true });

    let promotions = JSON.parse(data);
    const initialLength = promotions.length;
    promotions = promotions.filter((p: any) => p.id !== id);

    if (promotions.length !== initialLength) {
      await kv.put("promotions", JSON.stringify(promotions));
    }
    
    return json({ success: true });
  } catch (err) {
    console.error("Failed to delete promotion:", err);
    return json({ error: "Failed to delete" }, { status: 500 });
  }
}
