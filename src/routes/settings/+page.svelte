<script lang="ts">
	import { settingsStore, CAMPUSES, DEPARTMENTS, campusDepartments, isSetupComplete, type AppLanguage, type WeekStart } from '$lib/stores/settingsStore';
	import { accessibility } from '$lib/stores/accessibility';
	import { calendarStore, activeClasses, EVENT_COLORS } from '$lib/stores/calendarStore';
	import { classColors } from '$lib/stores/classColors';
	import { t } from '$lib/i18n';
	import { version } from '$app/environment';

	// When campus changes, clear department selection
	function handleCampusChange(campusId: string) {
		settingsStore.patch({ campusId, departmentId: null });
	}

	function handleDepartmentChange(deptId: string) {
		settingsStore.patch({ departmentId: deptId });
	}

	function handleLanguageChange(lang: string) {
		settingsStore.patch({ language: lang as AppLanguage });
	}

	function handleWeekStartChange(start: number) {
		settingsStore.patch({ weekStartsOn: start as WeekStart });
	}

	const languageOptions = [
		{ value: 'en', native: 'English', flag: '🇬🇧' },
		{ value: 'de', native: 'Deutsch', flag: '🇩🇪' },
	];

	let showResetConfirm = false;

	function handleReset() {
		settingsStore.reset();
		showResetConfirm = false;
	}

	// ── Update / Reload ───────────────────────────────────────────
	const APP_VERSION = version;
	let updateStatus: 'idle' | 'checking' | 'updating' = 'idle';

	async function handleUpdate() {
		updateStatus = 'updating';

		try {
			// 1. Refresh calendar data explicitly
			await calendarStore.refreshAll(true);

			// 2. Clear browser caches to fetch fresh webapp assets on next load
			// This leaves localStorage intact (where settings & calendar cachedEvents live)
			if ('caches' in window) {
				const cacheNames = await caches.keys();
				await Promise.all(cacheNames.map((name) => caches.delete(name)));
			}
		} catch (e) {
			console.error('Update error:', e);
		}

		// 3. Tell the waiting service worker to take over, then reload
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.getRegistration().then((reg) => {
				if (reg?.waiting) {
					reg.waiting.postMessage({ type: 'SKIP_WAITING' });
					navigator.serviceWorker.addEventListener('controllerchange', () => {
						window.location.reload();
					});
				} else {
					if (reg) {
						reg.update().finally(() => {
							window.location.reload();
						});
					} else {
						window.location.reload();
					}
				}
			});
		} else {
			window.location.reload();
		}
	}
</script>

<svelte:head>
	<title>{$t.settings.pageTitle}</title>
</svelte:head>

<div class="settings-page">
	<header class="page-header">
		<div class="header-icon">⚙️</div>
		<h1>{$t.settings.title}</h1>
		<p class="subtitle">{$t.settings.subtitle}</p>
	</header>

	<!-- ── Campus & Programme ────────────────── -->
	<section class="settings-section">
		<div class="section-header">
			<span class="section-icon">🏛️</span>
			<div>
				<h2>{$t.settings.campusTitle}</h2>
				<p class="section-desc">{$t.settings.campusDesc}</p>
			</div>
		</div>

		<div class="setting-row">
			<label class="setting-label" for="campus-select">{$t.settings.campusLabel}</label>
			<select
				id="campus-select"
				class="setting-select"
				value={$settingsStore.campusId ?? ''}
				on:change={(e) => handleCampusChange(e.currentTarget.value)}
			>
				<option value="" disabled>{$t.settings.campusPlaceholder}</option>
				{#each CAMPUSES as campus}
					<option value={campus.id}>{campus.city} — {campus.name}</option>
				{/each}
			</select>
		</div>

		{#if $settingsStore.campusId}
			<div class="setting-row">
				<label class="setting-label" for="dept-select">{$t.settings.deptLabel}</label>
				<select
					id="dept-select"
					class="setting-select"
					value={$settingsStore.departmentId ?? ''}
					on:change={(e) => handleDepartmentChange(e.currentTarget.value)}
				>
					<option value="" disabled>{$t.settings.deptPlaceholder}</option>
					{#each $campusDepartments as dept}
						<option value={dept.id}>{dept.shortName} — {dept.name}</option>
					{/each}
				</select>
			</div>
		{/if}

		{#if $isSetupComplete}
			<div class="setting-info-row">
				<span class="info-badge">{$t.settings.campusReady}</span>
				<span class="info-note">{$t.settings.campusReadyNote}</span>
			</div>
		{/if}
	</section>

	<!-- ── Language ──────────────────────────── -->
	<section class="settings-section">
		<div class="section-header">
			<span class="section-icon">🌐</span>
			<div>
				<h2>{$t.settings.languageTitle}</h2>
				<p class="section-desc">{$t.settings.languageDesc}</p>
			</div>
		</div>

		<div class="segmented-control" role="group" aria-label="Language selection">
			{#each languageOptions as lang}
				<button
					class="segment"
					class:active={$settingsStore.language === lang.value}
					on:click={() => handleLanguageChange(lang.value)}
					aria-pressed={$settingsStore.language === lang.value}
				>
					<span class="segment-flag">{lang.flag}</span>
					<span class="segment-label">{lang.native}</span>
				</button>
			{/each}
		</div>
	</section>

	<!-- ── Appearance ────────────────────────── -->
	<section class="settings-section">
		<div class="section-header">
			<span class="section-icon">🎨</span>
			<div>
				<h2>{$t.settings.appearanceTitle}</h2>
				<p class="section-desc">{$t.settings.appearanceDesc}</p>
			</div>
		</div>

		<div class="theme-picker" role="group" aria-label={$t.settings.appearanceTitle}>
			<button
				class="theme-card"
				class:active={$settingsStore.theme === 'auto'}
				on:click={() => settingsStore.patch({ theme: 'auto' })}
				aria-pressed={$settingsStore.theme === 'auto'}
			>
				<span class="theme-icon">🔄</span>
				<span class="theme-label">{$t.settings.themeAuto}</span>
			</button>
			<button
				class="theme-card"
				class:active={$settingsStore.theme === 'light'}
				on:click={() => settingsStore.patch({ theme: 'light' })}
				aria-pressed={$settingsStore.theme === 'light'}
			>
				<span class="theme-icon">☀️</span>
				<span class="theme-label">{$t.settings.themeLight}</span>
			</button>
			<button
				class="theme-card"
				class:active={$settingsStore.theme === 'dark'}
				on:click={() => settingsStore.patch({ theme: 'dark' })}
				aria-pressed={$settingsStore.theme === 'dark'}
			>
				<span class="theme-icon">🌙</span>
				<span class="theme-label">{$t.settings.themeDark}</span>
			</button>
		</div>
	</section>

	<!-- ── Calendar Preferences ──────────────── -->
	<section class="settings-section">
		<div class="section-header">
			<span class="section-icon">📅</span>
			<div>
				<h2>{$t.settings.calendarTitle}</h2>
				<p class="section-desc">{$t.settings.calendarDesc}</p>
			</div>
		</div>

		<div class="setting-row">
			<label class="setting-label" for="week-start">{$t.settings.weekStartsOn}</label>
			<select
				id="week-start"
				class="setting-select setting-select--inline"
				value={$settingsStore.weekStartsOn}
				on:change={(e) => handleWeekStartChange(Number(e.currentTarget.value))}
			>
				<option value={1}>{$t.settings.monday}</option>
				<option value={0}>{$t.settings.sunday}</option>
				<option value={6}>{$t.settings.saturday}</option>
			</select>
		</div>


	</section>

	<!-- ── Accessibility ─────────────────────── -->
	<section class="settings-section a11y-section">
		<details>
			<summary class="section-header section-header--collapsible">
				<span class="section-icon">♿</span>
				<div>
					<h2>{$t.settings.a11yTitle}</h2>
					<p class="section-desc">{$t.settings.a11yDesc}</p>
				</div>
				<span class="chevron" aria-hidden="true">›</span>
			</summary>

			<div class="a11y-body">
				<div class="setting-row toggle-row">
					<div class="toggle-info">
						<span class="setting-label">🎭 {$t.settings.reduceMotion}</span>
						<span class="toggle-desc">{$t.settings.reduceMotionDesc}</span>
					</div>
					<button class="toggle" class:on={$accessibility.reduceMotion} role="switch" aria-checked={$accessibility.reduceMotion} aria-label={$t.settings.reduceMotion} on:click={() => accessibility.toggle('reduceMotion')}><span class="toggle-knob" /></button>
				</div>
				<div class="setting-row toggle-row">
					<div class="toggle-info">
						<span class="setting-label">⬛ {$t.settings.highContrast}</span>
						<span class="toggle-desc">{$t.settings.highContrastDesc}</span>
					</div>
					<button class="toggle" class:on={$accessibility.highContrast} role="switch" aria-checked={$accessibility.highContrast} aria-label={$t.settings.highContrast} on:click={() => accessibility.toggle('highContrast')}><span class="toggle-knob" /></button>
				</div>
				<div class="setting-row toggle-row">
					<div class="toggle-info">
						<span class="setting-label">🔡 {$t.settings.largeText}</span>
						<span class="toggle-desc">{$t.settings.largeTextDesc}</span>
					</div>
					<button class="toggle" class:on={$accessibility.largeText} role="switch" aria-checked={$accessibility.largeText} aria-label={$t.settings.largeText} on:click={() => accessibility.toggle('largeText')}><span class="toggle-knob" /></button>
				</div>
				<div class="setting-row toggle-row">
					<div class="toggle-info">
						<span class="setting-label">🎯 {$t.settings.focusVisible}</span>
						<span class="toggle-desc">{$t.settings.focusVisibleDesc}</span>
					</div>
					<button class="toggle" class:on={$accessibility.focusVisible} role="switch" aria-checked={$accessibility.focusVisible} aria-label={$t.settings.focusVisible} on:click={() => accessibility.toggle('focusVisible')}><span class="toggle-knob" /></button>
				</div>
				<div class="setting-row toggle-row">
					<div class="toggle-info">
						<span class="setting-label">🔊 {$t.settings.screenReader}</span>
						<span class="toggle-desc">{$t.settings.screenReaderDesc}</span>
					</div>
					<button class="toggle" class:on={$accessibility.screenReaderHints} role="switch" aria-checked={$accessibility.screenReaderHints} aria-label={$t.settings.screenReader} on:click={() => accessibility.toggle('screenReaderHints')}><span class="toggle-knob" /></button>
				</div>
				<div class="setting-row toggle-row">
					<div class="toggle-info">
						<span class="setting-label">🎨 {$t.settings.assistiveTextures}</span>
						<span class="toggle-desc">{$t.settings.assistiveTexturesDesc}</span>
					</div>
					<button class="toggle" class:on={$accessibility.assistivePatterns} role="switch" aria-checked={$accessibility.assistivePatterns} aria-label={$t.settings.assistiveTextures} on:click={() => accessibility.toggle('assistivePatterns')}><span class="toggle-knob" /></button>
				</div>
			</div>
		</details>
	</section>

	<!-- ── Class Color Management ──────────────── -->
	<section class="settings-section">
		<div class="section-header">
			<span class="section-icon">🖍️</span>
			<div>
				<h2>Class Colors</h2>
				<p class="section-desc">Customize the color of specific classes or events.</p>
			</div>
		</div>

		{#if $activeClasses.length === 0}
			<p class="section-desc" style="opacity: 0.7;">No active classes found in your calendar subscriptions.</p>
		{:else}
			<div class="class-colors-list">
				{#each $activeClasses as cls}
					<div class="setting-row">
						<div class="class-color-info">
							<span class="setting-label">{cls.title}</span>
							{#if cls.id !== cls.title}
								<span class="class-title-hint">{cls.id}</span>
							{/if}
						</div>
						<div class="class-color-actions">
							<div class="color-palette">
								{#each EVENT_COLORS as ec}
									<button
										class="palette-swatch"
										class:selected={($classColors[cls.id] || cls.defaultColor) === ec.id}
										style="background-color: {ec.id}"
										on:click={() => classColors.updateColor(cls.id, ec.id)}
										aria-label="Select color"
									></button>
								{/each}
							</div>
							{#if $classColors[cls.id]}
								<button class="btn-clear-color" on:click={() => classColors.resetColor(cls.id)} aria-label="Reset color">🔄</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- ── Reset ─────────────────────────────── -->
	<section class="settings-section danger-section">
		<div class="section-header">
			<span class="section-icon">🗑️</span>
			<div>
				<h2>{$t.settings.resetTitle}</h2>
				<p class="section-desc">{$t.settings.resetDesc}</p>
			</div>
		</div>

		{#if showResetConfirm}
			<div class="confirm-box">
				<p>{$t.settings.resetConfirm}</p>
				<div class="confirm-buttons">
					<button class="btn-danger" on:click={handleReset}>{$t.settings.resetYes}</button>
					<button class="btn-cancel" on:click={() => showResetConfirm = false}>{$t.settings.resetCancel}</button>
				</div>
			</div>
		{:else}
			<button class="btn-reset" on:click={() => showResetConfirm = true}>{$t.settings.resetButton}</button>
		{/if}
	</section>

	<div class="update-card">
		<div class="update-info">
			<span class="update-version">v{APP_VERSION}</span>
			<span class="update-desc">{$t.settings.builtWith}</span>
		</div>
		<button
			class="btn-update"
			class:updating={updateStatus === 'updating'}
			on:click={handleUpdate}
			disabled={updateStatus === 'updating'}
		>
			{#if updateStatus === 'updating'}
				<span class="update-spinner"></span> Updating…
			{:else}
				🔄 Update App
			{/if}
		</button>
	</div>
</div>

<style>
	.settings-page {
		max-width: 680px;
		margin: 0 auto;
		padding: var(--spacing-lg) var(--spacing-md);
		padding-bottom: 120px;
	}

	/* ── Header ── */
	.page-header {
		text-align: center;
		padding: var(--spacing-lg) 0 var(--spacing-xl);
	}
	.header-icon { font-size: 2.5rem; margin-bottom: var(--spacing-sm); }
	h1 { font-size: 2rem; font-weight: 800; color: var(--text-color); margin: 0 0 var(--spacing-xs); }
	.subtitle { color: var(--text-color-secondary); font-size: 1rem; }

	/* ── Sections ── */
	.settings-section {
		background: var(--card-bg);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-xl);
		padding: var(--spacing-lg);
		margin-bottom: var(--spacing-lg);
		backdrop-filter: var(--glass-blur);
		-webkit-backdrop-filter: var(--glass-blur);
		box-shadow: var(--shadow-sm);
	}

	.section-header {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-lg);
	}
	.section-icon { font-size: 1.6rem; line-height: 1; flex-shrink: 0; margin-top: 2px; }
	h2 { font-size: 1.1rem; font-weight: 700; color: var(--text-color); margin: 0 0 2px; }
	.section-desc { font-size: 0.82rem; color: var(--text-color-secondary); margin: 0; line-height: 1.4; }

	/* ── Setting rows ── */
	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-md);
		padding: var(--spacing-sm) 0;
		border-top: 1px solid var(--border-color);
	}
	.setting-label {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text-color);
		flex-shrink: 0;
	}
	.setting-select {
		background: var(--bg-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-color);
		font-size: 0.9rem;
		padding: 8px 12px;
		width: 100%;
		max-width: 320px;
		cursor: pointer;
		-webkit-appearance: none;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 12px center;
		padding-right: 32px;
	}
	.setting-select--inline { max-width: 160px; }

	/* ── Info row ── */
	.setting-info-row {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: var(--spacing-sm) var(--spacing-md);
		background: rgba(16, 185, 129, 0.08);
		border: 1px solid rgba(16, 185, 129, 0.2);
		border-radius: var(--radius-md);
		margin-top: var(--spacing-sm);
	}
	.info-badge { font-size: 0.88rem; font-weight: 600; color: #10b981; }
	.info-note { font-size: 0.78rem; color: var(--text-color-secondary); }

	/* ── Segmented control ── */
	.segmented-control {
		display: flex;
		background: var(--bg-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 4px;
		gap: 4px;
	}
	.segment {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 10px 8px;
		border: none;
		border-radius: calc(var(--radius-lg) - 4px);
		background: transparent;
		color: var(--text-color-secondary);
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}
	.segment.active {
		background: var(--primary-color);
		color: white;
		font-weight: 700;
		box-shadow: var(--shadow-sm);
	}
	.segment-flag { font-size: 1.2rem; }

	/* ── Theme picker ── */
	.theme-picker {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--spacing-sm);
	}
	.theme-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: var(--spacing-md) var(--spacing-sm);
		background: var(--bg-color);
		border: 2px solid var(--border-color);
		border-radius: var(--radius-lg);
		cursor: pointer;
		transition: all 0.2s;
		color: var(--text-color);
		font-size: 0.85rem;
		font-weight: 500;
	}
	.theme-icon { font-size: 1.6rem; }
	.theme-card:hover { border-color: var(--primary-color); }
	.theme-card.active {
		border-color: var(--primary-color);
		background: rgba(212, 68, 7, 0.06);
		color: var(--primary-color);
		font-weight: 700;
	}

	/* ── Toggle switch ── */
	.toggle-row { align-items: center; }
	.toggle-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
	.toggle-desc { font-size: 0.78rem; color: var(--text-color-secondary); line-height: 1.4; }

	.toggle {
		width: 56px;
		height: 30px;
		border-radius: 15px;
		background: var(--border-color);
		border: none;
		padding: 3px;
		cursor: pointer;
		transition: all 0.25s;
		flex-shrink: 0;
		position: relative;
		overflow: hidden;
	}
	
	/* Accessibility Textures for Toggle - Only visible when enabled */
	:global(.a11y-assistive-patterns) .toggle::before {
		content: '✕';
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.7rem;
		font-weight: 800;
		color: var(--text-color-secondary);
		opacity: 0.5;
		transition: opacity 0.2s;
	}

	.toggle.on { 
		background: var(--primary-color);
	}

	:global(.a11y-assistive-patterns) .toggle.on {
		background-image: radial-gradient(rgba(255, 255, 255, 0.2) 15%, transparent 15%);
		background-size: 6px 6px;
	}

	:global(.a11y-assistive-patterns) .toggle.on::before {
		content: '✓';
		left: 10px;
		right: auto;
		color: white;
		opacity: 0.9;
	}

	.toggle-knob {
		display: block;
		width: 24px;
		height: 24px;
		background: white;
		border-radius: 50%;
		box-shadow: 0 2px 5px rgba(0,0,0,0.25);
		transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
		transform: translateX(0);
		z-index: 2;
		position: relative;
	}

	.toggle.on .toggle-knob { transform: translateX(26px); }

	/* ── Danger section ── */
	.danger-section { border-color: rgba(239, 68, 68, 0.2); }
	.btn-reset {
		width: 100%;
		padding: var(--spacing-md);
		border: 1.5px dashed rgba(239, 68, 68, 0.5);
		border-radius: var(--radius-md);
		background: transparent;
		color: #ef4444;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn-reset:hover { background: rgba(239, 68, 68, 0.06); }

	.confirm-box {
		padding: var(--spacing-md);
		background: rgba(239, 68, 68, 0.06);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: var(--radius-md);
	}
	.confirm-box p { margin: 0 0 var(--spacing-md); color: var(--text-color); font-size: 0.9rem; }
	.confirm-buttons { display: flex; gap: var(--spacing-sm); }
	.btn-danger {
		padding: 10px 20px;
		background: #ef4444;
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.2s;
	}
	.btn-danger:hover { background: #dc2626; }
	.btn-cancel {
		padding: 10px 20px;
		background: var(--bg-color);
		color: var(--text-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		cursor: pointer;
	}

	/* ── Update Card ── */
	.update-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-md);
		margin-top: var(--spacing-xl);
		padding: var(--spacing-md) var(--spacing-lg);
		background: var(--card-bg);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-xl);
	}

	.update-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.update-version {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--text-color);
		letter-spacing: 0.02em;
	}

	.update-desc {
		font-size: 0.78rem;
		color: var(--text-color-secondary);
		opacity: 0.7;
	}

	.btn-update {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--primary-color);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s ease, transform 0.1s ease;
		white-space: nowrap;
	}

	.btn-update:hover:not(:disabled) {
		opacity: 0.85;
		transform: translateY(-1px);
	}

	.btn-update:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.update-spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255,255,255,0.4);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@media (max-width: 480px) {
		.setting-row { flex-direction: column; align-items: stretch; }
		.setting-select { max-width: 100%; }
		.toggle-row { flex-direction: row; align-items: center; }
		.class-color-actions { align-self: flex-start; }
	}

	/* ── Class Colors ── */
	.class-colors-list {
		display: flex;
		flex-direction: column;
		gap: 0;
	}
	.class-color-info {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}
	.class-title-hint {
		font-size: 0.75rem;
		color: var(--text-color-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 250px;
	}
	.class-color-actions {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		flex-wrap: wrap;
	}
	.color-palette {
		display: flex;
		gap: 4px;
		background: var(--bg-color);
		padding: 4px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-color);
	}
	.palette-swatch {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
		padding: 0;
		transition: transform 0.1s, border-color 0.2s;
	}
	.palette-swatch:hover {
		transform: scale(1.1);
	}
	.palette-swatch.selected {
		border-color: var(--text-color);
		box-shadow: 0 0 0 1px var(--bg-color) inset;
	}
	.btn-clear-color {
		background: var(--bg-color);
		border: 1px solid var(--border-color);
		color: var(--text-color-secondary);
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn-clear-color:hover {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		border-color: rgba(239, 68, 68, 0.3);
	}

	/* ── Collapsible a11y section ── */
	.a11y-section details { width: 100%; }
	.a11y-section details summary { list-style: none; cursor: pointer; }
	.a11y-section details summary::-webkit-details-marker { display: none; }

	.section-header--collapsible {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing-md);
		margin-bottom: 0;
		user-select: none;
	}

	.section-header--collapsible .chevron {
		margin-left: auto;
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--text-color-secondary);
		transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		transform: rotate(0deg);
		flex-shrink: 0;
		align-self: center;
	}

	details[open] .section-header--collapsible .chevron {
		transform: rotate(90deg);
	}

	details[open] .section-header--collapsible {
		margin-bottom: var(--spacing-lg);
	}

	.a11y-body {
		animation: slideDown 0.25s ease;
	}

	@keyframes slideDown {
		from { opacity: 0; transform: translateY(-8px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
