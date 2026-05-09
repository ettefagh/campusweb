import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { incrementStat } from "$lib/server/stats";

function parseExpiration(expiresParsed: string): string {
  let finalExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  if (expiresParsed) {
    const p = expiresParsed.toLowerCase().trim();
    if (p.startsWith('+') && p.endsWith('d')) {
      const days = parseInt(p.replace('+','').replace('d',''));
      if (!isNaN(days)) finalExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    } else if (p.startsWith('+') && p.endsWith('w')) {
      const weeks = parseInt(p.replace('+','').replace('w',''));
      if (!isNaN(weeks)) finalExpiresAt = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      const parts = expiresParsed.split('/');
      if (parts.length === 3) {
        const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(d.getTime())) finalExpiresAt = d.toISOString();
      }
    }
  }
  return finalExpiresAt;
}

export async function POST({ request, platform }) {
  try {
    const body = await request.json();
    const botToken = env.PRIVATE_TELEGRAM_BOT_TOKEN || platform?.env?.PRIVATE_TELEGRAM_BOT_TOKEN;
    const adminChatId = env.PRIVATE_TELEGRAM_CHAT_ID || platform?.env?.PRIVATE_TELEGRAM_CHAT_ID;

    if (!botToken) return json({ error: "No bot token" }, { status: 500 });

    // Handle Text Replies (Editing the caption)
    if (body.message && body.message.reply_to_message && body.message.text) {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const originalMsgId = body.message.reply_to_message.message_id;
        const originalKeyboard = body.message.reply_to_message.reply_markup;
        
        // Overwrite the original bot message with the admin's edited text
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageCaption`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: msgChatId,
            message_id: originalMsgId,
            caption: body.message.text,
            parse_mode: "HTML",
            reply_markup: originalKeyboard // Preserve Approve/Reject buttons
          })
        });

        // Delete the admin's text reply to keep chat clean
        await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: msgChatId,
            message_id: body.message.message_id
          })
        });
        
        const kv = platform?.env?.STORIES_KV;
        if (kv) incrementStat(kv, "actions", "edited").catch(() => {});
      }
      return json({ success: true });
    }

    // Handle /alert Command
    if (body.message && body.message.text?.startsWith("/alert")) {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const kv = platform?.env?.STORIES_KV;
        if (kv) {
          const text = body.message.text.replace("/alert", "").trim();
          if (text === "clear" || text === "") {
            await kv.delete("campus_alert");
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: msgChatId, text: "✅ Global alert cleared." })
            });
          } else {
            await kv.put("campus_alert", JSON.stringify({ text, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }));
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: msgChatId, text: "🚨 Global alert broadcasted for 24 hours!" })
            });
          }
        }
      }
      return json({ success: true });
    }

    // Handle /help Command
    if (body.message && body.message.text === "/help") {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const text = `🛠 <b>CampusWeb Bot Guide</b>\n\n` +
          `<b>Commands:</b>\n` +
          `/list - View and manage active stories\n` +
          `/stats - View suggestion statistics\n` +
          `/help - Show this guide\n\n` +
          `<b>Managing Suggestions:</b>\n` +
          `When a student submits a suggestion, you can:\n` +
          `- Click <b>Approve & Publish</b> to immediately add it.\n` +
          `- Click <b>Edit Text</b> for instructions on how to reply and fix typos before approving.\n` +
          `- Click <b>Reject</b> to discard it.\n\n` +
          `<b>Directly Creating Stories:</b>\n` +
          `You can bypass the web form and create stories directly!\n` +
          `Send a Photo to this bot with a caption in this format:\n\n` +
          `/create\nTitle: Your Title\nSubtitle: Optional details\nLink: https://...\nExpires: DD/MM/YYYY`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: msgChatId, text, parse_mode: "HTML" })
        });
      }
      return json({ success: true });
    }

    // Handle /stats Command
    if (body.message && body.message.text === "/stats") {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const kv = platform?.env?.STORIES_KV;
        if (!kv) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: msgChatId, text: "⚠️ Cloudflare KV not bound!" })
          });
          return json({ success: true });
        }
        const raw = await kv.get("bot_stats");
        let statsStr = "No stats yet.";
        if (raw) {
          try {
            const st = JSON.parse(raw);
            statsStr = `📊 <b>Bot Statistics</b>\n\n`;
            statsStr += `<b>Suggestions Received:</b>\n`;
            statsStr += `- All Time: ${st.suggestions?.allTime || 0}\n`;
            const today = new Date().toISOString().split("T")[0];
            const thisMonth = today.substring(0, 7);
            statsStr += `- Today: ${st.suggestions?.daily?.[today] || 0}\n`;
            statsStr += `- This Month: ${st.suggestions?.monthly?.[thisMonth] || 0}\n\n`;
            statsStr += `<b>Fields Usage:</b>\n`;
            statsStr += `- Included Expiry: ${st.fields?.hasExpiry || 0}\n`;
            statsStr += `- Included URL: ${st.fields?.hasUrl || 0}\n\n`;
            statsStr += `<b>Admin Actions:</b>\n`;
            statsStr += `- Approved: ${st.actions?.approved || 0}\n`;
            statsStr += `- Declined: ${st.actions?.declined || 0}\n`;
            statsStr += `- Edited: ${st.actions?.edited || 0}\n`;
            statsStr += `- Direct Created: ${st.actions?.directCreated || 0}\n`;
          } catch(e) {}
        }
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: msgChatId, text: statsStr, parse_mode: "HTML" })
        });
      }
      return json({ success: true });
    }

    // Handle /list Command (Story Management)
    if (body.message && body.message.text === "/list") {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const kv = platform?.env?.STORIES_KV;
        if (!kv) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: msgChatId, text: "⚠️ Cloudflare KV not bound!" })
          });
          return json({ success: true });
        }
        
        let stories = [];
        const kvData = await kv.get("stories");
        if (kvData) {
          try { stories = JSON.parse(kvData); } catch(e) {}
        }
        
        // Filter out expired stories
        const now = new Date();
        const activeStories = stories.filter(s => new Date(s.expiresAt) > now);
        
        if (activeStories.length === 0) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: msgChatId, text: "📭 There are no active stories right now." })
          });
          return json({ success: true });
        }
        
        let text = "📚 <b>Active Stories Management</b>\n\n";
        const inline_keyboard = [];
        
        activeStories.forEach((s, idx) => {
          const addedStr = new Date(s.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
          const expireStr = new Date(s.expiresAt).toLocaleDateString('en-GB');
          text += `${idx + 1}. <b>${s.title}</b>\n   🗓 Added: ${addedStr}\n   ⏳ Expires: ${expireStr}\n\n`;
          inline_keyboard.push([{ text: `❌ Delete #${idx + 1}`, callback_data: `action_delete_story_${s.id}` }]);
        });
        
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: msgChatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard } })
        });
      }
      return json({ success: true });
    }

    // Handle Direct Story Creation via /create caption OR Album secondary photos
    if (body.message && body.message.photo) {
      const msgChatId = body.message.chat.id.toString();
      if (msgChatId === adminChatId) {
        const msg = body.message;
        const isCreate = msg.caption?.startsWith("/create");
        const isAlbumSecondary = msg.media_group_id && !msg.caption;
        
        if (isCreate || isAlbumSecondary) {
          const kv = platform?.env?.STORIES_KV;
          if (!kv) return json({ error: "No KV bound" });
          
          let title = "Direct Story", subtitle = "", linkUrl = "", expiresParsed = "";
          let finalExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          
          if (isCreate) {
            const caption = msg.caption || "";
            const extract = (label: string) => {
              const regex = new RegExp(`${label}:\\s*(.+)`, "i");
              const match = caption.match(regex);
              return match && match[1].trim() !== "None" ? match[1].trim() : "";
            };
            title = extract("Title") || "Direct Story";
            subtitle = extract("Subtitle");
            linkUrl = extract("Link");
            expiresParsed = extract("Expires");
            finalExpiresAt = parseExpiration(expiresParsed);
            
            if (msg.media_group_id) {
              await kv.put(`album_${msg.media_group_id}`, JSON.stringify({ title, subtitle, linkUrl, finalExpiresAt }), { expirationTtl: 300 });
            }
          } else if (isAlbumSecondary) {
            // Wait up to 2 seconds for the first photo to write to KV (since telegram fires these concurrently)
            let cached = null;
            for (let i = 0; i < 4; i++) {
              cached = await kv.get(`album_${msg.media_group_id}`);
              if (cached) break;
              await new Promise(r => setTimeout(r, 500));
            }
            if (cached) {
              try {
                const data = JSON.parse(cached);
                title = data.title; subtitle = data.subtitle; linkUrl = data.linkUrl; finalExpiresAt = data.finalExpiresAt;
              } catch(e) {}
            } else {
              return json({ success: true }); // Ignore if no parent album found
            }
          }
          
          const photoId = msg.photo[msg.photo.length - 1].file_id;
          const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${photoId}`);
          const fileData = await fileRes.json();
          if (!fileData.ok) return json({ error: "File fetch failed" });
          
          const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
          const r2 = platform?.env?.IMAGES_BUCKET;
          if (!r2) return json({ error: "No R2 bound" });
          
          let imgBlob;
          try {
            const imgRes = await fetch(fileUrl);
            imgBlob = await imgRes.blob();
          } catch (e: any) { return json({ error: "Telegram download failed" }); }
          
          const filename = `story-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
          await r2.put(filename, imgBlob, { httpMetadata: { contentType: "image/jpeg" } });
          const permanentImageUrl = `/api/images/${filename}`;
          
          const newStory = {
            id: `story-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title, subtitle, imageUrl: permanentImageUrl, linkUrl,
            seen: false, createdAt: new Date().toISOString(), expiresAt: finalExpiresAt
          };
          let existingStories = [];
          const kvData = await kv.get("stories");
          if (kvData) { try { existingStories = JSON.parse(kvData); } catch(e) {} }
          existingStories.unshift(newStory);
          await kv.put("stories", JSON.stringify(existingStories));
          
          if (isCreate) {
            incrementStat(kv, "actions", "directCreated").catch(() => {});
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: msgChatId, text: msg.media_group_id ? "✅ <b>Direct Album Published!</b>" : "✅ <b>Direct Story Published!</b>", parse_mode: "HTML", reply_to_message_id: msg.message_id })
            });
          }
          return json({ success: true });
        }
      }
    }

    // We only care about callback_queries (button clicks) from this point on
    if (!body.callback_query) {
      return json({ success: true }); // Acknowledge other updates silently
    }

    const cb = body.callback_query;
    const action = cb.data;
    const message = cb.message;
    const chatId = message.chat.id;
    const messageId = message.message_id;

    // Helper to edit the original Telegram message
    const editMessage = async (newCaption: string) => {
      await fetch(`https://api.telegram.org/bot${botToken}/editMessageCaption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          caption: newCaption,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [] } // Removes the buttons
        })
      });
    };

    if (action === "action_edit_hint") {
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          callback_query_id: cb.id, 
          text: "✏️ HOW TO EDIT:\n\n1. Copy the text of this message.\n2. Paste it in your chat and fix any typos.\n3. Swipe Left on THIS message to Reply to it.\n4. Send your message!\n\nThe bot will automatically overwrite this suggestion with your edited text.", 
          show_alert: true 
        })
      }).catch(() => {});
      return json({ success: true });
    }

    if (action.startsWith("action_delete_story_")) {
      const storyId = action.replace("action_delete_story_", "");
      const kv = platform?.env?.STORIES_KV;
      if (kv) {
        let stories = [];
        const kvData = await kv.get("stories");
        if (kvData) {
          try { stories = JSON.parse(kvData); } catch(e) {}
        }
        const updated = stories.filter(s => s.id !== storyId);
        await kv.put("stories", JSON.stringify(updated));
        
        // Let the user know by answering callback query with an alert
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cb.id, text: "🗑 Story deleted successfully!", show_alert: true })
        }).catch(() => {});
        
        // Delete the old list message so they have to type /list to get fresh data
        await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, message_id: messageId })
        });
      }
      return json({ success: true });
    }

    if (action === "action_reject") {
      const kv = platform?.env?.STORIES_KV;
      if (kv) incrementStat(kv, "actions", "declined").catch(() => {});
      
      await editMessage("❌ <b>Suggestion Rejected</b>\n\n" + (message.caption || ""));
      return json({ success: true });
    }

    if (action === "action_approve") {
      // Immediately answer the callback query to remove the loading state on the button
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cb.id, text: "Processing..." })
      }).catch(() => {});

      // 1. Get the image from Telegram
      if (!message.photo || message.photo.length === 0) {
        await editMessage("⚠️ Error: No photo found in this message.");
        return json({ error: "No photo" });
      }

      // Get highest resolution photo (last in array)
      const photoId = message.photo[message.photo.length - 1].file_id;

      // Get file path from Telegram
      const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${photoId}`);
      const fileData = await fileRes.json();
      
      if (!fileData.ok) {
        await editMessage("⚠️ Error: Failed to retrieve file path from Telegram.");
        return json({ error: "Telegram file get failed" });
      }

      const filePath = fileData.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

      // 2. Upload to Cloudflare R2
      const r2 = platform?.env?.IMAGES_BUCKET;
      if (!r2) {
        await editMessage("⚠️ Error: Cloudflare R2 (IMAGES_BUCKET) is not bound.");
        return json({ error: "No R2 bound" });
      }

      // Download the raw image from Telegram
      let imgBlob;
      try {
        const imgRes = await fetch(fileUrl);
        imgBlob = await imgRes.blob();
      } catch (e: any) {
        await editMessage(`⚠️ Error: Failed to download image from Telegram. ${e.message}`);
        return json({ error: "Telegram download failed" });
      }

      // Create a unique filename
      const filename = `story-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;

      // Upload to R2
      try {
        await r2.put(filename, imgBlob, {
          httpMetadata: { contentType: "image/jpeg" }
        });
      } catch (e: any) {
        await editMessage(`⚠️ Error: R2 upload failed. ${e.message}`);
        return json({ error: "R2 upload failed" });
      }

      // The new URL served by our own endpoint
      const permanentImageUrl = `/api/images/${filename}`;

      // 3. Parse Caption to extract Title/Subtitle/Link
      const caption = message.caption || "";
      
      const extract = (label: string) => {
        const regex = new RegExp(`${label}:\\s*(.+)`, "i");
        const match = caption.match(regex);
        return match && match[1].trim() !== "None" ? match[1].trim() : "";
      };

      const title = extract("Title") || "New Story";
      const subtitle = extract("Subtitle");
      const linkUrl = extract("Link");
      const expiresParsed = extract("Expires"); // Expecting DD/MM/YYYY or +3d

      const finalExpiresAt = parseExpiration(expiresParsed);

      // 4. Save to Cloudflare KV
      const kv = platform?.env?.STORIES_KV;
      if (!kv) {
        await editMessage("⚠️ Error: Cloudflare KV (STORIES_KV) is not bound. Image uploaded but story not saved.");
        return json({ error: "No KV bound" });
      }

      const newStory = {
        id: `story-${Date.now()}`,
        title,
        subtitle,
        imageUrl: permanentImageUrl,
        linkUrl,
        seen: false,
        createdAt: new Date().toISOString(),
        expiresAt: finalExpiresAt
      };

      // Get existing stories from KV
      let existingStories = [];
      const kvData = await kv.get("stories");
      if (kvData) {
        try {
          existingStories = JSON.parse(kvData);
        } catch(e) {}
      }

      existingStories.unshift(newStory);
      await kv.put("stories", JSON.stringify(existingStories));
      
      incrementStat(kv, "actions", "approved").catch(() => {});

      // 5. Success!
      await editMessage("✅ <b>Published to CampusWeb!</b>\n\n" + caption);
      
      return json({ success: true });
    }

    return json({ success: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}
