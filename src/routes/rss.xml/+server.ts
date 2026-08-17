import { getAllPosts } from '$lib/posts';
import { renderRss } from '$lib/rss';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = async () =>
	new Response(renderRss(await getAllPosts()), {
		headers: {
			'content-type': 'application/rss+xml; charset=utf-8'
		}
	});
