<script lang="ts">
  import type { IdCardData } from '$lib/stores/idStore';
  import { t } from '$lib/i18n';

  export let card: IdCardData;
  export let editMode = false;
  export let onEdit: (id: string) => void = () => {};
  export let onDelete: (id: string) => void = () => {};

  let isFlipped = false;
  let mouseX = 0;
  let mouseY = 0;
  let isHovered = false;

  // Expiration / Validity check
  function checkExpirationReminder(validUntilStr: string) {
    if (!validUntilStr) return { isExpiringSoon: false, daysLeft: 999 };
    
    const cleanStr = validUntilStr.replace(/bis\s+/i, '').trim();
    
    let expiryDate: Date | null = null;
    const dmyRegex = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
    const match = cleanStr.match(dmyRegex);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-indexed
      const year = parseInt(match[3], 10);
      expiryDate = new Date(year, month, day);
    } else {
      const parsed = Date.parse(cleanStr);
      if (!isNaN(parsed)) {
        expiryDate = new Date(parsed);
      }
    }

    if (!expiryDate || isNaN(expiryDate.getTime())) {
      return { isExpiringSoon: false, daysLeft: 999 };
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    expiryDate.setHours(0,0,0,0);
    
    const timeDiff = expiryDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    return {
      isExpiringSoon: daysLeft <= 30,
      daysLeft
    };
  }

  $: expirationStatus = checkExpirationReminder(card.validUntil);

  function toggleFlip(event: MouseEvent) {
    // Prevent flip if clicking action buttons
    const target = event.target as HTMLElement;
    if (target.closest('.card-action-btn')) return;
    
    isFlipped = !isFlipped;
  }

  function handleMouseMove(event: MouseEvent) {
    if (isFlipped) return;
    const cardEl = event.currentTarget as HTMLElement;
    const rect = cardEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Normalize coordinates around center (from -0.5 to 0.5)
    mouseX = (x / rect.width) - 0.5;
    mouseY = (y / rect.height) - 0.5;
  }

  function handleMouseEnter() {
    isHovered = true;
  }

  function handleMouseLeave() {
    isHovered = false;
    mouseX = 0;
    mouseY = 0;
  }

  // Code 39 Barcode Generator (Standard encoding for digits 0-9)
  // 'W' = wide bar, 'N' = narrow bar
  const CODE39_DIGITS: Record<string, string> = {
    '0': 'NNWWNNNWN',
    '1': 'WNNWNNNNW',
    '2': 'NNWWNNNNW',
    '3': 'WNWYNNNNN', // Adjusted fallback
    '4': 'NNNWWNNNW',
    '5': 'WNNWWNNNN',
    '6': 'NNWWWWNNN',
    '7': 'NNNWNNWNW',
    '8': 'WNNWNNWNN',
    '9': 'NNWWNNWNN'
  };
  const STAR = 'NNWNWNWNN'; // Start/Stop asterisk code

  function generateBarcodeSVG(idNum: string): { rects: Array<{ x: number; w: number; isBlack: boolean }>, totalWidth: number } {
    const cleanId = idNum.replace(/[^0-9]/g, '');
    const fullCode = `*${cleanId}*`;
    
    const rects: Array<{ x: number; w: number; isBlack: boolean }> = [];
    let currentX = 0;
    const narrowWidth = 1.8;
    const wideWidth = 4.2;
    const interCharacterGap = 1.8;

    for (let charIndex = 0; charIndex < fullCode.length; charIndex++) {
      const char = fullCode[charIndex];
      const pattern = char === '*' ? STAR : (CODE39_DIGITS[char] || CODE39_DIGITS['0']);
      
      for (let barIndex = 0; barIndex < pattern.length; barIndex++) {
        const isBlack = barIndex % 2 === 0;
        const widthCode = pattern[barIndex];
        const width = (widthCode === 'W' || widthCode === 'Y') ? wideWidth : narrowWidth;
        
        rects.push({ x: currentX, w: width, isBlack });
        currentX += width;
      }
      // Add gap between characters (white space)
      if (charIndex < fullCode.length - 1) {
        rects.push({ x: currentX, w: interCharacterGap, isBlack: false });
        currentX += interCharacterGap;
      }
    }

    return { rects, totalWidth: currentX };
  }

  $: barcodeData = generateBarcodeSVG(card.idNumber);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="card-wrapper"
  class:flipped={isFlipped}
  on:click={toggleFlip}
  on:mousemove={handleMouseMove}
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
  style:transform={isHovered && !isFlipped 
    ? `perspective(1000px) rotateY(${mouseX * 25}deg) rotateX(${-mouseY * 25}deg) scale3d(1.02, 1.02, 1.02)` 
    : isFlipped ? 'rotateY(180deg)' : 'none'}
>
  <div class="card-inner">
    <!-- FRONT OF CARD -->
    <div class="card-face card-front theme-{card.theme}" style:padding={card.isFullImageCard ? '0' : '16px'}>
      <!-- Reflection shine layer -->
      <div 
        class="card-shine"
        style:opacity={isHovered ? 0.45 : 0}
        style:background={`radial-gradient(circle at ${(mouseX + 0.5) * 100}% ${(mouseY + 0.5) * 100}%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 60%)`}
      ></div>

      <!-- Expiration Badge -->
      {#if expirationStatus.isExpiringSoon}
        <div class="expiration-badge" class:expired={expirationStatus.daysLeft <= 0}>
          {expirationStatus.daysLeft <= 0 ? '❌ Expired' : `⏳ Expires in ${expirationStatus.daysLeft}d`}
        </div>
      {/if}

      {#if card.isFullImageCard && card.fullImage}
        <img src={card.fullImage} alt={card.ownerName} class="full-card-image" />
      {:else}
        <!-- Concentric design circles (SRH Orange official style) -->
        {#if card.theme === 'srh-orange'}
          <div class="concentric-graphics">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="150" cy="150" r="100" fill="#f5803e" opacity="0.4" />
              <circle cx="150" cy="150" r="130" stroke="#fbc093" stroke-width="26" opacity="0.3" />
              <circle cx="150" cy="150" r="70" fill="#df3b00" opacity="0.9" />
            </svg>
          </div>
        {:else}
          <div class="glass-graphics"></div>
        {/if}

        <!-- Header: Logo and Title -->
        <div class="card-header">
          <div class="logo-area">
            <!-- SRH vector recreated logo -->
            <svg class="srh-logo-svg" viewBox="0 0 100 50" fill="currentColor">
              <!-- s -->
              <path d="M12,28 C12,23 15,21 18,21 C22,21 21,25 21,27 C21,31 15,30 15,34 C15,38 19,38 21,36 M12,32 C12,34 13,35 15,35" stroke="white" stroke-width="4.5" stroke-linecap="round" fill="none" />
              <!-- r -->
              <path d="M32,23 L32,37 M32,27 C34,22 41,23 41,27" stroke="white" stroke-width="4.5" stroke-linecap="round" fill="none" />
              <!-- h -->
              <path d="M52,13 L52,37 M52,28 C55,23 62,24 62,29 L62,37" stroke="white" stroke-width="4.5" stroke-linecap="round" fill="none" />
            </svg>
          </div>
          <div class="card-title-badge">{card.title}</div>
        </div>

        <!-- Body: Information & Photo -->
        <div class="card-body">
          <div class="info-side">
            <div class="university-name">{card.university}</div>
            <div class="document-type">Studierendenausweis</div>
            
            <div class="owner-name">{card.ownerName}</div>
            
            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">Geburtsdatum</span>
                <span class="meta-value">{card.dob}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Matrikelnummer</span>
                <span class="meta-value">{card.idNumber}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Gültigkeit</span>
                <span class="meta-value">{card.validUntil}</span>
              </div>
            </div>
          </div>

          <div class="photo-side">
            <div class="photo-container">
              {#if card.photo}
                <img src={card.photo} alt={card.ownerName} class="student-photo" />
              {:else}
                <!-- Premium fallback avatar silhouette -->
                <svg class="fallback-avatar" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                </svg>
              {/if}
            </div>
          </div>
        </div>

        <!-- Subtext footer -->
        <div class="card-footer">
          <span class="subtext">Dieser Ausweis ist nur gültig in Verbindung mit dem Personalausweis.</span>
        </div>
      {/if}

      <!-- Action overlays in Edit mode -->
      {#if editMode}
        <div class="edit-overlay-buttons">
          <button 
            class="card-action-btn edit-btn" 
            on:click={() => onEdit(card.id)} 
            aria-label="Edit card"
            title="Edit Card"
          >
            ✏️
          </button>
          <button 
            class="card-action-btn delete-btn" 
            on:click={() => onDelete(card.id)} 
            aria-label="Delete card"
            title="Delete Card"
          >
            🗑️
          </button>
        </div>
      {/if}
    </div>

    <!-- BACK OF CARD -->
    <div class="card-face card-back theme-{card.theme}-back">
      <div class="card-back-header">
        <div class="back-logo">
          <span class="back-title">{card.university} Portal</span>
        </div>
        <div class="back-doc-type">Digital Copy</div>
      </div>

      <div class="card-back-body">
        <div class="barcode-container glass">
          <!-- Real Dynamic SVG Barcode -->
          <svg 
            class="barcode-svg" 
            viewBox="0 0 {barcodeData.totalWidth} 50" 
            preserveAspectRatio="none"
          >
            {#each barcodeData.rects as rect}
              <rect 
                x={rect.x} 
                y="0" 
                width={rect.w} 
                height="50" 
                fill={rect.isBlack ? 'var(--barcode-color, #000000)' : 'transparent'} 
              />
            {/each}
          </svg>
          <div class="barcode-label">*{card.idNumber}*</div>
        </div>

        <div class="legal-text">
          <p>This digital card is stored securely on this device's local storage. To use, scan the barcode at campus libraries, student printers, or dining halls.</p>
          <p>Bei Verlust oder Missbrauch ist die Universität umgehend zu benachrichtigen.</p>
        </div>
      </div>

      <div class="card-back-footer">
        <span class="tap-hint">🔄 Tap to Flip Card</span>
      </div>
    </div>
  </div>
</div>

<style>
  .card-wrapper {
    position: relative;
    width: 380px;
    height: 236px;
    border-radius: 20px;
    cursor: pointer;
    transform-style: preserve-3d;
    transition: transform 0.15s ease-out, box-shadow 0.2s ease;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    user-select: none;
    -webkit-user-select: none;
    margin: 15px auto;
  }

  @media (max-width: 400px) {
    .card-wrapper {
      width: 320px;
      height: 198px;
    }
  }

  .card-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    border-radius: 20px;
  }

  .card-face {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 20px;
    backface-visibility: hidden;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 16px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .full-card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 19px;
    display: block;
    pointer-events: none;
  }

  @media (max-width: 400px) {
    .card-face {
      padding: 12px;
    }
  }

  .card-front {
    z-index: 2;
    transform: rotateY(0deg);
  }

  .card-back {
    transform: rotateY(180deg);
    z-index: 1;
    --barcode-color: #000000;
    background: #f7f9fa;
    color: #333;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  :global([data-theme="dark"]) .card-back {
    --barcode-color: #ffffff;
    background: #14171a;
    color: #ddd;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  /* ── Themes front-side styling ───────────────────────────── */
  .theme-srh-orange {
    background: linear-gradient(135deg, #e44407 0%, #ca3700 100%);
    color: white;
  }

  .theme-liquid-dark {
    background: linear-gradient(135deg, #1c1e22 0%, #0a0b0d 100%);
    color: white;
    box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.03);
  }

  .theme-emerald-glass {
    background: linear-gradient(135deg, #0f4c3a 0%, #051e17 100%);
    color: white;
  }

  .theme-sapphire-aurora {
    background: linear-gradient(135deg, #1d4ed8 0%, #6b21a8 100%);
    color: white;
  }

  /* ── Themes back-side styling ────────────────────────────── */
  .theme-srh-orange-back {
    border-color: rgba(228, 68, 7, 0.2);
  }

  .theme-liquid-dark-back {
    border-color: rgba(255, 255, 255, 0.05);
  }

  /* Shine overlay reflection */
  .card-shine {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 4;
    pointer-events: none;
    mix-blend-mode: overlay;
    transition: opacity 0.15s ease;
  }

  /* Concentric circles */
  .concentric-graphics {
    position: absolute;
    bottom: -60px;
    right: -60px;
    width: 240px;
    height: 240px;
    z-index: 1;
    pointer-events: none;
  }

  @media (max-width: 400px) {
    .concentric-graphics {
      bottom: -40px;
      right: -40px;
      width: 180px;
      height: 180px;
    }
  }

  .glass-graphics {
    position: absolute;
    bottom: -50px;
    right: -50px;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 70%);
    border-radius: 50%;
    z-index: 1;
    pointer-events: none;
  }

  /* Card Contents */
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 3;
    margin-bottom: 12px;
  }

  @media (max-width: 400px) {
    .card-header {
      margin-bottom: 8px;
    }
  }

  .srh-logo-svg {
    width: 72px;
    height: 36px;
    color: white;
  }

  @media (max-width: 400px) {
    .srh-logo-svg {
      width: 60px;
      height: 30px;
    }
  }

  .card-title-badge {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(5px);
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  @media (max-width: 400px) {
    .card-title-badge {
      font-size: 0.65rem;
      padding: 3px 8px;
    }
  }

  .card-body {
    display: flex;
    justify-content: space-between;
    flex-grow: 1;
    z-index: 3;
  }

  .info-side {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex-grow: 1;
  }

  .university-name {
    font-size: 0.85rem;
    font-weight: 700;
    opacity: 0.9;
    margin-bottom: 2px;
    letter-spacing: 0.2px;
  }

  .document-type {
    font-size: 0.75rem;
    font-weight: 500;
    opacity: 0.8;
    margin-bottom: 12px;
  }

  @media (max-width: 400px) {
    .university-name { font-size: 0.75rem; }
    .document-type { font-size: 0.65rem; margin-bottom: 8px; }
  }

  .owner-name {
    font-size: 1.35rem;
    font-weight: 900;
    margin-bottom: 14px;
    letter-spacing: -0.2px;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    color: #ffffff;
  }

  @media (max-width: 400px) {
    .owner-name {
      font-size: 1.1rem;
      margin-bottom: 8px;
    }
  }

  .meta-grid {
    display: grid;
    grid-template-columns: auto auto;
    column-gap: 20px;
    row-gap: 6px;
  }

  @media (max-width: 400px) {
    .meta-grid {
      column-gap: 12px;
      row-gap: 4px;
    }
  }

  .meta-item {
    display: flex;
    flex-direction: column;
  }

  /* Span validity across the full bottom width of the meta grid */
  .meta-item:last-child {
    grid-column: 1 / -1;
  }

  .meta-label {
    font-size: 0.62rem;
    text-transform: uppercase;
    opacity: 0.75;
    font-weight: 600;
    letter-spacing: 0.3px;
  }

  .meta-value {
    font-size: 0.82rem;
    font-weight: 700;
  }

  @media (max-width: 400px) {
    .meta-label { font-size: 0.55rem; }
    .meta-value { font-size: 0.72rem; }
  }

  .photo-side {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-left: 10px;
  }

  .photo-container {
    width: 90px;
    height: 110px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media (max-width: 400px) {
    .photo-container {
      width: 72px;
      height: 88px;
      border-radius: 8px;
    }
  }

  .student-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .fallback-avatar {
    width: 48px;
    height: 48px;
    color: rgba(255, 255, 255, 0.35);
  }

  @media (max-width: 400px) {
    .fallback-avatar {
      width: 36px;
      height: 36px;
    }
  }

  .card-footer {
    z-index: 3;
    margin-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 6px;
  }

  .subtext {
    font-size: 0.52rem;
    opacity: 0.7;
    font-weight: 500;
    display: block;
    line-height: 1.3;
  }

  /* Edit Overlays */
  .edit-overlay-buttons {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 6px;
    z-index: 5;
  }

  .card-action-btn {
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    transition: transform 0.2s;
    font-size: 0.9rem;
    background: white;
  }

  .card-action-btn:hover {
    transform: scale(1.1);
  }

  .delete-btn {
    background: #fee2e2;
  }

  /* Back Side Details */
  .card-back-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(0,0,0,0.06);
    padding-bottom: 8px;
    margin-bottom: 12px;
  }

  :global([data-theme="dark"]) .card-back-header {
    border-bottom-color: rgba(255,255,255,0.06);
  }

  .back-title {
    font-weight: 800;
    font-size: 0.9rem;
    letter-spacing: -0.1px;
  }

  .back-doc-type {
    font-size: 0.7rem;
    text-transform: uppercase;
    font-weight: 700;
    opacity: 0.6;
    letter-spacing: 0.5px;
  }

  .card-back-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-grow: 1;
  }

  .barcode-container {
    background: white;
    padding: 10px 16px 6px 16px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 12px;
    width: 82%;
    border: 1px solid rgba(0,0,0,0.05);
  }

  :global([data-theme="dark"]) .barcode-container {
    background: #ffffff; /* Barcodes are always high-contrast black on white */
    border-color: rgba(255,255,255,0.1);
  }

  .barcode-svg {
    width: 100%;
    height: 44px;
  }

  @media (max-width: 400px) {
    .barcode-svg {
      height: 36px;
    }
  }

  .barcode-label {
    font-family: monospace;
    font-size: 0.72rem;
    margin-top: 4px;
    color: #333333;
    font-weight: 700;
  }

  .legal-text {
    font-size: 0.58rem;
    line-height: 1.4;
    opacity: 0.75;
    text-align: center;
    padding: 0 10px;
  }

  .legal-text p {
    margin: 0 0 4px 0;
  }

  .legal-text p:last-child {
    margin: 0;
  }

  .card-back-footer {
    margin-top: 8px;
    text-align: center;
    border-top: 1px solid rgba(0,0,0,0.05);
    padding-top: 6px;
  }

  :global([data-theme="dark"]) .card-back-footer {
    border-top-color: rgba(255,255,255,0.05);
  }

  .tap-hint {
    font-size: 0.6rem;
    font-weight: 700;
    opacity: 0.55;
  }

  .expiration-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(245, 158, 11, 0.9);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    font-size: 0.68rem;
    font-weight: 800;
    padding: 4px 8px;
    border-radius: 12px;
    z-index: 10;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 4px;
    pointer-events: none;
    letter-spacing: 0.2px;
  }

  .expiration-badge.expired {
    background: rgba(239, 68, 68, 0.9);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
</style>
