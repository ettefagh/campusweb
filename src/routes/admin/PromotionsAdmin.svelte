<script lang="ts">
  import { onMount } from "svelte";
  import { dynamicPromotions, fetchPromotions } from "$lib/stores/promoStore";

  onMount(() => {
    fetchPromotions();
  });

  $: promos = $dynamicPromotions;

  let isModalOpen = false;
  let isSubmitting = false;
  let currentPromo = getEmptyPromo();

  function getEmptyPromo() {
    return {
      id: "",
      title: "",
      subtitle: "",
      linkUrl: "",
      sponsorName: "",
      campusIds: ["all"],
      label: "",
      cta: "",
      imageUrl: "",
      priority: 5,
      expiresAt: ""
    };
  }

  function openCreateModal() {
    currentPromo = getEmptyPromo();
    isModalOpen = true;
  }

  function openEditModal(promo: any) {
    currentPromo = JSON.parse(JSON.stringify(promo)); // clone
    if (!Array.isArray(currentPromo.campusIds)) {
      currentPromo.campusIds = ["all"];
    }
    // format date for date input if it exists
    if (currentPromo.expiresAt) {
      try {
        currentPromo.expiresAt = new Date(currentPromo.expiresAt).toISOString().split('T')[0];
      } catch (e) {
        currentPromo.expiresAt = "";
      }
    }
    isModalOpen = true;
  }

  async function savePromo() {
    isSubmitting = true;
    // format date back to ISO
    if (currentPromo.expiresAt) {
      try {
        currentPromo.expiresAt = new Date(currentPromo.expiresAt).toISOString();
      } catch (e) {
        // invalid date
      }
    }
    try {
      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentPromo)
      });
      if (res.ok) {
        isModalOpen = false;
        fetchPromotions(true);
      } else {
        alert("Failed to save promotion");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving promotion");
    } finally {
      isSubmitting = false;
    }
  }

  async function deletePromo(id: string) {
    if (!confirm("Are you sure you want to delete this promotion?")) return;
    try {
      const res = await fetch(`/api/promotions?id=${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchPromotions(true);
      } else {
        alert("Failed to delete promotion");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting promotion");
    }
  }
</script>

<div class="admin-section">
  <header class="section-header" style="display: flex; justify-content: space-between; align-items: center;">
    <div>
      <h1>🎁 Promotions Manager</h1>
      <p class="header-sub">Manage sponsored offers and student discounts.</p>
    </div>
    <button class="btn-primary" on:click={openCreateModal}>+ Create Promo</button>
  </header>

  <div class="banner warning" style="background: #ecfdf5; color: #065f46; border-color: #d1fae5;">
    ✅ <b>Live Mode:</b> Promotions are synced dynamically from Cloudflare KV.
  </div>

  <section class="card">
    <h2>Live Promotions ({promos.length})</h2>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Sponsor</th>
            <th>Campus</th>
            <th>Label</th>
            <th>Priority</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each promos as promo}
            <tr>
              <td><b>{promo.title}</b></td>
              <td>{promo.sponsorName || "N/A"}</td>
              <td>{promo.campusIds.join(", ")}</td>
              <td>
                <span class="label-pill" class:official={promo.label === 'Official Offer'}>
                  {promo.label || "None"}
                </span>
              </td>
              <td>{promo.priority}</td>
              <td class="actions-cell">
                <button class="btn-text" on:click={() => openEditModal(promo)}>Edit</button>
                <button class="btn-text text-danger" on:click={() => deletePromo(promo.id)}>Delete</button>
              </td>
            </tr>
          {/each}
          {#if promos.length === 0}
            <tr>
              <td colspan="6" style="text-align: center; color: #666; padding: 24px;">No promotions found.</td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </section>
</div>

{#if isModalOpen}
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-backdrop" on:click={() => isModalOpen = false}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-content" on:click|stopPropagation>
    <div class="modal-header">
      <h2>{currentPromo.id ? "Edit" : "Create"} Promotion</h2>
      <button class="close-btn" on:click={() => isModalOpen = false}>✕</button>
    </div>
    
    <div class="modal-body form-grid">
      <div class="form-group full-width">
        <label>Title</label>
        <input type="text" bind:value={currentPromo.title} placeholder="e.g. 50% Off Spotify" />
      </div>
      <div class="form-group full-width">
        <label>Subtitle / Description</label>
        <textarea bind:value={currentPromo.subtitle} placeholder="Short description..."></textarea>
      </div>
      <div class="form-group">
        <label>Sponsor Name</label>
        <input type="text" bind:value={currentPromo.sponsorName} placeholder="e.g. Spotify" />
      </div>
      <div class="form-group">
        <label>Badge Label</label>
        <input type="text" bind:value={currentPromo.label} placeholder="e.g. 100% Free" />
      </div>
      <div class="form-group">
        <label>CTA Text</label>
        <input type="text" bind:value={currentPromo.cta} placeholder="e.g. Claim Free Pack" />
      </div>
      <div class="form-group">
        <label>Priority (1-100, lower is higher priority)</label>
        <input type="number" bind:value={currentPromo.priority} />
      </div>
      <div class="form-group full-width">
        <label>Target Link</label>
        <input type="url" bind:value={currentPromo.linkUrl} placeholder="https://..." />
      </div>
      <div class="form-group full-width">
        <label>Image URL</label>
        <input type="url" bind:value={currentPromo.imageUrl} placeholder="https://..." />
      </div>
      <div class="form-group">
        <label>Campus ID (comma separated)</label>
        <input type="text" value={currentPromo.campusIds.join(", ")} on:input={(e) => currentPromo.campusIds = e.currentTarget.value.split(',').map(s => s.trim())} />
      </div>
      <div class="form-group">
        <label>Expiration Date</label>
        <input type="date" bind:value={currentPromo.expiresAt} />
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn-secondary" on:click={() => isModalOpen = false}>Cancel</button>
      <button class="btn-primary" on:click={savePromo} disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </button>
    </div>
  </div>
</div>
{/if}

<style>
  .admin-section { max-width: 900px; }
  .section-header { margin-bottom: 28px; }
  .section-header h1 { font-size: 1.8rem; font-weight: 800; margin: 0 0 6px; }
  .header-sub { color: var(--text-color-secondary, #666); font-size: 0.92rem; }

  .card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }

  .banner {
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 0.88rem;
    margin-bottom: 24px;
  }
  .banner.warning { background: #fffbeb; color: #92400e; border: 1px solid #fef3c7; }

  .table-wrapper { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th { text-align: left; padding: 12px; border-bottom: 2px solid #f3f4f6; color: #666; font-weight: 700; }
  td { padding: 12px; border-bottom: 1px solid #f3f4f6; }

  .label-pill {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 2px 8px;
    background: #f3f4f6;
    border-radius: 99px;
  }
  .label-pill.official { background: #fee2e2; color: #991b1b; }

  .actions-cell {
    display: flex;
    gap: 12px;
  }
  .btn-text {
    background: none; border: none; cursor: pointer;
    color: #2563eb; font-weight: 600; font-size: 0.85rem; padding: 0;
  }
  .btn-text.text-danger { color: #dc2626; }
  .btn-text:hover { text-decoration: underline; }

  .btn-primary {
    background: #2563eb; color: white;
    padding: 8px 16px; border-radius: 8px;
    font-weight: 600; font-size: 0.9rem;
    border: none; cursor: pointer;
  }
  .btn-primary:hover { background: #1d4ed8; }
  .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

  .btn-secondary {
    background: #f3f4f6; color: #374151;
    padding: 8px 16px; border-radius: 8px;
    font-weight: 600; font-size: 0.9rem;
    border: 1px solid #d1d5db; cursor: pointer;
  }
  .btn-secondary:hover { background: #e5e7eb; }

  /* Modal Styles */
  .modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 20px;
  }
  .modal-content {
    background: white; border-radius: 16px;
    width: 100%; max-width: 600px;
    max-height: 90vh; display: flex; flex-direction: column;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  }
  .modal-header {
    padding: 20px 24px; border-bottom: 1px solid #e5e7eb;
    display: flex; justify-content: space-between; align-items: center;
  }
  .modal-header h2 { margin: 0; font-size: 1.25rem; font-weight: 700; }
  .close-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #6b7280; }
  
  .modal-body {
    padding: 24px; overflow-y: auto;
  }
  
  .form-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
  }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group.full-width { grid-column: 1 / -1; }
  .form-group label { font-size: 0.85rem; font-weight: 600; color: #374151; }
  .form-group input, .form-group textarea {
    padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;
    font-size: 0.95rem; font-family: inherit;
  }
  .form-group textarea { resize: vertical; min-height: 80px; }
  .form-group input:focus, .form-group textarea:focus {
    outline: none; border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.2);
  }

  .modal-footer {
    padding: 16px 24px; border-top: 1px solid #e5e7eb;
    display: flex; justify-content: flex-end; gap: 12px;
    background: #f9fafb; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;
  }
</style>
