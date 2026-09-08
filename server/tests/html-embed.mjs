import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/home/kit/scrawl/.env' });
const { createToken } = await import('../utils/tokens.js');
const BASE = process.env.TEST_URL || 'https://markedly-avidly-ideal-amphibian.kitten.space';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const { data: owner } = await supabase.from('users').select('id').limit(1).maybeSingle();
if (!owner) throw new Error('No Scrawl owner found');
const token = createToken(owner.id);
const title = `zz html embed ${Date.now()}`;
let noteId;
let browser;

async function call(path, options = {}) {
  const response = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

try {
  const { note } = await call('/notes', { method: 'POST', body: JSON.stringify({ title }) });
  noteId = note.id;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript((value) => {
    if (window.top === window) localStorage.setItem('scrawl_session', value);
  }, token);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto(`${BASE}/n/${noteId}`, { waitUntil: 'networkidle' });
  await page.getByLabel('Embed HTML').click();
  await page.getByLabel('HTML code').fill('<h1 id="first">First embed</h1>');
  const firstBlock = page.locator('.html-embed').first();
  await firstBlock.getByRole('button', { name: 'Preview' }).click();
  assert.equal(await firstBlock.getByLabel('HTML code').count(), 0);
  assert.equal(await firstBlock.locator('iframe').count(), 1);
  await firstBlock.getByRole('button', { name: 'Code' }).click();
  assert.equal(await firstBlock.locator('iframe').count(), 0);
  await firstBlock.getByRole('button', { name: 'Split' }).click();
  assert.equal(await firstBlock.getByLabel('HTML code').count(), 1);
  assert.equal(await firstBlock.locator('iframe').count(), 1);
  await page.getByLabel('Embed HTML').click();
  const editors = page.getByLabel('HTML code');
  assert.equal(await editors.count(), 2, 'two HTML blocks should coexist');
  await editors.nth(1).fill('<p id="second">Second embed</p>');
  await page.locator('.ProseMirror > p:last-child').click();
  await page.keyboard.type('/html ');
  assert.equal(await page.locator('.html-embed').count(), 3, '/html then Space should insert a block');
  await page.waitForFunction(() => document.querySelector('.save-state')?.dataset.state === 'saved', null, { timeout: 15000 });

  for (const frame of await page.locator('iframe.html-embed-frame').all()) {
    assert.equal(await frame.getAttribute('sandbox'), 'allow-scripts');
  }
  assert.equal(await page.locator('iframe.html-embed-frame').count(), 3);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile must not overflow');
  await page.screenshot({ path: '/tmp/scrawl-html-embed-mobile.png', fullPage: false });

  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('.html-embed').count(), 3, 'blocks should survive reload');
  const savedHtml = await page.getByLabel('HTML code').evaluateAll((areas) => areas.map((area) => area.value));
  assert.ok(savedHtml.includes('<h1 id="first">First embed</h1>'));
  assert.ok(savedHtml.includes('<p id="second">Second embed</p>'));

  const reread = await call(`/notes/${noteId}`);
  const blocks = reread.note.content.content.filter((node) => node.type === 'htmlEmbed');
  const blockHtml = blocks.map((block) => block.attrs.html);
  assert.equal(blocks.length, 3);
  assert.ok(blockHtml.includes('<h1 id="first">First embed</h1>'));
  assert.ok(blockHtml.includes('<p id="second">Second embed</p>'));

  const { note: published } = await call(`/notes/${noteId}/publish`, { method: 'POST' });
  const reader = await context.newPage();
  await reader.goto(`${BASE}/p/${published.public_slug}`, { waitUntil: 'networkidle' });
  assert.equal(await reader.locator('.html-embed-readonly').count(), 3, 'shared note should render previews');
  assert.equal(await reader.getByLabel('HTML code').count(), 0, 'shared note must not expose editors');
  assert.equal(await reader.locator('iframe[sandbox="allow-scripts"]').count(), 3);
  await reader.close();

  assert.deepEqual(errors, []);
  console.log('PASS toolbar + slash insert, live preview, sandbox, multiple blocks, autosave, reload persistence, shared reader, mobile overflow');
} finally {
  if (browser) await browser.close();
  if (noteId) await call(`/notes/${noteId}`, { method: 'DELETE' }).catch((error) => console.error('cleanup failed', error));
}
