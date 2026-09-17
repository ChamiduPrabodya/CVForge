import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'isolated-browser-delete-test';
const { app, seedSystemTemplates } = await import('../server/app.js');
const database = `cvforge_template_test_browser_${Date.now()}_${process.pid}`;
let server;
let browser;
try {
  await mongoose.connect(`mongodb://127.0.0.1:27017/${database}`);
  const user = await mongoose.model('User').create({ email: 'browser-admin@example.com', passwordHash: 'unused', role: 'admin' });
  await seedSystemTemplates();
  const auth = { id: user.id, email: user.email, role: 'admin' };
  const token = jwt.sign(auth, process.env.JWT_SECRET);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const api = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage();
  await page.route('http://localhost:4000/api/**', route => route.continue({ url: route.request().url().replace('http://localhost:4000', api) }));
  await page.addInitScript(({ auth, token }) => {
    localStorage.setItem('cvforge-auth-token', token);
    localStorage.setItem('cvforge-auth-user', JSON.stringify(auth));
  }, { auth, token });
  const admin = async () => {
    await page.locator('.topbar nav').getByRole('button', { name: 'Admin', exact: true }).click();
    await page.locator('.admin-template-grid > article').filter({ hasText: 'Warner' }).waitFor();
  };
  const sanchez = () => page.locator('.admin-template-grid > article').filter({ has: page.getByRole('heading', { name: 'Sanchez', exact: true }) });
  await page.goto('http://localhost:5173');
  await admin();
  await sanchez().waitFor();
  // Hold an old refresh response while deleting, then release it afterwards.
  let release;
  let captured;
  const hold = new Promise(resolve => { release = resolve; });
  const pending = new Promise(resolve => { captured = resolve; });
  await page.route('http://localhost:4000/api/admin/system-templates', async route => {
    const response = await route.fetch({ url: `${api}/api/admin/system-templates` });
    captured();
    await hold;
    await route.fulfill({ response });
  }, { times: 1 });
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await pending;
  page.once('dialog', dialog => dialog.accept());
  const deleted = page.waitForResponse(response => response.request().method() === 'DELETE');
  await sanchez().getByRole('button', { name: 'Delete Sanchez', exact: true }).click();
  assert.equal((await deleted).status(), 204);
  await sanchez().waitFor({ state: 'detached' });
  release();
  await page.waitForLoadState('networkidle');
  assert.equal(await sanchez().count(), 0, 'Stale refresh must not restore the deleted card');
  await page.reload();
  await admin();
  assert.equal(await sanchez().count(), 0, 'Deleted card must stay absent after reload');
  await page.locator('.topbar nav').getByRole('button', { name: 'Templates', exact: true }).click();
  await page.locator('.template-card').filter({ hasText: 'Warner' }).waitFor();
  assert.equal(await page.locator('.template-card').filter({ hasText: 'Sanchez' }).count(), 0);
  await page.route('http://localhost:4000/api/templates/public', route => route.abort());
  await page.reload();
  await page.locator('.topbar nav').getByRole('button', { name: 'Templates', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('.template-card').count(), 0, 'API failure must not restore bundled templates');
  console.log('PASS: browser delete, delayed refresh, reload, public gallery, and API failure fallback.');
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === database && database.startsWith('cvforge_template_test_browser_')) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
