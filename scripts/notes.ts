// What Obsidian Publish's "Publish changes" window does, for this site.
//   bun run notes            list every note: live, changed, new, removed or still a draft
//   bun run notes publish    check the site builds, save the changed notes to git and send them to GitHub.
//                            Drafts are never saved or sent.
// The site itself is updated by GitHub (.github/workflows/quality.yml) once the notes reach the main branch.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from 'astro/markdown';
import { NOTES_DIRECTORY, isHiddenFolder, isPublished, noteHref, noteId, noteTitle, today } from '../src/notes/publishing.mjs';

const LIVE_BRANCH = 'main';
const live = `origin/${LIVE_BRANCH}`;

// quotePath off: git otherwise escapes non-English file names, and they would never match the files on disk.
const git = (...args: string[]) => execFileSync('git', ['-c', 'core.quotePath=false', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const lines = (text: string) => text.split('\n').filter(Boolean);

type State = 'live' | 'changed' | 'new' | 'draft' | 'removed';
interface Row { state: State; title: string; detail: string; file: string }

function noteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return isHiddenFolder(entry.name) ? [] : noteFiles(path);
    return entry.name.toLowerCase().endsWith('.md') ? [path] : [];
  });
}

function status(): { rows: Row[]; attachments: string[] } {
  // Compared with the copy of GitHub's main branch this computer last fetched.
  let onLive: Set<string>;
  try {
    onLive = new Set(lines(git('ls-tree', '-r', '--name-only', live, '--', NOTES_DIRECTORY)));
  } catch {
    console.error(`Can't find ${live}. Run "git fetch origin" once, then try again.`);
    process.exit(1);
  }
  const differs = new Set([
    ...lines(git('diff', '--name-only', live, '--', NOTES_DIRECTORY)),
    ...lines(git('ls-files', '--others', '--exclude-standard', '--', NOTES_DIRECTORY)),
  ]);
  const frontmatter = (text: string) => (parseFrontmatter(text).frontmatter ?? {}) as Record<string, unknown>;
  const local = noteFiles(NOTES_DIRECTORY);
  const rows: Row[] = local.map((file) => {
    const data = frontmatter(readFileSync(file, 'utf8'));
    const title = noteTitle(file, data);
    const address = noteHref(noteId(file.slice(NOTES_DIRECTORY.length + 1), data));
    if (!isPublished(data)) {
      // A draft stays on this computer. One that is public right now is being taken down.
      const wasPublic = onLive.has(file) && isPublished(frontmatter(git('show', `${live}:${file}`)));
      if (wasPublic) return { state: 'removed', title, detail: 'now a draft: will be taken off the site', file };
      return { state: 'draft', title, detail: data.dueDate ? `goes public on ${String(data.dueDate).slice(0, 10)}` : 'draft: true', file };
    }
    if (!onLive.has(file)) return { state: 'new', title, detail: address, file };
    return { state: differs.has(file) ? 'changed' : 'live', title, detail: address, file };
  });
  for (const file of onLive) {
    const hidden = file.slice(NOTES_DIRECTORY.length + 1).split('/').slice(0, -1).some(isHiddenFolder); // e.g. the note template
    if (file.toLowerCase().endsWith('.md') && !hidden && !local.includes(file)) rows.push({ state: 'removed', title: file, detail: 'deleted: will be taken off the site', file });
  }
  // Everything else in the vault that changed: pasted images, the note template, Obsidian's settings.
  const noteFilesListed = new Set(rows.map((row) => row.file));
  const attachments = [...differs].filter((file) => !noteFilesListed.has(file));
  return { rows, attachments };
}

function print({ rows, attachments }: ReturnType<typeof status>) {
  const order: State[] = ['new', 'changed', 'removed', 'draft', 'live'];
  for (const state of order) {
    for (const row of rows.filter((r) => r.state === state)) console.log(`${state.padEnd(8)} ${row.title}  (${row.detail})`);
  }
  if (attachments.length) console.log(`\n${attachments.length} other vault file(s) also changed (images, template or Obsidian settings).`);
}

const pending = (rows: Row[]) => rows.filter((row) => row.state === 'new' || row.state === 'changed' || row.state === 'removed');

const command = process.argv[2];
const current = status();

if (!command) {
  print(current);
  const count = pending(current.rows).length;
  console.log(count || current.attachments.length ? `\n${count} note(s) to publish. Run: bun run notes publish` : '\nNothing to publish. The site matches your notes.');
} else if (command === 'publish') {
  const waiting = pending(current.rows);
  if (!waiting.length && !current.attachments.length) {
    console.log('Nothing to publish. The site matches your notes.');
    process.exit(0);
  }
  print({ rows: waiting, attachments: current.attachments });
  // A note's date is the day it is first published. Write it into the note so it never changes afterwards.
  const date = today();
  for (const { file } of waiting) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    const newline = text.includes('\r\n') ? '\r\n' : '\n';
    const properties = text.match(/^---[ \t]*\r?\n([\s\S]*?\r?\n)?---[ \t]*(\r?\n|$)/);
    if (properties && /^pubDate:/m.test(properties[1] ?? '')) continue;
    const stamp = `pubDate: ${date}${newline}`;
    writeFileSync(file, properties ? text.replace(/^---[ \t]*\r?\n/, `---${newline}${stamp}`) : `---${newline}${stamp}---${newline}${newline}${text}`);
  }
  console.log('\nChecking the site builds with these notes…');
  execFileSync('bun', ['run', 'build'], { stdio: ['ignore', 'ignore', 'inherit'] });

  // Only the notes listed above and their images. Drafts stay on this computer: the GitHub repository is public.
  const paths = [...waiting.map((row) => row.file), ...current.attachments];
  git('add', '--all', '--', ...paths);
  const names = waiting.map((row) => row.title).join(', ');
  git('commit', '-m', `Publish notes: ${names || 'attachments'}`, '--', ...paths);
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  if (branch !== LIVE_BRANCH) {
    console.log(`\nSaved on the "${branch}" branch, and not sent anywhere. The notes go live when this branch is merged into ${LIVE_BRANCH}.`);
  } else {
    // This sends every commit on main that GitHub doesn't have yet, not only the notes.
    try {
      git('push', 'origin', LIVE_BRANCH);
    } catch {
      console.error('\nSaved, but GitHub did not accept the push. It probably has changes this computer lacks: run "git pull --rebase", then "git push".');
      process.exit(1);
    }
    console.log('\nSent to GitHub. The site updates after its checks pass, usually within a few minutes.');
  }
} else {
  console.error(`Unknown command "${command}". Use: bun run notes, or bun run notes publish`);
  process.exit(1);
}
