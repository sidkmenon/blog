<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		levels: string[];
		defaultLevel?: number;
		children?: Snippet;
	}

	let { levels, defaultLevel = 0, children }: Props = $props();

	// Precompute common prefix lengths between all level pairs
	const prefixMatrix: number[][] = $derived.by(() => {
		const n = levels.length;
		const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				let k = 0;
				while (k < levels[i].length && k < levels[j].length && levels[i][k] === levels[j][k]) {
					k++;
				}
				matrix[i][j] = k;
				matrix[j][i] = k;
			}
		}
		return matrix;
	});

	const maxLevel = $derived(levels.length - 1);
	const levelIndices = $derived(Array.from({ length: levels.length }, (_, i) => i));

	let currentLevel = $state(defaultLevel);
	let displayedText = $state(levels[defaultLevel] || '');
	let isAnimating = $state(false);

	const TYPING_SPEED = 5;
	const DELETE_SPEED = 10;

	let animationFrame: number | null = null;

	function animateToLevel(targetLevel: number) {
		if (isAnimating || targetLevel === currentLevel || targetLevel < 0 || targetLevel > maxLevel)
			return;

		const targetText = levels[targetLevel];
		if (!targetText) return;

		isAnimating = true;

		const commonLength = prefixMatrix[currentLevel][targetLevel];
		let lastTime = 0;
		let phase: 'deleting' | 'typing' = 'deleting';

		function step(timestamp: number) {
			const elapsed = timestamp - lastTime;
			const speed = phase === 'deleting' ? DELETE_SPEED : TYPING_SPEED;

			if (elapsed < speed) {
				animationFrame = requestAnimationFrame(step);
				return;
			}

			lastTime = timestamp;

			if (phase === 'deleting') {
				if (displayedText.length > commonLength) {
					displayedText = displayedText.slice(0, -1);
					animationFrame = requestAnimationFrame(step);
				} else {
					phase = 'typing';
					animationFrame = requestAnimationFrame(step);
				}
			} else {
				if (displayedText.length < targetText.length) {
					displayedText = targetText.slice(0, displayedText.length + 1);
					animationFrame = requestAnimationFrame(step);
				} else {
					currentLevel = targetLevel;
					isAnimating = false;
				}
			}
		}

		animationFrame = requestAnimationFrame(step);
	}

	function handleLevelClick(level: number) {
		animateToLevel(level);
	}

	function handleShowMore() {
		if (currentLevel < maxLevel) {
			animateToLevel(currentLevel + 1);
		}
	}

	function handleShowLess() {
		if (currentLevel > 0) {
			animateToLevel(currentLevel - 1);
		}
	}

	$effect(() => {
		return () => {
			if (animationFrame) cancelAnimationFrame(animationFrame);
		};
	});
</script>

<div class="bio-section">
	<div class="bio-content">
		<div class="bio-text">
			{@html displayedText.replace(/\n\n/g, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>')}
		</div>
		{#if children}
			{@render children()}
		{/if}
	</div>

	<!-- Desktop: Dot slider -->
	<div class="desktop-control">
		<button
			class="control-label"
			onclick={handleShowLess}
			disabled={isAnimating || currentLevel === 0}
			aria-label="Show less detail">less detail</button
		>
		<div class="dot-slider">
			{#each levelIndices as level}
				<button
					class="dot"
					class:active={currentLevel >= level}
					class:current={currentLevel === level}
					onclick={() => handleLevelClick(level)}
					disabled={isAnimating}
					aria-label="Detail level {level + 1} of {levels.length}"
				></button>
				{#if level < maxLevel}
					<span class="dot-connector" class:active={currentLevel > level}></span>
				{/if}
			{/each}
		</div>
		<button
			class="control-label"
			onclick={handleShowMore}
			disabled={isAnimating || currentLevel === maxLevel}
			aria-label="Show more detail">more detail</button
		>
	</div>

	<!-- Mobile: Show more/less links (- on left, + on right) -->
	<div class="mobile-control">
		{#if currentLevel > 0}
			<button class="text-link" onclick={handleShowLess} disabled={isAnimating}>
				<span class="arrow">-</span> less detail
			</button>
		{/if}
		{#if currentLevel < maxLevel}
			<button class="text-link" onclick={handleShowMore} disabled={isAnimating}>
				more detail <span class="arrow">+</span>
			</button>
		{/if}
	</div>
</div>

<style>
	.bio-section {
		margin: 0;
	}

	.bio-content {
		min-height: 4em;
	}

	.bio-content :global(p),
	.bio-content :global(blockquote) {
		margin: 0 0 1rem 0;
		line-height: 1.7;
	}

	.bio-content :global(*:last-child) {
		margin-bottom: 0;
	}

	.bio-text {
		margin-bottom: 1rem;
	}

	/* Desktop dot slider */
	.desktop-control {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 1.5rem;
		padding-top: 1rem;
	}

	.control-label {
		font-size: 0.9rem;
		color: #9ca3af;
		font-family: 'Inter', sans-serif;
		text-transform: lowercase;
		letter-spacing: 0.02em;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: color 0.2s ease;
	}

	.control-label:hover:not(:disabled) {
		color: #374151;
	}

	.control-label:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}

	.dot-slider {
		display: flex;
		align-items: center;
		gap: 0;
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 1.5px solid #d1d5db;
		background: transparent;
		cursor: pointer;
		padding: 0;
		transition: all 0.2s ease;
	}

	.dot:hover:not(:disabled) {
		border-color: #374151;
		transform: scale(1.15);
	}

	.dot.active {
		background: #374151;
		border-color: #374151;
	}

	.dot.current {
		box-shadow: 0 0 0 3px rgba(55, 65, 81, 0.2);
	}

	.dot:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.dot-connector {
		width: 16px;
		height: 1.5px;
		background: #e5e7eb;
		transition: background 0.2s ease;
	}

	.dot-connector.active {
		background: #374151;
	}

	/* Mobile control */
	.mobile-control {
		display: none;
		flex-direction: row;
		justify-content: center;
		gap: 1.5rem;
		margin-top: 1rem;
	}

	.text-link {
		background: none;
		border: none;
		color: #6b7280;
		font-size: 0.9rem;
		cursor: pointer;
		padding: 0.5rem 0;
		font-family: inherit;
		transition: color 0.2s ease;
	}

	.text-link:hover:not(:disabled) {
		color: #0066cc;
	}

	.text-link:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.arrow {
		display: inline-block;
		font-weight: 600;
	}

	/* Responsive */
	@media (max-width: 767px) {
		.desktop-control {
			display: none;
		}

		.mobile-control {
			display: flex;
		}
	}
</style>
