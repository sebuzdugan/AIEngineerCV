import { useEffect, useState } from 'react';
import { classify, type Profile } from '@aiengineercv/core';

const API = import.meta.env.VITE_API_BASE as string | undefined;
const STORE = 'aicv.free';

interface Saved {
  token: string;
  email: string;
  tries: number;
  follows: string[];
}

const FOLLOWS = [
  { id: 'x', label: 'Follow on X', url: 'https://x.com/sebuzdugan' },
  { id: 'youtube', label: 'Subscribe on YouTube', url: 'https://youtube.com/@sebuzdugan' },
  { id: 'medium', label: 'Follow on Medium', url: 'https://medium.com/@sebuzdugan' },
] as const;

async function post(path: string, payload: unknown): Promise<Record<string, unknown>> {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const d = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) throw new Error((d.message as string) || (d.error as string) || `HTTP ${r.status}`);
  return d;
}

export function TryFree({ profile, onCv }: { profile: Profile; onCv: (md: string) => void }): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'email' | 'ready'>('email');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState<Saved | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const s = localStorage.getItem(STORE);
    if (s) {
      try {
        setSaved(JSON.parse(s) as Saved);
        setStep('ready');
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Not configured (backend not deployed yet): render nothing so there is no dead button.
  if (!API) return null;

  const persist = (s: Saved): void => {
    setSaved(s);
    localStorage.setItem(STORE, JSON.stringify(s));
  };

  async function unlock(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      const d = await post('/api/unlock', { email });
      persist({ token: d.token as string, email, tries: Number(d.tries), follows: (d.follows as string[]) ?? [] });
      setStep('ready');
      setNote(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function generate(): Promise<void> {
    if (!saved) return;
    setError(null);
    if (classify(profile).class === 'out-of-scope') {
      setError('This profile is out of scope (AI/ML engineers only). Add AI skills or experience first.');
      return;
    }
    setBusy(true);
    try {
      const d = await post('/api/generate', { token: saved.token, profile });
      onCv(d.cv as string);
      persist({ ...saved, tries: Number(d.tries) });
      setNote('Generated on the house. Edit your profile and generate again if you have tries left.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function claimFollow(p: (typeof FOLLOWS)[number]): Promise<void> {
    if (!saved) return;
    window.open(p.url, '_blank', 'noopener');
    try {
      const d = await post('/api/grant-follow', { token: saved.token, platform: p.id });
      const granted = d.granted as boolean;
      persist({ ...saved, tries: Number(d.tries), follows: granted ? [...saved.follows, p.id] : saved.follows });
      if (granted) setNote(`Thanks! +${d.bonus} tries.`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!open && step !== 'ready') {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mono w-full rounded-xl border border-[#2f5a32] bg-gradient-to-r from-[#10220f] to-[#0e1113] px-4 py-3 text-[14px] font-medium text-[#bfe8c2] transition hover:from-[#163217]"
      >
        ✨ Try it free - no API key needed
      </button>
    );
  }

  const tries = saved?.tries ?? 0;

  return (
    <div className="rounded-xl border border-[#2f5a32] bg-[#0e1311] p-4">
      <div className="flex items-center justify-between">
        <div className="mono text-[11px] uppercase tracking-[0.14em] text-[#9fe870]">Free try (on the house)</div>
        {step === 'ready' && <div className="mono text-[12px] text-[#bfe8c2]">{tries} {tries === 1 ? 'try' : 'tries'} left</div>}
      </div>

      {step === 'email' && (
        <div className="mt-3 space-y-2">
          <p className="text-[12px] text-[#9aa1a6]">Drop your email to unlock one free generation on our key. No code, no spam.</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mono w-full rounded-lg border border-[#23282b] bg-[#0a0c0d] px-3 py-2 text-[13px] text-[#dfe3e5] outline-none focus:border-[#39424a]"
          />
          <button onClick={() => void unlock()} disabled={busy || !email} className="mono rounded-lg border border-[#2f5a32] bg-[#10220f] px-3 py-1.5 text-[12px] text-[#bfe8c2] disabled:opacity-40">
            {busy ? 'unlocking…' : 'unlock free try'}
          </button>
        </div>
      )}

      {step === 'ready' && (
        <div className="mt-3 space-y-3">
          {tries > 0 ? (
            <button onClick={() => void generate()} disabled={busy} className="mono w-full rounded-lg border border-[#2f5a32] bg-[#10220f] px-4 py-2 text-[13px] text-[#bfe8c2] transition hover:bg-[#163217] disabled:opacity-50">
              {busy ? 'generating…' : 'generate my CV (free)'}
            </button>
          ) : (
            <p className="text-[12px] text-[#9aa1a6]">Out of free tries. Follow below for more, or add your own key above.</p>
          )}
          <div>
            <div className="text-[11px] text-[#7d858b]">Follow for +2 tries each:</div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {FOLLOWS.map((f) => {
                const done = saved?.follows.includes(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => void claimFollow(f)}
                    disabled={done}
                    className="mono rounded-full border border-[#23282b] px-3 py-1 text-[11px] text-[#c4cacd] transition hover:border-[#2f5a32] hover:text-[#9fe870] disabled:opacity-40"
                  >
                    {done ? `✓ ${f.label.split(' ')[0]}` : f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {note && <div className="mt-3 text-[12px] text-[#8a9197]">{note}</div>}
      {error && <div className="mt-2 text-[12px] text-[#f0b8b8]">{error}</div>}
    </div>
  );
}
