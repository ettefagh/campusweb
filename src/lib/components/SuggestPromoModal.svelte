<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { t } from "$lib/i18n";
  import { CAMPUSES } from "$lib/stores/settingsStore";

  export let isOpen = false;

  const dispatch = createEventDispatcher();

  let promoTitle = "";
  let promoDescription = "";
  let promoBadge = "";
  let ctaText = "";
  let targetLink = "";
  let campusId = "";
  let expirationDate = "";
  let contactEmail = "";
  let note = "";
  let logoDataUrl = "";
  let logoUrl = "";
  let logoFileName = "";

  let submitting = false;
  let success = false;
  let errorMsg = "";
  let step = 1;

  const badges = [
    "Bestseller",
    "Top Rated",
    "Student Discount",
    "Sale",
    "Limited Time",
    "Just In",
    "Exclusive",
    "Student Perk",
    "100% Free",
    "Developer Kit"
  ];

  const ctas = [
    "Shop Now",
    "Claim My Discount",
    "Get My Offer",
    "Try It Free",
    "Learn More",
    "Limited Time Offer",
    "Claim Free Pack",
    "Get Free Access",
    "Start Coding Free"
  ];

  function nextStep() {
    errorMsg = "";
    if (step === 1) {
      if (!promoTitle.trim() || !promoBadge || !campusId) {
        errorMsg = "Title, Badge, and Campus are required.";
        return;
      }
      step = 2;
    } else if (step === 2) {
      if (!ctaText || !targetLink.trim()) {
        errorMsg = "CTA Text and Target Link are required.";
        return;
      }
      step = 3;
    }
  }

  function prevStep() {
    errorMsg = "";
    step = Math.max(1, step - 1);
  }

  async function sanitizeLogoFile(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    
    // Scale down if the image is too large to prevent huge base64 strings
    const MAX_DIMENSION = 800;
    let width = bitmap.width;
    let height = bitmap.height;
    
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas not available");
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
    return await new Promise<string>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to re-encode image"));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(new Error("Failed to read re-encoded image"));
        reader.readAsDataURL(blob);
      }, mimeType, mimeType === "image/png" ? undefined : 0.92);
    });
  }

  function close() {
    if (submitting) return;
    isOpen = false;
    setTimeout(() => {
      if (success) {
        promoTitle = ""; 
        promoDescription = "";
        promoBadge = "";
        ctaText = "";
        targetLink = "";
        campusId = ""; 
        expirationDate = "";
        contactEmail = ""; 
        note = ""; 
        logoDataUrl = "";
        logoUrl = "";
        logoFileName = "";
        step = 1;
      }
      success = false; 
      errorMsg = "";
    }, 300);
    dispatch("close");
  }

  function handleLogoUpload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    logoDataUrl = "";
    logoFileName = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      errorMsg = "Please upload an image file for the promo image.";
      input.value = "";
      return;
    }

    if (file.size > 512 * 1024) {
      errorMsg = "Image must be smaller than 512 KB.";
      input.value = "";
      return;
    }

    sanitizeLogoFile(file)
      .then((dataUrl) => {
        logoDataUrl = dataUrl;
        logoFileName = file.name;
        errorMsg = "";
      })
      .catch(() => {
        errorMsg = "Could not read the image file. Please try another image.";
        input.value = "";
      });
  }

  async function submitPromo() {
    errorMsg = "";
    submitting = true;

    try {
      const res = await fetch("/api/suggest-promotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          logoUrl
        })
      });

      const data = await res.json();

      if (!res.ok) {
        errorMsg = data.error || "Failed to submit. Please try again.";
      } else {
        success = true;
        setTimeout(() => close(), 2500);
      }
    } catch (err) {
      errorMsg = "Connection error. Please try again later.";
    } finally {
      submitting = false;
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="modal-backdrop"
    role="button"
    tabindex="0"
    aria-label="Close promotion suggestion dialog"
    on:click={close}
    on:keydown={(event) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") close();
    }}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="modal-content"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      on:click|stopPropagation
      on:keydown|stopPropagation
    >
      
      <div class="modal-header">
        <h2>Suggest Promotion</h2>
        <button class="close-btn" on:click={close}>✕</button>
      </div>

      {#if success}
        <div class="success-state">
          <div class="success-icon">✨</div>
          <h3>Thank you!</h3>
          <p>We'll review your promotion suggestion and add it soon.</p>
        </div>
      {:else}
        <div class="modal-body">
          {#if errorMsg}
            <div class="error-msg">{errorMsg}</div>
          {/if}

          <div class="progress-indicator">
            <div class="step {step >= 1 ? 'active' : ''}">1. Overview</div>
            <div class="step {step >= 2 ? 'active' : ''}">2. Action</div>
            <div class="step {step >= 3 ? 'active' : ''}">3. Details</div>
          </div>

          {#if step === 1}
            <div class="input-group">
              <label for="promoTitle">Promotion Title <span class="req">*</span></label>
              <input type="text" id="promoTitle" bind:value={promoTitle} placeholder="e.g. 50% Off Spotify Student" disabled={submitting} />
            </div>

            <div class="input-group">
              <label for="promoBadge">Promo Badge <span class="req">*</span></label>
              <select id="promoBadge" bind:value={promoBadge} disabled={submitting}>
                <option value="">Select a badge...</option>
                {#each badges as badge}
                  <option value={badge}>{badge}</option>
                {/each}
              </select>
            </div>

            <div class="input-group">
              <label for="campusId">Target Campus <span class="req">*</span></label>
              <select id="campusId" bind:value={campusId} disabled={submitting}>
                <option value="">Select campus...</option>
                <option value="all">Global / All</option>
                {#each CAMPUSES as campus}
                  <option value={campus.id}>{campus.name}</option>
                {/each}
              </select>
            </div>
          {:else if step === 2}
            <div class="input-group">
              <label for="promoDescription">Description</label>
              <textarea id="promoDescription" bind:value={promoDescription} placeholder="Short description about the promotion..." disabled={submitting}></textarea>
            </div>

            <div class="input-group">
              <label for="ctaText">Action Text (CTA) <span class="req">*</span></label>
              <select id="ctaText" bind:value={ctaText} disabled={submitting}>
                <option value="">Select CTA...</option>
                {#each ctas as cta}
                  <option value={cta}>{cta}</option>
                {/each}
              </select>
            </div>

            <div class="input-group">
              <label for="targetLink">Target Link <span class="req">*</span></label>
              <input 
                type="url" 
                id="targetLink" 
                bind:value={targetLink} 
                placeholder="https://example.com/promo" 
                disabled={submitting} 
              />
            </div>

            <div class="input-group">
              <label for="expirationDate">Expiration Date (Optional)</label>
              <input type="date" id="expirationDate" bind:value={expirationDate} disabled={submitting} />
            </div>
          {:else if step === 3}
            <div class="input-group">
              <label for="promoLogo">Promo Image (Optional)</label>
              <input
                type="file"
                id="promoLogo"
                accept="image/png,image/jpeg,image/webp"
                on:change={handleLogoUpload}
                disabled={submitting}
              />
              {#if logoFileName}
                <p class="file-hint">{logoFileName}</p>
              {/if}
              <input
                type="url"
                id="promoLogoUrl"
                bind:value={logoUrl}
                placeholder="or paste a public image URL"
                disabled={submitting}
              />
              {#if logoDataUrl || logoUrl}
                <div class="logo-preview-wrap">
                  <img src={logoDataUrl || logoUrl} alt="Preview" class="logo-preview" />
                </div>
              {/if}
            </div>

            <div class="input-group">
              <label for="contactEmail">Contact Email (Optional)</label>
              <input type="email" id="contactEmail" bind:value={contactEmail} placeholder="your@email.com" disabled={submitting} />
            </div>

            <div class="input-group">
              <label for="note">Note to Admins</label>
              <textarea id="note" bind:value={note} placeholder="Any additional information..." disabled={submitting}></textarea>
            </div>
          {/if}
        </div>

        <div class="modal-footer popup-footer-safe">
          {#if step > 1}
            <button class="cancel-btn" on:click={prevStep} disabled={submitting}>Back</button>
          {:else}
            <button class="cancel-btn" on:click={close} disabled={submitting}>Cancel</button>
          {/if}

          {#if step < 3}
            <button class="submit-btn" on:click={nextStep} disabled={submitting}>Next</button>
          {:else}
            <button class="submit-btn" on:click={submitPromo} disabled={submitting}>
              {submitting ? "Submitting..." : "Send Suggestion"}
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 16px;
    animation: fadeIn 0.2s ease-out;
  }

  .modal-content {
    background: var(--card-bg);
    border-radius: 24px;
    width: 100%;
    max-width: 440px;
    box-shadow: var(--shadow-xl);
    animation: slideUp 0.3s cubic-bezier(0.2, 0, 0, 1);
    color: var(--text-color);
    overflow: hidden;
    border: 1px solid var(--border-color);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
  }

  .close-btn {
    background: var(--bg-secondary);
    color: var(--text-color);
    border: none;
    width: 32px; height: 32px;
    border-radius: 50%;
    font-weight: bold;
    cursor: pointer;
    display: flex; justify-content: center; align-items: center;
  }

  .modal-body {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 65vh;
    overflow-y: auto;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .input-group label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-color-secondary);
    letter-spacing: 0.05em;
  }

  .req { color: var(--primary-color); }

  input, select, textarea {
    width: 100%;
    padding: 12px 16px;
    border: 1.5px solid var(--border-color);
    border-radius: 12px;
    font-size: 1rem;
    background: var(--bg-secondary);
    color: var(--text-color);
    transition: all 0.2s;
    box-sizing: border-box;
  }

  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    background: var(--card-bg);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-color) 10%, transparent);
  }

  textarea {
    min-height: 80px;
    resize: vertical;
  }

  input[type="file"] {
    padding: 10px 12px;
    cursor: pointer;
  }

  .file-hint {
    margin: 0;
    color: var(--text-color-secondary);
    font-size: 0.8rem;
  }

  .logo-preview-wrap {
    margin-top: 4px;
    width: 72px;
    height: 72px;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
  }

  .logo-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .error-msg {
    background: color-mix(in srgb, var(--primary-color) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--primary-color) 20%, transparent);
    color: var(--primary-color);
    padding: 12px;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .modal-footer {
    padding: 20px 24px;
    background: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
    display: flex; gap: 12px;
  }

  .cancel-btn, .submit-btn {
    flex: 1;
    padding: 14px;
    border-radius: 14px;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-btn {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    color: var(--text-color);
  }

  .submit-btn {
    background: var(--primary-color);
    color: white;
    border: none;
  }

  .submit-btn:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .success-state {
    padding: 48px 24px; text-align: center;
  }
  .success-icon {
    font-size: 3.5rem;
    margin-bottom: 16px;
  }
  
  @keyframes fadeIn { from {opacity: 0} to {opacity: 1} }
  @keyframes slideUp { from {opacity: 0; transform: translateY(20px)} to {opacity: 1; transform: translateY(0)} }

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
    color: var(--text-color-secondary);
    padding-bottom: 8px;
    border-bottom: 3px solid var(--border-color);
    transition: all 0.3s;
  }
  .progress-indicator .step.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
  }
</style>
