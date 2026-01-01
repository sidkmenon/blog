<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import type { LayoutData } from './$types';

	let { children, data }: { children?: any; data: LayoutData } = $props();
	let mobileNavOpen = $state(false);

	function toggleMobileNav() {
		mobileNavOpen = !mobileNavOpen;
	}

	function closeMobileNav() {
		mobileNavOpen = false;
	}
</script>

<svelte:head>
	<title>{data.metadata.title}</title>
	<meta name="description" content={data.metadata.description} />
	<meta property="og:title" content={data.metadata.title} />
	<meta property="og:description" content={data.metadata.description} />
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..900;1,14..32,400..900&display=swap"
	/>
</svelte:head>

<header class="header">
	<a href="/" class="brand">Sidharth Menon</a>
	<nav class="desktop-nav">
		<a href="/posts">posts</a>
		<a href="/posts/other">other</a>
	</nav>
	<button
		class="hamburger"
		onclick={toggleMobileNav}
		aria-label="Toggle menu"
		aria-expanded={mobileNavOpen}
	>
		<span class="hamburger-line"></span>
		<span class="hamburger-line"></span>
		<span class="hamburger-line"></span>
	</button>
</header>

<button
	class="mobile-nav-backdrop"
	class:open={mobileNavOpen}
	onclick={closeMobileNav}
	aria-label="Close menu"
></button>
<nav class="mobile-nav" class:open={mobileNavOpen}>
	<a href="/posts" onclick={closeMobileNav}>posts</a>
	<a href="/posts/other" onclick={closeMobileNav}>other</a>
</nav>

<div class="container">
	{@render children?.()}
</div>

<footer class="footer-content">
	<span>© Sidharth Menon, 2025.</span>
	<div class="footer-links">
		<a href="https://www.linkedin.com/in/sidkmenon/">LinkedIn</a>
		<a href="https://github.com/sidkmenon">Github</a>
	</div>
</footer>

<style>
	/* Declare layer order - unlayered styles (page components) will override base */
	@layer base;

	/* Font faces - outside layers, not cascade-affected */
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

	/* Base layer - global styles that pages can override */
	@layer base {
		:global(body) {
			font-family:
				'Charter', 'Bitstream Charter', 'Charter BT', 'Book Antiqua', 'Georgia', 'Times New Roman',
				serif;
			margin: 0;
			padding-right: 280px;
			counter-reset: sidenote-counter;
		}

		:global(h1),
		:global(h2),
		:global(h3),
		:global(h4),
		:global(h5),
		:global(h6) {
			font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
		}

		:global(.header) {
			display: flex;
			align-items: baseline;
			gap: 1.5rem;
			padding: 1rem 1.5rem 1rem;
			border-bottom: 1px solid #e5e7eb;
		}

		:global(.brand) {
			font-weight: 700;
			font-size: 2rem;
			text-decoration: none;
			color: inherit;
			font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
		}

		:global(.brand:hover) {
			text-decoration: underline;
		}

		:global(.desktop-nav) {
			display: flex;
			gap: 2rem;
		}

		:global(.desktop-nav a) {
			text-decoration: none;
			color: inherit;
			font-size: 1.125rem;
		}

		:global(.desktop-nav a:hover) {
			text-decoration: underline;
		}

		:global(.container) {
			max-width: 1200px;
			padding: 0.5rem 1.5rem;
			position: relative;
		}

		/* Sidenote styles */
		:global(.sidenote-ref) {
			text-decoration: none;
			color: inherit;
		}

		:global(.sidenote-number) {
			counter-increment: sidenote-counter;
		}

		:global(.sidenote-number:after) {
			content: counter(sidenote-counter);
			color: #0066cc;
			cursor: pointer;
		}

		:global(.sidenote-number-static) {
			color: #0066cc;
			cursor: pointer;
		}

		:global(.sidenote) {
			float: right;
			clear: right;
			margin-right: -280px;
			width: 250px;
			font-size: 0.9rem;
			line-height: 1.4;
			color: #6b7280;
			margin-top: 0.3rem;
			padding-left: 1rem;
		}

		:global(.footnotes) {
			display: none;
			margin-top: 3rem;
			padding-top: 2rem;
			border-top: 2px solid #e5e7eb;
			font-size: 0.875rem;
			color: #6b7280;
		}

		:global(.footnotes ol) {
			padding-left: 1.5rem;
		}

		:global(.footnotes li) {
			margin: 1rem 0;
		}

		/* Headings */
		:global(.container h1) {
			font-size: 2.5rem;
			font-weight: 700;
			margin-bottom: 1rem;
		}

		:global(.container h2) {
			font-size: 1.875rem;
			margin: 1rem 0;
			padding: 0.75rem 0;
			border-bottom: 2px solid #e5e7eb;
		}

		:global(.container h3) {
			font-size: 1.5rem;
			margin-top: 1.5rem;
			margin-bottom: 0.75rem;
		}

		:global(.container h4) {
			font-size: 1.25rem;
			margin-top: 1.25rem;
			margin-bottom: 0.5rem;
		}

		:global(.container h5),
		:global(.container h6) {
			font-size: 1.125rem;
			margin-top: 1rem;
			margin-bottom: 0.5rem;
		}

		/* Media elements */
		:global(.container img),
		:global(.container iframe),
		:global(.container video),
		:global(.container audio) {
			display: block;
			margin: 1.5rem auto;
			max-width: 80%;
			height: auto;
			border-radius: 0.5rem;
			box-shadow:
				0 4px 6px -1px rgba(0, 0, 0, 0.1),
				0 2px 4px -1px rgba(0, 0, 0, 0.06);
		}

		:global(.container iframe) {
			width: 100%;
			height: auto;
			aspect-ratio: 16 / 9;
		}

		/* Text content */
		:global(.container p),
		:global(.container ul),
		:global(.container ol),
		:global(.container blockquote) {
			margin: 1rem 0;
			line-height: 1.7;
		}

		:global(.container blockquote) {
			border-left: 4px solid #e5e7eb;
			padding-left: 1rem;
			font-style: italic;
			color: #6b7280;
			margin: 1.5rem 0;
		}

		/* Lists */
		:global(.container ul),
		:global(.container ol) {
			padding-left: 1.5rem;
			margin: 1.25rem 0;
		}

		:global(.container li) {
			margin: 0.5rem 0;
			line-height: 1.6;
		}

		/* Emphasis */
		:global(.container em) {
			font-style: italic;
			color: #374151;
		}

		:global(.container strong) {
			font-weight: 600;
			color: #111827;
		}

		/* Code */
		:global(.container code) {
			background-color: #f3f4f6;
			padding: 0.125rem 0.25rem;
			border-radius: 0.25rem;
			font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
			font-size: 0.875rem;
		}

		:global(.container pre) {
			background-color: #f8fafc;
			padding: 1rem;
			border-radius: 0.5rem;
			overflow-x: auto;
			margin: 1.5rem 0;
			border: 1px solid #e5e7eb;
		}

		:global(.container pre code) {
			background-color: transparent;
			padding: 0;
			border-radius: 0;
		}

		/* Tables */
		:global(.container table) {
			width: auto;
			border-collapse: collapse;
			margin: 1.5rem 0;
		}

		:global(.container th),
		:global(.container td) {
			padding: 0.6rem 1rem;
			text-align: left;
			border-bottom: 1px solid #e5e7eb;
		}

		:global(.container th) {
			font-weight: 600;
			border-bottom: 2px solid #d1d5db;
		}

		:global(.container tbody tr:hover) {
			background-color: #f9fafb;
		}

		/* Table rows */
		:global(.container table thead tr),
		:global(.container table tbody tr) {
			animation: waterfall-fade-in 0.3s ease-out forwards;
			opacity: 0;
		}

		:global(.container table thead tr) {
			animation-delay: 0s;
		}

		:global(.container table tbody tr) {
			animation-delay: calc(sibling-index() * 50ms);
		}

		/* List items */
		:global(.container ul > li),
		:global(.container ol > li) {
			animation: waterfall-fade-in 0.3s ease-out forwards;
			opacity: 0;
			animation-delay: calc(sibling-index() * 50ms);
		}
	}

	/* Waterfall animation - outside layer (keyframes not cascade-affected) */
	@keyframes waterfall-fade-in {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Mobile responsive - base layer */
	@layer base {
		@media (max-width: 767px) {
			:global(body) {
				padding-right: 0;
			}

			:global(.desktop-nav) {
				display: none;
			}

			:global(.header) {
				align-items: center;
				padding: 1rem;
			}

			:global(.container th),
			:global(.container td) {
				padding: 0.5rem 0.75rem;
			}

			:global(.sidenote) {
				display: none;
			}

			:global(.footnotes) {
				display: block;
			}
		}

		@media (min-width: 768px) {
			:global(.container) {
				padding: 1rem 2rem;
			}

			:global(.container h1) {
				font-size: 3rem;
				margin-bottom: 1rem;
			}

			:global(.container h2) {
				font-size: 2.25rem;
				margin: 1rem 0;
				padding: 1rem 0;
			}

			:global(.container h3) {
				font-size: 1.75rem;
				margin: 1rem;
			}

			:global(.container h4) {
				font-size: 1.5rem;
				margin: 0.75rem;
			}

			:global(.container h5),
			:global(.container h6) {
				font-size: 1.25rem;
				margin: 0.75rem;
			}

			:global(.container img),
			:global(.container iframe),
			:global(.container video),
			:global(.container audio) {
				margin: 2rem 0;
			}
		}

		@media (min-width: 1024px) {
			:global(.container) {
				padding: 1.5rem 3rem;
			}
		}
	}

	/* Layout-scoped styles - outside layer */
	.hamburger {
		display: none;
		flex-direction: column;
		justify-content: space-around;
		width: 2rem;
		height: 2rem;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
		margin-left: auto;
		position: relative;
		z-index: 1002;
	}

	.hamburger-line {
		width: 2rem;
		height: 0.25rem;
		background-color: #111827;
		border-radius: 0.25rem;
		transition: all 0.3s ease;
	}

	.hamburger[aria-expanded='true'] .hamburger-line:nth-child(1) {
		transform: rotate(45deg) translate(0.5rem, 0.5rem);
	}

	.hamburger[aria-expanded='true'] .hamburger-line:nth-child(2) {
		opacity: 0;
	}

	.hamburger[aria-expanded='true'] .hamburger-line:nth-child(3) {
		transform: rotate(-45deg) translate(0.5rem, -0.5rem);
	}

	.mobile-nav-backdrop {
		display: none;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 1000;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.mobile-nav-backdrop.open {
		display: block;
	}

	.mobile-nav {
		display: none;
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 70%;
		max-width: 300px;
		background-color: white;
		box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
		z-index: 1001;
		padding: 5rem 2rem 2rem;
	}

	.mobile-nav.open {
		display: flex;
		flex-direction: column;
		animation: slideIn 0.3s ease-out;
	}

	.mobile-nav a {
		display: block;
		padding: 1rem 0;
		text-decoration: none;
		color: inherit;
		font-size: 1.25rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.mobile-nav a:hover {
		text-decoration: underline;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	@media (max-width: 767px) {
		.hamburger {
			display: flex;
		}
	}

	footer {
		padding: clamp(1.5rem, 3vw, 2rem) clamp(1rem, 2vw, 1.5rem);
		text-align: center;
		border-top: 1px solid #e0e0e0;
		font-size: 0.9rem;
		color: #666;
	}

	.footer-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: center;
	}

	.footer-links {
		display: flex;
		gap: 1rem;
	}

	footer a {
		color: #0066cc;
		text-decoration: none;
	}

	footer a:hover {
		text-decoration: underline;
	}

	@media (min-width: 640px) {
		.footer-content {
			flex-direction: row;
			justify-content: center;
			gap: 1rem;
		}
	}
</style>
