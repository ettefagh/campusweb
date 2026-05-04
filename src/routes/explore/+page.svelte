<script lang="ts">
	import LinkCard from "$lib/components/LinkCard.svelte";
	import { allLinks, categoryOrder } from "$lib/data/links";
	import { favorites } from "$lib/stores/favorites";
	import { browser } from "$app/environment";
	import { onMount } from "svelte";
	import { t } from "$lib/i18n";
	import { settingsStore, activeCampus } from "$lib/stores/settingsStore";
	import { campusContacts, generalContacts, programDirectors } from "$lib/data/contacts";
	import SearchBar from "$lib/components/SearchBar.svelte";
	import { authStore } from "$lib/stores/authStore";

	let searchQuery = $state("");
	let isSearchActive = $state(false);

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

	let libraryUrl = $derived($activeCampus?.libraryUrl || "https://webopac.srh-hochschulen.de/vopac/index.asp?DB=BIBB");
	
	let filteredLinks = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return allLinks;
		
		return allLinks.filter((link) => {
			const title = ($t.linkTitle?.[link.id as any] || link.title).toLowerCase();
			const desc = ($t.linkDesc?.[link.id as any] || link.description || "").toLowerCase();
			const cat = (link.category_name ? ($t.linkCategory?.[link.category_name as any] || link.category_name) : "").toLowerCase();
			
			return title.includes(q) || desc.includes(q) || cat.includes(q);
		});
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
			'course-coordination': 'Course Coordination',
			'faculty': 'Faculty & Staff',
			'staff': 'Faculty & Staff',
			'team': 'Faculty & Staff'
		};

		let baseRole = '';
		for (const [key, value] of Object.entries(roleMap)) {
			if (localPart.includes(key)) {
				baseRole = value;
				break;
			}
		}

		if (!baseRole) {
			if (localPart.includes('.')) return 'Staff'; // Likely a personal name
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
	let filteredContacts = $derived.by(() => {
		if (!searchQuery.trim()) {
			return [];
		} else {
			const query = searchQuery.trim().toLowerCase();
			const campusResults = campusContacts.filter(c => 
				(c.service || "").toLowerCase().includes(query) || 
				(c.person || "").toLowerCase().includes(query) ||
				(c.email || "").toLowerCase().includes(query) ||
				(c.campusId || "").toLowerCase().includes(query) ||
				deriveRoleFromEmail(c.email || "").toLowerCase().includes(query) ||
				c.tags?.some(tag => tag.toLowerCase().includes(query))
			);
			const generalResults = generalContacts.filter(c => 
				(c.service || "").toLowerCase().includes(query) || 
				(c.person || "").toLowerCase().includes(query) ||
				(c.email || "").toLowerCase().includes(query) ||
				(c.campusId || "").toLowerCase().includes(query) ||
				deriveRoleFromEmail(c.email || "").toLowerCase().includes(query) ||
				c.tags?.some(tag => tag.toLowerCase().includes(query))
			);
			const programResults = programDirectors.filter(p => 
				(p.program || "").toLowerCase().includes(query) || 
				(p.person || "").toLowerCase().includes(query) ||
				(p.email || "").toLowerCase().includes(query) ||
				(p.campusId || "").toLowerCase().includes(query) ||
				(p.school || "").toLowerCase().includes(query) ||
				(p.cluster || "").toLowerCase().includes(query) ||
				(p.degree || "").toLowerCase().includes(query) ||
				deriveRoleFromEmail(p.email || "").toLowerCase().includes(query) ||
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
			return Array.from(mergedMap.values()).map(c => {
				// Sort served campuses for cleaner display
				c.servedCampuses.sort();
				// Ensure tags are unique
				c.tags = [...new Set(c.tags)];
				return c;
			});
		}
	});

	let activeCategories = $derived(categoryOrder.filter((cat) =>
		filteredLinks.some((link) => link.category_name === cat)
	));

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
</script>

<svelte:head>
	<title>{$t.explore.pageTitle}</title>
</svelte:head>

<div class="explore-page" class:is-searching={isSearchActive}>
	<header class="page-header">
		<h1>{$t.explore.title}</h1>
		<p class="subtitle">{$t.explore.subtitle}</p>

		<!-- Category Navigation Chips -->
		<div class="category-nav glass">
			<div class="category-nav-scroll">
				{#each categoryOrder as category}
					<button 
						class="cat-chip" 
						onclick={() => {
							const el = document.getElementById(`category-${category.replace(/\s+/g, '-')}`);
							if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
						}}
					>
						{getCategoryName(category, $t.linkCategory)}
					</button>
				{/each}
			</div>
		</div>
	</header>

	<div class="search-overlay-wrapper">
		<SearchBar bind:searchQuery bind:isSearchActive placeholder={$t.explore.searchPlaceholder}>
			{#snippet children()}
				<div class="search-results-overlay">
					<!-- Directory Matches -->
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
													</div>
												</div>
											</div>
											<div class="search-contact-actions">
												<a href="mailto:{contact.email}" class="search-contact-btn mail" title="Email">📧</a>
												<a href={getTeamsChatUrl(contact.email)} class="search-contact-btn chat" target="_blank" rel="noopener noreferrer" title="Chat on Teams">💬</a>
												{#if contact.phone}
													<a href="tel:{contact.phone.replace(/[\s-]/g, '')}" class="search-contact-btn call" title="Call">📞</a>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							</section>
						{:else}
							<div class="verification-hint guest-hint">
								<div class="hint-icon">🔒</div>
								<div class="hint-text">
									<h3>Directory Restricted</h3>
									<p>Accessing the university directory requires verification.</p>
									<div class="hint-actions">
										<button class="hint-btn secondary" onclick={() => window.location.href='/settings#accessibility'}>
											Verify Email (Simple)
										</button>
										<button class="hint-btn primary" onclick={() => authStore.reset()}>
											Sign in with Microsoft
										</button>
									</div>
								</div>
							</div>
						{/if}
					{/if}

					<!-- Link Matches -->
					{#if searchQuery.trim()}
						<div class="links-results">
							{#if activeCategories.length > 0}
								{#each activeCategories as cat}
									<section class="category-section">
										<h2 class="category-title">{getCategoryName(cat, $t.linkCategory)}</h2>
										<div class="links-grid">
											{#each filteredLinks.filter(l => l.category_name === cat) as link}
												<LinkCard {link} on:toggleFavorite={handleToggleFavorite} />
											{/each}
										</div>
									</section>
								{/each}
							{:else if filteredContacts.length === 0}
								<div class="no-results">
									<div class="no-results-icon">🔍</div>
									<p>No internal matches for "<strong>{searchQuery}</strong>"</p>
								</div>
							{/if}
						</div>
					{/if}

					<!-- External Search (Always available as fallback) -->
					<section class="category-section external-search-section">
						<h2 class="category-title">🌐 {$t.explore.externalSearchTitle || 'External Portals'}</h2>
						<div class="external-search-grid">
							{#each searchSources as source}
								<button 
									class="external-search-row" 
									onclick={() => handleExternalSearch(source.id)}
									disabled={source.searchable && !searchQuery.trim()}
								>
									<span class="external-icon">{source.icon}</span>
									<div class="external-row-content">
										<span class="external-name">{source.name}</span>
										<span class="external-query">
											{#if source.searchable}
												{searchQuery.trim() ? `Search for "${searchQuery}"` : 'Enter keywords to search'}
											{:else}
												Open official portal
											{/if}
										</span>
									</div>
									<span class="external-arrow">→</span>
								</button>
							{/each}
						</div>
					</section>

					{#if !searchQuery.trim()}
						<div class="search-welcome-state">
							<p>{$t.explore.searchHint || 'Search for services, contacts, or external resources.'}</p>
						</div>
					{/if}
				</div>
			{/snippet}
		</SearchBar>
	</div>

	<div class="explore-content" class:hidden={isSearchActive}>
		{#each categoryOrder as category}
			<section class="category-section" id="category-{category.replace(/\s+/g, '-')}">
				<h2 class="category-title">{getCategoryName(category, $t.linkCategory)}</h2>
				<div class="links-grid">
					{#each allLinks.filter((link) => link.category_name === category) as link (link.id)}
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
	</div>
</div>

<style>
	.explore-page {
		padding-bottom: 80px; /* Space for the bottom nav only */
		min-height: 100vh;
		position: relative;
	}

	/* No extra padding needed when searching as search bar is now at top */
	.explore-page.is-searching {
		padding-bottom: 80px; 
	}

	.page-header {
		text-align: center;
		padding: var(--spacing-lg) 0;
		margin: 0 auto var(--spacing-lg);
		max-width: 1200px;
	}

	.explore-content.hidden {
		display: none;
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
		scroll-margin-top: 100px;
	}

	.category-nav {
		margin-top: var(--spacing-md);
		padding: 8px;
		border-radius: var(--radius-full, 50px);
		max-width: fit-content;
		margin-left: auto;
		margin-right: auto;
		overflow: hidden;
	}

	.category-nav-scroll {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
		padding: 4px;
	}

	.category-nav-scroll::-webkit-scrollbar {
		display: none;
	}

	.cat-chip {
		padding: 6px 16px;
		background: var(--bg-color);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-full, 50px);
		font-size: 0.85rem;
		font-weight: 600;
		white-space: nowrap;
		cursor: pointer;
		color: var(--text-color);
		transition: all 0.2s;
	}

	.cat-chip:hover {
		border-color: var(--primary-color);
		background: var(--hover-bg);
		transform: translateY(-1px);
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
		.explore-content {
			max-width: 1200px;
			margin: 0 auto;
			padding: 0 var(--spacing-md);
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

	/* ─── Search Overlay UI ───────────────────────────── */
	.search-overlay-wrapper {
		position: sticky;
		top: var(--spacing-sm);
		margin: 0 auto var(--spacing-xl);
		z-index: 1000;
		max-width: 1200px;
		width: 100%;
		padding: 0 var(--spacing-sm);
	}

	@media (min-width: 1024px) {
		.search-overlay-wrapper {
			top: var(--spacing-md);
			padding: 0 var(--spacing-md);
		}
	}

	.search-results-overlay {
		padding: var(--spacing-md);
		background: #ffffff; /* Explicit solid background */
		min-height: 100vh;
		border-radius: var(--radius-lg);
		box-shadow: 0 10px 30px rgba(0,0,0,0.1);
	}

	@media (prefers-color-scheme: dark) {
		.search-results-overlay {
			background: #0d0d14; /* Explicit solid dark background */
		}
	}

	.links-results {
		margin-top: var(--spacing-md);
	}

	/* ─── Spotlight-style External Search List ─── */
	.external-search-section {
		margin-top: var(--spacing-xl);
		animation: fadeIn 0.3s ease;
	}

	.external-search-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 8px;
	}

	.external-search-row {
		display: flex;
		align-items: center;
		width: 100%;
		padding: 12px 16px;
		background: var(--card-bg);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		text-align: left;
		transition: all 0.2s ease;
		color: inherit;
	}

	.external-search-row:hover:not(:disabled) {
		background: var(--glass-bg-active);
		border-color: var(--primary-color);
		transform: translateY(-1px);
	}

	.external-search-row:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.external-icon {
		font-size: 1.4rem;
		margin-right: 16px;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-color);
		border-radius: 10px;
		border: 1px solid var(--border-color);
	}

	.external-row-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.external-name {
		font-weight: 600;
		font-size: 1rem;
		color: var(--text-color);
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
		flex-direction: column;
		align-items: center;
		gap: 20px;
		border-radius: var(--radius-lg);
		border: 1px solid rgba(212, 68, 7, 0.2);
		background: rgba(212, 68, 7, 0.05);
		text-align: center;
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

	.hint-actions {
		display: flex;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-sm);
		flex-wrap: wrap;
		justify-content: center;
	}

	.hint-btn {
		padding: 10px 18px;
		border-radius: 10px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.hint-btn.primary {
		background: var(--primary-color);
		color: white;
	}

	.hint-btn.secondary {
		background: var(--hover-bg);
		color: var(--text-color);
		border: 1px solid var(--border-color);
	}

	.hint-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0,0,0,0.1);
	}

	@media (max-width: 600px) {
		.verification-hint {
			padding: 20px;
		}
		.hint-btn {
			width: 100%;
		}
	}
</style>
