import type { Post } from './posts';
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from './site';

function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

export function renderRss(posts: Post[]): string {
	const items = posts
		.map((post) => {
			const url = new URL(`/posts/${post.slug}`, SITE_ORIGIN).href;
			const categories =
				post.tags?.map((tag) => `\n\t\t\t<category>${escapeXml(tag)}</category>`).join('') ?? '';

			return `
		<item>
			<title>${escapeXml(post.title)}</title>
			<link>${escapeXml(url)}</link>
			<guid isPermaLink="true">${escapeXml(url)}</guid>
			<pubDate>${new Date(post.date).toUTCString()}</pubDate>
			<description>${escapeXml(post.description)}</description>${categories}
		</item>`;
		})
		.join('');

	const lastBuildDate = posts[0]
		? `\n\t\t<lastBuildDate>${new Date(posts[0].date).toUTCString()}</lastBuildDate>`
		: '';

	return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
	<channel>
		<title>${escapeXml(SITE_NAME)}</title>
		<link>${escapeXml(SITE_ORIGIN)}</link>
		<description>${escapeXml(SITE_DESCRIPTION)}</description>
		<language>en-us</language>
		<generator>SvelteKit</generator>${lastBuildDate}${items}
	</channel>
</rss>
`;
}
