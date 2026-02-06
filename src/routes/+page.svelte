<script lang="ts">
	import LinkCard from '$lib/components/LinkCard.svelte';
	
	// SRH CampusWeb links with specific URLs
	const srhLinks = [
		{
			id: 'campusweb',
			title: 'CampusWeb Portal',
			url: 'https://srh-community.campusweb.cloud',
			icon: '🎓',
			description: 'Main portal for all services',
			category_name: 'Academic'
		},
		{
			id: 'schedule',
			title: 'My Schedule',
			url: 'https://srh-community.campusweb.cloud/en/mein-studium/mein-stundenplan.php',
			icon: '📅',
			description: 'View your class schedule',
			category_name: 'Academic'
		},
		{
			id: 'grades',
			title: 'My Grades',
			url: 'https://srh-community.campusweb.cloud/en/mein-studium/meine-notenuebersicht.php',
			icon: '📊',
			description: 'Check your grades and results',
			category_name: 'Academic'
		},
		{
			id: 'profile',
			title: 'My Profile',
			url: 'https://srh-community.campusweb.cloud/en/mein-profil.php',
			icon: '👤',
			description: 'Manage your profile settings',
			category_name: 'Academic'
		},
		{
			id: 'moodle',
			title: 'Moodle',
			url: 'https://moodle.srh.de',
			icon: '📚',
			description: 'Course materials and assignments',
			category_name: 'Academic'
		},
		{
			id: 'library',
			title: 'Library',
			url: 'https://www.srh-hochschule-heidelberg.de/en/university/library',
			icon: '📖',
			description: 'Search books and journals',
			category_name: 'Resources'
		},
		{
			id: 'email',
			title: 'SRH Email',
			url: 'https://outlook.office.com',
			icon: '📧',
			description: 'Access your university email',
			category_name: 'Services'
		},
		{
			id: 'it-support',
			title: 'IT Support',
			url: 'https://www.srh-hochschule-heidelberg.de/en/university/it-services',
			icon: '💻',
			description: 'Technical help and support',
			category_name: 'Services'
		},
		{
			id: 'campus-map',
			title: 'Campus Map',
			url: 'https://www.srh-hochschule-heidelberg.de/en/university/campus',
			icon: '🗺️',
			description: 'Navigate the campus',
			category_name: 'Resources'
		},
		{
			id: 'student-services',
			title: 'Student Services',
			url: 'https://www.srh-hochschule-heidelberg.de/en/study/student-services',
			icon: '🛠️',
			description: 'Counseling and support services',
			category_name: 'Services'
		}
	];
	
	let favorites: string[] = [];
	
	function handleToggleFavorite(event: CustomEvent<{ linkId: string }>) {
		const { linkId } = event.detail;
		if (favorites.includes(linkId)) {
			favorites = favorites.filter(id => id !== linkId);
		} else {
			favorites = [...favorites, linkId];
		}
	}
</script>

<svelte:head>
	<title>SRH Campus Hub - Quick Access to University Resources</title>
	<meta name="description" content="Quick access to SRH University resources - optimized for mobile" />
</svelte:head>

<div class="home-page">
	<header class="page-header">
		<div class="logo-container">
			<img 
				src="/icon-light.png" 
				alt="SRH University Logo" 
				class="logo light-mode"
				width="48"
				height="48"
			/>
			<img 
				src="/icon-dark.png" 
				alt="SRH University Logo" 
				class="logo dark-mode"
				width="48"
				height="48"
			/>
		</div>
		<h1>SRH Campus Hub</h1>
		<p class="subtitle">Quick access to university resources</p>
	</header>
	
	<section class="links-section">
		<h2 class="sr-only">University Links</h2>
		{#each srhLinks as link (link.id)}
			<LinkCard 
				{link} 
				isFavorite={favorites.includes(link.id)}
				on:toggleFavorite={handleToggleFavorite}
			/>
		{/each}
	</section>
</div>

<style>
	.home-page {
		padding-bottom: var(--spacing-xl);
	}
	
	.page-header {
		text-align: center;
		padding: var(--spacing-xl) 0;
		border-bottom: 2px solid var(--border-color);
		margin-bottom: var(--spacing-lg);
	}
	
	.logo-container {
		margin-bottom: var(--spacing-md);
	}
	
	.logo {
		width: 64px;
		height: 64px;
		object-fit: contain;
	}
	
	.logo.dark-mode {
		display: none;
	}
	
	@media (prefers-color-scheme: dark) {
		.logo.light-mode {
			display: none;
		}
		.logo.dark-mode {
			display: inline-block;
		}
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
	
	.links-section {
		margin-top: var(--spacing-lg);
	}
</style>
