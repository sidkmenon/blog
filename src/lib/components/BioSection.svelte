<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Parser } from 'htmlparser2';

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

	const AVERAGE_WORD_LENGTH = 5;
	const TYPING_WPM = 400;
	const DELETE_WPM = 600;

	function wpmToTokenDelay(wpm: number): number {
		return 60000 / (wpm * AVERAGE_WORD_LENGTH);
	}

	const TYPING_TOKEN_DELAY = wpmToTokenDelay(TYPING_WPM);
	const DELETE_TOKEN_DELAY = wpmToTokenDelay(DELETE_WPM);

	let animationFrame: number | null = null;

	/**
	 * Tokenize HTML text into typing units using htmlparser2.
	 * Regular characters become individual tokens, HTML tags become single tokens.
	 */
	function tokenizeHtml(html: string): string[] {
		const tagRanges: Array<{ start: number; end: number }> = [];

		const parser = new Parser(
			{
				onopentag() {
					tagRanges.push({ start: parser.startIndex!, end: parser.endIndex! + 1 });
				},
				onclosetag() {
					tagRanges.push({ start: parser.startIndex!, end: parser.endIndex! + 1 });
				}
			},
			{ recognizeSelfClosing: true }
		);

		parser.write(html);
		parser.end();

		// Sort by start position (should already be sorted, but be safe)
		tagRanges.sort((a, b) => a.start - b.start);

		// Build tokens: individual characters for text, full strings for tags
		const tokens: string[] = [];
		let pos = 0;

		for (const range of tagRanges) {
			// Add text characters before this tag
			for (let i = pos; i < range.start; i++) {
				tokens.push(html[i]);
			}
			// Add the tag as one unit
			tokens.push(html.slice(range.start, range.end));
			pos = range.end;
		}

		// Add remaining text characters
		for (let i = pos; i < html.length; i++) {
			tokens.push(html[i]);
		}

		return tokens;
	}

	// Convert character position to token count
	function charPosToTokenCount(tokens: string[], charPos: number): number {
		let len = 0;
		for (let i = 0; i < tokens.length; i++) {
			if (len >= charPos) return i;
			len += tokens[i].length;
		}
		return tokens.length;
	}

	function animateToLevel(targetLevel: number) {
		if (isAnimating || targetLevel === currentLevel || targetLevel < 0 || targetLevel > maxLevel)
			return;

		const targetText = levels[targetLevel];
		if (!targetText) return;

		isAnimating = true;

		// Tokenize current and target text
		const currentTokens = tokenizeHtml(displayedText);
		const targetTokens = tokenizeHtml(targetText);

		// Convert character-based common length to token count
		const commonCharLength = prefixMatrix[currentLevel][targetLevel];
		const commonTokenCount = charPosToTokenCount(currentTokens, commonCharLength);

		let tokenPosition = currentTokens.length;
		let lastTime = 0;
		let accumulatedTime = 0;
		let phase: 'deleting' | 'typing' = 'deleting';

		function step(timestamp: number) {
			if (!lastTime) lastTime = timestamp;

			const elapsed = timestamp - lastTime;
			const tokenDelay = phase === 'deleting' ? DELETE_TOKEN_DELAY : TYPING_TOKEN_DELAY;

			lastTime = timestamp;
			accumulatedTime += elapsed;

			if (phase === 'deleting') {
				if (tokenPosition > commonTokenCount) {
					const tokensToDelete = Math.min(
						Math.floor(accumulatedTime / tokenDelay),
						tokenPosition - commonTokenCount
					);

					if (tokensToDelete === 0) {
						animationFrame = requestAnimationFrame(step);
						return;
					}

					accumulatedTime -= tokensToDelete * tokenDelay;
					tokenPosition -= tokensToDelete;
					displayedText = currentTokens.slice(0, tokenPosition).join('');
					animationFrame = requestAnimationFrame(step);
				} else {
					phase = 'typing';
					accumulatedTime = 0;
					animationFrame = requestAnimationFrame(step);
				}
			} else {
				if (tokenPosition < targetTokens.length) {
					const tokensToType = Math.min(
						Math.floor(accumulatedTime / tokenDelay),
						targetTokens.length - tokenPosition
					);

					if (tokensToType === 0) {
						animationFrame = requestAnimationFrame(step);
						return;
					}

					accumulatedTime -= tokensToType * tokenDelay;
					tokenPosition += tokensToType;
					displayedText = targetTokens.slice(0, tokenPosition).join('');
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
			title="Show less detail in the bio"
			aria-label="Show less detail">less detail</button
		>
		<div class="dot-slider">
			{#each levelIndices as level (level)}
				<button
					class="dot"
					class:active={currentLevel >= level}
					class:current={currentLevel === level}
					onclick={() => handleLevelClick(level)}
					title="Set the bio detail level to {level + 1} / {levels.length}"
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
			title="Show more detail in the bio"
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

	.bio-text :global(a) {
		text-decoration: none;
	}

	.bio-text :global(a:hover) {
		text-decoration: underline;
	}

	/* Desktop dot slider */
	.desktop-control {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 1.5rem;
		padding: 0.5rem 1.25rem;
		background: #f9fafb;
		border-radius: 100px;
		width: fit-content;
		margin-left: auto;
		margin-right: auto;
	}

	.control-label {
		font-size: 0.85rem;
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

	.control-label:not(:disabled) {
		color: #4b5563;
	}

	@media (hover: hover) {
		.control-label:hover:not(:disabled) {
			color: #111827;
		}
	}

	.control-label:active:not(:disabled) {
		color: #111827;
	}

	.control-label:disabled {
		cursor: not-allowed;
		opacity: 0.5;
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
		gap: 1.25rem;
		margin-top: 1.25rem;
		padding: 0.5rem 1rem;
		background: #f9fafb;
		border-radius: 100px;
		width: fit-content;
		margin-left: auto;
		margin-right: auto;
	}

	.text-link {
		background: none;
		border: none;
		color: #4b5563;
		font-size: 0.875rem;
		cursor: pointer;
		padding: 0.25rem 0;
		font-family: inherit;
		transition: color 0.2s ease;
	}

	@media (hover: hover) {
		.text-link:hover:not(:disabled) {
			color: #111827;
		}
	}

	.text-link:active:not(:disabled) {
		color: #111827;
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
