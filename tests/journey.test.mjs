import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
globalThis.window = { localStorage: new MemoryStorage(), sessionStorage: new MemoryStorage() };

const { registerClient, login, currentAccount, logout, prepareDemoStaff, requestDemoRecovery, resetDemoPassword } = await import('../js/services/auth.js');
const { parseLocalStamp, periodsOverlap, validPeriod } = await import('../js/services/periods.js');
const { availableFleet } = await import('../js/services/availability.js');
const { createDemoQuote } = await import('../js/services/quote.js');
const { confirmDemoReservation, listReservations, uniqueDemoReservationCode } = await import('../js/services/reservations.js');
const { demoFleet } = await import('../js/services/demo-data.js');
const { demoAuditEvents } = await import('../js/services/audit.js');

const day = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const startAt = `${day(2)}T10:00`;
const endAt = `${day(3)}T10:00`;
const nextEnd = `${day(4)}T10:00`;
const registration = {
  demoOnly: true, documentType:'CC', documentNumber:'DEMO-1001', fullName:'Cliente Ficticia',
  address:'Calle Demo 1', postalCode:'000000', phonePrimary:'0000000001', phoneSecondary:'0000000002',
  email:'cliente@example.invalid', gender:'Prefiero no informar', birthDate:'1995-04-15', educationLevel:'Demo',
  licenseNumber:'LIC-DEMO-1', licenseCategory:'B1', licenseExpiry:day(365),
  password:'Ficticia!2026', confirmPassword:'Ficticia!2026',
};

test('half-open local periods allow exact boundary and reject overlap/invalid stamps', () => {
  assert.equal(periodsOverlap(startAt, endAt, endAt, nextEnd), false);
  assert.equal(periodsOverlap(startAt, endAt, `${day(3)}T09:59`, nextEnd), true);
  assert.equal(validPeriod(startAt, endAt), true);
  assert.ok(Number.isNaN(parseLocalStamp('2026-02-30T10:00')));
  assert.equal(validPeriod(endAt, startAt), false);
});

test('RF-001 requires complete fictitious identity, uniqueness and hash-only persistence', async () => {
  const publicHome = readFileSync(new URL('../js/home.js', import.meta.url), 'utf8');
  assert.doesNotMatch(publicHome, /data-prepare-staff|Perfil de acceso.*login-profile/);
  await assert.rejects(registerClient({ ...registration, phoneSecondary:'' }), /Completa/);
  await assert.rejects(registerClient({ ...registration, email:'real@gmail.com' }), /ficticio/);
  const account = await registerClient(registration);
  assert.equal(account.role, 'client');
  assert.equal(account.passwordHash, undefined);
  const raw = window.localStorage.getItem('rentadrive:accounts:items');
  assert.doesNotMatch(raw, /Ficticia!2026/);
  assert.match(raw, /passwordHash/);
  await assert.rejects(registerClient({ ...registration, documentNumber:'DEMO-1002' }), /correo/);
  await assert.rejects(registerClient({ ...registration, email:'otra@example.invalid' }), /documento/);
  await assert.rejects(login(registration.email, 'incorrecta'), /incorrectas/);
  const loggedIn = await login(registration.email, registration.password);
  assert.equal(loggedIn.role, 'client');
  assert.equal(currentAccount().id, loggedIn.id);
  assert.deepEqual(demoAuditEvents().slice(0,2).map(item => item.action), ['register-client','local-login']);
});

test('availability checks city, fleet state and only overlapping confirmed periods', () => {
  const toyota = demoFleet.find(vehicle => vehicle.id === 'toyota-hilux');
  assert.equal(availableFleet('Medellín', startAt, endAt, []).length, 3);
  assert.equal(availableFleet('Bogotá', startAt, endAt, []).length, 1);
  assert.equal(availableFleet('Medellín', startAt, endAt, []).some(vehicle => vehicle.state !== 'available'), false);
  const reservation = { vehicleId: toyota.id, startAt, endAt, status:'confirmed' };
  assert.equal(availableFleet('Medellín', startAt, endAt, [reservation]).some(vehicle => vehicle.id === toyota.id), false);
  assert.equal(availableFleet('Medellín', endAt, nextEnd, [reservation]).some(vehicle => vehicle.id === toyota.id), true);
  assert.equal(availableFleet('Medellín', startAt, endAt, [{...reservation,status:'draft'}]).some(vehicle => vehicle.id === toyota.id), true);
});

test('demo quote is separate from payment and uses explicit 24-hour blocks', () => {
  const vehicle = demoFleet.find(item => item.id === 'toyota-hilux');
  const exact = createDemoQuote(vehicle, 'basic', startAt, endAt, 'COP');
  assert.equal(exact.days, 1);
  assert.equal(exact.totalCop, vehicle.price + 25000);
  assert.equal(exact.depositStatus, 'pending-at-delivery');
  const extraMinute = createDemoQuote(vehicle, 'basic', startAt, `${day(3)}T10:01`, 'USD');
  assert.equal(extraMinute.days, 2);
  assert.equal(extraMinute.displayedTotal, (vehicle.price + 25000) * 2 / 4000);
});

test('public reservation code retries a collision and fails closed after repeated collisions', () => {
  const existing = [{id:'RD-12345678'}];
  const sequence = ['12345678-0000-0000-0000-000000000000','ABCDEF01-0000-0000-0000-000000000000'];
  assert.equal(uniqueDemoReservationCode(existing, () => sequence.shift()), 'RD-ABCDEF01');
  assert.throws(() => uniqueDemoReservationCode(existing, () => '12345678-0000-0000-0000-000000000000'), /único/);
});

test('confirmation revalidates, persists one reservation, generates unique QR payload and demo communications', () => {
  const account = currentAccount();
  const args = { account, vehicleId:'toyota-hilux', city:'Medellín', startAt, endAt, policyId:'basic', currency:'COP', requestId:'request-1' };
  const first = confirmDemoReservation(args);
  assert.equal(first.repeated, false);
  assert.equal(first.reservation.status, 'confirmed');
  assert.match(first.reservation.qrPayload, /^RD-/);
  assert.equal(first.reservation.communications.every(item => item.status === 'simulado, no enviado'), true);
  assert.equal(listReservations().length, 1);
  const repeat = confirmDemoReservation(args);
  assert.equal(repeat.repeated, true);
  assert.equal(repeat.reservation.id, first.reservation.id);
  assert.equal(listReservations().length, 1);
  assert.throws(() => confirmDemoReservation({ ...args, requestId:'request-2' }), /dejó de estar disponible/);
  const adjacent = confirmDemoReservation({ ...args, startAt:endAt, endAt:nextEnd, requestId:'request-3' });
  assert.equal(adjacent.repeated, false);
  assert.equal(listReservations().length, 2);
  assert.equal(demoAuditEvents().filter(item => item.action === 'confirm-demo-reservation').length, 2);
});

test('staff fixtures are separate from public signup; recovery is local and one-time', async () => {
  logout();
  const fixtures = await prepareDemoStaff();
  assert.deepEqual(fixtures.map(item => item.role), ['coordinator','admin']);
  assert.equal(fixtures.every(item => item.password.length >= 8), true);
  const raw = window.localStorage.getItem('rentadrive:accounts:items');
  for (const fixture of fixtures) {
    assert.doesNotMatch(raw, new RegExp(fixture.password));
    const account = await login(fixture.email, fixture.password);
    assert.equal(account.role, fixture.role);
    assert.throws(() => confirmDemoReservation({ account }), /cuenta cliente/);
  }
  const token = requestDemoRecovery(registration.email);
  await resetDemoPassword(token, 'NuevaDemo!2026');
  await assert.rejects(resetDemoPassword(token, 'OtraDemo!2026'), /expiró/);
  await assert.rejects(login(registration.email, registration.password), /incorrectas/);
  assert.equal((await login(registration.email, 'NuevaDemo!2026')).role, 'client');
});
