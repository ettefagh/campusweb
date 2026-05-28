<script lang="ts">
  import { onMount } from "svelte";
  import { CAMPUSES } from "$lib/stores/settingsStore";
  import type { SocialAccount } from "$lib/data/socialAccounts";

  let clubs: SocialAccount[] = [];
  let loading = true;
  let saveLoading = false;
  let uploadLoading = false;

  let showModal = false;
  let isEditing = false;

  // Form State
  let formId = "";
  let formName = "";
  let formHandle = "";
  let formUrl = "";
  let formDescription = "";
  let formCampusIds: string[] = ["all"];
  let formLogoUrl = "";
  let formVerified = false;
  let formStep = 1;
  let formError = "";

  function nextFormStep() {
    formError = "";
    if (formStep === 1) {
      if (!formName.trim()) {
        formError = "Club Name is required.";
        return;
      }
      formStep = 2;
    }
  }

  function prevFormStep() {
    formError = "";
    formStep = 1;
  }

  async function loadClubs() {
    loading = true;
    try {
      const res = await fetch("/admin/api/clubs");
      if (res.ok) {
        clubs = await res.json();
      }
    } catch (err) {
      console.error("Failed to load clubs in dashboard:", err);
    } finally {
      loading = false;
    }
  }

  function openAddModal() {
    isEditing = false;
    formId = "club-" + Math.random().toString(36).substring(2, 9);
    formName = "";
    formHandle = "";
    formUrl = "";
    formDescription = "";
    formCampusIds = ["all"];
    formLogoUrl = "";
    formVerified = false;
    formStep = 1;
    formError = "";
    showModal = true;
  }

  function openEditModal(club: SocialAccount) {
    isEditing = true;
    formId = club.id;
    formName = club.name;
    formHandle = club.handle || "";
    formUrl = club.url;
    formDescription = club.description || "";
    formCampusIds = club.campusIds || ["all"];
    formLogoUrl = club.logoUrl || "";
    formVerified = club.verified || false;
    formStep = 1;
    formError = "";
    showModal = true;
  }

  async function handleLogoUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const formData = new FormData();
    formData.append("file", file);

    uploadLoading = true;
    try {
      const res = await fetch("/admin/api/upload", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        formLogoUrl = data.url;
      } else {
        alert("Upload failed. Make sure it is a valid image file.");
      }
    } catch (err) {
      console.error("Logo upload error:", err);
      alert("Error uploading logo.");
    } finally {
      uploadLoading = false;
    }
  }

  async function handleSave() {
    formError = "";
    if (!formUrl.trim()) {
      formError = "Social/Website URL is required.";
      return;
    }

    saveLoading = true;

    // Generate handle from name if empty
    const handle = formHandle.trim() || formName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

    const newOrUpdatedClub: SocialAccount = {
      id: formId,
      type: "club",
      name: formName.trim(),
      handle: handle,
      url: formUrl.trim(),
      campusIds: formCampusIds,
      logoUrl: formLogoUrl || undefined,
      description: formDescription.trim() || undefined,
      verified: formVerified,
      platform: "instagram", // default platform
      priority: 10          // default priority
    };

    let updatedClubs = [...clubs];

    if (isEditing) {
      const index = updatedClubs.findIndex(c => c.id === formId);
      if (index !== -1) {
        updatedClubs[index] = newOrUpdatedClub;
      }
    } else {
      updatedClubs.unshift(newOrUpdatedClub);
    }

    try {
      const res = await fetch("/admin/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedClubs)
      });

      if (res.ok) {
        clubs = updatedClubs;
        showModal = false;
      } else {
        alert("Failed to save club data.");
      }
    } catch (err) {
      console.error("Save club error:", err);
      alert("Error saving club.");
    } finally {
      saveLoading = false;
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this club?")) return;

    const updatedClubs = clubs.filter(c => c.id !== id);

    try {
      const res = await fetch("/admin/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedClubs)
      });

      if (res.ok) {
        clubs = updatedClubs;
      } else {
        alert("Failed to delete club.");
      }
    } catch (err) {
      console.error("Delete club error:", err);
      alert("Error deleting club.");
    }
  }

  function toggleCampus(campusId: string) {
    if (campusId === "all") {
      formCampusIds = ["all"];
    } else {
      let ids = formCampusIds.filter(id => id !== "all");
      if (ids.includes(campusId)) {
        ids = ids.filter(id => id !== campusId);
      } else {
        ids.push(campusId);
      }
      formCampusIds = ids.length === 0 ? ["all"] : ids;
    }
  }

  onMount(() => {
    loadClubs();
  });
</script>

<div class="admin-section">
  <header class="section-header">
    <div class="header-left">
      <h1>🤝 Clubs Manager</h1>
      <p class="header-sub">Manage student clubs and community organizations.</p>
    </div>
    <button class="primary-btn" on:click={openAddModal}>
      <i class="ph-bold ph-plus"></i> Add New Club
    </button>
  </header>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading clubs data...</p>
    </div>
  {:else}
    <section class="card">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style="width: 80px;">Logo</th>
              <th>Name</th>
              <th>Handle</th>
              <th>Campuses</th>
              <th>Verified</th>
              <th class="actions-header" style="width: 120px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each clubs as club (club.id)}
              <tr>
                <td>
                  <div class="logo-preview-cell">
                    {#if club.logoUrl}
                      <img src={club.logoUrl} alt={club.name} />
                    {:else}
                      <span class="logo-placeholder">{club.name[0]}</span>
                    {/if}
                  </div>
                </td>
                <td>
                  <div class="name-cell">
                    <span class="club-name">{club.name}</span>
                    {#if club.description}
                      <span class="club-desc-hint">{club.description.slice(0, 60)}...</span>
                    {/if}
                  </div>
                </td>
                <td><span class="handle-badge">@{club.handle || 'no-handle'}</span></td>
                <td>
                  <div class="campus-tags">
                    {#each club.campusIds || [] as cId}
                      <span class="campus-tag" class:all-tag={cId === "all"}>
                        {cId === "all" ? "All Campuses" : CAMPUSES.find(c => c.id === cId)?.name || cId}
                      </span>
                    {/each}
                  </div>
                </td>
                <td>
                  <span class="status-indicator" class:verified={club.verified}>
                    <i class="ph-fill {club.verified ? 'ph-check-circle' : 'ph-x-circle'}"></i>
                    {club.verified ? 'Verified' : 'Standard'}
                  </span>
                </td>
                <td>
                  <div class="actions-cell">
                    <button class="action-btn edit" on:click={() => openEditModal(club)} aria-label="Edit Club">
                      <i class="ph-bold ph-pencil-simple"></i>
                    </button>
                    <button class="action-btn delete" on:click={() => handleDelete(club.id)} aria-label="Delete Club">
                      <i class="ph-bold ph-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}
</div>

<!-- Modal Form -->
{#if showModal}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-backdrop" on:click={() => (showModal = false)} on:keydown={(e) => e.key === 'Escape' && (showModal = false)}>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal" on:click|stopPropagation>
      <header class="modal-header">
        <h2>{isEditing ? "✏️ Edit Club" : "🤝 Add Student Club"}</h2>
        <button class="close-btn" on:click={() => (showModal = false)}>
          <i class="ph ph-x"></i>
        </button>
      </header>

      <div class="modal-body">
        {#if formError}
          <div class="error-msg">{formError}</div>
        {/if}

        <div class="progress-indicator">
          <div class="step {formStep >= 1 ? 'active' : ''}">1. Core Info</div>
          <div class="step {formStep >= 2 ? 'active' : ''}">2. Links & Access</div>
        </div>

        {#if formStep === 1}
          <div class="form-group logo-upload-group">
            <label>Club Logo</label>
            <div class="upload-controls">
              <div class="logo-preview-lg">
                {#if formLogoUrl}
                  <img src={formLogoUrl} alt="Preview" />
                {:else}
                  <span class="logo-placeholder-lg"><i class="ph ph-image"></i></span>
                {/if}
              </div>
              <div class="upload-btn-wrapper">
                <button class="secondary-btn upload-btn">
                  <i class="ph ph-upload"></i> {uploadLoading ? "Uploading..." : "Upload Logo"}
                </button>
                <input type="file" accept="image/*" on:change={handleLogoUpload} disabled={uploadLoading} />
              </div>
              {#if formLogoUrl}
                <button class="text-danger-btn" on:click={() => (formLogoUrl = "")}>Remove</button>
              {/if}
            </div>
          </div>

          <div class="form-group">
            <label for="club-name">Club Name *</label>
            <input id="club-name" type="text" placeholder="e.g. SRH Gaming Club" bind:value={formName} />
          </div>

          <div class="form-group">
            <label for="club-desc">Description</label>
            <textarea id="club-desc" rows="3" placeholder="What is your club about?" value={formDescription} on:input={(e) => formDescription = (e.currentTarget as HTMLTextAreaElement).value}></textarea>
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={formVerified} />
              <span class="custom-chk-text">
                <strong>Verified Club Status</strong> (adds verified badge to card)
              </span>
            </label>
          </div>
        {:else if formStep === 2}
          <div class="form-row">
            <div class="form-group flex-1">
              <label for="club-url">Social Link or Website *</label>
              <input id="club-url" type="url" placeholder="https://instagram.com/srh_gaming" bind:value={formUrl} />
            </div>
            <div class="form-group flex-1">
              <label for="club-handle">Social Handle</label>
              <input id="club-handle" type="text" placeholder="e.g. srh_gaming" bind:value={formHandle} />
            </div>
          </div>

          <div class="form-group">
            <label>Campus Access</label>
            <div class="campus-checkboxes">
              <button 
                type="button" 
                class="campus-chk" 
                class:checked={formCampusIds.includes("all")} 
                on:click={() => toggleCampus("all")}
              >
                All Campuses
              </button>
              {#each CAMPUSES as campus}
                <button 
                  type="button" 
                  class="campus-chk" 
                  class:checked={formCampusIds.includes(campus.id)} 
                  on:click={() => toggleCampus(campus.id)}
                >
                  {campus.name}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <footer class="modal-footer">
        {#if formStep > 1}
          <button class="secondary-btn" on:click={prevFormStep}>Back</button>
        {:else}
          <button class="secondary-btn" on:click={() => (showModal = false)}>Cancel</button>
        {/if}

        {#if formStep < 2}
          <button class="primary-btn" on:click={nextFormStep}>Next</button>
        {:else}
          <button class="primary-btn" on:click={handleSave} disabled={saveLoading}>
            {saveLoading ? "Saving..." : "Save Club"}
          </button>
        {/if}
      </footer>
    </div>
  </div>
{/if}

<style>
  .admin-section { max-width: 1000px; margin: 0 auto; width: 100%; }
  .section-header { 
    display: flex; 
    justify-content: space-between; 
    align-items: flex-start;
    margin-bottom: 28px; 
  }
  .section-header h1 { font-size: 1.8rem; font-weight: 800; margin: 0 0 6px; }
  .header-sub { color: var(--text-color-secondary, #666); font-size: 0.92rem; margin: 0; }

  .primary-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    background: var(--primary-color, #e5201e);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.92rem;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .primary-btn:hover { background: #c41816; }
  .primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .secondary-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    background: var(--bg-color, #f3f4f6);
    color: var(--text-color, #111);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.92rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .secondary-btn:hover { background: #e5e7eb; }

  .text-danger-btn {
    background: transparent;
    border: none;
    color: var(--primary-color, #e5201e);
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .card {
    background: #fff;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
    color: var(--text-color-secondary);
  }
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #f3f4f6;
    border-top: 3px solid var(--primary-color, #e5201e);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 16px;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .table-wrapper { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
  th { text-align: left; padding: 14px 16px; border-bottom: 2px solid #f3f4f6; color: var(--text-color-secondary); font-weight: 700; }
  td { padding: 14px 16px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }

  .logo-preview-cell {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
  }
  .logo-preview-cell img { width: 100%; height: 100%; object-fit: cover; }
  .logo-placeholder { font-size: 1.2rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }

  .name-cell { display: flex; flex-direction: column; gap: 2px; }
  .club-name { font-weight: 700; color: var(--text-color); }
  .club-desc-hint { font-size: 0.8rem; color: var(--text-color-secondary); font-weight: 400; }

  .handle-badge {
    background: rgba(59, 130, 246, 0.08);
    color: #2563eb;
    padding: 4px 8px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .campus-tags { display: flex; gap: 4px; flex-wrap: wrap; }
  .campus-tag {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 3px 8px;
    background: #f3f4f6;
    border-radius: 6px;
    color: #4b5563;
  }
  .campus-tag.all-tag { background: #ecfdf5; color: #059669; }

  .status-indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #6b7280;
  }
  .status-indicator.verified { color: #059669; }
  .status-indicator i { font-size: 1.1rem; }

  .actions-header { text-align: right; }
  .actions-cell { display: flex; gap: 8px; justify-content: flex-end; }
  .action-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--border-color, #e5e7eb);
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #4b5563;
    transition: all 0.15s ease;
  }
  .action-btn:hover { background: #f9fafb; }
  .action-btn.edit:hover { border-color: #3b82f6; color: #3b82f6; }
  .action-btn.delete:hover { border-color: var(--primary-color); color: var(--primary-color); }

  /* Modal Styles */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.4);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .modal {
    background: #fff;
    border-radius: 20px;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
  }
  .modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .modal-header h2 { font-size: 1.3rem; margin: 0; font-weight: 800; }
  .close-btn { background: transparent; border: none; font-size: 1.3rem; cursor: pointer; color: #6b7280; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }

  .modal-body {
    padding: 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group label { font-size: 0.88rem; font-weight: 700; color: #374151; }
  .form-group input[type="text"], .form-group input[type="url"], .form-group textarea {
    padding: 10px 14px;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    font-size: 0.92rem;
    width: 100%;
    outline: none;
    transition: border-color 0.15s ease;
  }
  .form-group input:focus, .form-group textarea:focus { border-color: #3b82f6; }

  .form-row { display: flex; gap: 16px; }
  .flex-1 { flex: 1; }

  .logo-upload-group {
    background: #f9fafb;
    border: 1px dashed #d1d5db;
    padding: 16px;
    border-radius: 12px;
  }
  .upload-controls { display: flex; align-items: center; gap: 16px; margin-top: 4px; }
  .logo-preview-lg {
    width: 64px;
    height: 64px;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    border: 1px solid #e5e7eb;
  }
  .logo-preview-lg img { width: 100%; height: 100%; object-fit: cover; }
  .logo-placeholder-lg { font-size: 2rem; color: #cbd5e1; }

  .upload-btn-wrapper {
    position: relative;
    overflow: hidden;
    display: inline-block;
  }
  .upload-btn-wrapper input[type=file] {
    font-size: 100px;
    position: absolute;
    left: 0;
    top: 0;
    opacity: 0;
    cursor: pointer;
  }

  .campus-checkboxes { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
  .campus-chk {
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    color: #4b5563;
  }
  .campus-chk.checked {
    background: #2563eb;
    color: #fff;
    border-color: #2563eb;
  }

  .checkbox-group { margin-top: 8px; }
  .checkbox-label { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }
  .checkbox-label input { width: 18px; height: 18px; margin-top: 2px; }
  .custom-chk-text { font-size: 0.9rem; color: #4b5563; }

  .modal-footer {
    padding: 16px 24px;
    border-top: 1px solid #f3f4f6;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .error-msg {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #ef4444;
    padding: 12px;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .progress-indicator {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    gap: 8px;
  }
  .progress-indicator .step {
    flex: 1;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    color: #9ca3af;
    padding-bottom: 8px;
    border-bottom: 3px solid #e5e7eb;
    transition: all 0.3s;
  }
  .progress-indicator .step.active {
    color: var(--primary-color, #e5201e);
    border-bottom-color: var(--primary-color, #e5201e);
  }
</style>
