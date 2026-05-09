/**
 * src/routes/api/stories/+server.ts
 *
 * REST API for managing campus stories.
 * GET  /api/stories        → returns all stories
 * POST /api/stories        → adds a new story
 * DELETE /api/stories?id=  → removes a story by ID
 *
 * This API dynamically detects if it is running in a Node.js environment (e.g. local dev)
 * or a Serverless environment (e.g. Cloudflare Pages).
 * - In local dev, it dynamically imports Node's 'fs' and 'path' to write changes back to stories.json.
 * - In production, it gracefully maintains state in-memory initialized with the bundled stories.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import storiesData from "$lib/data/stories.json";
import { env } from "$env/dynamic/private";

function parseCSV(csvText: string) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  
  return lines.slice(1).map(line => {
    const row: Record<string, string> = {};
    let current = "";
    let inQuotes = false;
    let colIdx = 0;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row[headers[colIdx]] = current.trim();
        current = "";
        colIdx++;
      } else {
        current += char;
      }
    }
    row[headers[colIdx]] = current.trim();
    
    return {
      id: row.id || `story-${Math.random().toString(36).substring(2, 11)}`,
      title: row.title || "",
      subtitle: row.subtitle || "",
      imageUrl: row.imageUrl || "",
      linkUrl: row.linkUrl || "",
      seen: false,
      createdAt: row.createdAt || new Date().toISOString(),
      expiresAt: row.expiresAt || ""
    };
  }).filter(s => s.title !== "" && s.imageUrl !== "");
}

// In-memory storage fallback for serverless environments
let activeStories = [...storiesData];

/**
 * Dynamically import 'fs' and 'path' only when running in Node.js (local dev).
 * This prevents bundling errors on Cloudflare Pages.
 */
async function getNodeModules() {
  if (typeof process !== "undefined" && process.versions && process.versions.node) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      return { fs, path };
    } catch {
      return null;
    }
  }
  return null;
}

const FILE_REL_PATH = "src/lib/data/stories.json";

async function readStories() {
  const node = await getNodeModules();
  if (node) {
    try {
      const resolvedPath = node.path.resolve(FILE_REL_PATH);
      const raw = node.fs.readFileSync(resolvedPath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return activeStories;
    }
  }
  return activeStories;
}

async function writeStories(stories: any[]) {
  activeStories = stories;
  const node = await getNodeModules();
  if (node) {
    try {
      const resolvedPath = node.path.resolve(FILE_REL_PATH);
      node.fs.writeFileSync(resolvedPath, JSON.stringify(stories, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not save to local filesystem:", e);
    }
  }
}

/** GET /api/stories */
export const GET: RequestHandler = async ({ platform }) => {
  let stories: any[] = [];

  // 1. Fetch from Google Sheets if configured
  const googleSheetsUrl = env.PRIVATE_GOOGLE_SHEETS_URL;
  if (googleSheetsUrl) {
    try {
      const response = await fetch(googleSheetsUrl);
      if (response.ok) {
        const csvText = await response.text();
        stories = parseCSV(csvText);
      }
    } catch (err) {
      console.warn("Failed to fetch Google Sheets stories:", err);
    }
  }

  // 2. Fetch from Cloudflare KV if bound
  const kv = platform?.env?.STORIES_KV;
  if (kv) {
    try {
      const kvData = await kv.get("stories");
      if (kvData) {
        const kvStories = JSON.parse(kvData);
        
        // Auto-cleanup: purge expired stories from database
        const now = new Date();
        const validStories = kvStories.filter(s => !s.expiresAt || new Date(s.expiresAt) > now);
        
        if (validStories.length < kvStories.length) {
          kv.put("stories", JSON.stringify(validStories)).catch(console.error);
        }
        
        // Prepend KV stories (newer ones) to the Google Sheet ones
        stories = [...validStories, ...stories];
      }
    } catch (err) {
      console.warn("Failed to fetch KV stories:", err);
    }
  }

  // Fallback to local files only if neither KV nor Google Sheet worked AND we are in local dev
  if (stories.length === 0 && !kv && !googleSheetsUrl) {
    stories = await readStories();
  }

  return json(stories);
};

/** POST /api/stories  –  body: { title, subtitle, imageUrl, linkUrl } */
export const POST: RequestHandler = async ({ request }) => {
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, subtitle, imageUrl, linkUrl, expiresAt } = body;
  if (!title || !imageUrl) {
    return json({ error: "title and imageUrl are required" }, { status: 400 });
  }

  const stories = await readStories();
  const newStory = {
    id: `story-${Date.now()}`,
    title,
    subtitle: subtitle ?? "",
    imageUrl,
    linkUrl: linkUrl ?? "",
    seen: false,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  stories.unshift(newStory); // newest first
  await writeStories(stories);

  return json(newStory, { status: 201 });
};

/** DELETE /api/stories?id=story-xxx */
export const DELETE: RequestHandler = async ({ url }) => {
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "id query param required" }, { status: 400 });

  const stories = await readStories();
  const filtered = stories.filter((s: { id: string }) => s.id !== id);

  if (filtered.length === stories.length) {
    return json({ error: "Story not found" }, { status: 404 });
  }

  await writeStories(filtered);
  return json({ success: true });
};
