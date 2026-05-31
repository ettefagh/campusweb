<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { t } from "$lib/i18n";

  export let isOpen = false;

  const dispatch = createEventDispatcher();
  let dialog: HTMLDialogElement;

  $: if (dialog) {
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }

  const MIN_SEQUENCE_SLIDES = 2;
  const MAX_SEQUENCE_SLIDES = 6;
  const STORY_TAG_OPTIONS = ["", "EVENT", "LIVE", "PROMO", "AD", "RENT", "LIVING"] as const;

  type StoryMode = "single" | "sequence";

  let title = "";
  let subtitle = "";
  let tag = "";
  let linkUrl = "";
  let expiresAt = "";
  let contactEmail = "";
  let storyMode: StoryMode = "single";

  // Image input management
  let inputMode: 'file' | 'url' = 'file'; // default to file for better mobile experience
  let imageUrl = "";
  let imageUrlsText = "";
  let fileInput: HTMLInputElement;
  let selectedFiles: File[] = [];
  let previewSrcs: string[] = [];

  let submitting = false;
  let success = false;
  let errorMsg = "";
  let emailStatus: "sent" | "skipped" | "failed" = "skipped";
  let step = 1;

  function onBackdropClick(event: MouseEvent) {
    if (event.target === dialog) close();
  }

  function nextStep() {
    errorMsg = "";
    if (step === 1) {
      if (!title.trim()) {
        errorMsg = "A title is required.";
        return;
      }
      if (!subtitle.trim()) {
        errorMsg = "A description is required.";
        return;
      }
      step = 2;
    } else if (step === 2) {
      let imagePayloads: Array<File | string> = [];
      if (inputMode === 'file') {
        imagePayloads = selectedFiles;
      } else {
        const urls = storyMode === "sequence"
          ? imageUrlsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
          : [imageUrl.trim()].filter(Boolean);
        imagePayloads = urls;
      }

      if (imagePayloads.length === 0) {
        errorMsg = "Please provide an image.";
        return;
      }

      if (storyMode === "sequence") {
        if (imagePayloads.length < MIN_SEQUENCE_SLIDES) {
          errorMsg = "A tale needs at least two images.";
          return;
        }
        if (imagePayloads.length > MAX_SEQUENCE_SLIDES) {
          errorMsg = `A tale can have up to ${MAX_SEQUENCE_SLIDES} images.`;
          return;
        }
      } else if (imagePayloads.length !== 1) {
        errorMsg = "A single story needs exactly one image.";
        return;
      }
      step = 3;
    }
  }

  function prevStep() {
    errorMsg = "";
    step = Math.max(1, step - 1);
  }

  async function sanitizeImageFile(file: File): Promise<File> {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas not available");
    }

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Failed to re-encode image"));
      }, file.type === "image/png" ? "image/png" : "image/jpeg", file.type === "image/png" ? undefined : 0.92);
    });

    const extension = file.type === "image/png" ? "png" : "jpg";
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + `.${extension}`, {
      type: blob.type || (file.type === "image/png" ? "image/png" : "image/jpeg"),
      lastModified: file.lastModified
    });
  }

  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const files = Array.from(target.files).slice(0, storyMode === "sequence" ? MAX_SEQUENCE_SLIDES : 1);

      if (files.some((file) => !file.type.startsWith("image/"))) {
        errorMsg = "Please select an actual image file.";
        selectedFiles = [];
        previewSrcs = [];
        return;
      }

      errorMsg = "";
      selectedFiles = files;
      previewSrcs.forEach((src) => URL.revokeObjectURL(src));
      previewSrcs = files.map((file) => URL.createObjectURL(file));
    }
  }

  function switchMode(mode: 'file' | 'url') {
    inputMode = mode;
    errorMsg = "";
  }

  function switchStoryMode(mode: StoryMode) {
    storyMode = mode;
    errorMsg = "";
    if (mode === "single") {
      selectedFiles = selectedFiles.slice(0, 1);
      previewSrcs = previewSrcs.slice(0, 1);
      imageUrlsText = imageUrlsText
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 1)
        .join("\n");
    }
  }

  function addDays(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    expiresAt = d.toISOString().split("T")[0];
  }

  function close() {
    if (submitting) return;
    isOpen = false;
    setTimeout(() => {
      if (success) {
        title = ""; subtitle = ""; linkUrl = ""; expiresAt = ""; contactEmail = "";
        storyMode = "single";
        imageUrl = ""; imageUrlsText = ""; selectedFiles = [];
        previewSrcs.forEach((src) => URL.revokeObjectURL(src));
        previewSrcs = [];
        inputMode = "file"; emailStatus = "skipped";
        step = 1;
      }
      success = false; errorMsg = "";
    }, 300);
    dispatch("close");
  }

  async function submitStory() {
    errorMsg = "";
    
    // Step 3 final check if needed, but Step 1 & 2 are already validated
    let imagePayloads: Array<File | string> = [];
    if (inputMode === 'file') {
      imagePayloads = selectedFiles;
    } else {
      const urls = storyMode === "sequence"
        ? imageUrlsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
        : [imageUrl.trim()].filter(Boolean);
      imagePayloads = urls;
    }

    submitting = true;

    try {
      const sanitizedFiles =
        inputMode === "file"
          ? await Promise.all(selectedFiles.map((file) => sanitizeImageFile(file)))
          : [];

      // Build form data payload
      const fd = new FormData();
      fd.append("title", title);
      fd.append("storyMode", storyMode);
      fd.append("subtitle", subtitle);
      fd.append("tag", tag);
      fd.append("linkUrl", linkUrl);
      fd.append("expiresAt", expiresAt);
      fd.append("contactEmail", contactEmail);
      if (inputMode === "file") {
        sanitizedFiles.forEach((file) => fd.append("image", file));
      } else {
        imagePayloads.forEach((value) => fd.append("image", value));
      }

      const res = await fetch("/api/suggest-story", {
        method: "POST",
        body: fd
      });

      const data = await res.json();

      if (!res.ok) {
        errorMsg = data.error || "Failed to submit. Please check your image.";
      } else {
        emailStatus = data.emailStatus || "skipped";
        success = true;
        setTimeout(() => close(), 2200);
      }
    } catch (err) {
      errorMsg = "Check your internet connection and try again.";
    } finally {
      submitting = false;
    }
  }
</script>

<dialog
  bind:this={dialog}
  class="native-modal"
  on:close={close}
  on:click={onBackdropClick}
>
  <div class="modal-content" on:click|stopPropagation>
    <div class="modal-header">
      <h2 id="story-suggestion-title">{$t.settings.suggestStoryTitle}</h2>
      <button class="close-btn" on:click={close}>✕</button>
    </div>

    {#if success}
      <div class="success-state">
        <div class="success-icon">✓</div>
        <h3>Awesome!</h3>
        <p>We sent it directly to the curation team.</p>
        {#if emailStatus === "sent"}
          <p class="email-status success">Confirmation email sent.</p>
        {:else if emailStatus === "failed"}
          <p class="email-status warning">Suggestion received, but the confirmation email could not be sent.</p>
        {/if}
      </div>
    {:else}
      <div class="modal-body">
        {#if errorMsg}
          <div class="error-msg">{errorMsg}</div>
        {/if}

        <div class="progress-indicator">
          <div class="step {step >= 1 ? 'active' : ''}">1. Basics</div>
          <div class="step {step >= 2 ? 'active' : ''}">2. Media</div>
          <div class="step {step >= 3 ? 'active' : ''}">3. Details</div>
        </div>

        {#if step === 1}
          <div class="input-group">
            <label for="title">{$t.settings.storyTitleLabel} <span class="req">*</span></label>
            <input type="text" id="title" bind:value={title} placeholder="e.g., New Semester Welcome!" maxlength="40" disabled={submitting} required />
          </div>

          <div class="input-group">
            <span class="field-label">Story format</span>
            <div class="tabs full-width">
              <button class="tab {storyMode==='single'?'active':''}" on:click={() => switchStoryMode('single')} type="button">Single</button>
              <button class="tab {storyMode==='sequence'?'active':''}" on:click={() => switchStoryMode('sequence')} type="button">Tale</button>
            </div>
          </div>

          <div class="input-group">
            <label for="subtitle">{storyMode === "sequence" ? "Shared description" : $t.settings.storySubtitleLabel} <span class="req">*</span></label>
            <textarea
              id="subtitle"
              bind:value={subtitle}
              placeholder={storyMode === "sequence" ? "One description for the full image sequence..." : "Details, times, location..."}
              disabled={submitting}
              required
            ></textarea>
          </div>

          <div class="input-group">
            <label for="tag">{$t.settings.storyTagLabel}</label>
            <select id="tag" bind:value={tag} disabled={submitting}>
              <option value="">No tag</option>
              {#each STORY_TAG_OPTIONS.slice(1) as option}
                <option value={option}>{option}</option>
              {/each}
            </select>
          </div>
        {:else if step === 2}
          <div class="input-group mt-lg">
            <div class="tab-header">
              <span class="field-label">Image <span class="req">*</span></span>
              <div class="tabs">
                <button class="tab {inputMode==='file'?'active':''}" on:click={() => switchMode('file')} type="button">Upload</button>
                <button class="tab {inputMode==='url'?'active':''}" on:click={() => switchMode('url')} type="button">Paste URL</button>
              </div>
            </div>

            {#if inputMode === 'file'}
              <label class="file-upload-zone {selectedFiles.length > 0 ? 'has-file' : ''}">
                <input
                  type="file"
                  bind:this={fileInput}
                  on:change={handleFileChange}
                  accept="image/*"
                  multiple={storyMode === "sequence"}
                  style="display:none;"
                />
                
                {#if previewSrcs.length > 0}
                  <div class="preview-grid">
                    {#each previewSrcs as previewSrc, idx}
                      <img src={previewSrc} class="preview-thumb" alt="Preview {idx + 1}" />
                    {/each}
                  </div>
                  <div class="upload-text overlay">
                    {storyMode === "sequence" ? `${previewSrcs.length} images selected` : "Tap to Change Photo"}
                  </div>
                {:else}
                  <div class="upload-icon">📷</div>
                  <div class="upload-text">{storyMode === "sequence" ? "Choose up to 6 Photos" : "Choose from Photo Library"}</div>
                  <div class="sub-hint">{storyMode === "sequence" ? "At least 2 images for a tale" : "Max size 10MB"}</div>
                {/if}
              </label>
            {:else}
              {#if storyMode === "sequence"}
                <textarea
                  bind:value={imageUrlsText}
                  placeholder="One image URL per line"
                  disabled={submitting}
                ></textarea>
                <span class="hint">Add 2 to 6 public image URLs, one per line.</span>
              {:else}
                <input type="url" bind:value={imageUrl} placeholder="https://example.com/myimage.jpg" disabled={submitting} class="url-input" />
                <span class="hint">Make sure it's a public direct link to an image.</span>
              {/if}
            {/if}
          </div>

          <div class="input-group mt-sm">
            <label for="linkUrl">{$t.settings.storyLinkLabel}</label>
            <input type="url" id="linkUrl" bind:value={linkUrl} placeholder="https://..." disabled={submitting} />
          </div>
        {:else if step === 3}
          <div class="input-group mt-sm">
            <label for="storyContactEmail">Contact Email (Optional)</label>
            <input
              type="email"
              id="storyContactEmail"
              bind:value={contactEmail}
              placeholder="your@email.com"
              disabled={submitting}
            />
          </div>

          <div class="input-group mt-sm">
            <label for="expiresAt">{$t.settings.storyExpiresLabel}</label>
            <div class="date-wrapper">
              <input type="date" id="expiresAt" bind:value={expiresAt} disabled={submitting} />
              <div class="quick-dates">
                <button type="button" class="quick-btn" on:click={() => addDays(3)}>+3d</button>
                <button type="button" class="quick-btn" on:click={() => addDays(7)}>+1w</button>
              </div>
            </div>
          </div>
        {/if}

        <div class="modal-footer popup-footer-safe">
          {#if step > 1}
            <button class="cancel-btn" on:click={prevStep} disabled={submitting}>Back</button>
          {:else}
            <button class="cancel-btn" on:click={close} disabled={submitting}>Cancel</button>
          {/if}

          {#if step < 3}
            <button class="submit-btn" on:click={nextStep} disabled={submitting}>Next</button>
          {:else}
            <button class="submit-btn" on:click={submitStory} disabled={submitting}>
              {submitting ? "Sending..." : "Submit for Review"}
            </button>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</dialog>

<style>
  .native-modal {
    background: transparent;
    border: none;
    padding: 16px;
    margin: auto;
    max-width: 440px;
    width: 100%;
    outline: none;
    box-sizing: border-box;
  }

  .native-modal::backdrop {
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(6px);
    opacity: 0;
    transition: opacity 0.3s ease, overlay 0.3s allow-discrete, display 0.3s allow-discrete;
  }

  .native-modal[open]::backdrop {
    opacity: 1;
  }

  @starting-style {
    .native-modal[open]::backdrop {
      opacity: 0;
    }
  }

  .modal-content {
    background: var(--card-bg, #fff);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-radius: 20px;
    width: 100%;
    max-width: 420px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--glass-shadow-lg, 0 12px 40px rgba(0, 0, 0, 0.25));
    color: var(--text-color, #111);
    overflow: hidden;
    border: 1px solid var(--border-color, #eee);
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.19, 1, 0.22, 1), overlay 0.3s allow-discrete, display 0.3s allow-discrete;
  }

  .native-modal[open] .modal-content {
    opacity: 1;
    transform: translateY(0);
  }

  @starting-style {
    .native-modal[open] .modal-content {
      opacity: 0;
      transform: translateY(30px);
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 24px;
    border-bottom: 1px solid var(--border-color, #eee);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .close-btn {
    background: var(--glass-bg-strong, rgba(0,0,0,0.05));
    color: var(--text-color, #111);
    border: none;
    width: 28px; height: 28px;
    border-radius: 50%;
    font-weight: bold;
    cursor: pointer;
    display: flex; justify-content: center; align-items: center;
  }

  .modal-body {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    flex: 1;
    overflow-y: auto;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .input-group label,
  .field-label {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted, #666);
  }

  .req { color: var(--primary-color, #e5201e); }

  input,
  select {
    width: 100%;
    padding: 12px 14px;
    border: 1.5px solid var(--border-color, #ddd);
    border-radius: 10px;
    font-size: 1rem;
    background: var(--glass-bg-strong, #fafafa);
    color: var(--text-color, #111);
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: var(--primary-color, #e5201e);
    background: var(--card-bg, white);
    box-shadow: 0 0 0 3px rgba(229, 32, 30, 0.1);
  }

  input:user-invalid,
  select:user-invalid,
  textarea:user-invalid {
    border-color: #ff4d4f;
    background: color-mix(in srgb, #ff4d4f 5%, var(--glass-bg-strong, #fafafa));
  }

  textarea {
    width: 100%;
    padding: 12px 14px;
    border: 1.5px solid var(--border-color, #ddd);
    border-radius: 10px;
    font-size: 1rem;
    background: var(--glass-bg-strong, #fafafa);
    color: var(--text-color, #111);
    transition: all 0.2s ease;
    field-sizing: content;
    resize: none;
    min-height: 80px;
    font: inherit;
    box-sizing: border-box;
  }

  /* Date Wrapper & Quick Actions */
  .date-wrapper {
    display: flex;
    gap: 8px;
  }
  .date-wrapper input {
    flex: 1;
  }
  .quick-dates {
    display: flex;
    gap: 4px;
  }
  .quick-btn {
    background: var(--glass-bg-strong, #eee);
    border: 1px solid var(--border-color, #ddd);
    color: var(--text-color, #333);
    font-size: 0.75rem;
    font-weight: 700;
    border-radius: 8px;
    padding: 0 10px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .quick-btn:hover {
    background: var(--glass-bg-light, #fff);
    border-color: var(--primary-color, #e5201e);
    color: var(--primary-color, #e5201e);
  }

  /* Tab Switcher styling */
  .tab-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .tabs {
    display: flex;
    background: var(--glass-bg-strong, #eee);
    border-radius: 20px;
    padding: 2px;
  }

  .tabs.full-width {
    width: 100%;
  }

  .tabs.full-width .tab {
    flex: 1;
  }

  .tab {
    background: none; border: none;
    font-size: 0.7rem; font-weight: 700;
    padding: 5px 10px; border-radius: 16px;
    cursor: pointer; color: var(--text-muted, #666);
    transition: all 0.2s;
  }

  .tab.active {
    background: var(--glass-bg-light, white);
    color: var(--text-color, black);
    border: 1px solid var(--border-color, transparent);
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  }

  /* Drop/Upload Zone for Mobile */
  .file-upload-zone {
    border: 2px dashed var(--border-color, #ccc);
    border-radius: 12px;
    height: 140px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background: var(--glass-bg-strong, #fafafa);
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .preview-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    width: 100%;
    height: 100%;
    padding: 8px;
    box-sizing: border-box;
  }

  .file-upload-zone:hover {
    background: var(--glass-bg-strong, #f0f0f0);
    border-color: var(--primary-color, #e5201e);
  }

  .upload-icon { font-size: 2rem; margin-bottom: 4px; }
  .upload-text { font-size: 0.9rem; font-weight: 600; color: var(--text-color, #444); }
  .sub-hint { font-size: 0.75rem; color: var(--text-muted, #888); }

  .preview-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 10px;
  }

  .upload-text.overlay {
    position: absolute;
    bottom: 0; width: 100%;
    background: rgba(0,0,0,0.5);
    color: white;
    text-align: center; padding: 6px 0; font-size: 0.8rem;
  }

  .hint { font-size: 0.75rem; color: #777; padding-left: 4px;}

  .error-msg {
    background: #ffeeee; border: 1px solid #ffcccc;
    color: #d32f2f; padding: 12px; border-radius: 8px;
    font-size: 0.85rem; font-weight: 600;
  }

  .modal-footer {
    padding: 18px 24px;
    background: var(--glass-bg-strong, #fcfcfc);
    border-top: 1px solid var(--border-color, #eee);
    display: flex; gap: 12px;
  }

  .cancel-btn, .submit-btn {
    flex: 1;
    padding: 14px;
    border-radius: 12px;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .cancel-btn {
    background: none; border: 1px solid var(--border-color, #ccc);
    color: var(--text-color, #111);
  }

  .submit-btn {
    background: var(--primary-color, #e5201e);
    color: white; border: none;
  }

  .submit-btn:active { transform: scale(0.97); }

  .submit-btn:disabled {
    background: #ccc; cursor: not-allowed; transform: none;
  }

  .success-state {
    padding: 40px 24px; text-align: center;
  }
  .success-icon {
    font-size: 3rem; color: #4caf50;
    margin-bottom: 10px;
    animation: bounceIn 0.4s ease forwards;
  }

  .email-status {
    margin: 10px 0 0;
    font-size: 0.85rem;
    font-weight: 700;
  }

  .email-status.success {
    color: #4caf50;
  }

  .email-status.warning {
    color: #f59e0b;
  }
  
  @keyframes bounceIn { 0% {transform:scale(0.3)} 50% {transform:scale(1.1)} 100% {transform:scale(1)} }

  .mt-lg { margin-top: 6px; }
  .mt-sm { margin-top: 4px; }

  .progress-indicator {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
    gap: 8px;
  }
  .progress-indicator .step {
    flex: 1;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--text-muted, #aaa);
    padding-bottom: 8px;
    border-bottom: 3px solid var(--border-color, #eee);
    transition: all 0.3s;
  }
  .progress-indicator .step.active {
    color: var(--primary-color, #e5201e);
    border-bottom-color: var(--primary-color, #e5201e);
  }
</style>
