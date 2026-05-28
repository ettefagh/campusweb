import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const cryptoMockPath = decodeURI(new URL('./src/lib/mocks/cryptoMock.ts', import.meta.url).pathname);

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			crypto: cryptoMockPath
		}
	}
});
