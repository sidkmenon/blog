<script lang="ts">
	let { children } = $props();
</script>

<main class="post-container">
	{@render children?.()}
</main>

<style>
	.post-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-height: 100vh;
		padding: 2rem 1rem;
		max-width: 100%;
	}

	/* Center all content within the post container */
	:global(.post-container > *) {
		width: 100%;
		max-width: 65ch;
		text-align: left;
	}

	/* Responsive padding and styling for headings */
	:global(.post-container h1),
	:global(.post-container h2),
	:global(.post-container h3),
	:global(.post-container h4),
	:global(.post-container h5),
	:global(.post-container h6) {
		padding: 1rem 0 0.5rem 0;
		margin: 0;
		text-align: center;
		font-weight: 600;
		line-height: 1.3;
	}

	:global(.post-container h1) {
		padding-top: 0;
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 1rem;
	}

	:global(.post-container h2) {
		font-size: 1.875rem;
		margin-top: 2rem;
		margin-bottom: 1rem;
		padding: 1.5rem 0 0.75rem 0;
		border-bottom: 2px solid #e5e7eb;
	}

	:global(.post-container h3) {
		font-size: 1.5rem;
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
	}

	:global(.post-container h4) {
		font-size: 1.25rem;
		margin-top: 1.25rem;
		margin-bottom: 0.5rem;
	}

	:global(.post-container h5),
	:global(.post-container h6) {
		font-size: 1.125rem;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}

	/* Responsive padding for media elements */
	:global(.post-container img),
	:global(.post-container iframe),
	:global(.post-container video),
	:global(.post-container audio) {
		display: block;
		margin: 1.5rem auto;
		max-width: 100%;
		height: auto;
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	/* Responsive iframe sizing */
	:global(.post-container iframe) {
		width: 100%;
		height: auto;
		aspect-ratio: 16 / 9;
	}

	/* Responsive text content */
	:global(.post-container p),
	:global(.post-container ul),
	:global(.post-container ol),
	:global(.post-container blockquote) {
		margin: 1rem 0;
		line-height: 1.7;
	}

	:global(.post-container blockquote) {
		border-left: 4px solid #e5e7eb;
		padding-left: 1rem;
		font-style: italic;
		color: #6b7280;
		margin: 1.5rem 0;
	}

	/* List styling */
	:global(.post-container ul),
	:global(.post-container ol) {
		padding-left: 1.5rem;
		margin: 1.25rem 0;
	}

	:global(.post-container li) {
		margin: 0.5rem 0;
		line-height: 1.6;
	}

	/* Emphasis and strong text */
	:global(.post-container em) {
		font-style: italic;
		color: #374151;
	}

	:global(.post-container strong) {
		font-weight: 600;
		color: #111827;
	}

	/* Code styling */
	:global(.post-container code) {
		background-color: #f3f4f6;
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.875rem;
	}

	:global(.post-container pre) {
		background-color: #f8fafc;
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		margin: 1.5rem 0;
		border: 1px solid #e5e7eb;
	}

	:global(.post-container pre code) {
		background-color: transparent;
		padding: 0;
		border-radius: 0;
	}

	/* Responsive design */
	@media (min-width: 768px) {
		.post-container {
			padding: 3rem 2rem;
		}

		:global(.post-container > *) {
			max-width: 70ch;
		}

		:global(.post-container h1) {
			font-size: 3rem;
			margin-bottom: 1.5rem;
		}

		:global(.post-container h2) {
			font-size: 2.25rem;
			margin-top: 2.5rem;
			margin-bottom: 1.25rem;
			padding: 2rem 0 1rem 0;
		}

		:global(.post-container h3) {
			font-size: 1.75rem;
			margin-top: 2rem;
			margin-bottom: 1rem;
		}

		:global(.post-container h4) {
			font-size: 1.5rem;
			margin-top: 1.75rem;
			margin-bottom: 0.75rem;
		}

		:global(.post-container h5),
		:global(.post-container h6) {
			font-size: 1.25rem;
			margin-top: 1.5rem;
			margin-bottom: 0.75rem;
		}

		:global(.post-container img),
		:global(.post-container iframe),
		:global(.post-container video),
		:global(.post-container audio) {
			margin: 2rem auto;
		}
	}

	@media (min-width: 1024px) {
		.post-container {
			padding: 4rem 3rem;
		}

		:global(.post-container > *) {
			max-width: 75ch;
		}
	}
</style>
