import { createStore } from '../core/storage.js';
import { listReservations, updateDemoReservation } from './reservations.js';
import { listFleet, markDemoDeliveredVehicle } from './fleet.js';
import { isAvailable } from './availability.js';
import { createDemoQuote } from './quote.js';
import { validPeriod, localDateNow } from './periods.js';
import { recordDemoEvent } from './audit.js';

const store = createStore('deliveries');
const accountsStore = createStore('accounts');
const deny = message => { throw new Error(message); };
export function listDemoDeliveries(actor) {
  if (!['coordinator','admin'].includes(actor?.role)) deny('Se requiere una cuenta de personal ficticia.');
  const items = store.get('items', []);
  return Array.isArray(items) ? items : [];
}
export function findDemoReservation(actor, query) {
  if (actor?.role !== 'coordinator') deny('Solo coordinación puede registrar una entrega.');
  const term = String(query ?? '').trim().replace(/^RENTADRIVE-DEMO:/,'');
  if (!term) deny('Introduce QR, número de reserva o documento ficticio.');
  const accounts = accountsStore.get('items', []);
  const account = accounts.find(item => item.documentNumber === term);
  const matches = listReservations().filter(item => item.status === 'confirmed' &&
    (item.id === term || item.qrPayload === term || item.accountId === account?.id));
  if (!matches.length) deny('No se encontró una reserva confirmada con ese dato ficticio.');
  if (matches.length > 1) deny('Ese documento tiene varias reservas. Busca por QR o número de reserva.');
  return matches[0];
}
export function demoDeliveryAlternatives(actor, reservationId) {
  if (actor?.role !== 'coordinator') deny('Solo coordinación puede consultar alternativas de entrega.');
  const reservation = listReservations().find(item => item.id === reservationId);
  if (!reservation) deny('Reserva no encontrada.');
  return listFleet().filter(vehicle => vehicle.id !== reservation.vehicleId &&
    isAvailable(vehicle, reservation.city, reservation.startAt, reservation.endAt, listReservations()));
}
export function reassignDemoDelivery(actor, reservationId, vehicleId) {
  if (actor?.role !== 'coordinator') deny('Solo coordinación puede reasignar.');
  const reservation = listReservations().find(item => item.id === reservationId && item.status === 'confirmed');
  if (!reservation || listDemoDeliveries(actor).some(item => item.reservationId === reservationId)) deny('La reserva no admite reasignación.');
  const vehicle = demoDeliveryAlternatives(actor, reservationId).find(item => item.id === vehicleId);
  if (!vehicle) deny('El vehículo alternativo no está disponible en sede y período.');
  const newQuote = createDemoQuote(vehicle,reservation.policyId,reservation.startAt,reservation.endAt,reservation.quote.currency);
  if (newQuote.totalCop !== reservation.quote.totalCop) deny('Cambio de precio pendiente de regla aprobada; elige una alternativa de igual cotización.');
  const updated = updateDemoReservation({...reservation,vehicleId,quote:newQuote,reassignedAt:new Date().toISOString(),reassignedBy:actor.id});
  recordDemoEvent({actorId:actor.id,role:actor.role,action:'reassign-demo-delivery',reference:reservationId});
  return updated;
}
export function extendDemoDelivery(actor, reservationId, endAt) {
  if (actor?.role !== 'coordinator') deny('Solo coordinación puede registrar ampliaciones ficticias.');
  const reservation = listReservations().find(item => item.id === reservationId && item.status === 'confirmed');
  if (!reservation || listDemoDeliveries(actor).some(item => item.reservationId === reservationId)) deny('La reserva no admite ampliación.');
  if (!validPeriod(reservation.endAt,endAt)) deny('El nuevo fin debe ser futuro y posterior al actual.');
  const vehicle = listFleet().find(item => item.id === reservation.vehicleId);
  const others = listReservations().filter(item => item.id !== reservationId);
  if (!isAvailable(vehicle,reservation.city,reservation.endAt,endAt,others)) deny('La ampliación se solapa con otra reserva o estado de flota.');
  const quote = createDemoQuote(vehicle,reservation.policyId,reservation.startAt,endAt,reservation.quote.currency);
  const updated = updateDemoReservation({...reservation,endAt,quote,extensionImpactCop:quote.totalCop-reservation.quote.totalCop,extendedAt:new Date().toISOString()});
  recordDemoEvent({actorId:actor.id,role:actor.role,action:'extend-demo-delivery',reference:reservationId});
  return updated;
}
export function registerDemoDelivery(actor, reservationId, input) {
  if (actor?.role !== 'coordinator') deny('Solo coordinación puede registrar la entrega.');
  const reservation = listReservations().find(item => item.id === reservationId && item.status === 'confirmed');
  if (!reservation) deny('Reserva confirmada no encontrada.');
  if (listDemoDeliveries(actor).some(item => item.reservationId === reservationId)) deny('La entrega ya se registró.');
  const account = (accountsStore.get('items', []) ?? []).find(item => item.id === reservation.accountId);
  const vehicle = listFleet().find(item => item.id === reservation.vehicleId);
  if (!account || !vehicle || vehicle.city !== reservation.city || vehicle.state !== 'available') deny('Verifica cuenta, sede y estado del vehículo.');
  if (!account.licenseExpiry || account.licenseExpiry < localDateNow()) deny('Entrega bloqueada: licencia vencida.');
  if (!input.identityChecked || !input.categoryChecked) deny('Entrega bloqueada: verifica manualmente identidad y categoría de licencia; no existe matriz oficial automática.');
  if (!Number.isFinite(Number(input.mileage)) || Number(input.mileage) < 0 || !Number.isFinite(Number(input.fuelPercent)) || Number(input.fuelPercent) < 0 || Number(input.fuelPercent) > 100) deny('Kilometraje o nivel de combustible inválido.');
  if (!Array.isArray(input.photos) || !input.photos.length || input.photos.some(photo => !photo.dataUrl?.startsWith('data:image/') || !photo.capturedAt)) deny('Adjunta al menos una foto ficticia con marca de tiempo.');
  if (!input.signatureAcknowledged || !String(input.signer ?? '').trim()) deny('Falta la firma simulada del acta y contrato.');
  if (!Number.isFinite(Number(input.advanceCop)) || Number(input.advanceCop) < 0) deny('Indica el anticipo ficticio pactado; puede ser cero.');
  const record = {id:crypto.randomUUID(),reservationId,accountId:account.id,vehicleId:vehicle.id,coordinatorId:actor.id,
    deliveredAt:new Date().toISOString(),mileage:Number(input.mileage),fuelPercent:Number(input.fuelPercent),photos:input.photos,
    identityChecked:true,categoryCheckedManually:true,signer:String(input.signer).trim(),signatureStatus:'simulada, sin firma electrónica real',
    advanceCop:Number(input.advanceCop),advanceStatus:'registrado en simulación, no cobrado',copyStatus:'correo simulado, no enviado',
    contractStatus:'documento local simulado'};
  if (!store.set('items',[...listDemoDeliveries(actor),record])) deny('No se pudo guardar la entrega local.');
  updateDemoReservation({...reservation,deliveryId:record.id,depositStatus:'registered-at-delivery-demo'});
  markDemoDeliveredVehicle(actor,vehicle.id,record.id);
  recordDemoEvent({actorId:actor.id,role:actor.role,action:'register-demo-delivery',reference:reservationId});
  return record;
}
