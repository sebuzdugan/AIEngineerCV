import { useEffect, useMemo, useState } from 'react';
import { renderCv, classify, type Profile } from '@aiengineercv/core';
import { ScorePanel } from './components/ScorePanel.js';
import { Preview } from './components/Preview.js';
import { IngestZone } from './components/IngestZone.js';
import { TargetForm } from './components/TargetForm.js';
import { generateCv, DEFAULT_MODEL } from './lib/llm.js';
import { sampleProfile, emptyProfile } from './lib/sample.js';

const KEY_STORAGE = 'aicv.key';

export function App(): JSX.Element {
  const [profile, setProfileRaw] = useState<Profile>(sampleProfile);
  const [aiCv, setAiCv] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [remember, setRemember] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(KEY_STORAGE);
    if (saved) {
      setApiKey(saved);
      setRemember(true);
    }
  }, []);

  // Any profile edit invalidates a prior AI rewrite.
  const setProfile = (p: Profile): void => {
    setProfileRaw(p);
    setAiCv(null);
  };

  const onKey = (v: string): void => {
    setApiKey(v);
    if (remember) localStorage.setItem(KEY_STORAGE, v);
  };
  const onRemember = (v: boolean): void => {
    setRemember(v);
    if (v) localStorage.setItem(KEY_STORAGE, apiKey);
    else localStorage.removeItem(KEY_STORAGE);
  };

  const guard = useMemo(() => classify(profile), [profile]);
  const markdown = aiCv ?? renderCv(profile);

  async function onGenerate(): Promise<void> {
    setError(null);
    if (!apiKey) {
      setError('Add your Anthropic API key above to generate the impact-framed rewrite. The deterministic CV on the right works without one.');
      return;
    }
    if (guard.class === 'out-of-scope') {
      setError(guard.message);
      return;
    }
    setBusy(true);
    try {
      setAiCv(await generateCv(apiKey, profile, model));
      setNote('Generated with your model.');
    } catch (e) {
      setError(`Generation failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full">
      {/* Hero */}
      <header className="grid-bg border-b border-[#15191b]">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-12">
          <div className="mono text-[12px] tracking-[0.2em] text-[#9fe870]">AIENGINEERCV</div>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-[#f2f4f5] sm:text-5xl">
            A CV builder for AI engineers.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-[#aeb4b8]">
            Drop your old CV, a LinkedIn export, or just paste your background. Get a sharp,
            role-targeted CV and your <span className="text-[#9fe870]">AI Recruiter Score</span> -
            scored by baked-in hiring judgment, not generic resume tips.
          </p>
          <p className="mono mt-4 text-[12px] text-[#6f767c]">
            bring your own key / runs in your browser / nothing proxied, stored, or uploaded
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-7">
        {/* Key bar */}
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[#1d2225] bg-[#0e1113] p-4 sm:flex-row sm:items-center">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => onKey(e.target.value)}
            placeholder="sk-ant-…  (optional - enables AI parse + rewrite)"
            className="mono flex-1 rounded-lg border border-[#23282b] bg-[#0a0c0d] px-3 py-2 text-[13px] text-[#dfe3e5] outline-none placeholder:text-[#5b6268] focus:border-[#39424a]"
          />
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="mono w-full rounded-lg border border-[#23282b] bg-[#0a0c0d] px-3 py-2 text-[12px] text-[#aeb4b8] outline-none focus:border-[#39424a] sm:w-52"
          />
          <label className="flex items-center gap-1.5 whitespace-nowrap text-[12px] text-[#8a9197]">
            <input type="checkbox" checked={remember} onChange={(e) => onRemember(e.target.checked)} />
            remember
          </label>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: input */}
          <div className="space-y-5">
            <IngestZone apiKey={apiKey} model={model} onProfile={(p, n) => { setProfile(p); setNote(n || null); setError(null); }} onError={setError} />
            <TargetForm profile={profile} onChange={setProfile} />

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => void onGenerate()}
                disabled={busy}
                className="mono rounded-lg border border-[#2f5a32] bg-[#10220f] px-4 py-2 text-[13px] text-[#bfe8c2] transition hover:bg-[#163217] disabled:opacity-50"
              >
                {busy ? 'generating…' : 'generate with AI'}
              </button>
              <button onClick={() => { setProfile(sampleProfile); setNote('Loaded a sample profile.'); }} className="mono text-[12px] text-[#7d858b] hover:text-[#aeb4b8]">
                load sample
              </button>
              <button onClick={() => { setProfile(emptyProfile()); setNote(null); }} className="mono text-[12px] text-[#7d858b] hover:text-[#aeb4b8]">
                start blank
              </button>
            </div>

            {note && <div className="text-[12px] text-[#8a9197]">{note}</div>}
            {error && <div className="rounded-lg border border-[#5a2f2f] bg-[#1a0f0f] p-3 text-[12px] text-[#f0b8b8]">{error}</div>}
            {guard.class !== 'in-scope' && (
              <div className="rounded-lg border border-[#5a4f2f] bg-[#1a160f] p-3 text-[12px] text-[#f0e0b8]">{guard.message}</div>
            )}
          </div>

          {/* Right: score + preview */}
          <div className="space-y-5">
            <ScorePanel profile={profile} />
            <Preview markdown={markdown} aiGenerated={aiCv !== null} />
          </div>
        </div>
      </main>

      <footer className="border-t border-[#15191b] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 text-center text-[12px] text-[#6f767c]">
          <div>
            Built by{' '}
            <a className="text-[#9fe870]" href="https://x.com/sebuzdugan" target="_blank" rel="noreferrer">
              @sebuzdugan
            </a>{' '} / open source / {' '}
            <a className="text-[#aeb4b8] underline" href="https://github.com/sebuzdugan/AIEngineerCV" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
          <div className="mono text-[11px] text-[#565c61]">AI/ML engineers only / MIT licensed / PRs welcome to the taxonomy &amp; rubric</div>
        </div>
      </footer>
    </div>
  );
}
