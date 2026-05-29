import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
	duration?: number;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	function addToast(type: ToastType, message: string, duration = 4000) {
		const id = Math.random().toString(36).substring(2, 9);
		const newToast: Toast = { id, type, message, duration };
		
		update((toasts) => [...toasts, newToast]);

		if (duration > 0) {
			setTimeout(() => {
				dismissToast(id);
			}, duration);
		}
	}

	function dismissToast(id: string) {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	return {
		subscribe,
		success: (message: string, duration?: number) => addToast('success', message, duration),
		error: (message: string, duration?: number) => addToast('error', message, duration),
		info: (message: string, duration?: number) => addToast('info', message, duration),
		dismiss: dismissToast
	};
}

export const toast = createToastStore();
