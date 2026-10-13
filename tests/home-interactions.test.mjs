import assert from 'node:assert/strict';

const documentListeners = new Map();
const layerListeners = new Map();
let focused = '';
const iso = days => { const date = new Date(); date.setHours(12,0,0,0); date.setDate(date.getDate()+days); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; };
const dateLabel = value => new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${value}T12:00`)).replace('.','');
const originalStart = iso(1);
const originalEnd = iso(4);
const selectedStart = iso(6);
const selectedEnd = iso(9);
const homeValues = {
  '#location-value': { textContent: 'Medellín' },
  '#start-value': { textContent: '12 ago 2026' },
  '#end-value': { textContent: '15 ago 2026' },
};
const calendarButtons = [{ setAttribute() {} }, { setAttribute() {} }];
const layer = {
  hidden: true,
  innerHTML: '',
  addEventListener(name, listener) { layerListeners.set(name, listener); },
  replaceChildren() { this.innerHTML = ''; },
  querySelector(selector) {
    if (selector.startsWith('[data-day=')) return { focus() { focused = 'selected day'; } };
    if (selector.includes('.dialog__close')) return { focus() { focused = 'close'; } };
    return null;
  },
};

globalThis.document = {
  activeElement: { focus() { focused = 'opener'; } },
  body: { style: {} },
  querySelector(selector) {
    if (selector === '#dialog-layer') return layer;
    if (selector === '#live-status') return { textContent: '' };
    if (selector === '[data-overlay="location"]') return { setAttribute() {} };
    return homeValues[selector] ?? null;
  },
  querySelectorAll(selector) {
    return selector === '[data-overlay="calendar"]' ? calendarButtons : [];
  },
  addEventListener(name, listener) { documentListeners.set(name, listener); },
};
const sessionValues = new Map();
globalThis.window = { alert() {}, sessionStorage: {
  getItem(key) { return sessionValues.get(key) ?? null; },
  setItem(key, value) { sessionValues.set(key, value); },
  removeItem(key) { sessionValues.delete(key); },
} };

await import('../js/home.js');

function click(selector, node = {}) {
  documentListeners.get('click')({ target: { closest(candidate) { return candidate === selector ? node : null; } } });
}
function openCalendar() { click('[data-overlay]', { dataset: { overlay: 'calendar' } }); }
function choose(day) { click('[data-day]', { dataset: { day } }); }
function closeByX() {
  layerListeners.get('click')({ target: { closest(candidate) { return candidate === '[data-close-dialog]' ? {} : null; } } });
}

openCalendar();
assert.ok(layer.innerHTML.includes(dateLabel(originalStart)));
assert.ok(layer.innerHTML.includes(dateLabel(originalEnd)));
choose(iso(5));
assert.equal(focused, 'selected day');
assert.equal(homeValues['#start-value'].textContent, dateLabel(originalStart));
closeByX();
openCalendar();
assert.ok(layer.innerHTML.includes(dateLabel(originalStart)));
assert.ok(layer.innerHTML.includes(dateLabel(originalEnd)));

choose(iso(7));
documentListeners.get('keydown')({ key: 'Escape', preventDefault() {} });
openCalendar();
assert.ok(layer.innerHTML.includes(dateLabel(originalStart)));
assert.ok(layer.innerHTML.includes(dateLabel(originalEnd)));

choose(iso(8));
layerListeners.get('click')({ target: layer });
openCalendar();
assert.ok(layer.innerHTML.includes(dateLabel(originalStart)));
assert.ok(layer.innerHTML.includes(dateLabel(originalEnd)));

choose(selectedStart);
choose(selectedEnd);
click('[data-apply-dates]');
assert.equal(homeValues['#start-value'].textContent, dateLabel(selectedStart));
assert.equal(homeValues['#end-value'].textContent, dateLabel(selectedEnd));
openCalendar();
assert.ok(layer.innerHTML.includes(dateLabel(selectedStart)));
assert.ok(layer.innerHTML.includes(dateLabel(selectedEnd)));
closeByX();
click('[data-overlay]', { dataset: { overlay: 'location' } });
assert.match(layer.innerHTML, /aria-pressed="true"/);
assert.doesNotMatch(layer.innerHTML, /role="listbox"|role="option"/);
let catalogPath = '';
window.location = { assign(path) { catalogPath = path; } };
click('[data-city]', { dataset: { city: 'Bogotá' } });
click('[data-pending]', { dataset: { pending: 'catalog' } });
assert.equal(catalogPath, './catalog.html');
assert.deepEqual(JSON.parse(sessionValues.get('rentadrive:catalog-search:criteria')), {
  city: 'Bogotá', startDate: selectedStart, endDate: selectedEnd, startTime: '10:00', endTime: '10:00',
});
console.log('Home calendar, city, focus, ARIA, and catalog navigation state: PASS');
