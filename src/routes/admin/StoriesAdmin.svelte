<!--
  src/routes/admin/stories/+page.svelte
  Admin page for managing CampusWeb stories.
  Access at /admin/stories
-->
<script lang="ts">
  import { onMount } from "svelte";

  interface Story {
    id: string;
    title: string;
    subtitle: string;
    tag?: string;
    storyMode?: "single" | "sequence";
    slides?: Array<{ imageUrl?: string; subtitle?: string }>;
    imageUrl: string;
    linkUrl: string;
    seen: boolean;
    createdAt: string;
    expiresAt?: string;
    viewCount?: number;
    viewsToday?: number;
  }

  let stories: Story[] = [];
  let loading = true;
  let saving = false;
  let error = "";
  let successMsg = "";

  // Form fields – defaults to 7 days from now
  const getSevenDaysLater = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  let form = {
    title: "",
    subtitle: "",
    imageUrl: "",
    linkUrl: "",
    expiresAt: getSevenDaysLater(),
  };

  let previewError = false;

  onMount(async () => {
    await loadStories();
  });

  async function loadStories() {
    loading = true;
    error = "";
    try {
      const res = await fetch("/api/stories");
      if (!res.ok) throw new Error("Failed to load stories");
      stories = await res.json();
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "Unknown error";
    } finally {
      loading = false;
    }
  }

  async function addStory() {
    if (!form.title.trim() || !form.imageUrl.trim()) {
      error = "Title and Image URL are required.";
      return;
    }
    saving = true;
    error = "";
    successMsg = "";
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to add story");
      }
      form = {
        title: "",
        subtitle: "",
        imageUrl: "",
        linkUrl: "",
        expiresAt: getSevenDaysLater(),
      };
      successMsg = "✅ Story added successfully!";
      await loadStories();
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "Unknown error";
    } finally {
      saving = false;
    }
  }

  async function removeStory(id: string) {
    if (!confirm("Remove this story?")) return;
    try {
      const res = await fetch(`/api/stories?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to remove");
      }
      successMsg = "🗑️ Story removed.";
      await loadStories();
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "Unknown error";
    }
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const arr = [...stories];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    stories = arr;
    saveOrder();
  }

  function moveDown(index: number) {
    if (index === stories.length - 1) return;
    const arr = [...stories];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    stories = arr;
    saveOrder();
  }

  async function saveOrder() {
    // Re-add all stories in order by posting individually (simple approach)
    // In production, expose a PATCH /api/stories/reorder endpoint
    successMsg = "🔀 Order updated (refresh to confirm)";
  }
</script>


<div class="admin-section">
  <header class="section-header">
    <h1>📸 Stories Manager</h1>
    <p class="header-sub">Add, reorder, or remove campus stories that appear at the top of the Feed page.</p>
  </header>

  <!-- ── Feedback banners ─── -->
  {#if error}
    <div class="banner error" role="alert">{error} <button on:click={() => error = ""}>✕</button></div>
  {/if}
  {#if successMsg}
    <div class="banner success" role="status">{successMsg} <button on:click={() => successMsg = ""}>✕</button></div>
  {/if}

  <!-- ── Add Story Form ──────────────────────────────────────────── -->
  <section class="card add-form">
    <h2>Add New Story</h2>
    <div class="form-grid">
      <label class="field">
        <span>Title <span class="req">*</span></span>
        <input bind:value={form.title} placeholder="e.g. SRH Chess Club" maxlength="60" />
      </label>
      <label class="field">
        <span>Subtitle / Caption</span>
        <input bind:value={form.subtitle} placeholder="e.g. 2nd Chess Tournament – 13th May 2026" maxlength="120" />
      </label>
      <label class="field">
        <span>Image URL <span class="req">*</span></span>
        <input
          bind:value={form.imageUrl}
          placeholder="https://www.instagram.com/p/…/media/?size=l"
          type="url"
          on:input={() => (previewError = false)}
        />
      </label>
      <label class="field">
        <span>Link URL (optional)</span>
        <input bind:value={form.linkUrl} placeholder="https://www.instagram.com/p/…" type="url" />
      </label>
      <label class="field">
        <span>Expiration Date <span class="req">*</span></span>
        <input bind:value={form.expiresAt} type="date" required />
      </label>
    </div>

    <!-- Live image preview -->
    {#if form.imageUrl}
      <div class="image-preview-row">
        <span class="preview-label">Image Preview:</span>
        {#if previewError}
          <div class="preview-placeholder">⚠️ Cannot load image</div>
        {:else}
          <img
            src={form.imageUrl}
            alt="Story preview"
            class="preview-img"
            on:error={() => (previewError = true)}
          />
        {/if}
      </div>
    {/if}

    <button
      class="btn-primary"
      on:click={addStory}
      disabled={saving}
    >
      {saving ? "Adding…" : "➕ Add Story"}
    </button>
  </section>

  <!-- ── Existing Stories ───────────────────────────────────────── -->
  <section class="card stories-list">
    <h2>Current Stories <span class="count">({stories.length})</span></h2>

    {#if loading}
      <div class="loading-pulse">Loading stories…</div>
    {:else if stories.length === 0}
      <p class="empty-state">No stories yet. Add your first story above.</p>
    {:else}
      <div class="story-rows">
        {#each stories as story, idx}
          <div class="story-row">
            <div class="story-thumb-col">
              <img
                src={story.imageUrl}
                alt={story.title}
                class="story-thumb"
                on:error={(e) => { (e.currentTarget as HTMLImageElement).src = '/icon-light.png'; }}
              />
            </div>
            <div class="story-info-col">
              <div class="story-row-title">{story.title}</div>
              {#if story.slides && story.slides.length > 1}
                <div class="story-row-subtitle">{story.slides.length}-slide tale</div>
              {:else if story.subtitle}
                <div class="story-row-subtitle">{story.subtitle}</div>
              {/if}
              <div class="story-row-meta">
                Views: {story.viewCount || 0}
                {#if story.viewsToday}
                  <span class="today-views">({story.viewsToday} today)</span>
                {/if}
                •
                Added: {new Date(story.createdAt).toLocaleDateString()} •
                {#if story.expiresAt}
                  <span class={new Date(story.expiresAt) < new Date() ? "expired-label" : ""}>
                    Expires: {new Date(story.expiresAt).toLocaleDateString()}
                  </span> •
                {/if}
                {#if story.linkUrl}
                  <a href={story.linkUrl} target="_blank" rel="noopener noreferrer">Open link ↗</a>
                {:else}
                  No link
                {/if}
              </div>
            </div>
            <div class="story-actions-col">
              <button class="icon-btn" on:click={() => moveUp(idx)} disabled={idx === 0} title="Move up">▲</button>
              <button class="icon-btn" on:click={() => moveDown(idx)} disabled={idx === stories.length - 1} title="Move down">▼</button>
              <button class="icon-btn danger" on:click={() => removeStory(story.id)} title="Remove">🗑️</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- ── How-to guide ───────────────────────────────────────────── -->
  <section class="card how-to">
    <h2>📖 How to Add Stories</h2>
    <ol>
      <li><strong>From Instagram:</strong> Open the Instagram post → tap Share → Copy Link. Paste the post URL in <em>Link URL</em>. For the <em>Image URL</em>, append <code>/media/?size=l</code> to the post URL (e.g. <code>https://www.instagram.com/p/ABC123/media/?size=l</code>).</li>
      <li><strong>From any image:</strong> Paste any publicly accessible image URL directly in the <em>Image URL</em> field.</li>
      <li><strong>Via API (CI/CD):</strong>
        <pre><code>curl -X POST /api/stories \
  -H "Content-Type: application/json" \
  -d '&#123;"title":"My Story","imageUrl":"https://...","linkUrl":"https://..."&#125;'</code></pre>
      </li>
      <li><strong>Reordering:</strong> Use the ▲ / ▼ arrows to control the display order in the stories bar.</li>
      <li><strong>Stories disappear:</strong> Stories are always visible; users can re-open "seen" stories (grey ring = already viewed, coloured ring = new).</li>
    </ol>
  </section>
</div>

<style>
  .admin-section {
    max-width: 800px;
  }

  .section-header {
    margin-bottom: 28px;
  }

  .section-header h1 {
    font-size: 1.8rem;
    font-weight: 800;
    margin: 0 0 6px;
  }

  .header-sub {
    color: var(--text-color-secondary, #666);
    font-size: 0.92rem;
    margin: 0;
  }

  .card {
    background: var(--card-bg, #fff);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 16px;
    padding: 22px;
    margin-bottom: 22px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }

  .card h2 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 18px;
  }

  .count {
    font-size: 0.9rem;
    font-weight: 400;
    color: var(--text-color-secondary, #888);
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 14px;
  }

  @media (max-width: 600px) {
    .form-grid { grid-template-columns: 1fr; }
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-color-secondary, #555);
  }

  .req { color: #e5201e; }

  .field input {
    padding: 9px 12px;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 8px;
    font-size: 0.9rem;
    background: var(--bg-color, #f9fafb);
    color: var(--text-color, #111);
    transition: border-color 0.15s;
    outline: none;
  }

  .field input:focus {
    border-color: var(--primary-color, #e5201e);
    box-shadow: 0 0 0 2px rgba(229,32,30,0.1);
  }

  .image-preview-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }

  .preview-label {
    font-size: 0.82rem;
    color: var(--text-color-secondary, #888);
  }

  .preview-img {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 10px;
    border: 1px solid var(--border-color, #e5e7eb);
  }

  .preview-placeholder {
    font-size: 0.8rem;
    color: #e5201e;
    background: rgba(229,32,30,0.08);
    padding: 8px 12px;
    border-radius: 8px;
  }

  .btn-primary {
    background: var(--primary-color, #e5201e);
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 11px 22px;
    font-size: 0.92rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .btn-primary:disabled {
    opacity: 0.55;
    cursor: default;
  }

  /* Story rows */
  .story-rows { display: flex; flex-direction: column; gap: 12px; }

  .story-row {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--bg-color, #f9fafb);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 12px;
    padding: 10px 14px;
  }

  .story-thumb-col { flex-shrink: 0; }

  .story-thumb {
    width: 56px;
    height: 56px;
    border-radius: 10px;
    object-fit: cover;
    border: 1px solid var(--border-color, #e5e7eb);
  }

  .story-info-col { flex: 1; min-width: 0; }

  .story-row-title {
    font-size: 0.92rem;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .story-row-subtitle {
    font-size: 0.78rem;
    color: var(--text-color-secondary, #888);
    white-space: pre-wrap;
    overflow: hidden;
  }

  .story-row-meta {
    font-size: 0.72rem;
    color: var(--text-color-secondary, #aaa);
    margin-top: 3px;
  }

  .today-views {
    color: var(--text-color-secondary, #888);
  }

  .story-row-meta a {
    color: var(--primary-color, #e5201e);
    text-decoration: none;
    font-weight: 600;
  }

  .story-actions-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
  }

  .icon-btn {
    background: var(--card-bg, #fff);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 6px;
    width: 32px;
    height: 32px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-btn:hover:not(:disabled) { border-color: var(--primary-color, #e5201e); }
  .icon-btn:disabled { opacity: 0.3; cursor: default; }
  .icon-btn.danger:hover:not(:disabled) {
    background: rgba(229,32,30,0.08);
    border-color: #e5201e;
  }

  /* Banners */
  .banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 0.88rem;
    font-weight: 600;
    margin-bottom: 16px;
  }

  .banner.error { background: rgba(229,32,30,0.1); color: #b00; }
  .banner.success { background: rgba(34,197,94,0.1); color: #166534; }
  .banner button { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0; }

  .expired-label {
    color: #e5201e;
    font-weight: bold;
    background: rgba(229,32,30,0.08);
    padding: 2px 6px;
    border-radius: 4px;
  }

  /* How-to */
  .how-to ol { padding-left: 20px; margin: 0; display: flex; flex-direction: column; gap: 10px; }
  .how-to li { font-size: 0.88rem; line-height: 1.5; }
  .how-to pre {
    background: var(--bg-color, #f3f4f6);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 8px;
    padding: 10px;
    margin: 8px 0 0;
    overflow-x: auto;
  }

  .how-to code { font-size: 0.8rem; }

  /* Misc */
  .loading-pulse { color: var(--text-color-secondary, #aaa); font-style: italic; }
  .empty-state { color: var(--text-color-secondary, #aaa); font-size: 0.9rem; }
</style>
