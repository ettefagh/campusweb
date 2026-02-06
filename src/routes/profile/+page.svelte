<script lang="ts">
	// This will be replaced with actual user data in Phase 5
	const user = {
		name: 'Guest User',
		email: 'guest@example.com'
	};
</script>

<svelte:head>
	<title>Profile - SRH Campus Hub</title>
</svelte:head>

<div class="profile-page">
	<header class="page-header">
		<h1>👤 Profile</h1>
		<p class="subtitle">Manage your preferences</p>
	</header>
	
	<section class="profile-section">
		<h2>User Information</h2>
		<div class="info-card">
			<div class="info-row">
				<span class="label">Name:</span>
				<span class="value">{user.name}</span>
			</div>
			<div class="info-row">
				<span class="label">Email:</span>
				<span class="value">{user.email}</span>
			</div>
		</div>
	</section>
	
	<section class="profile-section">
		<h2>Preferences</h2>
		<div class="preference-card">
			<p class="coming-soon">⚙️ User preferences coming soon</p>
			<ul class="feature-list">
				<li>Hand preference (left/right/center)</li>
				<li>Theme preference (light/dark/auto)</li>
				<li>Default view selection</li>
			</ul>
		</div>
	</section>
	
	<section class="profile-section">
		<h2>About</h2>
		<div class="about-card">
			<p><strong>SRH Campus Hub</strong></p>
			<p>Version 1.0.0</p>
			<p class="description">
				A mobile-optimized navigation hub for quick access to SRH University resources.
				Built with accessibility and one-handed mobile use in mind.
			</p>
		</div>
	</section>
</div>

<style>
	.profile-page {
		padding-bottom: var(--spacing-xl);
	}
	
	.page-header {
		padding: var(--spacing-lg) 0;
		border-bottom: 2px solid var(--border-color);
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
	
	.profile-section {
		margin-bottom: var(--spacing-xl);
	}
	
	.profile-section h2 {
		font-size: 1.25rem;
		margin-bottom: var(--spacing-md);
		color: var(--primary-color);
	}
	
	.info-card,
	.preference-card,
	.about-card {
		background: var(--card-bg);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: var(--spacing-lg);
		box-shadow: var(--shadow-sm);
	}
	
	.info-row {
		display: flex;
		justify-content: space-between;
		padding: var(--spacing-sm) 0;
		border-bottom: 1px solid var(--border-color);
	}
	
	.info-row:last-child {
		border-bottom: none;
	}
	
	.label {
		font-weight: 600;
		color: #666;
	}
	
	@media (prefers-color-scheme: dark) {
		.label {
			color: #aaa;
		}
	}
	
	.value {
		color: var(--text-color);
	}
	
	.coming-soon {
		text-align: center;
		font-size: 1.125rem;
		margin-bottom: var(--spacing-md);
		color: var(--primary-color);
	}
	
	.feature-list {
		list-style: none;
		padding: 0;
	}
	
	.feature-list li {
		padding: var(--spacing-sm) 0;
		padding-left: var(--spacing-lg);
		position: relative;
		color: #666;
	}
	
	.feature-list li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--primary-color);
		font-weight: bold;
	}
	
	@media (prefers-color-scheme: dark) {
		.feature-list li {
			color: #aaa;
		}
	}
	
	.about-card p {
		margin-bottom: var(--spacing-sm);
	}
	
	.description {
		color: #666;
		line-height: 1.6;
	}
	
	@media (prefers-color-scheme: dark) {
		.description {
			color: #aaa;
		}
	}
</style>
