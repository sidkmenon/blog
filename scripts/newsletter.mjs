import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ORIGIN = 'https://sidharthkmenon.com';

function unquote(value) {
	if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
	if (value.startsWith("'") && value.endsWith("'")) {
		return value.slice(1, -1).replaceAll("''", "'");
	}
	return value;
}

export function parsePostFrontmatter(source) {
	const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
	if (!frontmatter) throw new Error('Post is missing frontmatter.');

	const field = (name) => {
		const value = frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]?.trim();
		if (!value) throw new Error(`Post is missing ${name} metadata.`);
		return unquote(value);
	};

	return {
		title: field('title'),
		description: field('description')
	};
}

function escapeHtml(value) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

export function buildBroadcast({ slug, title, description, segmentId, from, send = false }) {
	const postUrl = new URL(`/posts/${slug}`, SITE_ORIGIN).href;
	const safeTitle = escapeHtml(title);
	const safeDescription = escapeHtml(description);

	return {
		segmentId,
		from,
		name: `New essay: ${title}`,
		subject: title,
		html: `<p>${safeDescription}</p><p><a href="${postUrl}">Read “${safeTitle}” →</a></p><p style="color:#6b7078;font-size:12px"><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a></p>`,
		text: `${description}\n\nRead “${title}”: ${postUrl}\n\nUnsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`,
		send
	};
}

async function main() {
	const [slug, mode, ...extra] = process.argv.slice(2);
	if (
		!slug ||
		!['--draft', '--send', '--dry-run'].includes(mode) ||
		extra.length > 0 ||
		!/^[a-z0-9-]+$/.test(slug)
	) {
		throw new Error('Usage: npm run newsletter -- <post-slug> (--draft | --send | --dry-run)');
	}

	const source = await readFile(resolve(`src/routes/posts/${slug}/+page.svx`), 'utf8');
	const metadata = parsePostFrontmatter(source);
	const dryRun = mode === '--dry-run';
	const segmentId = process.env.RESEND_SEGMENT_ID || (dryRun ? 'segment_id' : '');
	const from =
		process.env.RESEND_FROM_EMAIL || (dryRun ? 'Sid Menon <writing@sidharthkmenon.com>' : '');
	const apiKey = process.env.RESEND_API_KEY;

	if (!segmentId || !from || (!dryRun && !apiKey)) {
		throw new Error('RESEND_API_KEY, RESEND_SEGMENT_ID, and RESEND_FROM_EMAIL must be configured.');
	}

	const broadcast = buildBroadcast({
		slug,
		...metadata,
		segmentId,
		from,
		send: mode === '--send'
	});

	if (dryRun) {
		console.log(JSON.stringify(broadcast, null, 2));
		return;
	}

	const { Resend } = await import('resend');
	const resend = new Resend(apiKey);
	const { data, error } = await resend.broadcasts.create(broadcast);
	if (error) throw new Error(error.message);

	console.log(`${mode === '--send' ? 'Sent' : 'Created draft'} broadcast ${data?.id}.`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
