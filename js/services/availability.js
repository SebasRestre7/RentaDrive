import { listFleet } from './fleet.js';
import { periodsOverlap, validPeriod } from './periods.js';

export function isAvailable(vehicle, city, startAt, endAt, reservations, now = Date.now()) {
  if (!vehicle || vehicle.city !== city || vehicle.state !== 'available' || !validPeriod(startAt, endAt, now)) return false;
  return !reservations.some(reservation => reservation.vehicleId === vehicle.id &&
    reservation.status === 'confirmed' && periodsOverlap(startAt, endAt, reservation.startAt, reservation.endAt));
}

export function availableFleet(city, startAt, endAt, reservations, now = Date.now()) {
  return listFleet().filter(vehicle => isAvailable(vehicle, city, startAt, endAt, reservations, now));
}
