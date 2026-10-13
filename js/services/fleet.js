import { withSessionMedia, durableVehicle } from '../core/media.js';
import { createStore } from '../core/storage.js';
import { demoFleet, demoCities } from './demo-data.js';
import { listReservations } from './reservations.js';
import { recordDemoEvent } from './audit.js';
import { localStampNow } from './periods.js';

const store = createStore('fleet');
const maintenanceStore = createStore('maintenance');
export const fleetStates = Object.freeze(['available', 'rented', 'maintenance', 'contingency']);

export function listFleet() {
  const overrides = store.get('items', []);
  const extra = Array.isArray(overrides) ? overrides : [];
  return [...demoFleet.map(base => ({ ...base, ...extra.find(item => item.id === base.id) })),
    ...extra.filter(item => !demoFleet.some(base => base.id === item.id))].map(withSessionMedia);
}

export function saveDemoVehicle(actor, data) {
  if (actor?.role !== 'admin') throw new Error('Solo administración puede actualizar la ficha ficticia.');
  const required = ['id','name','brand','type','city','fuel','transmission','licenseCategory','color','consumption','image','video','feature'];
  if (required.some(key => !String(data[key] ?? '').trim())) throw new Error('Completa todos los campos de la ficha, incluidas referencias de foto y video locales.');
  if (!/^[a-z0-9-]{3,64}$/.test(data.id)) throw new Error('El ID debe tener 3–64 caracteres: letras minúsculas, números o guiones.');
  if (!demoCities.includes(data.city)) throw new Error('Selecciona una sede ficticia disponible.');
  for (const key of ['passengers','bags','mileage','doors','price']) if (!Number.isFinite(Number(data[key])) || Number(data[key]) < (['mileage','bags'].includes(key) ? 0 : 1)) throw new Error(`Valor inválido: ${key}.`);
  if (!['create','update'].includes(data.mode)) throw new Error('Selecciona si registras una unidad nueva o editas una existente.');
  const existing = listFleet().find(item=>item.id===data.id);
  if (data.mode === 'create' && existing) throw new Error('El identificador de vehículo ya existe. Usa edición explícita.');
  if (data.mode === 'update' && !existing) throw new Error('No existe una ficha para editar.');
  if (existing && listReservations().some(item=>item.vehicleId===data.id&&item.status==='confirmed') &&
      ['name','brand','type','city'].some(key=>String(data[key])!==String(existing[key]))) throw new Error('La unidad tiene reservas confirmadas: no cambies identidad, gama o sede.');
  if (!data.image.startsWith('./assets/') || !data.video.startsWith('./assets/')) throw new Error('Usa únicamente rutas de recursos locales en assets/.');
  if (!demoFleet.some(item=>item.image===data.image) || !demoFleet.some(item=>item.video===data.video)) throw new Error('Selecciona recursos de demostración ya disponibles en assets/catalog/.');
  const entries = store.get('items', []);
  const { mode, ...fields } = data;
  const record = durableVehicle({ ...existing, ...fields, passengers:Number(data.passengers), bags:Number(data.bags), mileage:Number(data.mileage), doors:Number(data.doors), price:Number(data.price), state:existing?.state??'available', updatedAt:new Date().toISOString() });
  const next = [...entries.filter(item => item.id !== data.id), record];
  if (!store.set('items', next)) throw new Error('No se pudo guardar la ficha local.');
  recordDemoEvent({actorId:actor.id, role:actor.role, action:'save-demo-vehicle', reference:data.id});
  return record;
}

export function changeFleetState(actor, vehicleId, nextState, reason) {
  if (actor?.role !== 'admin') throw new Error('Solo administración puede cambiar el estado de flota.');
  if (!fleetStates.includes(nextState)) throw new Error('Estado no permitido.');
  if (!String(reason ?? '').trim()) throw new Error('Indica el motivo del cambio.');
  const vehicle = listFleet().find(item => item.id === vehicleId);
  if (!vehicle) throw new Error('Vehículo inexistente.');
  if (vehicle.state === nextState) throw new Error('El vehículo ya tiene ese estado.');
  if (vehicle.state === 'rented') throw new Error('La devolución y salida del estado alquilado no pertenecen a estos siete casos; no se cambia manualmente.');
  const active = listReservations().filter(item => item.vehicleId === vehicleId && item.status === 'confirmed' && item.endAt > localStampNow());
  if (active.length && nextState !== 'available') throw new Error('Hay reservas confirmadas: resuélvelas antes de retirar esta unidad.');
  if (nextState === 'available' && listMaintenance().some(item=>item.vehicleId===vehicleId&&item.status==='open')) throw new Error('Cierra el mantenimiento abierto antes de publicar disponibilidad.');
  if (nextState === 'rented') throw new Error('El estado alquilado solo puede surgir de una entrega confirmada.');
  const entries = store.get('items', []);
  const record = durableVehicle({ ...vehicle, state:nextState, stateReason:reason.trim(), stateChangedAt:new Date().toISOString() });
  if (!store.set('items', [...entries.filter(item => item.id !== vehicleId), record])) throw new Error('No se pudo guardar el estado.');
  recordDemoEvent({actorId:actor.id, role:actor.role, action:'change-fleet-state', reference:vehicleId});
  return record;
}

export function listMaintenance() {
  const items = maintenanceStore.get('items', []);
  return Array.isArray(items) ? items : [];
}
export function saveDemoMaintenance(actor, vehicleId, reason) {
  if (actor?.role !== 'admin') throw new Error('Solo administración puede abrir mantenimiento ficticio.');
  if (!listFleet().some(item=>item.id===vehicleId) || !String(reason??'').trim()) throw new Error('Vehículo y motivo obligatorios.');
  if (listMaintenance().some(item=>item.vehicleId===vehicleId&&item.status==='open')) throw new Error('Ya existe un mantenimiento abierto.');
  if (listReservations().some(item=>item.vehicleId===vehicleId&&item.status==='confirmed'&&item.endAt>localStampNow())) throw new Error('Hay reservas confirmadas vinculadas.');
  const record={id:crypto.randomUUID(),vehicleId,reason:reason.trim(),status:'open',openedAt:new Date().toISOString()};
  if (listFleet().find(item=>item.id===vehicleId).state !== 'maintenance') changeFleetState(actor,vehicleId,'maintenance',reason);
  if (!maintenanceStore.set('items',[...listMaintenance(),record])) throw new Error('No se pudo registrar mantenimiento.');
  recordDemoEvent({actorId:actor.id,role:actor.role,action:'open-demo-maintenance',reference:vehicleId});
  return record;
}
export function closeDemoMaintenance(actor,id) {
  if (actor?.role!=='admin') throw new Error('Solo administración puede cerrar mantenimiento ficticio.');
  const items=listMaintenance();const item=items.find(entry=>entry.id===id&&entry.status==='open');
  if(!item)throw new Error('Mantenimiento abierto no encontrado.');
  if(!maintenanceStore.set('items',items.map(entry=>entry.id===id?{...entry,status:'closed',closedAt:new Date().toISOString()}:entry)))throw new Error('No se pudo cerrar mantenimiento.');
  recordDemoEvent({actorId:actor.id,role:actor.role,action:'close-demo-maintenance',reference:item.vehicleId});
  return item;
}

export function markDemoDeliveredVehicle(actor,vehicleId,deliveryId) {
  if (actor?.role!=='coordinator') throw new Error('Solo coordinación puede registrar la salida ficticia.');
  const delivery=(createStore('deliveries').get('items',[])??[]).find(item=>item.id===deliveryId&&item.vehicleId===vehicleId);
  if (!delivery) throw new Error('No existe entrega registrada para cambiar el estado.');
  const vehicle=listFleet().find(item=>item.id===vehicleId);
  if (!vehicle || vehicle.state!=='available') throw new Error('El vehículo ya no está disponible para la salida.');
  const entries=store.get('items',[]);
  const record=durableVehicle({...vehicle,state:'rented',stateReason:`Entrega ficticia ${delivery.reservationId}`,stateChangedAt:new Date().toISOString()});
  if (!store.set('items',[...entries.filter(item=>item.id!==vehicleId),record])) throw new Error('No se pudo guardar el estado alquilado.');
  recordDemoEvent({actorId:actor.id,role:actor.role,action:'mark-demo-rented',reference:vehicleId});
  return record;
}
