import { describe, expect, it } from 'vitest';
import type { Post } from './posts';
import { renderRss } from './rss';

const posts: Post[] = [
	{
		slug: 'new-and-noteworthy',
		title: 'New & noteworthy',
		description: 'Writing about <ideas> & their consequences.',
		date: '2026-08-16',
		tags: ['design & culture']
	},
	{
		slug: 'older-post',
		title: 'Older post',
		description: 'An earlier essay.',
		date: '2025-12-28'
	}
];

describe('renderRss', () => {
	it('renders absolute canonical post links and publication dates', () => {
		const feed = renderRss(posts);

		expect(feed).toContain('<link>https://sidharthkmenon.com/posts/new-and-noteworthy</link>');
		expect(feed).toContain(
			'<guid isPermaLink="true">https://sidharthkmenon.com/posts/new-and-noteworthy</guid>'
		);
		expect(feed).toContain('<pubDate>Sun, 16 Aug 2026 00:00:00 GMT</pubDate>');
		expect(feed.indexOf('new-and-noteworthy')).toBeLessThan(feed.indexOf('older-post'));
	});

	it('escapes text and categories for XML', () => {
		const feed = renderRss(posts);

		expect(feed).toContain('<title>New &amp; noteworthy</title>');
		expect(feed).toContain(
			'<description>Writing about &lt;ideas&gt; &amp; their consequences.</description>'
		);
		expect(feed).toContain('<category>design &amp; culture</category>');
	});
});
