// Minimal Markdown -> HTML for the controlled subset our CVs use (headings, bold, links, lists,
// blockquote, hr). Not a general Markdown engine; it only needs to handle renderCv()/generation
// output. Wrapped in a clean, print-ready stylesheet so the browser's "Print to PDF" yields a
// polished one-page CV with zero heavy dependencies.

function inline(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function bodyToHtml(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inList = false;
  const closeList = (): void => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('<!--')) continue;
    if (/^#\s+/.test(line)) {
      closeList();
      out.push(`<h1>${inline(line.replace(/^#\s+/, ''))}</h1>`);
    } else if (/^##\s+/.test(line)) {
      closeList();
      out.push(`<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`);
    } else if (/^###\s+/.test(line)) {
      closeList();
      out.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`);
    } else if (/^>\s?/.test(line)) {
      closeList();
      out.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`);
    } else if (line === '') {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join('\n');
}

const STYLE = `
  :root { --ink:#1a1a1a; --muted:#555; --rule:#e2e2e2; --accent:#0b6; }
  * { box-sizing: border-box; }
  body { font: 15px/1.5 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: var(--ink);
         max-width: 760px; margin: 40px auto; padding: 0 24px; }
  h1 { font-size: 26px; margin: 0 0 2px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: var(--accent);
       border-bottom: 1px solid var(--rule); padding-bottom: 4px; margin: 22px 0 10px; }
  h3 { font-size: 15px; margin: 14px 0 4px; }
  p { margin: 4px 0; }
  blockquote { margin: 8px 0 14px; padding-left: 12px; border-left: 3px solid var(--rule);
               color: var(--muted); font-style: italic; }
  ul { margin: 4px 0 10px; padding-left: 18px; }
  li { margin: 3px 0; }
  a { color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--rule); }
  strong { font-weight: 600; }
  @media print { body { margin: 0; max-width: none; } a { border: none; } }
`;

export function mdToHtml(md: string, title = 'CV'): string {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${STYLE}</style>
</head><body>
${bodyToHtml(md)}
</body></html>
`;
}
