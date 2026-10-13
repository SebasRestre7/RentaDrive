import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const documentListeners = new Map();
const windowListeners = new Map();
let focused = '';
let pushCount = 0;
let replaceCount = 0;
let backCount = 0;

const basicNode = () => ({ innerHTML: '', textContent: '', hidden: false, style: { setProperty() {} }, setAttribute() {}, focus() {} });
const nodes = new Map();
for (const id of [
  '#catalog-layout', '#results-heading', '#search-dates', '#search-city', '#type-filters',
  '#transmission-filters', '#fuel-filters', '#brand-filter', '#min-price', '#max-price',
  '#price-range', '#min-price-label', '#max-price-label', '#sort-label', '#catalog-toast',
  '#edit-search', '#header-favorites',
]) nodes.set(id, basicNode());

const list = { ...basicNode(), querySelector(selector) {
  const id = selector.match(/\[data-detail="([^"]+)"\]/)?.[1];
  if (id && this.innerHTML.includes(`data-detail="${id}"`)) return { focus() { focused = id; } };
  if (selector === '[data-detail]') return { focus() { focused = 'first-result'; } };
  return null;
} };
nodes.set('#vehicle-list', list);

const title = { setAttribute() {}, focus() { focused = 'detail-title'; } };
const detail = { ...basicNode(), hidden: true, querySelector(selector) { return selector === '#detail-title' ? title : null; } };
nodes.set('#detail-view', detail);

const sortOptions = ['recommended', 'price-asc', 'price-desc'].map(sort => ({
  dataset: { sort }, attributes: {},
  setAttribute(name, value) { this.attributes[name] = value; },
  focus() { focused = `sort-${sort}`; },
}));
const sortMenu = { ...basicNode(), hidden: true,
  querySelectorAll(selector) { return selector === '[data-sort]' ? sortOptions : []; },
  querySelector(selector) { return selector === '[data-sort]' ? sortOptions[0] : null; },
};
nodes.set('#sort-menu', sortMenu);
const sortTrigger = { ...basicNode(), focus() { focused = 'sort-trigger'; } };
nodes.set('#sort-trigger', sortTrigger);

const layer = { ...basicNode(), hidden: true, addEventListener() {}, querySelector() { return null; } };
nodes.set('#dialog-layer', layer);

globalThis.document = {
  body: { style: {} }, activeElement: { focus() {} },
  querySelector(selector) { return nodes.get(selector) ?? null; },
  addEventListener(name, listener) { documentListeners.set(name, [...(documentListeners.get(name) ?? []), listener]); },
};
globalThis.window = {
  localStorage: { getItem() { return null; }, setItem() {} },
  sessionStorage: { getItem() { return null; }, setItem() {} },
  addEventListener(name, listener) { windowListeners.set(name, listener); },
};
globalThis.location = { pathname: '/catalog.html', search: '', hash: '#mazda-cx-5' };
const entries = [{ hash: location.hash, state: null }];
let position = 0;
globalThis.history = {
  get state() { return entries[position].state; },
  pushState(state, _unused, url) {
    pushCount++;
    entries.splice(position + 1);
    entries.push({ hash: url.startsWith('#') ? url : '', state });
    position++;
    location.hash = entries[position].hash;
  },
  replaceState(state, _unused, url) {
    replaceCount++;
    entries[position] = { hash: url.startsWith('#') ? url : '', state };
    location.hash = entries[position].hash;
  },
  back() {
    backCount++;
    position--;
    location.hash = entries[position].hash;
    windowListeners.get('popstate')();
  },
};

await import('../js/catalog.js');

function click(selector, dataset = {}) {
  const target = { closest(candidate) { return candidate.split(',').map(value => value.trim()).includes(selector) ? { dataset } : null; } };
  for (const listener of documentListeners.get('click') ?? []) listener({ target });
}

test('direct detail URL returns to results without new history entry and restores Mazda focus', () => {
  assert.equal(detail.hidden, false);
  assert.match(detail.innerHTML, /Mazda CX-5/);
  click('#back-to-results');
  assert.equal(detail.hidden, true);
  assert.equal(pushCount, 0);
  assert.equal(replaceCount, 1);
  assert.equal(location.hash, '');
  assert.equal(focused, 'mazda-cx-5');
});

test('in-app detail back uses browser history and restores the originating Sandero button', () => {
  click('[data-detail]', { detail: 'renault-sandero' });
  assert.equal(pushCount, 1);
  assert.equal(location.hash, '#renault-sandero');
  click('#back-to-results');
  assert.equal(backCount, 1);
  assert.equal(pushCount, 1);
  assert.equal(location.hash, '');
  assert.equal(focused, 'renault-sandero');
});

test('Toyota detail matches Figma manual transmission copy', () => {
  click('[data-detail]', { detail: 'toyota-hilux' });
  assert.match(detail.innerHTML, /Transmisión manual/);
  assert.doesNotMatch(detail.innerHTML, /Transmisión mecánica/);
  click('#back-to-results');
});

test('sort choices are ordinary Tab-focusable buttons with pressed state and Escape close', () => {
  const html = readFileSync(new URL('../catalog.html', import.meta.url), 'utf8');
  assert.match(html, /id="sort-menu" role="group"/);
  assert.doesNotMatch(html, /role="menu"|role="menuitemradio"|aria-haspopup="menu"/);
  click('#sort-trigger');
  assert.equal(sortMenu.hidden, false);
  assert.equal(focused, 'sort-recommended');
  click('[data-sort]', { sort: 'price-asc' });
  assert.equal(sortMenu.hidden, true);
  assert.equal(sortOptions[1].attributes['aria-pressed'], 'true');
  click('#sort-trigger');
  for (const listener of documentListeners.get('keydown') ?? []) listener({ key: 'Escape', preventDefault() {} });
  assert.equal(sortMenu.hidden, true);
  assert.equal(focused, 'sort-trigger');
});
