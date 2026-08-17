const svxModules = import.meta.glob<{ metadata: { title: string; description: string } }>(
	'./**/+page.svx',
	{ eager: true }
);

export const prerender = true;

export const load = async ({ url }) => {
	const pathname = url.pathname === '/' ? '' : url.pathname;
	const svxPath = `.${pathname}/+page.svx`;

	const module = svxModules[svxPath];

	return {
		isArticle: pathname.startsWith('/posts/'),
		metadata: module?.metadata ?? {
			title: 'Page not found · Sid Menon',
			description: "This page doesn't exist."
		}
	};
};
