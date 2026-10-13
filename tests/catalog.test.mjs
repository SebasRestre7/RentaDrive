import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { demoVehicles, demoPriceBounds, filterDemoVehicles, sortDemoVehicles, formatDemoPrice, formatDemoDate } from '../js/catalog-data.js';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const all = () => ({ type: [], transmission: [], fuel: [], brand: '', minPrice: demoPriceBounds.min, maxPrice: demoPriceBounds.max });

test('catalog labels and counts derive only from the three Figma demo records', () => {
  assert.equal(demoVehicles.length, 3);
  assert.equal(filterDemoVehicles(demoVehicles, all()).length, 3);
  assert.deepEqual(demoVehicles.map(vehicle => vehicle.name), ['Toyota Hilux', 'Mazda CX-5', 'Renault Sandero']);
  assert.equal(formatDemoPrice(200000), 'COP 200.000');
  assert.match(formatDemoDate('2026-08-12'), /^12 ago/);
});

test('filters combine groups by intersection while allowing multiple values within a group', () => {
  assert.deepEqual(filterDemoVehicles(demoVehicles, { ...all(), type: ['Económico'] }).map(vehicle => vehicle.id), ['renault-sandero']);
  assert.deepEqual(filterDemoVehicles(demoVehicles, { ...all(), type: ['Camioneta'], transmission: ['Automática'] }).map(vehicle => vehicle.id), ['mazda-cx-5']);
  assert.deepEqual(filterDemoVehicles(demoVehicles, { ...all(), type: ['SUV', 'Lujo'] }), []);
  assert.deepEqual(filterDemoVehicles(demoVehicles, { ...all(), fuel: ['Eléctrico'] }), []);
  assert.deepEqual(filterDemoVehicles(demoVehicles, { ...all(), brand: 'Toyota' }).map(vehicle => vehicle.id), ['toyota-hilux']);
  assert.deepEqual(filterDemoVehicles(demoVehicles, { ...all(), minPrice: 90000, maxPrice: 190000 }).map(vehicle => vehicle.id), ['mazda-cx-5']);
});

test('price sorting is stable on the demo records and does not mutate their original Figma order', () => {
  assert.deepEqual(sortDemoVehicles(demoVehicles, 'price-asc').map(vehicle => vehicle.id), ['renault-sandero', 'mazda-cx-5', 'toyota-hilux']);
  assert.deepEqual(sortDemoVehicles(demoVehicles, 'price-desc').map(vehicle => vehicle.id), ['toyota-hilux', 'mazda-cx-5', 'renault-sandero']);
  assert.deepEqual(sortDemoVehicles(demoVehicles, 'recommended').map(vehicle => vehicle.id), demoVehicles.map(vehicle => vehicle.id));
});

test('catalog reference assets are local, non-empty, and no temporary Figma URL is shipped', () => {
  const assets = [
    'catalog-background.png', 'logo.png', 'toyota-card.png', 'mazda-card.png', 'sandero-card.png',
    'heart.svg', 'header-heart.svg', 'header-search.svg', 'calendar.svg', 'pin.svg', 'chevron.svg',
  ];
  for (const asset of assets) assert.ok(statSync(join(projectRoot, 'assets', 'catalog', asset)).size > 0, asset);
  for (const file of ['catalog.html', 'css/catalog.css', 'js/catalog.js', 'js/catalog-data.js']) {
    assert.doesNotMatch(readFileSync(join(projectRoot, file), 'utf8'), /figma\.com\/api\/mcp\/asset/);
  }
});
