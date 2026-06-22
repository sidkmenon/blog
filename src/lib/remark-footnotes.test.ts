import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Html, Paragraph, Root } from 'mdast';
import { remarkFootnotes } from './remark-footnotes';
import fixture from './__fixtures__/risking-ridicule.json';

function getHtmlChild(paragraph: Paragraph): Html {
	const html = paragraph.children.find((child): child is Html => child.type === 'html');
	if (!html) throw new Error('Expected paragraph to contain an HTML child');
	return html;
}

describe('remarkFootnotes', () => {
	it('transforms footnote references into sidenotes (golden test)', () => {
		const processor = unified().use(remarkParse).use(remarkFootnotes);

		// Use the captured input AST directly
		const input = fixture.input as Root;
		const expectedOutput = fixture.output as Root;

		// Run the plugin on a clone of the input
		const result = structuredClone(input);
		processor.runSync(result);

		expect(result).toEqual(expectedOutput);
	});

	it('handles documents without footnotes', () => {
		const processor = unified().use(remarkParse).use(remarkFootnotes);

		const input: Root = {
			type: 'root',
			children: [
				{
					type: 'paragraph',
					children: [{ type: 'text', value: 'Just a regular paragraph.' }]
				}
			]
		};

		const result = structuredClone(input);
		processor.runSync(result);

		// Should be unchanged
		expect(result).toEqual(input);
	});

	it('handles comma-separated footnote references', () => {
		const processor = unified().use(remarkParse).use(remarkFootnotes);

		const input: Root = {
			type: 'root',
			children: [
				{
					type: 'paragraph',
					children: [
						{ type: 'text', value: 'Some text' },
						{
							type: 'linkReference',
							identifier: '^1,2',
							label: '^1,2',
							referenceType: 'shortcut',
							children: []
						}
					]
				},
				{ type: 'thematicBreak' },
				{
					type: 'heading',
					depth: 1,
					children: [{ type: 'text', value: 'Footnotes' }]
				},
				{
					type: 'paragraph',
					children: [
						{
							type: 'linkReference',
							identifier: '^1',
							label: '^1',
							referenceType: 'shortcut',
							children: []
						},
						{ type: 'text', value: ': First footnote' },
						{
							type: 'linkReference',
							identifier: '^2',
							label: '^2',
							referenceType: 'shortcut',
							children: []
						},
						{ type: 'text', value: ': Second footnote' }
					]
				},
				{ type: 'thematicBreak' }
			]
		};

		const result = structuredClone(input);
		processor.runSync(result);

		// Find the HTML node that replaced the comma-separated ref
		const htmlNode = result.children.find(
			(n) => n.type === 'paragraph' && n.children.some((c) => c.type === 'html')
		);
		expect(htmlNode).toBeDefined();

		if (!htmlNode || htmlNode.type !== 'paragraph') {
			throw new Error('Expected transformed paragraph with HTML child');
		}

		const html = getHtmlChild(htmlNode);
		expect(html.value).toContain('sidenote-comma');
		expect(html.value).toContain('fn-1');
		expect(html.value).toContain('fn-2');
	});

	it('handles subsequent references to the same footnote', () => {
		const processor = unified().use(remarkParse).use(remarkFootnotes);

		const input: Root = {
			type: 'root',
			children: [
				{
					type: 'paragraph',
					children: [
						{ type: 'text', value: 'First ref' },
						{
							type: 'linkReference',
							identifier: '^1',
							label: '^1',
							referenceType: 'shortcut',
							children: []
						}
					]
				},
				{
					type: 'paragraph',
					children: [
						{ type: 'text', value: 'Second ref to same' },
						{
							type: 'linkReference',
							identifier: '^1',
							label: '^1',
							referenceType: 'shortcut',
							children: []
						}
					]
				},
				{ type: 'thematicBreak' },
				{
					type: 'heading',
					depth: 1,
					children: [{ type: 'text', value: 'Footnotes' }]
				},
				{
					type: 'paragraph',
					children: [
						{
							type: 'linkReference',
							identifier: '^1',
							label: '^1',
							referenceType: 'shortcut',
							children: []
						},
						{ type: 'text', value: ': The footnote content' }
					]
				},
				{ type: 'thematicBreak' }
			]
		};

		const result = structuredClone(input);
		processor.runSync(result);

		// First reference should have full sidenote
		const firstPara = result.children[0];
		if (firstPara.type !== 'paragraph') throw new Error('Expected first child to be a paragraph');
		const firstHtml = getHtmlChild(firstPara);
		expect(firstHtml.value).toContain('class="sidenote"');
		expect(firstHtml.value).not.toContain('sidenote-ref-subsequent');

		// Second reference should be subsequent ref
		const secondPara = result.children[1];
		if (secondPara.type !== 'paragraph') throw new Error('Expected second child to be a paragraph');
		const secondHtml = getHtmlChild(secondPara);
		expect(secondHtml.value).toContain('sidenote-ref-subsequent');
	});
});
