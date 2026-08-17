import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { remarkFootnotes } from './src/lib/remark-footnotes.ts';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.svx'],
			remarkPlugins: [remarkFootnotes]
		})
	],
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			strict: true
		})
	},
	extensions: ['.svelte', '.svx']
};

export default config;
