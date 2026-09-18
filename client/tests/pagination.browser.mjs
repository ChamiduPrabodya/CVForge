// Requires a running `npm run dev:web` and Playwright (or PLAYWRIGHT_MODULE).
// Provider/catalog requests are stubbed; no credentials or paid AI calls are used.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const directory = new URL('../../shared/templates/', import.meta.url);
const templates = await Promise.all((await readdir(directory)).filter(name => name.endsWith('.json')).map(async name => JSON.parse(await readFile(new URL(name, directory), 'utf8'))));
templates.push({ ...templates[0], id: 'custom-letter', name: 'Custom Letter', style: 'custom', layout: 'single', pageSize: 'letter' });
templates.push({ ...templates[0], id: 'custom-columns', name: 'Custom Columns', style: 'twocolumn', layout: 'two-column', sidebarPosition: 'right' });
templates.push({ ...templates[0], id: 'portrait', name: 'Portrait', style: 'portrait', layout: 'two-column' });
const details = {
  fullName: 'Pagination Example', title: 'Software Engineer', email: 'pages@example.com', phone: '123456789', location: 'Colombo', website: '', linkedin: '',
  summary: 'Experienced engineer building accessible and reliable applications.',
  experience: Array.from({ length: 18 }, (_, index) => ({ id: `job-${index}`, title: `Engineer ${index}`, company: `Company ${index}`, location: 'Remote', start: '2020', end: '2024', description: `ENTRY${index}START Built accessible services and supported teams.\nImproved reliability through careful testing and monitoring.\nDocumented the application and mentored engineers. ENTRY${index}END` })),
  education: [{ id: 'edu', degree: 'Computer Science', school: 'Example University', start: '2010', end: '2014', location: '', description: 'Studied software systems.' }],
  skills: Array.from({ length: 85 }, (_, index) => `Technical skill ${index}`), expertise: [], projects: [], certifications: [], languages: [], achievements: [], volunteer: [], references: [],
};
if (process.env.PAGINATION_CASE === 'short') {
  details.experience = details.experience.slice(0, 1);
  details.skills = details.skills.slice(0, 3);
}
if (process.env.PAGINATION_CASE === 'oversized') {
  details.summary = 'Long summary with unique content preserved across pages. '.repeat(160);
  details.experience = [{ ...details.experience[0], description: 'Oversized single entry with detailed project contributions. '.repeat(200) }];
  details.skills = [];
}
if (process.env.NO_DATES) details.experience.forEach(item => { item.start = ''; item.end = ''; });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.text().startsWith('Export notification:')) console.log(message.text()); });
  await page.addInitScript(() => {
    let previous = '';
    new MutationObserver(() => {
      const text = document.querySelector('.toast')?.textContent;
      if (text && text !== previous) { console.log('Export notification:', text); previous = text; }
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await page.route('**/api/templates/public', route => route.fulfill({ json: templates }));
  await page.route('**/api/ai/import', route => route.fulfill({ json: { details } }));
  await page.goto(process.env.TEST_URL || 'http://localhost:5173');
  await page.getByRole('button', { name: 'Improve my resume', exact: true }).click();
  await page.getByLabel('Upload existing CV').setInputFiles({ name: 'long-cv.txt', mimeType: 'text/plain', buffer: Buffer.from('Synthetic resume for pagination testing only.') });
  await page.getByRole('button', { name: 'Choose my template' }).click();
  for (const template of templates.filter(template => !process.env.TEMPLATE || template.style === process.env.TEMPLATE)) {
    await page.getByRole('button', { name: `Use ${template.name} template`, exact: true }).click();
    await page.locator('.resume-page').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    const report = await page.evaluate(() => {
      const clean = node => {
        const copy = node.cloneNode(true);
        copy.querySelectorAll('h3').forEach(heading => heading.remove());
        return copy.textContent.replace(/\s/g, '');
      };
      const sources = [...document.querySelectorAll('.resume-measure .cv-section')];
      const pages = [...document.querySelectorAll('.resume-page')];
      return {
        count: pages.length,
        mismatch: sources.flatMap((section, index) => {
          const text = [...document.querySelectorAll(`.resume-pages section[data-page-slot="${index}"]`)].map(clean).join('');
          return clean(section) === text ? [] : [index];
        }),
        overflow: pages.filter(page => page.firstElementChild.scrollHeight > page.clientHeight + 1).length,
        shiftedColumns: sources.flatMap((section, index) => ['.careline-entry > div', '.mercado-entry-body'].flatMap(selector => {
          const source = section.querySelector(selector);
          if (!source) return [];
          const width = source.getBoundingClientRect().width;
          return [...document.querySelectorAll(`.resume-pages section[data-page-slot="${index}"] ${selector}`)].filter(element => Math.abs(element.getBoundingClientRect().width - width) > 1).map(element => ({ selector, expectedWidth: width, actualWidth: element.getBoundingClientRect().width }));
        })),
      };
    });
    if (process.env.PAGINATION_CASE === 'short') assert.equal(report.count, 1, `${template.name} must keep a short CV on one page`);
    else assert.ok(report.count >= 2, `${template.name} should have multiple pages`);
    assert.deepEqual(report.mismatch, [], `${template.name} must preserve every section's content once`);
    assert.equal(report.overflow, 0, `${template.name} must fit all page content`);
    assert.deepEqual(report.shiftedColumns, [], `${template.name} continuation text must retain its column width`);
    if (!process.env.SKIP_PDF) {
      const downloadPromise = page.waitForEvent('download', { timeout: 60000 }).catch(async error => {
        console.error('Export failed:', await page.locator('.toast').allTextContents());
        throw error;
      });
      await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
      const download = await downloadPromise;
      const pdfTask = getDocument({ data: new Uint8Array(await readFile(await download.path())) });
      const pdf = await pdfTask.promise;
      assert.equal(pdf.numPages, report.count, `${template.name} PDF must include every preview page`);
      const first = await pdf.getPage(1);
      const [,, width, height] = first.view;
      assert.ok(Math.abs(width / height - (template.pageSize === 'letter' ? 8.5 / 11 : 210 / 297)) < .001);
      await pdfTask.destroy();
      const printTask = getDocument({ data: new Uint8Array(await page.pdf({ preferCSSPageSize: true, printBackground: true })) });
      const printed = await printTask.promise;
      assert.equal(printed.numPages, report.count, `${template.name} print must match preview pages`);
      await printTask.destroy();
    }
    console.log(`PASS ${template.name}: ${report.count} pages, no lost content or overflow${process.env.SKIP_PDF ? '' : ', PDF verified'}`);
    if (process.env.CAPTURE) {
      await page.setViewportSize({ width: 1000, height: 1900 });
      await page.evaluate(() => {
        const copy = document.querySelector('.a4-wrap').cloneNode(true);
        copy.dataset.paginationCapture = 'true';
        copy.style.cssText += ';position:fixed;top:0;left:0;z-index:99999;width:620px;zoom:1;margin:0;';
        [...copy.querySelectorAll('.resume-page')].slice(2).forEach(page => page.remove());
        document.body.append(copy);
      });
      await page.locator('[data-pagination-capture]').screenshot({ path: 'tmp/pagination-preview.png' });
      await page.locator('[data-pagination-capture]').evaluate(element => element.remove());
    }
    await page.locator('.builder-top').getByRole('button', { name: 'Templates', exact: true }).click();
  }
  if (process.env.CHECK_EDITING) {
    await page.getByRole('button', { name: 'Use Careline template', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.mobile-builder-tabs').getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: 'Professional summary', exact: true }).click();
    const summary = page.locator('.accordion').filter({ has: page.getByRole('button', { name: 'Professional summary', exact: true }) }).locator('textarea');
    await summary.fill('Long editable summary for mobile pagination. '.repeat(150));
    await page.waitForFunction(() => document.querySelectorAll('.resume-pages .resume-page').length > 1);
    const count = await page.locator('.resume-pages .resume-page').count();
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
    const mobilePDF = getDocument({ data: new Uint8Array(await readFile(await (await downloaded).path())) });
    assert.equal((await mobilePDF.promise).numPages, count, 'Export must update even with the mobile preview hidden');
    await mobilePDF.destroy();
    await summary.fill('A short edited summary.');
    await page.waitForFunction(() => document.querySelectorAll('.resume-pages .resume-page').length === 1);
    await page.locator('.mobile-builder-tabs').getByRole('button', { name: 'Preview', exact: true }).click();
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    assert.equal(await page.locator('.resume-page').count(), 1);
    console.log('PASS mobile edits grow and shrink page count, hidden-preview export, and zoom');
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
