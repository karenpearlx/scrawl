import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import HtmlEmbedNode, { STARTER_HTML } from '../components/HtmlEmbedNode.jsx';

export const HtmlEmbed = Node.create({
  name: 'htmlEmbed',
  priority: 1000,
  group: 'block',
  atom: true,
  isolating: true,
  draggable: true,

  addAttributes() {
    return {
      html: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-html') || '',
        renderHTML: (attributes) => ({ 'data-html': attributes.html }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-html-embed]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-html-embed': '' })];
  },

  addCommands() {
    return {
      insertHtmlEmbed: (attributes = {}) => ({ commands }) => commands.insertContent([
        {
          type: this.name,
          attrs: { html: attributes.html ?? STARTER_HTML },
        },
        { type: 'paragraph' },
      ]),
    };
  },

  addInputRules() {
    return [nodeInputRule({
      find: /^\/html\s$/,
      type: this.type,
      getAttributes: () => ({ html: STARTER_HTML }),
    })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(HtmlEmbedNode);
  },
});
