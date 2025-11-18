import { visit } from 'unist-util-visit';
import type { Root, Paragraph, Text, Html, Parent, LinkReference } from 'mdast';
import type { Plugin } from 'unified';

interface LinkRefFootnoteReplacement {
  node: LinkReference;
  index: number;
  parent: Parent;
}

interface NodeToRemove {
  parent: Parent;
  index: number;
}

interface FootnoteDef {
  id: string;
  definition: string;
}

function maybeGetFootnoteDefinition(node: Paragraph): FootnoteDef | null {
  if (!node.children || node.children.length < 2) return null;

  const firstChild = node.children[0];
  const secondChild = node.children[1];

  if (
    firstChild.type != 'linkReference' ||
    !firstChild.identifier?.startsWith('^') ||
    secondChild.type != 'text'
  ) return null;

  return {
    id: firstChild.identifier!.slice(1), // remove "^" tag
    definition: secondChild.value.slice(2).trim(), // remove ": " prefix
  }
}

/**
 * Create the HTML for a sidenote reference and content
 */
function createSidenoteHtml(id: string, definition: string): string {
  return `<a href="#fn-${id}" class="sidenote-ref" aria-label="link to citation ${id}"><sup class="sidenote-number"></sup></a><span class="sidenote" id="sn-${id}"><sup>${id}</sup> ${definition}</span>`;
}

/**
 * Create the HTML for the footnotes section at the bottom of the page
 */
function createFootnotesSection(footnotes: Map<string, string>): string {
  const footnotesList = Array.from(footnotes.entries())
    .map(([id, content]) => `    <li id="fn-${id}">${content}</li>`)
    .join('\n');

  return `<section class="footnotes">\n  <ol>\n${footnotesList}\n  </ol>\n</section>`;
}

export const remarkFootnotes: Plugin<[], Root> = () => {
  return (tree: Root) => {
    const footnotes = new Map<string, string>();
    const nodesToRemove: NodeToRemove[] = [];
    const linkRefNodesToReplace: LinkRefFootnoteReplacement[] = [];

    // Pass 1: Collect footnote definitions and mark for removal
    // Definitions are paragraphs that start with linkReference followed by text with ": definition"
    visit(tree, 'paragraph', (node: Paragraph, index: number | undefined, parent: Parent | undefined) => {
      // Early exits for invalid nodes
      if (index === undefined || !parent) return;

      const note = maybeGetFootnoteDefinition(node);
      if (note == null) return;

      footnotes.set(note.id, note.definition);
      nodesToRemove.push({ parent, index });
    });

    // Pass 2: Find footnote references (linkReference nodes from mdsvex)
    // Skip linkReferences that are part of definition paragraphs
    visit(tree, 'linkReference', (node: LinkReference, index: number | undefined, parent: Parent | undefined) => {
      // Early exits
      if (!parent || index === undefined) return;
      if (!node.identifier || !node.identifier.startsWith('^')) return;

      // Skip if this is a definition (first child of paragraph followed by ": " text)
      if (parent.type === 'paragraph' && index === 0 && parent.children.length >= 2) {
        const nextSibling = parent.children[1];
        if (nextSibling.type === 'text' && nextSibling.value.startsWith(': ')) {
          return; // This is a definition, not a reference
        }
      }

      linkRefNodesToReplace.push({ node, index, parent });
    });

    // Remove footnote definition nodes in reverse order to avoid index shifting
    nodesToRemove.reverse().forEach(({ parent, index }) => {
      parent.children.splice(index, 1);
    });

    // Replace linkReference nodes with sidenote HTML in reverse order
    linkRefNodesToReplace.reverse().forEach(({ node, index, parent }) => {
      const id = node.identifier!.slice(1); // Remove ^ prefix
      const definition = footnotes.get(id) || '';

      const sidenoteHtml: Html = {
        type: 'html',
        value: createSidenoteHtml(id, definition)
      };

      parent.children.splice(index, 1, sidenoteHtml);
    });

    // Add footnotes section at the end for mobile fallback
    if (footnotes.size > 0) {
      const footnotesSection: Html = {
        type: 'html',
        value: createFootnotesSection(footnotes)
      };

      tree.children.push(footnotesSection);
    }
  };
};
