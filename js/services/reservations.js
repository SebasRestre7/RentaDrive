import { createStore } from '../core/storage.js';
import { listFleet } from './fleet.js';
import { isAvailable } from './availability.js';
import { createDemoQuote } from './quote.js';
import { validPeriod } from './periods.js';
import { recordDemoEvent } from './audit.js';

const store = createStore('reservations');
const quoteStore = createStore('reviewed-quotes');
const quoteKey = data => [data.account?.id,data.requestId,data.vehicleId,data.city,data.startAt,data.endAt,data.policyId,data.currency??'COP'].join('|');
export function reviewDemoReservationQuote(data) {
  if (data.account?.role !== 'client') throw new Error('Se requiere cuenta cliente.');
  const vehicle = listFleet().find(item=>item.id===data.vehicleId);
  if (!data.requestId || !isAvailable(vehicle,data.city,data.startAt,data.endAt,listReservations())) throw new Error('Revisa selección y disponibilidad.');
  const snapshot = createDemoQuote(vehicle,data.policyId,data.startAt,data.endAt,data.currency??'COP');
  if (!quoteStore.set(quoteKey(data),snapshot)) throw new Error('No se pudo conservar la cotización revisada.');
  return snapshot;
}
export function reviewedDemoReservationQuote(data) { return quoteStore.get(quoteKey(data)); }


export function listReservations() {
  const saved = store.get('items', []);
  return Array.isArray(saved) ? saved : [];
}

export function updateDemoReservation(updated) {
  const items = listReservations();
  if (!items.some(item => item.id === updated?.id)) throw new Error('Reserva ficticia inexistente.');
  if (!store.set('items', items.map(item => item.id === updated.id ? updated : item))) throw new Error('No se pudo actualizar la reserva local.');
  return updated;
}

export function uniqueDemoReservationCode(existingReservations, randomId = () => crypto.randomUUID()) {
  const used = new Set(existingReservations.map(item => item.id));
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `RD-${randomId().slice(0, 8).toUpperCase()}`;
    if (!used.has(code)) return code;
  }
  throw new Error('No se pudo generar un código de reserva único. Intenta de nuevo.');
}

export function confirmDemoReservation({ account, vehicleId, city, startAt, endAt, policyId, currency = 'COP', requestId }) {
  if (!account || account.role !== 'client') throw new Error('Inicia sesión con una cuenta cliente para reservar.');
  if (!validPeriod(startAt, endAt)) throw new Error('Selecciona un período futuro con fin posterior al inicio.');
  if (!requestId) throw new Error('Falta el identificador de confirmación.');
  const reservations = listReservations(); // Always re-read immediately before confirmation.
  const existing = reservations.find(item => item.requestId === requestId && item.accountId === account.id);
  if (existing) return { reservation: existing, repeated: true };
  const vehicle = listFleet().find(item => item.id === vehicleId);
  if (!isAvailable(vehicle, city, startAt, endAt, reservations)) throw new Error('El vehículo dejó de estar disponible para ese período. Modifica la búsqueda.');
  if (!account.licenseExpiry || account.licenseExpiry < startAt.slice(0, 10)) throw new Error('La licencia de la cuenta debe estar vigente al iniciar la reserva.');
  const quote = reviewedDemoReservationQuote({account,vehicleId,city,startAt,endAt,policyId,currency,requestId}) ?? createDemoQuote(vehicle, policyId, startAt, endAt, currency);
  const id = uniqueDemoReservationCode(reservations);
  const reservation = { id, requestId, accountId: account.id, vehicleId, city, startAt, endAt, policyId,
    quote, status: 'confirmed', createdAt: new Date().toISOString(), depositStatus: 'pending-at-delivery',
    qrPayload: id,
    communications: [
      { channel: 'correo', recipient: account.email, status: 'simulado, no enviado' },
      { channel: 'SMS', recipient: account.phonePrimary, status: 'simulado, no enviado' },
    ] };
  if (!store.set('items', [...reservations, reservation])) throw new Error('No se pudo guardar la reserva en este navegador.');
  recordDemoEvent({ actorId: account.id, role: account.role, action:'confirm-demo-reservation', reference: id });
  return { reservation, repeated: false };
}
