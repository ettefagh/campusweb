import { json } from "@sveltejs/kit";

export async function GET({ platform }) {
  const kv = platform?.env?.STORIES_KV;
  if (!kv) {
    return json([]);
  }

  try {
    const data = await kv.get("dynamic_clubs");
    if (!data) return json([]);
    
    const clubs = JSON.parse(data);
    return json(clubs);
  } catch (err) {
    console.error("Failed to fetch dynamic clubs:", err);
    return json([]);
  }
}
