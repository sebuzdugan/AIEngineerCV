import { questionBank, gaps, type Profile, type Question } from '@aiengineercv/core';
import { withPath } from '../lib/setPath.js';

function optionsFor(id: string): { value: string; label: string }[] {
  return (questionBank.questions.find((q) => q.id === id) as Question | undefined)?.options ?? [];
}

const field = 'rounded-lg border border-[#23282b] bg-[#0e1113] px-2.5 py-1.5 text-[13px] text-[#dfe3e5] outline-none focus:border-[#39424a] w-full';
const label = 'text-[11px] uppercase tracking-[0.1em] text-[#7d858b] mb-1 block';

export function TargetForm({ profile, onChange }: { profile: Profile; onChange: (p: Profile) => void }): JSX.Element {
  const set = (path: string, value: unknown): void => onChange(withPath(profile, path, value));
  const pending = gaps(profile);

  return (
    <div className="rounded-xl border border-[#1d2225] bg-[#0e1113] p-4">
      <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[#7d858b]">Targeting &amp; details</div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={label}>Name</label>
          <input className={field} value={profile.identity?.name ?? ''} onChange={(e) => set('identity.name', e.target.value)} />
        </div>
        <div>
          <label className={label}>Email</label>
          <input className={field} value={profile.identity?.email ?? ''} onChange={(e) => set('identity.email', e.target.value)} />
        </div>
        <div>
          <label className={label}>Location</label>
          <input className={field} value={profile.identity?.location ?? ''} onChange={(e) => set('identity.location', e.target.value)} />
        </div>

        <div>
          <label className={label}>Target role</label>
          <select className={field} value={profile.target?.role ?? 'other'} onChange={(e) => set('target.role', e.target.value)}>
            {optionsFor('target-role').map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Seniority</label>
          <select className={field} value={profile.target?.seniority ?? ''} onChange={(e) => set('target.seniority', e.target.value || undefined)}>
            <option value="">-</option>
            {optionsFor('seniority').map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Company type</label>
          <select className={field} value={profile.target?.companyType ?? ''} onChange={(e) => set('target.companyType', e.target.value || undefined)}>
            <option value="">-</option>
            {optionsFor('company-type').map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Years in AI/ML</label>
          <input
            type="number"
            min={0}
            className={field}
            value={profile.target?.yearsInAiMl ?? ''}
            onChange={(e) => set('target.yearsInAiMl', e.target.value === '' ? undefined : Number(e.target.value))}
          />
        </div>
      </div>

      <label className="mt-3 flex items-center gap-2 text-[13px] text-[#cdd2d5]">
        <input
          type="checkbox"
          checked={profile.screening?.buildsAiSystems ?? false}
          onChange={(e) => set('screening.buildsAiSystems', e.target.checked)}
        />
        I build or ship systems that use ML/LLMs
      </label>

      {pending.length > 0 && (
        <div className="mt-3 border-t border-[#1d2225] pt-3">
          <div className="text-[11px] text-[#7d858b]">Still worth adding ({pending.length}):</div>
          <ul className="mt-1.5 space-y-1 text-[12px] text-[#aeb4b8]">
            {pending.slice(0, 4).map((q) => (
              <li key={q.id} className="flex gap-2">
                <span style={{ color: '#9fe870' }}>+</span>
                <span>{q.prompt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
