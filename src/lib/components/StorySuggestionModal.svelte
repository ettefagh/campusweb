<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let isOpen = false;

  const dispatch = createEventDispatcher();

  let title = "";
  let subtitle = "";
  let linkUrl = "";
  let expiresAt = "";

  // Image input management
  let inputMode: 'file' | 'url' = 'file'; // default to file for better mobile experience
  let imageUrl = "";
  let fileInput: HTMLInputElement;
  let selectedFile: File | null = null;
  let previewSrc = "";

  let submitting = false;
  let success = false;
  let errorMsg = "";

  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      
      if (!file.type.startsWith("image/")) {
        errorMsg = "Please select an actual image file.";
        selectedFile = null;
        previewSrc = "";
        return;
      }

      errorMsg = "";
      selectedFile = file;
      // Create instant local preview
      previewSrc = URL.createObjectURL(file);
    }
  }

  function switchMode(mode: 'file' | 'url') {
    inputMode = mode;
    errorMsg = "";
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
      title = ""; subtitle = ""; linkUrl = ""; expiresAt = "";
      imageUrl = ""; selectedFile = null; previewSrc = "";
      success = false; errorMsg = ""; inputMode = "file";
    }, 300);
    dispatch("close");
  }

  async function submitStory() {
    errorMsg = "";

    if (!title.trim()) {
      errorMsg = "A title is required.";
      return;
    }

    // Validate based on current mode
    let imagePayload: any = null;
    if (inputMode === 'file') {
      if (!selectedFile) {
        errorMsg = "Please select an image to upload.";
        return;
      }
      imagePayload = selectedFile;
    } else {
      if (!imageUrl.trim()) {
        errorMsg = "Please provide an image URL.";
        return;
      }
      imagePayload = imageUrl;
    }

    submitting = true;

    try {
      // Build form data payload
      const fd = new FormData();
      fd.append("title", title);
      fd.append("subtitle", subtitle);
      fd.append("linkUrl", linkUrl);
      fd.append("expiresAt", expiresAt);
      fd.append("image", imagePayload); // Can append a File object or String seamlessly!

      const res = await fetch("/api/suggest-story", {
        method: "POST",
        body: fd
      });

      const data = await res.json();

      if (!res.ok) {
        errorMsg = data.error || "Failed to submit. Please check your image.";
      } else {
        success = true;
        setTimeout(() => close(), 2200);
      }
    } catch (err) {
      errorMsg = "Check your internet connection and try again.";
    } finally {
      submitting = false;
    }
  }

  // Action to teleport modal to document.body to ensure it floats above all containers
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        if (node.parentNode) node.parentNode.removeChild(node);
      }
    };
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" use:portal on:click={close}>
    <div class="modal-content" on:click|stopPropagation>
      
      <div class="modal-header">
        <h2>Suggest a Story</h2>
        <button class="close-btn" on:click={close}>✕</button>
      </div>

      {#if success}
        <div class="success-state">
          <div class="success-icon">✓</div>
          <h3>Awesome!</h3>
          <p>We sent it directly to the curation team!</p>
        </div>
      {:else}
        <div class="modal-body">
          {#if errorMsg}
            <div class="error-msg">{errorMsg}</div>
          {/if}

          <div class="input-group">
            <label for="title">Story Title <span class="req">*</span></label>
            <input type="text" id="title" bind:value={title} placeholder="e.g., New Semester Welcome!" maxlength="40" disabled={submitting} />
          </div>

          <div class="input-group">
            <label for="subtitle">Description/Subtitle</label>
            <input type="text" id="subtitle" bind:value={subtitle} placeholder="Details, times, location..." disabled={submitting} />
          </div>

          <!-- DYNAMIC IMAGE SELECTOR -->
          <div class="input-group mt-lg">
            <div class="tab-header">
              <label>Image <span class="req">*</span></label>
              <div class="tabs">
                <button class="tab {inputMode==='file'?'active':''}" on:click={() => switchMode('file')} type="button">Upload</button>
                <button class="tab {inputMode==='url'?'active':''}" on:click={() => switchMode('url')} type="button">Paste URL</button>
              </div>
            </div>

            {#if inputMode === 'file'}
              <div class="file-upload-zone {selectedFile?'has-file':''}" on:click={() => fileInput.click()}>
                <input type="file" bind:this={fileInput} on:change={handleFileChange} accept="image/*" style="display:none;" />
                
                {#if previewSrc}
                  <img src={previewSrc} class="preview-thumb" alt="Preview" />
                  <div class="upload-text overlay">Tap to Change Photo</div>
                {:else}
                  <div class="upload-icon">📷</div>
                  <div class="upload-text">Choose from Photo Library</div>
                  <div class="sub-hint">Max size 10MB</div>
                {/if}
              </div>
            {:else}
              <input type="url" bind:value={imageUrl} placeholder="https://example.com/myimage.jpg" disabled={submitting} class="url-input" />
              <span class="hint">Make sure it's a public direct link to an image.</span>
            {/if}
          </div>

          <div class="input-group mt-sm">
            <label for="linkUrl">Read More Link (Optional)</label>
            <input type="url" id="linkUrl" bind:value={linkUrl} placeholder="https://..." disabled={submitting} />
          </div>

          <div class="input-group mt-sm">
            <label for="expiresAt">Expiration Date (Optional)</label>
            <div class="date-wrapper">
              <input type="date" id="expiresAt" bind:value={expiresAt} disabled={submitting} />
              <div class="quick-dates">
                <button type="button" class="quick-btn" on:click={() => addDays(3)}>+3d</button>
                <button type="button" class="quick-btn" on:click={() => addDays(7)}>+1w</button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="cancel-btn" on:click={close} disabled={submitting}>Cancel</button>
          <button class="submit-btn" on:click={submitStory} disabled={submitting}>
            {submitting ? "Sending..." : "Submit for Review"}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 16px;
    animation: fadeIn 0.2s ease-out;
  }

  .modal-content {
    background: var(--card-bg, #fff);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-radius: 20px;
    width: 100%;
    max-width: 420px;
    box-shadow: var(--glass-shadow-lg, 0 12px 40px rgba(0, 0, 0, 0.25));
    animation: slideUp 0.3s cubic-bezier(0.19, 1, 0.22, 1);
    color: var(--text-color, #111);
    overflow: hidden;
    border: 1px solid var(--border-color, #eee);
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
    max-height: 70vh;
    overflow-y: auto;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .input-group label {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted, #666);
  }

  .req { color: var(--primary-color, #e5201e); }

  input {
    width: 100%;
    padding: 12px 14px;
    border: 1.5px solid var(--border-color, #ddd);
    border-radius: 10px;
    font-size: 1rem;
    background: var(--glass-bg-strong, #fafafa);
    color: var(--text-color, #111);
    transition: all 0.2s ease;
  }

  input:focus {
    outline: none;
    border-color: var(--primary-color, #e5201e);
    background: var(--card-bg, white);
    box-shadow: 0 0 0 3px rgba(229, 32, 30, 0.1);
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

  .file-upload-zone:hover {
    background: var(--glass-bg-strong, #f0f0f0);
    border-color: var(--primary-color, #e5201e);
  }

  .upload-icon { font-size: 2rem; margin-bottom: 4px; }
  .upload-text { font-size: 0.9rem; font-weight: 600; color: var(--text-color, #444); }
  .sub-hint { font-size: 0.75rem; color: var(--text-muted, #888); }

  .preview-thumb {
    width: 100%; height: 100%;
    object-fit: cover;
    position: absolute; inset: 0;
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
  
  @keyframes fadeIn { from {opacity: 0} to {opacity: 1} }
  @keyframes slideUp { from {opacity: 0; transform: translateY(30px)} to {opacity: 1; transform: translateY(0)} }
  @keyframes bounceIn { 0% {transform:scale(0.3)} 50% {transform:scale(1.1)} 100% {transform:scale(1)} }

  .mt-lg { margin-top: 6px; }
  .mt-sm { margin-top: 4px; }
</style>
