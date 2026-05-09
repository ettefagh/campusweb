<script lang="ts">
  import { onMount } from "svelte";

  let alertText: string | null = null;

  onMount(async () => {
    try {
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
</script>

{#if alertText}
  <div class="global-alert">
    🚨 {alertText}
  </div>
{/if}

<style>
  .global-alert {
    background: #e5201e;
    color: white;
    padding: 10px 20px;
    text-align: center;
    font-weight: bold;
    font-size: 0.95rem;
    z-index: 1000;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    position: relative;
    width: 100%;
    box-sizing: border-box;
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
  }
</style>
