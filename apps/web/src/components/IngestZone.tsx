import { useRef, useState } from 'react';
import { validateProfile, type Profile } from '@aiengineercv/core';
import { readFileText, heuristicExtract } from '../lib/parse.js';
import { extractProfile } from '../lib/llm.js';

interface Props {
  apiKey: string;
  model: string;
  onProfile: (p: Profile, note: string) => void;
  onError: (msg: string) => void;
}

export function IngestZone({ apiKey, model, onProfile, onError }: Props): JSX.Element {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function ingestText(raw: string): Promise<void> {
    if (!raw.trim()) return;
    if (apiKey) {
      setBusy('Parsing with your model…');
      try {
        const extracted = await extractProfile(apiKey, raw, model);
        const { valid } = validateProfile(extracted);
        onProfile(extracted as Profile, valid ? 'Parsed with AI.' : 'Parsed with AI (review the draft).');
        return;
      } catch (e) {
        onError(`AI parse failed: ${(e as Error).message}. Falling back to a quick heuristic parse.`);
      } finally {
        setBusy(null);
      }
    }
    const partial = heuristicExtract(raw);
    onProfile(
      { schemaVersion: '1.0', identity: { name: '', source: 'asked', confidence: 1 }, target: { role: 'other' }, ...partial } as Profile,
      apiKey ? '' : 'Captured contact + links. Add a key for a full parse, or fill the form below.',
    );
  }

  async function handleFiles(files: FileList | null): Promise<void> {
    if (!files?.length) return;
    setBusy('Reading files…');
    try {
      const parts: string[] = [];
      for (const f of Array.from(files)) parts.push(await readFileText(f));
      await ingestText(parts.join('\n\n----\n\n'));
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border border-dashed p-6 text-center transition ${
          dragging ? 'border-[#9fe870] bg-[#101813]' : 'border-[#2a3034] bg-[#0e1113] hover:border-[#39424a]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.md,.txt,.csv,.json"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <div className="text-sm text-[#cdd2d5]">{busy ?? 'Drop your CV, LinkedIn export, or notes'}</div>
        <div className="mt-1 text-[11px] text-[#6f767c]">PDF / DOCX / Markdown / TXT - parsed in your browser, nothing uploaded</div>
      </div>

      <div className="mt-3">
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="…or paste anything about yourself (your GitHub, projects, free text)"
          className="h-24 w-full resize-none rounded-lg border border-[#23282b] bg-[#0e1113] p-3 text-[13px] text-[#dfe3e5] outline-none placeholder:text-[#5b6268] focus:border-[#39424a]"
        />
        <button
          onClick={() => void ingestText(pasted)}
          disabled={!pasted.trim() || !!busy}
          className="mono mt-2 rounded-lg border border-[#2f5a32] bg-[#0f1a10] px-3 py-1.5 text-[12px] text-[#bfe8c2] transition hover:bg-[#13230f] disabled:opacity-40"
        >
          parse pasted text
        </button>
      </div>
    </div>
  );
}
