import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os'; import { join, resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b64 = readFileSync('zerobyt-logo.png').toString('base64');
const html = `<!doctype html><body><pre id="out"></pre><script>
const img=new Image();img.onload=()=>{const W=img.width,H=img.height,c=document.createElement('canvas');c.width=W;c.height=H;
const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.drawImage(img,0,0);const d=x.getImageData(0,0,W,H).data;
let x0=W,y0=H,x1=0,y1=0;for(let y=0;y<H;y++)for(let i=0;i<W;i++){const p=(y*W+i)*4;if(Math.min(d[p],d[p+1],d[p+2])<150){if(i<x0)x0=i;if(i>x1)x1=i;if(y<y0)y0=y;if(y>y1)y1=y;}}
const pad=0;x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(W-1,x1+pad);y1=Math.min(H-1,y1+pad);
const w=x1-x0+1,h=y1-y0+1,res={};
let ink=255;for(let y=y0;y<=y1;y++)for(let i=x0;i<=x1;i++){const p=(y*W+i)*4;const m=Math.min(d[p],d[p+1],d[p+2]);if(m<ink)ink=m;}
const A=(r,g,b)=>Math.max(0,Math.min(255,Math.round((255-Math.min(r,g,b))*255/(255-ink-12))));
// metrics on the 'zero' part (left 40% of the wordmark): baseline and x-height
let zb=0,zt=h;for(let y=0;y<h;y++)for(let i=0;i<Math.floor(w*0.4);i++){const p=((y+y0)*W+(i+x0))*4;if(Math.min(d[p],d[p+1],d[p+2])<150){if(y>zb)zb=y;if(y<zt)zt=y;}}
res.metrics={width:w,height:h,baseline:zb+1,xTop:zt};
for(const mode of ['dark','light']){const o=document.createElement('canvas');o.width=w;o.height=h;const ox=o.getContext('2d');const od=ox.createImageData(w,h);
for(let y=0;y<h;y++)for(let i=0;i<w;i++){const s=((y+y0)*W+(i+x0))*4,t=(y*w+i)*4;const r=d[s],g=d[s+1],b=d[s+2];const a=A(r,g,b);
if(a<24){od.data[t+3]=0;continue}
const green=g>r+25&&g>b+5;
if(green&&mode==='light'){od.data[t]=40;od.data[t+1]=200;od.data[t+2]=110;}else if(green){const k=a/255;od.data[t]=Math.max(0,255-(255-r)/k);od.data[t+1]=Math.max(0,255-(255-g)/k);od.data[t+2]=Math.max(0,255-(255-b)/k);}
else{const v=mode==='dark'?20:255;od.data[t]=v;od.data[t+1]=v;od.data[t+2]=v;}
od.data[t+3]=a;}
ox.putImageData(od,0,0);res[mode]=o.toDataURL('image/png');}
document.getElementById('out').textContent=JSON.stringify(res);};
img.src='data:image/png;base64,${b64}';</script></body>`;
writeFileSync('logo-cut.html', html);
const prof = mkdtempSync(join(tmpdir(), 'lc-'));
const r = spawnSync('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--user-data-dir=${prof}`, '--virtual-time-budget=10000', '--dump-dom', pathToFileURL(resolve('logo-cut.html')).href], { encoding: 'utf8', maxBuffer: 1 << 28 });
const m = r.stdout.match(/<pre id="out">(.*?)<\/pre>/s); const res = JSON.parse(m[1].replace(/&quot;/g, '"'));
writeFileSync('logo-metrics.json', JSON.stringify(res.metrics,null,1)); delete res.metrics;
for (const k of Object.keys(res)) writeFileSync(`zerobyt-logo-${k}.png`, Buffer.from(res[k].split(',')[1], 'base64'));
console.log('ok');
