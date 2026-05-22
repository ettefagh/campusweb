<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import EmailGate from "$lib/components/EmailGate.svelte";
  import {
    CAMPUSES,
    settingsStore,
    campusDepartments,
    campusPrograms,
  } from "$lib/stores/settingsStore";

  const dispatch = createEventDispatcher<{ close: void }>();

  let step = 0;

  function closeFlow() {
    dispatch("close");
  }

  function nextStep() {
    step = Math.min(step + 1, 2);
  }

  function previousStep() {
    step = Math.max(step - 1, 0);
  }

  function selectCampus(campusId: string) {
    settingsStore.patch({ campusId, departmentId: null, programName: null });
  }

  function selectDepartment(departmentId: string) {
    settingsStore.patch({ departmentId, programName: null });
  }

  function selectProgram(programName: string) {
    settingsStore.patch({ programName: programName || null });
  }
</script>

<div class="welcome-overlay" role="dialog" aria-modal="true" aria-label="Welcome to CampusWeb">
  <section class="welcome-card">
    <button class="welcome-later" type="button" on:click={closeFlow}>
      {step === 2 ? "Later" : "Skip"}
    </button>

    <div class="welcome-art" aria-hidden="true">
      <div class="welcome-orb welcome-orb--warm"></div>
      <div class="welcome-orb welcome-orb--cool"></div>
      <div class="welcome-dots"></div>
      <div class="welcome-mark">C</div>
      <span class="welcome-spark"></span>
    </div>

    {#if step === 0}
      <div class="welcome-content">
        <p class="welcome-kicker">CampusWeb</p>
        <h2>Your university companion</h2>
        <p class="welcome-lead">
          Keep services, contacts, schedules and student tools in one quick-access webapp.
        </p>

        <div class="welcome-feature-list">
          <div class="welcome-feature">
            <span><i class="ph-bold ph-link"></i></span>
            <div>
              <strong>Link everything</strong>
              <p>All your campus services in one place.</p>
            </div>
          </div>
          <div class="welcome-feature">
            <span><i class="ph-bold ph-hand-tap"></i></span>
            <div>
              <strong>One-handed</strong>
              <p>Designed for quick access and easy use.</p>
            </div>
          </div>
          <div class="welcome-feature">
            <span><i class="ph-bold ph-bookmark-simple"></i></span>
            <div>
              <strong>Custom bookmarks</strong>
              <p>Organize what matters most to you.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="welcome-actions">
        <button class="welcome-primary" type="button" on:click={nextStep}>
          Enter CampusWeb
          <i class="ph-bold ph-arrow-right"></i>
        </button>
      </div>
    {:else if step === 1}
      <div class="welcome-content">
        <p class="welcome-kicker">Campus setup</p>
        <h2>Choose your campus info</h2>
        <p class="welcome-lead">
          This tunes contacts, links, library access and campus-specific content.
        </p>

        <div class="welcome-form">
          <label for="welcome-name">First Name</label>
          <input
            type="text"
            id="welcome-name"
            placeholder="e.g. Alex"
            value={$settingsStore.firstName ?? ""}
            on:input={(event) => settingsStore.patch({ firstName: event.currentTarget.value || null })}
          />

          <label for="welcome-campus">Campus</label>
          <select
            id="welcome-campus"
            value={$settingsStore.campusId ?? ""}
            on:change={(event) => selectCampus(event.currentTarget.value)}
          >
            <option value="" disabled>Select campus</option>
            {#each CAMPUSES as campus}
              <option value={campus.id}>{campus.name}</option>
            {/each}
          </select>

          {#if $settingsStore.campusId}
            <label for="welcome-department">School</label>
            <select
              id="welcome-department"
              value={$settingsStore.departmentId ?? ""}
              on:change={(event) => selectDepartment(event.currentTarget.value)}
            >
              <option value="" disabled>Select school</option>
              {#each $campusDepartments as department}
                <option value={department.id}>{department.shortName} - {department.name}</option>
              {/each}
            </select>
          {/if}

          {#if $settingsStore.departmentId}
            <label for="welcome-program">Program</label>
            <select
              id="welcome-program"
              value={$settingsStore.programName ?? ""}
              on:change={(event) => selectProgram(event.currentTarget.value)}
            >
              <option value="">Select program later</option>
              {#each $campusPrograms as program}
                <option value={program}>{program}</option>
              {/each}
            </select>
          {/if}
        </div>
      </div>

      <div class="welcome-actions welcome-actions--split">
        <button class="welcome-secondary" type="button" on:click={previousStep}>
          Back
        </button>
        <button
          class="welcome-primary"
          type="button"
          on:click={nextStep}
          disabled={!$settingsStore.campusId}
        >
          Continue
          <i class="ph-bold ph-arrow-right"></i>
        </button>
      </div>
    {:else}
      <div class="welcome-content">
        <p class="welcome-kicker">SRH access</p>
        <h2>Verify your SRH email</h2>
        <p class="welcome-lead">
          Unlock protected university calendars and the full internal contact directory.
        </p>

        <div class="welcome-auth-card">
          {#if $settingsStore.emailVerified}
            <div class="welcome-verified">
              <i class="ph-bold ph-shield-check"></i>
              <strong>SRH access is active</strong>
              <p>Your protected campus content is ready.</p>
            </div>
          {:else}
            <EmailGate />
          {/if}
        </div>
      </div>

      <div class="welcome-actions welcome-actions--split">
        <button class="welcome-secondary" type="button" on:click={previousStep}>
          Back
        </button>
        <button class="welcome-primary" type="button" on:click={closeFlow}>
          {$settingsStore.emailVerified ? "Finish" : "Use CampusWeb"}
          <i class="ph-bold ph-arrow-right"></i>
        </button>
      </div>
    {/if}

    <div class="welcome-progress" aria-label="Onboarding progress">
      {#each [0, 1, 2] as index}
        <span class:active={step === index}></span>
      {/each}
    </div>
  </section>
</div>

<style>
  .welcome-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    padding: var(--spacing-lg);
    background: rgba(255, 255, 255, 0.42);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
  }

  :global([data-theme="dark"]) .welcome-overlay {
    background: rgba(6, 6, 12, 0.58);
  }

  .welcome-card {
    position: relative;
    width: min(100%, 430px);
    min-height: min(820px, calc(100dvh - 32px));
    display: flex;
    flex-direction: column;
    padding: 34px 32px 28px;
    overflow: hidden;
    color: var(--text-color);
    background:
      radial-gradient(circle at 0% 0%, rgba(255, 116, 36, 0.14), transparent 33%),
      radial-gradient(circle at 100% 76%, rgba(137, 83, 255, 0.14), transparent 24%),
      rgba(255, 255, 255, 0.84);
    border: 1px solid rgba(255, 255, 255, 0.76);
    border-radius: 34px;
    box-shadow:
      0 28px 70px rgba(15, 23, 42, 0.18),
      inset 0 1px 0 rgba(255, 255, 255, 0.86);
  }

  :global([data-theme="dark"]) .welcome-card {
    background:
      radial-gradient(circle at 0% 0%, rgba(255, 116, 36, 0.16), transparent 33%),
      radial-gradient(circle at 100% 76%, rgba(137, 83, 255, 0.2), transparent 24%),
      rgba(18, 18, 28, 0.9);
    border-color: rgba(255, 255, 255, 0.14);
  }

  .welcome-later {
    position: absolute;
    top: 20px;
    right: 22px;
    z-index: 2;
    border: none;
    background: rgba(255, 255, 255, 0.68);
    color: var(--text-color-secondary);
    font-size: 0.85rem;
    font-weight: 800;
    cursor: pointer;
    padding: 8px 12px;
    border-radius: 999px;
  }

  .welcome-later:hover {
    color: var(--primary-color);
  }

  .welcome-art {
    position: relative;
    height: 225px;
    flex: 0 0 auto;
  }

  .welcome-orb {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }

  .welcome-orb--warm {
    width: 270px;
    height: 270px;
    left: -138px;
    top: -132px;
    background: rgba(255, 120, 45, 0.12);
  }

  .welcome-orb--cool {
    width: 170px;
    height: 170px;
    right: -105px;
    bottom: -92px;
    background: rgba(126, 87, 255, 0.14);
  }

  .welcome-dots {
    position: absolute;
    right: -2px;
    top: 28px;
    width: 95px;
    height: 92px;
    opacity: 0.55;
    background-image: radial-gradient(circle, rgba(126, 87, 255, 0.6) 2px, transparent 2.5px);
    background-size: 22px 22px;
  }

  .welcome-mark {
    position: absolute;
    left: 50%;
    top: 104px;
    transform: translateX(-50%);
    width: 104px;
    height: 104px;
    display: grid;
    place-items: center;
    color: var(--primary-color);
    background: rgba(255, 255, 255, 0.84);
    border: 1px solid rgba(255, 255, 255, 0.78);
    border-radius: 24px;
    font-family: "SRH Headline", sans-serif;
    font-size: 4.25rem;
    font-weight: 800;
    line-height: 1;
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
  }

  :global([data-theme="dark"]) .welcome-mark,
  :global([data-theme="dark"]) .welcome-later {
    background: rgba(255, 255, 255, 0.1);
  }

  .welcome-spark {
    position: absolute;
    top: 86px;
    left: 68%;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: var(--primary-color);
  }

  .welcome-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .welcome-kicker {
    margin: 0 0 8px;
    color: var(--primary-color);
    font-size: 0.82rem;
    font-weight: 900;
    text-align: center;
    text-transform: uppercase;
  }

  .welcome-content h2 {
    margin: 0;
    color: #081128;
    font-family: "SRH Headline", sans-serif;
    font-size: 2.35rem;
    line-height: 1.02;
    text-align: center;
  }

  :global([data-theme="dark"]) .welcome-content h2 {
    color: var(--text-color);
  }

  .welcome-lead {
    max-width: 300px;
    margin: 10px auto 0;
    color: var(--text-color-secondary);
    font-size: 1rem;
    line-height: 1.45;
    text-align: center;
  }

  .welcome-feature-list {
    display: grid;
    gap: 18px;
    margin: 30px auto 0;
    width: min(100%, 292px);
  }

  .welcome-feature {
    display: grid;
    grid-template-columns: 48px 1fr;
    gap: 14px;
    align-items: center;
  }

  .welcome-feature span {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: var(--primary-color);
    background: rgba(255, 116, 36, 0.1);
    font-size: 1.35rem;
  }

  .welcome-feature:nth-child(2) span,
  .welcome-feature:nth-child(3) span {
    color: #7c4dff;
    background: rgba(124, 77, 255, 0.11);
  }

  .welcome-feature strong {
    display: block;
    margin-bottom: 3px;
    color: var(--text-color);
    font-size: 0.98rem;
  }

  .welcome-feature p {
    margin: 0;
    color: var(--text-color-secondary);
    font-size: 0.91rem;
    line-height: 1.38;
  }

  .welcome-form {
    display: grid;
    gap: 10px;
    margin-top: 28px;
  }

  .welcome-form label {
    color: var(--text-color);
    font-size: 0.84rem;
    font-weight: 800;
  }

  .welcome-form select,
  .welcome-form input {
    width: 100%;
    min-height: 48px;
    padding: 0 14px;
    border: 1px solid var(--border-color);
    border-radius: 14px;
    background: var(--card-bg);
    color: var(--text-color);
    font: inherit;
    font-weight: 700;
  }

  .welcome-auth-card {
    margin-top: 28px;
    padding: 18px;
    border: 1px solid var(--border-color);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.5);
  }

  :global([data-theme="dark"]) .welcome-auth-card {
    background: rgba(255, 255, 255, 0.06);
  }

  .welcome-verified {
    display: grid;
    justify-items: center;
    gap: 8px;
    text-align: center;
  }

  .welcome-verified i {
    color: var(--primary-color);
    font-size: 2rem;
  }

  .welcome-verified p {
    margin: 0;
    color: var(--text-color-secondary);
  }

  .welcome-actions {
    display: grid;
    gap: 12px;
    margin-top: 26px;
  }

  .welcome-actions--split {
    grid-template-columns: 0.8fr 1.2fr;
  }

  .welcome-primary,
  .welcome-secondary {
    min-height: 50px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border-radius: 11px;
    font: inherit;
    font-weight: 900;
    cursor: pointer;
  }

  .welcome-primary {
    border: none;
    color: white;
    background: linear-gradient(135deg, #ff7a2e, var(--primary-color));
    box-shadow: 0 14px 26px rgba(212, 68, 7, 0.22);
  }

  .welcome-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  .welcome-secondary {
    border: 1px solid rgba(124, 77, 255, 0.62);
    color: #7148e8;
    background: transparent;
  }

  .welcome-progress {
    display: flex;
    justify-content: center;
    gap: 18px;
    margin-top: 28px;
  }

  .welcome-progress span {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: rgba(107, 114, 128, 0.6);
  }

  .welcome-progress span.active {
    background: var(--primary-color);
  }

  @media (max-width: 480px) {
    .welcome-overlay {
      padding: 10px;
    }

    .welcome-card {
      min-height: calc(100dvh - 20px);
      padding: 28px 24px 24px;
      border-radius: 30px;
    }

    .welcome-art {
      height: 205px;
    }

    .welcome-content h2 {
      font-size: 2rem;
    }

    .welcome-actions--split {
      grid-template-columns: 1fr;
    }
  }
</style>
