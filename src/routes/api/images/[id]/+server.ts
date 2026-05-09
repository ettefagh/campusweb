import { error } from "@sveltejs/kit";

export async function GET({ params, platform }) {
  const { id } = params;

  if (!platform?.env?.IMAGES_BUCKET) {
    throw error(500, "R2 Bucket not bound");
  }

  const object = await platform.env.IMAGES_BUCKET.get(id);

  if (!object) {
    throw error(404, "Image not found");
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  
  // Set a permissive cache control for immutable images
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  
  // Default to JPEG if no content type was stored
  if (!headers.get("content-type")) {
    headers.set("content-type", "image/jpeg");
  }

  return new Response(object.body, {
    headers
  });
}
