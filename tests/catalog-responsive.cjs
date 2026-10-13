const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const baseline = process.argv.includes('--baseline');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((request, response) => {
  const file = path.resolve(root, '.' + decodeURIComponent(request.url.split('?')[0]));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
});
let browser;
const geometry = page => page.evaluate(() => {
  const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  const visible = el => el.getClientRects().length && !el.closest('[hidden]');
  const offenders = [];
  for (const owner of document.querySelectorAll('.vehicle-card, .search-summary, .filters, .results__toolbar, .sort-menu:not([hidden]), .vehicle-detail:not([hidden]), .dialog[data-type^="catalog-"]')) {
    const bounds = rect(owner);
    for (const el of owner.querySelectorAll('h1,h2,h3,p,span,button,input,select,label,img,.vehicle-card__content,.catalog-dialog__actions')) {
      if (!visible(el)) continue;
      const box = rect(el);
      if (el.closest('.sort-menu') && !owner.matches('.sort-menu')) continue;
      if (box.x < bounds.x - 1 || box.right > bounds.right + 1 || box.bottom > bounds.bottom + 1) offenders.push({ element: el.className || el.tagName, box, owner: owner.className, bounds });
      if (['H1', 'H3', 'P', 'SPAN'].includes(el.tagName)) {
        const range = document.createRange(); range.selectNodeContents(el);
        for (const text of range.getClientRects()) if (text.right > bounds.right + 1 || text.left < bounds.x - 1) offenders.push({ text: el.textContent, right: text.right, owner: owner.className });
      }
    }
  }
  const measure = selector => { const el = document.querySelector(selector); return el && visible(el) ? rect(el) : null; };
  return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, app: measure('.catalog-app'), results: measure('.catalog-main'), card: measure('.vehicle-card'), image: measure('.vehicle-card__photo'), content: measure('.vehicle-card__content'), filters: measure('.filters'), offenders };
});
const proof = async page => {
  const measured = await geometry(page);
  assert.ok(measured.scrollWidth <= measured.viewport + 1, JSON.stringify(measured));
  assert.deepEqual(measured.offenders, [], 'Content escapes owning surface: ' + JSON.stringify(measured.offenders));
  if (measured.card) assert.ok(Math.abs(measured.card.width - measured.results.width) < 2, 'Cards do not fill result track');
  const images = await page.locator('.vehicle-card__photo, .vehicle-detail__image').evaluateAll(images => images.map(img => ({ fit: getComputedStyle(img).objectFit, loaded: img.complete && img.naturalWidth > 0 })));
  assert.ok(images.every(img => img.loaded && ['contain', 'cover'].includes(img.fit)), 'Images must load without stretching');
};
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  fs.mkdirSync(path.join(root, 'docs/review'), { recursive: true });
  const measurements = [];
  for (const viewport of [{ width: 1280, height: 832 }, { width: 390, height: 844 }, { width: 1920, height: 1080 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/catalog.html`, { waitUntil: 'networkidle' });
    measurements.push(await geometry(page));
    if (viewport.width !== 1920) {
      if (!baseline && viewport.width === 390) await page.locator('.catalog-main').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(root, `docs/review/catalog-responsive-${viewport.width === 390 ? 'mobile' : 'desktop'}${baseline ? '-before' : ''}.png`) });
    }
    if (!baseline) {
      await proof(page);
      if (viewport.width === 390) {
        const g = await geometry(page);
        assert.ok(g.image.bottom <= g.content.y + 1, 'Mobile card image and text must stack');
      }
      if (viewport.width === 1920) assert.ok((await geometry(page)).app.width > 1280, 'Wide page is capped at old fixed canvas');
      // Resize alone must not mutate filters, sorting, or current search.
      const selected = page.locator('[data-filter-group="type"][value="SUV"]');
      await selected.check();
      await page.locator('#sort-trigger').click(); await proof(page);
      await page.locator('[data-sort="price-desc"]').click();
      const heading = await page.locator('#results-heading').textContent();
      await page.setViewportSize({ width: viewport.width === 390 ? 1280 : 390, height: 844 });
      assert.ok(await selected.isChecked());
      assert.equal(await page.locator('#sort-label').textContent(), 'Ordenar: Mayor precio');
      assert.equal(await page.locator('#results-heading').textContent(), heading);
      await proof(page);
      await page.setViewportSize(viewport);
      await page.locator('#clear-filters').click();
      await page.locator('#brand-filter').click(); await proof(page);
      await page.locator('[data-brand="Toyota"]').click();
      assert.equal(await page.locator('#brand-filter').textContent(), 'Toyota');
      await page.locator('#clear-filters').click();
      const favorite = page.locator('[data-favorite]').first();
      const id = await favorite.getAttribute('data-favorite');
      await favorite.click(); assert.equal(await page.locator(`[data-favorite="${id}"]`).getAttribute('aria-pressed'), 'true');
      await page.locator('#header-favorites').click(); await proof(page);
      assert.equal(await page.locator('[data-detail]').count(), 1);
      await page.locator(`[data-detail="${id}"]`).click(); await proof(page);
      assert.ok(page.url().endsWith('#' + id));
      // Fleet names and prices may be wider than stock fixtures; wrapping must
      // constrain both natural phrases and unbroken identifiers in detail views.
      const detailCopy = await page.locator('.vehicle-detail__info').evaluate(info => {
        const title = info.querySelector('h1'); const price = info.querySelector('.vehicle-detail__price');
        const saved = { title: title.textContent, price: price.textContent };
        title.textContent = 'Long vehicle name with multiple words '.repeat(8) + 'X'.repeat(160);
        price.textContent = 'COP' + '9'.repeat(160) + '/día';
        return saved;
      });
      await proof(page);
      await page.locator('.vehicle-detail__info').evaluate((info, saved) => {
        info.querySelector('h1').textContent = saved.title;
        info.querySelector('.vehicle-detail__price').textContent = saved.price;
      }, detailCopy);
      await page.locator('#back-to-results').click(); await page.locator('#catalog-layout').waitFor({ state: 'visible' });
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.locator(`[data-favorite="${id}"]`).getAttribute('aria-pressed'), 'true');
      await page.locator(`[data-favorite="${id}"]`).click();
      await page.locator('#header-favorites').click();
      await page.locator('#edit-search').click(); await proof(page);
      const fields = ['startDate', 'startTime', 'endDate', 'endTime'];
      const values = Object.fromEntries(await Promise.all(fields.map(async name => [name, await page.locator(`[name="${name}"]`).inputValue()])));
      await page.locator('[name="city"]').selectOption('Bogotá');
      await page.locator('#catalog-search-form button[type="submit"]').click();
      assert.equal(await page.locator('#search-city').textContent(), 'Bogotá');
      await page.reload({ waitUntil: 'networkidle' });
      await page.locator('#header-search').click(); await proof(page);
      for (const name of fields) assert.equal(await page.locator(`[name="${name}"]`).inputValue(), values[name]);
      assert.equal(await page.locator('[name="city"]').inputValue(), 'Bogotá');
      await page.locator('[data-close-dialog]').click();
      await proof(page);
      assert.deepEqual(errors, []);
    }
    await context.close();
  }
  fs.writeFileSync(path.join(root, `docs/review/catalog-responsive-${baseline ? 'before' : 'after'}.json`), JSON.stringify(measurements, null, 2));
  console.log(JSON.stringify(measurements, null, 2));
  console.log(baseline ? 'BASELINE CAPTURED' : 'CATALOG RESPONSIVE PASS: geometry, text/control containment, aspect-preserving images, search persistence, filters, brand, sort, favorites persistence/removal, detail navigation at 1280x832 + 390x844 + 1920x1080');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); server.close(); });
