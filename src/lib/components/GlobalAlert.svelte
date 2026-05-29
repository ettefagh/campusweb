<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  let alertText: string | null = null;
  let isDismissed = false;

  onMount(async () => {
    try {
      if (browser && sessionStorage.getItem("campusweb_global_alert_dismissed") === "true") {
        isDismissed = true;
      }
      const res = await fetch("/api/alert");
      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          alertText = data.text;
        }
      }
    } catch (e) {
      console.warn("Failed to load alert", e);
    }
  });

  function dismiss() {
    isDismissed = true;
    if (browser) {
      sessionStorage.setItem("campusweb_global_alert_dismissed", "true");
    }
  }
</script>

{#if alertText && !isDismissed}
  <div class="global-alert banner-surface" role="alert" aria-live="assertive">
    <div class="alert-content">
      <span class="alert-icon">🚨</span>
      <span class="alert-text">{alertText}</span>
    </div>
    <button class="alert-close" aria-label="Dismiss alert" on:click={dismiss}>
      <i class="ph-bold ph-x" aria-hidden="true"></i>
    </button>
  </div>
{/if}

<style>
  .global-alert {
    background: #e5201e;
    color: white;
    padding: 12px 16px;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(229, 32, 30, 0.2);
    position: relative;
    width: 100%;
    box-sizing: border-box;
    animation: slideDown 0.3s ease-out;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .alert-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    justify-content: center;
  }

  .alert-icon {
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .alert-text {
    font-weight: 700;
    font-size: 0.95rem;
    line-height: 1.4;
    text-align: center;
  }

  .alert-close {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    cursor: pointer;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: background-color 0.2s;
    flex-shrink: 0;
  }

  .alert-close:hover {
    background: rgba(255, 255, 255, 0.35);
  }

  @keyframes slideDown {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
  }
</style>
