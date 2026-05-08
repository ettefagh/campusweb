<script lang="ts">
  import { idCardsStore, type IdCardData } from "$lib/stores/idStore";
  import IdCard from "./IdCard.svelte";

  export let cardId: string | null = null; // null means we are adding a card
  export let onClose: () => void;

  const isEditing = cardId !== null;

  // Form Fields
  let title = "";
  let university = "";
  let ownerName = "";
  let dob = "";
  let idNumber = "";
  let validUntil = "";
  let theme: IdCardData["theme"] = "srh-orange";
  let photo: string | undefined = undefined;
  let isFullImageCard = true;
  let fullImage: string | undefined = undefined;

  // Corner Editor State
  let rawImageSrc: string | null = null;
  let loadedImageEl: HTMLImageElement | null = null;
  let imageContainerEl: HTMLElement | null = null;
  let activeCornerIndex: number | null = null;
  let corners = [
    { x: 0.05, y: 0.05 }, // Top-Left
    { x: 0.95, y: 0.05 }, // Top-Right
    { x: 0.95, y: 0.95 }, // Bottom-Right
    { x: 0.05, y: 0.95 }, // Bottom-Left
  ];

  // If editing, populate fields
  if (isEditing) {
    idCardsStore.subscribe((cards) => {
      const existing = cards.find((c) => c.id === cardId);
      if (existing) {
        title = existing.title;
        university = existing.university;
        ownerName = existing.ownerName;
        dob = existing.dob;
        idNumber = existing.idNumber;
        validUntil = existing.validUntil;
        theme = existing.theme;
        photo = existing.photo;
        isFullImageCard = existing.isFullImageCard || false;
        fullImage = existing.fullImage;
        if (isFullImageCard && existing.fullImage) {
          rawImageSrc = existing.fullImage;
        }
      }
    })();
  }

  // Barcode Scanner State
  let isScanning = false;
  let scanError = "";
  let videoEl: HTMLVideoElement | null = null;
  let stream: MediaStream | null = null;
  let codeReader: any = null;

  async function loadZXing(): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).ZXing) return true;
    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.0/umd/index.min.js";
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
      });
      if ((window as any).ZXing) return true;
    } catch (e) {
      console.error("Failed to load ZXing library:", e);
    }
    return false;
  }

  async function startBarcodeScan() {
    isScanning = true;
    scanError = "";

    scanError = "Loading scanner engine...";
    const loaded = await loadZXing();
    if (!loaded) {
      scanError = "Failed to load scanner. Please enter manually.";
      isScanning = false;
      return;
    }
    scanError = "";

    // Small timeout ensures videoEl is rendered in the DOM before we bind
    setTimeout(async () => {
      if (videoEl) {
        try {
          const ZXing = (window as any).ZXing;
          codeReader = new ZXing.BrowserMultiFormatReader();
          await codeReader.decodeFromConstraints(
            {
              video: {
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            },
            videoEl,
            (result: any) => {
              if (result) {
                idNumber = result.text;
                stopBarcodeScan();
              }
            }
          );
        } catch (err: any) {
          console.error("Camera access error:", err);
          scanError = "Failed to access camera. Please allow camera permissions.";
          isScanning = false;
        }
      }
    }, 150);
  }

  function stopBarcodeScan() {
    isScanning = false;
    if (codeReader) {
      codeReader.reset();
      codeReader = null;
    }
  }

  // Reactive Card preview object
  $: previewCard = {
    id: "preview",
    title: title || "Student ID",
    university: university || "SRH University",
    ownerName: ownerName || "Full Name",
    dob: dob || "DD.MM.YYYY",
    idNumber: idNumber || "100000000",
    validUntil: validUntil || "bis DD.MM.YYYY",
    theme,
    photo,
    isFullImageCard,
    fullImage,
  };

  function handlePhotoUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const base64String = e.target?.result as string;

      // Image compression using Canvas to ensure it fits comfortably in localStorage
      const img = new Image();
      img.src = base64String;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 180;
        const MAX_HEIGHT = 220;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        photo = canvas.toDataURL("image/jpeg", 0.75); // compress to JPG with 75% quality
      };
    };

    reader.readAsDataURL(file);
  }

  async function loadPDFJS(): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).pdfjsLib) return true;
    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
      });
      if ((window as any).pdfjsLib) {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
        return true;
      }
    } catch (e) {
      console.error("Failed to load PDF.js library:", e);
    }
    return false;
  }

  async function handlePDFUpload(file: File) {
    const loaded = await loadPDFJS();
    if (!loaded) {
      alert("Failed to load PDF processing engine.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
        const pdfjsLib = (window as any).pdfjsLib;
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 }); // high res
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          rawImageSrc = canvas.toDataURL("image/jpeg", 0.85);
          corners = [
            { x: 0.05, y: 0.05 },
            { x: 0.95, y: 0.05 },
            { x: 0.95, y: 0.95 },
            { x: 0.05, y: 0.95 },
          ];
        }
      } catch (err) {
        console.error("PDF rendering error:", err);
        alert("Failed to render PDF. Please upload a valid PDF file.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFullImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      handlePDFUpload(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        rawImageSrc = e.target?.result as string;
        // Reset corners to reasonable starting point
        corners = [
          { x: 0.05, y: 0.05 },
          { x: 0.95, y: 0.05 },
          { x: 0.95, y: 0.95 },
          { x: 0.05, y: 0.95 },
        ];
      };
      reader.readAsDataURL(file);
    }
  }

  // Draggable corners handlers
  function handleStartDrag(index: number) {
    activeCornerIndex = index;
  }

  function handleDragMove(event: MouseEvent | TouchEvent) {
    if (activeCornerIndex === null || !imageContainerEl) return;
    const rect = imageContainerEl.getBoundingClientRect();
    const clientX =
      "touches" in event ? event.touches[0].clientX : event.clientX;
    const clientY =
      "touches" in event ? event.touches[0].clientY : event.clientY;

    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    corners[activeCornerIndex].x = Math.max(0, Math.min(1, x));
    corners[activeCornerIndex].y = Math.max(0, Math.min(1, y));
    corners = [...corners]; // Trigger Svelte reactivity

    triggerWarp();
  }

  function handleEndDrag() {
    activeCornerIndex = null;
  }

  function triggerWarp() {
    if (!loadedImageEl) return;

    // Source corners mapped to natural image dimensions
    const pixelCorners = corners.map((c) => ({
      x: c.x * (loadedImageEl?.naturalWidth || 760),
      y: c.y * (loadedImageEl?.naturalHeight || 472),
    }));

    fullImage = warpImage(loadedImageEl, pixelCorners, 760, 472);
  }

  // 4-Point Homography Warp & Gaussian Elimination
  function solveHomography(
    src: { x: number; y: number }[],
    dst: { x: number; y: number }[],
  ) {
    const A: number[][] = [];
    const B: number[] = [];
    for (let i = 0; i < 4; i++) {
      const u = dst[i].x;
      const v = dst[i].y;
      const x = src[i].x;
      const y = src[i].y;
      A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
      B.push(x);
      A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
      B.push(y);
    }

    const h = gaussElimination(A, B);
    return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  }

  function gaussElimination(A: number[][], B: number[]) {
    const n = B.length;
    for (let i = 0; i < n; i++) {
      let maxEl = Math.abs(A[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > maxEl) {
          maxEl = Math.abs(A[k][i]);
          maxRow = k;
        }
      }

      if (maxEl === 0) {
        return [1, 0, 0, 0, 1, 0, 0, 0];
      }

      const tempA = A[maxRow];
      A[maxRow] = A[i];
      A[i] = tempA;
      const tempB = B[maxRow];
      B[maxRow] = B[i];
      B[i] = tempB;

      for (let k = i + 1; k < n; k++) {
        const c = -A[k][i] / A[i][i];
        for (let j = i; j < n; j++) {
          if (i === j) {
            A[k][j] = 0;
          } else {
            A[k][j] += c * A[i][j];
          }
        }
        B[k] += c * B[i];
      }
    }

    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = B[i] / A[i][i];
      for (let k = i - 1; k >= 0; k--) {
        B[k] -= A[k][i] * x[i];
      }
    }
    return x;
  }

  function warpImage(
    img: HTMLImageElement,
    srcCorners: { x: number; y: number }[],
    targetWidth: number,
    targetHeight: number,
  ) {
    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = img.naturalWidth || img.width || 760;
    srcCanvas.height = img.naturalHeight || img.height || 472;
    const srcCtx = srcCanvas.getContext("2d");
    if (!srcCtx) return "";
    srcCtx.drawImage(img, 0, 0);
    const srcData = srcCtx.getImageData(
      0,
      0,
      srcCanvas.width,
      srcCanvas.height,
    );

    const dstCanvas = document.createElement("canvas");
    dstCanvas.width = targetWidth;
    dstCanvas.height = targetHeight;
    const dstCtx = dstCanvas.getContext("2d");
    if (!dstCtx) return "";
    const dstData = dstCtx.createImageData(targetWidth, targetHeight);

    const dstCorners = [
      { x: 0, y: 0 },
      { x: targetWidth, y: 0 },
      { x: targetWidth, y: targetHeight },
      { x: 0, y: targetHeight },
    ];

    const H = solveHomography(srcCorners, dstCorners);

    const w_src = srcCanvas.width;
    const h_src = srcCanvas.height;

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const w_hom = H[6] * x + H[7] * y + H[8];
        const srcX = (H[0] * x + H[1] * y + H[2]) / w_hom;
        const srcY = (H[3] * x + H[4] * y + H[5]) / w_hom;

        const ix = Math.round(srcX);
        const iy = Math.round(srcY);

        const dstIdx = (y * targetWidth + x) * 4;

        if (ix >= 0 && ix < w_src && iy >= 0 && iy < h_src) {
          const srcIdx = (iy * w_src + ix) * 4;
          dstData.data[dstIdx] = srcData.data[srcIdx];
          dstData.data[dstIdx + 1] = srcData.data[srcIdx + 1];
          dstData.data[dstIdx + 2] = srcData.data[srcIdx + 2];
          dstData.data[dstIdx + 3] = srcData.data[srcIdx + 3];
        } else {
          dstData.data[dstIdx] = 0;
          dstData.data[dstIdx + 1] = 0;
          dstData.data[dstIdx + 2] = 0;
          dstData.data[dstIdx + 3] = 0;
        }
      }
    }

    dstCtx.putImageData(dstData, 0, 0);
    return dstCanvas.toDataURL("image/jpeg", 0.85);
  }

  function handleSave() {
    if (!title) {
      alert("Please fill out Card Type.");
      return;
    }

    const cardData = {
      title,
      university,
      ownerName,
      dob,
      idNumber,
      validUntil,
      theme,
      photo,
      isFullImageCard,
      fullImage,
    };

    if (isEditing && cardId) {
      idCardsStore.updateCard(cardId, cardData);
    } else {
      idCardsStore.add(cardData);
    }

    onClose();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-overlay" on:click={onClose}>
  <div class="modal-content glass" on:click|stopPropagation>
    <div class="modal-header">
      <h2>{isEditing ? "✏️ Edit Card" : "✨ Add Digital Card"}</h2>
      <button class="close-btn" on:click={onClose}>✖</button>
    </div>

    <div class="modal-grid">
      <!-- Live Card Preview -->
      <div class="preview-area">
        <span class="preview-label">Live Preview</span>
        <IdCard card={previewCard} />
        <span class="tap-info">Tap card above to see the back side</span>
      </div>

      <!-- Input Fields -->
      <form class="modal-form" on:submit|preventDefault={handleSave}>
        <div class="form-tabs">
          <button
            type="button"
            class="tab-btn"
            class:active={!isFullImageCard}
            on:click={() => (isFullImageCard = false)}
          >
            ✏️ Manual Form
          </button>
          <button
            type="button"
            class="tab-btn"
            class:active={isFullImageCard}
            on:click={() => (isFullImageCard = true)}
          >
            📸 Upload Digital ID
          </button>
        </div>

        {#if isFullImageCard}
          <div class="form-group">
            <label for="full-card-upload">Digital Student ID File (Image or PDF)</label>
            <input
              type="file"
              id="full-card-upload"
              accept="image/*,application/pdf"
              on:change={handleFullImageUpload}
              required={!fullImage}
            />
            <p class="field-hint">
              Upload any photo or PDF of your student ID card. Drag the 4 green circles
              below to identify the card's exact corners!
            </p>
          </div>

          {#if rawImageSrc}
            <div class="corner-editor-wrapper">
              <span class="editor-title"
                >🎯 Corner Correction (Drag points to align)</span
              >
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="corner-editor-outer">
                <div
                  class="corner-editor-container"
                  bind:this={imageContainerEl}
                  on:mousemove={handleDragMove}
                  on:touchmove|preventDefault={handleDragMove}
                  on:mouseup={handleEndDrag}
                  on:touchend={handleEndDrag}
                  on:mouseleave={handleEndDrag}
                >
                  <!-- svelte-ignore a11y_missing_attribute -->
                  <img
                    src={rawImageSrc}
                    bind:this={loadedImageEl}
                    on:load={triggerWarp}
                    class="corner-editor-img"
                  />

                  <!-- SVG lines connecting the four corners -->
                  <svg class="corner-editor-overlay">
                    <polygon
                      points="
                        {corners[0].x * 100}%,{corners[0].y * 100}% 
                        {corners[1].x * 100}%,{corners[1].y * 100}% 
                        {corners[2].x * 100}%,{corners[2].y * 100}% 
                        {corners[3].x * 100}%,{corners[3].y * 100}%"
                      class="crop-poly"
                    />
                  </svg>

                  <!-- 4 Draggable corner handles -->
                  {#each corners as corner, idx}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <div
                      class="corner-handle handle-{idx}"
                      style="left: {corner.x * 100}%; top: {corner.y * 100}%"
                      on:mousedown={() => handleStartDrag(idx)}
                      on:touchstart={() => handleStartDrag(idx)}
                    >
                      <span class="handle-number">{idx + 1}</span>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}

          <!-- Digital ID Simplified Fields -->
          <div class="form-group">
            <label for="card-title-full">Card Type</label>
            <input
              type="text"
              id="card-title-full"
              bind:value={title}
              placeholder="e.g. Student ID, Semester Ticket"
              required
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="id-number-full">Matriculation / ID Number</label>
              <div class="input-with-button">
                <input
                  type="text"
                  id="id-number-full"
                  bind:value={idNumber}
                  placeholder="e.g. 100004862"
                />
                <button
                  type="button"
                  class="btn-input-scan"
                  on:click={startBarcodeScan}
                  title="Scan physical barcode via camera"
                >
                  📸 Scan
                </button>
              </div>
            </div>
            <div class="form-group">
              <label for="valid-until-full">Validity Date</label>
              <input
                type="text"
                id="valid-until-full"
                bind:value={validUntil}
                placeholder="e.g. bis 31.03.2026"
              />
            </div>
          </div>
        {:else}
          <div class="form-row">
            <div class="form-group">
              <label for="card-title">Card Type</label>
              <input
                type="text"
                id="card-title"
                bind:value={title}
                placeholder="e.g. Student ID, Library Card"
              />
            </div>
            <div class="form-group">
              <label for="university">University / Issuer</label>
              <input
                type="text"
                id="university"
                bind:value={university}
                placeholder="e.g. SRH University"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="owner-name">Full Student Name</label>
            <input
              type="text"
              id="owner-name"
              bind:value={ownerName}
              placeholder="e.g. Amirhossein Ettefagh"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="id-number">Matriculation / ID Number</label>
              <div class="input-with-button">
                <input
                  type="text"
                  id="id-number"
                  bind:value={idNumber}
                  placeholder="e.g. 100004862"
                />
                <button
                  type="button"
                  class="btn-input-scan"
                  on:click={startBarcodeScan}
                  title="Scan physical barcode via camera"
                >
                  📸 Scan
                </button>
              </div>
            </div>
            <div class="form-group">
              <label for="dob">Date of Birth</label>
              <input
                type="text"
                id="dob"
                bind:value={dob}
                placeholder="e.g. 12.08.1999"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="valid-until">Validity Date</label>
              <input
                type="text"
                id="valid-until"
                bind:value={validUntil}
                placeholder="e.g. bis 31.03.2026"
              />
            </div>
            <div class="form-group">
              <label for="photo-upload">Profile Picture</label>
              <input
                type="file"
                id="photo-upload"
                accept="image/*"
                on:change={handlePhotoUpload}
              />
            </div>
          </div>

          <!-- Theme Color Picker -->
          <div class="form-group">
            <span class="picker-label">Card Style Theme</span>
            <div class="theme-picker">
              <!-- Orange -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="theme-option orange"
                class:selected={theme === "srh-orange"}
                on:click={() => (theme = "srh-orange")}
                title="SRH Orange"
              ></div>
              <!-- Dark -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="theme-option dark"
                class:selected={theme === "liquid-dark"}
                on:click={() => (theme = "liquid-dark")}
                title="Liquid Dark"
              ></div>
              <!-- Green -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="theme-option green"
                class:selected={theme === "emerald-glass"}
                on:click={() => (theme = "emerald-glass")}
                title="Emerald Glass"
              ></div>
              <!-- Blue -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="theme-option blue"
                class:selected={theme === "sapphire-aurora"}
                on:click={() => (theme = "sapphire-aurora")}
                title="Sapphire Aurora"
              ></div>
            </div>
          </div>
        {/if}

        <div class="form-actions">
          <button type="button" class="btn-cancel" on:click={onClose}
            >Cancel</button
          >
          <button type="submit" class="btn-save"
            >{isEditing ? "Save Changes" : "Create Card"}</button
          >
        </div>
      </form>
    </div>
  </div>
</div>

{#if isScanning}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="scanner-viewfinder-overlay" on:click={stopBarcodeScan}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="scanner-viewfinder-box glass" on:click|stopPropagation>
      <div class="scanner-header">
        <h3>Scan Matriculation Barcode</h3>
        <button
          type="button"
          class="btn-close-scanner"
          on:click={stopBarcodeScan}>✕</button
        >
      </div>

      <div class="video-container">
        <!-- svelte-ignore a11y_media_has_caption -->
        <video bind:this={videoEl} class="scanner-video" autoplay playsinline
        ></video>
        <div class="scanner-laser-line"></div>
        <div class="scanner-frame-corners"></div>
      </div>

      {#if scanError}
        <p class="scan-error-msg">{scanError}</p>
      {:else}
        <p class="scan-hint-msg">
          Fit Code-39 / Code-128 barcode within the scan frame
        </p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(8px);
    z-index: 90;
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    padding: var(--spacing-md);
  }

  @media (max-width: 1023px) {
    .modal-overlay {
      padding-bottom: 96px; /* Offsets modal contents to stay perfectly clear of mobile bottom tab bar */
    }
  }

  @media (min-width: 1024px) {
    .modal-overlay {
      padding-left: calc(var(--sidebar-width, 220px) + var(--spacing-md));
    }
  }

  .modal-content {
    background: var(--glass-bg-strong);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    width: 820px;
    max-width: 100%;
    max-height: 100%; /* Adapts dynamically to parent's padding/height clearances */
    overflow-y: auto;
    padding: var(--spacing-lg);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
    box-sizing: border-box;
  }

  @media (max-width: 820px) {
    .modal-content {
      width: 440px;
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--glass-border-subtle);
    padding-bottom: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }

  .modal-header h2 {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--text-color);
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-color-secondary);
    font-size: 1.1rem;
    cursor: pointer;
    padding: var(--spacing-xs);
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: var(--primary-color);
  }

  .modal-grid {
    display: grid;
    grid-template-columns: 380px 1fr;
    gap: var(--spacing-lg);
  }

  @media (max-width: 820px) {
    .modal-grid {
      grid-template-columns: 1fr;
    }
  }

  .preview-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-right: 1px solid var(--glass-border-subtle);
    padding-right: var(--spacing-md);
  }

  @media (max-width: 820px) {
    .preview-area {
      border-right: none;
      padding-right: 0;
      border-bottom: 1px solid var(--glass-border-subtle);
      padding-bottom: var(--spacing-md);
    }
  }

  .preview-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--text-color-secondary);
    letter-spacing: 0.5px;
    margin-bottom: var(--spacing-xs);
  }

  .tap-info {
    font-size: 0.7rem;
    color: var(--text-color-secondary);
    font-style: italic;
    margin-top: var(--spacing-xs);
  }

  .modal-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }

  @media (max-width: 500px) {
    .form-row {
      grid-template-columns: 1fr;
      gap: var(--spacing-md);
    }
  }

  label,
  .picker-label {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-color);
  }

  input[type="text"],
  input[type="file"] {
    padding: 10px 14px;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    background: rgba(0, 0, 0, 0.04);
    color: var(--text-color);
    font-size: 0.9rem;
    box-sizing: border-box;
  }

  :global([data-theme="dark"]) input[type="text"],
  :global([data-theme="dark"]) input[type="file"] {
    background: rgba(255, 255, 255, 0.04);
  }

  input[type="text"]:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(212, 68, 7, 0.15);
  }

  input[type="file"] {
    font-size: 0.75rem;
    padding: 8px;
  }

  /* Theme color options picker */
  .theme-picker {
    display: flex;
    gap: 12px;
    margin-top: 4px;
  }

  .theme-option {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    box-sizing: border-box;
    border: 2px solid transparent;
    transition:
      transform 0.2s,
      border-color 0.2s;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }

  .theme-option:hover {
    transform: scale(1.1);
  }

  .theme-option.selected {
    border-color: white;
    box-shadow: 0 0 0 2px var(--primary-color);
  }

  .theme-option.orange {
    background: linear-gradient(135deg, #e44407 0%, #ca3700 100%);
  }
  .theme-option.dark {
    background: linear-gradient(135deg, #1c1e22 0%, #0a0b0d 100%);
  }
  .theme-option.green {
    background: linear-gradient(135deg, #0f4c3a 0%, #051e17 100%);
  }
  .theme-option.blue {
    background: linear-gradient(135deg, #1d4ed8 0%, #6b21a8 100%);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-sm);
    border-top: 1px solid var(--glass-border-subtle);
    padding-top: var(--spacing-md);
  }

  .btn-cancel {
    background: transparent;
    border: 1px solid var(--glass-border);
    color: var(--text-color);
    padding: 10px 20px;
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-cancel:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  :global([data-theme="dark"]) .btn-cancel:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .btn-save {
    background: var(--primary-color);
    border: none;
    color: white;
    padding: 10px 20px;
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(212, 68, 7, 0.3);
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .btn-save:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(212, 68, 7, 0.4);
  }

  .btn-save:active {
    transform: translateY(0);
  }

  /* Form Tab Navigation */
  .form-tabs {
    display: flex;
    gap: 12px;
    border-bottom: 1px solid var(--glass-border-subtle);
    padding-bottom: 12px;
    margin-bottom: 4px;
  }

  .tab-btn {
    flex: 1;
    background: var(--glass-bg-light);
    border: 1px solid var(--glass-border-subtle);
    padding: 10px 16px;
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-color-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-btn:hover {
    background: rgba(0, 0, 0, 0.03);
    color: var(--text-color);
  }

  :global([data-theme="dark"]) .tab-btn:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .tab-btn.active {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
    box-shadow: 0 2px 8px rgba(212, 68, 7, 0.25);
  }

  .field-hint {
    font-size: 0.72rem;
    color: var(--text-color-secondary);
    margin: 4px 0 0 0;
    line-height: 1.4;
  }

  /* 4-Corner Draggable Perspective Editor Styles */
  .corner-editor-wrapper {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--glass-border);
    padding: 12px;
    border-radius: var(--radius-lg);
  }

  .editor-title {
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--primary-color);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .corner-editor-outer {
    display: flex;
    justify-content: center;
    align-items: center;
    background: #000;
    border-radius: var(--radius-md);
    padding: 8px;
  }

  .corner-editor-container {
    position: relative;
    max-height: 280px;
    user-select: none;
    touch-action: none;
    display: inline-block;
  }

  .corner-editor-img {
    max-width: 100%;
    max-height: 280px;
    display: block;
    object-fit: contain;
    pointer-events: none;
  }

  .corner-editor-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 5;
  }

  .crop-poly {
    fill: rgba(0, 255, 100, 0.12);
    stroke: #00ff64;
    stroke-width: 2.5;
    stroke-dasharray: 4;
    filter: drop-shadow(0 0 4px rgba(0, 255, 100, 0.4));
  }

  .corner-handle {
    position: absolute;
    width: 24px;
    height: 24px;
    background: #00ff64;
    border: 2px solid white;
    border-radius: 50%;
    transform: translate(-12px, -12px);
    cursor: move;
    z-index: 10;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    transition:
      transform 0.1s,
      background-color 0.2s;
  }

  .corner-handle:hover,
  .corner-handle:active {
    transform: translate(-12px, -12px) scale(1.25);
    background: #ffffff;
    border-color: #00ff64;
  }

  .handle-number {
    font-size: 0.65rem;
    font-weight: 900;
    color: #000;
  }

  /* Composite scanner input styling */
  .input-with-button {
    display: flex;
    gap: 8px;
    align-items: center;
    width: 100%;
  }

  .input-with-button input {
    flex: 1;
    min-width: 0;
  }

  .btn-input-scan {
    background: var(--glass-bg-light);
    border: 1px solid var(--glass-border-subtle);
    color: var(--text-color);
    padding: 10px 14px;
    border-radius: var(--radius-md);
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .btn-input-scan:hover {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(212, 68, 7, 0.15);
  }

  /* Full Screen / Fixed Scanner view-finder layout */
  .scanner-viewfinder-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.82);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 200;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--spacing-md);
    box-sizing: border-box;
  }

  .scanner-viewfinder-box {
    background: rgba(25, 25, 25, 0.55) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    border-radius: var(--radius-xl);
    width: 480px;
    max-width: 100%;
    padding: var(--spacing-lg);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  }

  .scanner-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
  }

  .scanner-header h3 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 800;
    color: white;
    font-family: "SRH Headline", sans-serif;
  }

  .btn-close-scanner {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-weight: 700;
    transition: background 0.2s ease;
  }

  .btn-close-scanner:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .video-container {
    position: relative;
    width: 100%;
    aspect-ratio: 4/3;
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: #000;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .scanner-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .scanner-laser-line {
    position: absolute;
    left: 5%;
    top: 50%;
    width: 90%;
    height: 3px;
    background: #ff3b30;
    box-shadow:
      0 0 12px #ff3b30,
      0 0 4px #ff3b30;
    z-index: 5;
    animation: laserScan 2s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes laserScan {
    0% {
      top: 15%;
    }
    50% {
      top: 85%;
    }
    100% {
      top: 15%;
    }
  }

  .scanner-frame-corners {
    position: absolute;
    top: 15%;
    left: 10%;
    width: 80%;
    height: 70%;
    border: 2px dashed rgba(255, 255, 255, 0.4);
    border-radius: var(--radius-sm);
    z-index: 4;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
    pointer-events: none;
  }

  .scan-hint-msg {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.78rem;
    text-align: center;
    margin: var(--spacing-md) 0 0 0;
  }

  .scan-error-msg {
    color: #ff3b30;
    font-size: 0.78rem;
    font-weight: 700;
    text-align: center;
    margin: var(--spacing-md) 0 0 0;
  }
</style>
