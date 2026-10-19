import { mkdir, readFile, writeFile, rename, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { seedState } from './seed.mjs';
import { RECIPES, THEMES, safeImage, BRAND_VERSION } from '../public/slides.js';
export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const str = (v, max, fallback = '') => typeof v === 'string' ? v.slice(0, max) : fallback;
export function cleanDeck(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.slides) || input.slides.length < 1 || input.slides.length > 80) throw new HttpError(400, 'A deck needs between 1 and 80 slides.');
  const ids = new Set();
  const slides = input.slides.map(s => {
    if (!s || typeof s !== 'object' || !RECIPES.some(r => r.id === s.recipe)) throw new HttpError(400, 'Unknown slide layout.');
    let id = /^[a-zA-Z0-9-]{1,64}$/.test(s.id || '') ? s.id : randomUUID();
    if (ids.has(id)) id = randomUUID();
    ids.add(id);
    return { id, recipe: s.recipe, theme: THEMES.includes(s.theme) ? s.theme : 'light', kicker: str(s.kicker, 140), title: str(s.title, 250), subtitle: str(s.subtitle, 600), body: str(s.body, 3000), notes: str(s.notes, 12000), source: str(s.source, 500), image: safeImage(s.image), imageAlt: str(s.imageAlt, 300), imageFit: s.imageFit === 'contain' ? 'contain' : 'cover', items: (Array.isArray(s.items) ? s.items : []).slice(0, 6).map(i => ({ title: str(i?.title, 180), body: str(i?.body, 600), value: str(i?.value, 80) })) };
  });
  return { title: str(input.title, 150, 'Untitled presentation').trim() || 'Untitled presentation', description: str(input.description, 600), category: str(input.category, 60, 'Presentation'), starred: input.starred === true, archived: input.archived === true, brandVersion: BRAND_VERSION, slides };
}
export function cleanKnowledge(input) {
  if (!input || !str(input.title, 150).trim() || !str(input.body, 18000).trim()) throw new HttpError(400, 'Add a title and some source text.');
  return { title: str(input.title, 150).trim(), body: str(input.body, 18000), source: str(input.source, 1000), status: input.status === 'approved' ? 'approved' : 'draft', reviewBy: /^\d{4}-\d{2}-\d{2}$/.test(input.reviewBy || '') ? input.reviewBy : '' };
}
export async function createStore(directory, { seed = true } = {}) {
  await mkdir(directory, { recursive: true });
  const filename = path.join(directory, 'studio.json');
  let state;
  try { state = JSON.parse(await readFile(filename, 'utf8')); }
  catch (e) {
    // Never replace an unreadable or corrupted existing store with a sample deck.
    if (e.code !== 'ENOENT') throw new Error(`Cannot read ${filename}. Restore studio.json.bak before restarting.`, { cause: e });
    state = seed ? seedState() : { decks: [], knowledge: [] };
    await writeFile(filename, JSON.stringify(state, null, 2), { mode: 0o600 });
  }
  if (!Array.isArray(state.decks) || !Array.isArray(state.knowledge)) throw new Error('Invalid studio data. Restore a backup before restarting.');
  let queue = Promise.resolve();
  const read = () => structuredClone(state);
  const mutate = fn => {
    const operation = queue.then(async () => {
      const next = structuredClone(state);
      const result = await fn(next);
      const temp = `${filename}.${randomUUID()}.tmp`;
      await writeFile(temp, JSON.stringify(next, null, 2), { mode: 0o600 });
      await copyFile(filename, filename + '.bak');
      await rename(temp, filename);
      state = next;
      return structuredClone(result);
    });
    queue = operation.catch(() => {});
    return operation;
  };
  return { read, mutate, directory };
}
