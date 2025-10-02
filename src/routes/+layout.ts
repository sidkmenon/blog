export const load = async ({ url }) => {
	// Construct the path to the .svx file for this route
	const pathname = url.pathname === '/' ? '' : url.pathname;
	const svxPath = `/src/routes${pathname}/+page.svx`;

	const module = await import(/* @vite-ignore */ svxPath);

	return {
		metadata: {
			title: module.metadata.title,
			description: module.metadata.description
		}
	};
};
