import { RECIPES, THEMES, BRAND_VERSION, esc, uid, newSlide, renderSlide, slideWarnings } from './slides.js';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const app = $('#app'), dialog = $('#dialog');
const state = { decks: [], knowledge: [], deck: null, index: 0, page: 'library', filter: 'all', search: '', dirty: false, conflict: false, saveError: '', undo: [], redo: [], generation: 0 };
let saveTimer, toastTimer, saving = null, currentHash = '', recipeAction = 'insert', pendingBrief = null, dialogMode = '', knowledgeId = null;
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  layers: '<path d="m12 3 10 6-10 6L2 9 12 3Z"/><path d="m3 13 9 5 9-5M3 17l9 5 9-5"/>',
  brand: '<path d="m12 3 9 5v8l-9 5-9-5V8l9-5Z"/><path d="m7 15 5-8 5 8M9 12h6"/>',
  book: '<path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2V4Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
  search: '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  play: '<path d="m7 4 14 8-14 8V4Z"/>',
  undo: '<path d="M8 4 3 9l5 5M3 9h11a6 6 0 0 1 0 12"/>',
  redo: '<path d="m16 4 5 5-5 5m5-5H10a6 6 0 0 0 0 12"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  up: '<path d="m5 14 7-7 7 7"/>',
  down: '<path d="m5 10 7 7 7-7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  file: '<path d="M14 3H5v18h14V8l-5-5ZM14 3v5h5M8 13h8m-8 4h6"/>',
  screen: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 16 5-5 5 5 4-4 4 4"/>',
  archive: '<path d="M4 8v13h16V8M9 12h6"/><rect x="2" y="3" width="20" height="5" rx="1"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.file}</svg>`;
const btn = (label, action, cls = '', ico = '', extra = '') => `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${ico ? icon(ico) : ''}${label}</button>`;
const iconBtn = (label, action, ico, extra = '') => `<button type="button" class="icon-btn" title="${esc(label)}" aria-label="${esc(label)}" data-action="${action}" ${extra}>${icon(ico)}</button>`;
const date = value => new Date(value).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
const safeLink = value => /^https?:\/\//i.test(value || '') ? value : '';
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers }, ...(options.body ? { body: JSON.stringify(options.body) } : {}) });
  const result = await response.json();
  if (!response.ok) { const e = new Error(result.error || 'Something went wrong.'); e.status = response.status; throw e; }
  return result;
}
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4500); }
function scaled(slide, index = 0, total = 1) { return `<div class="scaled-slide" aria-hidden="true">${renderSlide(slide, { index, total })}</div>`; }
let resizeObserver = new ResizeObserver(() => fitSlides());
function fitSlides() {
  $$('.scaled-slide').forEach(el => { const w = el.parentElement.clientWidth; if(w) el.style.transform = `scale(${w / 1280})`; });
  const fit = $('.canvas-fit');
  if (fit) { const area = $('.canvas-area'); const style = getComputedStyle(area); const w = Math.min(area.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), (area.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)) * 1280 / 720); fit.style.width = `${Math.max(w, 100)}px`; fit.style.height = `${Math.max(w, 100) * 720 / 1280}px`; const s = $('.slide', fit); if(s) s.style.transform = `scale(${Math.max(w,100) / 1280})`; }
  const present = $('.present-frame');
  if (present) { const scale = Math.min(innerWidth / 1280, innerHeight / 720); present.style.width = `${1280*scale}px`; present.style.height = `${720*scale}px`; $('.slide', present).style.transform = `scale(${scale})`; }
}
function observe() { resizeObserver.disconnect(); [app, ...$$('.deck-cover,.outline-thumb,.hero-preview,.thumb,.canvas-area')].forEach(el => resizeObserver.observe(el)); requestAnimationFrame(fitSlides); }
function shell(content, page) {
  const activeDecks = state.decks.filter(d => !d.archived);
  app.innerHTML = `<div class="app-shell"><aside class="sidebar"><a href="#library" class="brand-lockup" aria-label="HeyMax Studio home"><img class="wordmark" src="/assets/logo-dark.svg" alt="HeyMax"><span class="studio-label">STUDIO</span></a><div class="workspace-pill"><span class="workspace-icon">${icon('layers')}</span><div><strong>HeyMax workspace</strong><span>Local edition</span></div></div><div class="nav-label">WORKSPACE</div>${[['library','grid','Presentations',activeDecks.length],['templates','layers','Slide templates','12'],['brand','brand','Brand kit',''],['knowledge','book','Knowledge','']].map(([id,i,label,count])=>`<a class="nav-link ${page===id?'active':''}" href="#${id}" title="${label}" ${page===id?'aria-current="page"':''}>${icon(i)}<span class="label">${label}</span><span class="count">${count}</span></a>`).join('')}<div class="sidebar-bottom"><button class="nav-link" data-action="help" title="Quick start">${icon('file')}<span class="label">Quick start</span></button><div class="local-note"><strong><i class="dot"></i>Made for your laptop</strong>Your presentations stay here.<br>No account or API key needed.</div></div></aside><main class="main"><header class="topbar"><div class="breadcrumbs">Workspace<span>/</span><strong>${({library:'Presentations',templates:'Slide templates',brand:'Brand kit',knowledge:'Knowledge'})[page]}</strong></div><div class="top-right"><span class="local-badge"><i class="dot"></i>Local workspace</span><span class="avatar" title="Local workspace">HM</span></div></header>${content}</main></div>`;
  observe();
}
function library() {
  const sample = state.decks.find(d => !d.archived) || { slides: [newSlide('cover')] };
  shell(`<div class="page-header"><div><h1>Your presentations</h1><p>A little inspiration. A lot of possibility.</p></div><div class="actions">${btn('Import','import','','upload')}${btn('New presentation','new','primary','plus')}</div></div><section class="hero"><div class="hero-copy"><p class="eyebrow">YOUR STORY, THE HEYMAX WAY</p><h2>Good stories<br>start here.</h2><p>Turn your next idea into a presentation that feels unmistakably HeyMax.</p>${btn('Start with a brief','brief','','arrow')}</div><div class="hero-visual"><div class="hero-preview">${scaled(sample.slides[0],0,sample.slides.length)}</div><span class="hero-badge">${icon('check')}Your brand. Built in.</span></div></section><div class="section-toolbar"><div class="tabs" role="group" aria-label="Filter presentations">${[['all','All presentations'],['starred','Starred'],['archived','Archived']].map(([f,l])=>`<button class="tab ${state.filter===f?'active':''}" data-action="filter" data-filter="${f}">${l}</button>`).join('')}</div><label class="search">${icon('search')}<input id="deck-search" type="search" placeholder="Find a presentation…" aria-label="Search presentations" value="${esc(state.search)}"></label></div><div id="deck-grid" class="deck-grid"></div><div class="library-bottom"><div><h3>A head start for every story.</h3><p>Explore 12 layouts made for HeyMax campaigns, ideas, and partnerships.</p></div><a href="#templates" class="btn ghost">Explore the templates ${icon('arrow')}</a></div>`, 'library');
  renderDeckGrid();
}
function renderDeckGrid() {
  const filtered = state.decks.filter(d => state.filter === 'archived' ? d.archived : !d.archived && (state.filter !== 'starred' || d.starred)).filter(d => `${d.title} ${d.description} ${d.slides.map(s=>s.title).join(' ')}`.toLowerCase().includes(state.search.toLowerCase())).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  $('#deck-grid').innerHTML = filtered.map(d => `<article class="deck-card"><a href="#deck/${d.id}" class="deck-cover" style="display:block" aria-label="Open ${esc(d.title)}">${scaled(d.slides[0],0,d.slides.length)}</a><div class="deck-meta"><div class="deck-title-row"><button class="deck-title" data-action="open-deck" data-id="${d.id}">${esc(d.title)}</button><button class="icon-btn ${d.starred?'selected':''}" aria-label="${d.starred?'Unstar':'Star'} ${esc(d.title)}" data-action="star" data-id="${d.id}">${icon('star')}</button></div><div class="deck-details"><span>${d.slides.length} slides · ${date(d.updatedAt)}</span><span class="badge">${esc(d.category)}</span></div><div class="card-menu">${btn('Duplicate','duplicate-deck','ghost small','copy',`data-id="${d.id}"`)}${btn(d.archived?'Restore':'Archive','archive-deck','ghost small','archive',`data-id="${d.id}"`)}</div></div></article>`).join('') + (state.filter==='all' && !state.search ? `<button class="new-card" data-action="new"><span>${icon('plus')}</span><strong>Your next presentation</strong><p>Start with a thought. Make it a story.</p></button>`:'');
  if(!filtered.length && (state.search || state.filter!=='all')) $('#deck-grid').innerHTML = '<div class="empty">No presentations here yet.</div>';
  observe();
}
function templates() {
  shell(`<div class="page-header"><div><p class="eyebrow">A LITTLE STRUCTURE. ROOM FOR YOUR IDEAS.</p><h1>A layout for every moment</h1><p>Choose a starting point. The brand is already taken care of.</p></div></div><div class="deck-grid">${RECIPES.map(r=>`<article class="deck-card template-card"><button class="deck-cover" style="width:100%;display:block" data-action="template-deck" data-recipe="${r.id}" aria-label="Use ${r.name}">${scaled(newSlide(r.id))}</button><div class="deck-meta"><div class="deck-title-row"><h3>${r.name}</h3><span class="badge">${r.tag}</span></div><p>${r.description}</p></div></article>`).join('')}</div>`,'templates');
}
function brand() {
  shell(`<div class="page-header"><div><h1>Unmistakably HeyMax</h1><p>Your shared foundation, built into every slide.</p></div><a class="btn" href="https://www.figma.com/design/osbBQgXRz6Rd19ZnuqMoWX/Design-System--external-?node-id=0-1" target="_blank" rel="noreferrer">Open in Figma ${icon('external')}</a></div><div class="brand-banner"><div><p class="eyebrow">BRAND FOUNDATION / OCTOBER 2026</p><h2>Clear. Confident. Human.</h2><p>Designed to make the connection between everyday moments and the next adventure feel possible.</p></div><img src="/assets/logo-light.svg" alt="HeyMax"></div><div class="two-col"><section class="panel-card"><h3>Our core colours</h3><div class="swatches">${[['#21005E','Primary'],['#F3EAFF','Secondary'],['#4000B8','Tertiary']].map(([hex,name])=>`<div class="swatch"><i style="background:${hex}"></i><strong>${name}</strong><span>${hex}</span></div>`).join('')}</div><p>Use the approved palette. Let deep purple carry the message and lighter surfaces give it space.</p></section><section class="panel-card"><h3>Plus Jakarta Sans</h3><div class="brand-type">A world of possibility.</div><p>One expressive family. Clear headlines, comfortable reading, and a confident hierarchy. Bundled locally for offline use.</p></section><section class="panel-card"><h3>The voice</h3><p>Energising, clear, warm, direct, and motivating. Keep the benefit tangible and the language simple.</p><ul><li>One thought per slide.</li><li>Explain the value in everyday words.</li><li>Use approved facts and name the source.</li><li>Keep proposed ideas visibly marked as concepts.</li></ul></section><section class="panel-card"><h3>The wordmark</h3><img class="wordmark" style="width:190px;margin:27px 0" src="/assets/logo-dark.svg" alt="HeyMax official gradient wordmark"><p>Use the official gradient wordmark by default. Respect clear space and choose the correct variant for the background. Never retype, stretch, or recolour it.</p></section><section class="panel-card"><h3>Warm, human, down to earth.</h3><div class="photo-strip"><img src="/assets/travel-camera.png" alt="Traveller with a camera"><img src="/assets/travel-kyoto.png" alt="Kyoto at dusk"><img src="/assets/travel-mountains.png" alt="A mountain walk"></div><p>Natural light, real moments, and relatable travel. These reference images come from the Figma photography guideline.</p></section><section class="panel-card"><h3>A considered starting point</h3><p>Brand snapshot: ${BRAND_VERSION}. Presentation layouts are new applications of the source guideline, ready to refine with the team.</p><div class="rule-note">The source contains a few inconsistent font labels. This version uses Plus Jakarta Sans consistently and applies explicit presentation type sizes. Campaign offers and product claims still need their own review.</div></section></div>`, 'brand');
}
function knowledge() {
  shell(`<div class="page-header"><div><h1>A good story starts with the facts.</h1><p>Keep approved wording, source links, and campaign context in one place.</p></div>${btn('Add a source','add-knowledge','primary','plus')}</div><div class="rule-note" style="margin:0 0 24px">Only approved, in-date sources are offered in the brief builder. Drafts stay here until you’re ready. This first version stores and reuses your text; it does not automatically verify claims.</div><div class="knowledge-list">${state.knowledge.map(k=>`<article class="knowledge-card"><div class="knowledge-header"><h3>${esc(k.title)}</h3>${btn('Edit','edit-knowledge','small','',`data-id="${k.id}"`)}</div><p>${esc(k.body.length>650?k.body.slice(0,650)+'…':k.body)}</p><div class="knowledge-foot"><span class="badge ${k.status==='approved'?'green':''}">${k.status==='approved'?'Approved':'Draft'}</span>${isOverdue(k)?'<span class="badge amber">Review overdue</span>':''}<span>${k.reviewBy?'Review by '+esc(k.reviewBy):'No review date'}</span>${safeLink(k.source)?`<a href="${esc(k.source)}" target="_blank" rel="noreferrer">Open original source ↗</a>`:`<span>${esc(k.source)}</span>`}</div></article>`).join('') || '<div class="empty">Add your first source to start building your knowledge library.</div>'}</div>`, 'knowledge');
}
function isOverdue(k) { return k.reviewBy && k.reviewBy < new Date().toLocaleDateString('en-CA'); }
function editor() {
  app.innerHTML = `<div class="editor"><header class="editor-header"><div class="editor-left">${iconBtn('Back to presentations','library','back')}<img class="wordmark" src="/assets/logo-dark.svg" alt="HeyMax"><div class="editor-divider"></div><div><input class="deck-name" aria-label="Presentation title" maxlength="150" value="${esc(state.deck.title)}"><div id="save-status" class="save-status"></div></div></div><div class="actions">${btn('Brand kit','brand-dialog','ghost','brand')}${btn('Export','export','','download')}${btn('Present','present','primary','play')}</div></header><div class="editor-grid"><aside class="outline"><div class="outline-head"><span>YOUR STORY</span><span id="slide-count"></span></div><div class="outline-list" id="outline"></div><div class="outline-bottom">${btn('Add a slide','add-slide','','plus')}</div></aside><main class="workspace"><div class="canvas-toolbar"><span id="layout-name"></span><div class="actions">${iconBtn('Undo edit','undo','undo')}${iconBtn('Redo edit','redo','redo')}<span style="margin:0 6px">/</span>${iconBtn('Move slide up','move-up','up')}${iconBtn('Move slide down','move-down','down')}${iconBtn('Duplicate slide','duplicate-slide','copy')}${iconBtn('Delete slide','delete-slide','trash')}</div></div><div id="save-error"></div><div class="canvas-area"><div class="canvas-fit" id="canvas"></div></div><div class="canvas-bottom"><span>Double-click text to edit on the slide</span><span id="canvas-count"></span></div><div class="notes-panel"><label for="speaker-notes">${icon('file')} Speaker notes</label><textarea id="speaker-notes" placeholder="A few words to guide the conversation…"></textarea></div></main><aside class="inspector" id="inspector"></aside></div></div>`;
  renderOutline(); renderCurrent(); updateSaveStatus(); observe();
}
function renderOutline() {
  $('#slide-count').textContent=String(state.deck.slides.length).padStart(2,'0');
  $('#outline').innerHTML=state.deck.slides.map((s,i)=>`<button class="outline-slide ${i===state.index?'active':''}" data-action="select-slide" data-index="${i}" aria-label="Slide ${i+1}: ${esc(s.title)}" ${i===state.index?'aria-current="true"':''}><div class="outline-thumb">${scaled(s,i,state.deck.slides.length)}</div><span class="outline-label"><span>${String(i+1).padStart(2,'0')}</span><strong>${esc(s.title.replaceAll('\n',' '))}</strong></span></button>`).join('');
  fitSlides();
}
function formField(label, key, value, { textarea = false, max = 500, cls = '', item = null } = {}) {
  const attrs = `data-key="${key}" ${item!==null?`data-item="${item}"`:''} maxlength="${max}" aria-label="${esc(label)}"`;
  return `<label class="field"><span>${label}</span>${textarea?`<textarea ${attrs} class="${cls}">${esc(value)}</textarea>`:`<input ${attrs} value="${esc(value)}">`}</label>`;
}
function renderCurrent() {
  const s=state.deck.slides[state.index];
  $('#canvas').innerHTML=renderSlide(s,{index:state.index,total:state.deck.slides.length,editable:true});
  $('#layout-name').textContent=RECIPES.find(r=>r.id===s.recipe).name+' / 16:9';
  $('#canvas-count').textContent=`Slide ${state.index+1} of ${state.deck.slides.length}`;
  $('#speaker-notes').value=s.notes;
  $('#inspector').innerHTML=`<h2>Make it your story</h2><p class="hint">The layout stays on brand. You bring the idea.</p><label class="field"><span>Layout</span><select data-key="recipe" aria-label="Slide layout">${RECIPES.map(r=>`<option value="${r.id}" ${s.recipe===r.id?'selected':''}>${r.name}</option>`).join('')}</select></label><span class="hint" style="margin-bottom:9px">Background</span><div class="theme-options">${THEMES.map(t=>`<button class="theme-option ${s.theme===t?'active':''}" data-action="theme" data-theme="${t}" aria-label="${t} background" title="${t}"></button>`).join('')}</div>${formField('Section label','kicker',s.kicker,{max:140})}${formField('Headline','title',s.title,{textarea:true,max:250,cls:'title-input'})}${formField('Supporting thought','subtitle',s.subtitle,{textarea:true,max:600})}${['insight','product','creative'].includes(s.recipe)?formField('Body','body',s.body,{textarea:true,max:3000}):''}${['insight','cards','partnership','calendar','timeline','offers'].includes(s.recipe)?`<div class="inspector-divider"></div><h2>${s.recipe==='calendar'?'Plan details':'Content blocks'}</h2><p class="hint">Keep each block focused.</p><div>${s.items.map((item,i)=>`<div class="item-editor"><div class="item-editor-head"><span>BLOCK ${i+1}</span><button data-action="remove-item" data-index="${i}" aria-label="Remove block ${i+1}">×</button></div>${['insight','calendar','timeline'].includes(s.recipe)?formField(s.recipe==='calendar'?'When':'Value / step','value',item.value,{item:i,max:80}):''}${formField('Block title','title',item.title,{item:i,max:180})}${formField('Block text','body',item.body,{item:i,textarea:true,max:600})}</div>`).join('')}${s.items.length<maxItems(s.recipe)?btn('Add a block','add-item','small','plus'):''}</div>`:''}${['cover','photo','product','creative'].includes(s.recipe)?`<div class="inspector-divider"></div><h2>Photography & imagery</h2>${s.image?`<img class="inspector-image" src="${esc(s.image)}" alt="Current slide image">`:''}<div class="actions">${btn(s.image?'Replace image':'Upload image','upload-image','small','upload')}${s.image?btn('Remove','remove-image','small ghost'):''}</div><div class="image-choices">${['camera','kyoto','mountains'].map(n=>`<button data-action="stock-image" data-image="${n}" title="Use ${n} guideline photograph" aria-label="Use ${n} guideline photograph"><img src="/assets/travel-${n}.png" alt="${n}"></button>`).join('')}</div><p class="hint" style="margin:7px 0 13px">From your HeyMax photography guideline</p><label class="field"><span>Image fit</span><select data-key="imageFit" aria-label="Image fit"><option value="cover" ${s.imageFit==='cover'?'selected':''}>Fill frame (photography)</option><option value="contain" ${s.imageFit==='contain'?'selected':''}>Show entire image (screenshots)</option></select></label>${formField('Image description','imageAlt',s.imageAlt,{max:300})}`:''}<div class="inspector-divider"></div>${formField('Source / qualification','source',s.source,{textarea:true,max:500})}<div id="slide-warnings"></div><p class="quality-note">HEYMAX BRAND / V1<br>Plus Jakarta Sans · approved colour palette<br>Review facts and offers before sharing.</p>`;
  updateWarnings();updateUndoButtons();fitSlides();
}
const maxItems = recipe => ({insight:1,cards:3,partnership:2,calendar:4,timeline:4,offers:4})[recipe] || 3;
function updateWarnings() { const el=$('#slide-warnings');if(el)el.innerHTML=slideWarnings(state.deck.slides[state.index]).map(w=>`<p class="warning">${esc(w)}</p>`).join(''); }
function snapshot() { state.undo.push(JSON.stringify({slides:state.deck.slides,title:state.deck.title,index:state.index})); if(state.undo.length>40)state.undo.shift();state.redo=[]; }
function changed({panel=false}={}) { state.dirty=true;state.generation++;if(!state.conflict)state.saveError='';clearTimeout(saveTimer);saveTimer=setTimeout(()=>save(),650);if(state.page==='deck'){renderOutline();if(panel)renderCurrent();else { $('#canvas').innerHTML=renderSlide(state.deck.slides[state.index],{index:state.index,total:state.deck.slides.length,editable:true});updateWarnings(); }updateSaveStatus();updateUndoButtons();fitSlides();} }
function updateUndoButtons() { const a=$('[data-action="undo"]'),b=$('[data-action="redo"]');if(a)a.disabled=!state.undo.length;if(b)b.disabled=!state.redo.length; const up=$('[data-action="move-up"]'),down=$('[data-action="move-down"]'),del=$('[data-action="delete-slide"]');if(up)up.disabled=state.index===0;if(down)down.disabled=state.index===state.deck.slides.length-1;if(del)del.disabled=state.deck.slides.length===1; }
function updateSaveStatus() {
  const el=$('#save-status');if(!el)return;
  el.className='save-status'+(state.saveError?' error':'');
  el.innerHTML=state.saveError?'Not saved':saving?'Saving…':state.dirty?'Unsaved changes':'<i class="dot"></i> Saved on your laptop';
  $('#save-error').innerHTML=state.saveError?`<div class="save-error-banner">${esc(state.saveError)}<div class="actions">${btn('Download my edits','download-local','small')}${state.conflict?btn('Reload saved version','reload-deck','small'):btn('Try saving again','retry-save','small')}</div></div>`:'';
}
async function save() {
  clearTimeout(saveTimer);
  if(saving){await saving;if(state.dirty&&!state.conflict&&!state.saveError)return save();return !state.dirty;}
  if(!state.deck || !state.dirty)return true;
  if(state.conflict)return false;
  const payload=structuredClone(state.deck), generation=state.generation;
  const promise=(async()=>{
    try{const saved=await api(`/api/decks/${payload.id}`,{method:'PUT',body:payload});state.deck.rev=saved.rev;state.deck.updatedAt=saved.updatedAt;const i=state.decks.findIndex(d=>d.id===saved.id);if(i>=0)state.decks[i]=saved;state.dirty=state.generation!==generation;state.saveError='';return true;}
    catch(e){state.conflict=e.status===409;state.saveError=e.message;toast('Your edits have not been saved. See the message above the slide.');return false;}
  })();
  saving=promise;updateSaveStatus();const ok=await promise;saving=null;updateSaveStatus();if(ok&&state.dirty)return save();return ok;
}
function present() {
  const s=state.deck.slides[state.index];
  app.innerHTML=`<div class="present-view"><div class="present-frame">${renderSlide(s,{index:state.index,total:state.deck.slides.length})}</div><nav class="present-controls" aria-label="Presentation controls">${btn('Exit','exit-present','ghost','close')}${btn('','prev-slide','ghost','back',`aria-label="Previous slide" ${state.index===0?'disabled':''}`)}<span>${state.index+1} / ${state.deck.slides.length}</span>${btn('','next-slide','ghost','arrow',`aria-label="Next slide" ${state.index===state.deck.slides.length-1?'disabled':''}`)}</nav></div>`;observe();
}
function printView() { app.innerHTML=`<div class="print-view"><div class="print-toolbar">${btn('Back to editor','exit-present','','back')}${btn('Print / Save as PDF','print-now','primary','download')}<p>Choose “Save as PDF”, landscape, and enable background graphics.</p></div>${state.deck.slides.map((s,i)=>renderSlide(s,{index:i,total:state.deck.slides.length})).join('')}</div>`; }
function openDialog(title, subtitle, body, footer='') {
  dialog.innerHTML=`<div class="dialog-head"><div><h2>${title}</h2><p>${subtitle}</p></div>${iconBtn('Close dialog','close-dialog','close')}</div><div class="dialog-body">${body}<p class="dialog-error" id="dialog-error" role="alert"></p></div>${footer?`<div class="dialog-foot">${footer}</div>`:''}`;
  if(!dialog.open)dialog.showModal();requestAnimationFrame(fitSlides);
}
function newDialog() { dialogMode='new';openDialog('Where shall we start?','A small idea can become a great story.',`<div class="choice-grid"><button class="choice" data-action="brief">${icon('book')}<h3>Start with a brief</h3><p>Describe the audience and purpose. Review a template-based outline before creating your slides.</p></button><button class="choice" data-action="pick-first">${icon('layers')}<h3>Choose a first slide</h3><p>Start with an approved layout and build the presentation at your own pace.</p></button></div>`); }
function recipeDialog(mode='insert') { recipeAction=mode;dialogMode='recipes';openDialog(mode==='insert'?'Add a moment to your story':'Choose your starting point','12 layouts. One shared HeyMax foundation.',`<div class="recipe-picker">${RECIPES.map(r=>`<button class="recipe-choice" data-action="choose-recipe" data-recipe="${r.id}"><div class="thumb">${scaled(newSlide(r.id))}</div><span>${r.name}</span></button>`).join('')}</div>`); }
function briefDialog() {
  pendingBrief=null;dialogMode='brief';
  const sources=state.knowledge.filter(k=>k.status==='approved'&&!isOverdue(k));
  openDialog('Give your idea a little direction.','A guided, template-based builder. No AI service is connected.',`<form id="brief-form"><label class="field"><span>Presentation title</span><input name="title" required maxlength="150" placeholder="e.g. Our next merchant campaign"></label><div class="two-col"><label class="field"><span>Who is it for?</span><input name="audience" required maxlength="100" placeholder="e.g. Marketing and partnerships"></label><label class="field"><span>What kind of story?</span><select name="kind"><option value="campaign">Campaign proposal</option><option value="partnership">Partnership conversation</option><option value="story">Brand / team story</option></select></label></div><label class="field"><span>What should the audience take away?</span><textarea name="purpose" required maxlength="450" placeholder="The one idea you want people to remember…"></textarea></label><label class="field"><span>Points to include (one per line, up to three)</span><textarea name="points" maxlength="600" placeholder="The opportunity\nThe approach\nThe next step"></textarea></label>${sources.length?`<label class="field"><span>Include an approved source (optional)</span><select name="source"><option value="">No source selected</option>${sources.map(k=>`<option value="${k.id}">${esc(k.title)}</option>`).join('')}</select></label>`:''}</form>`,`<span>Uses your words and editable placeholders.</span>${btn('Review outline','review-brief','primary','arrow')}`);
}
function reviewBrief() {
  const form=$('#brief-form');if(!form.reportValidity())return;
  const b=Object.fromEntries(new FormData(form));
  const points=(b.points||'').split('\n').map(p=>p.trim()).filter(Boolean).slice(0,3);
  const slides=[{...newSlide('cover'),title:b.title,subtitle:b.purpose,kicker:`HEYMAX / ${b.audience}`},{...newSlide('statement'),title:b.purpose.slice(0,200),subtitle:`Prepared for ${b.audience}`,kicker:'01 / THE IDEA'}, {...newSlide('cards'),title:'What we’ll explore',subtitle:'A starting point for the conversation.',items:(points.length?points:['The opportunity','Our approach','The next step']).map(p=>({title:p,body:'Add your supporting detail.',value:''})),source:'Draft outline. Supporting detail to add.'}];
  if(b.kind==='campaign')slides.push(newSlide('calendar'),newSlide('creative'));
  else if(b.kind==='partnership')slides.push(newSlide('partnership'),newSlide('timeline'));
  else slides.push(newSlide('photo'),newSlide('timeline'));
  const source=state.knowledge.find(k=>k.id===b.source&&k.status==='approved'&&!isOverdue(k));
  if(source)slides.push({...newSlide('product'),recipe:'statement',title:source.title,subtitle:source.body.length>300?'Source excerpt — see speaker notes for the complete text.':source.body,body:'',source:source.source.slice(0,500),notes:source.body,theme:'lavender'});
  slides.push({...newSlide('closing'),subtitle:'Add the action or decision you want from this conversation.'});
  pendingBrief={title:b.title,description:b.purpose,category:b.kind==='campaign'?'Campaign':b.kind==='partnership'?'Partnership':'Brand story',slides,starred:false,archived:false};
  dialogMode='outline';openDialog('A first shape for your story',`${slides.length} slides, built from your brief. You can change every slide after creating it.`,`<div class="outline-proposal">${slides.map((s,i)=>`<div class="proposal-row"><span>${String(i+1).padStart(2,'0')}</span><div><strong>${esc(s.title.replaceAll('\n',' '))}</strong><p>${RECIPES.find(r=>r.id===s.recipe).name}</p></div></div>`).join('')}</div><div class="rule-note">This is a template-based draft, not AI-generated research. Replace placeholders and review all claims before sharing.</div>`,`<span>Your approval creates the deck.</span>${btn('Approve & create','approve-brief','primary','check')}`);
}
async function createDeck(recipe, supplied=null) {
  if(state.deck&&!(await save()))return;
  const deck=await api('/api/decks',{method:'POST',body:supplied||{title:'Untitled presentation',description:'',category:'Presentation',slides:[newSlide(recipe)]}});
  state.decks.push(deck);dialog.close();location.hash=`deck/${deck.id}`;toast('Your presentation is ready. Make it yours.');
}
function exportDialog() {dialogMode='export';openDialog('Take your story with you.','Your deck, ready to present or keep.',`<div class="export-options"><button class="export-option" data-action="export-html">${icon('screen')}<div><h3>Standalone presentation</h3><p>A single HTML file. Fonts and images included. Opens offline in a browser.</p></div></button><button class="export-option" data-action="export-pdf">${icon('file')}<div><h3>PDF through your browser</h3><p>Open the print layout, then choose Save as PDF.</p></div></button><button class="export-option" data-action="export-bundle">${icon('download')}<div><h3>Editable backup</h3><p>A HeyMax Studio JSON file, with uploaded images. Import it later to keep editing.</p></div></button></div>`);}
function knowledgeDialog(id=null) {
  knowledgeId=id;dialogMode='knowledge';const k=state.knowledge.find(k=>k.id===id)||{title:'',body:'',source:'',status:'draft',reviewBy:''};
  openDialog(id?'Edit your source':'Add something worth knowing','Approved wording and reliable sources make better presentations.',`<form id="knowledge-form"><label class="field"><span>Title</span><input name="title" maxlength="150" required value="${esc(k.title)}"></label><label class="field"><span>Source text</span><textarea name="body" maxlength="18000" required style="min-height:150px">${esc(k.body)}</textarea></label><label class="field"><span>Source link or reference</span><input name="source" maxlength="1000" value="${esc(k.source)}"></label><div class="two-col"><label class="field"><span>Status</span><select name="status"><option value="draft" ${k.status==='draft'?'selected':''}>Draft — not offered in briefs</option><option value="approved" ${k.status==='approved'?'selected':''}>Approved for reuse</option></select></label><label class="field"><span>Review by</span><input type="date" name="reviewBy" value="${esc(k.reviewBy)}"></label></div></form>`,`<span>You decide what is approved.</span>${btn('Save source','save-knowledge','primary','check')}`);
}
function downloadJSON(data, filename) {const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),15000);}
async function downloadServer(url, filename) {if(!(await save()))return;const r=await fetch(url);if(!r.ok){const e=await r.json();throw new Error(e.error||'Export failed.');}const blob=await r.blob(), link=document.createElement('a'), objectURL=URL.createObjectURL(blob);link.href=objectURL;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(objectURL),15000);dialog.close();toast('Your export is ready.');}
async function downloadLocal() {
  const assets={};for(const slide of state.deck.slides)if(slide.image.startsWith('/uploads/')&&!assets[slide.image]){const r=await fetch(slide.image);if(!r.ok)throw new Error('A local image could not be backed up.');assets[slide.image]=(await blobBase64(await r.blob())).split(',')[1];}
  downloadJSON({format:'heymax-studio-v1',deck:state.deck,assets},'heymax-unsaved-edits.json');toast('Your current edits have been downloaded.');
}
const blobBase64 = file => new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Could not read this file.'));r.readAsDataURL(file);});
async function route() {
  const hash=location.hash.slice(1)||'library';
  if(state.deck && state.dirty && !(await save())){if(location.hash.slice(1)!==currentHash)location.hash=currentHash;return;}
  currentHash=hash;const [page,id]=hash.split('/');state.page=page;
  if(['deck','present','print'].includes(page)&&id){
    if(!state.deck||state.deck.id!==id){state.deck=await api(`/api/decks/${encodeURIComponent(id)}`);state.index=0;state.undo=[];state.redo=[];state.conflict=false;state.saveError='';state.dirty=false;}
    state.index=Math.min(state.index,state.deck.slides.length-1);
    if(page==='deck')editor();else if(page==='present')present();else printView();
  }else{state.deck=null;state.page=['library','templates','brand','knowledge'].includes(page)?page:'library';({library,templates,brand,knowledge})[state.page]();}
  document.title=state.deck?`${state.deck.title} · HeyMax Studio`:'HeyMax Studio';
}
async function action(target) {
  const name=target.dataset.action;
  const s=state.deck?.slides[state.index];
  switch(name){
    case 'new':newDialog();break;
    case 'brief':briefDialog();break;
    case 'review-brief':reviewBrief();break;
    case 'approve-brief':if(pendingBrief)await createDeck('cover',pendingBrief);break;
    case 'pick-first':recipeDialog('create');break;
    case 'add-slide':if(state.deck.slides.length>=80){toast('This deck has reached the 80-slide limit.');break;}recipeDialog();break;
    case 'template-deck':await createDeck(target.dataset.recipe);break;
    case 'choose-recipe':if(recipeAction==='create')await createDeck(target.dataset.recipe);else{snapshot();state.deck.slides.splice(state.index+1,0,newSlide(target.dataset.recipe));state.index++;dialog.close();changed({panel:true});}break;
    case 'close-dialog':dialog.close();break;
    case 'library':location.hash='library';break;
    case 'open-deck':location.hash=`deck/${target.dataset.id}`;break;
    case 'filter':state.filter=target.dataset.filter;library();break;
    case 'star':case 'archive-deck':{const d=state.decks.find(d=>d.id===target.dataset.id);const saved=await api(`/api/decks/${d.id}`,{method:'PUT',body:{...d,[name==='star'?'starred':'archived']:!d[name==='star'?'starred':'archived']}});state.decks[state.decks.findIndex(x=>x.id===d.id)]=saved;library();if(name==='archive-deck')toast(saved.archived?'Presentation archived. You can restore it from Archived.':'Presentation restored.');break;}
    case 'duplicate-deck':{const d=state.decks.find(d=>d.id===target.dataset.id);const saved=await api('/api/decks',{method:'POST',body:{...d,title:d.title+' (copy)',archived:false}});state.decks.push(saved);library();toast('Presentation duplicated.');break;}
    case 'select-slide':state.index=Number(target.dataset.index);renderOutline();renderCurrent();break;
    case 'theme':snapshot();s.theme=target.dataset.theme;changed({panel:true});break;
    case 'add-item':if(s.items.length<maxItems(s.recipe)){snapshot();s.items.push({title:'New point',body:'Add your supporting detail.',value:''});changed({panel:true});}break;
    case 'remove-item':snapshot();s.items.splice(Number(target.dataset.index),1);changed({panel:true});break;
    case 'remove-image':snapshot();s.image='';changed({panel:true});break;
    case 'stock-image':snapshot();s.image=`/assets/travel-${target.dataset.image}.png`;s.imageAlt=`HeyMax guideline photography: ${target.dataset.image}`;changed({panel:true});break;
    case 'upload-image':$('#image-file').click();break;
    case 'move-up':case 'move-down':{const to=state.index+(name==='move-up'?-1:1);if(to>=0&&to<state.deck.slides.length){snapshot();[state.deck.slides[to],state.deck.slides[state.index]]=[state.deck.slides[state.index],state.deck.slides[to]];state.index=to;changed({panel:true});}break;}
    case 'duplicate-slide':if(state.deck.slides.length<80){snapshot();state.deck.slides.splice(state.index+1,0,{...structuredClone(s),id:uid()});state.index++;changed({panel:true});}else toast('This deck has reached the 80-slide limit.');break;
    case 'delete-slide':if(state.deck.slides.length>1){snapshot();state.deck.slides.splice(state.index,1);state.index=Math.min(state.index,state.deck.slides.length-1);changed({panel:true});toast('Slide removed. Undo to bring it back.');}break;
    case 'undo':case 'redo':{const from=name==='undo'?state.undo:state.redo,to=name==='undo'?state.redo:state.undo;if(!from.length)break;to.push(JSON.stringify({slides:state.deck.slides,title:state.deck.title,index:state.index}));const old=JSON.parse(from.pop());state.deck.slides=old.slides;state.deck.title=old.title;state.index=old.index;$('.deck-name').value=old.title;changed({panel:true});break;}
    case 'retry-save':state.saveError='';await save();break;
    case 'download-local':await downloadLocal();break;
    case 'reload-deck':{state.deck=await api(`/api/decks/${state.deck.id}`);state.conflict=false;state.saveError='';state.dirty=false;state.index=Math.min(state.index,state.deck.slides.length-1);state.undo=[];state.redo=[];editor();toast('Loaded the saved version.');break;}
    case 'present':if(await save())location.hash=`present/${state.deck.id}`;break;
    case 'exit-present':location.hash=`deck/${state.deck.id}`;break;
    case 'prev-slide':state.index=Math.max(0,state.index-1);present();break;
    case 'next-slide':state.index=Math.min(state.deck.slides.length-1,state.index+1);present();break;
    case 'export':exportDialog();break;
    case 'export-html':await downloadServer(`/api/decks/${state.deck.id}/export`,'heymax-presentation.html');break;
    case 'export-bundle':await downloadServer(`/api/decks/${state.deck.id}/bundle`,'heymax-presentation.json');break;
    case 'export-pdf':if(await save()){dialog.close();location.hash=`print/${state.deck.id}`;}break;
    case 'print-now':await document.fonts.ready;await Promise.all($$('.print-view img').map(i=>i.decode().catch(()=>{})));window.print();break;
    case 'import':$('#import-file').click();break;
    case 'add-knowledge':knowledgeDialog();break;
    case 'edit-knowledge':knowledgeDialog(target.dataset.id);break;
    case 'save-knowledge':{const f=$('#knowledge-form');if(!f.reportValidity())break;const body=Object.fromEntries(new FormData(f));const result=await api(knowledgeId?`/api/knowledge/${knowledgeId}`:'/api/knowledge',{method:knowledgeId?'PUT':'POST',body});if(knowledgeId)state.knowledge[state.knowledge.findIndex(k=>k.id===knowledgeId)]=result;else state.knowledge.push(result);dialog.close();knowledge();toast('Source saved.');break;}
    case 'brand-dialog':openDialog('Your brand is built in.','A few principles for a strong HeyMax story.',`<div class="panel-card"><h3>Clear. Confident. Human.</h3><p>Use the official wordmark, Plus Jakarta Sans, and approved colours. Keep photography warm and natural. Write one clear thought per slide.</p><div class="rule-note">Slides are editable, but source claims and offer conditions still need your review. Use the source field to keep qualifications visible.</div></div>`);break;
    case 'help':openDialog('Welcome to your studio.','A local home for your next HeyMax presentation.',`<div class="panel-card"><h3>Start → shape → share</h3><p>Open the starter deck or choose New presentation. Edit text directly with a double-click, or use the slide panel. Add and reorder slides, replace images, and keep your talking points in speaker notes.</p><p style="margin-top:15px">Changes save automatically on this laptop. Export a standalone presentation to share offline, or keep an editable backup. The brief builder uses your words and templates; AI integration comes later.</p><div class="rule-note">Local edition · no team accounts or cloud sharing yet. Closing the server stops the app, but your saved presentations remain on disk.</div></div>`);break;
  }
}
document.addEventListener('click',async e=>{const target=e.target.closest('[data-action]');if(!target||target.disabled)return;try{await action(target);}catch(err){if(dialog.open&&$('#dialog-error'))$('#dialog-error').textContent=err.message;else toast(err.message);}});
document.addEventListener('input',e=>{
  if(e.target.id==='deck-search'){state.search=e.target.value;renderDeckGrid();return;}
  if(!state.deck||state.page!=='deck')return;
  if(e.target.classList.contains('deck-name')){state.deck.title=e.target.value;changed();return;}
  if(e.target.id==='speaker-notes'){state.deck.slides[state.index].notes=e.target.value;changed();return;}
  if(e.target.matches('input[data-key],textarea[data-key]')){const {key,item}=e.target.dataset;const s=state.deck.slides[state.index];if(item!==undefined)s.items[Number(item)][key]=e.target.value;else s[key]=e.target.value;changed();}
});
document.addEventListener('focusin',e=>{if(state.page==='deck'&&state.deck&&e.target.matches('.deck-name,#speaker-notes,input[data-key],textarea[data-key]'))snapshot();});
document.addEventListener('change',e=>{if(!state.deck||!e.target.matches('select[data-key]'))return;snapshot();const s=state.deck.slides[state.index];if(e.target.dataset.key==='recipe'){const fresh=newSlide(e.target.value);s.recipe=fresh.recipe;if(!s.items.length)s.items=fresh.items;if(s.recipe==='product')s.imageFit='contain';}else s[e.target.dataset.key]=e.target.value;changed({panel:true});});
document.addEventListener('dblclick',e=>{
  const field=e.target.closest('[data-field]');if(!field||state.page!=='deck')return;
  const key=field.dataset.field, original=state.deck.slides[state.index][key];field.contentEditable='true';field.focus();
  const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(field);selection.removeAllRanges();selection.addRange(range);
  let cancelled=false;
  field.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){cancelled=true;field.blur();}if(event.key==='Enter'&&(event.metaKey||event.ctrlKey))field.blur();});
  field.addEventListener('paste',event=>{event.preventDefault();const text=event.clipboardData.getData('text/plain');const selection=window.getSelection();if(selection.rangeCount){const range=selection.getRangeAt(0);range.deleteContents();const node=document.createTextNode(text);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range);}});
  field.addEventListener('blur',()=>{field.contentEditable='false';if(cancelled){field.textContent=original;return;}const text=field.innerText.slice(0,({title:250,kicker:140,subtitle:600,source:500})[key]||3000);if(text!==original){snapshot();state.deck.slides[state.index][key]=text;changed({panel:true});}},{once:true});
});
$('#image-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file||!state.deck)return;const deckId=state.deck.id,slideId=state.deck.slides[state.index].id;try{if(file.size>8_000_000)throw new Error('Choose an image smaller than 8 MB.');toast('Adding your image…');const encoded=await blobBase64(file);const result=await api('/api/upload',{method:'POST',body:{data:encoded.split(',')[1]}});if(state.deck?.id!==deckId)return;const slide=state.deck.slides.find(s=>s.id===slideId);if(!slide)return;snapshot();slide.image=result.url;slide.imageAlt=file.name;changed({panel:true});toast('Image added.');}catch(err){toast(err.message);}});
$('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>50_000_000)throw new Error('This backup is too large (maximum 50 MB).');if(state.deck&&!(await save()))return;const body=JSON.parse(await file.text());const deck=await api('/api/import',{method:'POST',body});state.decks.push(deck);location.hash=`deck/${deck.id}`;toast('Presentation imported as a new copy.');}catch(err){toast(err instanceof SyntaxError?'Choose a valid HeyMax Studio JSON backup.':err.message);}});
document.addEventListener('keydown',e=>{
  if(dialog.open)return;
  const editing=e.target.matches('input,textarea,select,[contenteditable=true]');
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'&&state.deck){e.preventDefault();save();return;}
  if(state.page==='present'&&!editing){if(['ArrowRight','ArrowDown',' '].includes(e.key)){e.preventDefault();state.index=Math.min(state.index+1,state.deck.slides.length-1);present();}else if(['ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();state.index=Math.max(state.index-1,0);present();}else if(e.key==='Escape')location.hash=`deck/${state.deck.id}`;}
  if(state.page==='deck'&&!editing&&(e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();action({dataset:{action:e.shiftKey?'redo':'undo'}});}
});
window.addEventListener('beforeunload',e=>{if(state.dirty||saving){e.preventDefault();e.returnValue='';}});
window.addEventListener('hashchange',()=>route().catch(e=>toast(e.message)));
window.addEventListener('resize',fitSlides);
window.addEventListener('focus',async()=>{if(!state.deck&&!dialog.open){try{state.decks=await api('/api/decks');if(state.page==='library')renderDeckGrid();}catch{}}});
try{[state.decks,state.knowledge]=await Promise.all([api('/api/decks'),api('/api/knowledge')]);await route();await document.fonts.ready;fitSlides();}catch(e){app.innerHTML=`<div class="boot"><h1>We couldn’t open your studio.</h1><p style="margin:20px 0">${esc(e.message)}</p><p>Check that the local server is running, then refresh this page.</p></div>`;}
