import { json } from "@sveltejs/kit";
import { incrementSearchQuery, getPopularSearchStats } from "$lib/server/stats";

export async function GET({ platform }) {
	try {
		const kv = platform?.env?.STORIES_KV;
		if (!kv) return json({ popularSearches: [] });

		const popularSearches = await getPopularSearchStats(kv, 5);
		return json({ popularSearches });
	} catch (err) {
		return json({ popularSearches: [] });
	}
}

export async function POST({ request, platform }) {
	try {
		const body = await request.json();
		const query = typeof body?.query === "string" ? body.query.trim() : "";

		if (!query || query.length < 2) {
			return json({ error: "Invalid query" }, { status: 400 });
		}

		const kv = platform?.env?.STORIES_KV;
		if (kv) {
			await incrementSearchQuery(kv, query);
		}

		return json({ success: true });
	} catch (err) {
		return json({ error: "Invalid request" }, { status: 400 });
	}
}
