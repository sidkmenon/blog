<script lang="ts">
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children?: Snippet; data: LayoutData } = $props();
</script>

<svelte:head>
	<title>{data.metadata.title}</title>
	<meta name="description" content={data.metadata.description} />
	<meta property="og:title" content={data.metadata.title} />
	<meta property="og:description" content={data.metadata.description} />
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;1,400&amp;family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400&amp;display=swap"
	/>
</svelte:head>

{#if data.isArticle}
	<div class="article-page">
		<header class="article-header">
			<a href={resolve('/')}>← SID MENON</a>
		</header>
		<main class="article-content">
			{@render children?.()}
		</main>
		<footer class="article-footer">
			<a href={resolve('/')}>← HOME</a>
			<nav aria-label="External links">
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href="https://www.linkedin.com/in/sidkmenon/">LinkedIn</a>
				<span aria-hidden="true">·</span>
				<a href="mailto:menon.sid.k@gmail.com">Email</a>
				<span aria-hidden="true">·</span>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href="https://dev.fast">/dev/fast</a>
			</nav>
		</footer>
	</div>
{:else}
	{@render children?.()}
{/if}

<style>
	:global(:root) {
		font-family: 'Source Serif 4', Georgia, serif;
		font-synthesis: none;
		color: #1a1c1e;
		background: #fcfcfa;
		--paper: #fcfcfa;
		--ink: #1a1c1e;
		--graphite: #6b7078;
		--hairline: #e4e2db;
		--row-line: #eeece6;
		--leader: #b8b5ac;
		--blue: #2f44c8;
		--serif: 'Source Serif 4', Georgia, serif;
		--mono: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
	}

	:global(*) {
		box-sizing: border-box;
	}

	:global(html) {
		background: var(--paper);
		scroll-behavior: smooth;
	}

	:global(body) {
		margin: 0;
		min-width: 320px;
		background: var(--paper);
		color: var(--ink);
		counter-reset: sidenote-counter;
		-webkit-font-smoothing: antialiased;
		text-rendering: optimizeLegibility;
	}

	:global(button),
	:global(input) {
		font: inherit;
	}

	:global(a) {
		color: inherit;
		text-underline-offset: 0.16em;
	}

	:global(::selection) {
		background: #dfe3ff;
	}

	.article-page {
		width: min(100%, 1200px);
		margin: 0 auto;
		padding: 64px 0 52px;
	}

	.article-header,
	.article-footer {
		font-family: var(--mono);
		font-size: 12px;
		line-height: 16px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.article-header a,
	.article-footer > a {
		color: var(--blue);
		text-decoration: none;
	}

	.article-content {
		width: min(100%, 760px);
		margin-top: 72px;
		font-size: 19px;
		line-height: 1.62;
	}

	.article-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 32px;
		margin-top: 84px;
		padding-top: 18px;
		border-top: 1px solid var(--hairline);
	}

	.article-footer nav {
		display: flex;
		align-items: center;
		gap: 9px;
		color: var(--graphite);
		text-transform: none;
	}

	.article-footer nav a {
		text-decoration: none;
	}

	:global(.article-content h1),
	:global(.article-content h2),
	:global(.article-content h3),
	:global(.article-content h4),
	:global(.article-content h5),
	:global(.article-content h6) {
		font-family: var(--serif);
		font-weight: 600;
		color: var(--ink);
	}

	:global(.article-content h1) {
		margin: 0 0 42px;
		font-size: clamp(42px, 5vw, 58px);
		line-height: 1.02;
		letter-spacing: -0.035em;
	}

	:global(.article-content h2) {
		margin: 58px 0 18px;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--hairline);
		font-size: 30px;
		line-height: 1.14;
		letter-spacing: -0.02em;
	}

	:global(.article-content h3) {
		margin: 38px 0 14px;
		font-size: 24px;
		line-height: 1.2;
	}

	:global(.article-content p),
	:global(.article-content ul),
	:global(.article-content ol),
	:global(.article-content blockquote),
	:global(.article-content table) {
		margin: 1.1em 0;
	}

	:global(.article-content ul),
	:global(.article-content ol) {
		padding-left: 1.4em;
	}

	:global(.article-content li) {
		margin: 0.45em 0;
	}

	:global(.article-content blockquote) {
		margin-left: 0;
		padding: 2px 0 2px 22px;
		border-left: 2px solid var(--hairline);
		color: var(--graphite);
		font-style: italic;
	}

	:global(.article-content a) {
		color: var(--blue);
	}

	:global(.article-content img),
	:global(.article-content iframe),
	:global(.article-content video) {
		display: block;
		max-width: 100%;
		height: auto;
		margin: 32px 0;
	}

	:global(.article-content iframe) {
		width: 100%;
		aspect-ratio: 16 / 9;
	}

	:global(.article-content code) {
		padding: 0.12em 0.28em;
		border-radius: 2px;
		background: #f1f0eb;
		font-family: var(--mono);
		font-size: 0.82em;
	}

	:global(.article-content pre) {
		overflow-x: auto;
		padding: 18px;
		border: 1px solid var(--hairline);
		background: #f7f6f2;
	}

	:global(.article-content pre code) {
		padding: 0;
		background: transparent;
	}

	:global(.article-content table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9em;
	}

	:global(.article-content th),
	:global(.article-content td) {
		padding: 10px 12px;
		border-bottom: 1px solid var(--row-line);
		text-align: left;
		vertical-align: top;
	}

	:global(.article-content th) {
		border-color: var(--hairline);
		font-weight: 600;
	}

	:global(.sidenote-ref) {
		color: inherit;
		text-decoration: none;
	}

	:global(.sidenote-number) {
		counter-increment: sidenote-counter;
	}

	:global(.sidenote-number::after) {
		content: counter(sidenote-counter);
		color: var(--blue);
		cursor: pointer;
	}

	:global(.sidenote-number-static) {
		color: var(--blue);
		cursor: pointer;
	}

	:global(.sidenote) {
		float: right;
		clear: right;
		width: 250px;
		margin: 0.35rem -330px 0 0;
		padding-left: 20px;
		color: var(--graphite);
		font-size: 14px;
		line-height: 1.45;
	}

	:global(.footnotes) {
		display: none;
		margin-top: 52px;
		padding-top: 20px;
		border-top: 1px solid var(--hairline);
		color: var(--graphite);
		font-size: 15px;
	}

	@media (hover: hover) {
		.article-header a:hover,
		.article-footer a:hover,
		.article-footer nav a:hover {
			text-decoration: underline;
		}
	}

	@media (max-width: 1320px) {
		.article-page {
			width: auto;
			margin: 0 60px;
		}
	}

	@media (max-width: 1120px) {
		:global(.sidenote) {
			display: none;
		}

		:global(.footnotes) {
			display: block;
		}
	}

	@media (max-width: 700px) {
		.article-page {
			margin: 0;
			padding: 28px 24px 24px;
		}

		.article-header,
		.article-footer {
			font-size: 11px;
			line-height: 15px;
		}

		.article-content {
			margin-top: 52px;
			font-size: 17px;
			line-height: 1.58;
		}

		:global(.article-content h1) {
			margin-bottom: 32px;
			font-size: 38px;
		}

		:global(.article-content h2) {
			margin-top: 46px;
			font-size: 27px;
		}

		:global(.article-content table) {
			display: block;
			overflow-x: auto;
			font-size: 14px;
		}

		.article-footer {
			align-items: flex-start;
			margin-top: 64px;
		}

		.article-footer nav {
			flex-wrap: wrap;
			justify-content: flex-end;
			font-size: 10px;
			letter-spacing: 0;
		}
	}
</style>
