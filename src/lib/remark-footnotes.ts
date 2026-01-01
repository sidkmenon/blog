import { visit, SKIP } from 'unist-util-visit';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import type { Root, Paragraph, Text, Parent, LinkReference, PhrasingContent, Heading } from 'mdast';
import type { Plugin } from 'unified';

interface ExtractedFootnotes {
	definitions: Map<string, string>;
	sectionStart: number;
	sectionEnd: number;
}

function parseFootnoteContent(children: PhrasingContent[]): string {
	const hast = toHast({ type: 'paragraph', children });
	return toHtml(hast)
		.replace(/^<p>|<\/p>$/g, '')
		.replace(/^:\s*/, '')
		.trim();
}

function isFootnotesHeading(node: Heading): boolean {
	const text = node.children
		.filter((c): c is Text => c.type === 'text')
		.map((c) => c.value)
		.join('');
	return text.toLowerCase().startsWith('footnotes');
}

function parseFootnotesFromParagraph(para: Paragraph): Map<string, string> {
	const footnotes = new Map<string, string>();
	let currentId: string | null = null;
	let currentContent: PhrasingContent[] = [];

	for (const child of para.children) {
		if (child.type === 'linkReference' && child.identifier?.startsWith('^')) {
			if (currentId !== null) {
				footnotes.set(currentId, parseFootnoteContent(currentContent));
			}
			currentId = child.identifier.slice(1);
			currentContent = [];
		} else if (currentId !== null) {
			currentContent.push(child as PhrasingContent);
		}
	}

	if (currentId !== null) {
		footnotes.set(currentId, parseFootnoteContent(currentContent));
	}

	return footnotes;
}

function extractFootnotes(tree: Root): ExtractedFootnotes | null {
	const definitions = new Map<string, string>();
	let sectionStart = -1;
	let sectionEnd = -1;

	for (let i = 0; i < tree.children.length; i++) {
		const node = tree.children[i];

		if (sectionStart === -1) {
			if (node.type !== 'thematicBreak') continue;
			const next = tree.children[i + 1];
			if (next?.type === 'heading' && isFootnotesHeading(next as Heading)) {
				sectionStart = i;
			}
			continue;
		}

		if (node.type === 'thematicBreak') {
			sectionEnd = i;
			break;
		}

		if (node.type === 'paragraph') {
			for (const [id, content] of parseFootnotesFromParagraph(node as Paragraph)) {
				definitions.set(id, content);
			}
		}
	}

	if (sectionStart === -1) return null;

	return {
		definitions,
		sectionStart,
		sectionEnd: sectionEnd !== -1 ? sectionEnd : tree.children.length - 1
	};
}

function renderSidenoteRef(id: string, content: string, isSubsequent: boolean): string {
	if (isSubsequent) {
		return `<a href="#fn-${id}" class="sidenote-ref sidenote-ref-subsequent" aria-label="link to citation ${id}"><sup class="sidenote-number-static">${id}</sup></a>`;
	}
	return `<a href="#fn-${id}" class="sidenote-ref" aria-label="link to citation ${id}"><sup class="sidenote-number"></sup></a><span class="sidenote" id="sn-${id}"><sup>${id}</sup> ${content}</span>`;
}

function replaceFootnoteReferences(
	tree: Root,
	definitions: Map<string, string>,
	seen: Set<string>
): void {
	visit(tree, 'linkReference', (node: LinkReference, index, parent) => {
		if (!parent || index === undefined) return;
		if (!node.identifier?.startsWith('^')) return;

		const ids = node.identifier.slice(1).split(/,\s*/);
		const htmlParts = ids.map((id, i) => {
			const content = definitions.get(id) || '';
			const isSubsequent = seen.has(id);
			seen.add(id);

			const ref = renderSidenoteRef(id, content, isSubsequent);
			return i < ids.length - 1 ? ref + '<sup class="sidenote-comma">,</sup>' : ref;
		});

		(parent as Parent).children.splice(index, 1, { type: 'html', value: htmlParts.join('') });
		return SKIP;
	});
}

function appendMobileFallback(tree: Root, definitions: Map<string, string>): void {
	const items = Array.from(definitions.entries())
		.map(([id, content]) => `    <li id="fn-${id}">${content}</li>`)
		.join('\n');

	tree.children.push({
		type: 'html',
		value: `<section class="footnotes">\n  <ol>\n${items}\n  </ol>\n</section>`
	});
}

export const remarkFootnotes: Plugin<[], Root> = () => {
	return (tree: Root) => {
		const extracted = extractFootnotes(tree);
		if (!extracted) return;

		const { definitions, sectionStart, sectionEnd } = extracted;

		tree.children.splice(sectionStart, sectionEnd - sectionStart + 1);
		replaceFootnoteReferences(tree, definitions, new Set<string>());
		if (definitions.size > 0) {
			appendMobileFallback(tree, definitions);
		}
	};
};
