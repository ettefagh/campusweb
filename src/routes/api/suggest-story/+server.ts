import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { checkUrlSecurity } from "$lib/server/security";
import { incrementStat } from "$lib/server/stats";

export async function POST({ request, platform }) {
  try {
    // Parse incoming FormData to support files
    const formData = await request.formData();
    const title = formData.get("title")?.toString() || "";
    const subtitle = formData.get("subtitle")?.toString() || "";
    const linkUrl = formData.get("linkUrl")?.toString() || "";
    const expiresAt = formData.get("expiresAt")?.toString() || "";
    
    // Can either be a string (URL) or a File object
    const imageInput = formData.get("image");

    // 1. Validation
    if (!title || !imageInput) {
      return json({ error: "Title and an Image are required" }, { status: 400 });
    }

    // Initialize telegram Payload
    const botToken = env.PRIVATE_TELEGRAM_BOT_TOKEN || platform?.env?.PRIVATE_TELEGRAM_BOT_TOKEN;
    const chatId = env.PRIVATE_TELEGRAM_CHAT_ID || platform?.env?.PRIVATE_TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error("Missing Telegram keys:", { hasToken: !!botToken, hasChatId: !!chatId });
      return json({ success: true, warning: "Configuration missing on server" });
    }

    const cleanTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const cleanSubtitle = subtitle.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // Format the date from YYYY-MM-DD to DD/MM/YYYY for readability in Telegram
    let formattedDate = expiresAt;
    if (expiresAt) {
      const [year, month, day] = expiresAt.split('-');
      if (year && month && day) {
        formattedDate = `${day}/${month}/${year}`;
      }
    }

    // Security Scan
    const virusWarning = await checkUrlSecurity(linkUrl, platform?.env);

    const caption = `
🌟 <b>New Story Suggestion</b>

<b>Title:</b> ${cleanTitle}
${cleanSubtitle ? `<b>Subtitle:</b> ${cleanSubtitle}` : ""}
<b>Link:</b> ${linkUrl || "None"}
${formattedDate ? `<b>Expires:</b> ${formattedDate}` : ""}${virusWarning}
    `.trim();

    // Final payload for Telegram
    const tgFormData = new FormData();
    tgFormData.append("chat_id", chatId);
    tgFormData.append("caption", caption);
    tgFormData.append("parse_mode", "HTML");

    // 2. Handle the image (File object vs URL string)
    if (typeof imageInput === "object" && imageInput instanceof Blob) {
      // IT'S A FILE UPLOAD (From mobile gallery / camera)
      
      // Check if actually an image
      if (!imageInput.type.startsWith("image/")) {
        return json({ error: "The uploaded file must be an image." }, { status: 400 });
      }
      
      // Max 10MB limit to avoid hanging
      if (imageInput.size > 10 * 1024 * 1024) {
        return json({ error: "File is too large. Max size is 10MB." }, { status: 400 });
      }

      // Attach file directly to telegram payload
      tgFormData.append("photo", imageInput, (imageInput as File).name || "upload.jpg");
    } 
    else if (typeof imageInput === "string" && imageInput.trim().length > 0) {
      // IT'S A URL
      const urlStr = imageInput.trim();
      
      if (!urlStr.startsWith("http")) {
        return json({ error: "Invalid URL format." }, { status: 400 });
      }

      // Security Check: Lightweight validation on server side
      try {
        const headRes = await fetch(urlStr, { method: "HEAD", signal: AbortSignal.timeout(3000) });
        const contentType = headRes.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
          return json({ error: "Provided URL does not point to a valid image." }, { status: 400 });
        }
      } catch (e) {
        // Optional: proceed anyway if ping fails but warn internally? Let's assume valid but fail soft
      }

      // Send URL string directly (Telegram API resolves public URLs!)
      tgFormData.append("photo", urlStr);
    } 
    else {
      return json({ error: "Invalid image data provided." }, { status: 400 });
    }

    // 3. Send PHOTO to Telegram via sendPhoto endpoint
    // Add inline keyboard for Approve/Reject
    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Approve & Publish", callback_data: "action_approve" }
        ],
        [
          { text: "✏️ Edit Text", callback_data: "action_edit_hint" },
          { text: "❌ Reject", callback_data: "action_reject" }
        ]
      ]
    };
    tgFormData.append("reply_markup", JSON.stringify(keyboard));

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST",
      body: tgFormData
      // Don't set content-type manually! Browser/Runtime auto-generates multipart boundary
    });

    if (!tgRes.ok) {
      const errData = await tgRes.text();
      console.error("Telegram API Error:", errData);
      return json({ error: "Telegram failed to accept your image submission." }, { status: 500 });
    }

    // --- Statistics Collection ---
    const kv = platform?.env?.STORIES_KV;
    if (kv) {
      // Background async increment
      incrementStat(kv, "suggestions", "new").catch(() => {});
      if (linkUrl) incrementStat(kv, "fields", "hasUrl").catch(() => {});
      if (expiresAt) incrementStat(kv, "fields", "hasExpiry").catch(() => {});
    }

    return json({ success: true });
  } catch (err) {
    console.error("Internal error:", err);
    return json({ error: "Internal server failure while processing." }, { status: 500 });
  }
}
