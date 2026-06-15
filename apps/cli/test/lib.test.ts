import { describe, it, expect } from 'vitest';
import { mdToHtml } from '../src/lib/md2html.js';
import { setByPath } from '../src/lib/setPath.js';
import { heuristicExtract, readSourceFile } from '../src/lib/ingest.js';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('mdToHtml', () => {
  const html = mdToHtml('# Title\n\n## Section\n\n- a bullet with **bold** and a [link](https://x.com)\n\n> a quote');
  it('converts headings, lists, bold, links, and blockquotes', () => {
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<h2>Section</h2>');
    expect(html).toContain('<li>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<a href="https://x.com">link</a>');
    expect(html).toContain('<blockquote>a quote</blockquote>');
  });
  it('escapes angle brackets in text', () => {
    expect(mdToHtml('a < b > c')).toContain('a &lt; b &gt; c');
  });
  it('wraps a full HTML document with the print stylesheet', () => {
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('@media print');
  });
});

describe('setByPath', () => {
  it('sets nested scalar paths, creating intermediate objects', () => {
    const o: Record<string, unknown> = {};
    setByPath(o, 'target.role', 'mlops-engineer');
    setByPath(o, 'identity.email', 'a@b.com');
    expect(o).toEqual({ target: { role: 'mlops-engineer' }, identity: { email: 'a@b.com' } });
  });
  it('overwrites an existing leaf without dropping siblings', () => {
    const o: Record<string, unknown> = { target: { role: 'x', seniority: 'senior' } };
    setByPath(o, 'target.role', 'y');
    expect(o).toEqual({ target: { role: 'y', seniority: 'senior' } });
  });
});

describe('heuristicExtract', () => {
  const text = 'Maya Okafor\nmaya@example.com\nSenior LLM Engineer\nhttps://github.com/maya https://linkedin.com/in/maya';
  const p = heuristicExtract(text);
  it('captures name, email, and typed links - and never invents anything else', () => {
    expect(p.identity.name).toBe('Maya Okafor');
    expect(p.identity.email).toBe('maya@example.com');
    expect(p.links?.find((l) => l.type === 'github')?.url).toContain('github.com/maya');
    expect(p.links?.find((l) => l.type === 'linkedin')).toBeTruthy();
    expect(p.experience).toBeUndefined(); // no fabricated experience
    expect(p.skills).toBeUndefined();
  });
});

describe('readSourceFile', () => {
  it('reads plain text and markdown', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'aicv-'));
    const f = join(dir, 'notes.md');
    writeFileSync(f, '# hi\nsome notes');
    expect(await readSourceFile(f)).toContain('some notes');
  });
  it('rejects unsupported file types', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'aicv-'));
    const f = join(dir, 'thing.xyz');
    writeFileSync(f, 'x');
    await expect(readSourceFile(f)).rejects.toThrow(/Unsupported/);
  });
});
