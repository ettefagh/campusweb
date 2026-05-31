<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { t } from "$lib/i18n";
	
	export let isOpen = false;
	export let contact: any = null;

	const dispatch = createEventDispatcher();
	let dialog: HTMLDialogElement;

	$: if (dialog) {
		if (isOpen) {
			if (!dialog.open) dialog.showModal();
		} else {
			if (dialog.open) dialog.close();
		}
	}

	function close() {
		isOpen = false;
		dispatch("close");
	}

	function onBackdropClick(event: MouseEvent) {
		if (event.target === dialog) {
			close();
		}
	}

	function getTeamsChatUrl(email: string) {
		return `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`;
	}

	function openOutlookCompose(email: string, event: Event) {
		event.stopPropagation();
		event.preventDefault();
		const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

		if (isMobile) {
			window.location.href = `ms-outlook://compose?to=${email}`;
			setTimeout(() => {
				if (!document.hidden) {
					window.location.href = `https://outlook.office.com/mail/deeplink/compose?to=${email}`;
				}
			}, 2000);
		} else {
			window.open(`https://outlook.office.com/mail/deeplink/compose?to=${email}`, "_blank");
		}
	}
</script>

<dialog
	bind:this={dialog}
	class="native-modal"
	on:close={close}
	on:click={onBackdropClick}
>
	{#if contact}
		<div class="modal-content" on:click|stopPropagation>
			<div class="modal-header">
				<h2>Contact Details</h2>
				<button class="close-btn" on:click={close}>✕</button>
			</div>

			<div class="modal-body">
				<div class="search-contact-card">
					<div class="search-contact-info-wrapper">
						<div class="contact-avatar">
							{contact.person.charAt(0).toUpperCase()}
						</div>
						<div class="search-contact-info">
							<div class="search-contact-meta">
								{#if contact.programs && contact.programs.length > 0}
									<div class="contact-program-list">
										{#each contact.programs as prog}
											<div class="program-item">
												<i
													class="ph-bold ph-graduation-cap"
													style="margin-right: 4px; color: var(--primary-color);"
												></i>
												{prog}
											</div>
										{/each}
									</div>
								{/if}
								{#if contact.services && contact.services.length > 0}
									<div class="contact-service-list">
										{#each contact.services as service}
											<div class="service-item">
												<i
													class="ph-bold ph-wrench"
													style="margin-right: 4px; color: var(--primary-color);"
												></i>
												{service}
											</div>
										{/each}
									</div>
								{/if}
							</div>
							<div class="search-contact-name">
								{contact.person}
								<div class="search-contact-tags">
									{#each contact.tags as tag}
										{#if tag.startsWith("campus:")}
											<span class="contact-tag campus-tag">{tag.replace("campus:", "")}</span>
										{:else if tag.startsWith("school:")}
											<span class="contact-tag school-tag">{tag.replace("school:", "")}</span>
										{:else}
											<span class="contact-tag">{tag}</span>
										{/if}
									{/each}
								</div>
								<div class="contact-direct-details visible">
									<button
										class="contact-direct-link"
										type="button"
										on:click={(event) => openOutlookCompose(contact.email, event)}
									>
										<i class="ph-bold ph-envelope"></i>
										<span>{contact.email}</span>
									</button>
									<a
										class="contact-direct-link"
										href={getTeamsChatUrl(contact.email)}
										target="_blank"
										rel="noopener noreferrer"
									>
										<i class="ph-bold ph-chat-circle"></i>
										<span>Chat on Teams</span>
									</a>
									{#if contact.phone}
										<a
											class="contact-direct-link"
											href="tel:{contact.phone.replace(/[\s-]/g, '')}"
											on:click={(event) => event.stopPropagation()}
										>
											<i class="ph-bold ph-phone"></i>
											<span>{contact.phone}</span>
										</a>
									{/if}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</dialog>

<style>
	.native-modal {
		background: transparent;
		border: none;
		padding: 16px;
		margin: auto;
		max-width: 440px;
		width: 100%;
		outline: none;
		box-sizing: border-box;
	}

	.native-modal::backdrop {
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(8px);
		opacity: 0;
		transition: opacity 0.3s ease, overlay 0.3s allow-discrete, display 0.3s allow-discrete;
	}

	.native-modal[open]::backdrop {
		opacity: 1;
	}

	@starting-style {
		.native-modal[open]::backdrop {
			opacity: 0;
		}
	}

	.modal-content {
		background: var(--card-bg, var(--bg-color));
		border-radius: 24px;
		width: 100%;
		box-shadow: var(--shadow-xl, 0 12px 32px rgba(0, 0, 0, 0.15));
		color: var(--text-color);
		overflow: hidden;
		border: 1px solid var(--border-color);
		opacity: 0;
		transform: translateY(20px);
		transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0, 0, 1), overlay 0.3s allow-discrete, display 0.3s allow-discrete;
	}

	.native-modal[open] .modal-content {
		opacity: 1;
		transform: translateY(0);
	}

	@starting-style {
		.native-modal[open] .modal-content {
			opacity: 0;
			transform: translateY(20px);
		}
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border-color);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 800;
	}

	.close-btn {
		background: var(--bg-secondary, var(--surface-soft));
		color: var(--text-color);
		border: none;
		width: 32px; height: 32px;
		border-radius: 50%;
		font-weight: bold;
		cursor: pointer;
		display: flex; justify-content: center; align-items: center;
	}

	.modal-body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		max-height: 65vh;
		overflow-y: auto;
	}

	.search-contact-card {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--spacing-md);
		padding: var(--spacing-lg);
		border-radius: var(--radius-xl);
		background: var(--surface-soft);
		border: 1px solid var(--surface-border);
		box-shadow: var(--shadow-sm);
	}

	.search-contact-info-wrapper {
		display: flex;
		align-items: flex-start;
		gap: 16px;
		flex: 1;
		min-width: 0;
	}

	.contact-avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--primary-color), #8953ff);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: 800;
		flex: 0 0 auto;
		margin-top: 4px;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
	}

	.search-contact-info {
		flex: 1;
		min-width: 0;
	}
	.search-contact-name {
		font-weight: 700;
		font-size: 1.1rem;
		margin-top: 4px;
		color: var(--text-color);
	}

	.search-contact-meta {
		font-size: 0.75rem;
		color: var(--primary-color);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.search-contact-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 10px;
	}

	.contact-direct-details.visible {
		display: grid;
		gap: 6px;
		margin-top: 12px;
	}

	.contact-direct-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		width: fit-content;
		max-width: 100%;
		color: var(--text-color);
		font-size: 0.86rem;
		font-weight: 650;
		text-decoration: none;
		overflow-wrap: anywhere;
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		font-family: inherit;
		text-align: left;
	}

	.contact-direct-link i {
		color: var(--primary-color);
		flex: 0 0 auto;
	}

	.contact-direct-link:hover {
		color: var(--primary-color);
	}

	.contact-tag {
		font-size: 0.75rem;
		padding: 4px 10px;
		background: var(--surface-border);
		border-radius: 8px;
		color: var(--text-color-secondary);
		font-weight: 500;
	}
</style>
