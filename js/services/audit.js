import { createStore } from '../core/storage.js';

const store = createStore('audit');

export function recordDemoEvent({ actorId, role, action, reference, result = 'success' }) {
  const events = store.get('events', []);
  const list = Array.isArray(events) ? events : [];
  return store.set('events', [...list, { actorId, role, action, reference, result, at: new Date().toISOString() }]);
}

export function demoAuditEvents() {
  const events = store.get('events', []);
  return Array.isArray(events) ? events : [];
}

export function filterDemoAudit(actor, filters = {}) {
  if (actor?.role !== 'admin') throw new Error('Solo administración puede consultar la bitácora.');
  return demoAuditEvents().filter(item => (!filters.actorId || item.actorId === filters.actorId) &&
    (!filters.action || item.action.includes(filters.action)) && (!filters.result || item.result === filters.result) &&
    (!filters.reference || String(item.reference).includes(filters.reference)));
}
