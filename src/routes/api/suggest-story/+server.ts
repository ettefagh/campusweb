import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { checkUrlSecurity } from "$lib/server/security";
import { incrementStat } from "$lib/server/stats";
import { sendStorySuggestionReceiptEmail } from "$lib/server/email";

type StorySlide = {
  imageUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function clampText(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}...`;
}

async function validateRemoteImage(urlStr: string) {
  if (!urlStr.startsWith("http")) {
    throw new Error("Invalid URL format.");
  }

  try {
    const headRes = await fetch(urlStr, { method: "HEAD", signal: AbortSignal.timeout(3000) });
    const contentType = headRes.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      throw new Error("Provided URL does not point to a valid image.");
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
  }
}

async function uploadPendingStoryImage(
  image: File,
  bucket: any
) {
  if (!image.type.startsWith("image/")) {
    throw new Error("The uploaded file must be an image.");
  }

  if (image.size > 10 * 1024 * 1024) {
    throw new Error("File is too large. Max size is 10MB.");
  }

  const extension = image.type === "image/png" ? "png" : "jpg";
  const key = `pending-story-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  await bucket.put(key, image, {
    httpMetadata: { contentType: image.type || "image/jpeg" }
  });

  return {
    key,
    imageUrl: `/api/images/${key}`
  };
}

function formatStorySummaryForTelegram({
  storyMode,
  imageCount,
  subtitle
}: {
  storyMode: string;
  imageCount: number;
  subtitle: string;
}) {
  const typeLabel = storyMode === "sequence" ? "Tale / Sequence" : "Single";
  const safeDescription = escapeHtml(clampText(subtitle, storyMode === "sequence" ? 220 : 320));

  return `
<b>Story Type:</b> ${typeLabel}
<b>Images:</b> ${imageCount}
<b>Description:</b>
<pre>${safeDescription || " "}</pre>
  `.trim();
}

export async function POST({ request, platform, url }) {
  try {
    const formData = await request.formData();
    const title = formData.get("title")?.toString().trim() || "";
    const subtitle = formData.get("subtitle")?.toString() || "";
    const tag = formData.get("tag")?.toString().trim() || "";
    const storyMode = formData.get("storyMode")?.toString() || "single";
    const linkUrl = formData.get("linkUrl")?.toString() || "";
    const expiresAt = formData.get("expiresAt")?.toString() || "";
    const contactEmail = formData.get("contactEmail")?.toString().trim() || "";
    const imageInputs = formData.getAll("image");

    if (!title || imageInputs.length === 0) {
      return json({ error: "Title and an image are required." }, { status: 400 });
    }

    if (!subtitle.trim()) {
      return json({ error: "A description is required." }, { status: 400 });
    }

    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return json({ error: "Please enter a valid contact email." }, { status: 400 });
    }

    if (storyMode === "sequence" && imageInputs.length < 2) {
      return json({ error: "A tale needs at least two images." }, { status: 400 });
    }

    if (storyMode === "single" && imageInputs.length !== 1) {
      return json({ error: "A single story needs exactly one image." }, { status: 400 });
    }

    const botToken = env.PRIVATE_TELEGRAM_BOT_TOKEN || platform?.env?.PRIVATE_TELEGRAM_BOT_TOKEN;
    const chatId = env.PRIVATE_TELEGRAM_CHAT_ID || platform?.env?.PRIVATE_TELEGRAM_CHAT_ID;
    const kv = platform?.env?.STORIES_KV;
    const bucket = platform?.env?.IMAGES_BUCKET;

    if (!botToken || !chatId) {
      console.error("Missing Telegram keys:", { hasToken: !!botToken, hasChatId: !!chatId });
      return json({ success: true, warning: "Configuration missing on server" });
    }

    const uploadedKeys: string[] = [];
    const normalizedSlides: StorySlide[] = [];

    for (const imageInput of imageInputs) {
      if (typeof imageInput === "string") {
        const remoteUrl = imageInput.trim();
        await validateRemoteImage(remoteUrl);
        normalizedSlides.push({ imageUrl: remoteUrl });
        continue;
      }

      if (!(imageInput instanceof Blob) || !(imageInput instanceof File)) {
        return json({ error: "Invalid image data provided." }, { status: 400 });
      }

      if (!bucket) {
        return json({ error: "Image storage is not configured on the server." }, { status: 500 });
      }

      const uploaded = await uploadPendingStoryImage(imageInput, bucket);
      uploadedKeys.push(uploaded.key);
      normalizedSlides.push({ imageUrl: uploaded.imageUrl });
    }

    const cleanTitle = escapeHtml(title);
    const cleanTag = escapeHtml(tag);
    let formattedDate = expiresAt;
    if (expiresAt) {
      const [year, month, day] = expiresAt.split("-");
      if (year && month && day) {
        formattedDate = `${day}/${month}/${year}`;
      }
    }

    const virusWarning = await checkUrlSecurity(linkUrl, platform?.env);
    const storySummary = formatStorySummaryForTelegram({
      storyMode,
      imageCount: normalizedSlides.length,
      subtitle
    });

    const caption = `
🌟 <b>New Story Suggestion</b>

<b>Title:</b> ${cleanTitle}
${cleanTag ? `<b>Tag:</b> ${cleanTag}` : ""}
<b>Link:</b> ${escapeHtml(linkUrl || "None")}
${contactEmail ? `<b>Contact:</b> ${escapeHtml(contactEmail)}` : ""}
${formattedDate ? `<b>Expires:</b> ${escapeHtml(formattedDate)}` : ""}${virusWarning}

${storySummary}
    `.trim();

    const suggestionId = crypto.randomUUID();
    if (kv) {
      await kv.put(
        `story_suggestion:${suggestionId}`,
        JSON.stringify({
          title,
          subtitle,
          tag,
          storyMode,
          slides: normalizedSlides,
          pendingImageKeys: uploadedKeys,
          linkUrl,
          expiresAt,
          contactEmail,
          submittedAt: new Date().toISOString()
        }),
        { expirationTtl: 60 * 60 * 24 * 30 }
      );
    }

    const replyMarkup = {
      inline_keyboard: [
        [{ text: "✅ Approve & Publish", callback_data: kv ? `story_approve_${suggestionId}` : "action_approve" }],
        [
          { text: "✏️ Edit Text", callback_data: "action_edit_hint" },
          { text: "❌ Reject", callback_data: kv ? `story_reject_${suggestionId}` : "action_reject" }
        ]
      ]
    };

    let reviewMessageId: number | null = null;
    let tgRes: Response;

    if (storyMode === "sequence") {
      const media: Array<Record<string, string>> = [];
      const tgFormData = new FormData();
      tgFormData.append("chat_id", chatId);

      imageInputs.forEach((imageInput, index) => {
        if (typeof imageInput === "string") {
          const item: Record<string, string> = {
            type: "photo",
            media: imageInput.trim()
          };
          if (index === 0) {
            item.caption = caption;
            item.parse_mode = "HTML";
          }
          media.push(item);
          return;
        }

        const attachName = `story_image_${index}`;
        tgFormData.append(attachName, imageInput, (imageInput as File).name || `${attachName}.jpg`);
        const item: Record<string, string> = {
          type: "photo",
          media: `attach://${attachName}`
        };
        if (index === 0) {
          item.caption = caption;
          item.parse_mode = "HTML";
        }
        media.push(item);
      });

      tgFormData.append("media", JSON.stringify(media));
      tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
        method: "POST",
        body: tgFormData
      });
    } else {
      const tgFormData = new FormData();
      tgFormData.append("chat_id", chatId);
      tgFormData.append("caption", caption);
      tgFormData.append("parse_mode", "HTML");

      const firstImage = imageInputs[0];
      if (typeof firstImage === "string") {
        tgFormData.append("photo", firstImage.trim());
      } else if (firstImage instanceof Blob) {
        tgFormData.append("photo", firstImage, (firstImage as File).name || "upload.jpg");
      }

      tgFormData.append("reply_markup", JSON.stringify(replyMarkup));
      tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST",
        body: tgFormData
      });
    }

    if (!tgRes.ok) {
      const errData = await tgRes.text();
      console.error("Telegram API Error:", errData);
      if (bucket) {
        await Promise.all(uploadedKeys.map((key) => bucket.delete(key).catch(() => {})));
      }
      if (kv) await kv.delete(`story_suggestion:${suggestionId}`).catch(() => {});
      return json({ error: "Telegram failed to accept your image submission." }, { status: 500 });
    }

    const tgData = await tgRes.json();
    const photoMessageId = Array.isArray(tgData?.result)
      ? tgData.result[0]?.message_id
      : tgData?.result?.message_id;

    if (storyMode === "sequence" && photoMessageId) {
      const detailText = `
🧾 <b>Full Story Details</b>

<b>Title:</b> ${cleanTitle}
${cleanTag ? `<b>Tag:</b> ${cleanTag}` : ""}
<b>Images:</b> ${normalizedSlides.length}
${linkUrl ? `<b>Link:</b> ${escapeHtml(linkUrl)}` : ""}
${contactEmail ? `<b>Contact:</b> ${escapeHtml(contactEmail)}` : ""}
${formattedDate ? `<b>Expires:</b> ${escapeHtml(formattedDate)}` : ""}
<b>Description:</b>
<pre>${escapeHtml(subtitle) || " "}</pre>
      `.trim();

      const detailRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          reply_to_message_id: photoMessageId,
          text: detailText,
          parse_mode: "HTML",
          disable_web_page_preview: true,
          reply_markup: replyMarkup
        })
      });

      if (detailRes.ok) {
        const detailData = await detailRes.json().catch(() => null);
        reviewMessageId = detailData?.result?.message_id ?? null;
      }
    } else if (photoMessageId && subtitle.includes("\n")) {
      const detailText = `
🧾 <b>Full Story Details</b>

<b>Title:</b> ${cleanTitle}
${cleanTag ? `<b>Tag:</b> ${cleanTag}` : ""}
<b>Images:</b> ${normalizedSlides.length}
${linkUrl ? `<b>Link:</b> ${escapeHtml(linkUrl)}` : ""}
${contactEmail ? `<b>Contact:</b> ${escapeHtml(contactEmail)}` : ""}
${formattedDate ? `<b>Expires:</b> ${escapeHtml(formattedDate)}` : ""}
<b>Description:</b>
<pre>${escapeHtml(subtitle) || " "}</pre>
      `.trim();

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          reply_to_message_id: photoMessageId,
          text: detailText,
          parse_mode: "HTML",
          disable_web_page_preview: true
        })
      }).catch((err) => {
        console.error("Failed to send Telegram story detail message:", err);
      });
    }

    if (kv && reviewMessageId) {
      await kv.put(
        `story_suggestion:${suggestionId}`,
        JSON.stringify({
          title,
          subtitle,
          tag,
          storyMode,
          slides: normalizedSlides,
          pendingImageKeys: uploadedKeys,
          linkUrl,
          expiresAt,
          contactEmail,
          submittedAt: new Date().toISOString(),
          telegramReviewMessageId: reviewMessageId
        }),
        { expirationTtl: 60 * 60 * 24 * 30 }
      );
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
    const message = err instanceof Error ? err.message : "Internal server failure while processing.";
    return json({ error: message }, { status: 500 });
  }
}
