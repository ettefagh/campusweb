import { json } from "@sveltejs/kit";

function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

export async function POST({ request, platform }) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const bucket = platform?.env?.IMAGES_BUCKET;
    const fileId = crypto.randomUUID();

    if (bucket) {
      // Save to Cloudflare R2
      await bucket.put(fileId, buffer, {
        httpMetadata: {
          contentType: file.type || "image/jpeg"
        }
      });
      return json({ url: `/api/images/${fileId}` });
    } else {
      // Local development fallback: Return as base64 Data URL
      const base64 = arrayBufferToBase64(buffer);
      const dataUrl = `data:${file.type || "image/png"};base64,${base64}`;
      return json({ url: dataUrl });
    }
  } catch (err: any) {
    console.error("Failed to upload image in admin API:", err);
    return json({ error: err.message }, { status: 500 });
  }
}
