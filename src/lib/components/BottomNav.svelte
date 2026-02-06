<script lang="ts">
	import { page } from '$app/stores';
	
	const navItems = [
		{ path: '/', label: 'Home', icon: '🏠', ariaLabel: 'Home page' },
		{ path: '/favorites', label: 'Favorites', icon: '⭐', ariaLabel: 'My favorites' },
		{ path: '/search', label: 'Search', icon: '🔍', ariaLabel: 'Search links' },
		{ path: '/profile', label: 'Profile', icon: '👤', ariaLabel: 'User profile' }
	];
</script>

<nav class="bottom-nav" aria-label="Main navigation">
	{#each navItems as item}
		<a 
			href={item.path}
			class="nav-item"
			class:active={$page.url.pathname === item.path}
			aria-label={item.ariaLabel}
			aria-current={$page.url.pathname === item.path ? 'page' : undefined}
		>
			<span class="icon" aria-hidden="true">{item.icon}</span>
			<span class="label">{item.label}</span>
		</a>
	{/each}
</nav>

<style>
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: calc(var(--touch-target-min) + var(--spacing-md) * 2);
		background: var(--card-bg);
		border-top: 1px solid var(--border-color);
		display: flex;
		justify-content: space-around;
		align-items: center;
		z-index: 100;
		padding: var(--spacing-md) var(--spacing-sm);
		box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
	}
	
	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-xs);
		min-width: var(--touch-target-min);
		min-height: var(--touch-target-min);
		padding: var(--spacing-sm);
		color: var(--text-color);
		text-decoration: none;
		border-radius: var(--radius-md);
		transition: all 0.2s ease;
		position: relative;
	}
	
	.nav-item:hover,
	.nav-item:focus-visible {
		background: rgba(212, 68, 7, 0.1);
	}
	
	.nav-item.active {
		color: var(--primary-color);
		background: rgba(212, 68, 7, 0.15);
	}
	
	.nav-item.active::before {
		content: '';
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 32px;
		height: 3px;
		background: var(--primary-color);
		border-radius: 0 0 3px 3px;
	}
	
	.icon {
		font-size: 24px;
		line-height: 1;
	}
	
	.label {
		font-size: 12px;
		font-weight: 500;
		line-height: 1;
	}
	
	/* Safe area for notched devices */
	@supports (padding-bottom: env(safe-area-inset-bottom)) {
		.bottom-nav {
			padding-bottom: calc(var(--spacing-md) + env(safe-area-inset-bottom));
		}
	}
</style>
