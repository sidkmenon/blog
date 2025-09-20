<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..900;1,14..32,400..900&display=swap"
	/>
</svelte:head>

{@render children?.()}


<style>
	@font-face {
		font-family: 'Charter';
		src: url('/fonts/charter/charter_regular-webfont.woff') format('woff');
		font-weight: 400;
		font-style: normal;
		font-display: swap;
	}

	@font-face {
		font-family: 'Charter';
		src: url('/fonts/charter/charter_italic-webfont.woff') format('woff');
		font-weight: 400;
		font-style: italic;
		font-display: swap;
	}

	@font-face {
		font-family: 'Charter';
		src: url('/fonts/charter/charter_bold-webfont.woff') format('woff');
		font-weight: 700;
		font-style: normal;
		font-display: swap;
	}

	@font-face {
		font-family: 'Charter';
		src: url('/fonts/charter/charter_bold_italic-webfont.woff') format('woff');
		font-weight: 700;
		font-style: italic;
		font-display: swap;
	}

	:global(body) {
		font-family: 'Charter', 'Bitstream Charter', 'Charter BT', 'Book Antiqua', 'Georgia', 'Times New Roman', serif;
		margin: 0;
	}

	:global(h1),
	:global(h2),
	:global(h3),
	:global(h4),
	:global(h5),
	:global(h6) {
		font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
	}
</style>
