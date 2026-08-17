import { describe, expect, it } from 'vitest';
import { buildBroadcast, parsePostFrontmatter } from './newsletter.mjs';

describe('newsletter publishing', () => {
	it('reads the title and description from post frontmatter', () => {
		expect(
			parsePostFrontmatter(`---
title: "An essay"
description: "What I learned"
date: 2026-08-16
---
# An essay`)
		).toEqual({ title: 'An essay', description: 'What I learned' });
	});

	it('builds an escaped, reviewable Resend broadcast', () => {
		const broadcast = buildBroadcast({
			slug: 'an-essay',
			title: 'An essay & notes',
			description: 'What <I> learned',
			segmentId: 'segment_blog',
			from: 'Sid Menon <writing@sidharthkmenon.com>'
		});

		expect(broadcast.send).toBe(false);
		expect(broadcast.segmentId).toBe('segment_blog');
		expect(broadcast.html).toContain('What &lt;I&gt; learned');
		expect(broadcast.html).toContain('https://sidharthkmenon.com/posts/an-essay');
		expect(broadcast.html).toContain('{{{RESEND_UNSUBSCRIBE_URL}}}');
	});
});
