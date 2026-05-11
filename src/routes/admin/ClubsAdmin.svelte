<script lang="ts">
  import { socialAccounts } from "$lib/data/socialAccounts";
  import { CAMPUSES } from "$lib/stores/settingsStore";

  let clubs = socialAccounts.filter(acc => acc.type === "club");
</script>

<div class="admin-section">
  <header class="section-header">
    <h1>🤝 Clubs Manager</h1>
    <p class="header-sub">Manage student clubs and community organizations.</p>
  </header>

  <div class="banner warning">
    ⚠️ <b>Read-Only Mode:</b> Club management currently uses a static data file. Write support coming in Phase 7.
  </div>

  <section class="card">
    <h2>Active Clubs ({clubs.length})</h2>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Handle</th>
            <th>Campus</th>
            <th>Categories</th>
            <th>Verified</th>
          </tr>
        </thead>
        <tbody>
          {#each clubs as club}
            <tr>
              <td><b>{club.name}</b></td>
              <td>@{club.handle}</td>
              <td>{club.campusIds.join(", ")}</td>
              <td>
                <div class="tags">
                  {#each club.categories || [] as cat}
                    <span class="tag">{cat}</span>
                  {/each}
                </div>
              </td>
              <td>{club.verified ? "✅" : "❌"}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>

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

  .tags { display: flex; gap: 4px; flex-wrap: wrap; }
  .tag { 
    font-size: 0.7rem; 
    font-weight: 700; 
    padding: 2px 8px; 
    background: #f3f4f6; 
    border-radius: 99px; 
    text-transform: uppercase; 
  }
</style>
