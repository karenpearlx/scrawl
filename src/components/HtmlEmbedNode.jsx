import { useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { IconCode, IconPreview } from '../lib/icons.jsx';

export const STARTER_HTML = `<section style="font-family: system-ui; padding: 24px; color: #21201e">
  <h2 style="margin: 0 0 8px">HTML block</h2>
  <p style="margin: 0; line-height: 1.6">Edit this code and the preview updates live.</p>
</section>`;

export default function HtmlEmbedNode({ node, updateAttributes, editor }) {
  const [view, setView] = useState('split');
  const html = typeof node.attrs.html === 'string' ? node.attrs.html : '';

  if (!editor.isEditable) {
    return (
      <NodeViewWrapper className="html-embed html-embed-readonly" contentEditable={false}>
        <div className="html-embed-label"><IconPreview />HTML preview</div>
        <iframe
          className="html-embed-frame"
          sandbox="allow-scripts"
          srcDoc={html}
          title="Embedded HTML preview"
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="html-embed" contentEditable={false} data-view={view}>
      <div className="html-embed-head">
        <div className="html-embed-label"><IconCode />HTML block</div>
        <div className="html-embed-tabs" role="group" aria-label="HTML block view">
          {['code', 'split', 'preview'].map((option) => (
            <button
              key={option}
              type="button"
              className="html-embed-tab"
              aria-pressed={view === option}
              onClick={() => setView(option)}
            >
              {option[0].toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="html-embed-workspace">
        {view !== 'preview' && (
          <label className="html-embed-code">
            <span className="sr-only">HTML code</span>
            <textarea
              value={html}
              onChange={(event) => updateAttributes({ html: event.target.value })}
              spellCheck="false"
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="HTML code"
            />
          </label>
        )}
        {view !== 'code' && (
          <div className="html-embed-preview">
            <iframe
              className="html-embed-frame"
              sandbox="allow-scripts"
              srcDoc={html}
              title="Embedded HTML preview"
            />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
