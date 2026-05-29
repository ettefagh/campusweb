import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { checkUrlSecurity } from "$lib/server/security";

export async function POST({ request, platform }) {
  try {
    const data = await request.json();
    const {
      promoTitle,
      promoDescription,
      promoBadge,
      ctaText,
      targetLink,
      campusId,
      expirationDate,
      contactEmail,
      note,
      logoDataUrl,
      logoUrl,
    } = data;

    if (!promoTitle || !promoBadge || !campusId || !ctaText || !targetLink) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    if (logoDataUrl && (typeof logoDataUrl !== "string" || !logoDataUrl.startsWith("data:image/"))) {
      return json({ error: "Invalid logo upload" }, { status: 400 });
    }

    if (logoDataUrl && logoDataUrl.length > 1_500_000) {
      return json({ error: "Logo upload is too large" }, { status: 400 });
    }

    if (logoUrl && typeof logoUrl !== "string") {
      return json({ error: "Invalid logo URL" }, { status: 400 });
    }

    const botToken = env.PRIVATE_TELEGRAM_BOT_TOKEN || platform?.env?.PRIVATE_TELEGRAM_BOT_TOKEN;
    const chatId = env.PRIVATE_TELEGRAM_CHAT_ID || platform?.env?.PRIVATE_TELEGRAM_CHAT_ID;
    const kv = platform?.env?.STORIES_KV;

    if (!botToken || !chatId) {
      console.error("Missing Telegram keys for promotion suggestion");
      return json({ success: true, warning: "Configuration missing on server" });
    }

    const suggestionId = crypto.randomUUID();

    if (kv) {
      await kv.put(`promo_suggestion:${suggestionId}`, JSON.stringify({
        id: suggestionId,
        promoTitle,
        promoDescription,
        promoBadge,
        ctaText,
        targetLink,
        campusId,
        expirationDate,
        contactEmail,
        note,
        logoDataUrl: logoDataUrl || "",
        logoUrl: logoUrl || "",
        submittedAt: new Date().toISOString()
      }), {
        expirationTtl: 60 * 60 * 24 * 30
      });
    }

    const cleanPromoTitle = promoTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const cleanPromoDescription = promoDescription ? promoDescription.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
    const cleanNote = note ? note.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
    
    const securityReport = await checkUrlSecurity(targetLink, platform?.env);
    
    const caption = `
💸 <b>New Promotion Suggestion</b>

<b>Title:</b> ${cleanPromoTitle}
<b>Badge:</b> ${promoBadge}
<b>Campus:</b> ${campusId}
<b>CTA Text:</b> ${ctaText}
<b>Target Link:</b> ${targetLink}
${expirationDate ? `<b>Expires:</b> ${expirationDate}\n` : ""}${contactEmail ? `<b>Contact:</b> ${contactEmail}\n` : ""}
${cleanPromoDescription ? `<b>Description:</b>\n<i>${cleanPromoDescription}</i>\n` : ""}${cleanNote ? `<b>Note:</b>\n<i>${cleanNote}</i>` : ""}${securityReport}
    `.trim();

    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: `promo_approve_${suggestionId}` },
          { text: "❌ Reject", callback_data: `promo_reject_${suggestionId}` }
        ]
      ]
    };

    let endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
    let reqBody: any;
    let headers: Record<string, string> = {};

    if (logoDataUrl || logoUrl) {
      endpoint = `https://api.telegram.org/bot${botToken}/sendPhoto`;
      reqBody = new FormData();
      reqBody.append("chat_id", chatId);
      reqBody.append("caption", caption);
      reqBody.append("parse_mode", "HTML");
      reqBody.append("reply_markup", JSON.stringify(keyboard));

      if (logoDataUrl) {
        const arr = logoDataUrl.split(",");
        const match = arr[0].match(/:(.*?);/);
        const mime = match ? match[1] : "image/jpeg";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        reqBody.append("photo", blob, "promo-image.jpg");
      } else if (logoUrl) {
        reqBody.append("photo", logoUrl);
      }
    } else {
      headers["Content-Type"] = "application/json";
      reqBody = JSON.stringify({
        chat_id: chatId,
        text: caption,
        parse_mode: "HTML",
        reply_markup: keyboard
      });
    }

    const tgRes = await fetch(endpoint, {
      method: "POST",
      headers,
      body: reqBody
    });

    if (!tgRes.ok) {
      const errData = await tgRes.text();
      console.error("Telegram API Error (Promotion):", errData);
      return json({ error: "Telegram failed to accept submission." }, { status: 500 });
    }

    return json({ success: true, id: suggestionId });
  } catch (err) {
    console.error("Internal error in suggest-promotion:", err);
    return json({ error: "Internal server failure." }, { status: 500 });
  }
}
