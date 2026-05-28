import { json } from "@sveltejs/kit";
import { socialAccounts } from "$lib/data/socialAccounts";

export async function GET({ platform }) {
  const kv = platform?.env?.STORIES_KV;
  const staticClubs = socialAccounts.filter(c => c.type === "club");
  
  if (!kv) {
    return json(staticClubs);
  }

  try {
    const data = await kv.get("dynamic_clubs");
    const dynamicClubs = data ? JSON.parse(data) : [];
    
    // Merge and deduplicate by ID, prioritizing dynamicClubs
    const merged = [...dynamicClubs];
    const dynamicIds = new Set(dynamicClubs.map((c: any) => c.id));
    
    for (const sc of staticClubs) {
      if (!dynamicIds.has(sc.id)) {
        merged.push(sc);
      }
    }
    
    return json(merged);
  } catch (err) {
    console.error("Failed to fetch clubs in admin API:", err);
    return json(staticClubs);
  }
}

export async function POST({ request, platform }) {
  const kv = platform?.env?.STORIES_KV;
  if (!kv) {
    return json({ error: "STORIES_KV not bound" }, { status: 500 });
  }

  try {
    const updatedClubs = await request.json();
    
    // Make sure we only save dynamic clubs to KV
    // But since static clubs are merged, the admin will send back the entire list.
    // That is perfectly fine! Saving the entire list in KV means the admin has complete control to reorder, add, or override static ones.
    await kv.put("dynamic_clubs", JSON.stringify(updatedClubs));
    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}
