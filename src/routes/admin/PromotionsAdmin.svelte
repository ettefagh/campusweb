<script lang="ts">
  import { promotions } from "$lib/data/promotions";

  let promos = promotions;
</script>

<div class="admin-section">
  <header class="section-header">
    <h1>🎁 Promotions Manager</h1>
    <p class="header-sub">Manage sponsored offers and student discounts.</p>
  </header>

  <div class="banner warning">
    ⚠️ <b>Read-Only Mode:</b> Promotions currently use a static data file.
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
          </tr>
        </thead>
        <tbody>
          {#each promos as promo}
            <tr>
              <td><b>{promo.title}</b></td>
              <td>{promo.sponsorName}</td>
              <td>{promo.campusIds.join(", ")}</td>
              <td>
                <span class="label-pill" class:official={promo.label === 'Official Offer'}>
                  {promo.label}
                </span>
              </td>
              <td>{promo.priority}</td>
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

  .label-pill {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 2px 8px;
    background: #f3f4f6;
    border-radius: 99px;
  }
  .label-pill.official { background: #fee2e2; color: #991b1b; }
</style>
