<script lang="ts">
	import LinkCard from "$lib/components/LinkCard.svelte";
	import { allLinks, categoryOrder } from "$lib/data/links";
	import { favorites } from "$lib/stores/favorites";
	import { browser } from "$app/environment";
	import { onMount } from "svelte";
	import { t } from "$lib/i18n";
	import { settingsStore, activeCampus } from "$lib/stores/settingsStore";
	import { campusContacts, generalContacts, programDirectors } from "$lib/data/contacts";

	let searchQuery = "";

	function handleToggleFavorite(event: CustomEvent<{ linkId: string }>) {
		favorites.toggle(event.detail.linkId);
	}

	function getCategoryName(cat: string, dict: any) {
		return dict?.[cat] || cat;
	}

	function handleExternalSearch(sourceId: string) {
		const source = searchSources.find((s) => s.id === sourceId)!;
		const query = searchQuery.trim();

		if (source.searchable && query) {
			if (source.id === "srh") {
				window.location.href = `/viewer?url=${encodeURIComponent(`https://www.srh-university.de/en/search/?q=${encodeURIComponent(query)}`)}&title=${encodeURIComponent(source.name + " Search")}`;
			} else if (source.id === "ecampus") {
				window.open(`https://ecampus.srh-university.de/search/index.php?q=${encodeURIComponent(query)}`, "_blank");
			} else if (source.id === "equipment") {
				window.location.href = `/viewer?url=${encodeURIComponent(`https://srhberlin.booqableshop.com/search?q=${encodeURIComponent(query)}`)}&title=${encodeURIComponent(source.name + " Search")}`;
			}
		} else if (source.staticUrl || (source.id === 'library' && libraryUrl)) {
			const finalUrl = source.id === 'library' ? libraryUrl : source.staticUrl;
			if (source.id === "library") {
				window.open(finalUrl, "_blank");
			} else {
				window.location.href = `/viewer?url=${encodeURIComponent(finalUrl)}&title=${encodeURIComponent(source.name)}`;
			}
		}
	}

	$: libraryUrl = $activeCampus?.libraryUrl || "https://webopac.srh-hochschulen.de/vopac/index.asp?DB=BIBB";

	let filteredLinks: typeof allLinks = [];
	$: filteredLinks = allLinks.filter((link) => {
		if (!searchQuery.trim()) return true;
		const query = searchQuery.toLowerCase();
		const title = $t.linkTitle?.[link.id as keyof typeof $t.linkTitle] || link.title;
		const desc = $t.linkDesc?.[link.id as keyof typeof $t.linkDesc] || link.description || "";
		const cat = link.category_name ? ($t.linkCategory?.[link.category_name as keyof typeof $t.linkCategory] || link.category_name) : "";
		return (
			title.toLowerCase().includes(query) ||
			desc.toLowerCase().includes(query) ||
			cat.toLowerCase().includes(query)
		);
	});
	/** Derives a functional role from a university email address */
	function deriveRoleFromEmail(email: string): string {
		if (!email) return '';
		const [localPart, domain] = email.toLowerCase().split('@');
		if (!localPart) return '';
		
		const roleMap: Record<string, string> = {
			'finanzen': 'Fee Management',
			'feemanagement': 'Fee Management',
			'invoice': 'Invoicing',
			'pruefungsbuero': 'Examination Office',
			'examination': 'Examination Office',
			'itdesk': 'IT Support',
			'it-support': 'IT Support',
			'student-service': 'Student Service',
			'internationaloffice': 'International Office',
			'outgoingexchange': 'International Office',
			'residencepermit': 'Visa & Residence',
			'scholarship': 'Scholarships',
			'careerservice': 'Career Service',
			'languages': 'Language Centre',
			'apply': 'Admissions',
			'library': 'Library',
			'rektorat': 'Rektorat',
			'course-coordination': 'Course Coordination'
		};

		let baseRole = '';
		for (const [key, value] of Object.entries(roleMap)) {
			if (localPart.includes(key)) {
				baseRole = value;
				break;
			}
		}

		if (!baseRole) {
			if (localPart.includes('.')) return ''; // Likely a personal name
			return localPart.charAt(0).toUpperCase() + localPart.slice(1).replace(/[-.]/g, ' ');
		}

		// Add regional context if available in the email suffix
		if (localPart.endsWith('.hsbe')) return `${baseRole} (East)`;
		if (localPart.endsWith('.hsge')) return `${baseRole} (North)`;
		if (localPart.endsWith('.hshd')) return `${baseRole} (South)`;
		if (localPart.endsWith('.hsnrw')) return `${baseRole} (NRW)`;
		if (localPart.endsWith('.hsg')) return `${baseRole} (General)`;

		return baseRole;
	}

	/** Identifies the city/location from a German area code */
	function deriveLocationFromPhone(phone: string): string {
		if (!phone) return '';
		const normalized = phone.replace(/[\s-()]/g, '');
		
		const areaCodes: Record<string, string> = {
			'4930': 'Berlin',
			'49351': 'Dresden',
			'49341': 'Leipzig',
			'4940': 'Hamburg',
			'49421': 'Bremen',
			'496221': 'Heidelberg',
			'49711': 'Stuttgart',
			'49221': 'Cologne',
			'492381': 'Hamm',
			'49365': 'Gera',
			'49228': 'Bonn',
			'49911': 'Fürth',
			'49481': 'Heide',
			'49951': 'Bamberg'
		};

		for (const [code, city] of Object.entries(areaCodes)) {
			if (normalized.startsWith(code) || normalized.startsWith('0' + code.slice(2))) {
				return city;
			}
		}
		return '';
	}
	// ── Directory Search ─────────────────────────────────────────
	let filteredContacts: any[] = [];
	$: {
		if (!searchQuery.trim()) {
			filteredContacts = [];
		} else {
			const query = searchQuery.toLowerCase();
			const campusResults = campusContacts.filter(c => 
				c.service.toLowerCase().includes(query) || 
				c.person.toLowerCase().includes(query) ||
				c.email.toLowerCase().includes(query) ||
				c.campusId.toLowerCase().includes(query) ||
				deriveRoleFromEmail(c.email).toLowerCase().includes(query) ||
				c.tags?.some(tag => tag.toLowerCase().includes(query))
			);
			const generalResults = generalContacts.filter(c => 
				c.service.toLowerCase().includes(query) || 
				c.person.toLowerCase().includes(query) ||
				c.email.toLowerCase().includes(query) ||
				c.campusId.toLowerCase().includes(query) ||
				deriveRoleFromEmail(c.email).toLowerCase().includes(query) ||
				c.tags?.some(tag => tag.toLowerCase().includes(query))
			);
			const programResults = programDirectors.filter(p => 
				p.program.toLowerCase().includes(query) || 
				p.person.toLowerCase().includes(query) ||
				p.email.toLowerCase().includes(query) ||
				p.campusId.toLowerCase().includes(query) ||
				p.school.toLowerCase().includes(query) ||
				p.cluster.toLowerCase().includes(query) ||
				p.degree.toLowerCase().includes(query) ||
				deriveRoleFromEmail(p.email).toLowerCase().includes(query) ||
				(p.phone && deriveLocationFromPhone(p.phone).toLowerCase().includes(query)) ||
				p.tags?.some(tag => tag.toLowerCase().includes(query))
			);
			
			const allRawResults = [
				...campusResults.map(c => ({ ...c, type: 'campus' })),
				...generalResults.map(c => ({ ...c, type: 'general' })),
				...programResults.map(p => ({ ...p, type: 'program' }))
			];

			// Deduplicate by email and aggregate served campuses/tags
			const mergedMap = new Map();
			allRawResults.forEach(c => {
				const role = deriveRoleFromEmail(c.email);
				if (mergedMap.has(c.email)) {
					const existing = mergedMap.get(c.email);
					// Add campus if not already present
					if (c.campusId && !existing.servedCampuses.includes(c.campusId)) {
						existing.servedCampuses.push(c.campusId);
					}
					// Add unique tags
					if (c.tags) {
						c.tags.forEach(t => {
							if (!existing.tags.includes(t)) existing.tags.push(t);
						});
					}
					if (role && !existing.tags.includes(role)) {
						existing.tags.push(role);
					}
				} else {
					mergedMap.set(c.email, {
						...c,
						servedCampuses: c.campusId ? [c.campusId] : [],
						tags: [...(c.tags || []), role].filter(Boolean)
					});
				}
			});
			filteredContacts = Array.from(mergedMap.values()).map(c => {
				// Sort served campuses for cleaner display
				c.servedCampuses.sort();
				// Ensure tags are unique
				c.tags = [...new Set(c.tags)];
				return c;
			});
		}
	}

	let activeCategories: string[] = [];
	$: activeCategories = categoryOrder.filter((cat) =>
		filteredLinks.some((link) => link.category_name === cat)
	);

	const searchSources = [
		{ id: "srh", name: "University Website", icon: "🎓", searchable: true },
		{ id: "ecampus", name: "E-Campus", icon: "💻", searchable: true },
		{ id: "equipment", name: "Equipment Rental", icon: "📷", searchable: true },
		{ id: "library", name: "Library", icon: "📚", searchable: false },
		{ id: "team", name: "Staff", icon: "👥", searchable: false, staticUrl: "https://www.srh-university.de/en/srh-university/faculty-and-team/" },
	];

	function highlightMatch(text: string, query: string): string {
		if (!query.trim()) return text;
		const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const regex = new RegExp(`(${escapedQuery})`, 'gi');
		return text.replace(regex, '<mark>$1</mark>');
	}

	/**
	 * Svelte Action: Stitches the element to the virtual keyboard on mobile (iOS Safari)
	 */
	function keyboardStitch(node: HTMLElement) {
		if (!browser || !window.visualViewport) return;

		const update = () => {
			const viewport = window.visualViewport!;
			// Calculate the gap between bottom of layout viewport and bottom of visual viewport
			const offset = window.innerHeight - viewport.height;
			
			// We only care about positive offsets (keyboard being open)
			// Apply via transform for sub-pixel smoothness and performance
			if (offset > 0) {
				node.style.transform = `translateY(-${offset}px)`;
			} else {
				node.style.transform = 'translateY(0)';
			}
		};

		window.visualViewport.addEventListener('resize', update);
		window.visualViewport.addEventListener('scroll', update);
		
		// Initial check
		update();

		return {
			destroy() {
				window.visualViewport?.removeEventListener('resize', update);
				window.visualViewport?.removeEventListener('scroll', update);
			}
		};
	}
</script>

<svelte:head>
	<title>{$t.explore.pageTitle}</title>
</svelte:head>

<div class="explore-page" class:is-searching={searchQuery.trim().length > 0}>
	<header class="page-header">
		<h1>{$t.explore.title}</h1>
		<p class="subtitle">{$t.explore.subtitle}</p>
	</header>

	<div class="explore-content">
		{#if searchQuery.trim() && filteredContacts.length > 0}
			{#if $settingsStore.emailVerified}
				<section class="category-section contact-results">
					<h2 class="category-title">👥 {$t.feed.directoryTitle || 'University Directory'}</h2>
					<div class="contact-results-list">
						{#each filteredContacts as contact}
							<div class="search-contact-card glass">
								<div class="search-contact-info">
									<div class="search-contact-meta">
										{#if contact.type === 'program'}
											{@html highlightMatch(`${contact.degree} ${contact.program}`, searchQuery)}
										{:else}
											{@html highlightMatch(contact.service, searchQuery)}
										{/if}
									</div>
									<div class="search-contact-name">
										{@html highlightMatch(contact.person, searchQuery)}
										<div class="search-contact-tags">
												{#each contact.tags as tag}
													{#if tag.startsWith('campus:')}
														<span class="contact-tag campus-tag">{@html highlightMatch(tag.replace('campus:', ''), searchQuery)}</span>
													{:else if tag.startsWith('school:')}
														<span class="contact-tag school-tag">{@html highlightMatch(tag.replace('school:', ''), searchQuery)}</span>
													{:else}
														<span class="contact-tag">{@html highlightMatch(tag, searchQuery)}</span>
													{/if}
												{/each}
											{#if contact.phone}
												{@const phoneLoc = deriveLocationFromPhone(contact.phone)}
												{#if phoneLoc && (contact.campusId ? phoneLoc.toLowerCase() !== contact.campusId.toLowerCase() : true)}
													<span class="phone-origin-tag">via {phoneLoc}</span>
												{/if}
											{/if}
											{#if contact.servedCampuses && contact.servedCampuses.length > 1}
												<span class="served-campuses-tag">
													Serves: {contact.servedCampuses.join(', ')}
												</span>
											{/if}
										</div>
									</div>
								</div>
								<div class="search-contact-actions">
									<a href="mailto:{contact.email}" class="search-contact-btn mail" title="Email">📧</a>
									{#if contact.phone}
										<a href="tel:{contact.phone.replace(/[\s-]/g, '')}" class="search-contact-btn call" title="Call">📞</a>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</section>
			{:else}
				<div class="verification-hint glass">
					<span class="hint-icon">🔒</span>
					<div class="hint-text">
						<h3>{$t.explore.verifyTitle || 'Directory Access Restricted'}</h3>
						<p>{$t.explore.verifyMessage || 'Please verify your university email in Settings to view contact details.'}</p>
					</div>
				</div>
			{/if}
		{/if}
		{#each activeCategories as category}
			<section class="category-section">
				<h2 class="category-title">{getCategoryName(category, $t.linkCategory)}</h2>
				<div class="links-grid">
					{#each filteredLinks.filter((link) => link.category_name === category) as link (link.id)}
						<LinkCard
							{link}
							isFavorite={$favorites.includes(link.id)}
							customUrl={link.id === 'library-catalogue' ? libraryUrl : undefined}
							on:toggleFavorite={handleToggleFavorite}
						/>
					{/each}
				</div>
			</section>
		{/each}

		{#if activeCategories.length === 0 && searchQuery.trim()}
			<div class="no-results">
				<p>{$t.explore.noResults} "{searchQuery}".</p>
			</div>
		{/if}

		{#if searchQuery.trim()}
			<section class="external-search-section">
				<h2 class="external-search-title">{$t.explore.externalTitle}</h2>
				<div class="external-search-list">
					{#each searchSources as source}
						<button class="external-search-row" on:click={() => handleExternalSearch(source.id)}>
							<div class="external-icon-box">{source.icon}</div>
							<div class="external-row-content">
								{#if source.searchable}
									<span class="external-name">{$t.explore.searchIn} {source.name}</span>
									<span class="external-query">"{searchQuery}"</span>
								{:else}
									<span class="external-name">{$t.explore.openCatalog} {source.name} {$t.explore.catalog}</span>
									<span class="external-query">{$t.explore.searchManually} "{searchQuery}"</span>
								{/if}
							</div>
							<span class="external-chevron">›</span>
						</button>
					{/each}
				</div>
			</section>
		{/if}
	</div>

	<!-- Thumb-Friendly Bottom Search -->
	<div class="bottom-search-wrapper" use:keyboardStitch>
		<div class="search-container glass">
			<div class="search-input-group">
				<span class="search-icon" aria-hidden="true">🔍</span>
				<input
					type="search"
					placeholder={$t.explore.searchPlaceholder}
					bind:value={searchQuery}
					class="bottom-search-input"
					aria-label={$t.explore.searchPlaceholder}
				/>
				{#if searchQuery}
					<button class="clear-btn" aria-label={$t.explore.clearSearch} on:click={() => searchQuery = ''}>✖</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.explore-page {
		padding-bottom: 180px; /* Space for the bottom nav + search bar */
		min-height: 100vh;
		position: relative;
	}

	/* When searching, add more padding so external results don't get covered */
	.explore-page.is-searching {
		padding-bottom: 260px; 
	}

	.page-header {
		text-align: center;
		padding: var(--spacing-lg) 0;
		margin-bottom: var(--spacing-lg);
	}

	h1 {
		margin-bottom: var(--spacing-sm);
	}

	.subtitle {
		color: #666;
		font-size: 1rem;
	}

	@media (prefers-color-scheme: dark) {
		.subtitle {
			color: #aaa;
		}
	}

	.category-section {
		margin-bottom: var(--spacing-xl);
		animation: fadeIn 0.3s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.category-title {
		font-size: 1.25rem;
		font-weight: 700;
		margin-bottom: var(--spacing-md);
		padding-left: var(--spacing-sm);
		border-left: 4px solid var(--primary-color);
		color: var(--text-color);
	}

	.links-grid {
		display: flex;
		flex-direction: column;
	}

	@media (min-width: 640px) {
		.links-grid {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: var(--spacing-md);
		}
	}

	@media (min-width: 1024px) {
		.links-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.no-results {
		text-align: center;
		padding: var(--spacing-xl) var(--spacing-md);
		color: var(--text-color-secondary);
		font-size: 1.1rem;
		background: var(--card-bg);
		border-radius: var(--radius-md);
		border: 1px dashed var(--border-color);
		margin-bottom: var(--spacing-xl);
	}

	/* ─── Bottom Search UI ───────────────────────────── */
	.bottom-search-wrapper {
		position: fixed;
		/* Clear the bottom nav height: 112px (approx) */
		bottom: calc(var(--touch-target-min) + var(--spacing-md) * 4);
		left: 0;
		right: 0;
		padding: 0 var(--spacing-sm) var(--spacing-sm);
		z-index: 900;
		pointer-events: none; /* Let clicks pass through empty space */
		transition: bottom 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	/* Stitch to keyboard when focused */
	.bottom-search-wrapper:focus-within {
		bottom: 0 !important;
		padding-bottom: var(--spacing-xs);
		background: linear-gradient(to top, var(--bg-color) 0%, transparent 100%);
	}

	@media (min-width: 1024px) {
		.bottom-search-wrapper {
			bottom: var(--spacing-lg);
			left: var(--sidebar-width, 220px);
			max-width: 1200px;
			margin: 0 auto;
			padding: 0 var(--spacing-xl);
		}
	}

	.search-container {
		pointer-events: auto; /* Re-enable clicks for the search box */
		padding: var(--spacing-sm);
		border-radius: var(--radius-lg);
		box-shadow: var(--glass-shadow-lg);
		max-width: 800px;
		margin: 0 auto;
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.search-input-group {
		display: flex;
		align-items: center;
		background: var(--bg-color);
		border-radius: var(--radius-md);
		border: 2px solid var(--glass-border-subtle);
		padding: 0 var(--spacing-sm);
		height: 48px;
		transition: border-color 0.2s;
	}

	.search-input-group:focus-within {
		border-color: var(--primary-color);
	}

	.search-icon {
		font-size: 1.2rem;
		opacity: 0.6;
		margin-right: var(--spacing-xs);
	}

	.bottom-search-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		font-size: 1rem;
		color: var(--text-color);
		width: 100%;
		padding: 0;
		-webkit-appearance: none;
	}

	.bottom-search-input:focus {
		outline: none;
		background: transparent;
		border-color: transparent;
	}

	.clear-btn {
		background: rgba(0,0,0,0.05);
		border-radius: 50%;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		color: var(--text-color);
		opacity: 0.6;
	}

	@media (prefers-color-scheme: dark) {
		.clear-btn { background: rgba(255,255,255,0.1); }
	}

	/* ─── Spotlight-style External Search List ─── */
	.external-search-section {
		margin-top: var(--spacing-xl);
		animation: fadeIn 0.3s ease;
	}

	.external-search-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-color-secondary);
		margin-bottom: var(--spacing-sm);
		padding-left: var(--spacing-sm);
	}

	.external-search-list {
		background: var(--card-bg);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		overflow: hidden;
	}

	.external-search-row {
		width: 100%;
		display: flex;
		align-items: center;
		padding: var(--spacing-md);
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--border-color);
		text-align: left;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.external-search-row:last-child {
		border-bottom: none;
	}

	.external-search-row:active,
	.external-search-row:hover {
		background-color: rgba(212, 68, 7, 0.05);
	}

	.external-icon-box {
		width: 40px;
		height: 40px;
		background: var(--bg-color);
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.4rem;
		margin-right: var(--spacing-md);
		border: 1px solid var(--border-color);
	}

	.external-row-content {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.external-name {
		font-weight: 600;
		color: var(--text-color);
		font-size: 1.05rem;
	}

	.external-query {
		font-size: 0.85rem;
		color: var(--text-color-secondary);
	}

	/* ─── Search Contact Results ─── */
	.contact-results-list {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--spacing-sm);
	}

	@media (min-width: 640px) {
		.contact-results-list {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.search-contact-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-md);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		background: var(--card-bg);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}

	.search-contact-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.search-contact-meta {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent-color);
		opacity: 0.8;
	}

	.search-contact-name {
		font-weight: 600;
		color: var(--text-color);
		font-size: 1.05rem;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.search-contact-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 4px;
	}

	.contact-tag {
		font-size: 0.75rem;
		font-weight: 500;
		background: rgba(212, 68, 7, 0.1);
		color: var(--accent-color);
		padding: 2px 8px;
		border-radius: 6px;
		white-space: nowrap;
	}

	.campus-tag {
		background: rgba(0, 102, 204, 0.1);
		color: #0066cc;
	}

	.school-tag {
		background: rgba(0, 153, 76, 0.1);
		color: #00994c;
	}

	@media (prefers-color-scheme: dark) {
		.campus-tag {
			background: rgba(51, 153, 255, 0.2);
			color: #66b2ff;
		}
		.school-tag {
			background: rgba(51, 204, 102, 0.2);
			color: #66ff99;
		}
	}

	.phone-origin-tag {
		font-size: 0.75rem;
		font-weight: 600;
		background: rgba(0, 0, 0, 0.05);
		color: var(--text-color-secondary);
		padding: 2px 8px;
		border-radius: 6px;
		white-space: nowrap;
	}

	.served-campuses-tag {
		font-size: 0.7rem;
		font-weight: 400;
		color: var(--text-color-secondary);
		opacity: 0.8;
		font-style: italic;
		width: 100%;
		margin-top: 2px;
	}

	@media (prefers-color-scheme: dark) {
		.phone-origin-tag {
			background: rgba(255, 255, 255, 0.1);
		}
	}

	.search-contact-actions {
		display: flex;
		gap: var(--spacing-sm);
		flex-shrink: 0;
	}

	.search-contact-btn {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-color);
		border: 1px solid var(--border-color);
		text-decoration: none;
		font-size: 1.2rem;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.search-contact-btn:hover {
		transform: scale(1.1);
		background: var(--primary-color);
		color: white;
	}
	.verification-hint {
		padding: 24px;
		margin: 20px 0;
		display: flex;
		align-items: center;
		gap: 20px;
		border-radius: var(--radius-lg);
		border: 1px solid rgba(212, 68, 7, 0.2);
		background: rgba(212, 68, 7, 0.05);
	}

	.hint-icon {
		font-size: 2.5rem;
		filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
	}

	.hint-text h3 {
		margin: 0 0 4px 0;
		font-size: 1.1rem;
		color: var(--text-color);
	}

	.hint-text p {
		margin: 0;
		font-size: 0.9rem;
		color: var(--text-color-secondary);
		line-height: 1.4;
	}

	@media (max-width: 600px) {
		.verification-hint {
			flex-direction: column;
			text-align: center;
			padding: 20px;
		}
	}
</style>
