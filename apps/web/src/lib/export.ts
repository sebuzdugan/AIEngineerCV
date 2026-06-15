// Client-side exports. Markdown is a Blob download. PDF reuses the browser's print engine on a
// hidden, print-styled copy of the rendered CV - zero dependencies, pixel-perfect, and free.

import { renderMarkdown } from './markdown.js';

export function downloadMarkdown(md: string, filename = 'cv.md'): void {
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PRINT_CSS = `
  #print-root { font: 14px/1.5 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; max-width: 720px; margin: 0 auto; }
  #print-root h1 { font-size: 24px; margin: 0 0 2px; }
  #print-root h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #0a7; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin: 18px 0 8px; }
  #print-root h3 { font-size: 14px; margin: 12px 0 3px; }
  #print-root ul { margin: 4px 0 9px; padding-left: 18px; }
  #print-root blockquote { margin: 7px 0 12px; padding-left: 10px; border-left: 2px solid #ddd; color: #555; font-style: italic; }
  #print-root a { color: #111; text-decoration: none; }
`;

/** Open the system print dialog (Save as PDF) on a print-styled copy of the CV. */
export function printToPdf(md: string): void {
  const holder = document.createElement('div');
  holder.id = 'print-root';
  holder.innerHTML = `<style>${PRINT_CSS}</style>` + renderMarkdown(md);
  document.body.appendChild(holder);
  const cleanup = (): void => {
    holder.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
  // Fallback cleanup if afterprint never fires (some browsers).
  setTimeout(cleanup, 60000);
}
