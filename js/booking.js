import { createStore } from './core/storage.js';
import { currentAccount } from './services/auth.js';
import { demoPolicies, demoConversion } from './services/demo-data.js';
import { listFleet } from './services/fleet.js';
import { effectivePolicy, effectiveDailyRate } from './services/configuration.js';
import { isAvailable } from './services/availability.js';
import { listReservations, confirmDemoReservation, reviewDemoReservationQuote, reviewedDemoReservationQuote } from './services/reservations.js';
import { createDemoQuote } from './services/quote.js';

const root = document.querySelector('#booking-root');
const draftStore = createStore('booking-draft');
const draft = draftStore.get('current');
const account = currentAccount();
let policyId = draft?.reviewedSelection?.policyId ?? 'basic';
let currency = draft?.reviewedSelection?.currency ?? 'COP';
let stage = 'select';
let confirmed = null;
let submitting = false;
let reviewedQuote = draft && draft.reviewedSelection?.stage!=='select' ? reviewedDemoReservationQuote({account,...draft,policyId,currency}) : null;
if (reviewedQuote) stage='review';
const vehicle = listFleet().find(item => item.id === draft?.vehicleId);

const escapeText = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const money = (value, unit) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: unit, maximumFractionDigits: unit === 'COP' ? 0 : 2 }).format(value);
const stamp = value => new Intl.DateTimeFormat('es-CO', { dateStyle:'long', timeStyle:'short' }).format(new Date(value));

function rememberSelection() { draftStore.set('current',{...draft,reviewedSelection:{policyId,currency,stage}}); }
function quote() { return reviewedQuote ?? createDemoQuote(vehicle, policyId, draft.startAt, draft.endAt, currency); }

function amountRow(label, value, emphasis = false) {
  return `<div class="booking-cost-row${emphasis ? ' booking-cost-row--total' : ''}"><span>${label}</span><strong>${value}</strong></div>`;
}

function pricePanel() {
  const cost = quote();
  return `<aside class="booking-panel booking-price"><h2>Resumen de costos</h2>
    <p class="booking-muted">Valores y conversiones ficticios de demostración; no son TRM vigente.</p>
    <label class="booking-select-label">Moneda de visualización <select id="booking-currency" aria-label="Moneda de visualización"${stage==='review'?' disabled':''}><option value="COP"${currency==='COP'?' selected':''}>COP</option><option value="USD"${currency==='USD'?' selected':''}>USD · tasa demo</option><option value="EUR"${currency==='EUR'?' selected':''}>EUR · tasa demo</option></select></label>
    <div class="booking-rule"></div>
    ${amountRow('Valor por día (demo)', money(cost.dailyPrice, 'COP'))}
    ${amountRow('Bloques iniciados de 24 h', `${cost.days}`)}
    ${amountRow('Alquiler', money(cost.rental, 'COP'))}
    ${amountRow(`Póliza ${escapeText(demoPolicies.find(item=>item.id===policyId).name)} (${money(cost.policyDailyPrice,'COP')}/día)`, money(cost.policyCost, 'COP'))}
    ${amountRow('Convenio', cost.discount ? `−${money(cost.discount,'COP')}` : 'No aplicado')}
    <div class="booking-rule"></div>
    ${amountRow('Total cotizado · no pagado', money(cost.displayedTotal, currency), true)}
    <p class="booking-muted">Base ${money(cost.totalCop, 'COP')}${currency==='COP'?'':` · 1 ${currency} = ${money(demoConversion[currency],'COP')} (conversión demo)`}.</p>
    <p class="booking-deposit">Anticipo: pendiente hasta la entrega. No se cobra al reservar.</p>
    <p class="booking-muted">Cálculo demo: 24 h exactas = 1 bloque; cualquier fracción adicional inicia otro bloque. La disponibilidad usa períodos [inicio, fin).</p>
    <button class="booking-primary" id="booking-action" type="button">${stage === 'select' ? 'Revisar reserva' : 'Confirmar reserva'}</button>
    <p id="booking-error" class="booking-error" role="alert" hidden></p>
  </aside>`;
}

function selectionPanel() {
  return `<section class="booking-panel booking-vehicle"><h2>Vehículo seleccionado</h2>
    <div class="booking-vehicle-top"><div class="booking-photo"><img src="${vehicle.image}" alt="${escapeText(vehicle.name)}"></div>
      <div><span class="booking-type">${escapeText(vehicle.type)}</span><h3>${escapeText(vehicle.name)}</h3>
        <p class="booking-muted">${vehicle.passengers} pasajeros · ${vehicle.bags} maletas · ${escapeText(vehicle.transmission)} · ${escapeText(vehicle.fuel)}</p>
        <strong class="booking-day-rate">${money(quote().dailyPrice, 'COP')} / día</strong></div></div>
    <div class="booking-rule"></div><div class="booking-dates"><div><b>Recogida</b><strong>${stamp(draft.startAt)}</strong><span>${escapeText(draft.city)}</span></div><span class="booking-arrow" aria-hidden="true">→</span><div><b>Devolución</b><strong>${stamp(draft.endAt)}</strong><span>${escapeText(draft.city)}</span></div></div>
    ${stage === 'select' ? `<fieldset class="booking-policies"><legend>Selecciona tu póliza</legend>${demoPolicies.map(base => { const item=effectivePolicy(base.id); return `<label class="booking-policy${item.id===policyId?' is-selected':''}"><input type="radio" name="policy" value="${item.id}"${item.id===policyId?' checked':''}><span><strong>${item.name}</strong><small>${escapeText(item.coverage??item.description)}</small></span><b>${money(item.dailyPrice,'COP')}/día</b></label>`; }).join('')}</fieldset>` : `<div class="booking-insurance"><strong>Póliza ${escapeText(effectivePolicy(policyId).name)}</strong><span>${escapeText(effectivePolicy(policyId).coverage??effectivePolicy(policyId).description)}</span></div><button class="booking-text-button" id="booking-edit" type="button">Cambiar póliza o moneda</button>`}
  </section>`;
}

function renderSelection(focusTarget = 'heading') {
  root.innerHTML = `<div class="booking-head"><div><h1 tabindex="-1">${stage === 'select' ? 'Selecciona póliza y cotiza' : 'Revisa tu reserva'}</h1><p>${stage === 'select' ? 'Elige una cobertura y consulta el precio ficticio antes de confirmar.' : 'Confirma el vehículo, período y valor antes de continuar.'}</p></div><span class="booking-session">Sesión local: ${escapeText(account.email)}</span></div>
  <div class="booking-grid">${selectionPanel()}${pricePanel()}</div>`;
  const focusNode = focusTarget === 'policy' ? root.querySelector(`input[name="policy"][value="${policyId}"]`) :
    focusTarget === 'currency' ? root.querySelector('#booking-currency') : root.querySelector('h1');
  focusNode?.focus();
}

function drawQr(payload) {
  if (typeof window.qrcode !== 'function') throw new Error('No se pudo cargar el generador QR local.');
  const qr = window.qrcode(0, 'M');
  qr.addData(payload); qr.make();
  const modules = qr.getModuleCount();
  const quiet = 4;
  const scale = 5;
  const canvas = root.querySelector('#booking-qr');
  canvas.width = (modules + quiet * 2) * scale;
  canvas.height = canvas.width;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#000';
  for (let row = 0; row < modules; row++) for (let column = 0; column < modules; column++) {
    if (qr.isDark(row, column)) context.fillRect((column + quiet) * scale, (row + quiet) * scale, scale, scale);
  }
}

function renderConfirmed() {
  root.innerHTML = `<section class="booking-success"><div class="booking-check" aria-hidden="true">✓</div>
    <h1 tabindex="-1">¡Reserva confirmada!</h1><p class="booking-muted">Reserva guardada en este navegador. El correo y SMS se muestran como simulación: no fueron enviados.</p>
    <div class="booking-code"><small>CÓDIGO DE RESERVA</small><strong>${escapeText(confirmed.id)}</strong></div>
    <div class="booking-success-grid"><div class="booking-success-car"><img src="${vehicle.image}" alt="${escapeText(vehicle.name)}"><div><small>${escapeText(vehicle.type).toUpperCase()}</small><h2>${escapeText(vehicle.name)}</h2><p>${stamp(confirmed.startAt)} – ${stamp(confirmed.endAt)} · ${escapeText(confirmed.city)}</p><strong>Total cotizado, no pagado: ${money(confirmed.quote.displayedTotal, confirmed.quote.currency)}</strong></div></div>
    <div class="booking-next"><h2>Próximos pasos</h2><p>1. Conserva el código o escanea este QR.<br>2. Presenta documento y licencia ficticios en la demostración.<br>3. Anticipo pendiente hasta la entrega.</p><canvas id="booking-qr" role="img" aria-label="QR escaneable de la reserva ${escapeText(confirmed.id)}"></canvas></div></div>
    <section class="booking-communications"><h2>Comunicaciones simuladas · no enviadas</h2><p>Correo ficticio a ${escapeText(account.email)}: Reserva ${escapeText(confirmed.id)} confirmada localmente.</p><p>SMS ficticio a ${escapeText(account.phonePrimary)}: Presenta el código ${escapeText(confirmed.id)}.</p></section>
    <div class="booking-success-actions"><button class="booking-secondary" id="view-booking" type="button">Ver reserva</button><button class="booking-secondary" id="download-qr" type="button">Descargar QR</button><a class="booking-primary" href="./catalog.html">Volver a resultados</a></div>
  </section>`;
  drawQr(confirmed.id);
  root.querySelector('h1').focus();
}

function fail(message) {
  root.innerHTML = `<div class="booking-failure"><h1>No se puede continuar la reserva</h1><p>${escapeText(message)}</p><a class="booking-primary" href="./catalog.html">Modificar búsqueda</a></div>`;
}

function begin() {
  if (!account) { window.location.assign('./index.html?auth=login'); return; }
  if (account.role !== 'client') { fail('Solo una cuenta cliente puede reservar.'); return; }
  if (!draft || !vehicle) { fail('Selecciona primero un vehículo disponible en el catálogo.'); return; }
  if (typeof window.qrcode !== 'function') { fail('El generador QR local no se cargó. Recarga la página antes de confirmar.'); return; }
  const existing = listReservations().find(item => item.requestId === draft.requestId && item.accountId === account.id);
  if (existing) { confirmed = existing; renderConfirmed(); return; }
  if (!isAvailable(vehicle, draft.city, draft.startAt, draft.endAt, listReservations())) { fail('El vehículo no está disponible en ese período.'); return; }
  renderSelection();
}

root.addEventListener('change', event => {
  if (event.target.name === 'policy') { policyId = event.target.value; rememberSelection(); renderSelection('policy'); }
  if (stage==='select' && event.target.id === 'booking-currency') { currency = event.target.value; rememberSelection(); renderSelection('currency'); }
});

root.addEventListener('click', event => {
  if (event.target.closest('#booking-edit')) { reviewedQuote=null; stage = 'select'; rememberSelection(); renderSelection(); return; }
  if (event.target.closest('#view-booking')) { root.querySelector('.booking-success-car')?.scrollIntoView({ behavior:'smooth', block:'center' }); return; }
  if (event.target.closest('#download-qr')) {
    const canvas = root.querySelector('#booking-qr');
    const anchor = document.createElement('a'); anchor.download = `${confirmed.id}-qr-demo.png`; anchor.href = canvas.toDataURL('image/png'); anchor.click(); return;
  }
  if (!event.target.closest('#booking-action') || submitting) return;
  if (stage === 'select') { reviewedQuote=reviewDemoReservationQuote({account,...draft,policyId,currency}); stage = 'review'; rememberSelection(); renderSelection(); return; }
  submitting = true;
  const action = root.querySelector('#booking-action'); action.disabled = true;
  try {
    const result = confirmDemoReservation({ account, ...draft, policyId, currency });
    confirmed = result.reservation;
    renderConfirmed();
  } catch (error) {
    const message = root.querySelector('#booking-error'); message.textContent = error.message; message.hidden = false;
    action.disabled = false;
  } finally { submitting = false; }
});

begin();
