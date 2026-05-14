import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { checkUrlSecurity } from "$lib/server/security";
import { incrementStat } from "$lib/server/stats";
import { sendStorySuggestionReceiptEmail } from "$lib/server/email";

export async function POST({ request, platform }) {
  try {
    const formData = await request.formData();
    const title = formData.get("title")?.toString() || "";
    const subtitle = formData.get("subtitle")?.toString() || "";
    const linkUrl = formData.get("linkUrl")?.toString() || "";
    const expiresAt = formData.get("expiresAt")?.toString() || "";
    const contactEmail = formData.get("contactEmail")?.toString().trim() || "";
    
    const imageInput = formData.get("image");

    if (!title || !imageInput) {
      return json({ error: "Title and an Image are required" }, { status: 400 });
    }

    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return json({ error: "Please enter a valid contact email." }, { status: 400 });
    }

    const botToken = env.PRIVATE_TELEGRAM_BOT_TOKEN || platform?.env?.PRIVATE_TELEGRAM_BOT_TOKEN;
    const chatId = env.PRIVATE_TELEGRAM_CHAT_ID || platform?.env?.PRIVATE_TELEGRAM_CHAT_ID;
    const kv = platform?.env?.STORIES_KV;

    if (!botToken || !chatId) {
      console.error("Missing Telegram keys:", { hasToken: !!botToken, hasChatId: !!chatId });
      return json({ success: true, warning: "Configuration missing on server" });
    }

    const cleanTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const cleanSubtitle = subtitle.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    let formattedDate = expiresAt;
    if (expiresAt) {
      const [year, month, day] = expiresAt.split('-');
      if (year && month && day) {
        formattedDate = `${day}/${month}/${year}`;
      }
    }

    const virusWarning = await checkUrlSecurity(linkUrl, platform?.env);

    const caption = `
🌟 <b>New Story Suggestion</b>

<b>Title:</b> ${cleanTitle}
${cleanSubtitle ? `<b>Subtitle:</b> ${cleanSubtitle}` : ""}
<b>Link:</b> ${linkUrl || "None"}
${contactEmail ? `<b>Contact:</b> ${contactEmail}` : ""}
${formattedDate ? `<b>Expires:</b> ${formattedDate}` : ""}${virusWarning}
    `.trim();

    const suggestionId = crypto.randomUUID();
    if (kv) {
      await kv.put(
        `story_suggestion:${suggestionId}`,
        JSON.stringify({
          title,
          subtitle,
          linkUrl,
          expiresAt,
          contactEmail,
          submittedAt: new Date().toISOString()
        }),
        { expirationTtl: 60 * 60 * 24 * 30 }
      );
    }

    const tgFormData = new FormData();
    tgFormData.append("chat_id", chatId);
    tgFormData.append("caption", caption);
    tgFormData.append("parse_mode", "HTML");

    if (typeof imageInput === "object" && imageInput instanceof Blob) {
      if (!imageInput.type.startsWith("image/")) {
        return json({ error: "The uploaded file must be an image." }, { status: 400 });
      }
      
      if (imageInput.size > 10 * 1024 * 1024) {
        return json({ error: "File is too large. Max size is 10MB." }, { status: 400 });
      }

      tgFormData.append("photo", imageInput, (imageInput as File).name || "upload.jpg");
    } 
    else if (typeof imageInput === "string" && imageInput.trim().length > 0) {
      const urlStr = imageInput.trim();
      
      if (!urlStr.startsWith("http")) {
        return json({ error: "Invalid URL format." }, { status: 400 });
      }

      try {
        const headRes = await fetch(urlStr, { method: "HEAD", signal: AbortSignal.timeout(3000) });
        const contentType = headRes.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
          return json({ error: "Provided URL does not point to a valid image." }, { status: 400 });
        }
      } catch (e) {}

      tgFormData.append("photo", urlStr);
    } 
    else {
      return json({ error: "Invalid image data provided." }, { status: 400 });
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Approve & Publish", callback_data: kv ? `story_approve_${suggestionId}` : "action_approve" }
        ],
        [
          { text: "✏️ Edit Text", callback_data: "action_edit_hint" },
          { text: "❌ Reject", callback_data: kv ? `story_reject_${suggestionId}` : "action_reject" }
        ]
      ]
    };
    tgFormData.append("reply_markup", JSON.stringify(keyboard));

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST",
      body: tgFormData
    });

    if (!tgRes.ok) {
      const errData = await tgRes.text();
      console.error("Telegram API Error:", errData);
      if (kv) await kv.delete(`story_suggestion:${suggestionId}`).catch(() => {});
      return json({ error: "Telegram failed to accept your image submission." }, { status: 500 });
    }

    if (kv) {
      incrementStat(kv, "suggestions", "new").catch(() => {});
      if (linkUrl) incrementStat(kv, "fields", "hasUrl").catch(() => {});
      if (expiresAt) incrementStat(kv, "fields", "hasExpiry").catch(() => {});
    }

    let emailStatus: "sent" | "skipped" | "failed" = contactEmail ? "failed" : "skipped";
    if (contactEmail) {
      try {
        await sendStorySuggestionReceiptEmail(contactEmail, title, platform?.env);
        emailStatus = "sent";
      } catch (err) {
        console.error("Story suggestion receipt email failed:", err);
      }
    }

    return json({ success: true, emailStatus });
  } catch (err) {
    console.error("Internal error:", err);
    return json({ error: "Internal server failure while processing." }, { status: 500 });
  }
}
