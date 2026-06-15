import pc from 'picocolors';
import type { ScoreResult, GuardrailResult } from '@aiengineercv/core';

export const brand = (s: string): string => pc.bold(pc.cyan(s));

export function banner(): void {
  console.log(pc.bold(pc.cyan('\n  AIEngineerCV')) + pc.dim('  -  one brain, three doors\n'));
}

export function info(msg: string): void {
  console.log(pc.dim('  ') + msg);
}

export function success(msg: string): void {
  console.log(pc.green('  ✓ ') + msg);
}

export function warn(msg: string): void {
  console.log(pc.yellow('  ! ') + msg);
}

export function fail(msg: string): void {
  console.log(pc.red('  ✗ ') + msg);
}

export function scoreBar(n: number): string {
  const filled = Math.round(n / 5);
  const color = n >= 85 ? pc.green : n >= 70 ? pc.cyan : n >= 50 ? pc.yellow : pc.red;
  return color('█'.repeat(filled)) + pc.dim('░'.repeat(20 - filled));
}

export function printScore(result: ScoreResult): void {
  console.log('');
  console.log(`  ${pc.bold('AI Recruiter Score')}  ${scoreBar(result.score)}  ${pc.bold(String(result.score))}/100`);
  console.log(`  ${pc.dim(result.band)}`);
  console.log('');
  for (const c of result.perCriterion) {
    const pct = Math.round(c.score * 100);
    console.log(`  ${pc.dim(String(pct).padStart(3))}%  ${c.name.padEnd(22)} ${pc.dim(c.detail)}`);
  }
  if (result.top3Fixes.length) {
    console.log('\n  ' + pc.bold('Top fixes:'));
    for (const f of result.top3Fixes) {
      console.log(`  ${pc.yellow('→')} ${pc.bold(f.criterion)}: ${f.message}`);
    }
  }
  console.log('\n  ' + pc.dim(result.shareCard) + '\n');
}

export function printGuardrail(g: GuardrailResult): void {
  const tag =
    g.class === 'in-scope' ? pc.green('in-scope') : g.class === 'adjacent' ? pc.yellow('adjacent') : pc.red('out-of-scope');
  console.log(`  Guardrail: ${tag} ${pc.dim(`(${g.reason})`)}`);
  if (g.class !== 'in-scope') console.log('  ' + pc.dim(g.message));
}
