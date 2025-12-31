const svxModules = import.meta.glob<{ metadata: { title: string; description: string } }>(
	'./**/+page.svx',
	{ eager: true }
);

export const load = async ({ url }) => {
	const pathname = url.pathname === '/' ? '' : url.pathname;
	const svxPath = `.${pathname}/+page.svx`;

	const module = svxModules[svxPath];

	if (!module) {
		throw new Error(`No .svx module found for path: ${svxPath}`);
	}

	return {
		metadata: {
			title: module.metadata.title,
			description: module.metadata.description
		}
	};
};
