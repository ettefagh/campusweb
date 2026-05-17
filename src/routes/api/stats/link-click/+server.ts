import { json } from "@sveltejs/kit";
import { allLinks } from "$lib/data/links";
import { getPopularLinkStats, incrementLinkClick } from "$lib/server/stats";

const knownLinkIds = new Set(allLinks.map((link) => link.id));

export async function GET({ platform }) {
	try {
		const kv = platform?.env?.STORIES_KV;
		if (!kv) return json({ popularLinks: [] });

		const popularLinks = await getPopularLinkStats(kv, 10, knownLinkIds);

		return json({ popularLinks });
	} catch (err) {
		return json({ popularLinks: [] });
	}
}

export async function POST({ request, platform }) {
	try {
		const body = await request.json();
		const linkId = typeof body?.linkId === "string" ? body.linkId : "";

		if (!knownLinkIds.has(linkId)) {
			return json({ error: "Unknown link" }, { status: 400 });
		}

		const kv = platform?.env?.STORIES_KV;
		if (kv) {
			await incrementLinkClick(kv, linkId);
		}

		return json({ success: true });
	} catch (err) {
		return json({ error: "Invalid request" }, { status: 400 });
	}
}
