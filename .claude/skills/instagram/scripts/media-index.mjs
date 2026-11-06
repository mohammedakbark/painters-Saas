#!/usr/bin/env node
// Rebuild <mediaDir>/README.md: one row per calendar day with its type, formats, status and the files present in <mediaDir>/day-XX/.
// Usage: node .claude/skills/instagram/scripts/media-index.mjs   (run from the repo root)
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const brand = JSON.parse(readFileSync('marketing/instagram/brand.json', 'utf8'));
const mediaDir = process.env.INSTAGRAM_MEDIA_DIR || brand.mediaDir;
const plan = readFileSync('marketing/instagram/CONTENT_PLAN_30_DAYS.md', 'utf8');

const rows = plan
  .split('\n')
  .filter((l) => /^\|\s*\d+\s*\|/.test(l))
  .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
  .map(([day, format, , topic, hook, , , status]) => ({ day: Number(day), format, topic, hook, status }));

const order = (f) => (/\.(png|mp4)$/i.test(f) ? 0 : 1);
const lines = rows.map((r) => {
  const dir = join(mediaDir, `day-${String(r.day).padStart(2, '0')}`);
  const files = existsSync(dir) ? readdirSync(dir).sort((a, b) => order(a) - order(b) || a.localeCompare(b)) : [];
  const shown = files.length ? files.map((f) => `[${f}](day-${String(r.day).padStart(2, '0')}/${encodeURI(f)})`).join(', ') : '—';
  return `| ${r.day} | ${r.format} | ${r.topic} | ${r.status} | ${shown} |`;
});

const ready = rows.filter((r) => /ready|posted/.test(r.status)).length;
const md = `# @zero.byt Instagram: marketing media

Finished posts and reels for the 30-day launch campaign. **Generated, so don't edit by hand.** Run \`node .claude/skills/instagram/scripts/media-index.mjs\` from the repo to refresh it.

- Each \`day-XX/\` folder is ready to upload: images or the video, \`caption.md\` (caption, hashtags, alt text), and for reels \`cover.png\`, \`script.md\` and \`voiceover.txt\`.
- \`_archive/\` holds drafts, concepts and checks. Nothing in it is meant for posting.
- Sources (templates, HTML, captions, plan) live in the repo: \`marketing/instagram/\` and \`.claude/skills/instagram/\`.

**Progress:** ${ready} of ${rows.length} days ready or posted.

| Day | Type | Topic | Status | Files |
|---:|---|---|---|---|
${lines.join('\n')}
`;
writeFileSync(join(mediaDir, 'README.md'), md);
console.log(`Wrote ${join(mediaDir, 'README.md')} (${ready}/${rows.length} ready)`);
