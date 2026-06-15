import { useMemo } from 'react';
import { renderMarkdown } from '../lib/markdown.js';
import { downloadMarkdown, printToPdf } from '../lib/export.js';

export function Preview({ markdown, aiGenerated }: { markdown: string; aiGenerated: boolean }): JSX.Element {
  const html = useMemo(() => renderMarkdown(markdown), [markdown]);

  return (
    <div className="rounded-xl border border-[#1d2225] bg-[#0e1113]">
      <div className="flex items-center justify-between border-b border-[#1d2225] px-4 py-2.5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[#7d858b]">
          Live CV preview
          <span className="mono rounded px-1.5 py-0.5 text-[9px]" style={{ color: aiGenerated ? '#9fe870' : '#7d858b', border: '1px solid #23282b' }}>
            {aiGenerated ? 'ai rewrite' : 'deterministic'}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadMarkdown(markdown)} className="mono rounded-md border border-[#23282b] px-2.5 py-1 text-[11px] text-[#c4cacd] hover:bg-[#15191b]">
            .md
          </button>
          <button onClick={() => printToPdf(markdown)} className="mono rounded-md border border-[#23282b] px-2.5 py-1 text-[11px] text-[#c4cacd] hover:bg-[#15191b]">
            pdf
          </button>
        </div>
      </div>
      <div
        className="cv max-h-[70vh] overflow-y-auto bg-white px-7 py-6 text-[#1a1a1a]"
        style={{ borderRadius: '0 0 0.75rem 0.75rem' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
