<svelte:head>
  <title>Interactive Campus Map & Wayfinding</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/bold/style.css" />
</svelte:head>

<div class="paused-page">
  <main class="paused-card glass">
    <div class="paused-icon" aria-hidden="true">
      <i class="ph-bold ph-map-trifold"></i>
    </div>

    <div class="paused-copy">
      <p class="paused-kicker">TEMPORARILY PAUSED</p>
      <h1>Interactive Campus Map</h1>
      <p>
        Indoor navigation is turned off for now and will return later.
        The rest of CampusWeb remains available.
      </p>

      <div class="paused-actions">
        <a href="/explore" class="paused-btn primary">
          <i class="ph-bold ph-arrow-left"></i>
          Back to Explore
        </a>
      </div>
    </div>
  </main>
</div>

<style>
  .paused-page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
    background: var(--bg-primary);
  }

  .paused-card {
    width: min(760px, 100%);
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 20px;
    align-items: center;
    padding: 32px;
    border-radius: 28px;
  }

  .paused-icon {
    width: 72px;
    height: 72px;
    border-radius: 22px;
    display: grid;
    place-items: center;
    background: rgba(96, 165, 250, 0.12);
    color: #60a5fa;
    font-size: 2rem;
    flex-shrink: 0;
  }

  .paused-kicker {
    margin: 0;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-size: 0.78rem;
    color: var(--text-tertiary);
  }

  .paused-copy h1 {
    margin: 0.15rem 0 0.75rem;
    font-size: clamp(2rem, 4vw, 3rem);
  }

  .paused-copy p {
    margin: 0;
    color: var(--text-secondary);
    max-width: 58ch;
  }

  .paused-actions {
    margin-top: 20px;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .paused-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 18px;
    border-radius: 999px;
    text-decoration: none;
    font-weight: 700;
    transition: transform 0.2s ease, opacity 0.2s ease;
  }

  .paused-btn.primary {
    background: var(--accent-primary);
    color: white;
  }

  .paused-btn:hover {
    transform: translateY(-1px);
    opacity: 0.96;
  }

  @media (max-width: 640px) {
    .paused-card {
      grid-template-columns: 1fr;
      text-align: left;
      padding: 24px;
    }
  }
</style>
