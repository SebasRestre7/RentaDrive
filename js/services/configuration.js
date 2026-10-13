import { createStore } from '../core/storage.js';
import { demoPolicies } from './demo-data.js';
import { recordDemoEvent } from './audit.js';
import { localDateNow, parseLocalStamp } from './periods.js';

const store = createStore('configuration');
const kinds = ['rate','policy','agreement'];
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && Number.isFinite(parseLocalStamp(`${value}T12:00`));
const today = localDateNow;
const active = (item, onDate) => item.validFrom <= onDate && item.validThrough >= onDate;

export function listConfiguration(kind) {
  if (!kinds.includes(kind)) throw new Error('Tipo de configuración no permitido.');
  const items = store.get(kind, []);
  return Array.isArray(items) ? items : [];
}

export function publishDemoConfiguration(actor, kind, data) {
  if (actor?.role !== 'admin') throw new Error('Solo administración puede publicar configuraciones.');
  if (!kinds.includes(kind)) throw new Error('Tipo de configuración no permitido.');
  if (kind==='rate' && data.mode==='daily') data={...data,kmMin:0,kmMax:999999999};
  if (data.sourceId && (kind!=='rate' || !listConfiguration('rate').some(item=>item.id===data.sourceId))) throw new Error('Tarifa de origen inexistente.');
  const {validFrom,validThrough} = data;
  if (!validDate(validFrom) || !validDate(validThrough) || validThrough < validFrom || validThrough < today()) throw new Error('El rango de vigencia debe ser válido y no estar vencido.');
  if (kind === 'rate') {
    if (!String(data.gama ?? '').trim() || !['daily','kilometre'].includes(data.mode) || !Number.isFinite(Number(data.amountCop)) || Number(data.amountCop) <= 0 ||
        !Number.isFinite(Number(data.kmMin)) || !Number.isFinite(Number(data.kmMax)) || Number(data.kmMin) < 0 || Number(data.kmMax) < Number(data.kmMin)) throw new Error('Revisa gama, modalidad, tarifa y rango de kilometraje.');
  }
  if (kind === 'policy' && (!['basic','intermediate','premium'].includes(data.policyId) || !String(data.coverage ?? '').trim() || !Number.isFinite(Number(data.dailyPrice)) || Number(data.dailyPrice) < 0)) throw new Error('Revisa tipo, cobertura y precio de póliza.');
  if (kind === 'agreement' && (!String(data.company ?? '').trim() || !Number.isFinite(Number(data.discountPercent)) || Number(data.discountPercent) < 5 || Number(data.discountPercent) > 10)) throw new Error('El convenio exige empresa y descuento entre 5 % y 10 %.');
  const record = { ...data, sourceId:data.sourceId||null, id:crypto.randomUUID(), kind, publishedAt:new Date().toISOString(), publishedBy:actor.id, demoOnly:true };
  if (!store.set(kind, [...listConfiguration(kind), record])) throw new Error('No se pudo publicar en este navegador.');
  recordDemoEvent({actorId:actor.id, role:actor.role, action:`publish-demo-${kind}`, reference:record.id});
  return record;
}

export function effectivePolicy(policyId, onDate = today()) {
  const base = demoPolicies.find(item => item.id === policyId);
  if (!base) return null;
  const updates = listConfiguration('policy').filter(item => item.policyId === policyId && active(item,onDate));
  return updates.length ? {...base,...updates.at(-1),id:base.id} : base;
}

export function effectiveDailyRate(vehicle, onDate = today()) {
  const updates = listConfiguration('rate').filter(item => item.gama === vehicle.type && item.mode === 'daily' && active(item,onDate) &&
    Number(vehicle.mileage ?? 0) >= Number(item.kmMin) && Number(vehicle.mileage ?? 0) <= Number(item.kmMax));
  return updates.length ? Number(updates.at(-1).amountCop) : Number(vehicle.price);
}

export function effectiveAgreement(company, onDate = today()) {
  if (!company) return null;
  const updates = listConfiguration('agreement').filter(item => item.company.toLowerCase() === String(company).toLowerCase() && active(item,onDate));
  return updates.at(-1) ?? null;
}
