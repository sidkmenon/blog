import { getAllPosts } from '$lib/posts';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async () => ({
	posts: await getAllPosts()
});
