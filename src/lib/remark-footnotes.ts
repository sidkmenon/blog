import { visit } from 'unist-util-visit';
import type { Root, Paragraph, Text, Html, Parent, LinkReference, Link, PhrasingContent, Heading, List, ListItem, Definition } from 'mdast';
import type { Plugin } from 'unified';

interface LinkRefFootnoteReplacement {
  node: LinkReference;
  index: number;
  parent: Parent;
}

function serializeNode(node: PhrasingContent): string {
  switch (node.type) {
    case 'text':
      return node.value;
    case 'link':
      const linkText = (node as Link).children
        .map(child => serializeNode(child as PhrasingContent))
        .join('');
      return `<a href="${(node as Link).url}">${linkText}</a>`;
    default:
      return '';
  }
}

function getHeadingText(node: Heading): string {
  return node.children
    .filter((c): c is Text => c.type === 'text')
    .map(c => c.value)
    .join('')
    .trim();
}

function createSidenoteHtml(id: string, definition: string): string {
  return `<a href="#fn-${id}" class="sidenote-ref" aria-label="link to citation ${id}"><sup class="sidenote-number"></sup></a><span class="sidenote" id="sn-${id}"><sup>${id}</sup> ${definition}</span>`;
}

function createSubsequentRefHtml(id: string): string {
  return `<a href="#fn-${id}" class="sidenote-ref sidenote-ref-subsequent" aria-label="link to citation ${id}"><sup class="sidenote-number-static">${id}</sup></a>`;
}

function createFootnotesSection(footnotes: Map<string, string>): string {
  const footnotesList = Array.from(footnotes.entries())
    .map(([id, content]) => `    <li id="fn-${id}">${content}</li>`)
    .join('\n');

  return `<section class="footnotes">\n  <ol>\n${footnotesList}\n  </ol>\n</section>`;
}

function findFootnotesSection(tree: Root): { start: number; end: number } | null {
  const children = tree.children;

  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.type !== 'thematicBreak') continue;

    const nextNode = children[i + 1];
    if (!nextNode || nextNode.type !== 'heading') continue;

    const headingText = getHeadingText(nextNode as Heading);
    if (!headingText.toLowerCase().startsWith('footnotes')) continue;

    for (let j = i + 2; j < children.length; j++) {
      if (children[j].type === 'thematicBreak') {
        return { start: i, end: j };
      }
    }
    return { start: i, end: children.length - 1 };
  }

  return null;
}

function isFootnoteLinkRef(node: PhrasingContent): node is LinkReference {
  return node.type === 'linkReference' && !!(node as LinkReference).identifier?.startsWith('^');
}

function extractFromParagraph(para: Paragraph, footnotes: Map<string, string>): void {
  if (!para.children || para.children.length < 2) return;

  const firstChild = para.children[0];
  const secondChild = para.children[1];

  if (
    !isFootnoteLinkRef(firstChild) ||
    secondChild.type !== 'text' ||
    !(secondChild as Text).value.startsWith(': ')
  ) return;

  let currentId = (firstChild as LinkReference).identifier!.slice(1);
  let currentChildren: PhrasingContent[] = [];

  for (let i = 1; i < para.children.length; i++) {
    const child = para.children[i] as PhrasingContent;

    if (isFootnoteLinkRef(child)) {
      const definition = currentChildren
        .map((c, j) => {
          const serialized = serializeNode(c);
          if (j === 0 && c.type === 'text') {
            return serialized.replace(/^:\s*/, '');
          }
          return serialized;
        })
        .join('').trim();

      if (definition) {
        footnotes.set(currentId, definition);
      }

      currentId = (child as LinkReference).identifier!.slice(1);
      currentChildren = [];
    } else {
      currentChildren.push(child);
    }
  }

  if (currentChildren.length > 0) {
    const definition = currentChildren
      .map((c, j) => {
        const serialized = serializeNode(c);
        if (j === 0 && c.type === 'text') {
          return serialized.replace(/^:\s*/, '');
        }
        return serialized;
      })
      .join('').trim();

    if (definition) {
      footnotes.set(currentId, definition);
    }
  }
}

export const remarkFootnotes: Plugin<[], Root> = () => {
  return (tree: Root) => {
    const footnotes = new Map<string, string>();
    const linkRefNodesToReplace: LinkRefFootnoteReplacement[] = [];
    const referencedFootnotes = new Set<string>();

    // Find and parse the delimited footnotes section
    const footnotesSection = findFootnotesSection(tree);

    if (footnotesSection) {
      // Extract footnote definitions from paragraphs within the section
      for (let i = footnotesSection.start + 2; i < footnotesSection.end; i++) {
        const node = tree.children[i];
        if (node.type === 'paragraph') {
          extractFromParagraph(node as Paragraph, footnotes);
        }
      }

      // Remove the entire footnotes section
      tree.children.splice(footnotesSection.start, footnotesSection.end - footnotesSection.start + 1);
    }

    // Find footnote references in the document body
    visit(tree, 'linkReference', (node: LinkReference, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      if (!node.identifier || !node.identifier.startsWith('^')) return;

      linkRefNodesToReplace.push({ node, index, parent });
    });

    // Replace linkReference nodes with sidenote HTML
    linkRefNodesToReplace.forEach(({ node, parent }) => {
      const rawId = node.identifier!.slice(1); // Remove leading ^

      // Handle comma-separated IDs like "1,2" or "1, 2"
      const ids = rawId.split(/,\s*/).map(id => id.trim());

      const htmlParts: string[] = [];
      ids.forEach((id, idx) => {
        const definition = footnotes.get(id) || '';

        if (referencedFootnotes.has(id)) {
          htmlParts.push(createSubsequentRefHtml(id));
        } else {
          htmlParts.push(createSidenoteHtml(id, definition));
          referencedFootnotes.add(id);
        }

        // Add superscripted comma between multiple refs (not after the last one)
        if (idx < ids.length - 1) {
          htmlParts.push('<sup class="sidenote-comma">,</sup>');
        }
      });

      const sidenoteHtml: Html = {
        type: 'html',
        value: htmlParts.join('')
      };

      const currentIndex = parent.children.indexOf(node);
      if (currentIndex !== -1) {
        parent.children.splice(currentIndex, 1, sidenoteHtml);
      }
    });

    // Add footnotes section at the end for mobile fallback
    if (footnotes.size > 0) {
      const footnotesHtml: Html = {
        type: 'html',
        value: createFootnotesSection(footnotes)
      };
      tree.children.push(footnotesHtml);
    }
  };
};
