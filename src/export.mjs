import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { renderSlide, esc, safeImage } from '../public/slides.js';
export async function exportHTML(deck, publicDir, uploadsDir) {
  let css = await readFile(path.join(publicDir, 'slides.css'), 'utf8');
  const font = await readFile(path.join(publicDir, 'assets/plus-jakarta-sans.woff2'));
  css = css.replace('/assets/plus-jakarta-sans.woff2', `data:font/woff2;base64,${font.toString('base64')}`);
  let body = deck.slides.map((s, i) => renderSlide(s, { index: i, total: deck.slides.length })).join('');
  const sources = [...new Set([...body.matchAll(/src="([^"]+)"/g)].map(m => m[1]))];
  for (const src of sources) {
    if (!safeImage(src)) continue;
    const file = src.startsWith('/uploads/') ? path.join(uploadsDir, path.basename(src)) : path.join(publicDir, src);
    try {
      const buffer = await readFile(file);
      const ext = path.extname(file);
      const mime = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' }[ext];
      body = body.split(`src="${src}"`).join(`src="data:${mime};base64,${buffer.toString('base64')}"`);
    } catch { throw new Error('An image is missing. Replace it before exporting.'); }
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(deck.title)}</title><style>${css}\nhtml,body{margin:0;background:#17141e}main{display:flex;flex-direction:column;align-items:center;gap:30px;padding:30px 0}.export-frame{position:relative;flex:none}.export-frame .slide{transform-origin:top left}nav{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9;background:#fff;border-radius:40px;padding:8px;display:flex;gap:8px;box-shadow:0 4px 30px #0002}button{border:0;background:#f3eaff;border-radius:25px;padding:12px 20px;color:#21005e;cursor:pointer;font-family:Jakarta,sans-serif} @media print{html,body{background:white}nav{display:none}main{display:block;padding:0}.export-frame{width:1280px!important;height:720px!important;break-after:page}.export-frame .slide{transform:none!important}.export-frame:last-child{break-after:auto}}</style></head><body><main>${deck.slides.length ? body.replaceAll('<section class="slide', '<div class="export-frame"><section class="slide').replaceAll('</section>', '</section></div>') : ''}</main><nav aria-label="Presentation controls"><button id="prev">← Previous</button><button id="print">Save as PDF</button><button id="next">Next →</button></nav><script>const frames=[...document.querySelectorAll('.export-frame')];function fit(){const scale=Math.min(1,(innerWidth-32)/1280);frames.forEach(f=>{f.style.width=1280*scale+'px';f.style.height=720*scale+'px';f.firstElementChild.style.transform='scale('+scale+')'})}fit();addEventListener('resize',fit);let current=0;function go(d){current=Math.max(0,Math.min(frames.length-1,current+d));frames[current].scrollIntoView({behavior:'smooth',block:'center'})}document.querySelector('#prev').onclick=()=>go(-1);document.querySelector('#next').onclick=()=>go(1);document.querySelector('#print').onclick=()=>print();addEventListener('keydown',e=>{if(['ArrowRight','ArrowDown',' '].includes(e.key)){e.preventDefault();go(1)}if(['ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();go(-1)}});</script></body></html>`;
}
