import { useMemo, useState } from 'react';
import { scoreProfile, classify, type Profile } from '@aiengineercv/core';

const accent = '#9fe870';

function barColor(score: number): string {
  if (score >= 0.85) return accent;
  if (score >= 0.6) return '#7cc4ff';
  if (score >= 0.35) return '#ffd166';
  return '#ff7a7a';
}

export function ScorePanel({ profile }: { profile: Profile }): JSX.Element {
  const { score, guard } = useMemo(() => ({ score: scoreProfile(profile), guard: classify(profile) }), [profile]);
  const [copied, setCopied] = useState(false);

  const copyShare = (): void => {
    navigator.clipboard.writeText(score.shareCard).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  const guardTag =
    guard.class === 'in-scope'
      ? { label: 'in scope', color: accent }
      : guard.class === 'adjacent'
        ? { label: 'adjacent', color: '#ffd166' }
        : { label: 'out of scope', color: '#ff7a7a' };

  return (
    <div className="rounded-xl border border-[#1d2225] bg-[#0e1113] p-5">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#7d858b]">AI Recruiter Score</div>
        <span
          className="mono rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
          style={{ color: guardTag.color, border: `1px solid ${guardTag.color}44` }}
        >
          {guardTag.label}
        </span>
      </div>

      <div className="mt-2 flex items-end gap-3">
        <div className="mono text-6xl font-bold leading-none" style={{ color: barColor(score.score / 100) }}>
          {score.score}
        </div>
        <div className="pb-1 text-sm text-[#aeb4b8]">/ 100</div>
      </div>
      <div className="mt-1 text-sm text-[#cdd2d5]">{score.band}</div>

      <div className="mt-4 space-y-2">
        {score.perCriterion.map((c) => (
          <div key={c.id}>
            <div className="flex justify-between text-[11px] text-[#9aa1a6]">
              <span>{c.name}</span>
              <span className="mono">{Math.round(c.score * 100)}</span>
            </div>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-[#1a1f22]">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(c.score * 100)}%`, background: barColor(c.score) }} />
            </div>
          </div>
        ))}
      </div>

      {score.top3Fixes.length > 0 && (
        <div className="mt-4 border-t border-[#1d2225] pt-3">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#7d858b]">Top fixes</div>
          <ul className="mt-2 space-y-1.5 text-[13px] text-[#c4cacd]">
            {score.top3Fixes.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span style={{ color: accent }}>{'>'}</span>
                <span>
                  <span className="font-medium text-[#e7e9ea]">{f.criterion}.</span> {f.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={copyShare}
        className="mono mt-4 w-full rounded-lg border border-[#27408a] bg-[#0f1828] py-2 text-[12px] text-[#bcd2ff] transition hover:bg-[#13203a]"
      >
        {copied ? 'copied!' : `copy share card / ${score.shareCard.slice(0, 30)}…`}
      </button>
    </div>
  );
}
