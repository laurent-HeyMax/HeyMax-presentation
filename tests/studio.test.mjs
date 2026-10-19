import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createApp } from '../server.mjs';
import { createStore, cleanDeck } from '../src/store.mjs';
import { newSlide, renderSlide, RECIPES } from '../public/slides.js';

async function fixture(t) {
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'heymax-test-'));
  const {server}=await createApp({dataDir,seed:false});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(dataDir,{recursive:true,force:true});});
  const request=async(url,{body,method='GET',headers={}}={})=>fetch(base+url,{method,headers:{'Content-Type':'application/json',...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const create=async()=>{const response=await request('/api/decks',{method:'POST',body:{title:'Integration test',slides:[newSlide('cover')]}});assert.equal(response.status,201);return response.json();};
  return {request,create,dataDir,base};
}

test('edits persist across store restart and retain a previous backup',async t=>{
  const {request,create,dataDir}=await fixture(t);const d=await create();
  d.slides[0].title='A saved headline';d.slides[0].notes='Notes persist too.';
  const response=await request(`/api/decks/${d.id}`,{method:'PUT',body:d});assert.equal(response.status,200);
  const saved=await response.json();assert.equal(saved.rev,2);
  const reopened=await createStore(dataDir);assert.equal(reopened.read().decks[0].slides[0].title,'A saved headline');assert.equal(reopened.read().decks[0].slides[0].notes,'Notes persist too.');
  const backup=JSON.parse(await readFile(path.join(dataDir,'studio.json.bak'),'utf8'));assert.equal(backup.decks[0].rev,1);
});

test('simultaneous stale writers cannot overwrite each other',async t=>{
  const {request,create}=await fixture(t);const d=await create();
  const responses=await Promise.all(['A','B'].map(title=>request(`/api/decks/${d.id}`,{method:'PUT',body:{...d,title}})));
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  const final=await (await request(`/api/decks/${d.id}`)).json();assert.equal(final.rev,2);
});

test('untrusted HTML and image URLs never become executable slide content',()=>{
  const deck=cleanDeck({title:'x',slides:[{...newSlide('cover'),title:'<script>alert(1)</script>',subtitle:'<img src=x onerror=alert(1)>',image:'https://untrusted.example/track.png'}]});
  const html=renderSlide(deck.slides[0]);assert.equal(deck.slides[0].image,'');assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));
  assert.throws(()=>cleanDeck({slides:[]}),/between 1 and 80/);assert.throws(()=>cleanDeck({slides:[{recipe:'arbitrary-html'}]}),/Unknown/);
});

test('every recipe renders and duplicate slide IDs are repaired',()=>{
  for(const r of RECIPES){const s=newSlide(r.id);assert.ok(renderSlide(s).includes(`recipe-${r.id}`));}
  const s=newSlide('cards');const d=cleanDeck({slides:[s,s]});assert.notEqual(d.slides[0].id,d.slides[1].id);
});

test('cross-origin writes and DNS-rebinding hostnames are rejected',async t=>{
  const {request,base}=await fixture(t);
  assert.equal((await request('/api/decks',{method:'POST',headers:{Origin:'https://evil.example'},body:{slides:[newSlide()]}})).status,403);
  // Node fetch rewrites Host; a raw HTTP request exercises the real hostname check.
  const hostStatus=await new Promise((resolve,reject)=>{const req=http.get(base+'/api/decks',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});
  assert.equal(hostStatus,403);
  assert.equal((await request('/api/decks',{method:'POST',headers:{'Sec-Fetch-Site':'cross-site'},body:{slides:[newSlide()]}})).status,403);
});

test('image upload, portable backup and import preserve image integrity',async t=>{
  const {request,create}=await fixture(t);
  const data='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF9sAAAAASUVORK5CYII=';
  const upload=await request('/api/upload',{method:'POST',body:{data}});assert.equal(upload.status,201);const {url}=await upload.json();
  const d=await create();d.slides[0].image=url;await request(`/api/decks/${d.id}`,{method:'PUT',body:d});
  const bundle=await (await request(`/api/decks/${d.id}/bundle`)).json();assert.equal(bundle.assets[url],data);
  const imported=await request('/api/import',{method:'POST',body:bundle});assert.equal(imported.status,201);const copy=await imported.json();assert.notEqual(copy.id,d.id);assert.equal(copy.slides[0].image,url);
  bundle.assets[url]=Buffer.from('not an image').toString('base64');assert.equal((await request('/api/import',{method:'POST',body:bundle})).status,400);
  const invalid=await request('/api/upload',{method:'POST',body:{data:Buffer.from('<svg onload="alert(1)"></svg>').toString('base64')}});assert.equal(invalid.status,400);
});

test('HTML export contains its font and imagery and escapes user text',async t=>{
  const {request}=await fixture(t);
  const deck=await (await request('/api/decks',{method:'POST',body:{title:'<script>bad</script>',slides:[{...newSlide('closing'),title:'<script>bad</script>'}]}})).json();
  const r=await request(`/api/decks/${deck.id}/export`);assert.equal(r.status,200);const html=await r.text();
  assert.ok(html.includes('data:font/woff2;base64,'));assert.ok(html.includes('data:image/svg+xml;base64,'));assert.ok(!html.includes('<script>bad</script>'));assert.ok(!html.includes('src="/assets/'));
});

test('knowledge approval and archive/restore persist independently',async t=>{
  const {request,create}=await fixture(t);
  const source=await (await request('/api/knowledge',{method:'POST',body:{title:'Campaign terms',body:'Example draft terms',status:'draft'}})).json();
  assert.equal(source.status,'draft');
  const approved=await (await request(`/api/knowledge/${source.id}`,{method:'PUT',body:{...source,status:'approved',reviewBy:'2027-01-01'}})).json();assert.equal(approved.status,'approved');
  const d=await create();const archived=await (await request(`/api/decks/${d.id}`,{method:'PUT',body:{...d,archived:true}})).json();assert.equal(archived.archived,true);
  const restored=await (await request(`/api/decks/${d.id}`,{method:'PUT',body:{...archived,archived:false}})).json();assert.equal(restored.archived,false);assert.equal(restored.slides.length,1);
});

test('corrupted data fails closed instead of replacing user presentations',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'heymax-corrupt-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  await writeFile(path.join(directory,'studio.json'),'{ broken');
  await assert.rejects(createStore(directory),/Restore studio.json.bak/);
  assert.equal(await readFile(path.join(directory,'studio.json'),'utf8'),'{ broken');
});
