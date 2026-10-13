import { openDialog, closeDialog } from './components/dialog.js';
import { createStore } from './core/storage.js';
import { registerClient, login, logout, requestDemoRecovery, resetDemoPassword } from './services/auth.js';

const layer = document.querySelector('#dialog-layer');
const status = document.querySelector('#live-status');
const cityNames = ['Medellín', 'Bogotá', 'Cartagena', 'Cali'];
const searchStore = createStore('catalog-search', 'session');
const savedSearch = searchStore.get('criteria', {});
function isoDate(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function plusDays(days) { const date = new Date(); date.setHours(12,0,0,0); date.setDate(date.getDate()+days); return isoDate(date); }
function usableSavedDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && value >= isoDate(new Date()); }
let city = cityNames.includes(savedSearch?.city) ? savedSearch.city : 'Medellín';
let committedStartDate = usableSavedDate(savedSearch?.startDate) ? savedSearch.startDate : plusDays(1);
let committedEndDate = usableSavedDate(savedSearch?.endDate) && savedSearch.endDate > committedStartDate ? savedSearch.endDate : plusDays(4);
let draftStartDate = committedStartDate;
let draftEndDate = committedEndDate;
let calendarMonth = new Date(`${committedStartDate.slice(0,7)}-01T12:00`);
let nextDayIsStart = true;
let registrationDraft = null;

function header(title, subtitle) {
  return `<div class="dialog__header"><h2 class="dialog__title" id="dialog-title">${title}</h2><p class="dialog__subtitle">${subtitle}</p><button class="dialog__close" type="button" aria-label="Cerrar" data-close-dialog>×</button></div>`;
}

function pending(message) {
  status.textContent = message;
  window.alert(message);
}

function dateLabel(iso) { return new Intl.DateTimeFormat('es-CO', { day:'numeric', month:'short', year:'numeric' }).format(new Date(`${iso}T12:00`)).replace('.', ''); }
function persistSearch() { searchStore.set('criteria', { city, startDate: committedStartDate, endDate: committedEndDate, startTime:'10:00', endTime:'10:00' }); }
function updateSearchFields() {
  document.querySelector('#location-value').textContent = city;
  document.querySelector('#start-value').textContent = dateLabel(committedStartDate);
  document.querySelector('#end-value').textContent = dateLabel(committedEndDate);
  document.querySelector('[data-overlay="location"]').setAttribute('aria-label', `Ciudad de recogida: ${city}`);
  document.querySelectorAll('[data-overlay="calendar"]')[0].setAttribute('aria-label', `Fecha de inicio: ${dateLabel(committedStartDate)}`);
  document.querySelectorAll('[data-overlay="calendar"]')[1].setAttribute('aria-label', `Fecha de fin: ${dateLabel(committedEndDate)}`);
}

function locationMarkup() {
  return `<div class="dialog__body">${header('¿Dónde recoges el vehículo?', 'Elige una ciudad disponible para iniciar tu viaje.')}
    <div class="location-search"><input class="dialog__input" id="city-search" type="search" placeholder="Buscar ciudad…" aria-label="Buscar ciudad" autocomplete="off"></div>
    <div class="location-options">${cityNames.map(name => `<button class="location-option${name === city ? ' is-selected' : ''}" type="button" aria-pressed="${name === city}" data-city="${name}"><span>${name}</span><span class="check">${name === city ? '✓' : ''}</span></button>`).join('')}</div>
  </div>`;
}

function calendarMarkup() {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const monthLabel = new Intl.DateTimeFormat('es-CO', {month:'long',year:'numeric'}).format(calendarMonth);
  const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const dates = [...Array(firstOffset).fill(null), ...Array.from({length:count},(_,i)=>isoDate(new Date(year,month,i+1)))];
  return `<div class="dialog__body">${header('Selecciona las fechas', 'Elige la fecha de inicio y devolución del vehículo.')}
    <div class="calendar-bar"><button type="button" data-calendar-month="-1" aria-label="Mes anterior">‹</button><span>${monthLabel}</span><button type="button" data-calendar-month="1" aria-label="Mes siguiente">›</button></div>
    <div class="calendar-weekdays" aria-hidden="true">${['L','M','M','J','V','S','D'].map(x=>`<span>${x}</span>`).join('')}</div>
    <div class="calendar-days" aria-label="Fechas de ${monthLabel}">${dates.map(day=>day ? `<button class="calendar-day${day === draftStartDate || day === draftEndDate ? ' is-endpoint' : day > draftStartDate && day < draftEndDate ? ' is-between' : ''}" type="button" data-day="${day}" aria-label="${dateLabel(day)}" aria-pressed="${day === draftStartDate || day === draftEndDate}"${day <= isoDate(new Date()) ? ' disabled' : ''}>${Number(day.slice(-2))}</button>` : '<span aria-hidden="true"></span>').join('')}</div>
    <div class="calendar-summary"><span id="calendar-start">${dateLabel(draftStartDate)}</span><span class="arrow">→</span><span id="calendar-end">${dateLabel(draftEndDate)}</span></div>
    <button class="dialog__primary calendar-apply" type="button" data-apply-dates>Aplicar fechas</button>
    <p class="dialog__notice" id="calendar-note" hidden></p>
  </div>`;
}

function loginMarkup() {
  return `<div class="dialog__body">${header('Bienvenido de nuevo', 'Acceso local de demostración; no uses credenciales reales.')}
    <form class="login-form" id="login-form"><p class="dialog__notice" id="email-domains">Solo correos @example.invalid o @rentadrive.invalid; no uses datos reales.</p>
      <div class="dialog__field dialog__field--spaced"><label class="dialog__label" for="login-email">Correo ficticio</label><input class="dialog__input" id="login-email" name="email" type="email" placeholder="cliente@example.invalid" autocomplete="username" aria-describedby="email-domains" required></div>
      <div class="dialog__field dialog__field--password"><label class="dialog__label" for="login-password">Contraseña ficticia</label><input class="dialog__input" id="login-password" name="password" type="password" autocomplete="current-password" required></div>
      <div class="dialog__row"><label class="dialog__checkbox"><input type="checkbox" checked>Recordarme</label><button class="dialog__inline" type="button" data-overlay="recover">¿Olvidaste tu contraseña?</button></div>
      <button class="dialog__primary" type="submit">Iniciar sesión</button>
      <p class="dialog__footer-copy">¿Aún no tienes cuenta? <button class="dialog__inline" type="button" data-overlay="register">Regístrate gratis</button></p>
      <p class="dialog__notice" id="login-note" hidden></p>
    </form>
  </div>`;
}

function registerMarkup() {
  return `<div class="dialog__body">${header('Crea tu cuenta', 'Paso 1 de 2 · Solo datos inventados para esta demostración.')}
    <form class="register-form" id="register-form"><p class="dialog__notice">Solo correo @example.invalid o @rentadrive.invalid.</p>
      <div class="dialog__field"><label class="dialog__label" for="register-name">Nombre completo</label><input class="dialog__input" id="register-name" type="text" placeholder="Tu nombre" autocomplete="name"></div>
      <div class="dialog__field"><label class="dialog__label" for="register-email">Correo ficticio</label><input class="dialog__input" id="register-email" type="email" placeholder="cliente@example.invalid" autocomplete="email"></div>
      <div class="dialog__field"><label class="dialog__label" for="register-password">Contraseña ficticia</label><input class="dialog__input" id="register-password" type="password" placeholder="Mínimo 8 caracteres" autocomplete="new-password"></div>
      <div class="dialog__field"><label class="dialog__label" for="register-confirm">Confirmar contraseña</label><input class="dialog__input" id="register-confirm" type="password" placeholder="Repite tu contraseña" autocomplete="new-password"></div>
      <button class="dialog__primary" type="submit">Continuar</button>
      <p class="dialog__notice" id="register-note" hidden></p>
    </form>
  </div>`;
}

function registrationField(label, name, type = 'text') {
  return `<label class="dialog__field"><span class="dialog__label">${label}</span><input class="dialog__input" name="${name}" type="${type}" required></label>`;
}

function registerDetailsMarkup() {
  return `<div class="dialog__body">${header('Completa tus datos', 'Paso 2 de 2 · Identidad, contacto y licencia ficticios.')}
    <form class="register-details-form" id="register-details-form">
      <div class="register-grid"><label class="dialog__field"><span class="dialog__label">Tipo de documento</span><select class="dialog__select" name="documentType" required><option value="">Selecciona</option><option>CC</option><option>CE</option><option>Pasaporte</option></select></label>
      ${registrationField('Número de documento ficticio','documentNumber')}
      ${registrationField('Dirección ficticia','address')}
      ${registrationField('Código postal ficticio','postalCode')}
      ${registrationField('Teléfono principal ficticio','phonePrimary','tel')}
      ${registrationField('Teléfono alterno ficticio','phoneSecondary','tel')}
      <label class="dialog__field"><span class="dialog__label">Género</span><select class="dialog__select" name="gender" required><option value="">Selecciona</option><option>Femenino</option><option>Masculino</option><option>No binario</option><option>Prefiero no informar</option></select></label>
      ${registrationField('Fecha de nacimiento ficticia','birthDate','date')}
      ${registrationField('Nivel de estudios','educationLevel')}
      ${registrationField('Número de licencia ficticio','licenseNumber')}
      ${registrationField('Categoría de licencia','licenseCategory')}
      ${registrationField('Vencimiento de licencia','licenseExpiry','date')}</div>
      <p class="dialog__notice">RF-001: todos los campos son obligatorios. La categoría se registra; su correspondencia con un vehículo queda pendiente de definición.</p>
      <label class="dialog__checkbox demo-confirm"><input name="demoOnly" type="checkbox" required>Confirmo que todos los datos y la contraseña son inventados y solo para esta demostración.</label>
      <div class="catalog-dialog__actions"><button class="dialog__secondary" type="button" data-overlay="register">Volver</button><button class="dialog__primary" type="submit">Validar y crear cuenta</button></div>
      <p class="dialog__notice" id="register-details-note" role="alert" hidden></p>
    </form></div>`;
}

function promotionsMarkup() {
  return `<div class="dialog__body">${header('Promociones de demostración', 'Ejemplos visuales de Figma: no están vigentes ni se aplican a la cotización.')}
    <div class="promotion-grid"><article class="promotion-card"><strong>15% OFF</strong><h3>Reserva anticipada</h3><p>Promoción ilustrativa; condiciones comerciales no definidas.</p><small>No aplicable</small></article>
    <article class="promotion-card promotion-card--gold"><strong>2×1</strong><h3>Segundo conductor</h3><p>Promoción ilustrativa; no se añade ningún beneficio al precio.</p><small>No aplicable</small></article></div>
    <button class="dialog__primary promotion-action" type="button" data-pending="catalog">Ver vehículos disponibles</button>
  </div>`;
}

function helpMarkup() {
  return `<div class="dialog__body">${header('¿Cómo podemos ayudarte?', 'Encuentra respuestas rápidas o comunícate con nuestro equipo.')}
    <div class="faq-list">${['¿Qué necesito para alquilar?','¿Puedo modificar mi reserva?','¿Qué incluye el precio?'].map(question=>`<button class="faq-button" type="button" data-pending="faq"><span style="color:#121a26;font-size:14px">${question}</span><span>›</span></button>`).join('')}</div>
    <button class="support-card" type="button" data-pending="support"><span><strong>Soporte RentaDrive</strong><small>Lunes a domingo · 7:00 a. m. – 9:00 p. m.</small></span><b>Chat</b></button>
    <button class="dialog__secondary help-close" type="button" data-close-dialog>Cerrar</button>
  </div>`;
}

function roleMarkup() {
  return `<div class="dialog__body">${header('Acceso por cuenta', 'Los permisos proceden de la cuenta autenticada; no se eligen libremente.')}
    <button class="dialog__primary role-cancel" type="button" data-overlay="login">Volver al acceso</button></div>`;
}

function recoverMarkup() {
  return `<div class="dialog__body">${header('Recuperación simulada', 'Genera un enlace local. No se envía correo real.')}
    <form id="recover-form"><div class="dialog__field"><label class="dialog__label" for="recover-email">Correo ficticio registrado</label><input class="dialog__input" id="recover-email" name="email" type="email" placeholder="cliente@example.invalid" required></div>
    <p class="dialog__notice">El enlace local expira en 15 minutos. No utilices cuentas reales.</p>
    <button class="dialog__primary" type="submit">Generar enlace local</button><p class="dialog__notice" id="recover-note" role="status" hidden></p></form></div>`;
}

function resetMarkup() {
  return `<div class="dialog__body">${header('Restablecimiento simulado', 'Este enlace solo funciona en este navegador; no se envió por correo.')}
    <form id="reset-form"><label class="dialog__field"><span class="dialog__label">Nueva contraseña ficticia</span><input class="dialog__input" name="password" type="password" minlength="8" required></label>
    <button class="dialog__primary" type="submit">Guardar contraseña ficticia</button><p class="dialog__notice" id="reset-note" role="status" hidden></p></form></div>`;
}

const overlays = {
  location: [locationMarkup,440], calendar: [calendarMarkup,520], login: [loginMarkup,440],
  register: [registerMarkup,460], promotions: [promotionsMarkup,620], help: [helpMarkup,560],
  role: [roleMarkup,500], recover: [recoverMarkup,440],
  'register-details': [registerDetailsMarkup,620], reset: [resetMarkup,440],
};

function showOverlay(name, { preserveCalendarDraft = false, focusDay = null } = {}) {
  const entry = overlays[name];
  if (!entry) return;
  if (name === 'calendar' && !preserveCalendarDraft) {
    draftStartDate = committedStartDate;
    draftEndDate = committedEndDate;
    calendarMonth = new Date(`${committedStartDate.slice(0,7)}-01T12:00`);
    nextDayIsStart = true;
  }
  openDialog(entry[0](), entry[1], name);
  if (focusDay !== null) layer.querySelector(`[data-day="${focusDay}"]`)?.focus();
}

document.addEventListener('click', (event) => {
  if (event.target.closest('[data-logout]')) { logout(); pending('Sesión local cerrada.'); return; }
  const overlayButton = event.target.closest('[data-overlay]');
  if (overlayButton) { showOverlay(overlayButton.dataset.overlay); return; }
  const pendingButton = event.target.closest('[data-pending]');
  if (pendingButton) {
    if (pendingButton.dataset.pending === 'catalog') {
      persistSearch();
      window.location.assign('./catalog.html');
      return;
    }
    const messages = {
      faq: 'Las respuestas de ayuda están pendientes de los casos de uso.',
      support: 'El canal de soporte todavía no está implementado.',
      role: 'El acceso por roles se implementará cuando se definan los casos de uso.',
    };
    pending(messages[pendingButton.dataset.pending]);
    return;
  }
  const option = event.target.closest('[data-city]');
  if (option) {
    city = option.dataset.city;
    updateSearchFields(); persistSearch();
    closeDialog(); window.dispatchEvent?.(new Event('rentadrive-session'));
    return;
  }
  const dayButton = event.target.closest('[data-day]');
  if (dayButton) {
    const day = dayButton.dataset.day;
    if (nextDayIsStart) { draftStartDate = day; draftEndDate = day; } else { draftEndDate = day < draftStartDate ? draftStartDate : day; }
    nextDayIsStart = !nextDayIsStart;
    showOverlay('calendar', { preserveCalendarDraft: true, focusDay: day });
    return;
  }
  if (event.target.closest('[data-apply-dates]')) {
    if (draftEndDate <= draftStartDate) {
      const note = layer.querySelector('#calendar-note'); note.hidden = false;
      note.textContent = 'La devolución debe ser posterior al inicio. Selecciona dos fechas distintas.'; return;
    }
    committedStartDate = draftStartDate;
    committedEndDate = draftEndDate;
    updateSearchFields(); persistSearch();
    closeDialog();
    return;
  }
  const monthButton = event.target.closest('[data-calendar-month]');
  if (monthButton) {
    calendarMonth.setMonth(calendarMonth.getMonth() + Number(monthButton.dataset.calendarMonth));
    showOverlay('calendar', { preserveCalendarDraft: true });
  }
});

layer.addEventListener('input', (event) => {
  if (event.target.id !== 'city-search') return;
  const query = event.target.value.toLocaleLowerCase('es');
  layer.querySelectorAll('[data-city]').forEach(option => {
    option.hidden = !option.dataset.city.toLocaleLowerCase('es').includes(query);
  });
});

layer.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (event.target.id === 'login-form') {
    const note = layer.querySelector('#login-note');
    try {
      const account = await login(event.target.elements.email.value, event.target.elements.password.value,
        event.target.querySelector('input[type=checkbox]').checked);
      status.textContent = `Sesión local de demostración iniciada como ${account.role}.`;
      const params = new URLSearchParams(window.location?.search || '');
      const returnId = params.get('return');
      if (account.role === 'admin' || account.role === 'coordinator') window.location.assign('./staff.html');
      else if (returnId && /^[a-z0-9-]+$/.test(returnId)) window.location.assign(`./catalog.html#${returnId}`);
      else { closeDialog(); window.dispatchEvent?.(new Event('rentadrive-session')); pending(`Sesión local iniciada como ${account.role}. No es autenticación de producción.`); }
    } catch (error) { note.hidden = false; note.textContent = error.message; }
  }
  if (event.target.id === 'register-form') {
    const note = layer.querySelector('#register-note');
    const name = layer.querySelector('#register-name').value.trim();
    const email = layer.querySelector('#register-email').value.trim();
    const password = layer.querySelector('#register-password').value;
    const confirmPassword = layer.querySelector('#register-confirm').value;
    if (!name || !email || password.length < 8 || password !== confirmPassword) {
      note.hidden = false; note.textContent = 'Completa nombre/correo y una contraseña ficticia de 8 caracteres que coincida.';
      return;
    }
    registrationDraft = { fullName: name, email, password, confirmPassword };
    showOverlay('register-details');
  }
  if (event.target.id === 'register-details-form') {
    const note = layer.querySelector('#register-details-note');
    try {
      const data = { ...registrationDraft, ...Object.fromEntries(new FormData(event.target).entries()), demoOnly: event.target.elements.demoOnly.checked };
      await registerClient(data);
      registrationDraft = null;
      showOverlay('login');
      layer.querySelector('#login-email').value = data.email;
      const loginNote = layer.querySelector('#login-note');
      loginNote.hidden = false; loginNote.textContent = 'Cuenta cliente ficticia creada en este navegador. Inicia sesión para reservar. Confirmación de correo simulada: no se envió ningún mensaje.';
    } catch (error) { note.hidden = false; note.textContent = error.message; }
  }
  if (event.target.id === 'recover-form') {
    const note = layer.querySelector('#recover-note');
    try {
      const token = requestDemoRecovery(event.target.elements.email.value);
      const link = `${window.location.origin}${window.location.pathname}?recover=${token}`;
      note.replaceChildren(document.createTextNode('Enlace local simulado, no enviado: '));
      const anchor = document.createElement('a'); anchor.href = link; anchor.textContent = 'Abrir restablecimiento';
      note.append(anchor);
    } catch (error) { note.textContent = error.message; }
    note.hidden = false;
  }
  if (event.target.id === 'reset-form') {
    const note = layer.querySelector('#reset-note');
    const token = new URLSearchParams(window.location?.search || '').get('recover');
    try { await resetDemoPassword(token, event.target.elements.password.value);
      note.textContent = 'Contraseña ficticia actualizada. Ya puedes iniciar sesión localmente.';
    } catch (error) { note.textContent = error.message; }
    note.hidden = false;
  }
});

if (new URLSearchParams(window.location?.search || '').has('recover')) showOverlay('reset');
else if (new URLSearchParams(window.location?.search || '').get('auth') === 'login') showOverlay('login');
updateSearchFields();
