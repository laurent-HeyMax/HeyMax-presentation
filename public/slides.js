// One renderer for editing, thumbnails, presenting, and self-contained exports.
export const BRAND_VERSION = 'heymax-2026.10-v1';
export const RECIPES = [
  { id: 'cover', name: 'Opening story', description: 'A clear promise, with room to breathe.', category: 'Story', tag: 'Start here' },
  { id: 'photo', name: 'A sense of place', description: 'A human moment to open a section.', category: 'Story', tag: 'Photography' },
  { id: 'statement', name: 'One big idea', description: 'Give an important thought the whole stage.', category: 'Story', tag: 'Statement' },
  { id: 'insight', name: 'The insight', description: 'One number, its meaning, and its source.', category: 'Evidence', tag: 'Research' },
  { id: 'cards', name: 'Three things', description: 'Three pillars, benefits, or opportunities.', category: 'Story', tag: 'Overview' },
  { id: 'product', name: 'Product in focus', description: 'A real screenshot beside a clear explanation.', category: 'Evidence', tag: 'Product' },
  { id: 'partnership', name: 'Better together', description: 'Show each partner’s role in the story.', category: 'Campaign', tag: 'Partnership' },
  { id: 'calendar', name: 'The campaign plan', description: 'Turn dates into a clear shared plan.', category: 'Campaign', tag: 'Calendar' },
  { id: 'timeline', name: 'What happens next', description: 'A sequence everyone can follow.', category: 'Campaign', tag: 'Timeline' },
  { id: 'offers', name: 'Packed with possibility', description: 'An offer collection in a luggage-inspired frame.', category: 'Campaign', tag: 'Offers' },
  { id: 'creative', name: 'The creative review', description: 'See the creative and the message together.', category: 'Campaign', tag: 'Review' },
  { id: 'closing', name: 'The next step', description: 'Finish with one purposeful action.', category: 'Story', tag: 'Closing' }
];
export const THEMES = ['light', 'lavender', 'dark'];
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => crypto.randomUUID();
export const safeImage = value => /^\/assets\/[a-zA-Z0-9._-]+$/.test(value || '') || /^\/uploads\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(value || '') ? value : '';
export function newSlide(recipe = 'cover') {
  const common = { id: uid(), recipe, theme: recipe === 'closing' ? 'dark' : 'light', kicker: 'HEYMAX / YOUR STORY', title: 'Your next story starts here', subtitle: 'A clear thought. A little inspiration. A step closer.', body: '', source: '', notes: '', image: '', imageAlt: '', imageFit: 'cover', items: [] };
  const defaults = {
    cover: { title: 'Everyday moments.\nExtraordinary possibilities.', subtitle: 'Give your next idea somewhere to go.', image: '/assets/travel-kyoto.png', imageAlt: 'Kyoto at dusk, from the HeyMax photography guideline' },
    photo: { title: 'A little closer\nto somewhere new.', subtitle: 'Start with the human story.', image: '/assets/travel-camera.png', imageAlt: 'A traveller taking a photograph beside the water' },
    statement: { title: 'Make the next step\nfeel possible.', subtitle: 'One slide. One idea. Something worth remembering.', theme: 'lavender' },
    insight: { title: 'Start with what people need.', body: 'Add a verified finding and explain why it matters.', items: [{ value: '—', title: 'Add a verified metric', body: 'Name the population and period.' }], source: 'Add the research source before presenting.' },
    cards: { title: 'A story in three parts.', subtitle: 'A simple framework for a shared direction.', items: [{ title: 'The moment', body: 'What is happening in people’s lives?' }, { title: 'The possibility', body: 'How can we make it more rewarding?' }, { title: 'The next step', body: 'What should someone do next?' }] },
    product: { title: 'Make the value visible.', subtitle: 'Show the real product experience.', body: 'Upload an approved product screenshot. Keep the interface legible and explain the benefit in plain language.', imageFit: 'contain' },
    partnership: { title: 'One story. Shared possibilities.', subtitle: 'Make each partner’s contribution clear.', items: [{ title: 'The partner', body: 'The offer, audience, and experience.' }, { title: 'HeyMax', body: 'The rewards and the connection to travel.' }], source: 'Proposed collaboration. Details to confirm.' },
    calendar: { title: 'A plan worth looking forward to.', subtitle: 'A shared view of the moments ahead.', items: [{ value: 'Week 01', title: 'Discover', body: 'Introduce the idea and gather feedback.' }, { value: 'Week 02', title: 'Explore', body: 'Share the details people need.' }, { value: 'Week 03', title: 'Take the next step', body: 'Bring the story together.' }], source: 'Illustrative schedule. Replace with confirmed dates.' },
    timeline: { title: 'From a first thought\nto the next step.', subtitle: 'A clear sequence, with a purpose at every stage.', items: [{ value: '01', title: 'Discover', body: 'Introduce the opportunity.' }, { value: '02', title: 'Explore', body: 'Make the value clear.' }, { value: '03', title: 'Act', body: 'Give people a next step.' }] },
    offers: { title: 'Offers packed for your next trip.', subtitle: 'A campaign concept for a curated merchant collection.', items: [{ title: 'Merchant A', body: 'Offer and Max Miles to confirm' }, { title: 'Merchant B', body: 'Offer and Max Miles to confirm' }, { title: 'Merchant C', body: 'Offer and Max Miles to confirm' }, { title: 'Merchant D', body: 'Offer and Max Miles to confirm' }], source: 'Concept only. Merchants, rates and eligibility are placeholders.' },
    creative: { title: 'The message, in the moment.', subtitle: 'Channel / campaign / date', body: 'Headline\nWrite a clear, benefit-led message.\n\nCall to action\nGive people one next step.', image: '/assets/travel-mountains.png', imageAlt: 'A traveller walking towards mountains', source: 'Creative exploration. Review before use.' },
    closing: { title: 'Let’s take\nthe next step.', subtitle: 'Add your call to action or discussion prompt.', kicker: 'HEYMAX / WHAT’S NEXT' }
  };
  return { ...common, ...(defaults[recipe] || defaults.cover) };
}
export function renderSlide(slide, { index = 0, total = 1, editable = false } = {}) {
  const recipe = RECIPES.some(r => r.id === slide.recipe) ? slide.recipe : 'cover';
  const theme = THEMES.includes(slide.theme) ? slide.theme : 'light';
  const field = (key, tag = 'p', cls = '') => `<${tag} class="${cls}"${editable ? ` data-field="${key}" tabindex="0" title="Double-click to edit"` : ''}>${esc(slide[key])}</${tag}>`;
  const items = (slide.items || []).slice(0, 6);
  const image = safeImage(slide.image);
  const media = `<div class="slide-media ${slide.imageFit === 'contain' ? 'contain' : ''}">${image ? `<img src="${esc(image)}" alt="${esc(slide.imageAlt || 'Presentation image')}" loading="eager">` : '<div class="media-empty"><span>＋</span><strong>Your product, in focus</strong><p>Add an image from the slide panel</p></div>'}</div>`;
  const header = `<div class="slide-heading">${field('kicker', 'p', 'slide-kicker')}${field('title', 'h1', 'slide-title')}${field('subtitle', 'p', 'slide-subtitle')}</div>`;
  const card = (item, i) => `<div class="content-card"><span class="item-number">${esc(item.value || String(i + 1).padStart(2, '0'))}</span><h2>${esc(item.title)}</h2><p>${esc(item.body)}</p></div>`;
  let content = '';
  if (recipe === 'cover') content = `<div class="cover-copy">${header}</div>${media}`;
  else if (recipe === 'photo') content = `${media}<div class="photo-overlay">${header}</div>`;
  else if (recipe === 'statement' || recipe === 'closing') content = `<div class="statement-copy">${header}</div><div class="statement-mark" aria-hidden="true">↗</div>`;
  else if (recipe === 'insight') content = `${header}<div class="insight-grid"><div class="metric"><strong>${esc(items[0]?.value || '—')}</strong><h2>${esc(items[0]?.title)}</h2><p>${esc(items[0]?.body)}</p></div>${field('body', 'p', 'insight-body')}</div>`;
  else if (recipe === 'cards' || recipe === 'partnership') content = `${header}<div class="content-cards cols-${Math.min(items.length, 3)}">${items.map(card).join('')}</div>`;
  else if (recipe === 'calendar') content = `${header}<div class="calendar-labels"><span>WHEN</span><span>THE MOMENT</span><span>THE PLAN</span></div><div class="calendar-rows">${items.map(item => `<div class="calendar-row"><strong>${esc(item.value)}</strong><h2>${esc(item.title)}</h2><p>${esc(item.body)}</p></div>`).join('')}</div>`;
  else if (recipe === 'timeline') content = `${header}<div class="timeline-items">${items.map(card).join('')}</div>`;
  else if (recipe === 'offers') content = `${header}<div class="offers-wrap"><div class="luggage-handle"></div><div class="offer-grid">${items.map(item => `<div class="offer"><h2>${esc(item.title)}</h2><p>${esc(item.body)}</p></div>`).join('')}</div></div>`;
  else content = `${header}<div class="split-content">${media}${field('body', 'p', 'split-body')}</div>`;
  return `<section class="slide recipe-${recipe} theme-${theme}" data-slide-id="${esc(slide.id)}"><div class="slide-top"><img class="slide-logo" src="/assets/logo-${theme === 'dark' || recipe === 'photo' ? 'light' : 'dark'}.svg" alt="HeyMax"><span class="slide-edition">${recipe === 'photo' ? 'A WORLD OF POSSIBILITY' : 'HEYMAX STUDIO'}</span></div><div class="slide-content">${content}</div><footer class="slide-footer">${field('source', 'p', 'slide-source')}<span>${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span></footer></section>`;
}
export function slideWarnings(slide) {
  const warnings = [];
  if ((slide.title || '').length > 105) warnings.push('This headline may be too long. Aim for one clear thought.');
  if ((slide.body || '').length > 650) warnings.push('The body is dense. Consider splitting this into two slides.');
  if (slide.recipe === 'insight' && !slide.source) warnings.push('Add a source for this insight.');
  if (slide.recipe === 'product' && !slide.image) warnings.push('Add a real product screenshot.');
  if ((slide.items || []).some(i => i.body.length > 180 || i.title.length > 65)) warnings.push('A card contains a lot of text. Shorten it for readability.');
  return warnings;
}
