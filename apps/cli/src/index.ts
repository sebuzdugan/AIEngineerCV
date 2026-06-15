#!/usr/bin/env node
import { Command } from 'commander';
import { fail } from './lib/ui.js';

const program = new Command();

program
  .name('aicv')
  .description('AIEngineerCV - turn your raw materials into a sharp, role-targeted AI-engineering CV. Bring your own key; nothing is proxied or stored.')
  .version('0.1.0');

program
  .command('init')
  .description('Interactive interview - asks only what is missing, writes profile.json')
  .action(async () => {
    const { initCommand } = await import('./commands/init.js');
    await initCommand();
  });

program
  .command('ingest')
  .argument('<files...>', 'CV / LinkedIn export / notes (.pdf .docx .md .txt .csv .json)')
  .option('-m, --model <model>', 'model id for extraction (default: claude-opus-4-8)')
  .description('Parse source files into a draft profile.json (uses your model if a key is set)')
  .action(async (files: string[], options: { model?: string }) => {
    const { ingestCommand } = await import('./commands/ingest.js');
    await ingestCommand(files, options);
  });

program
  .command('generate')
  .option('-m, --model <model>', 'model id for generation (default: claude-opus-4-8)')
  .option('-f, --force', 'proceed past an out-of-scope guardrail (warning still shown)')
  .description('Build the CV from profile.json into ./out/cv.md')
  .action(async (options: { model?: string; force?: boolean }) => {
    const { generateCommand } = await import('./commands/generate.js');
    await generateCommand(options);
  });

program
  .command('score')
  .description('Print the AI Recruiter Score, the guardrail class, and the top-3 fixes')
  .action(async () => {
    const { scoreCommand } = await import('./commands/score.js');
    scoreCommand();
  });

program
  .command('export')
  .option('--md', 'write Markdown')
  .option('--html', 'write styled HTML')
  .option('--pdf', 'write print-ready HTML for browser Print-to-PDF')
  .description('Export the CV (defaults to all formats) into ./out/')
  .action(async (options: { md?: boolean; html?: boolean; pdf?: boolean }) => {
    const { exportCommand } = await import('./commands/export.js');
    exportCommand(options);
  });

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (e) {
    fail((e as Error).message);
    process.exit(1);
  }
}

void main();
