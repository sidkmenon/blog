export interface PostMetadata {
	title: string;
	description: string;
	date: string;
	tags?: string[];
}

export interface Post extends PostMetadata {
	slug: string;
}

export async function getAllPosts(): Promise<Post[]> {
	const postModules = import.meta.glob<{ metadata: PostMetadata }>(
		['/src/routes/posts/**/+page.svx', '!/src/routes/posts/+page.svx'],
		{ eager: true }
	);

	const posts = Object.entries(postModules).map(([path, module]) => {
		const slug = path.match(/\/posts\/(.+)\/\+page\.svx$/)?.[1];
		if (!slug) throw new Error(`Invalid post path: ${path}`);

		return {
			slug,
			...module.metadata
		};
	});

	return posts
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
