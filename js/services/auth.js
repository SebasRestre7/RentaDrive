import { createStore } from '../core/storage.js';
import { recordDemoEvent } from './audit.js';
import { localDateNow } from './periods.js';

const accountsStore = createStore('accounts');
const localSession = createStore('auth-session');
const temporarySession = createStore('auth-session', 'session');
const recoveryStore = createStore('recovery');
const requiredFields = ['documentType', 'documentNumber', 'fullName', 'address', 'postalCode', 'phonePrimary',
  'phoneSecondary', 'email', 'gender', 'birthDate', 'educationLevel', 'licenseNumber', 'licenseCategory', 'licenseExpiry'];
const demoEmail = /^[^\s@]+@(example\.invalid|rentadrive\.invalid)$/i;

function accounts() {
  const saved = accountsStore.get('items', []);
  return Array.isArray(saved) ? saved : [];
}

export function listDemoAccounts(actor) {
  if (actor?.role !== 'admin') throw new Error('Solo administración puede consultar roles ficticios.');
  return accounts().map(publicAccount);
}

export function assignDemoRole(actor, accountId, role) {
  if (actor?.role !== 'admin') throw new Error('Solo administración puede asignar roles ficticios.');
  if (!['client','coordinator','admin'].includes(role)) throw new Error('Rol no permitido.');
  const items = accounts();
  const index = items.findIndex(item => item.id === accountId);
  if (index < 0) throw new Error('Cuenta ficticia no encontrada.');
  if (items[index].id === actor.id && role !== 'admin') throw new Error('No puedes quitarte el rol administrador en esta sesión.');
  if (items[index].role === role) throw new Error('La cuenta ya tiene ese rol.');
  items[index] = {...items[index], role};
  if (!accountsStore.set('items', items)) throw new Error('No se pudo guardar el rol.');
  recordDemoEvent({actorId:actor.id, role:actor.role, action:'assign-demo-role', reference:accountId});
  return publicAccount(items[index]);
}

function randomHex(bytes = 16) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return [...buffer].map(value => value.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt = randomHex()) {
  const passwordBytes = new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt),
    iterations: 120_000, hash: 'SHA-256' }, key, 256);
  return { salt, passwordHash: [...new Uint8Array(bits)].map(byte => byte.toString(16).padStart(2, '0')).join('') };
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}

export function validateDemoRegistration(data) {
  if (!data?.demoOnly) throw new Error('Confirma que todos los datos y la contraseña son ficticios.');
  const missing = requiredFields.find(key => !String(data[key] ?? '').trim());
  if (missing) throw new Error('Completa todos los datos de identidad, contacto y licencia.');
  if (!demoEmail.test(data.email.trim())) throw new Error('Usa únicamente un correo ficticio @example.invalid o @rentadrive.invalid.');
  if (!data.password || data.password.length < 8) throw new Error('La contraseña ficticia debe tener al menos 8 caracteres.');
  if (data.password !== data.confirmPassword) throw new Error('Las contraseñas ficticias no coinciden.');
  if (data.birthDate >= localDateNow()) throw new Error('La fecha de nacimiento debe ser anterior a hoy.');
  if (data.licenseExpiry < localDateNow()) throw new Error('La licencia debe estar vigente.');
}

export async function registerClient(data) {
  validateDemoRegistration(data);
  const email = data.email.trim().toLowerCase();
  const documentNumber = data.documentNumber.trim();
  const existing = accounts();
  if (existing.some(account => account.email === email)) throw new Error('El correo ficticio ya está registrado. Puedes usar la recuperación simulada.');
  if (existing.some(account => account.documentNumber === documentNumber)) throw new Error('El número de documento ficticio ya está registrado.');
  const secret = await hashPassword(data.password);
  const profile = Object.fromEntries(requiredFields.map(key => [key, String(data[key]).trim()]));
  const account = { id: crypto.randomUUID(), ...profile, email, role: 'client', ...secret, createdAt: new Date().toISOString() };
  if (!accountsStore.set('items', [...existing, account])) throw new Error('No se pudo guardar la cuenta en este navegador.');
  recordDemoEvent({ actorId: account.id, role:'client', action:'register-client', reference: account.id });
  return publicAccount(account);
}

function publicAccount(account) {
  if (!account) return null;
  const { passwordHash, salt, ...safe } = account;
  return safe;
}

export async function login(email, password, remember = true) {
  const account = accounts().find(item => item.email === String(email).trim().toLowerCase());
  if (!account || !password) throw new Error('Credenciales ficticias incorrectas.');
  const check = await hashPassword(password, account.salt);
  if (!safeEqual(check.passwordHash, account.passwordHash)) throw new Error('Credenciales ficticias incorrectas.');
  const destination = remember ? localSession : temporarySession;
  const other = remember ? temporarySession : localSession;
  other.remove('accountId');
  if (!destination.set('accountId', account.id)) throw new Error('No se pudo iniciar la sesión local.');
  recordDemoEvent({ actorId: account.id, role: account.role, action:'local-login', reference: account.id });
  return publicAccount(account);
}

export function currentAccount() {
  const id = temporarySession.get('accountId') || localSession.get('accountId');
  return publicAccount(accounts().find(account => account.id === id));
}

export function logout() {
  localSession.remove('accountId');
  temporarySession.remove('accountId');
}

// Fixture preparation is separate from public signup. No demo password is stored in plaintext.
export async function prepareDemoStaff() {
  const credentials = [];
  const retained = accounts().filter(account => !['coordinator', 'admin'].includes(account.role));
  for (const [role, name, email] of [
    ['coordinator', 'Coordinación Demo', 'coordinador@rentadrive.invalid'],
    ['admin', 'Administración Demo', 'administrador@rentadrive.invalid'],
  ]) {
    const password = `Demo-${randomHex(8)}!`;
    const secret = await hashPassword(password);
    retained.push({ id: crypto.randomUUID(), fullName: name, email, role, ...secret, createdAt: new Date().toISOString() });
    credentials.push({ role, email, password });
  }
  if (!accountsStore.set('items', retained)) throw new Error('No se pudieron preparar las cuentas ficticias.');
  logout();
  recordDemoEvent({ actorId:'demo-setup', role:'system-demo', action:'prepare-staff-fixtures', reference:'staff' });
  return credentials; // Visible once; later only hashes are persisted.
}

export function requestDemoRecovery(email) {
  const account = accounts().find(item => item.email === String(email).trim().toLowerCase());
  if (!account) throw new Error('No existe esa cuenta ficticia en este navegador.');
  const token = randomHex(24);
  if (!recoveryStore.set(token, { accountId: account.id, expiresAt: Date.now() + 15 * 60_000 })) throw new Error('No se pudo crear el enlace local.');
  recordDemoEvent({ actorId: account.id, role: account.role, action:'request-local-recovery', reference: account.id });
  return token;
}

export async function resetDemoPassword(token, newPassword) {
  if (!newPassword || newPassword.length < 8) throw new Error('La nueva contraseña ficticia debe tener al menos 8 caracteres.');
  const ticket = recoveryStore.get(token);
  if (!ticket || ticket.expiresAt <= Date.now()) throw new Error('El enlace local expiró o ya se utilizó.');
  const saved = accounts();
  const index = saved.findIndex(account => account.id === ticket.accountId);
  if (index < 0) throw new Error('La cuenta ficticia ya no existe.');
  saved[index] = { ...saved[index], ...await hashPassword(newPassword) };
  if (!accountsStore.set('items', saved)) throw new Error('No se pudo guardar la nueva contraseña.');
  recoveryStore.remove(token);
  recordDemoEvent({ actorId: saved[index].id, role: saved[index].role, action:'reset-local-password', reference: saved[index].id });
  return publicAccount(saved[index]);
}
