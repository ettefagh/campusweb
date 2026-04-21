export function focusTrap(node: HTMLElement) {
	const focusableElements =
		'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

	let firstFocusableElement: HTMLElement;
	let lastFocusableElement: HTMLElement;

	function getFocusableElements() {
		const elements = node.querySelectorAll(focusableElements);
		return Array.from(elements).filter((el) => {
			const e = el as HTMLElement;
			return e.offsetWidth > 0 || e.offsetHeight > 0 || e.getClientRects().length > 0;
		}) as HTMLElement[];
	}

	function handleKeydown(e: KeyboardEvent) {
		const isTabPressed = e.key === 'Tab';
		const isEscapePressed = e.key === 'Escape';

		if (isEscapePressed) {
			const closeBtn = node.querySelector('.popup-close') as HTMLElement;
			if (closeBtn) closeBtn.click();
			return;
		}

		if (!isTabPressed) {
			return;
		}

		const focusable = getFocusableElements();
		if (focusable.length === 0) return;

		firstFocusableElement = focusable[0];
		lastFocusableElement = focusable[focusable.length - 1];

		if (e.shiftKey) {
			if (document.activeElement === firstFocusableElement) {
				lastFocusableElement.focus();
				e.preventDefault();
			}
		} else {
			if (document.activeElement === lastFocusableElement) {
				firstFocusableElement.focus();
				e.preventDefault();
			}
		}
	}

	// Wait a tick for the DOM to render the contents
	setTimeout(() => {
		const focusable = getFocusableElements();
		if (focusable.length > 0) {
			focusable[0].focus();
		}
	}, 10);

	node.addEventListener('keydown', handleKeydown);

	return {
		destroy() {
			node.removeEventListener('keydown', handleKeydown);
		}
	};
}
