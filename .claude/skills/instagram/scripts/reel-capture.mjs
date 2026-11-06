// Capture an HTML animation (window.render(t)) frame by frame via the Chrome DevTools Protocol, then encode with ffmpeg.
// Usage: node .claude/skills/instagram/scripts/reel-capture.mjs <reel.html> <out.mp4> <seconds> [fps=30] [--stills t1,t2,...]
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [input, output, secs, fpsArg, flag, stillsArg] = process.argv.slice(2);
const FPS = Number(fpsArg || 30), DUR = Number(secs), W = 1080, H = 1920;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FFMPEG = process.env.FFMPEG || "ffmpeg"; // install: winget install Gyan.FFmpeg
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'reel-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run',
  '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${W},${H}`, '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); target = list.find((x) => x.type === 'page'); } catch {}
  if (!target) await sleep(200);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails)); return r.result?.result?.value; };

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: pathToFileURL(resolve(input)).href });
for (let i = 0; i < 100; i++) { if ((await evalJs('document.readyState')) === 'complete' && (await evalJs('typeof window.render'))  === 'function') break; await sleep(100); }
await evalJs('document.fonts.ready.then(()=>Promise.all([...document.images].map(i=>i.complete?1:new Promise(r=>i.onload=r))))');
await sleep(300);

const shot = async (t, file) => {
  await evalJs(`render(${t}); new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
  writeFileSync(file, Buffer.from(r.result.data, 'base64'));
};

if (flag === '--stills') {
  for (const t of stillsArg.split(',')) await shot(Number(t), `${output}-${t}.png`);
} else {
  const dir = join(tmpdir(), 'reel-frames-' + Date.now()); mkdirSync(dir);
  const N = Math.round(DUR * FPS);
  for (let f = 0; f < N; f++) { await shot(f / FPS, join(dir, `f${String(f).padStart(5, '0')}.png`)); if (f % 60 === 0) console.log(`frame ${f}/${N}`); }
  const enc = spawnSync(FFMPEG, ['-y', '-framerate', String(FPS), '-i', join(dir, 'f%05d.png'), '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', resolve(output)], { encoding: 'utf8' });
  if (enc.status !== 0) console.error(enc.stderr.slice(-1500)); else console.log('encoded', output);
  rmSync(dir, { recursive: true, force: true });
}
ws.close(); chrome.kill();
await sleep(300); try { rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch {}
process.exit(0);
